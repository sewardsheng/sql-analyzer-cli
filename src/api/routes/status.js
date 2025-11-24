/**
 * 状态查询路由模块
 * 提供系统状态查询相关的API端点
 */

import chalk from 'chalk';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { formatSuccessResponse, formatErrorResponse } from '../../utils/api/response-handler.js';
import { createValidationError } from '../../utils/api/api-error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 注册状态查询相关路由
 * @param {Object} app - Hono应用实例
 */
export function registerStatusRoutes(app) {
  /**
   * GET /api/status - 获取系统状态
   * 返回系统各组件的状态信息
   *
   * Query Parameters:
   * - interactive: 是否返回交互式格式的状态信息
   */
  app.get('/api/status', async (c) => {
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
        const { getHistoryStats } = await import('../../services/history-service.js');
        historyStats = await getHistoryStats();
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
   * GET /api/status/health - 健康检查
   * 简单的健康检查端点，用于监控系统是否正常运行
   */
  app.get('/api/status/health', async (c) => {
    try {
      return c.json(formatSuccessResponse({ status: 'healthy' }, '系统健康'));
    } catch (error) {
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });
  
  /**
   * GET /api/status/knowledge - 获取知识库状态
   * 仅返回知识库的详细状态信息
   */
  app.get('/api/status/knowledge', async (c) => {
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
   * GET /api/status/history - 获取历史记录状态
   * 仅返回历史记录的统计信息
   */
  app.get('/api/status/history', async (c) => {
    try {
      const { getHistoryStats } = await import('../../services/history-service.js');
      const stats = await getHistoryStats();
      
      return c.json(formatSuccessResponse(stats, '获取历史记录状态成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 获取历史记录状态失败: ${error.message}`));
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });
}