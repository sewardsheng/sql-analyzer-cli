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
};

/**
* API错误类
*/
export class ApiError extends Error {
/**
* 创建API错误实例
* @param {string} message - 错误消息
* @param {string} type - 错误类型
* @param {number} statusCode - HTTP状态码
* @param {Object} details - 错误详情
*/
constructor(message, type = ErrorTypes.INTERNAL, statusCode = 500, details = null) {
super(message);
this.name = 'ApiError';
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
getUserMessage() {
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
* @param {string} message - 错误消息
* @param {Object} details - 错误详情
* @returns {ApiError} 验证错误
*/
export function createValidationError(message, details = null) {
return new ApiError(message, ErrorTypes.VALIDATION, 400, details);
}

/**
* 创建认证错误
* @param {string} message - 错误消息
* @param {Object} details - 错误详情
* @returns {ApiError} 认证错误
*/
export function createAuthError(message = '身份验证或权限不足', details = null) {
return new ApiError(message, ErrorTypes.AUTH, 401, details);
}

/**
* 创建未找到错误
* @param {string} resource - 资源名称
* @param {Object} details - 错误详情
* @returns {ApiError} 未找到错误
*/
export function createNotFoundError(resource = '资源', details = null) {
const message = `${resource}未找到`;
return new ApiError(message, ErrorTypes.NOT_FOUND, 404, { resource, ...details });
}

/**
* 创建限流错误
* @param {string} message - 错误消息
* @param {Object} details - 错误详情
* @returns {ApiError} 限流错误
*/
export function createRateLimitError(message = '请求过于频繁，请稍后再试', details = null) {
return new ApiError(message, ErrorTypes.RATE_LIMIT, 429, details);
}

/**
* 创建外部服务错误
* @param {string} message - 错误消息
* @param {Object} details - 错误详情
* @returns {ApiError} 外部服务错误
*/
export function createExternalError(message = '外部服务暂时不可用', details = null) {
return new ApiError(message, ErrorTypes.EXTERNAL, 502, details);
}

/**
* 创建业务错误
* @param {string} message - 错误消息
* @param {Object} details - 错误详情
* @returns {ApiError} 业务错误
*/
export function createBusinessError(message, details = null) {
return new ApiError(message, ErrorTypes.BUSINESS, 400, details);
}

/**
* 创建内部错误
* @param {string} message - 错误消息
* @param {Object} details - 错误详情
* @returns {ApiError} 内部错误
*/
export function createInternalError(message = '系统错误', details = null) {
return new ApiError(message, ErrorTypes.INTERNAL, 500, details);
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

// 错误类型映射
const errorMap = {
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

// 状态码映射
const statusCodeMap = {
'ValidationError': 400,
'NotFoundError': 404,
'UnauthorizedError': 401,
'ForbiddenError': 403,
'RateLimitError': 429
};

return statusCodeMap[error.name] || 500;
}