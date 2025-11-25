/**
 * 响应预处理器
 * 负责处理LLM原始响应，提取主要内容并检测格式
 * 增强版：支持多种格式清理、智能JSON提取、内容验证
 */

class ResponsePreprocessor {
  /**
   * 处理原始LLM响应（增强版）
   * @param {string} rawResponse - 原始LLM响应
   * @returns {Object} 处理后的响应对象
   */
  static process(rawResponse) {
    console.log('\n=== Content Preprocessor: Start ===');
    console.log('Input length:', rawResponse.length);
    
    try {
      // 提取主要内容
      let content = this.extractMainContent(rawResponse);
      console.log('After main content extraction:', content.length);
      
      // 检测格式
      const format = this.detectFormat(content);
      console.log('Detected format:', format.format);
      
      // 如果检测到JSON，尝试提取纯JSON
      if (format.hasJSONObject) {
        content = this.extractJSONContent(content);
        console.log('After JSON extraction:', content.length);
      }
      
      // 提取元数据
      const metadata = this.extractMetadata(rawResponse);
      
      // 验证内容
      const validation = this.validateContent(content);
      console.log('Validation:', validation.summary);
      
      if (!validation.valid) {
        console.warn('⚠️ Content validation issues:', validation.issues);
      }
      
      console.log('=== Content Preprocessor: Success ===\n');
      
      return {
        content,
        metadata: {
          ...metadata,
          format: format.format,
          hasMarkdownBlock: format.hasMarkdownBlock,
          hasComments: format.hasComments,
          lineCount: format.lineCount
        },
        validation
      };
      
    } catch (error) {
      console.error('❌ Content Preprocessor failed:', error.message);
      console.log('=== Content Preprocessor: Failed ===\n');
      
      return {
        content: rawResponse,
        metadata: {
          error: error.message
        },
        validation: {
          valid: false,
          issues: [error.message],
          summary: '预处理失败'
        }
      };
    }
  }
  
  /**
   * 提取主要内容（增强版）
   * @param {string} response - 原始响应
   * @returns {string} 提取的主要内容
   */
  static extractMainContent(response) {
    let content = response.trim();
    
    // 增强：移除多种markdown代码块格式
    content = content.replace(/^```(?:json|javascript|js|text)?\s*/gi, '');
    content = content.replace(/\s*```$/g, '');
    
    // 新增：移除行内代码块标记
    content = content.replace(/`{1,2}([^`]+)`{1,2}/g, '$1');
    
    // 新增：移除HTML注释
    content = content.replace(/<!--[\s\S]*?-->/g, '');
    
    // 增强：移除JavaScript注释（单行和多行）
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    content = content.replace(/\/\/[^\n]*/g, '');
    
    // 新增：移除Python风格注释
    content = content.replace(/#[^\n]*/g, '');
    
    // 新增：清理多余的空白字符
    content = content.replace(/\n\s*\n/g, '\n');
    content = content.replace(/^\s+|\s+$/g, '');
    
    return content.trim();
  }
  
  /**
   * 增强JSON提取功能
   * @param {string} text - 文本内容
   * @returns {string} 提取的JSON内容
   */
  static extractJSONContent(text) {
    // 增强：支持更复杂的JSON结构提取
    
    // 策略1：查找最外层的 {...}
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }
    
    // 策略2：查找数组格式 [...]
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return arrayMatch[0];
    }
    
    // 策略3：尝试从特定标记中提取
    const markerPatterns = [
      /JSON:\s*(\{[\s\S]*\})/i,
      /RESULT:\s*(\{[\s\S]*\})/i,
      /OUTPUT:\s*(\{[\s\S]*\})/i
    ];
    
    for (const pattern of markerPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return text;
  }
  
  /**
   * 增强格式检测
   * @param {string} response - 原始响应
   * @returns {Object} 格式信息
   */
  static detectFormat(response) {
    const content = response.toLowerCase();
    
    // 检测markdown代码块
    const hasMarkdownBlock = /```(?:json|javascript|js)?/.test(response);
    
    // 检测JSON对象
    const hasJSONObject = /\{[\s\S]*"[\s\S]*:[\s\S]*\}/.test(response);
    
    // 检测注释
    const hasComments = /\/\/|\/\*|\*\/|<!--/.test(response);
    
    // 检测行数
    const lineCount = response.split('\n').length;
    
    return {
      hasMarkdownBlock,
      hasJSONObject,
      hasComments,
      lineCount,
      format: hasMarkdownBlock ? 'markdown' :
              hasJSONObject ? 'json' :
              'plain'
    };
  }
  
  /**
   * 新增内容验证方法
   * @param {string} content - 预处理后的内容
   * @returns {Object} 验证结果
   */
  static validateContent(content) {
    const issues = [];
    
    // 检查是否为空
    if (!content || content.trim().length === 0) {
      issues.push('内容为空');
    }
    
    // 检查是否包含明显的markdown残留
    if (/```/.test(content)) {
      issues.push('包含markdown代码块标记残留');
    }
    
    // 检查是否包含注释残留
    if (/\/\/|\/\*/.test(content)) {
      issues.push('包含注释残留');
    }
    
    // 检查JSON基本结构
    const hasOpenBrace = content.includes('{');
    const hasCloseBrace = content.includes('}');
    if (hasOpenBrace !== hasCloseBrace) {
      issues.push('JSON括号不匹配');
    }
    
    return {
      valid: issues.length === 0,
      issues,
      summary: issues.length === 0 ? '内容有效' : `发现 ${issues.length} 个问题`
    };
  }
  
  /**
   * 提取元数据
   * @param {string} response - 原始响应
   * @returns {Object} 元数据对象
   */
  static extractMetadata(response) {
    return {
      length: response.length,
      hasCodeBlock: response.includes('```'),
      hasComments: response.includes('//') || response.includes('/*'),
      lineCount: response.split('\n').length,
      firstLine: response.split('\n')[0]?.trim() || '',
      lastLine: response.split('\n').pop()?.trim() || ''
    };
  }
  
  /**
   * 验证处理后的内容（保持向后兼容）
   * @param {string} content - 处理后的内容
   * @returns {Object} 验证结果
   */
  static validateProcessedContent(content) {
    return this.validateContent(content);
  }
}

export default ResponsePreprocessor;
export { ResponsePreprocessor };