/**
 * LLM JSON解析器
 * 基于best-effort-json-parser库的解析器
 * 专门处理LLM返回的JSON格式数据
 */

// 尝试导入best-effort-json-parser，如果失败则使用原生JSON解析
let bestEffortParse;
try {
  const module = await import('best-effort-json-parser');
  bestEffortParse = module.parse;
} catch (error) {
  console.warn('best-effort-json-parser包不可用，使用原生JSON解析作为fallback');
  bestEffortParse = null;
}

/**
 * LLM JSON解析器
 * 专门处理LLM返回的JSON格式数据
 */
class LlmJsonParser {
  constructor() {
    this.bestEffortParse = bestEffortParse;
    
    // 定义各维度的fallback数据
    this.fallbackData = {
      performance: {
        summary: '性能分析暂时不可用',
        issues: [],
        recommendations: [],
        confidence: 0.3
      },
      security: {
        summary: '安全分析暂时不可用',
        vulnerabilities: [],
        recommendations: [],
        confidence: 0.3
      },
      standards: {
        summary: '规范检查暂时不可用',
        violations: [],
        recommendations: [],
        confidence: 0.3
      }
    };
  }

  /**
   * 解析LLM响应
   * @param {string} content - LLM返回的原始内容
   * @param {string} dimension - 分析维度
   * @returns {Object} 解析结果
   */
  parse(content, dimension) {
    try {
      if (!content || typeof content !== 'string') {
        return {
          success: false,
          error: '内容为空或格式错误',
          data: this.getFallback(dimension),
          strategy: 'empty_content_fallback'
        };
      }

      const trimmedContent = content.trim();
      if (!trimmedContent) {
        return {
          success: false,
          error: '内容为空',
          data: this.getFallback(dimension),
          strategy: 'empty_content_fallback'
        };
      }

      // 使用best-effort-json-parser解析（如果可用）
      if (this.bestEffortParse) {
        try {
          const parseResult = this.bestEffortParse(trimmedContent);
          
          if (parseResult && typeof parseResult === 'object') {
            return {
              success: true,
              data: this.normalizeData(parseResult, dimension),
              strategy: 'best_effort_success'
            };
          }
        } catch (error) {
          console.warn('best-effort-json-parser解析失败，尝试手动解析:', error.message);
        }
      }
      
      // 手动解析或best-effort-json-parser不可用时的fallback
      const manualResult = this.tryManualParse(trimmedContent, dimension);
      
      if (manualResult.success) {
        return {
          success: true,
          data: manualResult.data,
          strategy: this.bestEffortParse ? 'manual_parse_success' : 'native_json_success'
        };
      } else {
        return {
          success: false,
          error: manualResult.error || 'JSON解析失败',
          data: this.getFallback(dimension),
          strategy: 'parse_error_fallback'
        };
      }
      
    } catch (error) {
      console.error('解析器异常:', error);
      
      return {
        success: false,
        error: error.message,
        data: this.getFallback(dimension),
        strategy: 'exception_fallback'
      };
    }
  }

