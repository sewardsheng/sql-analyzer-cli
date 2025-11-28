/**
* 规则学习API路由 - Hono版本
* 提供规则学习管理的REST API接口
*/

import { Hono } from 'hono';
import { config } from '../../config/index.js';
import { getIntelligentRuleLearner } from '../../services/rule-learning/rule-learner.js';
import { getLLMService } from '../../core/llm-service.js';
import { getHistoryService } from '../../services/history-service.js';
import { info, error as logError, logApiRequest, logApiError, LogCategory } from '../../utils/logger.js';

const router = new Hono();

// 从配置管理器获取学习配置
function getLearningConfig() {
return config.getRuleLearningConfig();
}

// 更新学习配置
function updateLearningConfig(newConfig) {
config.set('ruleLearning', config.deepMerge(config.getRuleLearningConfig(), newConfig));
}

// 重置配置
function resetConfig() {
config.set('ruleLearning', config.getModule('ruleLearning'));
}

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
config: getLearningConfig(),
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
const historyService = await getHistoryService();

// 获取历史记录统计
const historyStats = await historyService.getHistoryStats();

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

const historyService = await getHistoryService();
const llmService = getLLMService();
const ruleLearner = getIntelligentRuleLearner(llmService, historyService);

// 异步执行学习任务
const learningTask = async () => {
try {
const result = await ruleLearner.performBatchLearning(options);
await info(LogCategory.API, '批量规则学习完成', {
type: 'batch_learning_completed',
generatedRules: result.generatedRules,
requestId
});
return result;
} catch (error) {
await logError(LogCategory.API, '批量规则学习失败', error, {
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
* 获取智能阈值调整统计
* GET /api/rule-learning/threshold-stats
*/
router.get('/threshold-stats', async (c) => {
const requestId = c.get('requestId') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

try {
const { getIntelligentRuleLearner } = await import('../../services/rule-learning/rule-learner.js');
const { getLLMService } = await import('../../core/llm-service.js');
const { getHistoryService } = await import('../../services/history-service.js');

const llmService = getLLMService();
const historyService = await getHistoryService();
const ruleLearner = getIntelligentRuleLearner(llmService, historyService);

const thresholdStats = ruleLearner.thresholdAdjuster.getQualityStats();
const adjustmentHistory = ruleLearner.thresholdAdjuster.getAdjustmentHistory();

const responseData = {
success: true,
data: {
currentThreshold: ruleLearner.config.autoApproveThreshold,
stats: thresholdStats,
adjustmentHistory: adjustmentHistory.slice(-10), // 最近10次调整
timestamp: new Date().toISOString()
},
message: '获取阈值调整统计成功',
requestId
};

await logApiRequest(c.req, { status: 200 }, Date.now() - 100, Date.now());

return c.json(responseData);
} catch (error) {
await logApiError('GET', '/api/rule-learning/threshold-stats', error, { requestId });

return c.json({
success: false,
error: {
code: 'THRESHOLD_STATS_ERROR',
message: '获取阈值调整统计失败',
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