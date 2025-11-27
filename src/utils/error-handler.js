/**
 * 统一错误处理器
 * 整合业务错误处理和HTTP错误处理中间件功能
 */

import { globalLogger, LogCategory } from './logger.js';

/**
 * 错误类型枚举
 */
export const ErrorTypes = {
  // 网络相关错误
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  API_ERROR: 'API_ERROR',
  
  // 文件系统错误
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_PERMISSION: 'FILE_PERMISSION',
  FILE_SYSTEM: 'FILE_SYSTEM',
  
  // 配置错误
  CONFIG_ERROR: 'CONFIG_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  
  // 业务逻辑错误
  BUSINESS_ERROR: 'BUSINESS_ERROR',
  RULE_GENERATION_ERROR: 'RULE_GENERATION_ERROR',
  RULE_EVALUATION_ERROR: 'RULE_EVALUATION_ERROR',
  
  // 系统错误
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  MEMORY_ERROR: 'MEMORY_ERROR',
  
  // LLM相关错误
  LLM_ERROR: 'LLM_ERROR',
  LLM_TIMEOUT: 'LLM_TIMEOUT',
  LLM_RATE_LIMIT: 'LLM_RATE_LIMIT',
  LLM_QUOTA_EXCEEDED: 'LLM_QUOTA_EXCEEDED',
  
  // 数据库错误
  DATABASE_ERROR: 'DATABASE_ERROR',
  DATABASE_CONNECTION: 'DATABASE_CONNECTION',
  
  // 未知错误
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * 错误严重程度
 */
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * 错误恢复策略
 */
export const RecoveryStrategy = {
  NONE: 'none',
  RETRY: 'retry',
  FALLBACK: 'fallback',
  GRACEFUL_DEGRADATION: 'graceful_degradation',
  SKIP: 'skip'
};

/**
 * 统一错误处理器类
 */
export class ErrorHandler {
  constructor(options = {}) {
    this.options = {
      maxRetries: 3,
      retryDelay: 1000,
      enableRecovery: true,
      logErrors: true,
      ...options
    };
  }

  /**
   * 处理错误的主要方法
   * @param {Error} error - 错误对象
   * @param {Object} context - 错误上下文
   * @param {Function} retryFunction - 重试函数（可选）
   * @param {Function} fallbackFunction - 降级函数（可选）
   * @returns {Promise<*>} 处理结果
   */
  async handleError(error, context = {}, retryFunction = null, fallbackFunction = null) {
    const errorInfo = this.classifyError(error);
    const errorId = this.generateErrorId(errorInfo);
    
    // 记录错误统计
    this.recordErrorStats(errorInfo);
    
    // 记录详细日志
    if (this.options.logErrors) {
      await this.logDetailedError(error, errorInfo, context, errorId);
    }
    
    // 尝试错误恢复
    if (this.options.enableRecovery) {
      const recoveryResult = await this.attemptRecovery(
        errorInfo, 
        context, 
        retryFunction, 
        fallbackFunction,
        errorId
      );
      
      if (recoveryResult.recovered) {
        await this.logRecoverySuccess(errorInfo, recoveryResult, errorId);
        return recoveryResult.result;
      }
    }
    
    // 如果无法恢复，抛出增强的错误
    throw this.createEnhancedError(error, errorInfo, context, errorId);
  }

  /**
   * 分类错误
   * @param {Error} error - 错误对象
   * @returns {Object} 错误信息
   */
  classifyError(error) {
    const errorCode = error.code || error.name || 'UNKNOWN';
    const errorMessage = error.message || '未知错误';
    
    // 网络错误
    if (errorCode === 'ENOTFOUND' || errorCode === 'ECONNREFUSED' || 
        errorMessage.includes('network') || errorMessage.includes('connection')) {
      return {
        type: ErrorTypes.NETWORK_ERROR,
        severity: ErrorSeverity.HIGH,
        strategy: RecoveryStrategy.RETRY,
        recoverable: true
      };
    }
    
    // 超时错误
    if (errorCode === 'TIMEOUT' || errorMessage.includes('timeout')) {
      return {
        type: ErrorTypes.TIMEOUT_ERROR,
        severity: ErrorSeverity.MEDIUM,
        strategy: RecoveryStrategy.RETRY,
        recoverable: true
      };
    }
    
    // 文件不存在错误
    if (errorCode === 'ENOENT') {
      return {
        type: ErrorTypes.FILE_NOT_FOUND,
        severity: ErrorSeverity.MEDIUM,
        strategy: RecoveryStrategy.FALLBACK,
        recoverable: true
      };
    }
    
    // 文件权限错误
    if (errorCode === 'EACCES' || errorCode === 'EPERM') {
      return {
        type: ErrorTypes.FILE_PERMISSION,
        severity: ErrorSeverity.HIGH,
        strategy: RecoveryStrategy.NONE,
        recoverable: false
      };
    }
    
    // API错误
    if (errorMessage.includes('API') || errorMessage.includes('401') || 
        errorMessage.includes('403') || errorMessage.includes('500')) {
      return {
        type: ErrorTypes.API_ERROR,
        severity: ErrorSeverity.HIGH,
        strategy: RecoveryStrategy.RETRY,
        recoverable: true
      };
    }
    
    // LLM相关错误
    if (errorMessage.includes('LLM') || errorMessage.includes('model') || 
        errorMessage.includes('embedding')) {
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        return {
          type: ErrorTypes.LLM_RATE_LIMIT,
          severity: ErrorSeverity.MEDIUM,
          strategy: RecoveryStrategy.RETRY,
          recoverable: true
        };
      }
      
      if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
        return {
          type: ErrorTypes.LLM_QUOTA_EXCEEDED,
          severity: ErrorSeverity.HIGH,
          strategy: RecoveryStrategy.FALLBACK,
          recoverable: true
        };
      }
      
      return {
        type: ErrorTypes.LLM_ERROR,
        severity: ErrorSeverity.MEDIUM,
        strategy: RecoveryStrategy.RETRY,
        recoverable: true
      };
    }
    
    // 配置错误
    if (errorMessage.includes('config') || errorMessage.includes('配置')) {
      return {
        type: ErrorTypes.CONFIG_ERROR,
        severity: ErrorSeverity.HIGH,
        strategy: RecoveryStrategy.NONE,
        recoverable: false
      };
    }
    
    // 验证错误
    if (errorMessage.includes('validation') || errorMessage.includes('验证')) {
      return {
        type: ErrorTypes.VALIDATION_ERROR,
        severity: ErrorSeverity.MEDIUM,
        strategy: RecoveryStrategy.NONE,
        recoverable: false
      };
    }
    
    // 业务逻辑错误
    if (errorMessage.includes('rule') || errorMessage.includes('规则')) {
      return {
        type: ErrorTypes.BUSINESS_ERROR,
        severity: ErrorSeverity.MEDIUM,
        strategy: RecoveryStrategy.FALLBACK,
        recoverable: true
      };
    }
    
    // 默认为未知错误
    return {
      type: ErrorTypes.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      strategy: RecoveryStrategy.NONE,
      recoverable: false
    };
  }

  /**
   * 尝试错误恢复
   * @param {Object} errorInfo - 错误信息
   * @param {Object} context - 上下文
   * @param {Function} retryFunction - 重试函数
   * @param {Function} fallbackFunction - 降级函数
   * @param {string} errorId - 错误ID
   * @returns {Promise<Object>} 恢复结果
   */
  async attemptRecovery(errorInfo, context, retryFunction, fallbackFunction, errorId) {
    const { type, strategy, recoverable } = errorInfo;
    
    if (!recoverable || !this.options.enableRecovery) {
      return { recovered: false, reason: '错误不可恢复或恢复功能已禁用' };
    }
    
    try {
      switch (strategy) {
        case RecoveryStrategy.RETRY:
          return await this.performRetry(errorInfo, context, retryFunction, errorId);
          
        case RecoveryStrategy.FALLBACK:
          return await this.performFallback(errorInfo, context, fallbackFunction, errorId);
          
        case RecoveryStrategy.GRACEFUL_DEGRADATION:
          return await this.performGracefulDegradation(errorInfo, context, errorId);
          
        case RecoveryStrategy.SKIP:
          return { recovered: true, result: null, strategy: 'skip' };
          
        default:
          return { recovered: false, reason: `不支持的恢复策略: ${strategy}` };
      }
    } catch (recoveryError) {
      await globalLogger.error(LogCategory.SYSTEM, '错误恢复失败', recoveryError, {
        originalErrorType: type,
        errorId,
        recoveryStrategy: strategy
      });
      
      return { recovered: false, reason: '恢复过程中发生错误' };
    }
  }

  /**
   * 执行重试
   * @param {Object} errorInfo - 错误信息
   * @param {Object} context - 上下文
   * @param {Function} retryFunction - 重试函数
   * @param {string} errorId - 错误ID
   * @returns {Promise<Object>} 重试结果
   */
  async performRetry(errorInfo, context, retryFunction, errorId) {
    if (!retryFunction || typeof retryFunction !== 'function') {
      return { recovered: false, reason: '未提供重试函数' };
    }
    
    // 简单重试逻辑
    await globalLogger.info(LogCategory.SYSTEM, '准备重试操作', {
      errorType: errorInfo.type,
      errorId
    });
    
    try {
      const result = await retryFunction();
      return {
        recovered: true,
        result,
        strategy: 'retry'
      };
    } catch (retryError) {
      return { recovered: false, reason: '重试失败' };
    }
  }

  /**
   * 执行降级处理
   * @param {Object} errorInfo - 错误信息
   * @param {Object} context - 上下文
   * @param {Function} fallbackFunction - 降级函数
   * @param {string} errorId - 错误ID
   * @returns {Promise<Object>} 降级结果
   */
  async performFallback(errorInfo, context, fallbackFunction, errorId) {
    if (!fallbackFunction || typeof fallbackFunction !== 'function') {
      return { recovered: false, reason: '未提供降级函数' };
    }
    
    await globalLogger.info(LogCategory.SYSTEM, '执行降级处理', {
      errorType: errorInfo.type,
      errorId
    });
    
    try {
      const result = await fallbackFunction();
      
      return {
        recovered: true,
        result,
        strategy: 'fallback'
      };
    } catch (fallbackError) {
      return { recovered: false, reason: '降级函数执行失败' };
    }
  }

  /**
   * 执行优雅降级
   * @param {Object} errorInfo - 错误信息
   * @param {Object} context - 上下文
   * @param {string} errorId - 错误ID
   * @returns {Promise<Object>} 降级结果
   */
  async performGracefulDegradation(errorInfo, context, errorId) {
    await globalLogger.info(LogCategory.SYSTEM, '执行优雅降级', {
      errorType: errorInfo.type,
      errorId
    });
    
    // 根据错误类型提供默认的降级结果
    const defaultResults = {
      [ErrorTypes.LLM_ERROR]: { success: false, error: 'LLM服务暂时不可用', fallback: true },
      [ErrorTypes.NETWORK_ERROR]: { success: false, error: '网络连接问题', fallback: true },
      [ErrorTypes.FILE_NOT_FOUND]: { success: false, error: '资源不存在', fallback: true },
      [ErrorTypes.RULE_GENERATION_ERROR]: { rules: [], error: '规则生成失败', fallback: true },
      [ErrorTypes.RULE_EVALUATION_ERROR]: { evaluation: null, error: '规则评估失败', fallback: true }
    };
    
    const result = defaultResults[errorInfo.type] || { 
      success: false, 
      error: '服务暂时不可用', 
      fallback: true 
    };
    
    return {
      recovered: true,
      result,
      strategy: 'graceful_degradation'
    };
  }

  /**
   * 记录详细错误日志
   * @param {Error} error - 原始错误
   * @param {Object} errorInfo - 错误信息
   * @param {Object} context - 上下文
   * @param {string} errorId - 错误ID
   */
  async logDetailedError(error, errorInfo, context, errorId) {
    const logData = {
      errorId,
      type: errorInfo.type,
      severity: errorInfo.severity,
      strategy: errorInfo.strategy,
      recoverable: errorInfo.recoverable,
      originalError: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      },
      context,
      timestamp: new Date().toISOString(),
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }
    };
    
    await globalLogger.error(LogCategory.SYSTEM, `错误处理: ${errorInfo.type}`, logData);
  }

  /**
   * 记录恢复成功日志
   * @param {Object} errorInfo - 错误信息
   * @param {Object} recoveryResult - 恢复结果
   * @param {string} errorId - 错误ID
   */
  async logRecoverySuccess(errorInfo, recoveryResult, errorId) {
    await globalLogger.info(LogCategory.SYSTEM, '错误恢复成功', {
      errorId,
      errorType: errorInfo.type,
      recoveryStrategy: recoveryResult.strategy,
      retryCount: recoveryResult.retryCount,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 创建增强的错误对象
   * @param {Error} originalError - 原始错误
   * @param {Object} errorInfo - 错误信息
   * @param {Object} context - 上下文
   * @param {string} errorId - 错误ID
   * @returns {SqlAnalyzerError} 增强的错误
   */
  createEnhancedError(originalError, errorInfo, context, errorId) {
    const message = `[${errorInfo.type}] ${originalError.message}`;
    const details = {
      errorId,
      errorType: errorInfo.type,
      severity: errorInfo.severity,
      recoverable: errorInfo.recoverable,
      context,
      originalError: {
        name: originalError.name,
        message: originalError.message,
        code: originalError.code
      }
    };
    
    return this.createError(errorInfo.type, message, details);
  }

  /**
   * 生成错误ID
   * @param {Object} errorInfo - 错误信息
   * @returns {string} 错误ID
   */
  generateErrorId(errorInfo) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${errorInfo.type}_${timestamp}_${random}`;
  }

  /**
   * 创建错误对象
   * @param {string} type - 错误类型
   * @param {string} message - 错误消息
   * @param {Object} details - 详细信息
   * @returns {Error} 错误对象
   */
  createError(type, message, details = null) {
    const error = new Error(message);
    error.name = 'SqlAnalyzerError';
    error.code = type;
    error.details = details;
    return error;
  }

  /**
   * 记录错误统计
   * @param {Object} errorInfo - 错误信息
   */
  recordErrorStats(errorInfo) {
    // 这里可以添加错误统计逻辑
    // 如：发送到监控系统，记录到数据库等
  }

  /**
   * 包装函数以提供错误处理
   * @param {Function} fn - 要包装的函数
   * @param {Object} options - 包装选项
   * @returns {Function} 包装后的函数
   */
  wrapFunction(fn, options = {}) {
    const context = options.context || {};
    const retryFunction = options.retry;
    const fallbackFunction = options.fallback;
    
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        return await this.handleError(error, context, retryFunction, fallbackFunction);
      }
    };
  }
}

// 创建全局错误处理器实例
export const globalErrorHandler = new ErrorHandler();

/**
 * 便捷的错误处理函数
 * @param {Error} error - 错误对象
 * @param {Object} context - 错误上下文
 * @param {Function} retryFunction - 重试函数
 * @param {Function} fallbackFunction - 降级函数
 * @returns {Promise<*>} 处理结果
 */
export async function handleError(error, context = {}, retryFunction = null, fallbackFunction = null) {
  return await globalErrorHandler.handleError(error, context, retryFunction, fallbackFunction);
}

/**
 * HTTP错误处理中间件
 * @param {Object} options - 配置选项
 * @returns {Function} 错误处理函数
 */
export function createErrorHandler(options = {}) {
  const {
    logErrors = true,
    includeStack = process.env.NODE_ENV === 'development'
  } = options;

  return async (error, c) => {
    // 获取请求ID
    let requestId = 'unknown';
    try {
      requestId = c.get('requestId') || c.req.header('x-request-id') || 'unknown';
    } catch (err) {
      requestId = 'unknown';
    }
    
    // 记录错误
    if (logErrors) {
      let method = 'unknown';
      let url = 'unknown';
      let userAgent = 'unknown';
      let ip = 'unknown';
      
      try {
        if (c.req && typeof c.req === 'object') {
          method = c.req.method || 'unknown';
          url = c.req.url || 'unknown';
          userAgent = c.req.header('user-agent') || 'unknown';
          ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
        }
      } catch (reqErr) {
        // 忽略请求信息获取错误
      }
      
      const errorInfo = {
        requestId,
        method,
        url,
        userAgent,
        ip
      };

      try {
        await globalLogger.error(LogCategory.API, `HTTP错误: ${error.message}`, error, errorInfo);
      } catch (logErr) {
        console.error('记录错误日志失败:', logErr.message);
      }
    }

    // 创建错误响应
    const statusCode = error.statusCode || error.status || 500;
    const message = error.message || '内部服务器错误';
    
    const errorResponse = {
      success: false,
      error: message,
      type: error.type || 'INTERNAL_ERROR',
      statusCode,
      timestamp: new Date().toISOString()
    };
    
    // 在开发环境中包含堆栈信息
    if (includeStack && error.stack) {
      errorResponse.stack = error.stack;
    }
    
    return c.json(errorResponse, statusCode);
  };
}

/**
 * 404处理中间件
 * @returns {Function} 404处理函数
 */
export function createNotFoundHandler() {
  return async (c) => {
    const req = c.req;
    
    // 获取请求ID
    let requestId = 'unknown';
    try {
      requestId = c.get('requestId') || c.req.header('x-request-id') || 'unknown';
    } catch (err) {
      requestId = 'unknown';
    }
    
    const errorResponse = {
      success: false,
      error: '请求的端点不存在',
      type: 'NOT_FOUND_ERROR',
      statusCode: 404,
      availableEndpoints: [
        'GET /',
        'GET /api/health',
        'GET /api/health/ping',
        'GET /api/health/status',
        'POST /api/analyze',
        'POST /api/analyze/batch',
        'GET /api/config',
        'GET /api/config/:key',
        'PUT /api/config/:key',
        'DELETE /api/config/:key',
        'GET /api/history',
        'GET /api/history/:id',
        'DELETE /api/history/:id',
        'GET /api/knowledge',
        'POST /api/knowledge/search',
        'POST /api/knowledge/learn',
        'GET /api/status',
        'GET /api/docs'
      ],
      timestamp: new Date().toISOString()
    };

    // 获取请求信息
    let method = 'unknown';
    let url = 'unknown';
    let userAgent = 'unknown';
    let ip = 'unknown';
    
    try {
      if (req && typeof req === 'object') {
        method = req.method || 'unknown';
        url = req.url || 'unknown';
        userAgent = req.header('user-agent') || 'unknown';
        ip = req.header('x-forwarded-for') || req.header('x-real-ip') || 'unknown';
      }
    } catch (reqErr) {
      // 忽略请求信息获取错误
    }
    
    const error = new Error(`未找到端点: ${method} ${url}`);
    const errorInfo = {
      requestId,
      method,
      url,
      userAgent,
      ip
    };

    // 记录404错误
    try {
      await globalLogger.warn(LogCategory.API, '404错误', error, errorInfo);
    } catch (logErr) {
      console.error('记录404错误日志失败:', logErr.message);
    }

    return c.json(errorResponse, 404);
  };
}