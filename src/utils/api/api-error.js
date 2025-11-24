/**
 * 统一API错误处理类
 * 提供标准化的错误类型和处理机制
 */

/**
 * 错误类型枚举
 */
export const ErrorTypes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  BUSINESS_ERROR: 'BUSINESS_ERROR'
};

/**
 * 自定义API错误类
 */
export class ApiError extends Error {
  /**
   * 创建API错误实例
   * @param {string} message - 错误消息
   * @param {string} type - 错误类型
   * @param {number} statusCode - HTTP状态码
   * @param {Object} details - 错误详情
   * @param {string} code - 错误代码
   */
  constructor(message, type = ErrorTypes.INTERNAL_ERROR, statusCode = 500, details = null, code = null) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
    this.timestamp = new Date().toISOString();
    
    // 确保堆栈跟踪正确
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * 转换为JSON格式
   * @returns {Object} JSON格式的错误信息
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      statusCode: this.statusCode,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp
    };
  }

  /**
   * 获取用户友好的错误消息
   * @returns {string} 用户友好的错误消息
   */
  getUserMessage() {
    switch (this.type) {
      case ErrorTypes.VALIDATION_ERROR:
        return '请求参数不正确，请检查输入';
      case ErrorTypes.AUTHENTICATION_ERROR:
        return '身份验证失败，请重新登录';
      case ErrorTypes.AUTHORIZATION_ERROR:
        return '权限不足，无法执行此操作';
      case ErrorTypes.NOT_FOUND_ERROR:
        return '请求的资源不存在';
      case ErrorTypes.RATE_LIMIT_ERROR:
        return '请求过于频繁，请稍后再试';
      case ErrorTypes.EXTERNAL_SERVICE_ERROR:
        return '外部服务暂时不可用，请稍后再试';
      case ErrorTypes.TIMEOUT_ERROR:
        return '请求超时，请稍后再试';
      case ErrorTypes.DATABASE_ERROR:
        return '数据库操作失败，请稍后再试';
      case ErrorTypes.CONFIGURATION_ERROR:
        return '系统配置错误，请联系管理员';
      case ErrorTypes.BUSINESS_ERROR:
        return this.message; // 业务错误直接显示原始消息
      default:
        return '系统错误，请稍后再试';
    }
  }
}

/**
 * 创建验证错误
 * @param {string} message - 错误消息
 * @param {Object} details - 错误详情
 * @param {string} code - 错误代码
 * @returns {ApiError} 验证错误
 */
export function createValidationError(message, details = null, code = null) {
  return new ApiError(message, ErrorTypes.VALIDATION_ERROR, 400, details, code);
}

/**
 * 创建身份验证错误
 * @param {string} message - 错误消息
 * @param {Object} details - 错误详情
 * @param {string} code - 错误代码
 * @returns {ApiError} 身份验证错误
 */
export function createAuthenticationError(message = '身份验证失败', details = null, code = null) {
  return new ApiError(message, ErrorTypes.AUTHENTICATION_ERROR, 401, details, code);
}

/**
 * 创建授权错误
 * @param {string} message - 错误消息
 * @param {Object} details - 错误详情
 * @param {string} code - 错误代码
 * @returns {ApiError} 授权错误
 */
export function createAuthorizationError(message = '权限不足', details = null, code = null) {
  return new ApiError(message, ErrorTypes.AUTHORIZATION_ERROR, 403, details, code);
}

/**
 * 创建未找到错误
 * @param {string} resource - 资源名称
 * @param {string} identifier - 资源标识符
 * @param {Object} details - 错误详情
 * @param {string} code - 错误代码
 * @returns {ApiError} 未找到错误
 */
export function createNotFoundError(resource, identifier = '', details = null, code = null) {
  const message = identifier ? `${resource} '${identifier}' 未找到` : `${resource}未找到`;
  const errorDetails = { resource, identifier, ...details };
  return new ApiError(message, ErrorTypes.NOT_FOUND_ERROR, 404, errorDetails, code);
}

/**
 * 创建限流错误
 * @param {string} message - 错误消息
 * @param {Object} details - 错误详情
 * @param {string} code - 错误代码
 * @returns {ApiError} 限流错误
 */
export function createRateLimitError(message = '请求过于频繁，请稍后再试', details = null, code = null) {
  return new ApiError(message, ErrorTypes.RATE_LIMIT_ERROR, 429, details, code);
}

