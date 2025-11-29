/**
* 规则质量评估器
* 基于现有提示词体系评估生成的规则质量
*/

import { buildPrompt } from '../../utils/format/prompt-loader.js';
import { llmJsonParser } from '../../core/llm-json-parser.js';
import { RuleValidator } from './rule-validator.js';

/**
* 规则质量评估器类
*/
export class QualityEvaluator {
private llmService: any;
private evaluationCache: Map<string, any>;
private validator: any;

constructor(llmService) {
this.llmService = llmService;
this.evaluationCache = new Map();
this.validator = new RuleValidator();
}

/**
* 批量评估规则质量
* @param {Array} rules - 规则数组
* @param {Object} context - 学习上下文
* @returns {Promise<Array>} 评估后的规则数组
*/
async evaluateBatch(rules, context) {
try {


const evaluatedRules = [];

for (const rule of rules) {
try {
const evaluation = await this.evaluateRule(rule, context);
evaluatedRules.push({
...rule,
evaluation
});
} catch (error) {
console.warn(`[QualityEvaluator] 规则评估失败: ${error.message}`);
// 添加默认评估
evaluatedRules.push({
...rule,
evaluation: {
qualityScore: 50,
qualityLevel: 'fair',
shouldKeep: false,
error: error.message
}
});
}
}


return evaluatedRules;

} catch (error) {
console.error(`[QualityEvaluator] 批量评估失败: ${error.message}`);
return rules.map(rule => ({
...rule,
evaluation: {
qualityScore: 0,
qualityLevel: 'poor',
shouldKeep: false,
error: error.message
}
}));
}
}

/**
* 评估单个规则质量
* @param {Object} rule - 规则对象
* @param {Object} context - 学习上下文
* @returns {Promise<Object>} 评估结果
*/
async evaluateRule(rule, context) {
try {
// 1. 检查缓存
const cacheKey = this.generateCacheKey(rule);
if (this.evaluationCache.has(cacheKey)) {
return this.evaluationCache.get(cacheKey);
}

// 2. 基础验证 - 使用统一验证器
const basicValidation = this.validator.performBasicValidation(rule);
if (!basicValidation.passed) {
const result = {
qualityScore: basicValidation.score,
qualityLevel: 'poor',
shouldKeep: false,
issues: basicValidation.issues,
evaluationSummary: '基础验证失败'
};
this.evaluationCache.set(cacheKey, result);
return result;
}

// 3. 使用LLM进行深度评估
const llmEvaluation = await this.performLLMEvaluation(rule, context);

// 4. 综合评估
const finalEvaluation = this.combineEvaluations(basicValidation, llmEvaluation);

// 5. 缓存结果
this.evaluationCache.set(cacheKey, finalEvaluation);

return finalEvaluation;

} catch (error) {
console.error(`[QualityEvaluator] 规则评估失败: ${error.message}`);
return {
qualityScore: 0,
qualityLevel: 'poor',
shouldKeep: false,
error: error.message,
evaluationSummary: '评估过程出错'
};
}
}


/**
* 执行LLM评估
* @param {Object} rule - 规则对象
* @param {Object} context - 学习上下文
* @returns {Promise<Object>} LLM评估结果
*/
async performLLMEvaluation(rule, context) {
try {
// 1. 构建规则文件内容
const ruleFileContent = this.buildRuleFileContent(rule, context);

// 2. 准备评估变量
const variables = {
filePath: `generated-rule-${Date.now()}.md`,
fileContent: ruleFileContent
};

// 3. 构建提示词
const { systemPrompt, userPrompt } = await buildPrompt('rule-evaluation.md', variables, { category: 'rule-learning' });

// 4. 调用LLM
const llmResult = await this.llmService.generateResponse({
systemPrompt,
userPrompt
});

// 5. 解析结果
const evaluation = this.parseEvaluationResult(llmResult.content);

return evaluation;

} catch (error) {
console.error(`[QualityEvaluator] LLM评估失败: ${error.message}`);
return {
qualityScore: 50,
qualityLevel: 'fair',
shouldKeep: false,
error: error.message,
dimensionScores: {
accuracy: 50,
completeness: 50,
practicality: 50,
generality: 50,
consistency: 50
}
};
}
}

/**
* 构建规则文件内容
* @param {Object} rule - 规则对象
* @param {Object} context - 学习上下文
* @returns {string} 规则文件内容
*/
buildRuleFileContent(rule, context) {
const content = `# ${rule.title}

**生成时间**: ${new Date().toISOString()}
**数据库类型**: ${context.databaseType}
**规则类别**: ${rule.category}

## 原始SQL查询

\`\`\`sql
${context.sql}
\`\`\`

## 学习到的规则

### 规则信息

- **类别**: ${rule.category}
- **类型**: ${rule.type}
- **标题**: ${rule.title}
- **描述**: ${rule.description}
- **触发条件**: ${rule.condition}
- **严重程度**: ${rule.severity}
- **置信度**: ${rule.confidence}

### 示例代码

\`\`\`sql
${rule.example}
\`\`\`

## 分析上下文

### 原始分析结果

${this.formatAnalysisContext(context.currentAnalysis)}

### 识别的模式

${this.formatPatterns(context.patterns)}

---

*此规则由智能规则学习器自动生成*
`;

return content;
}

/**
* 格式化分析上下文
* @param {Object} analysisResult - 分析结果
* @returns {string} 格式化内容
*/
formatAnalysisContext(analysisResult) {
const sections = [];

if (analysisResult.data?.performance?.data) {
sections.push('#### 性能分析');
sections.push(`**摘要**: ${analysisResult.data.performance.data.summary || '无'}`);

if (analysisResult.data.performance.data.issues?.length > 0) {
sections.push('**问题**:');
analysisResult.data.performance.data.issues.forEach(issue => {
sections.push(`- ${issue.type}: ${issue.description}`);
});
}
sections.push('');
}

if (analysisResult.data?.security?.data) {
sections.push('#### 安全分析');
sections.push(`**摘要**: ${analysisResult.data.security.data.summary || '无'}`);

if (analysisResult.data.security.data.vulnerabilities?.length > 0) {
sections.push('**漏洞**:');
analysisResult.data.security.data.vulnerabilities.forEach(vuln => {
sections.push(`- ${vuln.type}: ${vuln.description}`);
});
}
sections.push('');
}

if (analysisResult.data?.standards?.data) {
sections.push('#### 规范分析');
sections.push(`**摘要**: ${analysisResult.data.standards.data.summary || '无'}`);

if (analysisResult.data.standards.data.violations?.length > 0) {
sections.push('**违规**:');
analysisResult.data.standards.data.violations.forEach(violation => {
sections.push(`- ${violation.type}: ${violation.description}`);
});
}
sections.push('');
}

return sections.join('\n') || '无分析数据';
}

/**
* 格式化模式
* @param {Object} patterns - 模式对象
* @returns {string} 格式化内容
*/
formatPatterns(patterns) {
const sections = [];

Object.entries(patterns).forEach(([category, patternList]) => {
const patterns = patternList as any[];
if (patterns && patterns.length > 0) {
sections.push(`#### ${category.toUpperCase()} 模式`);
patterns.forEach(pattern => {
sections.push(`- **${pattern.type}**: ${pattern.description}`);
});
sections.push('');
}
});

return sections.join('\n') || '未识别到特定模式';
}

/**
* 解析评估结果
* @param {string} content - LLM响应内容
* @returns {Object} 解析结果
*/
parseEvaluationResult(content) {
try {
// 使用best-effort-json-parser解析评估结果
const parseResult = llmJsonParser.parse(content, 'standards');

if (parseResult.success) {
return parseResult.data;
}

// 如果无法解析，返回默认评估
console.warn(`[QualityEvaluator] 无法解析评估结果: ${content.substring(0, 100)}...`);
return {
qualityScore: 60,
qualityLevel: 'fair',
shouldKeep: true,
evaluationSummary: '无法解析详细评估结果，使用默认评分',
strategy: parseResult.strategy
};

} catch (error) {
console.error(`[QualityEvaluator] 评估结果解析失败: ${error.message}`);
return {
qualityScore: 50,
qualityLevel: 'fair',
shouldKeep: false,
error: error.message,
evaluationSummary: '评估结果解析失败'
};
}
}

/**
* 综合评估结果
* @param {Object} basicValidation - 基础验证结果
* @param {Object} llmEvaluation - LLM评估结果
* @returns {Object} 综合评估结果
*/
combineEvaluations(basicValidation, llmEvaluation) {
try {
// 权重分配：基础验证30%，LLM评估70%
const basicWeight = 0.3;
const llmWeight = 0.7;

const combinedScore = Math.round(
basicValidation.basicScore * basicWeight +
(llmEvaluation.qualityScore || 50) * llmWeight
);

// 确定质量等级
let qualityLevel;
if (combinedScore >= 90) {
qualityLevel = 'excellent';
} else if (combinedScore >= 70) {
qualityLevel = 'good';
} else if (combinedScore >= 50) {
qualityLevel = 'fair';
} else {
qualityLevel = 'poor';
}

// 确定是否保留
const shouldKeep = combinedScore >= 60 &&
(llmEvaluation.shouldKeep !== false) &&
basicValidation.issues.length < 3;

return {
qualityScore: combinedScore,
qualityLevel,
shouldKeep,
basicValidation: {
score: basicValidation.basicScore,
issues: basicValidation.issues
},
llmEvaluation: {
score: llmEvaluation.qualityScore,
dimensionScores: llmEvaluation.dimensionScores,
strengths: llmEvaluation.strengths || [],
issues: llmEvaluation.issues || []
},
evaluationSummary: this.generateEvaluationSummary(combinedScore, basicValidation, llmEvaluation)
};

} catch (error) {
console.error(`[QualityEvaluator] 综合评估失败: ${error.message}`);
return {
qualityScore: 0,
qualityLevel: 'poor',
shouldKeep: false,
error: error.message,
evaluationSummary: '综合评估过程出错'
};
}
}

/**
* 生成评估摘要
* @param {number} combinedScore - 综合分数
* @param {Object} basicValidation - 基础验证
* @param {Object} llmEvaluation - LLM评估
* @returns {string} 评估摘要
*/
generateEvaluationSummary(combinedScore, basicValidation, llmEvaluation) {
const parts = [];

parts.push(`综合评分: ${combinedScore}`);

if (basicValidation.issues.length > 0) {
parts.push(`基础问题: ${basicValidation.issues.length}个`);
}

if (llmEvaluation.strengths?.length > 0) {
parts.push(`优势: ${llmEvaluation.strengths.length}个`);
}

if (llmEvaluation.issues?.length > 0) {
parts.push(`改进点: ${llmEvaluation.issues.length}个`);
}

return parts.join(', ');
}

/**
* 生成缓存键
* @param {Object} rule - 规则对象
* @returns {string} 缓存键
*/
generateCacheKey(rule) {
const key = `${rule.title}-${rule.type}-${rule.category}-${rule.description?.substring(0, 50) || ''}`;
return Buffer.from(key).toString('base64');
}

/**
* 清理缓存
*/
clearCache() {
this.evaluationCache.clear();

}

/**
* 获取缓存统计
* @returns {Object} 缓存统计信息
*/
getCacheStats() {
return {
size: this.evaluationCache.size,
keys: Array.from(this.evaluationCache.keys())
};
}

/**
* 批量质量报告
* @param {Array} evaluatedRules - 已评估的规则数组
* @returns {Object} 质量报告
*/
generateQualityReport(evaluatedRules) {
try {
const report = {
total: evaluatedRules.length,
qualityDistribution: {
excellent: 0,
good: 0,
fair: 0,
poor: 0
},
averageScore: 0,
shouldKeepCount: 0,
commonIssues: {},
categoryStats: {}
};

let totalScore = 0;

evaluatedRules.forEach(rule => {
const evaluation = rule.evaluation;

// 质量分布
report.qualityDistribution[evaluation.qualityLevel]++;

// 平均分数
totalScore += evaluation.qualityScore;

// 保留数量
if (evaluation.shouldKeep) {
report.shouldKeepCount++;
}

// 常见问题
if (evaluation.basicValidation?.issues) {
evaluation.basicValidation.issues.forEach(issue => {
report.commonIssues[issue] = (report.commonIssues[issue] || 0) + 1;
});
}

// 类别统计
const category = rule.category;
if (!report.categoryStats[category]) {
report.categoryStats[category] = {
count: 0,
totalScore: 0,
keepCount: 0
};
}
report.categoryStats[category].count++;
report.categoryStats[category].totalScore += evaluation.qualityScore;
if (evaluation.shouldKeep) {
report.categoryStats[category].keepCount++;
}
});

report.averageScore = evaluatedRules.length > 0 ? Math.round(totalScore / evaluatedRules.length) : 0;

// 计算各类别平均分
Object.keys(report.categoryStats).forEach(category => {
const stats = report.categoryStats[category];
stats.averageScore = Math.round(stats.totalScore / stats.count);
stats.keepRate = Math.round((stats.keepCount / stats.count) * 100);
});

return report;

} catch (error) {
console.error(`[QualityEvaluator] 质量报告生成失败: ${error.message}`);
return null;
}
}
}

export default QualityEvaluator;
