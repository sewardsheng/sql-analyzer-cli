/**
* 报告整合器
* 负责整合UnifiedAnalyzer的多维度分析结果，生成最终的综合报告
* 包括智能去重、优先级评估、实施计划生成等功能
*/

// 定义接口
interface AnalysisResult {
  success?: boolean;
  data?: any;
  [key: string]: any;
}

interface AnalysisResults {
  [dimension: string]: AnalysisResult;
}

/**
* 报告整合器类
*/
class ReportIntegrator {
private config: {
similarityThreshold: number;
weights: {
performance: number;
security: number;
standards: number;
};
priorityFactors: {
severity: number;
impact: number;
effort: number;
};
[key: string]: any;
};

constructor(config: any = {}) {
this.config = {
// 去重相似度阈值
similarityThreshold: config.similarityThreshold || 0.8,
// 评分权重配置
weights: {
performance: config.performanceWeight || 0.4,
security: config.securityWeight || 0.4,
standards: config.standardsWeight || 0.2
},
// 优先级评估配置
priorityFactors: {
severity: config.severityWeight || 0.5,
impact: config.impactWeight || 0.3,
effort: config.effortWeight || 0.2
},
...config
};
}

/**
* 整合分析结果并生成综合报告
* @param {GlobalContext} context - 全局上下文
* @returns {Promise<Object>} 整合后的报告
*/
async integrateReport(context) {
try {
// 获取各维度分析结果
const analysisResults = context.getAnalysisResult();

// 检查是否有分析结果
if (!this.hasValidResults(analysisResults)) {
return this.createEmptyReport(context);
}

// 提取并合并建议
const allRecommendations = this.extractAllRecommendations(analysisResults);

// 智能去重
const deduplicatedRecommendations = this.deduplicateRecommendations(allRecommendations);

// 优先级评估和排序
const prioritizedRecommendations = this.prioritizeRecommendations(deduplicatedRecommendations);

// 生成实施计划
const implementationPlan = this.generateImplementationPlan(prioritizedRecommendations);

// 计算综合评分和风险等级
const { overallScore, riskLevel, securityVeto } = this.calculateOverallMetrics(analysisResults);

// 构建最终报告
const report = {
overallScore,
riskLevel,
securityVeto,
summary: this.buildSummary(analysisResults),
recommendations: prioritizedRecommendations,
implementationPlan,
metadata: {
requestId: context.requestId,
timestamp: new Date().toISOString(),
databaseType: context.databaseType,
sqlComplexity: context.metadata.complexity,
analysisDuration: context.metrics.totalDuration,
llmCalls: context.metrics.llmCalls,
enabledDimensions: context.options
}
};

// 保存到全局上下文
context.setIntegratedReport(report);

return report;
} catch (error) {
console.error('报告整合失败:', error);
return this.createErrorReport(context, error);
}
}

/**
* 检查是否有有效的分析结果
* @param {Object} analysisResults - 分析结果
* @returns {boolean} 是否有有效结果
*/
hasValidResults(analysisResults: AnalysisResults) {
if (!analysisResults || typeof analysisResults !== 'object') {
return false;
}

return Object.values(analysisResults).some(result =>
result && (result as AnalysisResult).success && (result as AnalysisResult).data
);
}

/**
* 提取所有建议
* @param {Object} analysisResults - 分析结果
* @returns {Array} 所有建议的列表
*/
extractAllRecommendations(analysisResults: AnalysisResults) {
const recommendations = [];

Object.entries(analysisResults).forEach(([dimension, result]) => {
if (!result || !(result as AnalysisResult).success || !(result as AnalysisResult).data) return;

const dimensionData = (result as AnalysisResult).data;
const dimensionRecommendations = dimensionData.recommendations || [];

// 为每个建议添加维度信息
dimensionRecommendations.forEach((rec, index) => {
recommendations.push({
id: `${dimension}_rec_${index}`,
type: dimension,
title: rec.title || '未命名建议',
description: rec.description || '',
impact: rec.impact || 'medium',
effort: rec.effort || 'medium',
category: rec.category || 'general',
severity: this.inferSeverity(rec),
source: dimension,
originalIndex: index
});
});
});

return recommendations;
}

/**
* 推断建议的严重程度
* @param {Object} recommendation - 建议对象
* @returns {string} 推断的严重程度
*/
inferSeverity(recommendation) {
// 如果已有severity，直接返回
if (recommendation.severity) {
return recommendation.severity;
}

// 基于impact和effort推断severity
const impact = recommendation.impact || 'medium';
const effort = recommendation.effort || 'medium';

// 高影响、低努力的建议通常是高优先级
if (impact === 'high' && (effort === 'low' || effort === 'medium')) {
return 'high';
}

// 低影响、高努力的建议通常是低优先级
if (impact === 'low' && effort === 'high') {
return 'low';
}

// 其他情况为中等优先级
return 'medium';
}

/**
* 智能去重建议
* @param {Array} recommendations - 建议列表
* @returns {Array} 去重后的建议列表
*/
deduplicateRecommendations(recommendations) {
if (!Array.isArray(recommendations) || recommendations.length === 0) {
return [];
}

const deduplicated = [];
const signatureMap = new Map(); // 使用Map提高查找效率

for (const rec of recommendations) {
// 生成建议的标准化表示
const normalizedRec = this.normalizeRecommendation(rec);
const signature = this.generateOptimizedSignature(normalizedRec);

// 检查是否与已有建议相似
const existingRec = signatureMap.get(signature);
if (existingRec) {
// 合并建议，保留更严重的信息
this.mergeRecommendationsOptimized(existingRec, normalizedRec);
} else {
deduplicated.push(normalizedRec);
signatureMap.set(signature, normalizedRec);
}
}

return deduplicated;
}

/**
* 标准化建议对象
* @param {Object} recommendation - 原始建议
* @returns {Object} 标准化后的建议
*/
normalizeRecommendation(recommendation) {
return {
id: recommendation.id,
type: recommendation.type,
title: recommendation.title.trim(),
description: recommendation.description.trim(),
impact: this.normalizeImpact(recommendation.impact),
effort: this.normalizeEffort(recommendation.effort),
category: recommendation.category,
severity: this.normalizeSeverity(recommendation.severity),
source: recommendation.source,
originalIndex: recommendation.originalIndex
};
}

/**
* 标准化影响程度
* @param {string} impact - 原始影响程度
* @returns {string} 标准化影响程度
*/
normalizeImpact(impact) {
if (!impact || typeof impact !== 'string') return 'medium';
const normalized = impact.toLowerCase();
const validImpacts = ['low', 'medium', 'high'];
return validImpacts.includes(normalized) ? normalized : 'medium';
}

/**
* 标准化实施难度
* @param {string} effort - 原始实施难度
* @returns {string} 标准化实施难度
*/
normalizeEffort(effort) {
if (!effort || typeof effort !== 'string') return 'medium';
const normalized = effort.toLowerCase();
const validEfforts = ['low', 'medium', 'high'];
return validEfforts.includes(normalized) ? normalized : 'medium';
}

/**
* 标准化严重程度
* @param {string} severity - 原始严重程度
* @returns {string} 标准化严重程度
*/
normalizeSeverity(severity) {
if (!severity || typeof severity !== 'string') return 'medium';
const normalized = severity.toLowerCase();
const validSeverities = ['low', 'medium', 'high', 'critical'];
return validSeverities.includes(normalized) ? normalized : 'medium';
}

/**
* 生成建议签名（用于去重比较）
* @param {Object} recommendation - 标准化的建议
* @returns {string} 建议签名
*/
generateOptimizedSignature(recommendation) {
// 使用更简单的签名算法
const title = recommendation.title.toLowerCase().trim();
const description = recommendation.description.toLowerCase().trim();

// 提取关键词 - 停用词列表
const stopWords = new Set(['的', '是', '在', '有', '和', '与', '或', '但', '如果', '那么', 'the', 'is', 'in', 'and', 'or', 'but', 'if', 'then', 'for', 'to', 'with', 'by', 'from']);

// 组合标题和描述的前50个字符作为快速签名
const combined = (title + ' ' + description).substring(0, 50);

const keywords = combined
.split(/\s+/)
.filter(word => word.length > 2 && !stopWords.has(word))
.sort()
.join('|');

return keywords;
}

/**
* 计算相似度
* @param {string} sig1 - 签名1
* @param {string} sig2 - 签名2
* @returns {number} 相似度 (0-1)
*/
calculateOptimizedSimilarity(sig1, sig2) {
if (!sig1 || !sig2) return 0;
if (sig1 === sig2) return 1;

// 使用更快的相似度算法
const words1 = sig1.split('|');
const words2 = sig2.split('|');

let commonWords = 0;
const shorter = words1.length < words2.length ? words1 : words2;
const longer = words1.length >= words2.length ? words1 : words2;

// 快速查找共同词
const longerSet = new Set(longer);
for (const word of shorter) {
if (longerSet.has(word)) {
commonWords++;
}
}

return commonWords / longer.length;
}

/**
* 合并相似建议
* @param {Object} existing - 现有建议
* @param {Object} newRec - 新建议
*/
mergeRecommendationsOptimized(existing, newRec) {
// 使用预定义的级别映射
const severityLevels = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
const impactLevels = { 'low': 1, 'medium': 2, 'high': 3 };

// 保留更严重的严重程度
if (severityLevels[newRec.severity] > severityLevels[existing.severity]) {
existing.severity = newRec.severity;
}

// 保留更高的影响程度
if (impactLevels[newRec.impact] > impactLevels[existing.impact]) {
existing.impact = newRec.impact;
}

// 简化来源合并
if (existing.source !== newRec.source) {
existing.source = `${existing.source},${newRec.source}`;
}

// 限制描述长度
if (newRec.description && existing.description.length < 500) {
existing.description += ` | ${newRec.description.substring(0, 100)}`;
}
}

/**
* 优先级评估和排序
* @param {Array} recommendations - 去重后的建议列表
* @returns {Array} 按优先级排序的建议列表
*/
prioritizeRecommendations(recommendations) {
if (!Array.isArray(recommendations)) return [];

// 预计算优先级映射
const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };

return recommendations
.map(rec => ({
...rec,
priority: this.calculatePriority(rec)
}))
.sort((a, b) => {
// 排序算法
const aLevel = priorityOrder[a.priority] || 0;
const bLevel = priorityOrder[b.priority] || 0;

// 主要按优先级降序
if (aLevel !== bLevel) {
return bLevel - aLevel;
}

// 次要按严重程度降序
const aSeverity = priorityOrder[a.severity] || 0;
const bSeverity = priorityOrder[b.severity] || 0;

return bSeverity - aSeverity;
});
}

