/**
 * 智能修复器
 * 使用LLM自身能力来修复格式错误的JSON
 */

import { ResponsePreprocessor } from './response-preprocessor.js';
import { StructuredParser } from './structured-parser.js';

class IntelligentRepairer {
  /**
   * 修复格式错误的JSON
   * @param {Object} failedResponse - 失败的解析结果
   * @param {string} originalContent - 原始LLM响应内容
   * @param {Object} llm - LLM实例
   * @returns {Promise<Object>} 修复后的结果
   */
  static async repair(failedResponse, originalContent, llm) {
    try {
      console.log('开始智能修复JSON格式...');
      
      // 策略1: 使用LLM修复
      const llmRepairResult = await this.repairWithLLM(originalContent, llm);
      if (llmRepairResult.success) {
        console.log('LLM修复成功');
        return llmRepairResult;
      }
      
      // 策略2: 基于规则的修复
      const ruleRepairResult = await this.repairWithRules(originalContent);
      if (ruleRepairResult.success) {
        console.log('规则修复成功');
        return ruleRepairResult;
      }
      
      // 策略3: 部分数据提取
      const partialResult = await this.extractPartialData(originalContent);
      if (partialResult.success) {
        console.log('部分数据提取成功');
        return partialResult;
      }
      
      throw new Error('所有修复策略都失败');
    } catch (error) {
      console.warn('智能修复失败:', error.message);
      throw error;
    }
  }
  
