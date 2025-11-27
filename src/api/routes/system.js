/**
 * 系统状态路由模块
 * 合并健康检查和状态查询功能
 */

import chalk from 'chalk';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createValidationError } from '../../utils/api/api-error.js';
import { formatSuccessResponse, formatErrorResponse } from '../../utils/api/response-formatter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 注册系统状态相关路由
 * @param {Object} app - Hono应用实例
 */
export function registerSystemRoutes(app) {
  /**
   * GET /api/system/health - 系统健康检查
   * 执行完整的系统健康检查
   */
  app.get('/api/system/health', async (c) => {
    try {
      const HealthServiceModule = await import('../../services/health-service.js');
      const HealthService = HealthServiceModule.default;
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
   * GET /api/system/health/ping - 简单ping检查
   * 用于服务可用性测试
   */
  app.get('/api/system/health/ping', (c) => {
    return c.json(formatSuccessResponse({
      message: 'pong',
      uptime: process.uptime()
    }, '服务可用性检查'));
  });

  /**
   * GET /api/system/health/check/:type - 特定类型健康检查
   * 执行指定类型的健康检查
   */
  app.get('/api/system/health/check/:type', async (c) => {
    try {
      const { type } = c.req.param();
      const HealthServiceModule = await import('../../services/health-service.js');
      const HealthService = HealthServiceModule.default;
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
        'api-performance'
      ];
      
      if (!validChecks.includes(type)) {
        throw createValidationError(`无效的检查类型: ${type}`);
      }
      
      const check = healthService.checks.get(type);
      if (!check) {
        throw createValidationError(`检查项不存在: ${type}`);
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
   * GET /api/system/status - 获取系统状态
   * 返回系统各组件的状态信息
   *
   * Query Parameters:
   * - interactive: 是否返回交互式格式的状态信息
   */
  app.get('/api/system/status', async (c) => {
    try {
      const interactive = c.req.query('interactive') === 'true';
      
      // 获取配置信息
      const { readConfig } = await import('../../config/index.js');
      const config = await readConfig();
      
      // 获取知识库状态
      let knowledgeBaseStatus = { enabled: false, initialized: false, rulesCount: 0 };
      if (config.knowledgeBase?.enabled) {
        try {
          const { getKnowledgeBaseStatus } = await import('../../services/knowledge-service.js');
          knowledgeBaseStatus = await getKnowledgeBaseStatus();
        } catch (error) {
          knowledgeBaseStatus.error = error.message;
        }
      }
      
      // 获取历史记录统计
      let historyStats = { total: 0, recent: 0 };
      try {
        const { getHistoryService } = await import('../../services/history-service.js');
        const historyService = await getHistoryService();
        historyStats = await historyService.getHistoryStats();
      } catch (error) {
        historyStats.error = error.message;
      }
      
      // 检查必要目录
      const projectRoot = join(__dirname, '../../../..');
      const requiredDirs = [
        'data',
        'data/history',
        'data/knowledge',
        'data/config',
        'logs'
      ];
      
      const dirStatus = {};
      for (const dir of requiredDirs) {
        dirStatus[dir] = existsSync(join(projectRoot, dir));
      }
      
      // 检查配置文件
      const configExists = existsSync(join(projectRoot, 'data/config/config.json'));
      
      // 系统信息
      const systemInfo = {
        version: config.version || '1.0.0',
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        initialized: config.initialized && configExists
      };
      
      const statusData = {
        system: systemInfo,
        config: {
          initialized: config.initialized,
          fileExists: configExists,
          knowledgeBase: config.knowledgeBase || {}
        },
        directories: dirStatus,
        knowledgeBase: knowledgeBaseStatus,
        history: historyStats,
        timestamp: new Date().toISOString()
      };
      
      // 如果请求交互式格式，返回格式化的状态信息
      if (interactive) {
        const statusLines = [];
        
        statusLines.push(chalk.bold.blue('SQL分析器系统状态'));
        statusLines.push('');
        
        // 系统信息
        statusLines.push(chalk.bold('系统信息:'));
        statusLines.push(`  版本: ${systemInfo.version}`);
        statusLines.push(`  Node.js版本: ${systemInfo.nodeVersion}`);
        statusLines.push(`  平台: ${systemInfo.platform}`);
        statusLines.push(`  运行时间: ${Math.floor(systemInfo.uptime / 60)}分钟`);
        statusLines.push(`  内存使用: ${Math.round(systemInfo.memoryUsage.heapUsed / 1024 / 1024)}MB`);
        statusLines.push(`  初始化状态: ${systemInfo.initialized ? chalk.green('已初始化') : chalk.red('未初始化')}`);
        statusLines.push('');
        
        // 知识库状态
        statusLines.push(chalk.bold('知识库状态:'));
        statusLines.push(`  启用状态: ${knowledgeBaseStatus.enabled ? chalk.green('已启用') : chalk.red('未启用')}`);
        if (knowledgeBaseStatus.enabled) {
          statusLines.push(`  初始化状态: ${knowledgeBaseStatus.initialized ? chalk.green('已初始化') : chalk.red('未初始化')}`);
          statusLines.push(`  规则数量: ${knowledgeBaseStatus.rulesCount || 0}`);
        }
        statusLines.push('');
        
        // 历史记录状态
        statusLines.push(chalk.bold('历史记录状态:'));
        statusLines.push(`  总记录数: ${historyStats.total || 0}`);
        statusLines.push(`  最近记录数: ${historyStats.recent || 0}`);
        statusLines.push('');
        
        // 目录状态
        statusLines.push(chalk.bold('目录状态:'));
        for (const [dir, exists] of Object.entries(dirStatus)) {
          statusLines.push(`  ${dir}: ${exists ? chalk.green('存在') : chalk.red('不存在')}`);
        }
        
        return c.json(formatSuccessResponse({
          formatted: statusLines.join('\n'),
          raw: statusData
        }, '获取系统状态成功'));
      }
      
      // 默认返回JSON格式的状态信息
      return c.json(formatSuccessResponse(statusData, '获取系统状态成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 获取系统状态失败: ${error.message}`));
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });
  
  /**
   * GET /api/system/status/knowledge - 获取知识库状态
   * 仅返回知识库的详细状态信息
   */
  app.get('/api/system/status/knowledge', async (c) => {
    try {
      const { readConfig } = await import('../../config/index.js');
      const config = await readConfig();
      
      if (!config.knowledgeBase?.enabled) {
        return c.json(formatSuccessResponse({
          enabled: false,
          message: '知识库未启用'
        }, '获取知识库状态成功'));
      }
      
      const { getKnowledgeBaseStatus } = await import('../../services/knowledge-service.js');
      const status = await getKnowledgeBaseStatus();
      
      return c.json(formatSuccessResponse(status, '获取知识库状态成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 获取知识库状态失败: ${error.message}`));
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });
  
  /**
   * GET /api/system/status/analyzer - 获取分析器状态
   * 返回SQL分析器的状态信息
   */
  app.get('/api/system/status/analyzer', async (c) => {
    try {
      const { sqlAnalyzer } = await import('../../core/index.js');
      const status = sqlAnalyzer.getStatus();
      
      return c.json(formatSuccessResponse(status, '获取分析器状态成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 获取分析器状态失败: ${error.message}`));
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });
}