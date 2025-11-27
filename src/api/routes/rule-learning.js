/**
 * 规则学习API路由
 * 提供规则学习管理的REST API接口
 */

const express = require('express');
const { getLearningConfig, updateLearningConfig, resetConfig } = require('../../config/ConfigAdapters');
const { getIntelligentRuleLearner } = require('../../services/rule-learning/IntelligentRuleLearner');
const { getLLMService } = require('../../core/llm-service');
const { getHistoryService } = require('../../services/history/historyService');
const responseFormatter = require('../../utils/api/response-formatter');

const router = express.Router();

/**
 * 获取规则学习配置
 * GET /api/rule-learning/config
 */
router.get('/config', async (req, res) => {
  try {
    const config = getLearningConfig();
    
    res.json(responseFormatter.success({
      config: config,
      timestamp: new Date().toISOString()
    }, '获取规则学习配置成功'));
  } catch (error) {
    console.error('[API] 获取规则学习配置失败:', error);
    res.status(500).json(responseFormatter.error(
      '获取规则学习配置失败',
      'CONFIG_ERROR',
      { error: error.message }
    ));
  }
});

/**
 * 更新规则学习配置
 * PUT /api/rule-learning/config
 */
router.put('/config', async (req, res) => {
  try {
    const { config: newConfig } = req.body;
    
    if (!newConfig || typeof newConfig !== 'object') {
      return res.status(400).json(responseFormatter.error(
        '无效的配置数据',
        'INVALID_CONFIG'
      ));
    }
    
    const config = getLearningConfig();
    updateLearningConfig(newConfig);
    
    res.json(responseFormatter.success({
      config: config,
      timestamp: new Date().toISOString()
    }, '更新规则学习配置成功'));
  } catch (error) {
    console.error('[API] 更新规则学习配置失败:', error);
    res.status(400).json(responseFormatter.error(
      '更新规则学习配置失败',
      'CONFIG_UPDATE_ERROR',
      { error: error.message }
    ));
  }
});

/**
 * 重置规则学习配置
 * POST /api/rule-learning/config/reset
 */
router.post('/config/reset', async (req, res) => {
  try {
    resetConfig();
    
    res.json(responseFormatter.success({
      config: config,
      timestamp: new Date().toISOString()
    }, '重置规则学习配置成功'));
  } catch (error) {
    console.error('[API] 重置规则学习配置失败:', error);
    res.status(500).json(responseFormatter.error(
      '重置规则学习配置失败',
      'CONFIG_RESET_ERROR',
      { error: error.message }
    ));
  }
});

/**
 * 获取规则学习状态
 * GET /api/rule-learning/status
 */
router.get('/status', async (req, res) => {
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
    
    res.json(responseFormatter.success({
      learning: learningStatus,
      history: historyStats,
      canLearn,
      timestamp: new Date().toISOString()
    }, '获取规则学习状态成功'));
  } catch (error) {
    console.error('[API] 获取规则学习状态失败:', error);
    res.status(500).json(responseFormatter.error(
      '获取规则学习状态失败',
      'STATUS_ERROR',
      { error: error.message }
    ));
  }
});

/**
 * 触发批量规则学习
 * POST /api/rule-learning/learn
 */
router.post('/learn', async (req, res) => {
  try {
    const { options = {} } = req.body;
    
    const config = getLearningConfig();
    
    if (!config.learning?.enabled) {
      return res.status(400).json(responseFormatter.error(
        '规则学习功能未启用',
        'LEARNING_DISABLED'
      ));
    }
    
    const historyService = getHistoryService();
    const llmService = getLLMService();
    const ruleLearner = getIntelligentRuleLearner(llmService, historyService);
    
    // 异步执行学习任务
    const learningTask = async () => {
      try {
        const result = await ruleLearner.performBatchLearning(options);
        console.log(`[API] 批量规则学习完成: 生成 ${result.generatedRules} 条规则`);
        return result;
      } catch (error) {
        console.error('[API] 批量规则学习失败:', error);
        throw error;
      }
    };
    
    // 启动异步任务
    learningTask().catch(error => {
      console.error('[API] 异步规则学习任务失败:', error);
    });
    
    res.json(responseFormatter.success({
      message: '规则学习任务已启动',
      status: 'started',
      timestamp: new Date().toISOString()
    }, '触发规则学习成功'));
  } catch (error) {
    console.error('[API] 触发规则学习失败:', error);
    res.status(500).json(responseFormatter.error(
      '触发规则学习失败',
      'LEARNING_ERROR',
      { error: error.message }
    ));
  }
});

/**
 * 获取学习历史
 * GET /api/rule-learning/history
 */
router.get('/history', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      status,
      startDate,
      endDate 
    } = req.query;
    
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
    
    res.json(responseFormatter.success({
      ...result,
      timestamp: new Date().toISOString()
    }, '获取学习历史成功'));
  } catch (error) {
    console.error('[API] 获取学习历史失败:', error);
    res.status(500).json(responseFormatter.error(
      '获取学习历史失败',
      'HISTORY_ERROR',
      { error: error.message }
    ));
  }
});

