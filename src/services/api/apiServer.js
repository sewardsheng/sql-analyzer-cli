import { Hono } from 'hono';
import { cors } from 'hono/cors';
import chalk from 'chalk';

// 根据运行环境选择合适的 serve 函数
let serve;
try {
  // 尝试使用 bun 的 serve
  serve = (await import('bun')).serve;
} catch (error) {
  // 如果 bun 不可用，使用 Node.js 的 http 模块
  try {
    const { createServer } = await import('http');
    serve = (options) => {
      const server = createServer(options.fetch);
      server.listen(options.port, options.hostname, options.callback);
      return server;
    };
  } catch (nodeError) {
    console.error('错误: 无法加载服务器模块，请确保安装了 bun 或 Node.js');
    process.exit(1);
  }
}

// 导入使用 CommonJS 模块系统的模块
const { analyzeSqlWithGraph, analyzeSqlFileWithGraph } = await import('../../core/graph/graphAnalyzer.js');
const { initializePerformance, stopPerformance } = await import('../../core/performance/initPerformance.js');
const { logInfo, logError } = await import('../../utils/logger.js');
const { readConfig } = await import('../../utils/config.js');

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
      allowMethods: ['GET', 'POST'],
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
  
  // 启动服务器
  const server = serve({
    fetch: app.fetch,
    port,
    hostname: host
  });
  
  // 显示启动信息
  console.log(chalk.green(`✅ SQL Analyzer API服务器已启动`));
  console.log(chalk.blue(`🌐 服务地址: http://${host}:${port}`));
  console.log(chalk.gray(`📖 API文档: http://${host}:${port}/`));
  
  // 显示可用接口信息
  console.log(chalk.cyan('\n📋 可用接口列表:'));
  console.log(chalk.white('  GET  /'));
  console.log(chalk.gray('    - 获取API信息和可用接口列表'));
  console.log(chalk.white('  GET  /api/health'));
  console.log(chalk.gray('    - 健康检查接口'));
  console.log(chalk.white('  POST /api/analyze'));
  console.log(chalk.gray('    - SQL分析接口'));
  console.log(chalk.gray('      参数: sql (必需), databaseType (可选), analysisDimensions (可选)'));
  
  console.log(chalk.cyan('\n🔧 使用示例:'));
  console.log(chalk.gray(`  curl -X GET http://${host}:${port}/`));
  console.log(chalk.gray(`  curl -X GET http://${host}:${port}/api/health`));
  console.log(chalk.gray(`  curl -X POST http://${host}:${port}/api/analyze -H "Content-Type: application/json" -d '{"sql":"SELECT * FROM users"}'`));
  
  console.log(chalk.yellow(`\n⚠️  按 Ctrl+C 停止服务器`));
  
  // 优雅关闭处理
  process.on('SIGTERM', () => {
    console.log(chalk.yellow('收到SIGTERM信号，正在关闭服务器...'));
    server.close(() => {
      console.log(chalk.green('服务器已关闭'));
      stopPerformance();
      process.exit(0);
    });
  });
  
  process.on('SIGINT', () => {
    console.log(chalk.yellow('收到SIGINT信号，正在关闭服务器...'));
    server.close(() => {
      console.log(chalk.green('服务器已关闭'));
      stopPerformance();
      process.exit(0);
    });
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