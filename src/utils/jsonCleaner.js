/**
 * JSON清理和解析工具类
 * 用于处理LLM返回的可能包含非标准格式的JSON内容
 */
import bestEffortJsonParser from 'best-effort-json-parser';

class JSONCleaner {
  /**
   * 预处理SQL特殊字符和可能导致JSON解析失败的模式
   * @param {string} content - 原始内容
   * @returns {string} 预处理后的内容
   */
  static preprocessSpecialPatterns(content) {
    let processed = content;
    
    // 处理常见的SQL注入模式，确保它们在JSON字符串中正确转义
    // 这些模式经常在恶意SQL中出现
    const sqlInjectionPatterns = [
      { pattern: /OR\s+'1'\s*=\s*'1'/gi, placeholder: 'OR_1_EQUALS_1' },
      { pattern: /OR\s+1\s*=\s*1/gi, placeholder: 'OR_1_EQ_1' },
      { pattern: /UNION\s+SELECT/gi, placeholder: 'UNION_SELECT' },
      { pattern: /--\s*$/gm, placeholder: 'SQL_COMMENT' }
    ];
    
    // 暂时替换这些模式以避免解析问题
    const replacements = [];
    sqlInjectionPatterns.forEach(({ pattern, placeholder }) => {
      const matches = processed.match(pattern);
      if (matches) {
        matches.forEach(match => {
          replacements.push({ placeholder, original: match });
        });
        processed = processed.replace(pattern, `__${placeholder}__`);
      }
    });
    
    // 处理文件路径中的特殊字符（如 @/test_mongodb.sql）
    // 在JSON字符串值中，@ 本身不需要转义，但需要确保路径作为完整字符串处理
    processed = processed.replace(/(@[\w/.-]+\.sql)/gi, (match) => {
      // 确保路径被正确引用
      return match;
    });
    
    return { processed, replacements };
  }
  
  /**
   * 恢复预处理时替换的SQL模式
   * @param {string} content - 处理后的内容
   * @param {Array} replacements - 替换记录
   * @returns {string} 恢复后的内容
   */
  static restoreSpecialPatterns(content, replacements) {
    let restored = content;
    replacements.forEach(({ placeholder, original }) => {
      restored = restored.replace(new RegExp(`__${placeholder}__`, 'g'), original);
    });
    return restored;
  }

