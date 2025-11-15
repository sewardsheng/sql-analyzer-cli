/**
 * Prompt模板加载和处理工具
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * 加载prompt模板文件
 * @param {string} templateName - 模板文件名(相对于src/prompts/)
 * @param {string} category - 提示词类别(rule-learning/analyzers)，默认为rule-learning
 * @returns {Promise<string>} 模板内容
 */
export async function loadPromptTemplate(templateName, category = 'rule-learning') {
  try {
    const templatePath = path.join(
      process.cwd(),
      'src',
      'prompts',
      category,
      templateName
    );
    
    const content = await fs.readFile(templatePath, 'utf8');
    return content;
  } catch (error) {
    console.error(`加载prompt模板失败: ${templateName}`, error);
    throw new Error(`无法加载prompt模板: ${templateName}`);
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
 * @param {string} section - 要提取的特定部分(可选)
 * @returns {Object} {systemPrompt, userPrompt}
 */
export function extractPromptsFromTemplate(template, section = null) {
  // 如果指定了section，先提取该section的内容
  let workingTemplate = template;
  if (section) {
    const sectionPattern = new RegExp(`## 系统角色 - ${section}\\s+([\\s\\S]*?)(?=\\n---\\n|\\n## 系统角色|$)`, 'i');
    const sectionMatch = template.match(sectionPattern);
    if (sectionMatch) {
      workingTemplate = sectionMatch[0];
    } else {
      console.warn(`未找到指定的section: ${section}, 使用完整模板`);
    }
  }
  
  // 提取系统角色定义和任务目标作为system prompt
  const systemSections = [];
  
  // 提取 ## 系统角色定义 或 ## 系统角色 - XXX 部分
  const roleMatch = workingTemplate.match(/## 系统角色.*\s+([\s\S]*?)(?=\n##|$)/);
  if (roleMatch) {
    systemSections.push(roleMatch[1].trim());
  }
  
  // 提取 ## 任务目标 部分
  const goalMatch = workingTemplate.match(/## 任务目标\s+([\s\S]*?)(?=\n##|$)/);
  if (goalMatch) {
    systemSections.push(goalMatch[1].trim());
  }
  
  // 提取输出格式要求作为system prompt的一部分
  const outputMatch = workingTemplate.match(/## 输出格式(?:要求)?\s+([\s\S]*?)(?=\n##|$)/);
  if (outputMatch) {
    systemSections.push(outputMatch[1].trim());
  }
  
  // 提取指导原则
  const guideMatch = workingTemplate.match(/## .*指导原则\s+([\s\S]*?)(?=\n##|$)/);
  if (guideMatch) {
    systemSections.push(guideMatch[1].trim());
  }
  
  const systemPrompt = systemSections.join('\n\n');
  
  // 提取输入信息部分作为user prompt的基础
  const inputMatch = workingTemplate.match(/## 输入信息\s+([\s\S]*?)(?=\n##|$)/);
  const userPrompt = inputMatch ? inputMatch[1].trim() : '';
  
  return {
    systemPrompt,
    userPrompt
  };
}

/**
 * 构建完整的prompt
 * @param {string} templateName - 模板文件名
 * @param {Object} variables - 变量对象
 * @param {Object} options - 可选配置 {category, section}
 * @returns {Promise<Object>} {systemPrompt, userPrompt}
 */
export async function buildPrompt(templateName, variables = {}, options = {}) {
  const { category = 'rule-learning', section = null } = options;
  
  // 加载模板
  const template = await loadPromptTemplate(templateName, category);
  
  // 替换变量
  const filledTemplate = replaceTemplateVariables(template, variables);
  
  // 提取system和user部分
  const { systemPrompt, userPrompt } = extractPromptsFromTemplate(filledTemplate, section);
  
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