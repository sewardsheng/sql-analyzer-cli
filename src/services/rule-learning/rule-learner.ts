/**
* 智能规则学习器核心服务
* 基于历史分析数据和现有提示词体系实现智能规则学习
*/

import fs from 'fs/promises';
import path from 'path';
import { buildPrompt } from '../../utils/format/prompt-loader.js';
import { llmJsonParser } from '../../core/llm-json-parser.js';
import { HistoryAnalyzer } from './history-analyzer.js';
import { RuleGenerator } from './rule-generator.js';
import { QualityEvaluator } from './quality-evaluator.js';
import { AutoApprover } from './auto-approver.js';
import { IntegratedRuleProcessor } from './rule-processor.js';
import { getPerformanceMonitor } from './performance-monitor.js';
import { smartThresholdAdjuster } from './threshold-adjuster.js';

/**
* 智能规则学习器类
*/
export class IntelligentRuleLearner {
private llmService: any;
private historyService: any;
private historyAnalyzer: any;
private ruleGenerator: any;
private qualityEvaluator: any;
private autoApprover: any;
private integratedProcessor: any;
private performanceMonitor: any;
private thresholdAdjuster: any;
private config: {
enabled: boolean;
autoApproveThreshold: number;
minConfidence: number;
learningFromHistory: {
enabled: boolean;
batchSize: number;
};
};

constructor(llmService, historyService) {
this.llmService = llmService;
this.historyService = historyService;
this.historyAnalyzer = new HistoryAnalyzer(historyService);
this.ruleGenerator = new RuleGenerator(llmService);
this.qualityEvaluator = new QualityEvaluator(llmService);
this.autoApprover = new AutoApprover();
this.integratedProcessor = new IntegratedRuleProcessor(llmService);
this.performanceMonitor = getPerformanceMonitor();
this.thresholdAdjuster = smartThresholdAdjuster;

// 配置参数
this.config = {
enabled: process.env.RULE_LEARNING_ENABLED !== 'false',
autoApproveThreshold: 0.7,  // 与统一配置保持一致
minConfidence: 0.7,
learningFromHistory: {
enabled: true,
batchSize: 10
}
};
}

/**
* 从单次分析中学习规则
* @param {Object} analysisResult - 分析结果
* @param {string} sqlQuery - SQL查询语句
* @returns {Promise<Object>} 学习结果
*/
async learnFromAnalysis(analysisResult, sqlQuery) {
try {
if (!this.config.enabled) {

return { success: false, reason: '规则学习已禁用' };
}

// 1. 检查是否值得学习
const shouldLearn = await this.shouldTriggerLearning(sqlQuery, analysisResult);
if (!shouldLearn.should) {

return { success: false, reason: shouldLearn.reason };
}

console.log(`[RuleLearner] 开始学习规则: ${sqlQuery.substring(0, 50)}...`);

// 2. 构建学习上下文
const learningContext = await this.buildLearningContext(sqlQuery, analysisResult);

// 3. 使用集成处理器一次性完成生成和评估（优化流程）
const evaluatedRules = await this.integratedProcessor.generateAndEvaluateRules(learningContext);

if (!evaluatedRules || evaluatedRules.length === 0) {

return { success: false, reason: '未生成有效规则' };
}

// 4. 自动审批高质量规则（先审批，后保存）
const approvedRules = await this.autoApprover.process(evaluatedRules);

// 5. 记录质量数据并智能调整阈值
this.thresholdAdjuster.recordQualityData(evaluatedRules, approvedRules);
const thresholdAdjustment = this.thresholdAdjuster.applyAdjustment(this.config.autoApproveThreshold);

if (thresholdAdjustment.adjustment !== 0) {
this.config.autoApproveThreshold = thresholdAdjustment.recommendedThreshold;


}

// 6. 根据审批结果分别保存到不同目录
await this.saveRulesByApproval(evaluatedRules, approvedRules, learningContext);



return {
success: true,
generated: evaluatedRules.length,
evaluated: evaluatedRules.length,
approved: approvedRules.length,
rules: approvedRules
};

} catch (error) {
console.error(`[RuleLearner] 学习失败: ${error.message}`);
return { success: false, error: error.message };
}
}

/**
* 批量学习历史数据
* @param {Object} options - 学习选项
* @returns {Promise<Object>} 批量学习结果
*/
async batchLearnFromHistory(options = {}) {
try {
if (!this.config.enabled) {
return { success: false, reason: '规则学习已禁用' };
}

const batchSize = (options as any)?.batchSize || 10;
const minConfidence = (options as any)?.minConfidence || (this.config as any)?.minConfidence || 0.7;



// 1. 获取高质量历史记录
const qualityHistory = await this.historyAnalyzer.getQualityHistory(minConfidence);

if (qualityHistory.length === 0) {
return { success: false, reason: '没有找到高质量的历史记录' };
}

// 2. 按SQL模式分组
const sqlGroups = await this.historyAnalyzer.groupBySQLPattern(qualityHistory);

if (sqlGroups.size === 0) {
return { success: false, reason: '没有找到可学习的SQL模式' };
}

// 3. 为每个模式生成规则
const allRules = [];
let processedPatterns = 0;

for (const [pattern, records] of sqlGroups.entries()) {
if (records.length >= 2) { // 只处理重复出现的问题
try {
const rules = await this.learnFromPattern(pattern, records);
allRules.push(...rules);
processedPatterns++;

// 限制批次大小
if (allRules.length >= batchSize) {
break;
}
} catch (error) {
console.warn(`[RuleLearner] 模式学习失败 ${pattern}: ${error.message}`);
}
}
}

// 4. 去重和优化
const optimizedRules = await this.optimizeRules(allRules);



return {
success: true,
totalHistory: qualityHistory.length,
patterns: sqlGroups.size,
processedPatterns,
generated: allRules.length,
optimized: optimizedRules.length,
rules: optimizedRules
};

} catch (error) {
console.error(`[RuleLearner] 批量学习失败: ${error.message}`);
return { success: false, error: error.message };
}
}

/**
* 执行批量学习（API接口方法）
* @param {Object} options - 学习选项
* @returns {Promise<Object>} 学习结果
*/
async performBatchLearning(options = {}) {
try {

// 调用现有的批量学习方法
const result = await this.batchLearnFromHistory(options);

// 格式化返回结果
return {
success: result.success,
message: result.success ? '批量学习完成' : result.reason || '批量学习失败',
processedRecords: result.totalHistory || 0,
generatedRules: result.generated || 0,
approvedRules: result.optimized || 0,
timestamp: new Date().toISOString(),
details: result
};

} catch (error) {
console.error('[RuleLearner] 批量学习执行失败:', error);
return {
success: false,
error: error.message,
timestamp: new Date().toISOString()
};
}
}

/**
* 深度学习分析
* 使用intelligent-rule-learner.md进行深度分析
* @param {Array} historyRecords - 历史记录数组
* @returns {Promise<Object>} 深度学习结果
*/
async deepLearningAnalysis(historyRecords) {
try {


// 1. 准备深度学习上下文
const learningContext = {
DatabaseType: this.getMainDatabaseType(historyRecords),
existingRules: await this.getExistingRules()
};

// 2. 构建历史分析上下文
const historyContext = this.buildHistoryContext(historyRecords);

// 3. 使用优化后的智能规则学习器提示词
const { systemPrompt, userPrompt } = await buildPrompt('intelligent-rule-learner-optimized.md', learningContext, { category: 'tools' });

// 4. 调用LLM进行深度学习
const llmResult = await this.llmService.call(`${systemPrompt}\n\n请基于以下历史分析数据进行深度学习：\n\n${historyContext}`);

// 5. 解析深度学习结果
const parseResult = llmJsonParser.parse(llmResult.content, 'standards');

if (!parseResult.success) {
throw new Error(`深度学习结果解析失败: ${parseResult.error}`);
}

const learningResult = parseResult.data;



return {
success: true,
...learningResult
};

} catch (error) {
console.error(`[RuleLearner] 深度学习失败: ${error.message}`);
return { success: false, error: error.message };
}
}

/**
* 判断是否应该触发学习
* @param {string} sqlQuery - SQL查询
* @param {Object} analysisResult - 分析结果
* @returns {Promise<Object>} 是否应该学习
*/
async shouldTriggerLearning(sqlQuery, analysisResult) {
try {
// 1. 检查分析质量
const avgConfidence = this.calculateAverageConfidence(analysisResult);
if (avgConfidence < this.config.minConfidence) {
return { should: false, reason: `分析置信度不足: ${avgConfidence}` };
}

// 2. 检查是否有可学习的问题
const hasLearnableIssues = this.hasLearnableIssues(analysisResult);
if (!hasLearnableIssues) {
return { should: false, reason: '没有可学习的问题模式' };
}

// 3. 检查SQL重复度
const similarCount = await this.getSimilarAnalysisCount(sqlQuery);
if (similarCount >= 2) {
return { should: true, reason: `发现${similarCount}个相似分析` };
}

// 4. 检查是否为高质量分析
if (avgConfidence >= 0.7) {
return { should: true, reason: '高质量分析结果' };
}

return { should: false, reason: '不满足学习触发条件' };

} catch (error) {
console.error(`[RuleLearner] 学习条件判断失败: ${error.message}`);
return { should: false, reason: '条件判断失败' };
}
}

/**
* 构建学习上下文
* @param {string} sqlQuery - SQL查询
* @param {Object} analysisResult - 分析结果
* @returns {Promise<Object>} 学习上下文
*/
async buildLearningContext(sqlQuery, analysisResult) {
const similarAnalyses = await this.historyService.searchHistory({
sql: sqlQuery.substring(0, 20),
limit: 5
});

return {
sql: sqlQuery,
databaseType: analysisResult.metadata?.databaseType || 'mysql',
currentAnalysis: analysisResult,
similarAnalyses: similarAnalyses.slice(1), // 排除当前记录
timestamp: new Date().toISOString(),
patterns: this.extractPatterns(analysisResult),
historicalContext: this.buildHistoricalContext(similarAnalyses)
};
}

/**
* 提取分析模式
* @param {Object} analysisResult - 分析结果
* @returns {Object} 提取的模式
*/
extractPatterns(analysisResult) {
const patterns = {
performance: [],
security: [],
standards: []
};

// 提取性能问题模式
if (analysisResult.data?.performance?.data?.issues) {
patterns.performance = analysisResult.data.performance.data.issues.map(issue => ({
type: issue.type,
severity: issue.severity,
description: issue.description,
location: issue.location
}));
}

// 提取安全问题模式
if (analysisResult.data?.security?.data?.vulnerabilities) {
patterns.security = analysisResult.data.security.data.vulnerabilities.map(vuln => ({
type: vuln.type,
severity: vuln.severity,
cwe: vuln.cwe,
description: vuln.description
}));
}

// 提取规范问题模式
if (analysisResult.data?.standards?.data?.violations) {
patterns.standards = analysisResult.data.standards.data.violations.map(violation => ({
type: violation.type,
severity: violation.severity,
rule: violation.rule,
description: violation.description
}));
}

return patterns;
}

/**
* 计算平均置信度
* @param {Object} analysisResult - 分析结果
* @returns {number} 平均置信度
*/
calculateAverageConfidence(analysisResult) {
const confidences = [];

if (analysisResult.data?.performance?.metadata?.confidence) {
confidences.push(analysisResult.data.performance.metadata.confidence);
}
if (analysisResult.data?.security?.metadata?.confidence) {
confidences.push(analysisResult.data.security.metadata.confidence);
}
if (analysisResult.data?.standards?.metadata?.confidence) {
confidences.push(analysisResult.data.standards.metadata.confidence);
}

return confidences.length > 0
? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
: 0;
}

/**
* 检查是否有可学习的问题
* @param {Object} analysisResult - 分析结果
* @returns {boolean} 是否有可学习的问题
*/
hasLearnableIssues(analysisResult) {
// 检查是否有性能问题
if (analysisResult.data?.performance?.data?.issues?.length > 0) return true;

// 检查是否有安全问题
if (analysisResult.data?.security?.data?.vulnerabilities?.length > 0) return true;

// 检查是否有规范问题
if (analysisResult.data?.standards?.data?.violations?.length > 0) return true;

return false;
}

/**
* 获取相似分析数量
* @param {string} sqlQuery - SQL查询
* @returns {Promise<number>} 相似分析数量
*/
async getSimilarAnalysisCount(sqlQuery) {
try {
const similarAnalyses = await this.historyService.searchHistory({
sql: sqlQuery.substring(0, 20),
dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
});
return similarAnalyses.length;
} catch (error) {
console.warn(`[RuleLearner] 获取相似分析失败: ${error.message}`);
return 0;
}
}

/**
* 保存规则到issues目录
* @param {Array} rules - 规则数组
* @param {Object} context - 学习上下文
*/
async saveToIssues(rules, context) {
try {
const issuesDir = path.join(process.cwd(), 'rules', 'learning-rules', 'issues');
const monthDir = path.join(issuesDir, new Date().toISOString().substring(0, 7));

// 确保目录存在
await fs.mkdir(monthDir, { recursive: true });

// 生成规则文件
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const fileName = `rules-${timestamp}.md`;
const filePath = path.join(monthDir, fileName);

// 构建规则文件内容
const content = this.buildRuleFileContent(rules, context);

// 写入文件
await fs.writeFile(filePath, content, 'utf8');



} catch (error) {
console.error(`[RuleLearner] 保存规则失败: ${error.message}`);
throw error;
}
}

/**
* 根据审批结果分类保存规则
* @param {Array} evaluatedRules - 已评估的规则
* @param {Array} approvedRules - 审批通过的规则
* @param {Object} context - 学习上下文
*/
async saveRulesByApproval(evaluatedRules, approvedRules, context) {
try {


// 获取审批决策
const approvalDecisions = await this.getApprovalDecisions(evaluatedRules);

let approvedCount = 0;
let manualReviewCount = 0;
let issuesCount = 0;

// 分类保存
for (const rule of evaluatedRules) {
const decision = approvalDecisions.get(rule);
const approvalInfo = approvedRules.find(ar => ar.title === rule.title);

if (decision.action === 'approve' && approvalInfo) {
// 保存到approved目录
await this.saveToApproved(rule, context, approvalInfo);
approvedCount++;
} else if (decision.action === 'manual_review') {
// 保存到manual_review目录
await this.saveToManualReview(rule, context, decision);
manualReviewCount++;
} else {
// 保存到issues目录（拒绝的规则）
await this.saveToIssues([rule], context);
issuesCount++;
}
}

console.log(`[RuleLearner] 分类保存完成: approved(${approvedCount}), manual_review(${manualReviewCount}), issues(${issuesCount})`);

} catch (error) {
console.error(`[RuleLearner] 分类保存失败: ${error.message}`);
// 降级到issues目录
await this.saveToIssues(evaluatedRules, context);
}
}

/**
* 获取审批决策
* @param {Array} evaluatedRules - 已评估的规则
* @returns {Promise<Map>} 审批决策映射
*/
async getApprovalDecisions(evaluatedRules) {
const decisions = new Map();

for (const rule of evaluatedRules) {
try {
const decision = await this.autoApprover.evaluateRuleForApproval(rule);
decisions.set(rule, decision);
} catch (error) {
console.warn(`[RuleLearner] 获取审批决策失败: ${error.message}`);
decisions.set(rule, { action: 'reject', reason: '决策过程出错' });
}
}

return decisions;
}

/**
* 保存规则到approved目录
* @param {Object} rule - 规则对象
* @param {Object} context - 学习上下文
* @param {Object} approvalInfo - 审批信息
*/
async saveToApproved(rule, context, approvalInfo) {
try {
const approvedDir = path.join(process.cwd(), 'rules', 'learning-rules', 'approved');
const monthDir = path.join(approvedDir, new Date().toISOString().substring(0, 7));

// 确保目录存在
await fs.mkdir(monthDir, { recursive: true });

// 生成文件名
const fileName = this.generateRuleFileName(rule);
const filePath = path.join(monthDir, fileName);

// 构建内容
const content = this.buildApprovedRuleContent(rule, context, approvalInfo);

// 写入文件
await fs.writeFile(filePath, content, 'utf8');



} catch (error) {
console.error(`[RuleLearner] 保存到approved目录失败: ${error.message}`);
throw error;
}
}

/**
* 保存规则到manual_review目录
* @param {Object} rule - 规则对象
* @param {Object} context - 学习上下文
* @param {Object} decision - 审批决策
*/
async saveToManualReview(rule, context, decision) {
try {
const manualReviewDir = path.join(process.cwd(), 'rules', 'learning-rules', 'manual_review');
const monthDir = path.join(manualReviewDir, new Date().toISOString().substring(0, 7));

// 确保目录存在
await fs.mkdir(monthDir, { recursive: true });

// 生成文件名
const fileName = this.generateRuleFileName(rule);
const filePath = path.join(monthDir, fileName);

// 构建内容
const content = this.buildManualReviewRuleContent(rule, context, decision);

// 写入文件
await fs.writeFile(filePath, content, 'utf8');



} catch (error) {
console.error(`[RuleLearner] 保存到manual_review目录失败: ${error.message}`);
throw error;
}
}

/**
* 生成规则文件名
* @param {Object} rule - 规则对象
* @returns {string} 文件名
*/
generateRuleFileName(rule) {
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const safeTitle = rule.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-').substring(0, 50);
return `${safeTitle}-${timestamp}.md`;
}

/**
* 构建已审批规则内容
* @param {Object} rule - 规则对象
* @param {Object} context - 学习上下文
* @param {Object} approvalInfo - 审批信息
* @returns {string} 文件内容
*/
buildApprovedRuleContent(rule, context, approvalInfo) {
const content = `# ${rule.title}

**自动审批时间**: ${new Date().toISOString()}
**规则类别**: ${rule.category}
**规则类型**: ${rule.type}
**严重程度**: ${rule.severity}
**置信度**: ${rule.confidence}

## 规则描述

${rule.description}

## 触发条件

${rule.condition}

## 示例代码

\`\`\`sql
${rule.example}
\`\`\`

## 质量评估

- **质量分数**: ${rule.evaluation.qualityScore}
- **质量等级**: ${rule.evaluation.qualityLevel}
- **评估摘要**: ${rule.evaluation.evaluationSummary}

### 评估维度

${rule.evaluation.llmEvaluation?.dimensionScores ?
Object.entries(rule.evaluation.llmEvaluation.dimensionScores)
.map(([dimension, score]) => `- **${dimension}**: ${score}`)
.join('\n') : '无详细维度评分'}

### 优势

${rule.evaluation.llmEvaluation?.strengths?.length > 0 ?
rule.evaluation.llmEvaluation.strengths.map(strength => `- ${strength}`).join('\n') : '无特别优势'}

### 改进建议

${rule.evaluation.llmEvaluation?.issues?.length > 0 ?
rule.evaluation.llmEvaluation.issues.map(issue => `- ${issue}`).join('\n') : '无改进建议'}

## 原始分析上下文

**SQL查询**: \`\`\`sql\n${context.sql}\n\`\`\`
**数据库类型**: ${context.databaseType}
**生成时间**: ${context.timestamp}

---

*此规则由智能规则学习器自动生成并审批*
`;

return content;
}

/**
* 构建人工审核规则内容
* @param {Object} rule - 规则对象
* @param {Object} context - 学习上下文
* @param {Object} decision - 审批决策
* @returns {string} 文件内容
*/
buildManualReviewRuleContent(rule, context, decision) {
const content = `# ${rule.title}

**提交时间**: ${new Date().toISOString()}
**规则类别**: ${rule.category}
**规则类型**: ${rule.type}
**严重程度**: ${rule.severity}
**置信度**: ${rule.confidence}

## 规则描述

${rule.description}

## 触发条件

${rule.condition}

## 示例代码

\`\`\`sql
${rule.example}
\`\`\`

## 质量评估

- **质量分数**: ${rule.evaluation.qualityScore}
- **质量等级**: ${rule.evaluation.qualityLevel}
- **是否建议保留**: ${rule.evaluation.shouldKeep ? '是' : '否'}
- **评估摘要**: ${rule.evaluation.evaluationSummary}

## 需要人工审核的原因

${this.getManualReviewReasons(rule, decision)}

## 审核建议

请审核以下方面：
1. 规则的准确性和实用性
2. 触发条件的合理性
3. 示例代码的正确性
4. 严重程度的适当性

## 原始分析上下文

**SQL查询**: \`\`\`sql\n${context.sql}\n\`\`\`
**数据库类型**: ${context.databaseType}
**生成时间**: ${context.timestamp}

---

*此规则由智能规则学习器生成，等待人工审核*
`;

return content;
}

/**
* 获取人工审核原因
* @param {Object} rule - 规则对象
* @param {Object} decision - 审批决策
* @returns {string} 审核原因
*/
getManualReviewReasons(rule, decision) {
const reasons = [];

if (rule.evaluation.qualityScore < 70) {
reasons.push(`质量分数低于阈值 (${rule.evaluation.qualityScore} < 70)`);
}

if (rule.confidence < 0.8) {
reasons.push(`置信度低于阈值 (${rule.confidence} < 0.8)`);
}

if (rule.evaluation.basicValidation?.issues?.length > 2) {
reasons.push(`基础验证问题过多 (${rule.evaluation.basicValidation.issues.length}个)`);
}

if (rule.category === 'security' && rule.severity !== 'critical' && rule.severity !== 'high') {
reasons.push('安全规则严重程度可能不足');
}

if (decision.reason) {
reasons.push(`审批决策: ${decision.reason}`);
}

return reasons.length > 0 ? reasons.join('\n') : '其他原因需要人工审核';
}

/**
* 构建规则文件内容
* @param {Array} rules - 规则数组
* @param {Object} context - 学习上下文
* @returns {string} 文件内容
*/
buildRuleFileContent(rules, context) {
const content = `# ${context.databaseType.toUpperCase()} 数据库规则学习结果

**生成时间**: ${context.timestamp}
**SQL查询**: \`\`\`sql\n${context.sql}\n\`\`\`

## 原始分析结果

### 性能分析
${this.formatAnalysisSection(context.currentAnalysis.data?.performance?.data)}

### 安全分析
${this.formatAnalysisSection(context.currentAnalysis.data?.security?.data)}

### 规范分析
${this.formatAnalysisSection(context.currentAnalysis.data?.standards?.data)}

## 学习到的规则

${rules.map((rule, index) => `
### ${index + 1}. ${this.extractRuleTitle(rule)}

- **类别**: ${this.normalizeCategory(rule.category)}
- **类型**: ${this.extractRuleType(rule)}
- **描述**: ${rule.description}
- **触发条件**: ${this.extractTriggerCondition(rule)}
- **严重程度**: ${this.normalizeSeverity(rule.severity || rule.priority)}
- **置信度**: ${rule.confidence}

**示例**:
\`\`\`sql
${this.extractRuleExample(rule)}
\`\`\`
`).join('')}