/**
* 计算建议的优先级评分
* @param {Object} recommendation - 建议对象
* @returns {number} 优先级评分
*/
calculatePriority(recommendation) {
const { severity, impact, effort } = recommendation;
const factors = this.config.priorityFactors;

// 使用预定义的评分表
const severityScore = this.getSeverityScore(severity);
const impactScore = this.getImpactScore(impact);
const effortScore = this.getEffortScore(effort);

// 加权计算
return Math.round(
severityScore * factors.severity +
impactScore * factors.impact +
effortScore * factors.effort
);
}

/**
* 获取严重程度评分
* @param {string} severity - 严重程度
* @returns {number} 评分
*/
getSeverityScore(severity) {
const scores = {
'low': 25,
'medium': 50,
'high': 75,
'critical': 100
};
return scores[severity] || 50;
}

/**
* 获取影响程度评分
* @param {string} impact - 影响程度
* @returns {number} 评分
*/
getImpactScore(impact) {
const scores = {
'low': 25,
'medium': 50,
'high': 100
};
return scores[impact] || 50;
}

/**
* 获取实施难度评分
* @param {string} effort - 实施难度
* @returns {number} 评分
*/
getEffortScore(effort) {
// 难度越低评分越高
const scores = {
'low': 100,
'medium': 50,
'high': 25
};
return scores[effort] || 50;
}

