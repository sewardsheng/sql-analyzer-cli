/**
* 请求限流中间件
* 防止API滥用和DDoS攻击
*/

import { warn as logWarning } from '../utils/logger.js';

/**
* 内存存储的限流器
*/
class MemoryStore {
constructor() {
this.requests = new Map();
}

/**
* 增加请求计数
* @param {string} key - 限流键
* @param {number} windowMs - 时间窗口（毫秒）
*/
increment(key, windowMs) {
const now = Date.now();
const windowStart = now - windowMs;

if (!this.requests.has(key)) {
this.requests.set(key, []);
}

// 清理过期的请求记录
const requests = this.requests.get(key).filter(timestamp => timestamp > windowStart);
requests.push(now);

this.requests.set(key, requests);
return requests.length;
}

/**
* 重置指定键的计数
* @param {string} key - 限流键
*/
reset(key) {
this.requests.delete(key);
}

/**
* 清理所有过期数据
* @param {number} windowMs - 时间窗口（毫秒）
*/
cleanup(windowMs) {
const now = Date.now();
const windowStart = now - windowMs;

for (const [key, requests] of this.requests.entries()) {
const validRequests = requests.filter(timestamp => timestamp > windowStart);
if (validRequests.length === 0) {
this.requests.delete(key);
} else {
this.requests.set(key, validRequests);
}
}
}
}

// 全局存储实例
const globalStore = new MemoryStore();

// 定期清理过期数据
setInterval(() => {
const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW) || 900000; // 15分钟
globalStore.cleanup(windowMs);
}, 60000); // 每分钟清理一次

/**
* 限流中间件
* @param {Object} options - 配置选项
* @param {number} options.windowMs - 时间窗口（毫秒）
* @param {number} options.max - 最大请求数
* @param {string} options.message - 限流消息
* @param {Function} options.keyGenerator - 键生成函数
* @returns {Function} 中间件函数
*/
export function rateLimitMiddleware(options = {}) {
const config = {
windowMs: parseInt(options.windowMs) || parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15分钟
max: parseInt(options.max) || parseInt(process.env.RATE_LIMIT_MAX) || 100,
message: options.message || '请求过于频繁，请稍后再试',
keyGenerator: options.keyGenerator || ((req) => {
// 安全地获取header，避免Hono兼容性问题
let ip = 'unknown';
try {
if (req.raw && req.raw.headers) {
ip = req.raw.headers['x-forwarded-for'] ||
      req.raw.headers['x-real-ip'] ||
      req.raw.headers['x-forwarded-host'] ||
      req.ip ||
      'unknown';
} else if (req.ip) {
ip = req.ip;
}
} catch (error) {
ip = 'unknown';
}
return ip;
})
};

return async (c, next) => {
const req = c.req;
const key = config.keyGenerator(req);

// 获取当前请求计数
const currentRequests = globalStore.increment(key, config.windowMs);

// 检查是否超过限制
if (currentRequests > config.max) {
logWarning(`请求限流触发: ${key}`, {
ip: req.ip,
currentRequests,
limit: config.max,
windowMs: config.windowMs
});

return c.json({
success: false,
error: config.message,
retryAfter: Math.ceil(config.windowMs / 1000), // 秒数
limit: config.max,
windowMs: config.windowMs,
timestamp: new Date().toISOString()
}, 429);
}

// 添加限流信息到响应头
c.header('X-RateLimit-Limit', config.max);
c.header('X-RateLimit-Remaining', Math.max(0, config.max - currentRequests));
c.header('X-RateLimit-Reset', new Date(Date.now() + config.windowMs).toISOString());

await next();
};
}

/**
* 创建默认限流中间件
* @returns {Function} 中间件函数
*/
export function createDefaultRateLimiterMiddleware() {
return rateLimitMiddleware({
windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15分钟
max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
message: '请求过于频繁，请稍后再试',
keyGenerator: (req) => {
// 使用IP作为限流键，可以考虑更复杂的策略
// 安全地获取header，避免Hono兼容性问题
let ip = 'unknown';
try {
if (req.raw && req.raw.headers) {
// 从原生headers获取
ip = req.raw.headers['x-forwarded-for'] ||
      req.raw.headers['x-real-ip'] ||
      req.raw.headers['x-forwarded-host'] ||
      req.ip ||
      'unknown';
} else if (req.ip) {
ip = req.ip;
}
} catch (error) {
ip = 'unknown';
}
return `rate_limit_${ip}`;
}
});
}

/**
* 创建分析API专用限流中间件
* 分析API通常需要更多资源，使用更严格的限制
* @returns {Function} 中间件函数
*/
export function createAnalysisRateLimiterMiddleware() {
return rateLimitMiddleware({
windowMs: parseInt(process.env.ANALYSIS_RATE_LIMIT_WINDOW) || 600000, // 10分钟
max: parseInt(process.env.ANALYSIS_RATE_LIMIT_MAX) || 20, // 每小时20次
message: '分析请求过于频繁，请稍后再试',
keyGenerator: (req) => {
// 安全地获取header，避免Hono兼容性问题
let ip = 'unknown';
try {
if (req.raw && req.raw.headers) {
ip = req.raw.headers['x-forwarded-for'] ||
      req.raw.headers['x-real-ip'] ||
      req.raw.headers['x-forwarded-host'] ||
      req.ip ||
      'unknown';
} else if (req.ip) {
ip = req.ip;
}
} catch (error) {
ip = 'unknown';
}
return `analysis_limit_${ip}`;
}
});
}

/**
* 创建管理API专用限流中间件
* 管理API使用较宽松的限制
* @returns {Function} 中间件函数
*/
export function createAdminRateLimiterMiddleware() {
return rateLimitMiddleware({
windowMs: parseInt(process.env.ADMIN_RATE_LIMIT_WINDOW) || 300000, // 5分钟
max: parseInt(process.env.ADMIN_RATE_LIMIT_MAX) || 200, // 每分钟200次
message: '管理操作过于频繁，请稍后再试',
keyGenerator: (req) => {
// 安全地获取header，避免Hono兼容性问题
let ip = 'unknown';
try {
if (req.raw && req.raw.headers) {
ip = req.raw.headers['x-forwarded-for'] ||
      req.raw.headers['x-real-ip'] ||
      req.raw.headers['x-forwarded-host'] ||
      req.ip ||
      'unknown';
} else if (req.ip) {
ip = req.ip;
}
} catch (error) {
ip = 'unknown';
}
return `admin_limit_${ip}`;
}
});
}