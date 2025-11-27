/**
 * 规则学习API路由 - Hono版本
 * 提供规则学习管理的REST API接口
 */

import { Hono } from 'hono';
import { getLearningConfig, updateLearningConfig, resetConfig } from '../../config/ConfigAdapters.js';
import { getIntelligentRuleLearner } from '../../services/rule-learning/IntelligentRuleLearner.js';
import { getLLMService } from '../../core/llm-service.js';
import { getHistoryService } from '../../services/history/historyService.js';
import { logInfo, logError, logApiRequest, logApiError } from '../../utils/logger.js';

const router = new Hono();

/**
 * 获取规则学习配置
 * GET /api/rule-learning/config
 */
router.get('/config', async (c) => {
  const requestId = c.get('requestId') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const config = getLearningConfig();
    
    const responseData = {
      success: true,
      data: {
        config: config,
        timestamp: new Date().toISOString()
      },
      message: '获取规则学习配置成功',
      requestId
    };
    
    await logApiRequest(c.req, { status: 200 }, Date.now() - 100, Date.now());
    
    return c.json(responseData);
  } catch (error) {
    await logApiError('GET', '/api/rule-learning/config', error, { requestId });
    
    return c.json({
      success: false,
      error: {
        code: 'CONFIG_ERROR',
        message: '获取规则学习配置失败',
        details: error.message,
        requestId
      }
    }, 500);
  }
});

/**
 * 更新规则学习配置
 * PUT /api/rule-learning/config
 */
router.put('/config', async (c) => {
  const requestId = c.get('requestId') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const body = await c.req.json();
    const { config: newConfig } = body;
    
    if (!newConfig || typeof newConfig !== 'object') {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_CONFIG',
          message: '无效的配置数据',
          requestId
        }
      }, 400);
    }
    
    const config = getLearningConfig();
    updateLearningConfig(newConfig);
    
    const responseData = {
      success: true,
      data: {
        config: config,
        timestamp: new Date().toISOString()
      },
      message: '更新规则学习配置成功',
      requestId
    };
    
    await logApiRequest(c.req, { status: 200 }, Date.now() - 100, Date.now());
    
    return c.json(responseData);
  } catch (error) {
    await logApiError('PUT', '/api/rule-learning/config', error, { requestId });
    
    return c.json({
      success: false,
      error: {
        code: 'CONFIG_UPDATE_ERROR',
        message: '更新规则学习配置失败',
        details: error.message,
        requestId
      }
    }, 400);
  }
});

/**
 * 重置规则学习配置
 * POST /api/rule-learning/config/reset
 */
router.post('/config/reset', async (c) => {
  const requestId = c.get('requestId') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    resetConfig();
    
    const responseData = {
      success: true,
      data: {
        config: config,
        timestamp: new Date().toISOString()
      },
      message: '重置规则学习配置成功',
      requestId
    };
    
    await logApiRequest(c.req, { status: 200 }, Date.now() - 100, Date.now());
    
    return c.json(responseData);
  } catch (error) {
    await logApiError('POST', '/api/rule-learning/config/reset', error, { requestId });
    
    return c.json({
      success: false,
      error: {
        code: 'CONFIG_RESET_ERROR',
        message: '重置规则学习配置失败',
        details: error.message,
        requestId
      }
    }, 500);
  }
});

/**
 * 获取规则学习状态
 * GET /api/rule-learning/status
 */
router.get('/status', async (c) => {
  const requestId = c.get('requestId') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const config = getLearningConfig();
    const historyService = getHistoryService();
    
    // 获取历史记录统计
    const historyStats = await historyService.getStatistics();
    
    // 获取学习配置状态
    const learningStatus = {
      enabled: config.learning?.enabled ?? true,
      minConfidence: config.learning?.minConfidence ?? 0.7,
      minBatchSize: config.learning?.minBatchSize ?? 5,
      enableRealTimeLearning: config.learning?.enableRealTimeLearning ?? true,
      enableBatchLearning: config.learning?.enableBatchLearning ?? true
    };
    
    // 计算是否满足学习条件
    const canLearn = learningStatus.enabled && 
                     historyStats.totalRecords >= learningStatus.minBatchSize;
    
    const responseData = {
      success: true,
      data: {
        learning: learningStatus,
        history: historyStats,
        canLearn,
        timestamp: new Date().toISOString()
      },
      message: '获取规则学习状态成功',
      requestId
    };
    
    await logApiRequest(c.req, { status: 200 }, Date.now() - 100, Date.now());
    
    return c.json(responseData);
  } catch (error) {
    await logApiError('GET', '/api/rule-learning/status', error, { requestId });
    
    return c.json({
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: '获取规则学习状态失败',
        details: error.message,
        requestId
      }
    }, 500);
  }
});

/**
 * 触发批量规则学习
 * POST /api/rule-learning/learn
 */
