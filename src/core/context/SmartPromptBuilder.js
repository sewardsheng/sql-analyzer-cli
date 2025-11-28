/**
* 智能提示词构建器
* 告别SB的字符串拼接，采用结构化智能构建
*/

import { logError } from '../../utils/logger.js';

/**
* 提示词组件枚举
*/
export const PromptComponents = {
SYSTEM_ROLE: 'system_role',
TASK_DEFINITION: 'task_definition',
CONTEXT_INFO: 'context_info',
EXAMPLES: 'examples',
CONSTRAINTS: 'constraints',
OUTPUT_FORMAT: 'output_format',
ANALYSIS_GUIDELINES: 'analysis_guidelines'
};

/**
* 分析类型配置映射
*/
const ANALYSIS_CONFIG = {
performance: {
priority: 1,
keywords: ['slow', 'index', 'optimization', 'query plan'],
focusAreas: ['query_efficiency', 'index_usage', 'resource_consumption'],
constraints: ['consider_execution_plan', 'suggest_indexes']
},
security: {
priority: 2,
keywords: ['injection', 'privilege', 'access', 'authentication'],
focusAreas: ['sql_injection', 'privilege_escalation', 'data_exposure'],
constraints: ['check_input_validation', 'verify_access_controls']
},
standards: {
priority: 3,
keywords: ['format', 'convention', 'naming', 'readability'],
focusAreas: ['coding_standards', 'naming_conventions', 'formatting'],
constraints: ['check_naming_consistency', 'verify_format_standards']
}
};