  /**
   * 从响应中提取JSON内容（增强版，修复未闭合引号）
   * @param {string} content - LLM响应内容
   * @returns {string} 清理后的JSON字符串
   */
  static extractJSON(content) {
    let cleaned = content.trim();

    // 1. 提取代码块中的内容
    const codeBlockMatch = cleaned.match(/```(?:json|javascript|js)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1].trim();
    }

    // 2. 移除注释
    cleaned = cleaned.replace(/\/\/.*$/gm, '');  // 单行注释
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');  // 多行注释

    // 3. 移除变量声明
    cleaned = cleaned.replace(/^(const|let|var)\s+\w+\s*=\s*/m, '');

    // 4. 提取JSON对象
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }

    // 5. 修复未闭合的引号（关键改进）
    cleaned = this.fixUnclosedQuotes(cleaned);

    // 6. 基本修复
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');  // 移除尾随逗号
    cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_$][\w$]*)(\s*:)/g, '$1"$2"$3');  // 为属性名添加引号

    return cleaned;
  }

  /**
   * 修复未闭合的引号
   * @param {string} content - JSON字符串
   * @returns {string} 修复后的JSON字符串
   */
  static fixUnclosedQuotes(content) {
    // 检查引号是否配对
    let inString = false;
    let quoteChar = null;
    let lastQuoteIndex = -1;
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const prevChar = i > 0 ? content[i - 1] : '';
      
      // 跳过转义的引号
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          quoteChar = char;
          lastQuoteIndex = i;
        } else if (char === quoteChar) {
          inString = false;
          quoteChar = null;
        }
      }
    }
    
    // 如果有未闭合的引号，在适当位置添加闭合引号
    if (inString && lastQuoteIndex !== -1) {
      // 查找下一个换行符或结束大括号的位置
      let closeIndex = content.length;
      
      // 从最后一个引号开始搜索
      for (let i = lastQuoteIndex + 1; i < content.length; i++) {
        if (content[i] === '\n' || content[i] === '}' || content[i] === ',') {
          closeIndex = i;
          break;
        }
      }
      
      // 在该位置插入闭合引号
      content = content.substring(0, closeIndex) + '"' + content.substring(closeIndex);
    }
    
    return content;
  }


  /**
   * 尝试解析JSON（重构简化版，使用best-effort-json-parser）
   * @param {string} content - JSON字符串
   * @param {Object} options - 解析选项
   * @param {boolean} options.verbose - 是否输出详细的调试信息
   * @returns {Object} 解析后的对象
   * @throws {Error} 如果所有解析尝试都失败
   */
  static parse(content, options = {}) {
    const { verbose = false } = options;
    
    // 策略1: 直接使用标准JSON解析（最快，适用于标准JSON）
    try {
      return JSON.parse(content);
    } catch (error) {
      if (verbose) console.warn('标准解析失败，尝试提取清理...');
    }

    // 策略2: 提取并清理后使用标准解析（处理代码块、注释等）
    try {
      const extracted = this.extractJSON(content);
      return JSON.parse(extracted);
    } catch (error) {
      if (verbose) console.warn('清理后解析失败，使用 best-effort-json-parser...');
    }

    // 策略3: 使用best-effort-json-parser处理提取后的内容（专为LLM设计）
    try {
      const extracted = this.extractJSON(content);
      const result = bestEffortJsonParser(extracted);
      
      if (result && typeof result === 'object') {
        if (verbose) console.log('✓ best-effort-json-parser 成功解析（提取后）');
        return result;
      }
    } catch (error) {
      if (verbose) console.warn('提取后 best-effort 解析失败，尝试原始内容...');
    }

    // 策略4: 直接对原始内容使用best-effort-json-parser（最后的保险）
    try {
      const result = bestEffortJsonParser(content);
      
      if (result && typeof result === 'object') {
        if (verbose) console.log('✓ best-effort-json-parser 成功解析（原始内容）');
        return result;
      }
    } catch (error) {
      if (verbose) {
        console.error('所有解析策略均失败');
        console.error('错误:', error.message);
        console.error('内容片段:', content.substring(0, 200));
      }
    }
    
    throw new Error(`无法解析JSON内容：所有策略失败`);
  }

  /**
   * 安全解析JSON，如果失败返回默认值
   * @param {string} content - JSON字符串
   * @param {*} defaultValue - 解析失败时返回的默认值
   * @param {Object} options - 解析选项
   * @returns {*} 解析结果或默认值
   */
  static safeParse(content, defaultValue = null, options = {}) {
    try {
      return this.parse(content, options);
    } catch (error) {
      if (options.verbose) {
        console.error('JSON解析失败，返回默认值:', error.message);
      }
      return defaultValue;
    }
  }

  /**
   * 验证JSON字符串的完整性
   * @param {string} content - JSON字符串
   * @returns {Object} 验证结果
   */
  static validateJSON(content) {
    const issues = [];
    
    // 检查括号匹配
    let braceCount = 0;
    let bracketCount = 0;
    
    for (const char of content) {
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      else if (char === '[') bracketCount++;
      else if (char === ']') bracketCount--;
    }
    
    if (braceCount !== 0) {
      issues.push({ 
        type: 'unmatched_braces', 
        message: `花括号不匹配: ${braceCount > 0 ? '缺少' : '多余'} ${Math.abs(braceCount)} 个` 
      });
    }
    
    if (bracketCount !== 0) {
      issues.push({ 
        type: 'unmatched_brackets', 
        message: `方括号不匹配: ${bracketCount > 0 ? '缺少' : '多余'} ${Math.abs(bracketCount)} 个` 
      });
    }
    
    // 尝试解析
    try {
      JSON.parse(content);
    } catch (error) {
      issues.push({ 
        type: 'parse_error', 
        message: `解析错误: ${error.message}` 
      });
    }
    
    return {
      valid: issues.length === 0,
      issues,
      summary: issues.length === 0 ? 'JSON结构完整' : `发现 ${issues.length} 个问题`
    };
  }
}

export default JSONCleaner;