  /**
   * 使用LLM修复JSON格式
   * @param {string} originalContent - 原始内容
   * @param {Object} llm - LLM实例
   * @returns {Promise<Object>} 修复结果
   */
  static async repairWithLLM(originalContent, llm) {
    try {
      const repairPrompt = `
你是一个JSON修复专家。以下JSON格式有误，请修复为有效的JSON格式，保持原始数据结构不变：

原始内容：
${originalContent}

修复要求：
1. 返回有效的JSON格式
2. 保持原始数据结构和字段
3. 不要添加任何解释或markdown标记
4. 确保所有字符串正确转义
5. 确保所有括号正确匹配

只返回修复后的JSON：
`;
      
      const repairMessages = [
        { role: 'system', content: '你是一个JSON修复专家，专门修复格式错误的JSON。只返回有效的JSON，不要添加任何解释。' },
        { role: 'user', content: repairPrompt }
      ];
      
      const repairedResponse = await llm.invoke(repairMessages);
      const processed = ResponsePreprocessor.process(repairedResponse.content);
      const parseResult = await StructuredParser.parse(processed);
      
      if (parseResult.success) {
        return {
          success: true,
          data: parseResult.data,
          strategy: 'llm_repair',
          confidence: 0.8
        };
      }
      
      throw new Error('LLM修复后解析失败');
    } catch (error) {
      console.warn('LLM修复失败:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 使用规则修复JSON格式
   * @param {string} originalContent - 原始内容
   * @returns {Promise<Object>} 修复结果
   */
  static async repairWithRules(originalContent) {
    try {
      let content = originalContent;
      
      // 应用一系列修复规则
      content = this.applyRepairRules(content);
      
      // 尝试解析修复后的内容
      const processed = ResponsePreprocessor.process(content);
      const parseResult = await StructuredParser.parse(processed);
      
      if (parseResult.success) {
        return {
          success: true,
          data: parseResult.data,
          strategy: 'rule_repair',
          confidence: 0.6
        };
      }
      
      throw new Error('规则修复后解析失败');
    } catch (error) {
      console.warn('规则修复失败:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 应用修复规则
   * @param {string} content - 原始内容
   * @returns {string} 修复后的内容
   */
  static applyRepairRules(content) {
    let fixed = content;
    
    // 规则1: 移除markdown标记
    fixed = fixed.replace(/^```(?:json|javascript|js)?\s*/i, '');
    fixed = fixed.replace(/\s*```$/, '');
    
    // 规则2: 移除注释
    fixed = fixed.replace(/\/\/.*$/gm, '');
    fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // 规则3: 移除变量声明
    fixed = fixed.replace(/^(const|let|var)\s+\w+\s*=\s*/m, '');
    
    // 规则4: 提取JSON对象
    const jsonStart = fixed.indexOf('{');
    const jsonEnd = fixed.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      fixed = fixed.substring(jsonStart, jsonEnd + 1);
    }
    
    // 规则5: 修复常见语法错误
    fixed = this.fixCommonSyntaxErrors(fixed);
    
    // 规则6: 修复引号问题
    fixed = this.fixQuoteIssues(fixed);
    
    // 规则7: 修复括号问题
    fixed = this.fixBracketIssues(fixed);
    
    return fixed.trim();
  }
  
  /**
   * 修复常见语法错误
   * @param {string} content - 内容
   * @returns {string} 修复后的内容
   */
  static fixCommonSyntaxErrors(content) {
    let fixed = content;
    
    // 移除尾随逗号
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
    
    // 为属性名添加引号
    fixed = fixed.replace(/([{,]\s*)([a-zA-Z_$][\w$]*)(\s*:)/g, '$1"$2"$3');
    
    // 修复单引号为双引号
    fixed = fixed.replace(/'/g, '"');
    
    return fixed;
  }
  
  /**
   * 修复引号问题
   * @param {string} content - 内容
   * @returns {string} 修复后的内容
   */
  static fixQuoteIssues(content) {
    let result = content;
    let inString = false;
    let quoteChar = null;
    let escapeNext = false;
    
    for (let i = 0; i < result.length; i++) {
      const char = result[i];
      
      if (char === '\\' && !escapeNext) {
        escapeNext = true;
        continue;
      }
      
      if ((char === '"' || char === "'") && !escapeNext) {
        if (!inString) {
          inString = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inString = false;
          quoteChar = null;
        }
      } else {
        escapeNext = false;
      }
    }
    
    // 如果有未闭合的引号，添加闭合引号
    if (inString && quoteChar) {
      result += quoteChar;
    }
    
    return result;
  }
  
  /**
   * 修复括号问题
   * @param {string} content - 内容
   * @returns {string} 修复后的内容
   */
  static fixBracketIssues(content) {
    let result = content;
    
    // 计算括号匹配
    let braceCount = 0;
    let bracketCount = 0;
    
    for (const char of result) {
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      else if (char === '[') bracketCount++;
      else if (char === ']') bracketCount--;
    }
    
    // 添加缺失的闭合括号
    while (braceCount > 0) {
      result += '}';
      braceCount--;
    }
    
    while (bracketCount > 0) {
      result += ']';
      bracketCount--;
    }
    
    return result;
  }
  
  /**
   * 提取部分数据
   * @param {string} originalContent - 原始内容
   * @returns {Promise<Object>} 提取结果
   */
  static async extractPartialData(originalContent) {
    try {
      // 尝试提取关键字段
      const partialData = this.extractKeyFields(originalContent);
      
      if (Object.keys(partialData).length > 0) {
        return {
          success: true,
          data: partialData,
          strategy: 'partial_extraction',
          confidence: 0.4
        };
      }
      
      throw new Error('无法提取有效数据');
    } catch (error) {
      console.warn('部分数据提取失败:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 提取关键字段
   * @param {string} content - 内容
   * @returns {Object} 提取的数据
   */
  static extractKeyFields(content) {
    const data = {};
    
    // 提取评分字段
    const scoreMatch = content.match(/["']?score["']?\s*:\s*([0-9.]+)/i);
    if (scoreMatch) {
      data.score = parseFloat(scoreMatch[1]);
    }
    
    // 提取置信度字段
    const confidenceMatch = content.match(/["']?confidence["']?\s*:\s*([0-9.]+)/i);
    if (confidenceMatch) {
      data.confidence = parseFloat(confidenceMatch[1]);
    }
    
    // 提取问题数组
    const issuesMatch = content.match(/["']?issues["']?\s*:\s*\[([\s\S]*?)\]/i);
    if (issuesMatch) {
      try {
        data.issues = JSON.parse(`[${issuesMatch[1]}]`);
      } catch (e) {
        data.issues = [];
      }
    }
    
    // 提取建议数组
    const recommendationsMatch = content.match(/["']?recommendations["']?\s*:\s*\[([\s\S]*?)\]/i);
    if (recommendationsMatch) {
      try {
        data.recommendations = JSON.parse(`[${recommendationsMatch[1]}]`);
      } catch (e) {
        data.recommendations = [];
      }
    }
    
    return data;
  }
  
  /**
   * 获取修复策略统计
   * @returns {Object} 策略统计信息
   */
  static getRepairStats() {
    return {
      availableStrategies: [
        'llm_repair',
        'rule_repair',
        'partial_extraction'
      ],
      successRates: {
        'llm_repair': 0.8,
        'rule_repair': 0.6,
        'partial_extraction': 0.4
      }
    };
  }
}

export default IntelligentRepairer;
export { IntelligentRepairer };