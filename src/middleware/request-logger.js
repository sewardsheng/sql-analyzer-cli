/**
 * 请求日志中间件
 * 记录所有API请求的详细信息
 */

import { logInfo, logApiRequest, generateRequestId } from '../utils/logger.js';

/**
 * 请求日志中间件
 * @param {Object} options - 配置选项
 * @param {boolean} options.logBody - 是否记录请求体
 * @param {boolean} options.logResponse - 是否记录响应
 * @param {Array} options.excludePaths - 排除的路径
 * @returns {Function} 中间件函数
 */
export function requestLoggerMiddleware(options = {}) {
  const {
    logBody = false,
    logResponse = true,
    excludePaths = ['/api/health/ping', '/api/health/status']
  } = options;

  return async (c, next) => {
    const startTime = Date.now();
    const req = c.req;
    
    // 生成请求ID并添加到请求对象
    const requestId = generateRequestId();
    
    // 使用 Hono v4.10.6 的正确 API 设置 requestId 到上下文
    c.set('requestId', requestId);
    
    // 设置响应头
    c.header('X-Request-ID', requestId);

    // 检查是否需要记录此请求
    const shouldLog = !excludePaths.some(path => req.url.includes(path));
    
    let requestBody = null;
    
    // 如果需要记录请求体
    if (shouldLog && logBody && req.method !== 'GET') {
      try {
        const body = await req.clone().json();
        requestBody = JSON.stringify(body);
      } catch (error) {
        // 如果无法解析JSON，记录原始文本
        const bodyText = await req.clone().text();
        requestBody = bodyText.substring(0, 1000); // 限制长度
      }
    }

    // 继续处理请求
    await next();

    // 记录响应信息
    if (shouldLog && logResponse) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 获取响应状态码的正确方式
      let statusCode = 200; // 默认值
      try {
        // 在 Hono v4.10.6 中，响应状态码通过 c.res 获取
        if (c.res && typeof c.res.status === 'number') {
          statusCode = c.res.status;
        }
      } catch (error) {
        console.log('[DEBUG] Error getting status code:', error.message);
        statusCode = 200;
      }
      
      // 获取响应大小
      let responseSize = '0';
      try {
        responseSize = c.res?.headers?.get?.('content-length') || '0';
      } catch (error) {
        // 忽略错误
      }

      // 使用新的API日志记录方法
      await logApiRequest(req, { status: statusCode, headers: { get: () => responseSize } }, startTime, endTime);
    }
  };
}

/**
 * 创建默认请求日志中间件
 * @returns {Function} 中间件函数
 */
export function createDefaultRequestLoggerMiddleware() {
  return requestLoggerMiddleware({
    logBody: process.env.LOG_REQUEST_BODY === 'true',
    logResponse: true,
    excludePaths: ['/api/health/ping', '/api/health/status']
  });
}