/**
* 生成实施计划
* @param {Array} recommendations - 优先级排序的建议列表
* @returns {Object} 分阶段实施计划
*/
generateImplementationPlan(recommendations) {
const plan = {
immediate: [],    // 立即执行（严重安全问题）
shortTerm: [],    // 短期执行（高优先级问题）
longTerm: []      // 长期执行（中低优先级问题）
};

recommendations.forEach(rec => {
const { severity, impact, effort } = rec;

// 安全一票否决的严重问题立即执行
if (severity === 'critical' || (rec.type === 'security' && severity === 'high')) {
plan.immediate.push(rec);
}
// 高影响、低/中等难度的建议短期执行
else if ((impact === 'high' && (effort === 'low' || effort === 'medium')) || severity === 'high') {
plan.shortTerm.push(rec);
}
// 其他建议长期执行
else {
plan.longTerm.push(rec);
}
});

return plan;
}

/**
* 计算综合评分和风险等级
* @param {Object} analysisResults - 分析结果
* @returns {Object} 综合指标
*/
calculateOverallMetrics(analysisResults: AnalysisResults) {
const weights = this.config.weights;
let totalScore = 0;
let totalWeight = 0;
let securityVeto = false;
let lowestScore = 100;

Object.entries(analysisResults).forEach(([dimension, result]) => {
if (!result || !(result as AnalysisResult).success || !(result as AnalysisResult).data) return;

const dimensionScore = ((result as AnalysisResult).data as any).score || 0;
const dimensionWeight = weights[dimension] || 0;

totalScore += dimensionScore * dimensionWeight;
totalWeight += dimensionWeight;

// 记录最低分
if (dimensionScore < lowestScore) {
lowestScore = dimensionScore;
}

// 检查安全一票否决
if (dimension === 'security' && result.data.veto === true) {
securityVeto = true;
}
});

// 计算加权平均分
const overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;

// 确定风险等级
let riskLevel = 'low';
if (securityVeto) {
riskLevel = 'critical';
} else if (overallScore < 50 || lowestScore < 30) {
riskLevel = 'high';
} else if (overallScore < 75 || lowestScore < 60) {
riskLevel = 'medium';
}

return { overallScore, riskLevel, securityVeto };
}

