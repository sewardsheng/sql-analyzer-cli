/**
 * 结构化解析器
 * 提供多种JSON解析策略，按优先级依次尝试
 */

import bestEffortJsonParser from 'best-effort-json-parser';

class StructuredParser {
  /**
   * 解析处理后的响应
   * @param {Object} processedResponse - 预处理后的响应对象
   * @returns {Promise<Object>} 解析结果
   */
  static async parse(processedResponse) {
    const strategies = [
      { name: 'pure_json', func: this.parsePureJSON },
      { name: 'markdown_json', func: this.parseMarkdownJSON },
      { name: 'partial_json', func: this.parsePartialJSON },
      { name: 'best_effort', func: this.parseWithBestEffort },
      { name: 'regex_extract', func: this.parseWithRegex }
    ];
    
    for (const strategy of strategies) {
      try {
        const result = await strategy.func(processedResponse);
        if (this.isValidResult(result)) {
          return { 
            success: true, 
            data: result, 
            strategy: strategy.name,
            confidence: this.calculateConfidence(result, strategy.name)
          };
        }
      } catch (error) {
        console.warn(`策略 ${strategy.name} 失败:`, error.message);
      }
    }
    
    return { success: false, error: '所有解析策略失败' };
  }
  
  /**
   * 策略1: 纯JSON解析
   * @param {Object} processedResponse - 预处理后的响应
   * @returns {Object} 解析结果
   */
  static parsePureJSON(processedResponse) {
    if (!processedResponse || !processedResponse.content) {
      throw new Error('processedResponse.content不存在');
    }
    return JSON.parse(processedResponse.content);
  }
  
  /**
   * 策略2: Markdown包裹的JSON解析
   * @param {Object} processedResponse - 预处理后的响应
   * @returns {Object} 解析结果
   */
  static parseMarkdownJSON(processedResponse) {
    if (!processedResponse || !processedResponse.content) {
      throw new Error('processedResponse.content不存在');
    }
    
    // 如果预处理后已经是纯JSON，直接解析
    if (processedResponse.format === 'json') {
      return JSON.parse(processedResponse.content);
    }
    
    // 尝试从原始内容中提取JSON
    const jsonMatch = processedResponse.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('未找到JSON对象');
  }
  
  /**
   * 策略3: 部分JSON解析
   * @param {Object} processedResponse - 预处理后的响应
   * @returns {Object} 解析结果
   */
  static parsePartialJSON(processedResponse) {
    if (!processedResponse || !processedResponse.content) {
      throw new Error('processedResponse.content不存在');
    }
    
    let content = processedResponse.content;
    
    // 修复常见的JSON语法错误
    content = this.fixCommonJSONErrors(content);
    
    return JSON.parse(content);
  }
  
  /**
   * 策略4: 使用best-effort-json-parser
   * @param {Object} processedResponse - 预处理后的响应
   * @returns {Object} 解析结果
   */
  static async parseWithBestEffort(processedResponse) {
    if (!processedResponse || !processedResponse.content) {
      throw new Error('processedResponse.content不存在');
    }
    
    const result = bestEffortJsonParser.parse(processedResponse.content);
    
    if (result && typeof result === 'object') {
      return result;
    }
    
    throw new Error('best-effort-json-parser解析失败');
  }
  
  /**
   * 策略5: 正则表达式提取
   * @param {Object} processedResponse - 预处理后的响应
   * @returns {Object} 解析结果
   */
  static parseWithRegex(processedResponse) {
    if (!processedResponse || !processedResponse.content) {
      throw new Error('processedResponse.content不存在');
    }
    
    const content = processedResponse.content;
    
    // 尝试多种正则模式
    const patterns = [
      /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g,  // 嵌套对象
      /\{[^}]*\}/,                          // 简单对象
      /(\{[\s\S]*\})/                       // 贪婪匹配
    ];
    
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        for (const match of matches) {
          try {
            return JSON.parse(match);
          } catch (error) {
            continue;
          }
        }
      }
    }
    
    throw new Error('正则表达式提取失败');
  }
  
  /**
   * 修复常见的JSON语法错误
   * @param {string} content - JSON内容
   * @returns {string} 修复后的内容
   */
  static fixCommonJSONErrors(content) {
    let fixed = content;
    
    // 移除尾随逗号
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
    
    // 为属性名添加引号
    fixed = fixed.replace(/([{,]\s*)([a-zA-Z_$][\w$]*)(\s*:)/g, '$1"$2"$3');
    
    // 修复未闭合的引号
    fixed = this.fixUnclosedQuotes(fixed);
    
    return fixed;
  }
  
  /**
   * 修复未闭合的引号
   * @param {string} content - JSON内容
   * @returns {string} 修复后的内容
   */
  static fixUnclosedQuotes(content) {
    let result = content;
    let inString = false;
    let quoteChar = null;
    
    for (let i = 0; i < result.length; i++) {
      const char = result[i];
      
      if ((char === '"' || char === "'") && !inString) {
        inString = true;
        quoteChar = char;
      } else if (char === quoteChar && inString) {
        inString = false;
        quoteChar = null;
      }
    }
    
    // 如果有未闭合的引号，添加闭合引号
    if (inString && quoteChar) {
      result += quoteChar;
    }
    
    return result;
  }
  
  /**
   * 验证解析结果
   * @param {*} result - 解析结果
   * @returns {boolean} 是否有效
   */
  static isValidResult(result) {
    return result && 
           typeof result === 'object' && 
           !Array.isArray(result) &&
           Object.keys(result).length > 0;
  }
  
  /**
   * 计算解析置信度
   * @param {Object} result - 解析结果
   * @param {string} strategy - 使用的策略
   * @returns {number} 置信度 (0-1)
   */
  static calculateConfidence(result, strategy) {
    const strategyConfidence = {
      'pure_json': 1.0,
      'markdown_json': 0.9,
      'partial_json': 0.8,
      'best_effort': 0.7,
      'regex_extract': 0.6
    };
    
    const baseConfidence = strategyConfidence[strategy] || 0.5;
    
    // 根据结果质量调整置信度
    const keyCount = Object.keys(result).length;
    const qualityBonus = Math.min(keyCount / 10, 0.2); // 最多增加0.2
    
    return Math.min(baseConfidence + qualityBonus, 1.0);
  }
  
  /**
   * 获取解析策略统计
   * @returns {Object} 策略统计信息
   */
  static getStrategyStats() {
    return {
      availableStrategies: [
        'pure_json',
        'markdown_json', 
        'partial_json',
        'best_effort',
        'regex_extract'
      ],
      recommendedOrder: [
        'pure_json',
        'markdown_json',
        'partial_json',
        'best_effort',
        'regex_extract'
      ]
    };
  }
}

export default StructuredParser;
export { StructuredParser };