## 识别的模式

${this.formatPatterns(context.patterns)}

## 历史上下文

相似分析数量: ${context.similarAnalyses.length}
学习模式: ${context.historicalContext || '首次学习'}

---

*此文件由智能规则学习器自动生成*
`;

return content;
}

/**
* 格式化分析部分
* @param {Object} data - 分析数据
* @returns {string} 格式化内容
*/
formatAnalysisSection(data) {
if (!data) return '无数据';

let content = '';

if (data.summary) {
content += `**摘要**: ${data.summary}\n\n`;
}

if (data.issues && data.issues.length > 0) {
content += `**问题**:\n`;
data.issues.forEach(issue => {
content += `- ${issue.type}: ${issue.description} (严重程度: ${issue.severity})\n`;
});
content += '\n';
}

if (data.vulnerabilities && data.vulnerabilities.length > 0) {
content += `**漏洞**:\n`;
data.vulnerabilities.forEach(vuln => {
content += `- ${vuln.type}: ${vuln.description} (严重程度: ${vuln.severity})\n`;
});
content += '\n';
}

if (data.violations && data.violations.length > 0) {
content += `**违规**:\n`;
data.violations.forEach(violation => {
content += `- ${violation.type}: ${violation.description} (严重程度: ${violation.severity})\n`;
});
content += '\n';
}

return content || '无显著问题';
}

/**
* 格式化模式
* @param {Object} patterns - 模式对象
* @returns {string} 格式化内容
*/
formatPatterns(patterns) {
let content = '';

Object.entries(patterns).forEach(([category, patternList]) => {
if (patternList && (patternList as any[]).length > 0) {
content += `### ${category.toUpperCase()} 模式\n\n`;
(patternList as any[]).forEach((pattern: any) => {
content += `- **${pattern.type}**: ${pattern.description}\n`;
});
content += '\n';
}
});

