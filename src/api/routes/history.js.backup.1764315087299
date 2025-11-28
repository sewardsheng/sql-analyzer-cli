/**
 * 历史记录路由模块
 * 处理历史记录相关的API请求
 */

import chalk from 'chalk';
import { createValidationError } from '../../utils/api/api-error.js';

import { formatSuccessResponse, formatErrorResponse, formatPaginatedResponse } from '../../utils/api/response-formatter.js';

/**
 * 注册历史记录相关路由
 * @param {Object} app - Hono应用实例
 */
export function registerHistoryRoutes(app) {
  /**
   * GET /api/history/stats - 获取历史记录统计信息
   * 返回历史记录的统计信息
   * 注意：这个路由必须在 /api/history/:id 之前定义
   */
  app.get('/api/history/stats', async (c) => {
    try {
      const { getHistoryService } = await import('../../services/history-service.js');
      const historyService = await getHistoryService();
      const stats = await historyService.getHistoryStats();
      
      return c.json(formatSuccessResponse(stats, '获取历史记录统计成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 获取历史记录统计失败: ${error.message}`));
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });

  /**
   * GET /api/history/export - 导出历史记录
   * 导出历史记录数据
   * 注意：这个路由必须在 /api/history/:id 之前定义
   *
   * Query Parameters:
   * - format: 导出格式 (json|csv)，默认为json
   */
  app.get('/api/history/export', async (c) => {
    try {
      const format = c.req.query('format') || 'json';
      const { getHistoryService } = await import('../../services/history-service.js');
      const historyService = await getHistoryService();
      const result = await historyService.exportHistory(format);
      
      if (format === 'csv') {
        c.header('Content-Type', 'text/csv');
        c.header('Content-Disposition', 'attachment; filename="history.csv"');
        return c.text(result);
      } else {
        return c.json(formatSuccessResponse(result, '导出历史记录成功'));
      }
    } catch (error) {
      console.error(chalk.red(`[API] 导出历史记录失败: ${error.message}`));
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });

  /**
   * GET /api/history - 获取历史记录列表
   * 返回所有历史记录的简要信息
   */
  app.get('/api/history', async (c) => {
    try {
      const { getHistoryService } = await import('../../services/history-service.js');
      const historyService = await getHistoryService();
      const history = await historyService.getAllHistory();
      
      return c.json(formatSuccessResponse(history, {
        total: history.length
      }), '获取历史记录成功');
    } catch (error) {
      console.error(chalk.red(`[API] 获取历史记录失败: ${error.message}`));
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });

  /**
   * GET /api/history/:id - 获取历史记录详情
   * 返回指定ID的历史记录完整信息
   */
  app.get('/api/history/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const { getHistoryService } = await import('../../services/history-service.js');
      const historyService = await getHistoryService();
      const record = await historyService.getHistoryById(id);
      
      if (!record) {
        throw new Error(`历史记录不存在`);
      }
      
      return c.json(formatSuccessResponse(record, '获取历史记录详情成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 获取历史记录详情失败: ${error.message}`));
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });

  /**
   * DELETE /api/history/:id - 删除历史记录
   * 删除指定ID的历史记录
   */
  app.delete('/api/history/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const { getHistoryService } = await import('../../services/history-service.js');
      const historyService = await getHistoryService();
      const success = await historyService.deleteHistory(id);
      
      if (!success) {
        throw new Error(`历史记录不存在`);
      }
      
      console.log(chalk.green(`[API] 历史记录已删除: ${id}`));
      
      return c.json(formatSuccessResponse(null, '删除历史记录成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 删除历史记录失败: ${error.message}`));
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });

  /**
   * DELETE /api/history - 清空所有历史记录
   * 清空所有历史记录
   */
  app.delete('/api/history', async (c) => {
    try {
      const { getHistoryService } = await import('../../services/history-service.js');
      const historyService = await getHistoryService();
      const success = await historyService.clearHistory();
      
      if (!success) {
        throw new Error(`清空历史记录失败`);
      }
      
      console.log(chalk.green('[API] 所有历史记录已清空'));
      
      return c.json(formatSuccessResponse(null, '清空历史记录成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 清空历史记录失败: ${error.message}`));
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });

  /**
   * POST /api/history/search - 搜索历史记录
   * 根据条件搜索历史记录
   *
   * Request Body:
   * {
   *   "sql": "SQL关键词", // 可选
   *   "database": "mysql", // 可选
   *   "dateFrom": "2025-01-01", // 可选
   *   "dateTo": "2025-01-31", // 可选
   *   "limit": 10 // 可选，默认10
   * }
   */
  app.post('/api/history/search', async (c) => {
    try {
      const body = await c.req.json();
      const { getHistoryService } = await import('../../services/history-service.js');
      const historyService = await getHistoryService();
      const results = await historyService.searchHistory(body.query || '', body);
      
      return c.json(formatSuccessResponse(results, '搜索历史记录成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 搜索历史记录失败: ${error.message}`));
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });
}