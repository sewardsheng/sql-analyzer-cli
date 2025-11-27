/**
 * 弹性工具类
 * 整合错误处理、日志记录、异步操作管理等弹性功能
 */

import {
  globalErrorHandler,
  handleError,
  withErrorHandling,
  ErrorTypes,
  ErrorSeverity,
  RecoveryStrategy
} from './error/ErrorHandler.js';

import {
  globalLogger,
  LogCategory,
  timer,
  withLogging
} from './logging/EnhancedLogger.js';

import {
  globalAsyncManager,
  asyncOperation,
  withTimeout,
  withRetry,
  batchExecute
} from './async/AsyncOperationManager.js';

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const os = require('os');

/**
 * 弹性工具类
 */
export class ResilienceUtils {
  constructor() {
    this.errorHandler = globalErrorHandler;
    this.logger = globalLogger;
    this.asyncManager = globalAsyncManager;
  }

  /**
   * 执行带完整弹性保护的函数
   * @param {Function} fn - 要执行的函数
   * @param {Object} options - 选项
   * @returns {Promise<*>} 执行结果
   */
  async executeWithResilience(fn, options = {}) {
    const {
      operationName = 'unknown',
      category = LogCategory.BUSINESS,
      timeout = 30000,
      maxRetries = 3,
      retryDelay = 1000,
      fallbackFn = null,
      metadata = {}
    } = options;

    const endTimer = timer(operationName);
    
    try {
      this.logger.info(category, `开始执行弹性操作`, {
        operationName,
        timeout,
        maxRetries,
        ...metadata
      });

      // 使用异步操作管理器执行
      const result = await this.asyncManager.submit(
        async (signal) => {
          // 检查取消信号
          if (signal.aborted) {
            throw new Error('操作被取消');
          }
          
          return await fn(signal);
        },
        {
          timeout,
          maxRetries,
          retryDelay,
          metadata: { operationName, category, ...metadata }
        }
      );

      const duration = endTimer();
      
      this.logger.info(category, `弹性操作执行成功`, {
        operationName,
        duration,
        ...metadata
      });

      return result;

    } catch (error) {
      const duration = endTimer();
      
      this.logger.error(category, `弹性操作执行失败`, error, {
        operationName,
        duration,
        ...metadata
      });

      // 尝试降级处理
      if (fallbackFn && typeof fallbackFn === 'function') {
        try {
          this.logger.info(category, `执行降级处理`, {
            operationName,
            ...metadata
          });

          const fallbackResult = await fallbackFn(error);
          
          this.logger.info(category, `降级处理成功`, {
            operationName,
            ...metadata
          });

          return fallbackResult;

        } catch (fallbackError) {
          this.logger.error(category, `降级处理失败`, fallbackError, {
            operationName,
            ...metadata
          });
        }
      }

      // 使用错误处理器处理
      return await this.errorHandler.handleError(
        error,
        { operationName, category, ...metadata },
        null, // 重试已在异步管理器中处理
        fallbackFn
      );
    }
  }

  /**
   * 创建弹性包装器
   * @param {Object} options - 包装选项
   * @returns {Function} 包装器函数
   */
  createWrapper(options = {}) {
    return (fn) => {
      return async (...args) => {
        return await this.executeWithResilience(
          async (signal) => fn(...args, signal),
          options
        );
      };
    };
  }

  /**
   * 批量执行弹性操作
   * @param {Array<Function>} functions - 函数数组
   * @param {Object} options - 执行选项
   * @returns {Promise<Array>} 结果数组
   */
  async batchExecuteWithResilience(functions, options = {}) {
    const {
      operationName = 'batch_operation',
      category = LogCategory.BUSINESS,
      maxConcurrent = 5,
      timeout = 30000,
      failFast = false,
      metadata = {}
    } = options;

    this.logger.info(category, `开始批量弹性操作`, {
      operationName,
      functionCount: functions.length,
      maxConcurrent,
      failFast,
      ...metadata
    });

    const endTimer = timer(operationName);

    try {
      // 包装每个函数
      const wrappedFunctions = functions.map((fn, index) => 
        this.createWrapper({
          operationName: `${operationName}_${index}`,
          category,
          timeout,
          ...metadata
        })(fn)
      );

      // 批量执行
      const results = await batchExecute(wrappedFunctions, {
        maxConcurrent,
        timeout
      });

      const duration = endTimer();
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.length - successCount;

      this.logger.info(category, `批量弹性操作完成`, {
        operationName,
        duration,
        totalCount: results.length,
        successCount,
        failureCount,
        successRate: `${(successCount / results.length * 100).toFixed(2)}%`,
        ...metadata
      });

      // 如果启用快速失败且有失败，抛出错误
      if (failFast && failureCount > 0) {
        const firstFailure = results.find(r => r.status === 'rejected');
        throw firstFailure.reason;
      }

      return results;

    } catch (error) {
      const duration = endTimer();
      
      this.logger.error(category, `批量弹性操作失败`, error, {
        operationName,
        duration,
        ...metadata
      });

      throw error;
    }
  }

