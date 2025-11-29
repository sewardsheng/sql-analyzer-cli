/**
 * SQL分析API服务器
 * 使用Hono框架提供REST API接口
 */

import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { config } from '../config/index.js';
import { info as logInfo, error as logError, logApiRequest, logApiError, generateRequestId, LogCategory } from '../utils/logger.js';

// 导入路由模块
import { registerAnalyzeRoutes } from './routes/analyze.js';
import { registerConfigRoutes } from './routes/config.js';
import { registerHistoryRoutes } from './routes/history.js';
import { registerKnowledgeRoutes } from './routes/knowledge.js';
import { registerSystemRoutes } from './routes/system.js';
import { registerRuleLearningRoutes } from './routes/rule-learning-hono.js';

// 导入中间件
import {
  createDefaultCorsMiddleware,
  createDefaultRateLimiterMiddleware,
  createDefaultRequestLoggerMiddleware,
  createDefaultErrorHandlerMiddleware,
  notFoundHandlerMiddleware
} from '../middleware/index.js';

// 类型定义
interface ServerConfig {
  port: number;
  host: string;
  nodeEnv: string;
  logLevel: string;
  cors: {
    enabled: boolean;
    origin: string;
  };
}

interface ApiServerOptions {
  port?: number;
  host?: string;
  cors?: boolean;
  corsOrigin?: string;
  nodeEnv?: string;
  logLevel?: string;
}

interface ApiServerInstance {
  stop?(): Promise<void>;
  fetch(request: Request, ...args: unknown[]): Promise<Response>;
}

interface Variables {
  serverConfig?: ServerConfig;
  startTime?: number;
  requestId?: string;
}

type AppContext = Context<{ Variables: Variables }>;

// 创建通用Hono实例类型
type HonoApp = Hono<{ Variables: Variables }>;

/**
 * 创建并启动API服务器
 * @param options - 服务器配置选项
 * @returns Promise<ApiServerInstance> - 服务器实例
 */
