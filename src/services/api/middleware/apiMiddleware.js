/**
 * API中间件模块
 * 提供请求验证、错误处理等通用中间件功能
 */

import { logError } from '../../../utils/logger.js';

/**
 * API密钥验证中间件
 * @param {Object} config - 配置对象
 * @returns {Function} 中间件函数
 */
export function apiKeyMiddleware(config = {}) {
  return async (c, next) => {
    // 如果配置中不需要API密钥验证，则跳过
    if (config.skipAuth === true) {
      await next();
      return;
    }
    
    // 获取请求头中的API密钥
    const providedApiKey = c.req.header('X-API-Key') || c.req.query('apiKey');
    
    // 如果没有提供API密钥或密钥不匹配
    if (!providedApiKey || providedApiKey !== config.apiKey) {
      return c.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '无效的API密钥'
        }
      }, 401);
    }
    
    await next();
  };
}

/**
 * 请求参数验证中间件
 * @param {Object} schema - 验证模式
 * @returns {Function} 中间件函数
 */
export function validationMiddleware(schema) {
  return async (c, next) => {
    try {
      // 获取请求方法和内容类型
      const method = c.req.method;
      const contentType = c.req.header('content-type') || '';
      
      // 对于POST/PUT请求，验证JSON格式
      if (['POST', 'PUT'].includes(method) && contentType.includes('application/json')) {
        const body = await c.req.json();
        
        // 验证必需字段
        if (schema.required) {
          for (const field of schema.required) {
            if (body[field] === undefined || body[field] === null) {
              return c.json({
                success: false,
                error: {
                  code: 'INVALID_REQUEST',
                  message: `缺少必需的参数: ${field}`
                }
              }, 400);
            }
          }
        }
        
        // 验证字段类型
        if (schema.properties) {
          for (const [field, rules] of Object.entries(schema.properties)) {
            if (body[field] !== undefined) {
              // 类型验证
              if (rules.type && typeof body[field] !== rules.type) {
                return c.json({
                  success: false,
                  error: {
                    code: 'INVALID_REQUEST',
                    message: `参数 ${field} 类型错误，期望 ${rules.type}`
                  }
                }, 400);
              }
              
              // 枚举值验证
              if (rules.enum && !rules.enum.includes(body[field])) {
                return c.json({
                  success: false,
                  error: {
                    code: 'INVALID_REQUEST',
                    message: `参数 ${field} 值无效，有效值: ${rules.enum.join(', ')}`
                  }
                }, 400);
              }
              
              // 字符串长度验证
              if (rules.type === 'string') {
                if (rules.minLength !== undefined && body[field].length < rules.minLength) {
                  return c.json({
                    success: false,
                    error: {
                      code: 'INVALID_REQUEST',
                      message: `参数 ${field} 长度不能少于 ${rules.minLength} 个字符`
                    }
                  }, 400);
                }
                
                if (rules.maxLength !== undefined && body[field].length > rules.maxLength) {
                  return c.json({
                    success: false,
                    error: {
                      code: 'INVALID_REQUEST',
                      message: `参数 ${field} 长度不能超过 ${rules.maxLength} 个字符`
                    }
                  }, 400);
                }
              }
            }
          }
        }
      }
      
      // 对于GET请求，验证查询参数
      if (method === 'GET') {
        const query = c.req.query();
        
        // 验证分页参数
        if (schema.pagination) {
          const page = parseInt(query.page) || 1;
          const limit = parseInt(query.limit) || 10;
          
          if (page < 1) {
            return c.json({
              success: false,
              error: {
                code: 'INVALID_REQUEST',
                message: '页码必须大于0'
              }
            }, 400);
          }
          
          if (limit < 1 || limit > 100) {
            return c.json({
              success: false,
              error: {
                code: 'INVALID_REQUEST',
                message: '每页数量必须在1-100之间'
              }
            }, 400);
          }
        }
        
        // 验证日期格式
        if (schema.dateFields) {
          for (const field of schema.dateFields) {
            if (query[field]) {
              const date = new Date(query[field]);
              if (isNaN(date.getTime())) {
                return c.json({
                  success: false,
                  error: {
                    code: 'INVALID_REQUEST',
                    message: `参数 ${field} 不是有效的日期格式`
                  }
                }, 400);
              }
            }
          }
        }
      }
      
      await next();
    } catch (error) {
      logError(`请求验证错误: ${error.message}`);
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '请求验证失败'
        }
      }, 400);
    }
  };
}

/**
 * 速率限制中间件
 * @param {Object} options - 配置选项
 * @returns {Function} 中间件函数
 */
export function rateLimitMiddleware(options = {}) {
  const {
    windowMs = 60 * 1000, // 时间窗口，默认1分钟
    max = 100, // 最大请求数
    message = '请求过于频繁，请稍后再试'
  } = options;
  
  // 简单的内存存储，生产环境应使用Redis等
  const requests = new Map();
  
  return async (c, next) => {
    const clientId = c.req.header('x-forwarded-for') || 
                     c.req.header('x-real-ip') || 
                     c.req.header('x-client-ip') || 
                     'unknown';
    
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // 获取客户端的请求记录
    if (!requests.has(clientId)) {
      requests.set(clientId, []);
    }
    
    const clientRequests = requests.get(clientId);
    
    // 清理过期的请求记录
    const validRequests = clientRequests.filter(timestamp => timestamp > windowStart);
    requests.set(clientId, validRequests);
    
    // 检查是否超过限制
    if (validRequests.length >= max) {
      return c.json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message
        }
      }, 429);
    }
    
    // 记录当前请求
    validRequests.push(now);
    
    await next();
  };
}

/**
 * 通用错误处理中间件
 * @param {Object} options - 配置选项
 * @returns {Function} 中间件函数
 */
export function errorHandlerMiddleware(options = {}) {
  const {
    logErrors = true,
    showStackTrace = false
  } = options;
  
  return async (c, next) => {
    try {
      await next();
    } catch (error) {
      // 记录错误
      if (logErrors) {
        logError(`API错误: ${error.message}\n${error.stack}`);
      }
      
      // 根据错误类型返回不同的响应
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = '服务器内部错误';
      
      // 处理特定错误类型
      if (error.name === 'ValidationError') {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
        message = error.message;
      } else if (error.name === 'NotFoundError') {
        statusCode = 404;
        errorCode = 'NOT_FOUND';
        message = error.message;
      } else if (error.name === 'UnauthorizedError') {
        statusCode = 401;
        errorCode = 'UNAUTHORIZED';
        message = error.message;
      }
      
      // 构建错误响应
      const errorResponse = {
        success: false,
        error: {
          code: errorCode,
          message
        }
      };
      
      // 在开发环境中添加堆栈跟踪
      if (showStackTrace && process.env.NODE_ENV !== 'production') {
        errorResponse.error.stack = error.stack;
      }
      
      return c.json(errorResponse, statusCode);
    }
  };
}