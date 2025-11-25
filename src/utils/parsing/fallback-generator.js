/**
 * 降级响应生成器
 * 当所有解析策略都失败时，生成最小可用的响应结构
 */

class FallbackResponseGenerator {
  /**
   * 生成降级响应
   * @param {string} originalContent - 原始LLM响应内容
   * @param {string} analyzerType - 分析器类型
   * @returns {Object} 降级响应数据
   */
  static generate(originalContent, analyzerType) {
    const templates = {
      performance: this.generatePerformanceFallback,
      security: this.generateSecurityFallback,
      standards: this.generateStandardsFallback
    };
    
    const generator = templates[analyzerType];
    if (!generator) {
      console.warn(`未知的分析器类型: ${analyzerType}，使用通用降级响应`);
      return this.generateGenericFallback(originalContent);
    }
    
    const fallbackData = generator(originalContent);
    
    // 尝试从原始内容中提取一些有用信息
    const extractedInfo = this.extractUsefulInfo(originalContent);
    
    // 合并提取的信息
    return this.mergeExtractedInfo(fallbackData, extractedInfo);
  }
  
  /**
   * 生成性能分析降级响应
   * @param {string} content - 原始内容
   * @returns {Object} 性能分析降级响应
   */
  static generatePerformanceFallback(content) {
    return {
      score: 0,
      confidence: 0.1,
      executionPlan: {
        estimatedCost: 0,
        estimatedRows: 0,
        operations: []
      },
      issues: [],
      optimizations: [],
      metrics: {
        estimatedExecutionTime: "未知",
        ioOperations: 0,
        memoryUsage: "未知",
        cpuComplexity: "Unknown",
        parallelismPotential: "Unknown"
      },
      recommendations: [{
        category: "Query",
        priority: "Medium",
        description: "无法完成详细性能分析，建议手动检查查询",
        implementation: "请检查查询语法和执行计划"
      }]
    };
  }
  
  /**
   * 生成安全审计降级响应
   * @param {string} content - 原始内容
   * @returns {Object} 安全审计降级响应
   */
  static generateSecurityFallback(content) {
    return {
      score: 0,
      confidence: 0.1,
      threatLevel: "未知",
      attackSurface: {
        totalVectors: 0,
        highRiskVectors: 0,
        exploitableVectors: 0
      },
      vulnerabilities: [],
      recommendations: [{
        category: "Security",
        priority: "High",
        description: "无法完成安全分析，建议进行手动安全审查",
        implementation: "请检查SQL注入风险和权限控制"
      }],
      securityMetrics: {
        totalVulnerabilities: 0,
        criticalVulnerabilities: 0,
        highRiskVulnerabilities: 0,
        exploitableVulnerabilities: 0,
        complianceViolations: 0,
        securityPosture: "Unknown"
      }
    };
  }
  
  /**
   * 生成编码规范检查降级响应
   * @param {string} content - 原始内容
   * @returns {Object} 编码规范检查降级响应
   */
  static generateStandardsFallback(content) {
    return {
      score: 0,
      confidence: 0.1,
      qualityLevel: "未知",
      standardsCompliance: {
        overallCompliance: 0,
        namingCompliance: 0,
        formattingCompliance: 0,
        structuralCompliance: 0,
        documentationCompliance: 0
      },
      complexityMetrics: {
        cyclomaticComplexity: 0,
        nestingDepth: 0,
        queryLength: 0,
        joinCount: 0,
        subqueryCount: 0,
        complexityLevel: "未知"
      },
      violations: [],
      recommendations: [{
        category: "Standards",
        priority: "Medium",
        description: "无法完成编码规范检查，建议进行手动代码审查",
        implementation: "请检查命名约定、格式化和结构规范"
      }],
      qualityMetrics: {
        readabilityScore: 0,
        maintainabilityIndex: 0,
        documentationCoverage: 0,
        standardsAdherence: 0,
        codeComplexity: "未知",
        technicalDebt: "未知"
      }
    };
  }
  
  /**
   * 生成通用降级响应
   * @param {string} content - 原始内容
   * @returns {Object} 通用降级响应
   */
  static generateGenericFallback(content) {
    return {
      score: 0,
      confidence: 0.1,
      issues: [],
      recommendations: [{
        category: "General",
        priority: "Medium",
        description: "分析失败，请检查输入和系统状态",
        implementation: "请重新尝试或联系技术支持"
      }]
    };
  }
  