/**
 * 创建外部服务错误
 * @param {string} message - 错误消息
 * @param {Object} details - 错误详情
 * @param {string} code - 错误代码
 * @returns {ApiError} 外部服务错误
 */
export function createExternalServiceError(message = '外部服务错误', details = null, code = null) {
  return new ApiError(message, ErrorTypes.EXTERNAL_SERVICE_ERROR, 502, details, code);
}

/**
 * 创建超时错误
 * @param {string} message - 错误消息
 * @param {Object} details - 错误详情
 * @param {string} code - 错误代码
 * @returns {ApiError} 超时错误
 */
export function createTimeoutError(message = '请求超时', details = null, code = null) {
  return new ApiError(message, ErrorTypes.TIMEOUT_ERROR, 408, details, code);
}

/**
 * 创建数据库错误
 * @param {string} message - 错误消息
 * @param {Object} details - 错误详情
 * @param {string} code - 错误代码
 * @returns {ApiError} 数据库错误
 */
export function createDatabaseError(message = '数据库操作失败', details = null, code = null) {
  return new ApiError(message, ErrorTypes.DATABASE_ERROR, 500, details, code);
}

/**
 * 创建配置错误
 * @param {string} message - 错误消息
 * @param {Object} details - 错误详情
 * @param {string} code - 错误代码
 * @returns {ApiError} 配置错误
 */
export function createConfigurationError(message = '系统配置错误', details = null, code = null) {
  return new ApiError(message, ErrorTypes.CONFIGURATION_ERROR, 500, details, code);
}

/**
 * 创建业务错误
 * @param {string} message - 错误消息
 * @param {Object} details - 错误详情
 * @param {string} code - 错误代码
 * @returns {ApiError} 业务错误
 */
export function createBusinessError(message, details = null, code = null) {
  return new ApiError(message, ErrorTypes.BUSINESS_ERROR, 400, details, code);
}

/**
 * 创建内部服务器错误
 * @param {string} message - 错误消息
 * @param {Object} details - 错误详情
 * @param {string} code - 错误代码
 * @returns {ApiError} 内部服务器错误
 */
export function createInternalError(message = '内部服务器错误', details = null, code = null) {
  return new ApiError(message, ErrorTypes.INTERNAL_ERROR, 500, details, code);
}

/**
 * 从普通错误创建API错误
 * @param {Error} error - 普通错误对象
 * @param {string} defaultMessage - 默认错误消息
 * @returns {ApiError} API错误对象
 */
export function fromError(error, defaultMessage = '未知错误') {
  if (error instanceof ApiError) {
    return error;
  }

  // 根据错误类型推断API错误类型
  let type = ErrorTypes.INTERNAL_ERROR;
  let statusCode = 500;

  if (error.name === 'ValidationError') {
    type = ErrorTypes.VALIDATION_ERROR;
    statusCode = 400;
  } else if (error.name === 'NotFoundError') {
    type = ErrorTypes.NOT_FOUND_ERROR;
    statusCode = 404;
  } else if (error.name === 'UnauthorizedError') {
    type = ErrorTypes.AUTHENTICATION_ERROR;
    statusCode = 401;
  } else if (error.name === 'ForbiddenError') {
    type = ErrorTypes.AUTHORIZATION_ERROR;
    statusCode = 403;
  } else if (error.name === 'RateLimitError') {
    type = ErrorTypes.RATE_LIMIT_ERROR;
    statusCode = 429;
  }

  return new ApiError(
    error.message || defaultMessage,
    type,
    statusCode,
    {
      originalError: error.name,
      stack: error.stack
    }
  );
}

/**
 * 检查是否为API错误
 * @param {Error} error - 错误对象
 * @returns {boolean} 是否为API错误
 */
export function isApiError(error) {
  return error instanceof ApiError;
}

/**
 * 获取错误状态码
 * @param {Error} error - 错误对象
 * @returns {number} HTTP状态码
 */
export function getErrorStatusCode(error) {
  if (error instanceof ApiError) {
    return error.statusCode;
  }

  // 根据错误类型推断状态码
  if (error.name === 'ValidationError') {
    return 400;
  } else if (error.name === 'NotFoundError') {
    return 404;
  } else if (error.name === 'UnauthorizedError') {
    return 401;
  } else if (error.name === 'ForbiddenError') {
    return 403;
  } else if (error.name === 'RateLimitError') {
    return 429;
  }

  // 默认为内部服务器错误
  return 500;
}