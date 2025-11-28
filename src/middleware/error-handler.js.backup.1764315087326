/**
 * 错误处理中间件
 * 统一处理API错误和异常，使用统一的错误处理器
 */

import { createErrorHandler, createNotFoundHandler } from '../utils/error-handler.js';

/**
 * 错误处理中间件
 * @param {Object} options - 配置选项
 * @param {boolean} options.logErrors - 是否记录错误
 * @param {boolean} options.includeStack - 是否包含堆栈信息
 * @returns {Function} 错误处理函数
 */
export function errorHandlerMiddleware(options = {}) {
  const errorHandler = createErrorHandler(options);
  return errorHandler;
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
  return createNotFoundHandler();
}