return content || '未识别到特定模式';
}

/**
* 获取主要数据库类型
* @param {Array} historyRecords - 历史记录
* @returns {string} 主要数据库类型
*/
getMainDatabaseType(historyRecords) {
const dbTypes = {};
historyRecords.forEach(record => {
const dbType = record.databaseType || 'unknown';
dbTypes[dbType] = (dbTypes[dbType] || 0) + 1;
});

return Object.keys(dbTypes).reduce((a, b) => dbTypes[a] > dbTypes[b] ? a : b, 'mysql');
}

/**
* 获取现有规则（集成知识库检索）
* @returns {Promise<string>} 现有规则内容
*/
async getExistingRules() {
try {
// 优先使用知识库检索
const { retrieveKnowledge } = await import('../../core/knowledge/index.js');

// 搜索相关规则
const searchQueries = [
`${this.getMainDatabaseType([])} 性能优化`,
`${this.getMainDatabaseType([])} 安全检查`,
`${this.getMainDatabaseType([])} 编码规范`
];

let allRules = [];
for (const query of searchQueries) {
const result = await retrieveKnowledge(query, 2);
if (result.success && result.data.documents) {
allRules.push(...result.data.documents.map(doc => doc.pageContent));
}
}

// 如果知识库中有规则，返回前10条最相关的
if (allRules.length > 0) {
return allRules.slice(0, 10).join('\n---\n');
}

// 知识库中没有足够规则，回退到文件系统读取
// 只读取approved目录中的规则，确保质量
const rulesDir = path.join(process.cwd(), 'rules', 'learning-rules', 'approved');
const rules = [];

// 读取已审批的规则文件
const monthDirs = await fs.readdir(rulesDir);

for (const monthDir of monthDirs) {
const monthPath = path.join(rulesDir, monthDir);
const stat = await fs.stat(monthPath);

if (stat.isDirectory()) {
const files = await fs.readdir(monthPath);
for (const file of files) {
if (file.endsWith('.md')) {
const filePath = path.join(monthPath, file);
const content = await fs.readFile(filePath, 'utf8');
rules.push(content);
}
}
}
}

return rules.join('\n\n---\n\n');

} catch (error) {
console.warn(`[RuleLearner] 获取现有规则失败，使用默认摘要: ${error.message}`);
return '现有规则包括性能优化、安全检查和编码规范等类别的SQL审核规则。';
}
}

