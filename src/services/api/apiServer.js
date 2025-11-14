import { Hono } from 'hono';
import { cors } from 'hono/cors';
import chalk from 'chalk';

// 使用 Bun 的内置 serve 函数
import { serve } from 'bun';

// 导入项目模块
import { analyzeSqlWithGraph, analyzeSqlFileWithGraph } from '../../core/graph/graphAnalyzer.js';
import { initializePerformance, stopPerformance } from '../../core/performance/initPerformance.js';
import { logInfo, logError } from '../../utils/logger.js';
import { readConfig } from '../../utils/config.js';
// 导入历史记录API路由
import { historyRouter } from './routes/history.js';
// 导入知识库API路由
import { knowledgeRouter } from './routes/knowledge.js';
// 导入配置管理API路由
import { configRouter } from './routes/config.js';

// 初始化性能优化功能
initializePerformance();

/**
 * 创建API服务器
 * @param {Object} options - API服务器配置选项
 * @param {number} options.port - 服务器端口
 * @param {string} options.host - 服务器主机
 * @param {boolean} options.enableCors - 是否启用CORS
 * @returns {Hono} Hono应用实例
 */
async function createApiServer(options = {}) {
  // 读取配置
  const config = await readConfig();
  
  // 合并命令行选项和配置文件
  const port = options.port || config.apiPort || 3000;
  const host = options.host || config.apiHost || '0.0.0.0';
  const enableCors = options.enableCors !== false && (options.cors !== undefined ? options.cors : config.apiCorsEnabled);
  const corsOrigin = options.corsOrigin || config.apiCorsOrigin || '*';
  
  const app = new Hono();
  
  // CORS配置
  if (enableCors) {
    app.use('/*', cors({
      origin: corsOrigin,
      allowMethods: ['GET', 'POST', 'DELETE'],
      allowHeaders: ['Content-Type', 'Authorization']
    }));
  }
  
  // 请求日志中间件
  app.use(async (c, next) => {
    logInfo(`${c.req.method} ${c.req.path} - ${c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'}`);
    await next();
  });
  
  // 错误处理中间件
  app.onError((err, c) => {
    logError(`API错误: ${err.message}`);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误'
      }
    }, 500);
  });
  
  // 路由定义
  app.get('/', (c) => {
    return c.json({
      name: 'SQL Analyzer API',
      version: '1.0.0',
      description: 'SQL语句智能分析与扫描API服务',
      endpoints: {
        analyze: {
          method: 'POST',
          path: '/api/analyze',
          description: '分析SQL语句',
          parameters: {
            sql: '要分析的SQL语句',
            databaseType: '数据库类型 (mysql, postgresql, oracle, sqlserver)',
            analysisDimensions: '分析维度数组 (performance, security, standards)'
          }
        },
        health: {
          method: 'GET',
          path: '/api/health',
          description: '健康检查'
        },
        history: {
          method: 'GET/DELETE',
          path: '/api/history',
          description: '历史记录管理',
          subEndpoints: {
            list: 'GET /api/history - 获取历史记录列表',
            detail: 'GET /api/history/:id - 获取单条历史记录详情',
            delete: 'DELETE /api/history/:id - 删除单条历史记录',
            clear: 'DELETE /api/history - 清空历史记录',
            stats: 'GET /api/history/stats - 获取历史记录统计信息'
          }
        },
        knowledge: {
          method: 'GET/POST/DELETE',
          path: '/api/knowledge',
          description: '知识库管理',
          subEndpoints: {
            status: 'GET /api/knowledge/status - 查看知识库状态',
            load: 'POST /api/knowledge/load - 加载文档到知识库',
            reset: 'DELETE /api/knowledge/reset - 重置知识库'
          }
        },
        config: {
          method: 'GET/PUT/POST',
          path: '/api/config',
          description: '配置管理',
          subEndpoints: {
            get: 'GET /api/config - 获取当前配置',
            update: 'PUT /api/config - 更新配置',
            getItem: 'GET /api/config/:key - 获取单个配置项',
            updateItem: 'PUT /api/config/:key - 更新单个配置项',
            reset: 'POST /api/config/reset - 重置配置为默认值'
          }
        }
      }
    });
  });
  
  // 健康检查端点
  app.get('/api/health', (c) => {
    return c.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  });
  
  // SQL分析端点
  app.post('/api/analyze', async (c) => {
    try {
      const body = await c.req.json();
      const { sql, databaseType = 'mysql', analysisDimensions = ['performance', 'security', 'standards'] } = body;
      
      // 验证请求参数
      if (!sql || typeof sql !== 'string') {
        return c.json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: '缺少必需的参数: sql'
          }
        }, 400);
      }
      
      // 读取配置
      const config = await readConfig();
      
      // 检查API密钥
      if (!config.apiKey) {
        return c.json({
          success: false,
          error: {
            code: 'API_KEY_MISSING',
            message: '服务器未配置API密钥'
          }
        }, 500);
      }
      
      // 准备LangGraph配置
      const graphConfig = {
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        model: config.model,
        databaseType,
        analysisDimensions
      };
      
      // 执行分析
      const result = await analyzeSqlWithGraph(sql, null, graphConfig);
      
      // 返回结果
      return c.json({
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
          databaseType,
          analysisDimensions
        }
      });
    } catch (error) {
      logError(`SQL分析错误: ${error.message}`);
      return c.json({
        success: false,
        error: {
          code: 'ANALYSIS_ERROR',
          message: error.message
        }
      }, 500);
    }
  });
  
  // 注册历史记录API路由
  app.route('/api/history', historyRouter);
  
  // 注册知识库API路由
  app.route('/api/knowledge', knowledgeRouter);
  
  // 注册配置管理API路由
  app.route('/api/config', configRouter);
  
  // 启动服务器
  const server = serve({
    fetch: app.fetch,
    port,
    hostname: host
  });
  
  // 显示启动信息
  console.log(chalk.green(`✅ SQL Analyzer API服务器已启动`));
  console.log(chalk.blue(`🌐 服务地址: http://${host}:${port}`));
  
  // 显示可用接口信息
  console.log(chalk.cyan('\n📋 可用接口列表:'));
  console.log(chalk.white('  GET  /'));
  console.log(chalk.gray('    - 获取API信息和可用接口列表'));
  console.log(chalk.white('  GET  /api/health'));
  console.log(chalk.gray('    - 健康检查接口'));
  console.log(chalk.white('  POST /api/analyze'));
  console.log(chalk.gray('    - SQL分析接口'));
  console.log(chalk.gray('      参数: sql (必需), databaseType (可选), analysisDimensions (可选)'));
  console.log(chalk.white('  GET  /api/history'));
  console.log(chalk.gray('    - 获取历史记录列表'));
  console.log(chalk.white('  GET  /api/history/:id'));
  console.log(chalk.gray('    - 获取单条历史记录详情'));
  console.log(chalk.white('  DELETE /api/history/:id'));
  console.log(chalk.gray('    - 删除单条历史记录'));
  console.log(chalk.white('  DELETE /api/history'));
  console.log(chalk.gray('    - 清空历史记录'));
  console.log(chalk.white('  GET  /api/history/stats'));
  console.log(chalk.gray('    - 获取历史记录统计信息'));
  console.log(chalk.white('  GET  /api/knowledge/status'));
  console.log(chalk.gray('    - 查看知识库状态'));
  console.log(chalk.white('  POST /api/knowledge/load'));
  console.log(chalk.gray('    - 加载文档到知识库'));
  console.log(chalk.gray('      参数: rulesDir (可选), reset (可选), apiKey (可选)'));
  console.log(chalk.white('  DELETE /api/knowledge/reset'));
  console.log(chalk.gray('    - 重置知识库'));
  console.log(chalk.white('  GET  /api/config'));
  console.log(chalk.gray('    - 获取当前配置'));
  console.log(chalk.white('  PUT  /api/config'));
  console.log(chalk.gray('    - 更新配置'));
  console.log(chalk.white('  GET  /api/config/:key'));
  console.log(chalk.gray('    - 获取单个配置项'));
  console.log(chalk.white('  PUT  /api/config/:key'));
  console.log(chalk.gray('    - 更新单个配置项'));
  console.log(chalk.white('  POST /api/config/reset'));
  console.log(chalk.gray('    - 重置配置为默认值'));
  
  console.log(chalk.cyan('\n🔧 使用示例:'));
  console.log(chalk.gray(`  curl -X GET http://${host}:${port}/`));
  console.log(chalk.gray(`  curl -X GET http://${host}:${port}/api/health`));
  console.log(chalk.gray(`  curl -X POST http://${host}:${port}/api/analyze -H "Content-Type: application/json" -d '{"sql":"SELECT * FROM users"}'`));
  console.log(chalk.gray(`  curl -X GET http://${host}:${port}/api/knowledge/status`));
  console.log(chalk.gray(`  curl -X POST http://${host}:${port}/api/knowledge/load -H "Content-Type: application/json" -d '{"rulesDir":"./rules"}'`));
  console.log(chalk.gray(`  curl -X GET http://${host}:${port}/api/config`));
  console.log(chalk.gray(`  curl -X PUT http://${host}:${port}/api/config -H "Content-Type: application/json" -d '{"model":"gpt-4"}'`));
  
  console.log(chalk.yellow(`\n⚠️  按 Ctrl+C 停止服务器`));
  
  // 优雅关闭处理
  process.on('SIGTERM', () => {
    console.log(chalk.yellow('收到SIGTERM信号，正在关闭服务器...'));
    server.stop();
    console.log(chalk.green('服务器已关闭'));
    stopPerformance();
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log(chalk.yellow('收到SIGINT信号，正在关闭服务器...'));
    server.stop();
    console.log(chalk.green('服务器已关闭'));
    stopPerformance();
    process.exit(0);
  });
  
  return app;
}

export {
  createApiServer
};

// 如果直接运行此文件，则启动服务器
if (import.meta.url === `file://${process.argv[1]}`) {
  // 从命令行参数获取端口和主机
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && i + 1 < args.length) {
      options.port = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--host' && i + 1 < args.length) {
      options.host = args[i + 1];
      i++;
    }
  }
  
  // 启动服务器
  createApiServer(options);
}