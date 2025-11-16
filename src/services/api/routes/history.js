/**
 * 历史记录路由模块
 * 处理历史记录相关的API请求
 */

import chalk from 'chalk';
import { formatHistoryResponse, formatSuccessResponse, formatErrorResponse } from '../../../utils/apiResponseFormatter.js';

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
      const { default: HistoryService } = await import('../../history/historyService.js');
      const historyService = new HistoryService();
      
      const history = historyService.getAllHistory();
      
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
      const { default: HistoryService } = await import('../../history/historyService.js');
      const historyService = new HistoryService();
      
      const record = historyService.getHistoryById(id);
      
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
      const { default: HistoryService } = await import('../../history/historyService.js');
      const historyService = new HistoryService();
      
      const success = historyService.deleteHistory(id);
      
      if (!success) {
        return c.json(formatErrorResponse('历史记录不存在或删除失败'), 404);
      }
      
      return c.json(formatSuccessResponse(null, '历史记录已删除'));
    } catch (error) {
      console.error(chalk.red(`[API] 删除历史记录失败: ${error.message}`));
      
      return c.json(formatErrorResponse('删除历史记录失败', error.message), 500);
    }
  });
  
  /**
   * DELETE /api/history - 清空所有历史记录
   * 删除所有历史记录
   */
  app.delete('/api/history', async (c) => {
    try {
      const { default: HistoryService } = await import('../../history/historyService.js');
      const historyService = new HistoryService();
      
      const success = historyService.clearAllHistory();
      
      if (!success) {
        return c.json(formatErrorResponse('清空历史记录失败'), 500);
      }
      
      return c.json(formatSuccessResponse(null, '所有历史记录已清空'));
    } catch (error) {
      console.error(chalk.red(`[API] 清空历史记录失败: ${error.message}`));
      
      return c.json(formatErrorResponse('清空历史记录失败', error.message), 500);
    }
  });
  
  /**
   * GET /api/history/stats - 获取历史记录统计
   * 返回历史记录的统计信息
   */
  app.get('/api/history/stats', async (c) => {
    try {
      const { default: HistoryService } = await import('../../history/historyService.js');
      const historyService = new HistoryService();
      
      const stats = historyService.getHistoryStats();
      
      return c.json(formatSuccessResponse(stats, '获取历史记录统计成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 获取历史记录统计失败: ${error.message}`));
      
      return c.json(formatErrorResponse('获取历史记录统计失败', error.message), 500);
    }
  });
}