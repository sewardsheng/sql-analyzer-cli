/**
 * API错误处理类
 * 错误类型和处理机制
 */

/**
 * 错误类型枚举
 */
export const ErrorTypes = {
  VALIDATION: 'VALIDATION',
  AUTH: 'AUTH',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT: 'RATE_LIMIT',
  EXTERNAL: 'EXTERNAL',
  INTERNAL: 'INTERNAL',
  BUSINESS: 'BUSINESS'
} as const;

export type ErrorType = typeof ErrorTypes[keyof typeof ErrorTypes];

/**
 * 错误详情接口
 */
export interface ErrorDetails {
  resource?: string;
  originalError?: string;
  stack?: string;
  [key: string]: any;
}

/**
 * API错误类
 */
export class ApiError extends Error {
  public readonly name: string = 'ApiError';
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly details: ErrorDetails | null;
  public readonly timestamp: string;

  /**
   * 创建API错误实例
   * @param message - 错误消息
   * @param type - 错误类型
   * @param statusCode - HTTP状态码
   * @param details - 错误详情
   */
  constructor(
    message: string,
    type: ErrorType = ErrorTypes.INTERNAL,
    statusCode: number = 500,
    details: ErrorDetails | null = null
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * 获取用户友好的错误消息
   * @returns {string} 用户友好的错误消息
   */
  getUserMessage(): string {
    const messages = {
      [ErrorTypes.VALIDATION]: '请求参数不正确，请检查输入',
      [ErrorTypes.AUTH]: '身份验证或权限不足',
      [ErrorTypes.NOT_FOUND]: '请求的资源不存在',
      [ErrorTypes.RATE_LIMIT]: '请求过于频繁，请稍后再试',
      [ErrorTypes.EXTERNAL]: '外部服务暂时不可用，请稍后再试',
      [ErrorTypes.BUSINESS]: this.message, // 业务错误直接显示原始消息
      [ErrorTypes.INTERNAL]: '系统错误，请稍后再试'
    };

    return messages[this.type] || messages[ErrorTypes.INTERNAL];
  }
}

/**
 * 创建验证错误
 * @param message - 错误消息
 * @param details - 错误详情
 * @returns {ApiError} 验证错误
 */
export function createValidationError(
  message: string,
  details: ErrorDetails | null = null
): ApiError {
  return new ApiError(message, ErrorTypes.VALIDATION, 400, details);
}

/**
 * 创建认证错误
 * @param message - 错误消息
 * @param details - 错误详情
 * @returns {ApiError} 认证错误
 */
export function createAuthError(
  message: string = '身份验证或权限不足',
  details: ErrorDetails | null = null
): ApiError {
  return new ApiError(message, ErrorTypes.AUTH, 401, details);
}

/**
 * 创建未找到错误
 * @param resource - 资源名称
 * @param details - 错误详情
 * @returns {ApiError} 未找到错误
 */
export function createNotFoundError(
  resource: string = '资源',
  details: ErrorDetails | null = null
): ApiError {
  const message = `${resource}未找到`;
  return new ApiError(message, ErrorTypes.NOT_FOUND, 404, { resource, ...details });
}

/**
 * 创建限流错误
 * @param message - 错误消息
 * @param details - 错误详情
 * @returns {ApiError} 限流错误
 */
export function createRateLimitError(
  message: string = '请求过于频繁，请稍后再试',
  details: ErrorDetails | null = null
): ApiError {
  return new ApiError(message, ErrorTypes.RATE_LIMIT, 429, details);
}

/**
 * 创建外部服务错误
 * @param message - 错误消息
 * @param details - 错误详情
 * @returns {ApiError} 外部服务错误
 */
export function createExternalError(
  message: string = '外部服务暂时不可用',
  details: ErrorDetails | null = null
): ApiError {
  return new ApiError(message, ErrorTypes.EXTERNAL, 502, details);
}

/**
 * 创建业务错误
 * @param message - 错误消息
 * @param details - 错误详情
 * @returns {ApiError} 业务错误
 */
export function createBusinessError(
  message: string,
  details: ErrorDetails | null = null
): ApiError {
  return new ApiError(message, ErrorTypes.BUSINESS, 400, details);
}

/**
 * 创建内部错误
 * @param message - 错误消息
 * @param details - 错误详情
 * @returns {ApiError} 内部错误
 */
export function createInternalError(
  message: string = '系统错误',
  details: ErrorDetails | null = null
): ApiError {
  return new ApiError(message, ErrorTypes.INTERNAL, 500, details);
}

/**
 * 从普通错误创建API错误
 * @param error - 普通错误对象
 * @param defaultMessage - 默认错误消息
 * @returns {ApiError} API错误对象
 */
export function fromError(
  error: Error,
  defaultMessage: string = '未知错误'
): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  // 错误类型映射
  const errorMap: Record<string, { type: ErrorType; statusCode: number }> = {
    'ValidationError': { type: ErrorTypes.VALIDATION, statusCode: 400 },
    'NotFoundError': { type: ErrorTypes.NOT_FOUND, statusCode: 404 },
    'UnauthorizedError': { type: ErrorTypes.AUTH, statusCode: 401 },
    'ForbiddenError': { type: ErrorTypes.AUTH, statusCode: 403 },
    'RateLimitError': { type: ErrorTypes.RATE_LIMIT, statusCode: 429 }
  };

  const mapped = errorMap[error.name] || { type: ErrorTypes.INTERNAL, statusCode: 500 };

  return new ApiError(
    error.message || defaultMessage,
    mapped.type,
    mapped.statusCode,
    {
      originalError: error.name,
      stack: error.stack
    }
  );
}

/**
 * 检查是否为API错误
 * @param error - 错误对象
 * @returns {boolean} 是否为API错误
 */
export function isApiError(error: any): error is ApiError {
  return error instanceof ApiError;
}

/**
 * 获取错误状态码
 * @param error - 错误对象
 * @returns {number} HTTP状态码
 */
export function getErrorStatusCode(error: Error): number {
  if (error instanceof ApiError) {
    return error.statusCode;
  }

  // 状态码映射
  const statusCodeMap: Record<string, number> = {
    'ValidationError': 400,
    'NotFoundError': 404,
    'UnauthorizedError': 401,
    'ForbiddenError': 403,
    'RateLimitError': 429
  };

  return statusCodeMap[error.name] || 500;
}