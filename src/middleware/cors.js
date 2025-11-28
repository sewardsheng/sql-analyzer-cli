/**
* CORS中间件
* 处理跨域资源共享
*/

/**
* CORS中间件配置
* @param {Object} options - CORS配置选项
* @param {string} options.origin - 允许的源
* @param {Array} options.methods - 允许的HTTP方法
* @param {Array} options.headers - 允许的请求头
* @param {boolean} options.credentials - 是否允许凭据
* @returns {Function} 中间件函数
*/
export function corsMiddleware(options = {}) {
const config = {
origin: options.origin || '*',
methods: options.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
headers: options.headers || ['Content-Type', 'Authorization'],
credentials: options.credentials || false,
maxAge: options.maxAge || 600
};

return async (c, next) => {
// 设置CORS头
c.header('Access-Control-Allow-Origin', config.origin);
c.header('Access-Control-Allow-Methods', config.methods.join(', '));
c.header('Access-Control-Allow-Headers', config.headers.join(', '));
c.header('Access-Control-Max-Age', config.maxAge);

if (config.credentials) {
c.header('Access-Control-Allow-Credentials', 'true');
}

// 处理预检请求
if (c.req.method === 'OPTIONS') {
return c.text('', 204);
}

await next();
};
}

/**
* 创建默认CORS中间件
* @returns {Function} 中间件函数
*/
export function createDefaultCorsMiddleware() {
const corsEnabled = process.env.API_CORS_ENABLED !== 'false';
const corsOrigin = process.env.API_CORS_ORIGIN || '*';

return corsMiddleware({
origin: corsEnabled ? corsOrigin : false,
methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
headers: ['Content-Type', 'Authorization', 'X-Request-ID'],
credentials: true,
maxAge: 600
});
}