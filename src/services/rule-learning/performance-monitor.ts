/**
* 规则学习性能监控器
* 监控规则学习过程的性能指标
*/

export class PerformanceMonitor {
constructor() {
this.metrics = {
totalLearningSessions: 0,
successfulSessions: 0,
failedSessions: 0,
averageProcessingTime: 0,
llmCallCounts: {
total: 0,
byType: {
ruleGeneration: 0,
qualityEvaluation: 0,
deepLearning: 0
}
},
cacheStats: {
hits: 0,
misses: 0,
hitRate: 0
},
ruleGenerationStats: {
totalRulesGenerated: 0,
averageRulesPerSession: 0,
qualityDistribution: {
excellent: 0,
good: 0,
average: 0,
poor: 0
}
}
};

this.sessionLogs = [];
this.startTime = Date.now();
}

/**
* 记录学习会话开始
* @param {Object} context - 学习上下文
* @returns {string} 会话ID
*/
startLearningSession(context) {
const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const session = {
id: sessionId,
startTime: Date.now(),
context: {
databaseType: context.databaseType,
sqlLength: context.sql?.length || 0,
patternCount: this.countPatterns(context.patterns)
},
llmCalls: [],
cacheHit: false,
rulesGenerated: 0,
status: 'started'
};

this.sessionLogs.push(session);
this.metrics.totalLearningSessions++;

return sessionId;
}

/**
* 记录LLM调用
* @param {string} sessionId - 会话ID
* @param {string} callType - 调用类型
* @param {Object} details - 详细信息
*/
recordLLMCall(sessionId, callType, details = {}) {
const session = this.sessionLogs.find(s => s.id === sessionId);
if (!session) return;

const callInfo = {
type: callType,
timestamp: Date.now(),
promptLength: details.promptLength || 0,
responseLength: details.responseLength || 0,
duration: details.duration || 0
};

session.llmCalls.push(callInfo);
this.metrics.llmCallCounts.total++;
this.metrics.llmCallCounts.byType[callType] =
(this.metrics.llmCallCounts.byType[callType] || 0) + 1;
}

/**
* 记录缓存命中
* @param {string} sessionId - 会话ID
* @param {boolean} hit - 是否命中
*/
recordCacheHit(sessionId, hit) {
const session = this.sessionLogs.find(s => s.id === sessionId);
if (!session) return;

session.cacheHit = hit;

if (hit) {
this.metrics.cacheStats.hits++;
} else {
this.metrics.cacheStats.misses++;
}

// 更新命中率
const total = this.metrics.cacheStats.hits + this.metrics.cacheStats.misses;
this.metrics.cacheStats.hitRate = total > 0 ?
(this.metrics.cacheStats.hits / total * 100).toFixed(2) : 0;
}

/**
* 记录规则生成结果
* @param {string} sessionId - 会话ID
* @param {Array} rules - 生成的规则
*/
recordRuleGeneration(sessionId, rules) {
const session = this.sessionLogs.find(s => s.id === sessionId);
if (!session) return;

session.rulesGenerated = rules.length;
session.endTime = Date.now();
session.duration = session.endTime - session.startTime;

this.metrics.ruleGenerationStats.totalRulesGenerated += rules.length;

// 更新质量分布
rules.forEach(rule => {
const score = rule.evaluation?.qualityScore || 0;
if (score >= 90) this.metrics.ruleGenerationStats.qualityDistribution.excellent++;
else if (score >= 80) this.metrics.ruleGenerationStats.qualityDistribution.good++;
else if (score >= 70) this.metrics.ruleGenerationStats.qualityDistribution.average++;
else this.metrics.ruleGenerationStats.qualityDistribution.poor++;
});

// 更新平均规则数
this.metrics.ruleGenerationStats.averageRulesPerSession =
this.metrics.ruleGenerationStats.totalRulesGenerated / this.metrics.totalLearningSessions;
}

/**
* 记录会话完成
* @param {string} sessionId - 会话ID
* @param {boolean} success - 是否成功
* @param {string} error - 错误信息（可选）
*/
endLearningSession(sessionId, success, error = null) {
const session = this.sessionLogs.find(s => s.id === sessionId);
if (!session) return;

session.status = success ? 'completed' : 'failed';
session.error = error;
session.endTime = Date.now();
session.duration = session.endTime - session.startTime;

if (success) {
this.metrics.successfulSessions++;
} else {
this.metrics.failedSessions++;
}

// 更新平均处理时间
this.updateAverageProcessingTime();
}

/**
* 更新平均处理时间
*/
updateAverageProcessingTime() {
const completedSessions = this.sessionLogs.filter(s => s.status === 'completed');
if (completedSessions.length === 0) return;

const totalTime = completedSessions.reduce((sum, session) =>
sum + (session.duration || 0), 0);

this.metrics.averageProcessingTime = Math.round(totalTime / completedSessions.length);
}

/**
* 计算模式数量
* @param {Object} patterns - 模式对象
* @returns {number} 模式总数
*/
countPatterns(patterns) {
if (!patterns) return 0;
return Object.values(patterns).reduce((sum, patternList) =>
sum + (Array.isArray(patternList) ? patternList.length : 0), 0);
}

/**
* 获取性能报告
* @returns {Object} 性能报告
*/
getPerformanceReport() {
const now = Date.now();
const uptime = now - this.startTime;

return {
summary: {
uptime: this.formatDuration(uptime),
totalSessions: this.metrics.totalLearningSessions,
successRate: this.calculateSuccessRate(),
averageProcessingTime: this.formatDuration(this.metrics.averageProcessingTime),
averageRulesPerSession: this.metrics.ruleGenerationStats.averageRulesPerSession.toFixed(2)
},
llmUsage: {
totalCalls: this.metrics.llmCallCounts.total,
byType: { ...this.metrics.llmCallCounts.byType },
averageCallsPerSession: this.metrics.llmCallCounts.total / Math.max(this.metrics.totalLearningSessions, 1)
},
cachePerformance: {
hitRate: this.metrics.cacheStats.hitRate,
hits: this.metrics.cacheStats.hits,
misses: this.metrics.cacheStats.misses
},
ruleQuality: {
totalGenerated: this.metrics.ruleGenerationStats.totalRulesGenerated,
qualityDistribution: { ...this.metrics.ruleGenerationStats.qualityDistribution }
},
recentSessions: this.getRecentSessions(10)
};
}

/**
* 计算成功率
* @returns {string} 成功率百分比
*/
calculateSuccessRate() {
if (this.metrics.totalLearningSessions === 0) return '0%';
return ((this.metrics.successfulSessions / this.metrics.totalLearningSessions) * 100).toFixed(2) + '%';
}

/**
* 获取最近会话
* @param {number} count - 会话数量
* @returns {Array} 最近会话列表
*/
getRecentSessions(count) {
return this.sessionLogs
.slice(-count)
.reverse()
.map(session => ({
id: session.id,
status: session.status,
duration: this.formatDuration(session.duration || 0),
rulesGenerated: session.rulesGenerated,
cacheHit: session.cacheHit,
llmCalls: session.llmCalls.length,
databaseType: session.context.databaseType,
error: session.error
}));
}

/**
* 格式化持续时间
* @param {number} ms - 毫秒数
* @returns {string} 格式化时间
*/
formatDuration(ms) {
if (ms < 1000) return `${ms}ms`;
if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
return `${(ms / 60000).toFixed(1)}m`;
}

/**
* 获取简化性能指标
* @returns {Object} 简化指标
*/
getSimpleMetrics() {
return {
totalSessions: this.metrics.totalLearningSessions,
successRate: this.calculateSuccessRate(),
avgProcessingTime: this.formatDuration(this.metrics.averageProcessingTime),
cacheHitRate: this.metrics.cacheStats.hitRate + '%',
totalRules: this.metrics.ruleGenerationStats.totalRulesGenerated,
avgRulesPerSession: this.metrics.ruleGenerationStats.averageRulesPerSession.toFixed(1)
};
}

/**
* 重置统计
*/
reset() {
this.metrics = {
totalLearningSessions: 0,
successfulSessions: 0,
failedSessions: 0,
averageProcessingTime: 0,
llmCallCounts: {
total: 0,
byType: {
ruleGeneration: 0,
qualityEvaluation: 0,
deepLearning: 0
}
},
cacheStats: {
hits: 0,
misses: 0,
hitRate: 0
},
ruleGenerationStats: {
totalRulesGenerated: 0,
averageRulesPerSession: 0,
qualityDistribution: {
excellent: 0,
good: 0,
average: 0,
poor: 0
}
}
};

this.sessionLogs = [];
this.startTime = Date.now();

}
}

// 创建全局实例
let performanceMonitorInstance = null;

/**
* 获取性能监控器实例
* @returns {PerformanceMonitor} 性能监控器实例
*/
export function getPerformanceMonitor() {
if (!performanceMonitorInstance) {
performanceMonitorInstance = new PerformanceMonitor();
}
return performanceMonitorInstance;
}

export default PerformanceMonitor;