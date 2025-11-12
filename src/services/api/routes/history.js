/**
 * 历史记录API路由
 * 提供历史记录管理的RESTful API接口
 */

import { Hono } from 'hono';
import HistoryService from '../../history/historyService.js';
import { validationMiddleware, errorHandlerMiddleware } from '../middleware/apiMiddleware.js';

// 创建历史记录服务实例
const historyService = new HistoryService();

// 创建历史记录API路由
const historyApi = new Hono();

// 应用错误处理中间件
historyApi.use('*', errorHandlerMiddleware());

/**
 * 获取历史记录列表
 * GET /api/history
 * 查询参数:
 *   - page: 页码 (默认: 1)
 *   - limit: 每页数量 (默认: 20, 最大: 100)
 *   - type: 分析类型筛选 (可选)
 *   - database: 数据库类型筛选 (可选)
 *   - startDate: 开始日期筛选 (可选, 格式: YYYY-MM-DD)
 *   - endDate: 结束日期筛选 (可选, 格式: YYYY-MM-DD)
 */
historyApi.get('/', 
  // 应用验证中间件
  validationMiddleware({
    pagination: true,
    dateFields: ['startDate', 'endDate']
  }),
  async (c) => {
  try {
    // 获取查询参数
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100); // 限制最大每页数量
    const type = c.req.query('type');
    const database = c.req.query('database');
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    // 获取所有历史记录
    let allHistory = historyService.getAllHistory();

    // 应用筛选条件
    if (type) {
      allHistory = allHistory.filter(record => record.type === type);
    }

    if (database) {
      allHistory = allHistory.filter(record => record.databaseType === database);
    }

    if (startDate) {
      const start = new Date(startDate);
      allHistory = allHistory.filter(record => new Date(record.timestamp) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // 设置为当天结束时间
      allHistory = allHistory.filter(record => new Date(record.timestamp) <= end);
    }

    // 计算分页
    const total = allHistory.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const history = allHistory.slice(startIndex, endIndex);

    // 返回结果
    return c.json({
      success: true,
      data: {
        history,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: endIndex < total,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('获取历史记录列表失败:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '获取历史记录列表失败'
      }
    }, 500);
  }
});

/**
 * 获取历史记录统计信息
 * GET /api/history/stats
 */
historyApi.get('/stats', async (c) => {
  try {
    // 获取统计信息
    const stats = historyService.getHistoryStats();

    // 添加额外统计信息
    const allHistory = historyService.getAllHistory();
    
    // 计算最近30天的分析数量
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentAnalyses = allHistory.filter(record => 
      new Date(record.timestamp) >= thirtyDaysAgo
    ).length;

    // 计算最常用的数据库类型
    const databaseCounts = {};
    allHistory.forEach(record => {
      databaseCounts[record.databaseType] = (databaseCounts[record.databaseType] || 0) + 1;
    });

    const mostUsedDatabase = Object.keys(databaseCounts).reduce((a, b) => 
      databaseCounts[a] > databaseCounts[b] ? a : b, ''
    );

    // 返回结果
    return c.json({
      success: true,
      data: {
        ...stats,
        recentAnalyses,
        mostUsedDatabase,
        databaseCounts
      }
    });
  } catch (error) {
    console.error('获取历史记录统计失败:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '获取历史记录统计失败'
      }
    }, 500);
  }
});

/**
 * 获取特定历史记录详情
 * GET /api/history/:id
 */
historyApi.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    // 验证ID格式
    if (!id || typeof id !== 'string') {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '无效的历史记录ID'
        }
      }, 400);
    }

    // 获取历史记录详情
    const historyRecord = historyService.getHistoryById(id);
    
    if (!historyRecord) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '未找到指定的历史记录'
        }
      }, 404);
    }

    // 返回结果
    return c.json({
      success: true,
      data: historyRecord
    });
  } catch (error) {
    console.error('获取历史记录详情失败:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '获取历史记录详情失败'
      }
    }, 500);
  }
});

/**
 * 删除特定历史记录
 * DELETE /api/history/:id
 */
historyApi.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    // 验证ID格式
    if (!id || typeof id !== 'string') {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '无效的历史记录ID'
        }
      }, 400);
    }

    // 检查记录是否存在
    const historyRecord = historyService.getHistoryById(id);
    if (!historyRecord) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '未找到指定的历史记录'
        }
      }, 404);
    }

    // 删除历史记录
    const deleted = historyService.deleteHistory(id);
    
    if (!deleted) {
      return c.json({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: '删除历史记录失败'
        }
      }, 500);
    }

    // 返回结果
    return c.json({
      success: true,
      message: '历史记录已成功删除'
    });
  } catch (error) {
    console.error('删除历史记录失败:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '删除历史记录失败'
      }
    }, 500);
  }
});

/**
 * 清空历史记录
 * DELETE /api/history
 * 请求体:
 *   - type: "all" | "before" (必需)
 *   - date: 日期 (当type为"before"时必需, 格式: YYYY-MM-DD)
 */
historyApi.delete('/', 
  // 应用验证中间件
  validationMiddleware({
    dateFields: ['date']
  }),
  async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { type, date } = body;

    // 验证请求参数
    if (!type || (type !== 'all' && type !== 'before')) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '无效的删除类型，必须是 "all" 或 "before"'
        }
      }, 400);
    }

    if (type === 'before' && !date) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '当删除类型为 "before" 时，必须提供日期参数'
        }
      }, 400);
    }

    let deletedCount = 0;

    if (type === 'all') {
      // 清空所有历史记录
      const success = historyService.clearAllHistory();
      if (!success) {
        return c.json({
          success: false,
          error: {
            code: 'DELETE_FAILED',
            message: '清空历史记录失败'
          }
        }, 500);
      }
      deletedCount = 'all';
    } else if (type === 'before') {
      // 删除指定日期之前的历史记录
      const targetDate = new Date(date);
      const allHistory = historyService.getAllHistory();
      
      const toDelete = allHistory.filter(record => {
        return new Date(record.timestamp) < targetDate;
      });

      // 逐个删除记录
      for (const record of toDelete) {
        historyService.deleteHistory(record.id);
        deletedCount++;
      }
    }

    // 返回结果
    return c.json({
      success: true,
      message: type === 'all' ? '所有历史记录已清空' : `已删除 ${deletedCount} 条历史记录`,
      data: {
        deleted: deletedCount
      }
    });
  } catch (error) {
    console.error('清空历史记录失败:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '清空历史记录失败'
      }
    }, 500);
  }
});

export { historyApi as historyRouter };
export default historyApi;