/**
 * 获取生成的规则列表
 * GET /api/rule-learning/rules
 */
router.get('/rules', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      status,
      minQuality,
      maxQuality 
    } = req.query;
    
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
    
    res.json(responseFormatter.success({
      ...result,
      timestamp: new Date().toISOString()
    }, '获取生成规则列表成功'));
  } catch (error) {
    console.error('[API] 获取生成规则列表失败:', error);
    res.status(500).json(responseFormatter.error(
      '获取生成规则列表失败',
      'RULES_ERROR',
      { error: error.message }
    ));
  }
});

/**
 * 获取规则详情
 * GET /api/rule-learning/rules/:ruleId
 */
router.get('/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    
    const historyService = getHistoryService();
    const rule = await historyService.getRuleById(ruleId);
    
    if (!rule) {
      return res.status(404).json(responseFormatter.error(
        '规则不存在',
        'RULE_NOT_FOUND',
        { ruleId }
      ));
    }
    
    res.json(responseFormatter.success({
      rule,
      timestamp: new Date().toISOString()
    }, '获取规则详情成功'));
  } catch (error) {
    console.error('[API] 获取规则详情失败:', error);
    res.status(500).json(responseFormatter.error(
      '获取规则详情失败',
      'RULE_DETAIL_ERROR',
      { error: error.message }
    ));
  }
});

/**
 * 手动审批规则
 * POST /api/rule-learning/rules/:ruleId/approve
 */
router.post('/rules/:ruleId/approve', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { approved, reason } = req.body;
    
    if (typeof approved !== 'boolean') {
      return res.status(400).json(responseFormatter.error(
        'approved 字段必须是布尔值',
        'INVALID_APPROVAL'
      ));
    }
    
    const historyService = getHistoryService();
    const result = await historyService.approveRule(ruleId, approved, reason);
    
    if (!result) {
      return res.status(404).json(responseFormatter.error(
        '规则不存在或状态不允许审批',
        'APPROVAL_ERROR',
        { ruleId }
      ));
    }
    
    res.json(responseFormatter.success({
      rule: result,
      action: approved ? 'approved' : 'rejected',
      reason,
      timestamp: new Date().toISOString()
    }, '规则审批成功'));
  } catch (error) {
    console.error('[API] 规则审批失败:', error);
    res.status(500).json(responseFormatter.error(
      '规则审批失败',
      'APPROVAL_ERROR',
      { error: error.message }
    ));
  }
});

/**
 * 删除生成的规则
 * DELETE /api/rule-learning/rules/:ruleId
 */
router.delete('/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    
    const historyService = getHistoryService();
    const result = await historyService.deleteRule(ruleId);
    
    if (!result) {
      return res.status(404).json(responseFormatter.error(
        '规则不存在',
        'RULE_NOT_FOUND',
        { ruleId }
      ));
    }
    
    res.json(responseFormatter.success({
      ruleId,
      deleted: true,
      timestamp: new Date().toISOString()
    }, '删除规则成功'));
  } catch (error) {
    console.error('[API] 删除规则失败:', error);
    res.status(500).json(responseFormatter.error(
      '删除规则失败',
      'DELETE_ERROR',
      { error: error.message }
    ));
  }
});

/**
 * 获取学习统计信息
 * GET /api/rule-learning/statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    const historyService = getHistoryService();
    const statistics = await historyService.getLearningStatistics(period);
    
    res.json(responseFormatter.success({
      statistics,
      period,
      timestamp: new Date().toISOString()
    }, '获取学习统计信息成功'));
  } catch (error) {
    console.error('[API] 获取学习统计信息失败:', error);
    res.status(500).json(responseFormatter.error(
      '获取学习统计信息失败',
      'STATISTICS_ERROR',
      { error: error.message }
    ));
  }
});

/**
 * 清理学习数据
 * DELETE /api/rule-learning/cleanup
 */
router.delete('/cleanup', async (req, res) => {
  try {
    const { 
      olderThan,
      status,
      keepApproved = true 
    } = req.body;
    
    if (!olderThan) {
      return res.status(400).json(responseFormatter.error(
        'olderThan 参数是必需的',
        'MISSING_PARAMETER'
      ));
    }
    
    const historyService = getHistoryService();
    const result = await historyService.cleanupLearningData({
      olderThan: new Date(olderThan),
      status,
      keepApproved
    });
    
    res.json(responseFormatter.success({
      ...result,
      timestamp: new Date().toISOString()
    }, '清理学习数据成功'));
  } catch (error) {
    console.error('[API] 清理学习数据失败:', error);
    res.status(500).json(responseFormatter.error(
      '清理学习数据失败',
      'CLEANUP_ERROR',
      { error: error.message }
    ));
  }
});

module.exports = router;