router.post('/learn', async (c) => {
  const requestId = c.get('requestId') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const body = await c.req.json();
    const { options = {} } = body;
    
    const config = getLearningConfig();
    
    if (!config.learning?.enabled) {
      return c.json({
        success: false,
        error: {
          code: 'LEARNING_DISABLED',
          message: '规则学习功能未启用',
          requestId
        }
      }, 400);
    }
    
    const historyService = getHistoryService();
    const llmService = getLLMService();
    const ruleLearner = getIntelligentRuleLearner(llmService, historyService);
    
    // 异步执行学习任务
    const learningTask = async () => {
      try {
        const result = await ruleLearner.performBatchLearning(options);
        await logInfo('批量规则学习完成', {
          type: 'batch_learning_completed',
          generatedRules: result.generatedRules,
          requestId
        });
        return result;
      } catch (error) {
        await logError('批量规则学习失败', error, {
          type: 'batch_learning_failed',
          requestId
        });
        throw error;
      }
    };
    
    // 启动异步任务
    learningTask().catch(error => {
      console.error('[API] 异步规则学习任务失败:', error);
    });
    
    const responseData = {
      success: true,
      data: {
        message: '规则学习任务已启动',
        status: 'started',
        timestamp: new Date().toISOString()
      },
      message: '触发规则学习成功',
      requestId
    };
    
    await logApiRequest(c.req, { status: 200 }, Date.now() - 100, Date.now());
    
    return c.json(responseData);
  } catch (error) {
    await logApiError('POST', '/api/rule-learning/learn', error, { requestId });
    
    return c.json({
      success: false,
      error: {
        code: 'LEARNING_ERROR',
        message: '触发规则学习失败',
        details: error.message,
        requestId
      }
    }, 500);
  }
});

/**
 * 获取学习历史
 * GET /api/rule-learning/history
 */
router.get('/history', async (c) => {
  const requestId = c.get('requestId') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const query = c.req.query();
    const { 
      page = 1, 
      limit = 20, 
      category, 
      status,
      startDate,
      endDate 
    } = query;
    
    const historyService = getHistoryService();
    
    // 构建查询条件
    const filters = {};
    if (category) filters.category = category;
    if (status) filters.status = status;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy: 'timestamp',
      sortOrder: 'desc'
    };
    
    const result = await historyService.getLearningHistory(filters, options);
    
    const responseData = {
      success: true,
      data: {
        ...result,
        timestamp: new Date().toISOString()
      },
      message: '获取学习历史成功',
      requestId
    };
    
    await logApiRequest(c.req, { status: 200 }, Date.now() - 100, Date.now());
    
    return c.json(responseData);
  } catch (error) {
    await logApiError('GET', '/api/rule-learning/history', error, { requestId });
    
    return c.json({
      success: false,
      error: {
        code: 'HISTORY_ERROR',
        message: '获取学习历史失败',
        details: error.message,
        requestId
      }
    }, 500);
  }
});

/**
 * 获取生成的规则列表
 * GET /api/rule-learning/rules
 */
router.get('/rules', async (c) => {
  const requestId = c.get('requestId') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const query = c.req.query();
    const { 
      page = 1, 
      limit = 20, 
      category, 
      status,
      minQuality,
      maxQuality 
    } = query;
    
    const historyService = getHistoryService();
    
    // 构建查询条件
    const filters = {};
    if (category) filters.category = category;
    if (status) filters.status = status;
    if (minQuality) filters.minQuality = parseFloat(minQuality);
    if (maxQuality) filters.maxQuality = parseFloat(maxQuality);
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy: 'timestamp',
      sortOrder: 'desc'
    };
    
    const result = await historyService.getGeneratedRules(filters, options);
    
    const responseData = {
      success: true,
      data: {
        ...result,
        timestamp: new Date().toISOString()
      },
      message: '获取生成规则列表成功',
      requestId
    };
    
    await logApiRequest(c.req, { status: 200 }, Date.now() - 100, Date.now());
    
    return c.json(responseData);
  } catch (error) {
    await logApiError('GET', '/api/rule-learning/rules', error, { requestId });
    
    return c.json({
      success: false,
      error: {
        code: 'RULES_ERROR',
        message: '获取生成规则列表失败',
        details: error.message,
        requestId
      }
    }, 500);
  }
});

/**
 * 获取规则详情
 * GET /api/rule-learning/rules/:ruleId
 */
router.get('/rules/:ruleId', async (c) => {
  const requestId = c.get('requestId') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const { ruleId } = c.req.param();
  
  try {
    const historyService = getHistoryService();
    const rule = await historyService.getRuleById(ruleId);
    
    if (!rule) {
      return c.json({
        success: false,
        error: {
          code: 'RULE_NOT_FOUND',
          message: '规则不存在',
          details: { ruleId },
          requestId
        }
      }, 404);
    }
    
    const responseData = {
      success: true,
      data: {
        rule,
        timestamp: new Date().toISOString()
      },
      message: '获取规则详情成功',
      requestId
    };
    
    await logApiRequest(c.req, { status: 200 }, Date.now() - 100, Date.now());
    
    return c.json(responseData);
  } catch (error) {
    await logApiError('GET', `/api/rule-learning/rules/${ruleId}`, error, { requestId });
    
    return c.json({
      success: false,
      error: {
        code: 'RULE_DETAIL_ERROR',
        message: '获取规则详情失败',
        details: error.message,
        requestId
      }
    }, 500);
  }
});