/**
* 构建历史上下文
* @param {Array} similarAnalyses - 相似分析
* @returns {string} 历史上下文
*/
buildHistoricalContext(similarAnalyses) {
if (similarAnalyses.length === 0) {
return '首次学习此SQL模式';
}

const context = [];
similarAnalyses.forEach((analysis, index) => {
context.push(`相似分析 ${index + 1}:`);
context.push(`- 时间: ${analysis.timestamp}`);
context.push(`- 数据库: ${analysis.databaseType}`);
context.push(`- 置信度: ${this.calculateAverageConfidence(analysis.result)}`);
context.push('');
});

return context.join('\n');
}

/**
* 从模式学习规则
* @param {string} pattern - SQL模式
* @param {Array} records - 记录数组
* @returns {Promise<Array>} 学习到的规则
*/
async learnFromPattern(pattern, records) {
try {
// 选择最完整的记录作为代表
const representativeRecord = records.find(record =>
this.calculateAverageConfidence(record.result) >= 0.8
) || records[0];

const result = await this.learnFromAnalysis(representativeRecord.result, representativeRecord.sql);
return result.rules || [];
} catch (error) {
console.error(`[RuleLearner] 模式学习失败 ${pattern}: ${error.message}`);
return [];
}
}

/**
* 优化规则（去重等）
* @param {Array} rules - 规则数组
* @returns {Promise<Array>} 优化后的规则
*/
async optimizeRules(rules) {
// 简单的去重逻辑，基于规则标题
const seen = new Set();
const optimized = [];

for (const rule of rules) {
const key = `${rule.category}-${rule.type}-${rule.title}`;
if (!seen.has(key)) {
seen.add(key);
optimized.push(rule);
}
}

return optimized;
}