  /**
   * 创建弹性装饰器
   * @param {Object} options - 装饰器选项
   * @returns {Function} 装饰器函数
   */
  createDecorator(options = {}) {
    return function(target, propertyKey, descriptor) {
      const originalMethod = descriptor.value;
      const operationName = options.operationName || `${target.constructor.name}.${propertyKey}`;
      const category = options.category || LogCategory.BUSINESS;

      descriptor.value = async function(...args) {
        const resilienceUtils = new ResilienceUtils();
        
        return await resilienceUtils.executeWithResilience(
          async (signal) => originalMethod.apply(this, [...args, signal]),
          {
            operationName,
            category,
            ...options
          }
        );
      };

      return descriptor;
    };
  }

  /**
   * 健康检查
   * @param {Object} checks - 检查项目
   * @param {Object} options - 检查选项
   * @returns {Promise<Object>} 健康检查结果
   */
  async healthCheck(checks, options = {}) {
    const {
      timeout = 5000,
      failFast = false,
      category = LogCategory.SYSTEM
    } = options;

    this.logger.info(category, `开始健康检查`, {
      checkCount: Object.keys(checks).length,
      timeout,
      failFast
    });

    const endTimer = timer('health_check');
    const results = {};
    let overallStatus = 'healthy';
    const issues = [];

    try {
      for (const [name, checkFn] of Object.entries(checks)) {
        try {
          const result = await this.executeWithResilience(
            async (signal) => {
              const checkResult = await checkFn(signal);
              return checkResult;
            },
            {
              operationName: `health_check_${name}`,
              category,
              timeout,
              fallbackFn: () => ({ status: 'unhealthy', error: '检查超时或失败' })
            }
          );

          results[name] = result;

          if (result.status !== 'healthy') {
            overallStatus = 'unhealthy';
            issues.push({
              check: name,
              status: result.status,
              error: result.error
            });

            if (failFast) {
              break;
            }
          }

        } catch (error) {
          results[name] = { status: 'unhealthy', error: error.message };
          overallStatus = 'unhealthy';
          issues.push({
            check: name,
            status: 'unhealthy',
            error: error.message
          });

          if (failFast) {
            break;
          }
        }
      }

      const duration = endTimer();

      const healthResult = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        duration,
        checks: results,
        issues: issues.length > 0 ? issues : undefined,
        summary: {
          total: Object.keys(checks).length,
          healthy: Object.values(results).filter(r => r.status === 'healthy').length,
          unhealthy: issues.length
        }
      };

      this.logger.info(category, `健康检查完成`, {
        status: overallStatus,
        duration,
        healthyCount: healthResult.summary.healthy,
        unhealthyCount: healthResult.summary.unhealthy
      });

      return healthResult;

    } catch (error) {
      const duration = endTimer();
      
      this.logger.error(category, `健康检查失败`, error, { duration });

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        duration,
        error: error.message,
        checks: results
      };
    }
  }

  /**
   * 断路器模式实现
   * @param {Function} fn - 要保护的函数
   * @param {Object} options - 断路器选项
   * @returns {Function} 带断路器的函数
   */
  createCircuitBreaker(fn, options = {}) {
    const {
      failureThreshold = 5,
      recoveryTimeout = 60000,
      monitoringPeriod = 10000,
      category = LogCategory.SYSTEM
    } = options;

    let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    let failureCount = 0;
    let lastFailureTime = null;
    let successCount = 0;

    return async (...args) => {
      const now = Date.now();

      // 检查是否需要从OPEN状态转换到HALF_OPEN
      if (state === 'OPEN' && 
          lastFailureTime && 
          now - lastFailureTime >= recoveryTimeout) {
        state = 'HALF_OPEN';
        successCount = 0;
        
        this.logger.info(category, `断路器状态变更: OPEN -> HALF_OPEN`);
      }

      // 如果断路器是OPEN状态，直接拒绝
      if (state === 'OPEN') {
        const error = new Error('断路器处于OPEN状态，拒绝执行');
        error.code = 'CIRCUIT_BREAKER_OPEN';
        throw error;
      }

      try {
        const result = await fn(...args);

        // 成功执行
        if (state === 'HALF_OPEN') {
          successCount++;
          if (successCount >= 3) { // 连续3次成功后关闭断路器
            state = 'CLOSED';
            failureCount = 0;
            
            this.logger.info(category, `断路器状态变更: HALF_OPEN -> CLOSED`);
          }
        } else {
          failureCount = 0; // 重置失败计数
        }

        return result;

      } catch (error) {
        failureCount++;
        lastFailureTime = now;

        // 检查是否需要打开断路器
        if (failureCount >= failureThreshold) {
          state = 'OPEN';
          
          this.logger.warn(category, `断路器状态变更: CLOSED -> OPEN`, {
            failureCount,
            failureThreshold,
            error: error.message
          });
        } else if (state === 'HALF_OPEN') {
          // HALF_OPEN状态下的失败立即打开断路器
          state = 'OPEN';
          
          this.logger.warn(category, `断路器状态变更: HALF_OPEN -> OPEN`, {
            failureCount,
            error: error.message
          });
        }

        throw error;
      }
    };
  }

  /**
   * 获取系统状态
   * @returns {Object} 系统状态
   */
  getSystemStatus() {
    return {
      timestamp: new Date().toISOString(),
      errorHandler: {
        errorStats: this.errorHandler.getErrorStats()
      },
      logger: {
        recentLogs: this.logger.getRecentLogs(50),
        performanceMetrics: this.logger.getPerformanceMetrics()
      },
      asyncManager: {
        stats: this.asyncManager.getStats(),
        operations: this.asyncManager.getAllOperations()
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };
  }

  /**
   * 清理资源
   */
  async cleanup() {
    this.logger.info(LogCategory.SYSTEM, `开始清理弹性工具资源`);
    
    try {
      // 取消所有异步操作
      this.asyncManager.cancelAll();
      
      // 清理日志记录器
      await this.logger.cleanup();
      
      // 清理错误处理器
      this.errorHandler.clearErrorStats();
      
      this.logger.info(LogCategory.SYSTEM, `弹性工具资源清理完成`);
      
    } catch (error) {
      console.error('清理弹性工具资源失败:', error);
    }
  }
}