export async function createApiServer(options: ApiServerOptions = {}): Promise<ApiServerInstance> {
// 获取服务器配置
let serverConfig: ServerConfig = config.getServerConfig();

// 应用选项覆盖（如果options中有端口，优先使用options中的）
if (options.port !== undefined) serverConfig.port = options.port;
if (options.host !== undefined) serverConfig.host = options.host;
if (options.cors !== undefined) serverConfig.cors.enabled = options.cors;
if (options.corsOrigin !== undefined) serverConfig.cors.origin = options.corsOrigin;
if (options.nodeEnv !== undefined) serverConfig.nodeEnv = options.nodeEnv;
if (options.logLevel !== undefined) serverConfig.logLevel = options.logLevel;

// 记录服务器启动日志
const logData = {
type: 'server_start',
port: serverConfig.port,
host: serverConfig.host,
corsEnabled: serverConfig.cors.enabled,
corsOrigin: serverConfig.cors.origin,
environment: serverConfig.nodeEnv
};

// 创建Hono应用
const app = new Hono<{ Variables: Variables }>();

// 设置应用级别的配置
app.use('*', async (c: AppContext, next: Next) => {
// 设置应用上下文
c.set('serverConfig', serverConfig);
c.set('startTime', Date.now());

await next();
});

// 按正确顺序应用中间件
app.use('*', createDefaultCorsMiddleware());
app.use('*', createDefaultRateLimiterMiddleware()); // 修复Hono兼容性问题后重新启用
app.use('*', createDefaultRequestLoggerMiddleware()); // 修复Hono兼容性问题后重新启用

// 临时添加简单测试路由
app.get('/api/test', (c) => {
  return c.json({ message: 'Test route working!', timestamp: new Date().toISOString() });
});

// 注册路由到/api路径下
const apiRoutes = new Hono();

console.log('开始注册路由...');

try {
  console.log('注册分析路由...');
  registerAnalyzeRoutes(apiRoutes);
  console.log('分析路由注册成功');
} catch (error) {
  console.error('分析路由注册失败:', error);
  throw error;
}

try {
  console.log('注册历史路由...');
  registerHistoryRoutes(apiRoutes);
  console.log('历史路由注册成功');
} catch (error) {
  console.error('历史路由注册失败:', error);
  throw error;
}

try {
  console.log('注册知识库路由...');
  registerKnowledgeRoutes(apiRoutes);
  console.log('知识库路由注册成功');
  } catch (error) {
  console.error('知识库路由注册失败:', error);
  throw error;
}

try {
  console.log('注册配置路由...');
  registerConfigRoutes(apiRoutes);
  console.log('配置路由注册成功');
} catch (error) {
  console.error('配置路由注册失败:', error);
  throw error;
}

try {
  console.log('注册系统路由...');
  registerSystemRoutes(apiRoutes);
  console.log('系统路由注册成功');
} catch (error) {
  console.error('系统路由注册失败:', error);
  throw error;
}

try {
  console.log('注册规则学习路由...');
  registerRuleLearningRoutes(apiRoutes);
  console.log('规则学习路由注册成功');
} catch (error) {
  console.error('规则学习路由注册失败:', error);
  throw error;
}

// 添加一个简单的测试路由到apiRoutes
apiRoutes.get('/simple-health', (c) => {
  return c.json({ message: 'Simple health works!', timestamp: new Date().toISOString() });
});

console.log('所有路由注册完成，挂载到 /api 路径下');
app.route('/api', apiRoutes);
console.log('路由挂载完成');


// 调试：打印实际的路由信息




// 添加一个简单的测试路由到主应用
app.get('/debug', (c) => {
  return c.json({ message: 'Debug route on main app works!', timestamp: new Date().toISOString() });
});

// 添加一个测试路由到API路由
apiRoutes.get('/debug', (c) => {
  return c.json({ message: 'Debug route on API routes works!', timestamp: new Date().toISOString() });
});



// 设置API文档
// setupDocs(app); // 暂时禁用

// 注册错误处理中间件（使用 Hono 的正确方式）
app.onError(createDefaultErrorHandlerMiddleware());

// 提供静态文件服务（前端页面）
app.get('/web', async (c) => {
const requestId = c.get('requestId') || generateRequestId();

try {
const fs = await import('fs/promises');
const path = await import('path');
const htmlPath = path.join(process.cwd(), 'public', 'index.html');
const html = await fs.readFile(htmlPath, 'utf8');

await logApiRequest(c.req, { status: 200, headers: { get: () => '0' } }, Date.now() - 100, Date.now());

return c.html(html);
} catch (error) {
await logApiError('GET', '/web', error as Error, {
requestId,
userAgent: c.req.header('user-agent'),
ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
});

return c.text('前端页面未找到', 404);
}
});

// ==================== API路由 ====================

/**
* GET / - API根路径
* 返回API信息和可用端点
*/
app.get('/', async (c) => {
const requestId = c.get('requestId') || generateRequestId();

const responseData = {
name: 'SQL Analyzer API',
version: '1.0.0',
description: 'SQL语句智能分析与扫描API服务',
endpoints: {
health: 'GET /api/health',
healthPing: 'GET /api/health/ping',
healthStatus: 'GET /api/health/status',
healthCheck: 'GET /api/health/check/:type',
analyze: 'POST /api/analyze',
analyzeBatch: 'POST /api/analyze/batch',
history: 'GET /api/history',
historyDetail: 'GET /api/history/:id',
historyStats: 'GET /api/history/stats',
knowledge: 'GET /api/knowledge',
knowledgeSearch: 'POST /api/knowledge/search',
knowledgeLearn: 'POST /api/knowledge/learn',
ruleLearning: {
config: 'GET /api/rule-learning/config',
updateConfig: 'PUT /api/rule-learning/config',
resetConfig: 'POST /api/rule-learning/config/reset',
status: 'GET /api/rule-learning/status',
learn: 'POST /api/rule-learning/learn',
history: 'GET /api/rule-learning/history',
rules: 'GET /api/rule-learning/rules',
ruleDetail: 'GET /api/rule-learning/rules/:ruleId',
approveRule: 'POST /api/rule-learning/rules/:ruleId/approve',
deleteRule: 'DELETE /api/rule-learning/rules/:ruleId',
statistics: 'GET /api/rule-learning/statistics',
cleanup: 'DELETE /api/rule-learning/cleanup'
}
},
documentation: '/api/docs/swagger',
openapi: '/api/docs/doc'
};

await logApiRequest(c.req, { status: 200, headers: { get: () => '0' } }, Date.now() - 100, Date.now());

return c.json(responseData);
});


/**
* GET /api/docs - API文档
* 返回API使用文档
*/
app.get('/api/docs', async (c) => {
const requestId = c.get('requestId') || generateRequestId();

const responseData = {
title: 'SQL Analyzer API 文档',
version: '1.0.0',
baseUrl: `http://${serverConfig.host}:${serverConfig.port}`,
endpoints: [
{
method: 'GET',
path: '/',
description: 'API根路径，返回基本信息'
},
{
method: 'GET',
path: '/api/health',
description: '健康检查接口',
response: {
status: 'healthy',
timestamp: '2025-11-15T12:00:00.000Z',
responseTime: '10ms',
service: 'sql-analyzer-api',
version: '1.0.0'
}
},
{
method: 'POST',
path: '/api/analyze',
description: 'SQL分析接口',
requestBody: {
sql: 'SELECT * FROM users',
options: {
performance: true,
security: true,
standards: true,
learn: false
}
},
responseExample: {
success: true,
data: {
originalQuery: 'SELECT * FROM users',
normalizedQuery: 'SELECT * FROM users',
analysisResults: '...',
report: '...'
},
timestamp: '2025-11-15T12:00:00.000Z',
responseTime: '1500ms'
}
},
{
method: 'POST',
path: '/api/analyze/batch',
description: '批量SQL分析接口',
requestBody: {
sqls: [
{ sql: 'SELECT * FROM users'  },
{ sql: 'SELECT * FROM orders' }
],
options: {
performance: true,
security: true,
standards: true,
learn: false
}
},
responseExample: {
success: true,
data: {
results: ['...'],
summary: { total: 2, succeeded: 2, failed: 0 }
},
timestamp: '2025-11-15T12:00:00.000Z',
responseTime: '2500ms'
}
}
],
errorCodes: {
400: 'Bad Request - 请求参数错误',
429: 'Too Many Requests - 请求过于频繁',
500: 'Internal Server Error - 服务器内部错误',
503: 'Service Unavailable - 服务不可用'
}
};

await logApiRequest(c.req, { status: 200, headers: { get: () => '0' } }, Date.now() - 100, Date.now());

return c.json(responseData);
});

// 404处理
app.notFound(notFoundHandlerMiddleware());

// 启动服务器
  


// 使用Bun或Node.js启动服务器
let server: ApiServerInstance;
try {
// 优先使用Bun，如果不可用则使用Node.js
if (typeof Bun !== 'undefined' && Bun.serve) {
  server = Bun.serve({
    port: serverConfig.port,
    hostname: serverConfig.host,
    fetch: app.fetch
  });
} else {
  // 使用官方的@hono/node-server
  const { serve } = await import('@hono/node-server');

  const nodeServer = serve({
    fetch: app.fetch,
    port: serverConfig.port,
    hostname: serverConfig.host
  }, (info) => {
    const displayHost = serverConfig.host === '0.0.0.0' ? 'localhost' : serverConfig.host;
    console.log(`\n🚀 SQL Analyzer API 已启动`);
    console.log(`📍 API服务: http://${displayHost}:${serverConfig.port}`);
    console.log(`🌐 Web界面: http://${displayHost}:${serverConfig.port}/web`);
    console.log(`📚 API文档: http://${displayHost}:${serverConfig.port}/api/docs\n`);

    logInfo(LogCategory.API, 'Node.js API服务器已启动', {
      type: 'server_started',
      port: serverConfig.port,
      host: serverConfig.host
    });
  });

  // 包装成统一接口
  server = {
    fetch: app.fetch,
    stop: async () => {
      return new Promise<void>((resolve) => {
        nodeServer.close(() => {

          resolve();
        });
      });
    }
  } as any;
}

// 添加停止方法
server.stop = async () => {

await logInfo(LogCategory.API, 'API服务器停止中', {
type: 'server_stopping',
port: serverConfig.port,
host: serverConfig.host
});
// Bun.serve 返回的对象没有stop方法，这里只是记录
};

return server;
} catch (error) {
await logError('API服务器启动失败', (error as Error).message, error as Error, {
type: 'server_start_failed',
port: serverConfig.port,
host: serverConfig.host
});
throw error;
}
}

export default createApiServer;