/**
* 构建历史分析上下文
* @param {Array} historyRecords - 历史记录
* @returns {string} 上下文字符串
*/
buildHistoryContext(historyRecords) {
const context = [];

context.push(`## 历史分析数据概览`);
context.push(`- 记录数量: ${historyRecords.length}`);
context.push(`- 时间范围: ${historyRecords[0]?.timestamp} 到 ${historyRecords[historyRecords.length - 1]?.timestamp}`);
context.push(`- 主要数据库: ${this.getMainDatabaseType(historyRecords)}`);
context.push('');

// 按SQL模式分组
const sqlGroups = {};
historyRecords.forEach(record => {
const pattern = this.extractSQLPattern(record.sql);
if (!sqlGroups[pattern]) {
sqlGroups[pattern] = [];
}
sqlGroups[pattern].push(record);
});

context.push(`## SQL模式分析`);
Object.entries(sqlGroups).forEach(([pattern, records]) => {
context.push(`### 模式: ${pattern}`);
context.push(`- 出现次数: ${(records as any[]).length}`);
context.push(`- 平均置信度: ${this.calculateAverageConfidence((records as any[])[0]?.result).toFixed(2)}`);

// 提取共同问题
const commonIssues = this.extractCommonIssues(records);
if (commonIssues.length > 0) {
context.push(`- 共同问题:`);
commonIssues.forEach(issue => {
context.push(`  - ${issue.type}: ${issue.description}`);
});
}
context.push('');
});

return context.join('\n');
}