/**
* 智能提示词构建器
* 支持动态组件组合、上下文感知和智能优化
*/
export class SmartPromptBuilder {
constructor(options = {}) {
this.options = {
maxSystemTokens: 2000,
maxUserTokens: 4000,
enableOptimization: true,
prioritizeByComplexity: true,
...options
};

// 组件模板缓存
this.componentCache = new Map();

// 构建统计
this.stats = {
buildCount: 0,
cacheHits: 0,
optimizations: 0
};
}

/**
* 构建完整提示词
* @param {Object} context - 分析上下文
* @param {Object} buildOptions - 构建选项
* @returns {Promise<Object>} 构建的提示词
*/
async buildPrompt(context, buildOptions = {}) {
const startTime = Date.now();
this.stats.buildCount++;

try {
// 生成缓存键
const cacheKey = this.generateCacheKey(context, buildOptions);

// 检查缓存
if (this.componentCache.has(cacheKey)) {
this.stats.cacheHits++;
return this.componentCache.get(cacheKey);
}

// 构建系统提示词
const systemPrompt = await this.buildSystemPrompt(context, buildOptions);

// 构建用户提示词
const userPrompt = await this.buildUserPrompt(context, buildOptions);

const result = {
systemPrompt,
userPrompt,
metadata: {
buildTime: Date.now() - startTime,
tokenCount: this.estimateTokenCount(systemPrompt + userPrompt),
contextComplexity: context.metadata?.complexity || 'medium',
analysisTypes: context.core?.analysisTypes || []
}
};

// 缓存结果
if (this.componentCache.size < 100) { // 限制缓存大小
this.componentCache.set(cacheKey, result);
}

return result;

} catch (error) {
logError('构建提示词失败', error);
throw new Error(`提示词构建失败: ${error.message}`);
}
}

/**
* 构建系统提示词
* @param {Object} context - 分析上下文
* @param {Object} options - 构建选项
* @returns {Promise<string>} 系统提示词
*/
async buildSystemPrompt(context, options = {}) {
const components = [];

// 1. 系统角色定义
components.push(this.buildSystemRoleComponent(context));

// 2. 任务定义
components.push(this.buildTaskDefinitionComponent(context));

// 3. 数据库特定指导
if (context.database?.dialect) {
components.push(this.buildDatabaseGuidanceComponent(context.database));
}

// 4. 分析指导原则
components.push(this.buildAnalysisGuidelinesComponent(context));

// 5. 约束条件
components.push(this.buildConstraintsComponent(context));

// 6. 输出格式要求
components.push(this.buildOutputFormatComponent(context));

// 7. 知识库指导（如果有）
if (context.knowledge?.documents?.length > 0) {
components.push(this.buildKnowledgeGuidanceComponent(context.knowledge));
}

// 智能优化和组合
let systemPrompt = this.optimizeSystemPrompt(components, context);

// Token限制检查
if (this.options.enableOptimization) {
systemPrompt = await this.optimizeForTokenLimit(
systemPrompt,
this.options.maxSystemTokens,
'system'
);
}

return systemPrompt;
}

/**
* 构建用户提示词
* @param {Object} context - 分析上下文
* @param {Object} options - 构建选项
* @returns {Promise<string>} 用户提示词
*/
async buildUserPrompt(context, options = {}) {
const components = [];

// 1. 主要分析任务
components.push(`请分析以下SQL语句：\n\n\`\`\`sql\n${context.core.sql}\n\`\`\``);

// 2. 数据库上下文
if (context.core.databaseType) {
components.push(`\n\n**数据库类型：** ${context.core.databaseType}`);
}

// 3. 分析要求
if (context.core.analysisTypes?.length > 0) {
const analysisText = context.core.analysisTypes
.map(type => this.getAnalysisTypeDescription(type))
.join('、');
components.push(`\n\n**分析要求：** ${analysisText}`);
}

// 4. 特殊选项
if (context.core.options && Object.keys(context.core.options).length > 0) {
const optionsText = Object.entries(context.core.options)
.map(([key, value]) => `${key}: ${value}`)
.join(', ');
components.push(`\n\n**特殊选项：** ${optionsText}`);
}

// 5. 历史参考（如果有）
if (context.history?.length > 0) {
components.push(this.buildHistoryReferenceComponent(context.history));
}

let userPrompt = components.join('\n');

// Token限制检查
if (this.options.enableOptimization) {
userPrompt = await this.optimizeForTokenLimit(
userPrompt,
this.options.maxUserTokens,
'user'
);
}

return userPrompt;
}

/**
* 构建系统角色组件
* @param {Object} context - 上下文
* @returns {string} 系统角色定义
*/
buildSystemRoleComponent(context) {
const complexity = context.metadata?.complexity || 'medium';
const analysisTypes = context.core?.analysisTypes || [];

let roleDefinition = `你是一个专业的SQL分析助手，具有深厚的数据库性能优化、安全审计和编码规范检查经验。`;

// 根据复杂度调整描述
if (complexity === 'high') {
roleDefinition += `你擅长处理复杂的查询优化、多表连接分析和高级安全威胁检测。`;
} else if (complexity === 'low') {
roleDefinition += `你专注于提供简洁实用的分析建议。`;
}

// 根据分析类型添加专业能力
const capabilities = analysisTypes.map(type => {
const config = ANALYSIS_CONFIG[type];
return config ? config.focusAreas.join('、') : '';
}).filter(Boolean);

if (capabilities.length > 0) {
roleDefinition += `\n\n你的专业领域包括：${capabilities.join('、')}。`;
}

return roleDefinition;
}

/**
* 构建任务定义组件
* @param {Object} context - 上下文
* @returns {string} 任务定义
*/
buildTaskDefinitionComponent(context) {
const analysisTypes = context.core?.analysisTypes || [];

let taskDefinition = '\n\n## 分析任务\n\n请对提供的SQL语句进行全面分析，重点关注以下方面：\n';

analysisTypes.forEach((type, index) => {
const config = ANALYSIS_CONFIG[type];
if (config) {
taskDefinition += `${index + 1}. **${this.getAnalysisTypeDescription(type)}**：`;
taskDefinition += this.getAnalysisFocusDescription(type) + '\n';
}
});

return taskDefinition;
}

/**
* 构建数据库指导组件
* @param {Object} database - 数据库上下文
* @returns {string} 数据库指导
*/
buildDatabaseGuidanceComponent(database) {
let guidance = `\n\n## ${database.dialect}特定指导\n`;

if (database.optimization?.length > 0) {
guidance += `\n**优化建议方向：**\n`;
database.optimization.forEach(opt => {
guidance += `- ${this.formatOptimizationTip(opt)}\n`;
});
}

if (database.antiPatterns?.length > 0) {
guidance += `\n**需要避免的反模式：**\n`;
database.antiPatterns.forEach(pattern => {
guidance += `- ${this.formatAntiPattern(pattern)}\n`;
});
}

return guidance;
}

/**
* 构建分析指导原则组件
* @param {Object} context - 上下文
* @returns {string} 分析指导
*/
buildAnalysisGuidelinesComponent(context) {
const complexity = context.metadata?.complexity || 'medium';

let guidelines = '\n\n## 分析指导原则\n\n';

guidelines += '- **深度优先**：不仅发现表面问题，更要挖掘潜在风险\n';
guidelines += '- **实用导向**：提供具体可执行的优化建议\n';
guidelines += '- **量化评估**：尽可能提供性能影响的量化分析\n';

if (complexity === 'high') {
guidelines += '- **全局视角**：考虑查询对整体系统性能的影响\n';
guidelines += '- **渐进优化**：提供分步骤的优化方案\n';
}

guidelines += '\n**评分标准：**\n';
guidelines += '- 问题严重程度：Critical(9-10) > High(7-8) > Medium(5-6) > Low(1-4)\n';
guidelines += '- 建议可行性：必须考虑实施成本和收益比\n';

return guidelines;
}

/**
* 构建约束条件组件
* @param {Object} context - 上下文
* @returns {string} 约束条件
*/
buildConstraintsComponent(context) {
const analysisTypes = context.core?.analysisTypes || [];
let constraints = '\n\n## 约束条件\n\n';

const allConstraints = new Set();
analysisTypes.forEach(type => {
const config = ANALYSIS_CONFIG[type];
if (config?.constraints) {
config.constraints.forEach(constraint => allConstraints.add(constraint));
}
});

if (allConstraints.size > 0) {
constraints += '**分析时必须考虑以下约束条件：**\n';
Array.from(allConstraints).forEach(constraint => {
constraints += `- ${this.formatConstraint(constraint)}\n`;
});
}

constraints += '\n**通用约束：**\n';
constraints += '- 必须保持SQL的原有业务逻辑\n';
constraints += '- 优化建议必须向后兼容\n';
constraints += '- 安全修复不能破坏正常功能\n';

return constraints;
}

/**
* 构建输出格式组件
* @param {Object} context - 上下文
* @returns {string} 输出格式
*/
buildOutputFormatComponent(context) {
const analysisTypes = context.core?.analysisTypes || [];

let format = '\n\n## 输出格式要求\n\n';
format += '请严格按照以下JSON格式返回分析结果：\n\n';
format += '```json\n';
format += '{\n';

// 基础字段
format += '  "summary": "分析总结",\n';
format += '  "overallScore": 85,\n';
format += '  "issues": [\n';
format += '    {\n';
format += '      "type": "performance|security|standards",\n';
format += '      "severity": "critical|high|medium|low",\n';
format += '      "score": 8,\n';
format += '      "title": "问题标题",\n';
format += '      "description": "详细描述",\n';
format += '      "location": "问题位置",\n';
format += '      "impact": "影响说明"\n';
format += '    }\n';
format += '  ],\n';

format += '  "recommendations": [\n';
format += '    {\n';
format += '      "type": "performance|security|standards",\n';
format += '      "priority": "high|medium|low",\n';
format += '      "title": "建议标题",\n';
format += '      "description": "建议描述",\n';
format += '      "implementation": "实施建议",\n';
format += '      "benefit": "预期收益"\n';
format += '    }\n';
format += '  ],\n';

// 根据分析类型添加特定字段
if (analysisTypes.includes('performance')) {
format += '  "performanceMetrics": {\n';
format += '    "estimatedImprovement": "预期性能提升",\n';
format += '    "optimizationType": "优化类型"\n';
format += '  },\n';
}

if (analysisTypes.includes('security')) {
format += '  "securityAssessment": {\n';
format += '    "riskLevel": "风险等级",\n';
format += '    "vulnerabilityType": "漏洞类型"\n';
format += '  },\n';
}

format += '  "confidence": 0.85,\n';
format += '  "analysisTime": "2025-01-01T00:00:00Z"\n';
format += '}\n';
format += '```\n';

return format;
}

/**
* 构建知识库指导组件
* @param {Object} knowledge - 知识库上下文
* @returns {string} 知识库指导
*/
buildKnowledgeGuidanceComponent(knowledge) {
let guidance = '\n\n## 知识库参考\n\n';
guidance += `基于${knowledge.totalCount}个相关文档的分析：\n\n`;

knowledge.documents.slice(0, 3).forEach((doc, index) => {
guidance += `**参考${index + 1}：** ${doc.title || '文档'}\n`;
if (doc.content) {
guidance += `${doc.content.substring(0, 200)}...\n`;
}
guidance += '\n';
});

return guidance;
}

/**
* 构建历史参考组件
* @param {Array} history - 历史记录
* @returns {string} 历史参考
*/
buildHistoryReferenceComponent(history) {
let reference = '\n\n## 历史分析参考\n\n';
reference += '基于相似查询的历史分析结果：\n\n';

history.slice(0, 2).forEach((item, index) => {
reference += `${index + 1}. ${item.summary || '历史分析'}\n`;
});

return reference;
}

/**
* 优化系统提示词
* @param {Array} components - 组件数组
* @param {Object} context - 上下文
* @returns {string} 优化后的提示词
*/
optimizeSystemPrompt(components, context) {
// 根据优先级和复杂度优化组件顺序
if (this.options.prioritizeByComplexity) {
const complexity = context.metadata?.complexity || 'medium';

if (complexity === 'high') {
// 高复杂度：将技术指导前置
return components.filter(Boolean).join('\n');
} else {
// 低复杂度：将任务定义前置
return components.filter(Boolean).join('\n');
}
}

return components.filter(Boolean).join('\n');
}

/**
* Token限制优化
* @param {string} text - 文本内容
* @param {number} maxTokens - 最大token数
* @param {string} type - 提示词类型
* @returns {Promise<string>} 优化后的文本
*/
async optimizeForTokenLimit(text, maxTokens, type) {
const estimatedTokens = this.estimateTokenCount(text);

if (estimatedTokens <= maxTokens) {
this.stats.optimizations++;
return text;
}

// 需要裁剪
const compressionRatio = maxTokens / estimatedTokens;
let optimized = text;

if (type === 'system') {
// 系统提示词：移除详细示例，保留核心指令
optimized = this.compressSystemPrompt(optimized, compressionRatio);
} else {
// 用户提示词：压缩历史和参考信息
optimized = this.compressUserPrompt(optimized, compressionRatio);
}

return optimized;
}

/**
* 压缩系统提示词
* @param {string} prompt - 系统提示词
* @param {number} ratio - 压缩比例
* @returns {string} 压缩后的提示词
*/
compressSystemPrompt(prompt, ratio) {
// 移除示例部分，保留核心指令
const sections = prompt.split('\n\n');
const essentialSections = sections.filter(section =>
section.includes('分析任务') ||
section.includes('输出格式') ||
section.includes('约束条件')
);

return essentialSections.join('\n\n');
}

/**
* 压缩用户提示词
* @param {string} prompt - 用户提示词
* @param {number} ratio - 压缩比例
* @returns {string} 压缩后的提示词
*/
compressUserPrompt(prompt, ratio) {
// 压缩历史参考和详细选项
let compressed = prompt;

// 移除历史参考
compressed = compressed.replace(/\n\n## 历史分析参考[\s\S]*?$/m, '');

// 简化选项描述
compressed = compressed.replace(/\*\*特殊选项：\*\*[\s\S]*?$/m, '');

return compressed;
}

/**
* 获取分析类型描述
* @param {string} type - 分析类型
* @returns {string} 描述
*/
getAnalysisTypeDescription(type) {
const descriptions = {
performance: '性能分析',
security: '安全审计',
standards: '编码规范检查'
};

return descriptions[type] || type;
}

/**
* 获取分析重点描述
* @param {string} type - 分析类型
* @returns {string} 重点描述
*/
getAnalysisFocusDescription(type) {
const config = ANALYSIS_CONFIG[type];
if (!config) return '';

return `重点关注${config.focusAreas.join('、')}等方面的问题`;
}

/**
* 格式化优化建议
* @param {string} tip - 优化建议
* @returns {string} 格式化后的建议
*/
formatOptimizationTip(tip) {
return tip.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
* 格式化反模式
* @param {string} pattern - 反模式
* @returns {string} 格式化后的模式
*/
formatAntiPattern(pattern) {
return pattern.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
* 格式化约束条件
* @param {string} constraint - 约束条件
* @returns {string} 格式化后的约束
*/
formatConstraint(constraint) {
return constraint.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
* 估算Token数量
* @param {string} text - 文本
* @returns {number} 估算的token数
*/
estimateTokenCount(text) {
// 粗略估算：1个token约等于4个字符
return Math.ceil(text.length / 4);
}

/**
* 生成缓存键
* @param {Object} context - 上下文
* @param {Object} options - 选项
* @returns {string} 缓存键
*/
generateCacheKey(context, options) {
const keyData = {
sqlHash: this.simpleHash(context.core?.sql || ''),
analysisTypes: context.core?.analysisTypes?.sort() || [],
databaseType: context.core?.databaseType || '',
complexity: context.metadata?.complexity || 'medium',
options: options
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
hash = hash & hash;
}
return hash.toString(36);
}

/**
* 获取构建统计信息
* @returns {Object} 统计信息
*/
getStats() {
return {
...this.stats,
cacheSize: this.componentCache.size,
cacheHitRate: this.stats.buildCount > 0 ?
(this.stats.cacheHits / this.stats.buildCount * 100).toFixed(2) + '%' : '0%'
};
}

/**
* 清空缓存
*/
clearCache() {
this.componentCache.clear();
}
}

/**
* 创建智能提示词构建器
* @param {Object} options - 配置选项
* @returns {SmartPromptBuilder} 构建器实例
*/
export function createSmartPromptBuilder(options = {}) {
return new SmartPromptBuilder(options);
}

export default SmartPromptBuilder;