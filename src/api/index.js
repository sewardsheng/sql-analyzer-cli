/**
 * SQL分析API服务器
 * 使用Hono框架提供REST API接口
 */

import { Hono } from 'hono';
import { getAnalysisEngine } from '../core/index.js';
import { getConfigManager } from '../config/index.js';
import { logInfo, logError, logApiRequest, logApiError, generateRequestId } from '../utils/logger.js';

// 导入路由模块
import { registerAnalyzeRoutes } from './routes/analyze.js';
import { registerHistoryRoutes } from './routes/history.js';
import { registerKnowledgeRoutes } from './routes/knowledge.js';
import { registerConfigRoutes } from './routes/config.js';
import { registerInitRoutes } from './routes/init.js';
import { registerStatusRoutes } from './routes/status.js';
import { registerHealthRoutes } from './routes/health.js';

// 导入API文档
// import { setupDocs } from './docs.js'; // 暂时禁用

// 导入中间件
import {
  createDefaultCorsMiddleware,
  createDefaultRateLimiterMiddleware,
  createDefaultRequestLoggerMiddleware,
  createDefaultErrorHandlerMiddleware,
  notFoundHandlerMiddleware
} from '../middleware/index.js';

/**
 * 创建并启动API服务器
 * @param {Object} options - 服务器配置选项
 * @param {number} options.port - 端口号
 * @param {string} options.host - 主机地址
 * @param {boolean} options.cors - 是否启用CORS
 * @param {string} options.corsOrigin - CORS允许的源
 * @returns {Promise<Object>} 服务器实例
 */
export async function createApiServer(options = {}) {
  const configManager = getConfigManager();
  const config = await configManager.getConfig();
  
  // 合并配置
  const serverConfig = {
    port: options.port || config.apiPort || 3000,
    host: options.host || config.apiHost || '0.0.0.0',
    corsEnabled: options.cors !== false && config.apiCorsEnabled !== false,
    corsOrigin: options.corsOrigin || config.apiCorsOrigin || '*',
    nodeEnv: options.nodeEnv || process.env.NODE_ENV || 'development',
    logLevel: options.logLevel || process.env.LOG_LEVEL || 'info'
  };
  
  // 记录服务器启动日志
  await logInfo('API服务器启动中', {
    type: 'server_start',
    port: serverConfig.port,
    host: serverConfig.host,
    corsEnabled: serverConfig.corsEnabled,
    corsOrigin: serverConfig.corsOrigin,
    environment: process.env.NODE_ENV || 'development'
  });
  
  // 创建Hono应用
  const app = new Hono();
  
  // 设置应用级别的配置
  app.use('*', async (c, next) => {
    // 设置应用上下文
    c.set('serverConfig', serverConfig);
    c.set('startTime', Date.now());
    
    await next();
  });
  
  // 按正确顺序应用中间件
  app.use('*', createDefaultCorsMiddleware());
  app.use('*', createDefaultRateLimiterMiddleware());
  app.use('*', createDefaultRequestLoggerMiddleware());
  
  // 注册路由模块
  registerAnalyzeRoutes(app);
  registerHistoryRoutes(app);
  registerKnowledgeRoutes(app);
  registerConfigRoutes(app);
  registerInitRoutes(app);
  registerStatusRoutes(app);
  registerHealthRoutes(app);
  
  // 设置API文档
  // setupDocs(app); // 暂时禁用
  
  // 获取分析引擎实例
  const analysisEngine = getAnalysisEngine();
  
  // 注册错误处理中间件（使用 Hono 的正确方式）
  app.onError(async (error, c) => {
    const errorHandler = createDefaultErrorHandlerMiddleware();
    return errorHandler(error, c);
  });
  
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
      await logApiError('GET', '/web', error, {
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
        knowledgeLearn: 'POST /api/knowledge/learn'
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
  console.log('\n' + '='.repeat(60));
  console.log('🚀 SQL Analyzer API 服务器启动中...');
  console.log('='.repeat(60));
  console.log(`\n📍 服务地址: http://${serverConfig.host}:${serverConfig.port}`);
  console.log(`📖 API文档: http://${serverConfig.host}:${serverConfig.port}/api/docs/swagger`);
  console.log(`📋 OpenAPI规范: http://${serverConfig.host}:${serverConfig.port}/api/docs/doc`);
  console.log(`💚 健康检查: http://${serverConfig.host}:${serverConfig.port}/api/health`);
  console.log(`\n环境: ${serverConfig.nodeEnv}`);
  console.log(`日志级别: ${serverConfig.logLevel}`);
  console.log(`CORS: ${serverConfig.corsEnabled ? '已启用' : '已禁用'}`);
  if (serverConfig.corsEnabled) {
    console.log(`允许源: ${serverConfig.corsOrigin}`);
  }
  console.log('\n' + '='.repeat(60));
  console.log('✓ 服务器已就绪，等待请求...\n');
  
  // 使用Bun的原生serve方法启动服务器
  let server;
  try {
    server = Bun.serve({
      port: serverConfig.port,
      hostname: serverConfig.host,
      fetch: app.fetch
    });
    
    // 记录服务器启动成功日志
    await logInfo('API服务器启动成功', {
      type: 'server_started',
      port: serverConfig.port,
      host: serverConfig.host,
      pid: process.pid
    });
    
    // 添加停止方法
    server.stop = async () => {
      console.log('正在停止API服务器...');
      await logInfo('API服务器停止中', {
        type: 'server_stopping',
        port: serverConfig.port,
        host: serverConfig.host
      });
      // Bun.serve 返回的对象没有stop方法，这里只是记录
    };
    
    return server;
  } catch (error) {
    await logError('API服务器启动失败', error, {
      type: 'server_start_failed',
      port: serverConfig.port,
      host: serverConfig.host
    });
    throw error;
  }
}

export default createApiServer;