/**
 * 手动审批规则
 * POST /api/rule-learning/rules/:ruleId/approve
 */
router.post('/rules/:ruleId/approve', async (c) => {
  const requestId = c.get('requestId') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const { ruleId } = c.req.param();
  
  try {
    const body = await c.req.json();
    const { approved, reason } = body;
    
    if (typeof approved !== 'boolean') {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_APPROVAL',
          message: 'approved 字段必须是布尔值',
          requestId
        }
      }, 400);
    }
    
    const historyService = getHistoryService();
    const result = await historyService.approveRule(ruleId, approved, reason);
    
    if (!result) {
      return c.json({
        success: false,
        error: {
          code: 'APPROVAL_ERROR',
          message: '规则不存在或状态不允许审批',
          details: { ruleId },
          requestId
        }
      }, 404);
    }
    
    const responseData = {
      success: true,
      data: {
        rule: result,
        action: approved ? 'approved' : 'rejected',
        reason,
        timestamp: new Date().toISOString()
      },
      message: '规则审批成功',
      requestId
    };
    
    await logApiRequest(c.req, { status: 200 }, Date.now() - 100, Date.now());
    
    return c.json(responseData);
  } catch (error) {
    await logApiError('POST', `/api/rule-learning/rules/${ruleId}/approve`, error, { requestId });
    
    return c.json({
      success: false,
      error: {
        code: 'APPROVAL_ERROR',
        message: '规则审批失败',
        details: error.message,
        requestId
      }
    }, 500);
  }
});

/**
 * 删除生成的规则
 * DELETE /api/rule-learning/rules/:ruleId
 */
router.delete('/rules/:ruleId', async (c) => {
  const requestId = c.get('requestId') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const { ruleId } = c.req.param();
  
  try {
    const historyService = getHistoryService();
    const result = await historyService.deleteRule(ruleId);
    
    if (!result) {
      return c.json({
        success: false,
        error: {
          code: 'RULE_NOT_FOUND',
          message: '规则不存在',
          details: { ruleId },
          requestId
        }
      }, 404);
    }
    
    const responseData = {
      success: true,
      data: {
        ruleId,
        deleted: true,
        timestamp: new Date().toISOString()
      },
      message: '删除规则成功',
      requestId
    };
    
    await logApiRequest(c.req, { status: 200 }, Date.now() - 100, Date.now());
    
    return c.json(responseData);
  } catch (error) {
    await logApiError('DELETE', `/api/rule-learning/rules/${ruleId}`, error, { requestId });
    
    return c.json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: '删除规则失败',
        details: error.message,
        requestId
      }
    }, 500);
  }
});

/**
 * 获取学习统计信息
 * GET /api/rule-learning/statistics
 */
router.get('/statistics', async (c) => {
  const requestId = c.get('requestId') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const query = c.req.query();
    const { period = '30d' } = query;
    
    const historyService = getHistoryService();
    const statistics = await historyService.getLearningStatistics(period);
    
    const responseData = {
      success: true,
      data: {
        statistics,
        period,
        timestamp: new Date().toISOString()
      },
      message: '获取学习统计信息成功',
      requestId
    };
    
    await logApiRequest(c.req, { status: 200 }, Date.now() - 100, Date.now());
    
    return c.json(responseData);
  } catch (error) {
    await logApiError('GET', '/api/rule-learning/statistics', error, { requestId });
    
    return c.json({
      success: false,
      error: {
        code: 'STATISTICS_ERROR',
        message: '获取学习统计信息失败',
        details: error.message,
        requestId
      }
    }, 500);
  }
});

/**
 * 清理学习数据
 * DELETE /api/rule-learning/cleanup
 */
router.delete('/cleanup', async (c) => {
  const requestId = c.get('requestId') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const body = await c.req.json();
    const { 
      olderThan,
      status,
      keepApproved = true 
    } = body;
    
    if (!olderThan) {
      return c.json({
        success: false,
        error: {
          code: 'MISSING_PARAMETER',
          message: 'olderThan 参数是必需的',
          requestId
        }
      }, 400);
    }
    
    const historyService = getHistoryService();
    const result = await historyService.cleanupLearningData({
      olderThan: new Date(olderThan),
      status,
      keepApproved
    });
    
    const responseData = {
      success: true,
      data: {
        ...result,
        timestamp: new Date().toISOString()
      },
      message: '清理学习数据成功',
      requestId
    };
    
    await logApiRequest(c.req, { status: 200 }, Date.now() - 100, Date.now());
    
    return c.json(responseData);
  } catch (error) {
    await logApiError('DELETE', '/api/rule-learning/cleanup', error, { requestId });
    
    return c.json({
      success: false,
      error: {
        code: 'CLEANUP_ERROR',
        message: '清理学习数据失败',
        details: error.message,
        requestId
      }
    }, 500);
  }
});

/**
 * 注册规则学习路由
 * @param {Hono} app - Hono应用实例
 */
export function registerRuleLearningRoutes(app) {
  app.route('/api/rule-learning', router);
}

export default router;