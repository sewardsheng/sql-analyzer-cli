/**
 * SQL分析API服务器
 * 使用Hono框架提供REST API接口
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { getAnalysisService } from '../../services/analysis/index.js';
import { getConfigManager } from '../config/index.js';
import chalk from 'chalk';

// 导入路由模块
import { registerAnalyzeRoutes } from './routes/analyze.js';
import { registerHistoryRoutes } from './routes/history.js';
import { registerKnowledgeRoutes } from './routes/knowledge.js';
import { registerConfigRoutes } from './routes/config.js';
import { registerInitRoutes } from './routes/init.js';
import { registerStatusRoutes } from './routes/status.js';
import { registerHealthRoutes } from './routes/health.js';

/**
 * 创建并启动API服务器
 * @param {Object} options - 服务器配置选项
 * @param {number} options.port - 端口号
 * @param {string} options.host - 主机地址
 * @param {boolean} options.cors - 是否启用CORS
 * @param {string} options.corsOrigin - CORS允许的源
 */
export async function createApiServer(options = {}) {
  const configManager = getConfigManager();
  const config = await configManager.getConfig();
  
  // 合并配置
  const serverConfig = {
    port: options.port || config.apiPort || 3000,
    host: options.host || config.apiHost || '0.0.0.0',
    corsEnabled: options.cors !== false && config.apiCorsEnabled !== false,
    corsOrigin: options.corsOrigin || config.apiCorsOrigin || '*'
  };
  
  // 创建Hono应用
  const app = new Hono();
  
  // 中间件
  app.use('*', logger());
  
  // CORS配置
  if (serverConfig.corsEnabled) {
    app.use('*', cors({
      origin: serverConfig.corsOrigin,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      exposeHeaders: ['Content-Length', 'X-Request-Id'],
      maxAge: 600,
      credentials: true,
    }));
  }
  
  // 注册路由模块
  registerAnalyzeRoutes(app);
  registerHistoryRoutes(app);
  registerKnowledgeRoutes(app);
  registerConfigRoutes(app);
  registerInitRoutes(app);
  registerStatusRoutes(app);
  registerHealthRoutes(app);
  
  // 获取分析服务实例
  const analysisService = getAnalysisService();
  
  // 提供静态文件服务（前端页面）
  app.get('/web', async (c) => {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const htmlPath = path.join(process.cwd(), 'public', 'index.html');
      const html = await fs.readFile(htmlPath, 'utf8');
      return c.html(html);
    } catch (error) {
      return c.text('前端页面未找到', 404);
    }
  });
  
  // ==================== API路由 ====================
  
  /**
   * GET / - API根路径
   * 返回API信息和可用端点
   */
  app.get('/', (c) => {
    return c.json({
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
      documentation: '/api/docs'
    });
  });
  
  
  /**
   * GET /api/docs - API文档
   * 返回API使用文档
   */
  app.get('/api/docs', (c) => {
    return c.json({
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
        },
        {
          method: 'GET',
          path: '/api/history',
          description: '获取历史记录列表',
          responseExample: {
            success: true,
            data: {
              records: ['...'],
              total: 10
            },
            timestamp: '2025-11-15T12:00:00.000Z'
          }
        },
        {
          method: 'GET',
          path: '/api/history/:id',
          description: '获取历史记录详情',
          responseExample: {
            success: true,
            data: { id: '...', sql: '...', result: '...' },
            timestamp: '2025-11-15T12:00:00.000Z'
          }
        },
        {
          method: 'DELETE',
          path: '/api/history/:id',
          description: '删除历史记录',
          responseExample: {
            success: true,
            message: '历史记录已删除',
            timestamp: '2025-11-15T12:00:00.000Z'
          }
        },
        {
          method: 'GET',
          path: '/api/history/stats',
          description: '获取历史记录统计',
          responseExample: {
            success: true,
            data: {
              total: 100,
              byType: { single: 80, batch: 20 },
              byDatabase: { mysql: 60, postgresql: 40 }
            },
            timestamp: '2025-11-15T12:00:00.000Z'
          }
        },
        {
          method: 'GET',
          path: '/api/knowledge',
          description: '获取知识库状态',
          responseExample: {
            success: true,
            data: {
              initialized: true,
              persisted: true,
              documents: {
                total: 100,
                files: ['...'],
                fileCount: 10
              },
              statistics: {
                byFileType: { md: 8, txt: 2 }
              }
            },
            timestamp: '2025-11-15T12:00:00.000Z'
          }
        },
        {
          method: 'POST',
          path: '/api/knowledge/search',
          description: '搜索知识库',
          requestBody: {
            query: 'SQL注入',
            k: 4
          },
          responseExample: {
            success: true,
            data: {
              query: 'SQL注入',
              results: ['...'],
              count: 4
            },
            timestamp: '2025-11-15T12:00:00.000Z'
          }
        },
        {
          method: 'POST',
          path: '/api/knowledge/learn',
          description: '学习新文档',
          requestBody: {
            rulesDir: './rules',
            reset: false
          },
          responseExample: {
            success: true,
            message: '知识库学习任务已启动',
            timestamp: '2025-11-15T12:00:00.000Z'
          }
        }
      ],
      errorCodes: {
        400: 'Bad Request - 请求参数错误',
        500: 'Internal Server Error - 服务器内部错误',
        503: 'Service Unavailable - 服务不可用'
      }
    });
  });
  
  // 404处理
  app.notFound((c) => {
    return c.json({
      success: false,
      error: '请求的端点不存在',
      availableEndpoints: [
        'GET /',
        'GET /api/health',
        'GET /api/health/ping',
        'GET /api/health/status',
        'GET /api/health/check/:type',
        'POST /api/analyze',
        'POST /api/analyze/batch',
        'GET /api/history',
        'GET /api/history/:id',
        'DELETE /api/history/:id',
        'GET /api/history/stats',
        'GET /api/knowledge',
        'POST /api/knowledge/search',
        'POST /api/knowledge/learn',
        'GET /api/docs'
      ],
      timestamp: new Date().toISOString()
    }, 404);
  });
  
  // 错误处理
  app.onError((err, c) => {
    console.error(chalk.red('[API] 服务器错误:'), err);
    
    return c.json({
      success: false,
      error: '服务器内部错误',
      message: err.message,
      timestamp: new Date().toISOString()
    }, 500);
  });
  
  // 启动服务器
  console.log(chalk.blue('\n' + '='.repeat(60)));
  console.log(chalk.bold.green('🚀 SQL Analyzer API 服务器启动中...'));
  console.log(chalk.blue('='.repeat(60)));
  console.log(chalk.cyan(`\n📍 服务地址: http://${serverConfig.host}:${serverConfig.port}`));
  console.log(chalk.cyan(`📖 API文档: http://${serverConfig.host}:${serverConfig.port}/api/docs`));
  console.log(chalk.cyan(`💚 健康检查: http://${serverConfig.host}:${serverConfig.port}/api/health`));
  console.log(chalk.gray(`\nCORS: ${serverConfig.corsEnabled ? '已启用' : '已禁用'}`));
  if (serverConfig.corsEnabled) {
    console.log(chalk.gray(`允许源: ${serverConfig.corsOrigin}`));
  }
  console.log(chalk.blue('\n' + '='.repeat(60)));
  console.log(chalk.green('✓ 服务器已就绪，等待请求...\n'));
  
  // 使用Bun的原生serve方法启动服务器
  return Bun.serve({
    port: serverConfig.port,
    hostname: serverConfig.host,
    fetch: app.fetch
  });
}

export default createApiServer;