/**
* 提取SQL模式
* @param {string} sql - SQL语句
* @returns {string} SQL模式
*/
extractSQLPattern(sql) {
return sql
.replace(/\d+/g, '{id}')
.replace(/'[^']*'/g, '{value}')
.replace(/\s+/g, ' ')
.trim();
}

/**
* 提取共同问题
* @param {Array} records - 记录数组
* @returns {Array} 共同问题数组
*/
extractCommonIssues(records) {
const issueCount = {};

records.forEach(record => {
const issues = this.extractPatterns(record.result);
Object.values(issues).flat().forEach(issue => {
const key = `${issue.type}-${issue.description.substring(0, 50)}`;
issueCount[key] = (issueCount[key] || 0) + 1;
});
});

// 返回出现次数超过一半的问题
const threshold = Math.ceil((records as any[]).length / 2);
return Object.entries(issueCount)
.filter(([_, count]) => (count as any) >= threshold)
.map(([key, _]) => {
const [type, description] = key.split('-');
return { type, description };
});
}

/**
* 提取规则标题
* @param {Object} rule - 规则对象
* @returns {string} 规则标题
*/
extractRuleTitle(rule) {
return rule.title || rule.description || '未命名规则';
}

/**
* 规范化类别
* @param {string} category - 原始类别
* @returns {string} 规范化后的类别
*/
normalizeCategory(category) {
const categoryMap = {
'性能': 'performance',
'安全': 'security',
'标准': 'standards',
'performance': 'performance',
'security': 'security',
'standards': 'standards'
};
return categoryMap[category] || category || 'unknown';
}