/**
* 构建分析摘要 - 支持详细字段
* @param {Object} analysisResults - 分析结果
* @returns {Object} 分析摘要
*/
buildSummary(analysisResults: AnalysisResults) {
const summary: any = {};

Object.entries(analysisResults).forEach(([dimension, result]) => {
if (!result || !(result as AnalysisResult).success || !(result as AnalysisResult).data) {
summary[dimension] = this.createDefaultDimensionSummary(dimension);
return;
}

const data = (result as AnalysisResult).data;

// 保留所有原始字段
summary[dimension] = {
...data,  // 展开所有字段

// 确保基础字段格式正确
score: data.score || 0,
status: this.determineStatus(data.score || 0),

// 显式保留关键字段,提供默认值
issues: data.issues || [],
recommendations: data.recommendations || [],

// Performance字段
executionPlan: data.executionPlan || {},
optimizations: data.optimizations || [],
metrics: data.metrics || {},

// Security字段
vulnerabilities: data.vulnerabilities || [],
threatLevel: data.threatLevel,
attackSurface: data.attackSurface || {},
securityMetrics: data.securityMetrics || {},
complianceAssessment: data.complianceAssessment || {},

// Standards字段
violations: data.violations || [],
fixed_sql: data.fixed_sql || '',
fixSummary: data.fixSummary || {},
standardsCompliance: data.standardsCompliance || {},
complexityMetrics: data.complexityMetrics || {},
qualityMetrics: data.qualityMetrics || {},

// 其他字段
bestPractices: data.bestPractices || []
};
});

return summary;
}

/**
* 创建默认维度摘要
* @param {string} dimension - 维度名称
* @returns {Object} 默认摘要
*/
createDefaultDimensionSummary(dimension) {
return {
score: 0,
status: 'failed',
issues: 0,
recommendations: 0,
confidence: 0,
error: '分析失败'
};
}

/**
* 根据分数确定状态
* @param {number} score - 分数
* @returns {string} 状态
*/
determineStatus(score) {
if (score >= 90) return 'excellent';
if (score >= 75) return 'good';
if (score >= 50) return 'warning';
return 'critical';
}

/**
* 创建空报告
* @param {GlobalContext} context - 全局上下文
* @returns {Object} 空报告
*/
createEmptyReport(context) {
return {
overallScore: 0,
riskLevel: 'unknown',
securityVeto: false,
summary: {},
recommendations: [],
implementationPlan: {
immediate: [],
shortTerm: [],
longTerm: []
},
metadata: {
requestId: context.requestId,
timestamp: new Date().toISOString(),
databaseType: context.databaseType,
error: '无有效的分析结果'
}
};
}

/**
* 创建错误报告
* @param {GlobalContext} context - 全局上下文
* @param {Error} error - 错误对象
* @returns {Object} 错误报告
*/
createErrorReport(context, error) {
return {
overallScore: 0,
riskLevel: 'critical',
securityVeto: false,
summary: {},
recommendations: [],
implementationPlan: {
immediate: [],
shortTerm: [],
longTerm: []
},
metadata: {
requestId: context.requestId,
timestamp: new Date().toISOString(),
databaseType: context.databaseType,
error: error.message
}
};
}
}

export default ReportIntegrator;