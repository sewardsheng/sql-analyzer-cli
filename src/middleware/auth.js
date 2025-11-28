/**
* API认证中间件
* 提供简单的API密钥认证功能
*/

import { ApiError, ErrorTypes } from '../utils/api/api-error.js';

/**
* 创建API密钥认证中间件
* @param {string} apiKey - API密钥
* @returns {Function} Hono中间件
*/
export function createApiKeyAuthMiddleware(apiKey = null) {
// 如果没有设置API密钥，则跳过认证
if (!apiKey || apiKey === 'your_api_key_here') {
return async (c, next) => {
await next();
};
}

return async (c, next) => {
const authHeader = c.req.header('Authorization');
const queryKey = c.req.query('api_key');

let providedKey = null;

// 从Authorization header获取密钥
if (authHeader && authHeader.startsWith('Bearer ')) {
providedKey = authHeader.substring(7);
}

// 从查询参数获取密钥（备用方案）
if (!providedKey && queryKey) {
providedKey = queryKey;
}

// 验证密钥
if (!providedKey || providedKey !== apiKey) {
throw new ApiError(ErrorTypes.UNAUTHORIZED, '无效的API密钥');
}

await next();
};
}

/**
* 创建管理员认证中间件
* @param {string} adminKey - 管理员密钥
* @returns {Function} Hono中间件
*/
export function createAdminAuthMiddleware(adminKey = null) {
if (!adminKey || adminKey === 'your_admin_key_here') {
return async (c, next) => {
await next();
};
}

return async (c, next) => {
const authHeader = c.req.header('Authorization');
const queryKey = c.req.query('admin_key');

let providedKey = null;

if (authHeader && authHeader.startsWith('Bearer ')) {
providedKey = authHeader.substring(7);
}

if (!providedKey && queryKey) {
providedKey = queryKey;
}

if (!providedKey || providedKey !== adminKey) {
throw new ApiError(ErrorTypes.FORBIDDEN, '需要管理员权限');
}

await next();
};
}

// 默认导出
export { createApiKeyAuthMiddleware as createDefaultAuthMiddleware };