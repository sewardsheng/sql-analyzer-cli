/**
 * 增强错误处理器
 * 老王我把错误处理搞得智能化！自动分类、重试、降级
 */

import { ErrorType, ErrorSeverity, ErrorHandlingStrategy, classifyError, getErrorAdvice } from './error-classifier.js';
import { getGlobalLogger, LogCategory } from './logger.js';

// 重试配置接口
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter: boolean;
}

// 错误处理结果接口
export interface ErrorHandlingResult {
  success: boolean;
  result?: any;
  error?: Error;
  attempts: number;
  handlingTime: number;
  strategy: ErrorHandlingStrategy;
  classification?: any;
}

/**
 * 增强错误处理器类
 */
export class EnhancedErrorHandler {
  private static instance: EnhancedErrorHandler;
  private retryHistory: Map<string, { count: number; lastAttempt: number }> = new Map();

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): EnhancedErrorHandler {
    if (!EnhancedErrorHandler.instance) {
      EnhancedErrorHandler.instance = new EnhancedErrorHandler();
    }
    return EnhancedErrorHandler.instance;
  }

  /**
   * 带重试的操作执行
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    retryConfig?: Partial<RetryConfig>
  ): Promise<ErrorHandlingResult> {
    const startTime = Date.now();
    const config: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      jitter: true,
      ...retryConfig
    };

    const operationKey = `${operationName}_${Date.now()}`;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        this.logger.info(LogCategory.SYSTEM, `执行操作: ${operationName} (尝试 ${attempt}/${config.maxAttempts})`);

        const result = await operation();

        // 成功时记录并返回
        this.logger.info(LogCategory.SYSTEM, `操作成功: ${operationName}`, {
          attempt,
          duration: Date.now() - startTime
        });

        return {
          success: true,
          result,
          attempts: attempt,
          handlingTime: Date.now() - startTime,
          strategy: attempt === 1 ? ErrorHandlingStrategy.IGNORE : ErrorHandlingStrategy.RETRY
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 分类错误
        const classification = classifyError(lastError, { operation: operationName, attempt });
        const advice = getErrorAdvice(lastError, { operation: operationName, attempt });

        this.logger.error(LogCategory.SYSTEM, `操作失败: ${operationName}`, {
          attempt,
          error: lastError.message,
          classification: classification.type,
          severity: classification.severity,
          retryable: classification.retryable
        });

        // 检查是否应该重试
        if (!advice.advice.shouldRetry || attempt >= config.maxAttempts) {
          break;
        }

        // 计算延迟时间
        const delay = this.calculateDelay(attempt, config);

        this.logger.info(LogCategory.SYSTEM, `准备重试: ${operationName}`, {
          delay,
          nextAttempt: attempt + 1
        });

        // 等待后重试
        await this.sleep(delay);
      }
    }

    // 所有尝试都失败了
    const finalClassification = classifyError(lastError!, { operation: operationName, final: true });

    return {
      success: false,
      error: lastError!,
      attempts: config.maxAttempts,
      handlingTime: Date.now() - startTime,
      strategy: ErrorHandlingStrategy.FAIL_FAST,
      classification: finalClassification
    };
  }

  /**
   * 带降级的操作执行
   */
  async executeWithFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    operationName: string,
    options?: {
      skipFallbackFor?: ErrorType[];
      retryConfig?: Partial<RetryConfig>;
    }
  ): Promise<ErrorHandlingResult> {
    const startTime = Date.now();

    // 首先尝试主操作
    const primaryResult = await this.executeWithRetry(
      primaryOperation,
      `${operationName}_primary`,
      options?.retryConfig
    );

    if (primaryResult.success) {
      return primaryResult;
    }

    // 主操作失败，检查是否应该使用降级方案
    const classification = primaryResult.classification;

    if (options?.skipFallbackFor?.includes(classification?.type)) {
      this.logger.warn(LogCategory.SYSTEM, `跳过降级方案: ${operationName}`, {
        reason: '错误类型不在降级范围内',
        errorType: classification?.type
      });
      return primaryResult;
    }

    this.logger.info(LogCategory.SYSTEM, `执行降级方案: ${operationName}`);

    try {
      const fallbackResult = await fallbackOperation();

      this.logger.info(LogCategory.SYSTEM, `降级方案成功: ${operationName}`, {
        duration: Date.now() - startTime
      });

      return {
        success: true,
        result: fallbackResult,
        attempts: primaryResult.attempts,
        handlingTime: Date.now() - startTime,
        strategy: ErrorHandlingStrategy.FALLBACK,
        classification
      };

    } catch (fallbackError) {
      const finalError = fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));

      this.logger.error(LogCategory.SYSTEM, `降级方案失败: ${operationName}`, {
        primaryError: primaryResult.error?.message,
        fallbackError: finalError.message
      });

      return {
        success: false,
        error: finalError,
        attempts: primaryResult.attempts,
        handlingTime: Date.now() - startTime,
        strategy: ErrorHandlingStrategy.FAIL_FAST,
        classification
      };
    }
  }

  /**
   * 处理并格式化错误响应
   */
  handleErrorResponse(error: Error | string, context?: any): {
    statusCode: number;
    body: any;
    headers?: Record<string, string>;
  } {
    const classification = classifyError(error, context);
    const userMessage = classification.userMessage;

    // 根据错误类型确定HTTP状态码
    let statusCode = 500;
    switch (classification.type) {
      case ErrorType.VALIDATION_ERROR:
        statusCode = 400;
        break;
      case ErrorType.PERMISSION_DENIED:
        statusCode = 403;
        break;
      case ErrorType.DATA_NOT_FOUND:
        statusCode = 404;
        break;
      case ErrorType.RATE_LIMIT_ERROR:
        statusCode = 429;
        break;
      case ErrorType.LLM_SERVICE_ERROR:
      case ErrorType.NETWORK_ERROR:
        statusCode = 502;
        break;
      case ErrorType.CONFIG_ERROR:
      case ErrorType.DEPENDENCY_ERROR:
        statusCode = 503;
        break;
      default:
        statusCode = 500;
    }

    // 记录错误
    this.logger.error(LogCategory.SYSTEM, 'API错误响应', {
      error: error instanceof Error ? error.message : error,
      classification: classification.type,
      severity: classification.severity,
      statusCode,
      context
    });

    // 根据严重程度决定是否包含详细信息
    const includeDetails = classification.severity !== ErrorSeverity.LOW;

    return {
      statusCode,
      body: {
        success: false,
        error: {
          code: classification.type,
          message: userMessage,
          severity: classification.severity,
          timestamp: new Date().toISOString(),
          ...(includeDetails && {
            technicalDetails: error instanceof Error ? error.message : error,
            suggestedActions: classification.suggestedActions,
            requestId: context?.requestId
          })
        }
      },
      headers: classification.type === ErrorType.RATE_LIMIT_ERROR ? {
        'Retry-After': '60'
      } : undefined
    };
  }

  /**
   * 批量错误处理
   */
  async handleBatchErrors<T>(
    operations: Array<{
      name: string;
      operation: () => Promise<T>;
      fallback?: () => Promise<T>;
      critical?: boolean;
    }>,
    options?: {
      continueOnError?: boolean;
      maxConcurrency?: number;
    }
  ): Promise<{
    results: ErrorHandlingResult[];
    summary: {
      total: number;
      successful: number;
      failed: number;
      critical: number;
    };
  }> {
    const continueOnError = options?.continueOnError ?? true;
    const maxConcurrency = options?.maxConcurrency ?? 3;

    const results: ErrorHandlingResult[] = [];

    // 分批处理以控制并发
    for (let i = 0; i < operations.length; i += maxConcurrency) {
      const batch = operations.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(async (op) => {
        if (op.fallback) {
          return await this.executeWithFallback(
            op.operation,
            op.fallback,
            op.name
          );
        } else {
          return await this.executeWithRetry(
            op.operation,
            op.name
          );
        }
      });

      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // 检查关键操作是否失败
        const criticalFailures = batch.filter((op, index) =>
          op.critical && !batchResults[index].success
        );

        if (criticalFailures.length > 0 && !continueOnError) {
          throw new Error(`关键操作失败: ${criticalFailures.map(op => op.name).join(', ')}`);
        }

      } catch (batchError) {
        if (!continueOnError) {
          // 重新抛出错误以停止处理
          for (const op of batch) {
            results.push({
              success: false,
              error: batchError instanceof Error ? batchError : new Error(String(batchError)),
              attempts: 1,
              handlingTime: 0,
              strategy: ErrorHandlingStrategy.FAIL_FAST
            });
          }
          break;
        }
      }
    }

    // 计算汇总信息
    const summary = {
      total: operations.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      critical: operations.filter(op => op.critical &&
        !results.find(r => r.strategy !== ErrorHandlingStrategy.FAIL_FAST)?.success).length
    };

    this.logger.info(LogCategory.SYSTEM, '批量操作完成', summary);

    return { results, summary };
  }

  /**
   * 计算重试延迟
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    // 指数退避算法
    let delay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);

    // 添加抖动以避免雷群效应
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    // 限制最大延迟
    return Math.min(delay, config.maxDelay);
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取logger实例
   */
  private get logger() {
    return getGlobalLogger();
  }

  /**
   * 清理重试历史
   */
  cleanupRetryHistory(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5分钟

    for (const [key, history] of this.retryHistory.entries()) {
      if (now - history.lastAttempt > maxAge) {
        this.retryHistory.delete(key);
      }
    }
  }

  /**
   * 获取重试统计
   */
  getRetryStats(): {
    totalOperations: number;
    averageRetries: number;
    mostRetried: string[];
  } {
    const entries = Array.from(this.retryHistory.entries());
    const totalOperations = entries.length;
    const averageRetries = totalOperations > 0
      ? entries.reduce((sum, [_, history]) => sum + history.count, 0) / totalOperations
      : 0;

    const mostRetried = entries
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([key]) => key);

    return {
      totalOperations,
      averageRetries: Math.round(averageRetries * 100) / 100,
      mostRetried
    };
  }
}

// 导出单例实例
export const enhancedErrorHandler = EnhancedErrorHandler.getInstance();

/**
 * 便捷函数：带重试执行
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  retryConfig?: Partial<RetryConfig>
): Promise<ErrorHandlingResult> {
  return enhancedErrorHandler.executeWithRetry(operation, operationName, retryConfig);
}

/**
 * 便捷函数：带降级执行
 */
export async function executeWithFallback<T>(
  primaryOperation: () => Promise<T>,
  fallbackOperation: () => Promise<T>,
  operationName: string,
  options?: {
    skipFallbackFor?: ErrorType[];
    retryConfig?: Partial<RetryConfig>;
  }
): Promise<ErrorHandlingResult> {
  return enhancedErrorHandler.executeWithFallback(
    primaryOperation,
    fallbackOperation,
    operationName,
    options
  );
}

/**
 * 便捷函数：处理错误响应
 */
export function handleErrorResponse(error: Error | string, context?: any) {
  return enhancedErrorHandler.handleErrorResponse(error, context);
}

export default enhancedErrorHandler;