  /**
   * 手动解析JSON（当best-effort-json-parser失败时的备用方案）
   * @param {string} content - 原始内容
   * @param {string} dimension - 分析维度
   * @returns {Object} 解析结果
   */
  tryManualParse(content, dimension) {
    try {
      // 尝试提取JSON部分
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          success: false,
          error: '未找到JSON格式内容'
        };
      }

      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      
      return {
        success: true,
        data: this.normalizeData(parsed, dimension)
      };
      
    } catch (error) {
      return {
        success: false,
        error: `手动解析失败: ${error.message}`
      };
    }
  }

  /**
   * 标准化数据格式
   * @param {Object} data - 原始数据
   * @param {string} dimension - 分析维度
   * @returns {Object} 标准化后的数据
   */
  normalizeData(data, dimension) {
    if (!data || typeof data !== 'object') {
      return this.getFallback(dimension);
    }

    switch (dimension) {
      case 'performance':
        return this.normalizePerformanceData(data);
      case 'security':
        return this.normalizeSecurityData(data);
      case 'standards':
        return this.normalizeStandardsData(data);
      case 'generic':
        return this.normalizeGenericData(data);
      default:
        return this.normalizeGenericData(data);
    }
  }

  /**
   * 标准化性能数据
   * @param {Object} data - 原始数据
   * @returns {Object} 标准化数据
   */
  normalizePerformanceData(data) {
    return {
      summary: data.summary || data.description || '性能分析完成',
      issues: Array.isArray(data.issues) ? data.issues : 
             Array.isArray(data.problems) ? data.problems : [],
      recommendations: Array.isArray(data.recommendations) ? data.recommendations : 
                       Array.isArray(data.suggestions) ? data.suggestions : [],
      confidence: this.extractConfidence(data),
      metrics: data.metrics || {},
      executionPlan: data.executionPlan || null
    };
  }

  /**
   * 标准化安全数据
   * @param {Object} data - 原始数据
   * @returns {Object} 标准化数据
   */
  normalizeSecurityData(data) {
    return {
      summary: data.summary || data.description || '安全分析完成',
      vulnerabilities: Array.isArray(data.vulnerabilities) ? data.vulnerabilities : 
                       Array.isArray(data.issues) ? data.issues : [],
      recommendations: Array.isArray(data.recommendations) ? data.recommendations : 
                       Array.isArray(data.suggestions) ? data.suggestions : [],
      confidence: this.extractConfidence(data),
      riskLevel: data.riskLevel || 'unknown',
      securityScore: data.securityScore || null
    };
  }

  /**
   * 标准化规范数据
   * @param {Object} data - 原始数据
   * @returns {Object} 标准化数据
   */
  normalizeStandardsData(data) {
    return {
      summary: data.summary || data.description || '规范检查完成',
      violations: Array.isArray(data.violations) ? data.violations : 
                  Array.isArray(data.issues) ? data.issues : [],
      recommendations: Array.isArray(data.recommendations) ? data.recommendations : 
                       Array.isArray(data.suggestions) ? data.suggestions : [],
      confidence: this.extractConfidence(data),
      complianceScore: data.complianceScore || null,
      standards: data.standards || []
    };
  }

  /**
   * 标准化通用数据
   * @param {Object} data - 原始数据
   * @returns {Object} 标准化数据
   */
  normalizeGenericData(data) {
    return {
      summary: data.summary || data.description || '分析完成',
      issues: Array.isArray(data.issues) ? data.issues : [],
      recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
      confidence: this.extractConfidence(data),
      // 保留所有原始字段，包括 rules 和 new_rules
      ...data
    };
  }

  /**
   * 提取置信度
   * @param {Object} data - 数据对象
   * @returns {number} 置信度 (0-1)
   */
  extractConfidence(data) {
    if (typeof data.confidence === 'number' && data.confidence >= 0 && data.confidence <= 1) {
      return data.confidence;
    }
    
    if (typeof data.confidence === 'string') {
      const parsed = parseFloat(data.confidence);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        return parsed;
      }
    }
    
    // 根据数据完整性估算置信度
    const hasSummary = !!(data.summary || data.description);
    const hasIssues = Array.isArray(data.issues) && data.issues.length > 0;
    const hasRecommendations = Array.isArray(data.recommendations) && data.recommendations.length > 0;
    
    const score = [hasSummary, hasIssues, hasRecommendations].filter(Boolean).length / 3;
    return Math.max(0.3, Math.min(1.0, score));
  }

  /**
   * 获取fallback数据
   * @param {string} dimension - 分析维度
   * @returns {Object} fallback数据
   */
  getFallback(dimension) {
    return {
      ...this.fallbackData[dimension] || this.fallbackData.performance,
      isFallback: true
    };
  }

  /**
   * 验证解析结果
   * @param {Object} result - 解析结果
   * @returns {boolean} 是否有效
   */
  validate(result) {
    if (!result || typeof result !== 'object') {
      return false;
    }
    
    return result.success === true && 
           typeof result.data === 'object' && 
           result.data !== null;
  }

  /**
   * 获取解析统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      version: '1.0.0',
      supportedDimensions: Object.keys(this.fallbackData),
      features: ['best_effort_parsing', 'manual_fallback', 'data_normalization']
    };
  }
}

// 创建全局实例
const llmJsonParser = new LlmJsonParser();

// 导出类和实例
export { LlmJsonParser, llmJsonParser };
export default llmJsonParser;