// 创建全局弹性工具实例
export const globalResilienceUtils = new ResilienceUtils();

/**
 * 便捷的弹性执行函数
 * @param {Function} fn - 要执行的函数
 * @param {Object} options - 选项
 * @returns {Promise<*>} 执行结果
 */
export async function executeWithResilience(fn, options = {}) {
  return await globalResilienceUtils.executeWithResilience(fn, options);
}

/**
 * 便捷的批量弹性执行函数
 * @param {Array<Function>} functions - 函数数组
 * @param {Object} options - 执行选项
 * @returns {Promise<Array>} 结果数组
 */
export async function batchExecuteWithResilience(functions, options = {}) {
  return await globalResilienceUtils.batchExecuteWithResilience(functions, options);
}

/**
 * 便捷的健康检查函数
 * @param {Object} checks - 检查项目
 * @param {Object} options - 检查选项
 * @returns {Promise<Object>} 健康检查结果
 */
export async function healthCheck(checks, options = {}) {
  return await globalResilienceUtils.healthCheck(checks, options);
}

/**
 * 弹性装饰器
 * @param {Object} options - 装饰器选项
 * @returns {Function} 装饰器函数
 */
export function withResilience(options = {}) {
  return globalResilienceUtils.createDecorator(options);
}

/**
 * 断路器装饰器
 * @param {Object} options - 断路器选项
 * @returns {Function} 装饰器函数
 */
export function withCircuitBreaker(options = {}) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = globalResilienceUtils.createCircuitBreaker(
      originalMethod,
      options
    );
    
    return descriptor;
  };
}

// 导出所有相关类和函数
export {
  // 错误处理
  globalErrorHandler,
  handleError,
  withErrorHandling,
  ErrorTypes,
  ErrorSeverity,
  RecoveryStrategy,
  
  // 日志记录
  globalLogger,
  LogCategory,
  timer,
  withLogging,
  
  // 异步操作
  globalAsyncManager,
  asyncOperation,
  withTimeout,
  withRetry,
  batchExecute
};