  /**
   * 从原始内容中提取有用信息
   * @param {string} content - 原始内容
   * @returns {Object} 提取的信息
   */
  static extractUsefulInfo(content) {
    const info = {};
    
    try {
      // 提取评分
      const scoreMatch = content.match(/["']?score["']?\s*:\s*([0-9.]+)/i);
      if (scoreMatch) {
        info.score = parseFloat(scoreMatch[1]);
      }
      
      // 提取置信度
      const confidenceMatch = content.match(/["']?confidence["']?\s*:\s*([0-9.]+)/i);
      if (confidenceMatch) {
        info.confidence = parseFloat(confidenceMatch[1]);
      }
      
      // 提取风险等级
      const riskMatch = content.match(/["']?(?:risk|threat)level["']?\s*:\s*["']([^"']+)["']/i);
      if (riskMatch) {
        info.riskLevel = riskMatch[1];
      }
      
      // 提取数据库类型
      const dbMatch = content.match(/["']?(?:database|db)type["']?\s*:\s*["']([^"']+)["']/i);
      if (dbMatch) {
        info.databaseType = dbMatch[1];
      }
      
      // 提取问题描述
      const descriptionMatch = content.match(/["']?(?:description|error|message)["']?\s*:\s*["']([^"']+)["']/i);
      if (descriptionMatch) {
        info.description = descriptionMatch[1];
      }
      
    } catch (error) {
      console.warn('提取信息时出错:', error.message);
    }
    
    return info;
  }
  
  /**
   * 合并提取的信息到降级响应中
   * @param {Object} fallbackData - 降级响应数据
   * @param {Object} extractedInfo - 提取的信息
   * @returns {Object} 合并后的响应
   */
  static mergeExtractedInfo(fallbackData, extractedInfo) {
    const merged = { ...fallbackData };
    
    // 更新评分
    if (extractedInfo.score !== undefined && !isNaN(extractedInfo.score)) {
      merged.score = Math.min(100, Math.max(0, extractedInfo.score));
    }
    
    // 更新置信度
    if (extractedInfo.confidence !== undefined && !isNaN(extractedInfo.confidence)) {
      merged.confidence = Math.min(1, Math.max(0, extractedInfo.confidence));
    }
    
    // 添加数据库类型
    if (extractedInfo.databaseType) {
      merged.databaseType = extractedInfo.databaseType;
    }
    
    // 添加风险等级
    if (extractedInfo.riskLevel) {
      merged.riskLevel = extractedInfo.riskLevel;
    }
    
    // 如果有描述信息，添加到建议中
    if (extractedInfo.description) {
      if (merged.recommendations && merged.recommendations.length > 0) {
        merged.recommendations[0].description += ` (${extractedInfo.description})`;
      }
    }
    
    // 添加解析失败标记
    merged.parseFailure = true;
    merged.parseFailureReason = "所有JSON解析策略失败，使用降级响应";
    
    return merged;
  }
  
  /**
   * 生成错误报告
   * @param {string} originalContent - 原始内容
   * @param {string} analyzerType - 分析器类型
   * @param {Error} error - 错误对象
   * @returns {Object} 错误报告
   */
  static generateErrorReport(originalContent, analyzerType, error) {
    return {
      timestamp: new Date().toISOString(),
      analyzerType,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      contentInfo: {
        length: originalContent.length,
        lineCount: originalContent.split('\n').length,
        hasJson: originalContent.includes('{'),
        hasCodeBlock: originalContent.includes('```')
      },
      fallbackUsed: true
    };
  }
  
  /**
   * 获取降级响应统计
   * @returns {Object} 统计信息
   */
  static getFallbackStats() {
    return {
      supportedAnalyzers: ['performance', 'security', 'standards'],
      defaultScore: 0,
      defaultConfidence: 0.1,
      extractionFields: [
        'score',
        'confidence', 
        'riskLevel',
        'databaseType',
        'description'
      ]
    };
  }
}

export default FallbackResponseGenerator;
export { FallbackResponseGenerator };