/**
 * JSON清理和解析工具类
 * 用于处理LLM返回的可能包含非标准格式的JSON内容
 */
class JSONCleaner {
  /**
   * 从响应中提取JSON内容
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

    // 5. 基本修复
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');  // 移除尾随逗号
    cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_$][\w$]*)(\s*:)/g, '$1"$2"$3');  // 为属性名添加引号

    return cleaned;
  }

  /**
   * 修复字符串中的特殊字符
   * @param {string} content - JSON字符串
   * @returns {string} 修复后的JSON字符串
   */
  static fixStringContent(content) {
    let result = '';
    let inString = false;
    let stringDelimiter = null;
    let i = 0;

    while (i < content.length) {
      const char = content[i];
      const nextChar = i < content.length - 1 ? content[i + 1] : '';
      const prevChar = i > 0 ? content[i - 1] : '';

      // 处理字符串边界
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inString) {
          // 开始字符串
          inString = true;
          stringDelimiter = char;
          result += '"';  // 统一使用双引号
        } else if (char === stringDelimiter) {
          // 结束字符串
          inString = false;
          stringDelimiter = null;
          result += '"';
        } else {
          // 字符串内部的其他类型引号，需要转义
          result += '\\' + char;
        }
        i++;
        continue;
      }

      // 在字符串内部处理特殊字符
      if (inString) {
        // 处理反斜杠
        if (char === '\\') {
          const validEscapes = ['n', 'r', 't', 'b', 'f', '"', "'", '\\', '/', 'u'];
          
          if (validEscapes.includes(nextChar)) {
            // 有效的转义序列
            if (nextChar === 'u') {
              // Unicode转义序列
              const hexPart = content.substring(i + 2, i + 6);
              if (/^[0-9a-fA-F]{4}$/.test(hexPart)) {
                result += '\\u' + hexPart;
                i += 6;
                continue;
              }
            }
            result += '\\' + nextChar;
            i += 2;
          } else {
            // 无效的转义序列，转义反斜杠本身
            result += '\\\\';
            i++;
          }
        }
        // 处理控制字符
        else if (char === '\n') {
          result += '\\n';
          i++;
        } else if (char === '\r') {
          result += '\\r';
          i++;
        } else if (char === '\t') {
          result += '\\t';
          i++;
        } else {
          result += char;
          i++;
        }
      } else {
        result += char;
        i++;
      }
    }

    // 如果字符串未闭合，添加闭合引号
    if (inString) {
      result += '"';
    }

    return result;
  }

  /**
   * 修复常见的JSON格式问题
   * @param {string} content - JSON字符串
   * @returns {string} 修复后的JSON字符串
   */
  static fixCommonIssues(content) {
    let fixed = content;

    // 1. 先修复字符串内容（处理引号和特殊字符）
    fixed = this.fixStringContent(fixed);

    // 2. 修复Python布尔值和None
    fixed = fixed.replace(/:\s*True\b/g, ': true');
    fixed = fixed.replace(/:\s*False\b/g, ': false');
    fixed = fixed.replace(/:\s*None\b/g, ': null');

    // 3. 修复未闭合的括号
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      fixed += '}'.repeat(openBraces - closeBraces);
    }

    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;
    if (openBrackets > closeBrackets) {
      fixed += ']'.repeat(openBrackets - closeBrackets);
    }

    // 4. 修复缺少值的键
    fixed = fixed.replace(/"([^"]+)":\s*([,}\]])/g, '"$1":null$2');

    return fixed;
  }

  /**
   * 尝试解析JSON，如果失败则尝试修复
   * @param {string} content - JSON字符串
   * @param {Object} options - 解析选项
   * @param {boolean} options.verbose - 是否输出详细的调试信息
   * @returns {Object} 解析后的对象
   * @throws {Error} 如果所有解析尝试都失败
   */
  static parse(content, options = {}) {
    const { verbose = false } = options;
    
    // 第一次尝试：直接解析
    try {
      return JSON.parse(content);
    } catch (error) {
      if (verbose) {
        console.warn('直接解析失败，尝试提取和清理JSON内容');
      }
    }

    // 第二次尝试：提取并清理后解析
    try {
      const extracted = this.extractJSON(content);
      return JSON.parse(extracted);
    } catch (error) {
      if (verbose) {
        console.warn('提取后解析失败，尝试修复常见问题');
      }
    }

    // 第三次尝试：修复常见问题后解析
    try {
      const extracted = this.extractJSON(content);
      const fixed = this.fixCommonIssues(extracted);
      return JSON.parse(fixed);
    } catch (error) {
      if (verbose) {
        console.error('所有解析尝试均失败');
        console.error('错误信息:', error.message);
        console.error('原始内容（前500字符）:', content.substring(0, 500));
        
        // 显示修复后的内容（用于调试）
        try {
          const extracted = this.extractJSON(content);
          const fixed = this.fixCommonIssues(extracted);
          console.error('修复后内容（前500字符）:', fixed.substring(0, 500));
        } catch (e) {
          // 忽略
        }
      }
      
      throw new Error(`无法解析JSON内容: ${error.message}`);
    }
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