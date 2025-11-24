/**
 * API健康检查路由模块
 * 提供系统健康检查相关的API端点
 */

import { formatSuccessResponse, formatErrorResponse } from '../../utils/api/response-handler.js';

/**
 * 注册健康检查相关路由
 * @param {Object} app - Hono应用实例
 */
export function registerHealthRoutes(app) {
  /**
   * GET /api/health - 系统健康检查
   * 执行完整的系统健康检查
   */
  app.get('/api/health', async (c) => {
    try {
      const { HealthService } = await import('../../health/healthService.js');
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
      
      return c.json(formatSuccessResponse({
        status: results.status,
        timestamp: results.timestamp,
        summary: results.summary,
        checks: results.checks,
        recommendations: report.recommendations
      }, '系统健康检查完成'), statusCode);
      
    } catch (error) {
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });

  /**
   * GET /api/health/check/:type - 特定类型健康检查
   * 执行指定类型的健康检查
   */
  app.get('/api/health/check/:type', async (c) => {
    try {
      const { type } = c.req.param();
      const { HealthService } = await import('../../health/healthService.js');
      const healthService = new HealthService();
      
      // 验证检查类型
      const validChecks = [
        'core-modules',
        'configuration',
        'rules',
        'prompts',
        'dependencies',
        'memory',
        'disk-space',
        'cpu-usage',
        'network',
        'external-services',
        'database-connections',
        'api-performance'
      ];
      
      if (!validChecks.includes(type)) {
        throw new Error(`无效的检查类型: ${type}`);
      }
      
      const check = healthService.checks.get(type);
      if (!check) {
        throw new Error(`检查项不存在: ${type}`);
      }
      
      const result = await check.check();
      
      return c.json(formatSuccessResponse({
        type: type,
        name: check.name,
        status: result.status,
        message: result.message,
        details: result.details,
        duration: result.duration
      }, `健康检查完成: ${type}`));
      
    } catch (error) {
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });

  /**
   * GET /api/health/ping - 简单ping检查
   * 用于服务可用性测试
   */
  app.get('/api/health/ping', (c) => {
    return c.json(formatSuccessResponse({
      message: 'pong',
      uptime: process.uptime()
    }, '服务可用性检查'));
  });

  /**
   * GET /api/health/status - 服务状态信息
   * 返回服务基本状态信息
   */
  app.get('/api/health/status', (c) => {
    const memUsage = process.memoryUsage();
    
    return c.json(formatSuccessResponse({
      status: 'running',
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
    }, '获取服务状态成功'));
  });
}