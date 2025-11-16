/**
 * SQL分析API服务器
 * 使用Hono框架提供REST API接口
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createCoordinator } from '../../core/coordinator.js';
import { readConfig } from '../config/index.js';
import chalk from 'chalk';

/**
 * 创建并启动API服务器
 * @param {Object} options - 服务器配置选项
 * @param {number} options.port - 端口号
 * @param {string} options.host - 主机地址
 * @param {boolean} options.cors - 是否启用CORS
 * @param {string} options.corsOrigin - CORS允许的源
 */
export async function createApiServer(options = {}) {
  const config = await readConfig();
  
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
  
  // 创建SQL分析协调器
  const coordinator = createCoordinator(config);
  
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
   * GET /api/health - 健康检查
   * 返回服务器状态信息
   */
  app.get('/api/health', async (c) => {
    const startTime = Date.now();
    
    try {
      // 检查协调器是否已初始化
      await coordinator.initialize();
      
      const responseTime = Date.now() - startTime;
      
      return c.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        service: 'sql-analyzer-api',
        version: '1.0.0'
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return c.json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        service: 'sql-analyzer-api',
        version: '1.0.0',
        error: error.message
      }, 503);
    }
  });
  
  app.post('/api/analyze', async (c) => {
    const startTime = Date.now();
    
    try {
      const body = await c.req.json();
      
      // 验证请求体
      if (!body.sql || typeof body.sql !== 'string') {
        return c.json({
          success: false,
          error: '请求体必须包含 "sql" 字段，且为字符串类型',
          timestamp: new Date().toISOString()
        }, 400);
      }
      
      const sqlQuery = body.sql.trim();
      if (!sqlQuery) {
        return c.json({
          success: false,
          error: 'SQL语句不能为空',
          timestamp: new Date().toISOString()
        }, 400);
      }
      
      // 准备分析选项
      const analysisOptions = {
        performance: body.options?.performance !== false,
        security: body.options?.security !== false,
        standards: body.options?.standards !== false,
        learn: body.options?.learn === true
      };
      
      // 执行SQL分析
      console.log(chalk.blue(`\n[API] 收到分析请求: ${sqlQuery.substring(0, 50)}...`));
      
      const result = await coordinator.coordinateAnalysis({
        sqlQuery,
        options: analysisOptions
      });
      
      const responseTime = Date.now() - startTime;
      console.log(chalk.green(`[API] 分析完成，用时: ${responseTime}ms`));
      
      // 保存到历史记录
      try {
        const { default: HistoryService } = await import('../history/historyService.js');
        const historyService = new HistoryService();
        const historyId = historyService.saveAnalysis({
          sql: sqlQuery,
          result: result,
          type: 'command' // API调用统一标记为command类型
        });
        console.log(chalk.gray(`[API] 历史记录已保存: ${historyId}`));
      } catch (historyError) {
        console.warn(chalk.yellow(`[API] 保存历史记录失败: ${historyError.message}`));
      }
      
      // 返回结果
      return c.json({
        ...result,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      });
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(chalk.red(`[API] 分析失败: ${error.message}`));
      
      return c.json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      }, 500);
    }
  });

  app.post('/api/analyze/batch', async (c) => {
    const startTime = Date.now();
    
    try {
      const body = await c.req.json();
      
      // 验证请求体
      if (!body.sqls || !Array.isArray(body.sqls) || body.sqls.length === 0) {
        return c.json({
          success: false,
          error: '请求体必须包含 "sqls" 数组字段，且不能为空',
          timestamp: new Date().toISOString()
        }, 400);
      }
      
      if (body.sqls.length > 50) {
        return c.json({
          success: false,
          error: '批量分析最多支持50条SQL语句',
          timestamp: new Date().toISOString()
        }, 400);
      }
      
      // 准备分析选项
      const analysisOptions = {
        performance: body.options?.performance !== false,
        security: body.options?.security !== false,
        standards: body.options?.standards !== false,
        learn: body.options?.learn === true
      };
      
      console.log(chalk.blue(`\n[API] 收到批量分析请求，共 ${body.sqls.length} 条SQL`));
      
      // 并行分析所有SQL
      const analysisPromises = body.sqls.map(async (item, index) => {
        try {
          if (!item.sql || typeof item.sql !== 'string') {
            return {
              index,
              success: false,
              error: 'SQL语句不能为空或格式错误'
            };
          }
          
          const result = await coordinator.coordinateAnalysis({
            sqlQuery: item.sql.trim(),
            databaseType: item.databaseType,
            options: analysisOptions
          });
          
          return {
            index,
            sql: item.sql,
            ...result
          };
        } catch (error) {
          return {
            index,
            sql: item.sql,
            success: false,
            error: error.message
          };
        }
      });
      
      const results = await Promise.all(analysisPromises);
      
      const responseTime = Date.now() - startTime;
      const succeeded = results.filter(r => r.success).length;
      const failed = results.length - succeeded;
      
      console.log(chalk.green(`[API] 批量分析完成，用时: ${responseTime}ms，成功: ${succeeded}，失败: ${failed}`));
      
      // 保存到历史记录
      try {
        const { default: HistoryService } = await import('../history/historyService.js');
        const historyService = new HistoryService();
        
        // 为每条成功的SQL保存历史记录
        results.forEach(result => {
          if (result.success && result.sql) {
            try {
              historyService.saveAnalysis({
                sql: result.sql,
                result: result,
                type: 'batch'
              });
            } catch (err) {
              console.warn(chalk.yellow(`[API] 保存批量历史记录失败: ${err.message}`));
            }
          }
        });
        
        console.log(chalk.gray(`[API] 批量历史记录已保存: ${succeeded} 条`));
      } catch (historyError) {
        console.warn(chalk.yellow(`[API] 保存历史记录失败: ${historyError.message}`));
      }
      
      // 返回结果
      return c.json({
        success: true,
        data: {
          results,
          summary: {
            total: results.length,
            succeeded,
            failed
          }
        },
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      });
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(chalk.red(`[API] 批量分析失败: ${error.message}`));
      
      return c.json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      }, 500);
    }
  });
  
  /**
   * GET /api/history - 获取历史记录列表
   * 返回所有历史记录的简要信息
   */
  app.get('/api/history', async (c) => {
    try {
      const { default: HistoryService } = await import('../history/historyService.js');
      const historyService = new HistoryService();
      
      const history = historyService.getAllHistory();
      
      return c.json({
        success: true,
        data: {
          records: history,
          total: history.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(chalk.red(`[API] 获取历史记录失败: ${error.message}`));
      
      return c.json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
  });
  
  /**
   * GET /api/history/:id - 获取历史记录详情
   * 返回指定ID的历史记录完整信息
   */
  app.get('/api/history/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const { default: HistoryService } = await import('../history/historyService.js');
      const historyService = new HistoryService();
      
      const record = historyService.getHistoryById(id);
      
      if (!record) {
        return c.json({
          success: false,
          error: '历史记录不存在',
          timestamp: new Date().toISOString()
        }, 404);
      }
      
      return c.json({
        success: true,
        data: record,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(chalk.red(`[API] 获取历史记录详情失败: ${error.message}`));
      
      return c.json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
  });
  
  /**
   * DELETE /api/history/:id - 删除历史记录
   * 删除指定ID的历史记录
   */
  app.delete('/api/history/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const { default: HistoryService } = await import('../history/historyService.js');
      const historyService = new HistoryService();
      
      const success = historyService.deleteHistory(id);
      
      if (!success) {
        return c.json({
          success: false,
          error: '历史记录不存在或删除失败',
          timestamp: new Date().toISOString()
        }, 404);
      }
      
      return c.json({
        success: true,
        message: '历史记录已删除',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(chalk.red(`[API] 删除历史记录失败: ${error.message}`));
      
      return c.json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
  });
  
  /**
   * GET /api/history/stats - 获取历史记录统计
   * 返回历史记录的统计信息
   */
  app.get('/api/history/stats', async (c) => {
    try {
      const { default: HistoryService } = await import('../history/historyService.js');
      const historyService = new HistoryService();
      
      const stats = historyService.getHistoryStats();
      
      return c.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(chalk.red(`[API] 获取历史记录统计失败: ${error.message}`));
      
      return c.json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
  });
  
  /**
   * GET /api/knowledge - 获取知识库状态
   * 返回知识库的初始化状态和统计信息
   */
  app.get('/api/knowledge', async (c) => {
    try {
      const { isVectorStoreInitialized, isVectorStorePersisted } = await import('../../core/vectorStore.js');
      const fs = await import('fs');
      const path = await import('path');
      
      const isInitialized = isVectorStoreInitialized();
      const isPersisted = isVectorStorePersisted();
      
      const status = {
        initialized: isInitialized,
        persisted: isPersisted,
        documents: null,
        statistics: null
      };
      
      // 如果知识库已初始化，获取详细信息
      if (isInitialized && isPersisted) {
        try {
          const VECTOR_STORE_PATH = path.join(process.cwd(), '.vector-store');
          const docsPath = path.join(VECTOR_STORE_PATH, 'documents.json');
          
          if (fs.existsSync(docsPath)) {
            const serializedDocs = JSON.parse(fs.readFileSync(docsPath, 'utf8'));
            
            // 统计文档信息
            const sourceFiles = new Set();
            const fileTypes = new Map();
            
            serializedDocs.forEach(doc => {
              if (doc.metadata && doc.metadata.source) {
                sourceFiles.add(doc.metadata.source);
                const ext = path.extname(doc.metadata.source).substring(1);
                if (ext) {
                  fileTypes.set(ext, (fileTypes.get(ext) || 0) + 1);
                }
              }
            });
            
            status.documents = {
              total: serializedDocs.length,
              files: Array.from(sourceFiles),
              fileCount: sourceFiles.size
            };
            
            status.statistics = {
              byFileType: Object.fromEntries(fileTypes)
            };
          }
        } catch (error) {
          console.warn('获取知识库详细信息失败:', error.message);
        }
      }
      
      return c.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(chalk.red(`[API] 获取知识库状态失败: ${error.message}`));
      
      return c.json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
  });
  
  /**
   * POST /api/knowledge/search - 搜索知识库
   * 根据查询字符串搜索相关文档
   *
   * Request Body:
   * {
   *   "query": "SQL注入",
   *   "k": 4  // 可选，返回文档数量
   * }
   */
  app.post('/api/knowledge/search', async (c) => {
    try {
      const body = await c.req.json();
      
      if (!body.query || typeof body.query !== 'string') {
        return c.json({
          success: false,
          error: '请求体必须包含 "query" 字段，且为字符串类型',
          timestamp: new Date().toISOString()
        }, 400);
      }
      
      const { retrieveKnowledge } = await import('../../core/knowledgeBase.js');
      const k = body.k || 4;
      
      const result = await retrieveKnowledge(body.query, k);
      
      if (!result.success) {
        return c.json({
          success: false,
          error: result.error,
          timestamp: new Date().toISOString()
        }, 503);
      }
      
      return c.json({
        success: true,
        data: {
          query: body.query,
          results: result.data.documents.map(doc => ({
            content: doc.pageContent,
            metadata: doc.metadata
          })),
          count: result.data.documents.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(chalk.red(`[API] 搜索知识库失败: ${error.message}`));
      
      return c.json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
  });
  
  /**
   * POST /api/knowledge/learn - 学习新文档
   * 触发知识库学习流程（需要提供rules目录路径）
   *
   * Request Body:
   * {
   *   "rulesDir": "./rules",  // 可选，默认为./rules
   *   "reset": false          // 可选，是否重置知识库
   * }
   */
  app.post('/api/knowledge/learn', async (c) => {
    try {
      const body = await c.req.json();
      
      const { learnDocuments } = await import('../../services/knowledge/learn.js');
      
      const options = {
        rulesDir: body.rulesDir || './rules',
        reset: body.reset || false
      };
      
      console.log(chalk.blue(`[API] 开始学习文档，目录: ${options.rulesDir}`));
      
      // 在后台执行学习任务
      learnDocuments(options).then(() => {
        console.log(chalk.green('[API] 文档学习完成'));
      }).catch(error => {
        console.error(chalk.red('[API] 文档学习失败:'), error.message);
      });
      
      return c.json({
        success: true,
        message: '知识库学习任务已启动',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(chalk.red(`[API] 启动知识库学习失败: ${error.message}`));
      
      return c.json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
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