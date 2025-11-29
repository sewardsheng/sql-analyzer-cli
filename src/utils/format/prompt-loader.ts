/**
* Prompt模板加载和处理工具
*/

import fs from 'fs/promises';
import { dirname, join } from 'pathe';

/**
* 加载prompt模板文件
* @param {string} templateName - 模板文件名(相对于src/prompts/)
* @param {string} category - 提示词类别(rule-learning/tools)，默认为rule-learning
* @returns {Promise<string>} 模板内容
*/
export async function loadPromptTemplate(templateName, category = 'rule-learning') {
try {
// 获取项目根目录（向上查找package.json）
let currentDir = process.cwd();
while (currentDir !== dirname(currentDir)) {
const packageJsonPath = join(currentDir, 'package.json');
try {
await fs.access(packageJsonPath);
break; // 找到package.json，说明是项目根目录
} catch {
currentDir = dirname(currentDir);
}
}

const templatePath = join(
currentDir,
'src',
'prompts',
category,
templateName
);

// 检查文件是否存在并读取
try {
await fs.access(templatePath);
} catch (accessError) {
throw new Error(`模板文件不存在: ${templatePath}`);
}

const content = await fs.readFile(templatePath, 'utf8');
return content;
} catch (error) {
console.error(`加载prompt模板失败: ${templateName}`, error);
throw new Error(`无法加载prompt模板: ${templateName} - ${error.message}`);
}
}

/**
* 替换模板中的变量
* @param {string} template - 模板内容
* @param {Object} variables - 变量对象
* @returns {string} 替换后的内容
*/
export function replaceTemplateVariables(template, variables) {
let result = template;

for (const [key, value] of Object.entries(variables)) {
const pattern = new RegExp(`{{${key}}}`, 'g');
// 将对象和数组转换为格式化的字符串
const replacementValue = typeof value === 'object'
? JSON.stringify(value, null, 2)
: String(value);
result = result.replace(pattern, replacementValue);
}

return result;
}

/**
* 从markdown模板中提取system和user部分
* @param {string} template - 模板内容
* @returns {Object} {systemPrompt, userPrompt}
*/
export function extractPromptsFromTemplate(template) {
// 提取系统角色定义和任务目标作为system prompt
const systemSections = [];

// 提取开头的描述部分（第一段到第一个##之前）
const descMatch = template.match(/^([\s\S]*?)\s*##/);
if (descMatch) {
systemSections.push(descMatch[1].trim());
}

// 提取各种分析要求部分
const requirementMatches = template.match(/## [^：]*：?\s*([\s\S]*?)(?=\n##|$)/g);
if (requirementMatches) {
requirementMatches.forEach(match => {
if (match[1] && match[1].trim()) {
systemSections.push(match[1].trim());
}
});
}

// 提取输出格式要求作为system prompt的一部分
const outputMatch = template.match(/## 输出格式(?:要求)?\s*([\s\S]*?)(?=\n##|$)/);
if (outputMatch) {
systemSections.push(outputMatch[1].trim());
}

// 提取评分指南和重要说明
const guideMatches = template.match(/## (评分指南|重要说明|深度分析的特殊指令|验证标准)\s*([\s\S]*?)(?=\n##|$)/g);
if (guideMatches) {
guideMatches.forEach(match => {
if (match[1] && match[1].trim()) {
systemSections.push(match[1].trim());
}
});
}

const systemPrompt = systemSections.join('\n\n');

// 对于这种格式的提示词，用户提示词就是SQL语句本身
const userPrompt = '请分析提供的SQL语句并按照要求返回JSON格式的分析结果。';

return {
systemPrompt,
userPrompt
};
}

/**
* 构建完整的prompt
* @param {string} templateName - 模板文件名
* @param {Object} variables - 变量对象
* @param {Object} options - 可选配置 {category}
* @returns {Promise<Object>} {systemPrompt, userPrompt}
*/
export async function buildPrompt(templateName: string, variables: any = {}, options: any = {}) {
const { category = 'rule-learning' } = options;

// 加载模板
const template = await loadPromptTemplate(templateName, category);

// 替换变量
const filledTemplate = replaceTemplateVariables(template, variables);

// 提取system和user部分
const { systemPrompt, userPrompt } = extractPromptsFromTemplate(filledTemplate);

return {
systemPrompt,
userPrompt
};
}

/**
* 验证必需的变量是否都已提供
* @param {Object} variables - 提供的变量
* @param {Array<string>} required - 必需的变量列表
* @throws {Error} 如果缺少必需变量
*/
export function validateRequiredVariables(variables, required) {
const missing = required.filter(key => !(key in variables));

if (missing.length > 0) {
throw new Error(`缺少必需的模板变量: ${missing.join(', ')}`);
}
}