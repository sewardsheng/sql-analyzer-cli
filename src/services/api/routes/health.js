/**
 * API健康检查路由 (Hono版本)
 */

import { Hono } from 'hono';
import HealthService from '../../health/healthService.js';

const health = new Hono();

/**
 * GET /api/health
 * 执行系统健康检查并返回JSON结果
 */
health.get('/', async (c) => {
  try {
    const healthService = new HealthService();
    const results = await healthService.performAllChecks();
    const report = healthService.generateReport(results);
    
    // 设置HTTP状态码基于健康状态
    let statusCode = 200;
    if (results.status === 'unhealthy') {
      statusCode = 503; // Service Unavailable
    } else if (results.status === 'degraded') {
      statusCode = 200; // Still OK but with warnings
    }
    
    return c.json({
      success: results.status !== 'unhealthy',
      status: results.status,
      timestamp: results.timestamp,
      summary: results.summary,
      checks: results.checks,
      recommendations: report.recommendations
    }, statusCode);
    
  } catch (error) {
    console.error('健康检查API错误:', error);
    return c.json({
      success: false,
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    }, 500);
  }
});

/**
 * GET /api/health/check/:type
 * 执行特定类型的健康检查
 */
health.get('/check/:type', async (c) => {
  try {
    const { type } = c.req.param();
    const healthService = new HealthService();
    
    // 验证检查类型
    const validChecks = [
      'core-modules',
      'configuration', 
      'rules',
      'prompts',
      'dependencies',
      'memory',
      'disk-space'
    ];
    
    if (!validChecks.includes(type)) {
      return c.json({
        success: false,
        error: `无效的检查类型: ${type}`,
        validTypes: validChecks
      }, 400);
    }
    
    const check = healthService.checks.get(type);
    if (!check) {
      return c.json({
        success: false,
        error: `检查项不存在: ${type}`
      }, 404);
    }
    
    const result = await check.check();
    
    return c.json({
      success: result.status !== 'fail',
      type: type,
      name: check.name,
      status: result.status,
      message: result.message,
      details: result.details,
      duration: result.duration,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`健康检查API错误 (${c.req.param().type}):`, error);
    return c.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

/**
 * GET /api/health/ping
 * 简单的ping检查，用于服务可用性测试
 */
health.get('/ping', (c) => {
  return c.json({
    success: true,
    message: 'pong',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * GET /api/health/status
 * 返回服务基本状态信息
 */
health.get('/status', (c) => {
  const memUsage = process.memoryUsage();
  
  return c.json({
    success: true,
    status: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0', // 可以从package.json读取
    environment: process.env.NODE_ENV || 'development',
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
    },
    platform: process.platform,
    nodeVersion: process.version
  });
});

/**
 * 注册健康检查路由
 * @param {Hono} app - Hono应用实例
 */
export function registerHealthRoutes(app) {
  app.route('/api/health', health);
}

export default health;