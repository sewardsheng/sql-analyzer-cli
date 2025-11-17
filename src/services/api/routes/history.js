/**
 * 历史记录路由模块
 * 处理历史记录相关的API请求
 */

import chalk from 'chalk';
import { formatHistoryResponse, formatSuccessResponse, formatErrorResponse } from '../../../utils/responseHandler.js';
import { getHistoryService } from '../../history/historyService.js';

/**
 * 注册历史记录相关路由
 * @param {Object} app - Hono应用实例
 */
export function registerHistoryRoutes(app) {
  /**
   * GET /api/history - 获取历史记录列表
   * 返回所有历史记录的简要信息
   */
  app.get('/api/history', async (c) => {
    try {
      const historyService = getHistoryService();
      const history = await historyService.getAllHistory();
      
      return c.json(formatHistoryResponse(history, {
        total: history.length
      }));
    } catch (error) {
      console.error(chalk.red(`[API] 获取历史记录失败: ${error.message}`));
      
      return c.json(formatErrorResponse('获取历史记录失败', error.message), 500);
    }
  });
  
  /**
   * GET /api/history/:id - 获取历史记录详情
   * 返回指定ID的历史记录完整信息
   */
  app.get('/api/history/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const historyService = getHistoryService();
      
      const record = await historyService.getHistoryById(id);
      
      if (!record) {
        return c.json(formatErrorResponse('历史记录不存在'), 404);
      }
      
      return c.json(formatSuccessResponse(record, '获取历史记录详情成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 获取历史记录详情失败: ${error.message}`));
      
      return c.json(formatErrorResponse('获取历史记录详情失败', error.message), 500);
    }
  });
  
  /**
   * DELETE /api/history/:id - 删除历史记录
   * 删除指定ID的历史记录
   */
  app.delete('/api/history/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const historyService = getHistoryService();
      
      const success = await historyService.deleteHistory(id);
      
      if (!success) {
        return c.json(formatErrorResponse('历史记录不存在'), 404);
      }
      
      return c.json(formatSuccessResponse(null, '删除历史记录成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 删除历史记录失败: ${error.message}`));
      
      return c.json(formatErrorResponse('删除历史记录失败', error.message), 500);
    }
  });
  
  /**
   * DELETE /api/history - 清空所有历史记录
   * 清空所有历史记录
   */
  app.delete('/api/history', async (c) => {
    try {
      const historyService = getHistoryService();
      
      const success = await historyService.clearAllHistory();
      
      if (!success) {
        return c.json(formatErrorResponse('清空历史记录失败'), 500);
      }
      
      return c.json(formatSuccessResponse(null, '清空历史记录成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 清空历史记录失败: ${error.message}`));
      
      return c.json(formatErrorResponse('清空历史记录失败', error.message), 500);
    }
  });
  
  /**
   * GET /api/history/stats - 获取历史记录统计信息
   * 返回历史记录的统计信息
   */
  app.get('/api/history/stats', async (c) => {
    try {
      const historyService = getHistoryService();
      const stats = await historyService.getHistoryStats();
      
      return c.json(formatSuccessResponse(stats, '获取历史记录统计成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 获取历史记录统计失败: ${error.message}`));
      
      return c.json(formatErrorResponse('获取历史记录统计失败', error.message), 500);
    }
  });
  
  /**
   * POST /api/history/search - 搜索历史记录
   * 根据条件搜索历史记录
   */
  app.post('/api/history/search', async (c) => {
    try {
      const body = await c.req.json();
      const historyService = getHistoryService();
      
      const results = await historyService.searchHistory(body);
      
      return c.json(formatSuccessResponse(results, '搜索历史记录成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 搜索历史记录失败: ${error.message}`));
      
      return c.json(formatErrorResponse('搜索历史记录失败', error.message), 500);
    }
  });
  
  /**
   * GET /api/history/export - 导出历史记录
   * 导出历史记录数据
   */
  app.get('/api/history/export', async (c) => {
    try {
      const format = c.req.query('format') || 'json';
      const historyService = getHistoryService();
      
      const result = await historyService.exportHistory({ format });
      
      if (format === 'csv') {
        c.header('Content-Type', 'text/csv');
        c.header('Content-Disposition', 'attachment; filename="history.csv"');
        return c.text(result.headers.join(',') + '\n' + result.rows.map(row => row.join(',')).join('\n'));
      } else {
        return c.json(formatSuccessResponse(result, '导出历史记录成功'));
      }
    } catch (error) {
      console.error(chalk.red(`[API] 导出历史记录失败: ${error.message}`));
      
      return c.json(formatErrorResponse('导出历史记录失败', error.message), 500);
    }
  });
}