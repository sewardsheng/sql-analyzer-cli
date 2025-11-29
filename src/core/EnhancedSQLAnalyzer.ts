/**
* 增强型SQL分析器
* 集成智能上下文管理系统，告别SB的原始分析模式
*/

import { createTool, ToolFactory, sortToolsByPriority } from './tools/index.js';
import { createContextManager, createSmartPromptBuilder } from './context/index.js';
import { getLLMService } from './llm-service.js';
import { retrieveKnowledge } from './knowledge/knowledge-base.js';
import { logError } from '../utils/logger.js';
import { config } from '../config/index.js';

// 分析选项接口
interface AnalysisOptions {
  databaseType?: string;
  [key: string]: any;
}

interface BatchAnalysisOptions {
  batchSize?: number;
  [key: string]: any;
}

/**
* 增强型SQL分析器类
*/
export class EnhancedSQLAnalyzer {
  private options: {
    enableCaching: boolean;
    enableKnowledgeBase: boolean;
    maxConcurrency: number;
  };

  private llmService: any;
  private knowledgeBase: any;
  private toolFactory: any;
  private contextManager: any;
  private promptBuilder: any;
  private stats: {
    totalAnalyses: number;
    successfulAnalyses: number;
    errors: number;
    totalDuration: number;
    cacheHits: number;
  };

constructor(options = {}) {
this.options = {
enableCaching: true,
enableKnowledgeBase: true,
maxConcurrency: 3,
...options
};

// 初始化核心服务
this.llmService = getLLMService();
this.knowledgeBase = null;

// 初始化统计信息
this.stats = {
  totalAnalyses: 0,
  successfulAnalyses: 0,
  errors: 0,
  totalDuration: 0,
  cacheHits: 0
};

// 初始化工具工厂
this.toolFactory = new ToolFactory(
this.llmService,
null, // 延迟初始化知识库
{
enableCaching: this.options.enableCaching
}
);

// 分析统计
this.stats = {
totalAnalyses: 0,
successfulAnalyses: 0,
totalDuration: 0,
cacheHits: 0,
errors: 0
};

// 异步初始化知识库
this.initKnowledgeBase();
}

/**
* 初始化知识库
*/
async initKnowledgeBase() {
try {
if (this.options.enableKnowledgeBase && config.get('knowledge.enabled')) {
// 这里应该初始化知识库实例
// this.knowledgeBase = await createKnowledgeBase();
}
} catch (error) {
logError('知识库初始化失败', error);
}
}

/**
* 分析单条SQL（增强版）
* @param {string} sql - SQL语句
* @param {Object} options - 分析选项
* @returns {Promise<Object>} 分析结果
*/
async analyzeSQL(sql: string, options: AnalysisOptions = {}) {
const startTime = Date.now();
this.stats.totalAnalyses++;

try {
// 验证输入
if (!sql || typeof sql !== 'string') {
throw new Error('无效的SQL语句');
}

// 解析分析选项
const analysisTypes = this.parseAnalysisTypes(options);
const databaseType = options.databaseType || 'auto-detected';

// 根据优先级排序分析类型
const sortedTypes = sortToolsByPriority(analysisTypes);

// 并行执行分析
const analysisResults = await this.executeParallelAnalysis(
sql,
databaseType,
sortedTypes,
options
);

// 合并分析结果
const mergedResult = this.mergeAnalysisResults(analysisResults, {
sql,
databaseType,
analysisTypes: sortedTypes,
options
});

// 更新统计
const duration = Date.now() - startTime;
this.stats.successfulAnalyses++;
this.stats.totalDuration += duration;

return {
...mergedResult,
metadata: {
duration,
analysisTypes: sortedTypes,
databaseType,
analyzerVersion: '2.0.0',
timestamp: new Date().toISOString()
}
};

} catch (error) {
this.stats.errors++;
return this.handleAnalysisError(error, sql, options);
}
}

/**
* 批量分析SQL
* @param {Array<string>} sqls - SQL语句数组
* @param {Object} options - 分析选项
* @returns {Promise<Array>} 分析结果数组
*/
async analyzeBatch(sqls: string[], options: BatchAnalysisOptions = {}) {
if (!Array.isArray(sqls)) {
throw new Error('批量分析需要SQL数组');
}

const batchSize = options.batchSize || 5;
const results = [];

// 分批处理
for (let i = 0; i < sqls.length; i += batchSize) {
const batch = sqls.slice(i, i + batchSize);
const batchPromises = batch.map(sql => this.analyzeSQL(sql, options));

try {
const batchResults = await Promise.allSettled(batchPromises);
batchResults.forEach((result, index) => {
if (result.status === 'fulfilled') {
results.push(result.value);
} else {
results.push({
success: false,
error: result.reason.message,
sql: batch[index]
});
}
});
} catch (error) {
logError('批量分析失败', error);
// 继续处理下一批
}
}

return results;
}

/**
* 解析分析类型
* @param {Object} options - 分析选项
* @returns {Array<string>} 分析类型数组
*/
parseAnalysisTypes(options) {
const defaultTypes = ['performance', 'security', 'standards'];

if (options.analysisTypes && Array.isArray(options.analysisTypes)) {
return options.analysisTypes.filter(type =>
['performance', 'security', 'standards'].includes(type)
);
}

// 根据布尔选项确定分析类型
const types = [];
if (options.performance !== false) types.push('performance');
if (options.security !== false) types.push('security');
if (options.standards !== false) types.push('standards');

return types.length > 0 ? types : defaultTypes;
}

/**
* 并行执行分析
* @param {string} sql - SQL语句
* @param {string} databaseType - 数据库类型
* @param {Array<string>} analysisTypes - 分析类型
* @param {Object} options - 分析选项
* @returns {Promise<Array>} 分析结果数组
*/
async executeParallelAnalysis(sql, databaseType, analysisTypes, options) {
const context = {
sql,
databaseType,
options: {
...options,
enableKnowledgeBase: this.options.enableKnowledgeBase && !!this.knowledgeBase
}
};

// 创建分析任务
const analysisTasks = analysisTypes.map(type =>
this.executeSingleAnalysis(type, context)
);

// 控制并发数
const results = [];
for (let i = 0; i < analysisTasks.length; i += this.options.maxConcurrency) {
const batch = analysisTasks.slice(i, i + this.options.maxConcurrency);
const batchResults = await Promise.allSettled(batch);

batchResults.forEach((result, index) => {
const globalIndex = i + index;
if (result.status === 'fulfilled') {
results[globalIndex] = result.value;
} else {
results[globalIndex] = {
success: false,
error: result.reason.message,
analysisType: analysisTypes[globalIndex],
tool: analysisTypes[globalIndex]
};
}
});
}

return results;
}

/**
* 执行单个分析
* @param {string} analysisType - 分析类型
* @param {Object} context - 分析上下文
* @returns {Promise<Object>} 分析结果
*/
async executeSingleAnalysis(analysisType, context) {
try {
// 获取工具实例
const tool = this.toolFactory.getTool(analysisType, {
temperature: context.options.temperature,
maxTokens: context.options.maxTokens
});

// 执行分析
const result = await tool.execute(context);

// 检查缓存命中
if (result.enhancedContext?.metadata?.cached) {
this.stats.cacheHits++;
}

return result;

} catch (error) {
logError(`${analysisType}分析失败`, error);
return {
success: false,
error: error.message,
analysisType,
tool: analysisType
};
}
}

/**
* 合并分析结果
* @param {Array} results - 分析结果数组
* @param {Object} metadata - 元数据
* @returns {Object} 合并后的结果
*/
mergeAnalysisResults(results, metadata) {
const merged = {
success: true,
summary: '',
issues: [],
recommendations: [],
performance: {},
security: {},
standards: {},
tools: [],
overallScore: 0,
confidence: 0,
metadata
};

let totalScore = 0;
let totalConfidence = 0;
let validResults = 0;

results.forEach(result => {
if (!result.success) {
merged.success = false;
return;
}

merged.tools.push({
name: result.tool,
analysisType: result.analysisType,
success: result.success,
duration: result.duration
});

// 合并解析内容
if (result.parsedContent) {
const content = result.parsedContent;

// 合并问题
if (Array.isArray(content.issues)) {
merged.issues.push(...content.issues.map(issue => ({
...issue,
source: result.tool
})));
}

// 合并建议
if (Array.isArray(content.recommendations)) {
merged.recommendations.push(...content.recommendations.map(rec => ({
...rec,
source: result.tool
})));
}

// 按类型分组结果
if (result.analysisType) {
merged[result.analysisType] = content;
}

// 累积分数
if (typeof content.overallScore === 'number') {
totalScore += content.overallScore;
}
if (typeof content.confidence === 'number') {
totalConfidence += content.confidence;
}

validResults++;
}
});

// 计算平均分数
if (validResults > 0) {
merged.overallScore = Math.round(totalScore / validResults);
merged.confidence = Math.round((totalConfidence / validResults) * 100) / 100;
}

// 生成总结
merged.summary = this.generateSummary(merged, metadata);

return merged;
}

/**
* 生成分析总结
* @param {Object} merged - 合并结果
* @param {Object} metadata - 元数据
* @returns {string} 总结文本
*/
generateSummary(merged, metadata) {
const parts = [];

// 基础信息
parts.push(`SQL分析完成，共执行了${merged.tools.length}项检查。`);

// 问题统计
const issueCount = merged.issues.length;
const criticalIssues = merged.issues.filter(issue =>
issue.severity === 'critical' || issue.severity === 'high'
).length;

if (issueCount > 0) {
parts.push(`发现${issueCount}个问题，其中${criticalIssues}个需要优先处理。`);
} else {
parts.push('未发现明显问题。');
}

// 建议统计
if (merged.recommendations.length > 0) {
parts.push(`提供了${merged.recommendations.length}条优化建议。`);
}

// 总体评分
if (merged.overallScore > 0) {
let scoreLevel = '良好';
if (merged.overallScore >= 90) scoreLevel = '优秀';
else if (merged.overallScore >= 80) scoreLevel = '良好';
else if (merged.overallScore >= 60) scoreLevel = '一般';
else scoreLevel = '需要改进';

parts.push(`总体评分：${merged.overallScore}分（${scoreLevel}）`);
}

return parts.join(' ');
}

/**
* 处理分析错误
* @param {Error} error - 错误对象
* @param {string} sql - SQL语句
* @param {Object} options - 分析选项
* @returns {Object} 错误结果
*/
handleAnalysisError(error, sql, options) {
logError('SQL分析失败', error);

return {
success: false,
error: error.message,
summary: '分析过程中发生错误',
issues: [],
recommendations: [],
performance: {},
security: {},
standards: {},
tools: [],
overallScore: 0,
confidence: 0,
metadata: {
sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
databaseType: options.databaseType || 'unknown',
analysisTypes: this.parseAnalysisTypes(options),
error: {
message: error.message,
stack: error.stack
},
timestamp: new Date().toISOString()
}
};
}

/**
* 获取分析统计信息
* @returns {Object} 统计信息
*/
getStats() {
return {
...this.stats,
averageDuration: this.stats.totalAnalyses > 0 ?
Math.round(this.stats.totalDuration / this.stats.totalAnalyses) : 0,
successRate: this.stats.totalAnalyses > 0 ?
(this.stats.successfulAnalyses / this.stats.totalAnalyses * 100).toFixed(2) + '%' : '0%',
cacheHitRate: this.stats.totalAnalyses > 0 ?
(this.stats.cacheHits / this.stats.totalAnalyses * 100).toFixed(2) + '%' : '0%',
toolStats: this.toolFactory.getCacheStats()
};
}

/**
* 重置统计信息
*/
resetStats() {
this.stats = {
totalAnalyses: 0,
successfulAnalyses: 0,
totalDuration: 0,
cacheHits: 0,
errors: 0
};
}

/**
* 清理缓存
*/
cleanup() {
this.toolFactory.clearCache();
}
}

/**
* 创建增强型SQL分析器
* @param {Object} options - 配置选项
* @returns {EnhancedSQLAnalyzer} 分析器实例
*/
export function createEnhancedSQLAnalyzer(options = {}) {
return new EnhancedSQLAnalyzer(options);
}

export default EnhancedSQLAnalyzer;