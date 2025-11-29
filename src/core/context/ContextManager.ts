/**
* 上下文管理器 - 统一管理所有提示词模板和上下文信息
* 告别SB的分散式管理，采用集中式智能管理
*/

import fs from 'fs/promises';
import path from 'path';
import { logError } from '../../utils/logger.js';

/**
* 上下文模板缓存
*/
const templateCache = new Map();

/**
* 上下文构建器缓存
*/
const contextCache = new Map();

/**
* 智能上下文管理器
* 采用缓存策略优化性能，支持上下文复用和智能裁剪
*/
export class ContextManager {
  private llmService: any;
  private knowledgeBase: any;
  private cacheConfig: {
    maxTemplateCacheSize: number;
    maxContextCacheSize: number;
    ttl: number;
  };
  private contextRules: {
    maxTokens: number;
    maxContextAge: number;
    includeRecentHistory: boolean;
  };
  private _projectRoot: string;

constructor(llmService, knowledgeBase) {
this.llmService = llmService;
this.knowledgeBase = knowledgeBase;

// 缓存配置
this.cacheConfig = {
maxTemplateCacheSize: 100,
maxContextCacheSize: 50,
ttl: 5 * 60 * 1000, // 5分钟
};

// 上下文构建规则
this.contextRules = {
maxTokens: 8000,
maxContextAge: 24 * 60 * 60 * 1000, // 24小时
includeRecentHistory: true
};

// 初始化缓存清理定时器
this.setupCacheCleanup();
}

/**
* 获取项目根目录
* @returns {string} 项目根目录路径
*/
getProjectRoot() {
if (this._projectRoot) {
return this._projectRoot;
}

let currentDir = process.cwd();
while (currentDir !== path.dirname(currentDir)) {
const packageJsonPath = path.join(currentDir, 'package.json');
try {
fs.access(packageJsonPath);
this._projectRoot = currentDir;
break;
} catch {
currentDir = path.dirname(currentDir);
}
}

return this._projectRoot || process.cwd();
}

/**
* 加载并缓存模板
* @param {string} templateName - 模板名称
* @param {string} category - 模板分类
* @returns {Promise<string>} 模板内容
*/
async loadTemplate(templateName, category = 'tools') {
const cacheKey = `${category}:${templateName}`;

// 检查缓存
const cached = templateCache.get(cacheKey);
if (cached && (Date.now() - cached.timestamp) < this.cacheConfig.ttl) {
return cached.content;
}

try {
const projectRoot = this.getProjectRoot();
const templatePath = path.join(
projectRoot,
'src',
'prompts',
category,
templateName
);

const content = await fs.readFile(templatePath, 'utf8');

// 缓存模板内容
templateCache.set(cacheKey, {
content,
timestamp: Date.now()
});

return content;
} catch (error) {
logError(`加载模板失败: ${templateName}`, error);
throw new Error(`无法加载模板 ${templateName}: ${error.message}`);
}
}

/**
* 构建智能分析上下文
* @param {Object} params - 构建参数
* @returns {Promise<Object>} 构建的上下文
*/
async buildAnalysisContext(params) {
const {
sql,
databaseType,
analysisTypes = ['performance', 'security', 'standards'],
options = {},
cacheKey = null
} = params;

// 生成缓存键
const contextCacheKey = cacheKey || this.generateContextCacheKey(params);

// 检查上下文缓存
const cachedContext = contextCache.get(contextCacheKey);
if (cachedContext && (Date.now() - cachedContext.timestamp) < this.cacheConfig.ttl) {
return cachedContext.context;
}

try {
// 并行构建上下文组件
const [
templates,
knowledgeContext,
databaseContext,
historicalContext
] = await Promise.allSettled([
this.loadAnalysisTemplates(analysisTypes),
this.buildKnowledgeContext(sql, analysisTypes),
this.buildDatabaseContext(databaseType),
this.buildHistoricalContext(sql, options.historyLimit || 5)
]);

// 构建完整上下文
const context = {
// 核心分析信息
core: {
sql,
databaseType: databaseType || 'auto-detected',
analysisTypes,
timestamp: new Date().toISOString(),
options
},

// 模板上下文
templates: templates.status === 'fulfilled' ? templates.value : {},

// 知识库上下文
knowledge: knowledgeContext.status === 'fulfilled' ? knowledgeContext.value : null,

// 数据库特定上下文
database: databaseContext.status === 'fulfilled' ? databaseContext.value : {},

// 历史上下文
history: historicalContext.status === 'fulfilled' ? historicalContext.value : [],

// 上下文元数据
metadata: {
buildTime: Date.now(),
tokenCount: 0, // 将在优化阶段计算
priority: this.calculatePriority(analysisTypes),
complexity: this.estimateComplexity(sql)
}
};

// 智能上下文优化
const optimizedContext = await this.optimizeContext(context);

// 缓存优化后的上下文
contextCache.set(contextCacheKey, {
context: optimizedContext,
timestamp: Date.now()
});

return optimizedContext;

} catch (error) {
logError('构建分析上下文失败', error);
throw new Error(`上下文构建失败: ${error.message}`);
}
}

/**
* 加载分析模板
* @param {Array<string>} analysisTypes - 分析类型
* @returns {Promise<Object>} 模板映射
*/
async loadAnalysisTemplates(analysisTypes) {
const templatePromises = analysisTypes.map(async (type) => {
const templateName = `${type}-analysis.md`;
try {
const content = await this.loadTemplate(templateName, 'tools');
const { systemPrompt, userPrompt } = this.parseTemplate(content);
return { type, systemPrompt, userPrompt };
} catch (error) {
logError(`加载模板失败: ${type}`, error);
return { type, systemPrompt: '', userPrompt: '' };
}
});

const templates = await Promise.all(templatePromises);
return templates.reduce((acc, template) => {
acc[template.type] = {
systemPrompt: template.systemPrompt,
userPrompt: template.userPrompt
};
return acc;
}, {});
}

/**
* 构建知识库上下文
* @param {string} sql - SQL语句
* @param {Array<string>} analysisTypes - 分析类型
* @returns {Promise<Object|null>} 知识库上下文
*/
async buildKnowledgeContext(sql, analysisTypes) {
if (!this.knowledgeBase || analysisTypes.length === 0) {
return null;
}

try {
// 构建智能检索查询
const queries = analysisTypes.map(type =>
this.buildKnowledgeQuery(sql, type)
);

// 并行检索
const results = await Promise.allSettled(
queries.map(query => this.knowledgeBase.retrieve(query, 3))
);

// 合并和去重检索结果
const allDocuments = results
.filter(result => result.status === 'fulfilled')
.flatMap(result => result.value.documents || []);

// 基于相关性排序
const rankedDocuments = this.rankDocumentsByRelevance(
allDocuments,
sql,
analysisTypes
);

return {
query: queries.join('; '),
documents: rankedDocuments.slice(0, 5), // 最多5个相关文档
totalCount: allDocuments.length
};

} catch (error) {
logError('构建知识库上下文失败', error);
return null;
}
}

/**
* 构建数据库特定上下文
* @param {string} databaseType - 数据库类型
* @returns {Promise<Object>} 数据库上下文
*/
async buildDatabaseContext(databaseType) {
// 这里可以加载数据库特定的优化规则、最佳实践等
const contextMap = {
'mysql': {
dialect: 'MySQL',
version: '8.0+',
optimization: ['index_hints', 'query_cache', 'partitioning'],
antiPatterns: ['select_star', 'missing_indexes', 'inefficient_joins']
},
'postgresql': {
dialect: 'PostgreSQL',
version: '14+',
optimization: ['partial_indexes', 'cte_optimization', 'jsonb_queries'],
antiPatterns: ['sequential_scans', 'missing_vacuum', 'inefficient_subqueries']
},
'oracle': {
dialect: 'Oracle',
version: '19c+',
optimization: ['bitmap_indexes', 'materialized_views', 'query_rewrite'],
antiPatterns: ['full_table_scans', 'missing_statistics', 'inefficient_connect_by']
}
};

return contextMap[databaseType?.toLowerCase()] || {
dialect: databaseType || 'Generic SQL',
optimization: [],
antiPatterns: []
};
}

/**
* 构建历史上下文
* @param {string} sql - SQL语句
* @param {number} limit - 历史记录限制
* @returns {Promise<Array>} 历史分析结果
*/
async buildHistoricalContext(sql, limit = 5) {
// 这里可以从历史记录中获取相似SQL的分析结果
// 暂时返回空数组，实际实现需要连接历史服务
return [];
}

/**
* 智能上下文优化
* @param {Object} context - 原始上下文
* @returns {Promise<Object>} 优化后的上下文
*/
async optimizeContext(context) {
let optimized = { ...context };

// 1. Token限制优化
optimized = await this.optimizeForTokenLimit(optimized);

// 2. 优先级排序
optimized = this.optimizeByPriority(optimized);

// 3. 去冗余处理
optimized = this.removeRedundancy(optimized);

// 4. 更新元数据
optimized.metadata.tokenCount = this.estimateTokenCount(optimized);
optimized.metadata.optimized = true;
optimized.metadata.optimizedAt = Date.now();

return optimized;
}

/**
* Token限制优化
* @param {Object} context - 上下文
* @returns {Object} 优化后的上下文
*/
async optimizeForTokenLimit(context) {
const estimatedTokens = this.estimateTokenCount(context);

if (estimatedTokens <= this.contextRules.maxTokens) {
return context;
}

// 需要裁剪上下文
const compressionRatio = this.contextRules.maxTokens / estimatedTokens;
const optimized = { ...context };

// 按优先级裁剪不同部分
if (optimized.knowledge && optimized.knowledge.documents) {
optimized.knowledge.documents =
optimized.knowledge.documents.slice(0, Math.floor(optimized.knowledge.documents.length * compressionRatio));
}

if (optimized.history && optimized.history.length > 0) {
optimized.history =
optimized.history.slice(0, Math.floor(optimized.history.length * compressionRatio));
}

return optimized;
}

/**
* 按优先级优化
* @param {Object} context - 上下文
* @returns {Object} 优化后的上下文
*/
optimizeByPriority(context) {
const optimized = { ...context };

// 对知识库文档按相关性排序
if (optimized.knowledge && optimized.knowledge.documents) {
optimized.knowledge.documents.sort((a, b) =>
(b.relevanceScore || 0) - (a.relevanceScore || 0)
);
}

return optimized;
}

/**
* 去除冗余信息
* @param {Object} context - 上下文
* @returns {Object} 去重后的上下文
*/
removeRedundancy(context) {
// 这里可以实现更复杂的去重逻辑
// 例如：相似的文档只保留最高相关性的
return context;
}

/**
* 估算Token数量
* @param {Object} context - 上下文
* @returns {number} 估算的token数
*/
estimateTokenCount(context) {
const jsonString = JSON.stringify(context, null, 0);
// 粗略估算：4个字符约等于1个token
return Math.ceil(jsonString.length / 4);
}

/**
* 计算优先级
* @param {Array<string>} analysisTypes - 分析类型
* @returns {number} 优先级分数
*/
calculatePriority(analysisTypes) {
const priorityKeywords = ['security', 'performance', 'critical'];
return analysisTypes.reduce((score, type) => {
if (priorityKeywords.includes(type)) {
return score + 10;
}
return score + 5;
}, 0);
}

/**
* 估算SQL复杂度
* @param {string} sql - SQL语句
* @returns {string} 复杂度级别
*/
estimateComplexity(sql) {
if (!sql) return 'low';

const complexityMetrics = {
joins: (sql.match(/join/gi) || []).length,
subqueries: (sql.match(/\bselect\b/gi) || []).length - 1,
functions: (sql.match(/\b(count|sum|avg|max|min|concat)\b/gi) || []).length,
conditions: (sql.match(/\bwhere\b|\bhaving\b/gi) || []).length
};

const totalComplexity = Object.values(complexityMetrics).reduce((a, b) => a + b, 0);

if (totalComplexity >= 8) return 'high';
if (totalComplexity >= 4) return 'medium';
return 'low';
}

/**
* 生成上下文缓存键
* @param {Object} params - 参数
* @returns {string} 缓存键
*/
generateContextCacheKey(params) {
const keyData = {
sqlHash: this.simpleHash(params.sql || ''),
databaseType: params.databaseType || 'unknown',
analysisTypes: params.analysisTypes?.sort() || [],
optionsHash: this.simpleHash(JSON.stringify(params.options || {}))
};

return btoa(JSON.stringify(keyData));
}

/**
* 简单哈希函数
* @param {string} str - 输入字符串
* @returns {string} 哈希值
*/
simpleHash(str) {
let hash = 0;
for (let i = 0; i < str.length; i++) {
const char = str.charCodeAt(i);
hash = ((hash << 5) - hash) + char;
hash = hash & hash; // 转换为32位整数
}
return hash.toString(36);
}

/**
* 构建知识检索查询
* @param {string} sql - SQL语句
* @param {string} analysisType - 分析类型
* @returns {string} 查询字符串
*/
buildKnowledgeQuery(sql, analysisType) {
const keywords = {
'performance': ['slow query', 'optimization', 'index', 'performance'],
'security': ['sql injection', 'security', 'privilege', 'access control'],
'standards': ['best practice', 'coding standard', 'convention', 'format']
};

const typeKeywords = keywords[analysisType] || [];
const queryWords = [sql.substring(0, 100), ...typeKeywords].join(' ');

return queryWords;
}

/**
* 按相关性排序文档
* @param {Array} documents - 文档数组
* @param {string} sql - SQL语句
* @param {Array<string>} analysisTypes - 分析类型
* @returns {Array} 排序后的文档
*/
rankDocumentsByRelevance(documents, sql, analysisTypes) {
// 简单的相关性排序实现
return documents.map(doc => ({
...doc,
relevanceScore: Math.random() // 实际实现应该使用更复杂的算法
})).sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
* 解析模板内容
* @param {string} content - 模板内容
* @returns {Object} 解析结果
*/
parseTemplate(content) {
// 提取系统提示词和用户提示词
const systemMatch = content.match(/^(?:#.*?)\n*([\s\S]*?)(?=\n\n|$)/);
const userMatch = content.match(/\n\n([\s\S]*?)$/);

return {
systemPrompt: systemMatch ? systemMatch[1].trim() : content.trim(),
userPrompt: userMatch ? userMatch[1].trim() : '请分析提供的SQL语句。'
};
}

/**
* 设置缓存清理定时器
*/
setupCacheCleanup() {
// 每5分钟清理一次过期缓存
setInterval(() => {
this.cleanupExpiredCache();
}, 5 * 60 * 1000);
}

/**
* 清理过期缓存
*/
cleanupExpiredCache() {
const now = Date.now();

// 清理模板缓存
for (const [key, value] of templateCache.entries()) {
if (now - value.timestamp > this.cacheConfig.ttl) {
templateCache.delete(key);
}
}

// 清理上下文缓存
for (const [key, value] of contextCache.entries()) {
if (now - value.timestamp > this.cacheConfig.ttl) {
contextCache.delete(key);
}
}
}

/**
* 获取缓存统计信息
* @returns {Object} 缓存统计
*/
getCacheStats() {
return {
templateCache: {
size: templateCache.size,
maxSize: this.cacheConfig.maxTemplateCacheSize
},
contextCache: {
size: contextCache.size,
maxSize: this.cacheConfig.maxContextCacheSize
}
};
}

/**
* 清空所有缓存
*/
clearCache() {
templateCache.clear();
contextCache.clear();
}
}

/**
* 创建上下文管理器实例
* @param {Object} llmService - LLM服务
* @param {Object} knowledgeBase - 知识库实例
* @returns {ContextManager} 上下文管理器实例
*/
export function createContextManager(llmService, knowledgeBase) {
return new ContextManager(llmService, knowledgeBase);
}

export default ContextManager;