/**
* 提取规则类型
* @param {Object} rule - 规则对象
* @returns {string} 规则类型
*/
extractRuleType(rule) {
// 优先使用明确的类型字段
if (rule.type && rule.type !== 'undefined') {
return rule.type;
}

// 使用子类别作为类型
if (rule.subcategory) {
return rule.subcategory;
}

// 从触发条件推断类型
if (rule.triggerCondition) {
// 简化触发条件作为类型
const condition = rule.triggerCondition.toLowerCase();
if (condition.includes('select *')) return '数据访问效率';
if (condition.includes('like')) return '模糊查询';
if (condition.includes('join')) return '连接查询';
if (condition.includes('where')) return '条件查询';
if (condition.includes('index')) return '索引优化';
if (condition.includes('format')) return '格式规范';
if (condition.includes('naming')) return '命名规范';
if (condition.includes('injection') || condition.includes('注入')) return 'SQL注入防护';
if (condition.includes('permission') || condition.includes('权限')) return '权限控制';
return rule.triggerCondition.substring(0, 20);
}

// 从类别推断默认类型
if (rule.category) {
const categoryMap = {
'performance': '性能优化',
'security': '安全检查',
'standards': '编码规范'
};
return categoryMap[rule.category] || rule.category;
}

return '通用规则';
}

