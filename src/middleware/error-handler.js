/**
 * 错误处理中间件
 * 统一处理API错误和异常
 */

import { logError, logApiError } from '../utils/logger.js';
import { createHonoErrorResponse } from '../utils/api/response-handler.js';
import { isApiError } from '../utils/api/api-error.js';

/**
 * 错误处理中间件
 * @param {Object} options - 配置选项
 * @param {boolean} options.logErrors - 是否记录错误
 * @param {boolean} options.includeStack - 是否包含堆栈信息
 * @returns {Function} 错误处理函数
 */
export function errorHandlerMiddleware(options = {}) {
  const {
    logErrors = true,
    includeStack = process.env.NODE_ENV === 'development'
  } = options;

  return async (error, c) => {
    // 获取请求ID的正确方式
    let requestId = 'unknown';
    try {
      requestId = c.get('requestId') || 'unknown';
    } catch (err) {
      console.log('[DEBUG] Error getting requestId:', err.message);
      // 降级处理：尝试从请求头获取
      try {
        requestId = c.req.header('x-request-id') || 'unknown';
      } catch (fallbackErr) {
        console.log('[DEBUG] Fallback also failed:', fallbackErr.message);
        requestId = 'unknown';
      }
    }
    
    // 记录错误
    if (logErrors) {
      // 安全地获取请求信息
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
        console.log('[DEBUG] Error getting request info:', reqErr.message);
      }
      
      const errorInfo = {
        requestId,
        method,
        url,
        userAgent,
        ip
      };

      // 使用新的API错误日志记录方法
      try {
        await logApiError(error, c.req, errorInfo);
      } catch (logErr) {
        console.log('[DEBUG] Error in logApiError:', logErr.message);
        // 降级到基础日志记录
        await logError(`API错误: ${error.message}`, error, errorInfo);
      }
    }

    // 使用新的错误响应处理
    return createHonoErrorResponse(error, c);
  };
}

/**
 * 创建默认错误处理中间件
 * @returns {Function} 错误处理函数
 */
export function createDefaultErrorHandlerMiddleware() {
  return errorHandlerMiddleware({
    logErrors: true,
    includeStack: process.env.NODE_ENV === 'development'
  });
}

/**
 * 404处理中间件
 * @returns {Function} 404处理函数
 */
export function notFoundHandlerMiddleware() {
  return async (c) => {
    const req = c.req;
    
    // 获取请求ID的正确方式
    let requestId = 'unknown';
    try {
      requestId = c.get('requestId') || 'unknown';
    } catch (err) {
      console.log('[DEBUG] Error getting requestId in 404 handler:', err.message);
      // 降级处理：尝试从请求头获取
      try {
        requestId = req.header('x-request-id') || 'unknown';
      } catch (fallbackErr) {
        console.log('[DEBUG] Fallback also failed in 404:', fallbackErr.message);
        requestId = 'unknown';
      }
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

    // 安全地获取请求信息
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
      console.log('[DEBUG] Error getting request info in 404 handler:', reqErr.message);
    }
    
    const error = new Error(`未找到端点: ${method} ${url}`);
    const errorInfo = {
      requestId,
      method,
      url,
      userAgent,
      ip
    };

    // 使用新的API错误日志记录方法
    try {
      await logApiError(error, req, errorInfo);
    } catch (logErr) {
      console.log('[DEBUG] Error in logApiError (404 handler):', logErr.message);
      // 降级到基础日志记录
      await logError(`404错误: ${error.message}`, error, errorInfo);
    }

    return c.json(errorResponse, 404);
  };
}