/**
* 提取触发条件
* @param {Object} rule - 规则对象
* @returns {string} 触发条件
*/
extractTriggerCondition(rule) {
return rule.triggerCondition || rule.condition || rule.pattern_regex || '未定义';
}

/**
* 规范化严重程度
* @param {string} severity - 原始严重程度
* @returns {string} 规范化后的严重程度
*/
normalizeSeverity(severity) {
const severityMap = {
'严重': 'critical',
'高': 'high',
'中': 'medium',
'低': 'low',
'警告': 'warning',
'critical': 'critical',
'high': 'high',
'medium': 'medium',
'low': 'low',
'warning': 'warning'
};
return severityMap[severity] || severity || 'unknown';
}

/**
* 提取规则示例
* @param {Object} rule - 规则对象
* @returns {string} 示例代码
*/
extractRuleExample(rule) {
try {
// 优先使用 examples 字段
if (rule.examples && Array.isArray(rule.examples) && rule.examples.length > 0) {
const example = rule.examples[0];
if (example.good) {
return example.good;
} else if (example.bad) {
return example.bad;
} else if (typeof example === 'string') {
return example;
}
}

// 使用 examples.positive 字段
if (rule.examples?.positive && Array.isArray(rule.examples.positive) && rule.examples.positive.length > 0) {
return rule.examples.positive[0];
}

// 使用 example 字段
if (rule.example) {
return rule.example;
}

// 使用 recommendation 字段
if (rule.recommendation) {
return rule.recommendation;
}

// 使用原始SQL作为示例
if (rule.source?.sqlPattern) {
return rule.source.sqlPattern;
}

// 使用 pattern_regex 作为示例
if (rule.pattern_regex) {
return rule.pattern_regex;
}

return '无可用示例';
} catch (error) {
console.warn(`[RuleLearner] 提取规则示例失败: ${error.message}`);
return '示例提取失败';
}
}
}

// 创建服务实例
let intelligentRuleLearnerInstance = null;

/**
* 获取智能规则学习器实例
* @param {Object} llmService - LLM服务
* @param {Object} historyService - 历史服务
* @returns {IntelligentRuleLearner} 智能规则学习器实例
*/
export function getIntelligentRuleLearner(llmService, historyService) {
if (!intelligentRuleLearnerInstance) {
intelligentRuleLearnerInstance = new IntelligentRuleLearner(llmService, historyService);
}
return intelligentRuleLearnerInstance;
}

export default IntelligentRuleLearner;