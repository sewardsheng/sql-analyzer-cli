/**
 * 分析报告生成模块
 * 负责生成简化的综合分析报告
 */

/**
 * 报告生成器
 */
class ReportGenerator {
  /**
   * 生成简化的综合报告（不使用LLM）
   * @param {Object} input - 输入参数
   * @returns {Object} 综合报告
   */
  generateReport(input) {
    const { sqlQuery, parsedSQL, databaseType, integratedResults } = input;
    
    // 安全审计一票否决机制
    const securityVeto = this.checkSecurityVeto(integratedResults.securityAudit);
    
    // 计算总体评分
    const overallScore = this.calculateOverallScore(integratedResults, securityVeto);
    
    // 收集所有建议
    const recommendations = this.collectRecommendations(integratedResults);
    
    // 生成摘要信息
    const summary = this.generateSummary(overallScore, securityVeto);
    
    return {
      summary,
      securityVeto,
      queryOverview: this.buildQueryOverview(sqlQuery, parsedSQL, databaseType, integratedResults),
      performanceAnalysis: this.buildPerformanceSection(integratedResults),
      securityAudit: this.buildSecuritySection(integratedResults),
      standardsCheck: this.buildStandardsSection(integratedResults),
      optimizationSuggestions: this.buildOptimizationSection(integratedResults),
      optimizedSql: this.extractOptimizedSql(integratedResults),
      overallAssessment: {
        score: overallScore,
        recommendations: recommendations.slice(0, 10)
      }
    };
  }

  /**
   * 检查安全一票否决
   * @param {Object} securityAudit - 安全审计结果
   * @returns {Object} 否决检查结果
   */
  checkSecurityVeto(securityAudit) {
    let veto = false;
    let score = null;
    let riskLevel = null;
    
    if (securityAudit?.success) {
      score = securityAudit.data.securityScore;
      riskLevel = securityAudit.data.riskLevel;
      
      // 安全评分低于40分或风险等级为"高"/"严重"时触发一票否决
      if (typeof score === 'number' && score < 40) {
        veto = true;
      }
      if (riskLevel && ['高', '严重', 'high', 'critical'].includes(riskLevel.toLowerCase())) {
        veto = true;
      }
    }
    
    return { veto, score, riskLevel };
  }

  /**
   * 计算总体评分
   * @param {Object} integratedResults - 整合的分析结果
   * @param {Object} securityVeto - 安全否决信息
   * @returns {number} 总体评分
   */
  calculateOverallScore(integratedResults, securityVeto) {
    if (securityVeto.veto) {
      return Math.min(30, securityVeto.score || 0);
    }
    
    const scores = [];
    
    // 收集各项评分
    if (integratedResults.performanceAnalysis?.success) {
      const score = integratedResults.performanceAnalysis.data.performanceScore;
      const numScore = this.parseScore(score);
      if (numScore !== null) scores.push(numScore);
    }
    
    if (securityVeto.score !== null) {
      const numScore = this.parseScore(securityVeto.score);
      if (numScore !== null) scores.push(numScore);
    }
    
    if (integratedResults.standardsCheck?.success) {
      const score = integratedResults.standardsCheck.data.standardsScore;
      const numScore = this.parseScore(score);
      if (numScore !== null) scores.push(numScore);
    }
    
    return scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
  }

  /**
   * 解析评分（处理字符串和数字类型）
   * @param {string|number} score - 评分
   * @returns {number|null} 数值评分
   */
  parseScore(score) {
    if (typeof score === 'number' && !isNaN(score)) {
      return score;
    }
    if (typeof score === 'string') {
      const numScore = parseFloat(score);
      if (!isNaN(numScore)) {
        return numScore;
      }
    }
    return null;
  }

  /**
   * 收集所有建议
   * @param {Object} integratedResults - 整合的分析结果
   * @returns {Array} 建议列表
   */
  collectRecommendations(integratedResults) {
    const recommendations = [];
    
    // 性能建议
    if (integratedResults.performanceAnalysis?.success) {
      const bottlenecks = integratedResults.performanceAnalysis.data.bottlenecks || [];
      bottlenecks.forEach(b => {
        if (b.recommendations) {
          recommendations.push(...b.recommendations.map(r => `[性能] ${r}`));
        }
      });
    }
    
    // 安全建议
    if (integratedResults.securityAudit?.success) {
      const vulnerabilities = integratedResults.securityAudit.data.vulnerabilities || [];
      vulnerabilities.forEach(v => {
        if (v.recommendations) {
          recommendations.push(...v.recommendations.map(r => `[安全] ${r}`));
        }
      });
    }
    
    // 规范建议
    if (integratedResults.standardsCheck?.success) {
      const violations = integratedResults.standardsCheck.data.violations || [];
      violations.forEach(v => {
        if (v.recommendations) {
          recommendations.push(...v.recommendations.map(r => `[规范] ${r}`));
        }
      });
    }
    
    // 优化建议
    if (integratedResults.optimizationSuggestions?.success) {
      const suggestions = integratedResults.optimizationSuggestions.data.optimizationSuggestions || [];
      suggestions.forEach(s => {
        recommendations.push(`[优化] ${s.description}`);
      });
    }
    
    return recommendations;
  }

  /**
   * 生成摘要信息
   * @param {number} overallScore - 总体评分
   * @param {Object} securityVeto - 安全否决信息
   * @returns {string} 摘要信息
   */
  generateSummary(overallScore, securityVeto) {
    let summary = `SQL分析完成，总体评分: ${overallScore}/100`;
    if (securityVeto.veto) {
      summary += ` ⚠️ 安全审计未通过（一票否决）`;
    }
    return summary;
  }

  /**
   * 构建查询概览
   */
  buildQueryOverview(sqlQuery, parsedSQL, databaseType, integratedResults) {
    return {
      originalQuery: sqlQuery,
      normalizedQuery: parsedSQL,
      databaseType: databaseType,
      complexity: integratedResults.performanceAnalysis?.data?.complexityLevel || '未知'
    };
  }

  /**
   * 构建性能分析部分
   */
  buildPerformanceSection(integratedResults) {
    if (!integratedResults.performanceAnalysis?.success) return null;
    
    const perfData = integratedResults.performanceAnalysis.data;
    return {
      score: perfData.performanceScore,
      complexity: perfData.complexityLevel,
      // 只保留前3个瓶颈的简短描述，减少重复
      topBottlenecks: perfData.bottlenecks?.slice(0, 3).map(b => ({
        type: b.type,
        severity: b.severity
      })) || [],
      optimizationPotential: integratedResults.optimizationSuggestions?.data?.optimizationPotential || '未知'
    };
  }

  /**
   * 构建安全审计部分
   */
  buildSecuritySection(integratedResults) {
    if (!integratedResults.securityAudit?.success) return null;
    
    const secData = integratedResults.securityAudit.data;
    return {
      score: secData.securityScore,
      riskLevel: secData.riskLevel,
      // 只保留前3个漏洞的简短描述，减少重复
      topVulnerabilities: secData.vulnerabilities?.slice(0, 3).map(v => ({
        type: v.type,
        severity: v.severity
      })) || []
    };
  }

  /**
   * 构建编码规范部分
   */
  buildStandardsSection(integratedResults) {
    if (!integratedResults.standardsCheck?.success) return null;
    
    const stdData = integratedResults.standardsCheck.data;
    return {
      score: stdData.standardsScore,
      complianceLevel: stdData.complianceLevel,
      // 只保留前3个违规的简短描述，减少重复
      topViolations: stdData.violations?.slice(0, 3).map(v => ({
        type: v.type,
        severity: v.severity
      })) || []
    };
  }

  /**
   * 构建优化建议部分
   */
  buildOptimizationSection(integratedResults) {
    if (!integratedResults.optimizationSuggestions?.success) return null;
    
    const optData = integratedResults.optimizationSuggestions.data;
    return {
      optimizationPotential: optData.optimizationPotential,
      // 只保留前3个建议的简短描述，减少重复
      topSuggestions: optData.optimizationSuggestions?.slice(0, 3).map(s => ({
        category: s.category,
        description: s.description
      })) || []
    };
  }

  /**
   * 提取优化后的SQL
   */
  extractOptimizedSql(integratedResults) {
    return integratedResults.optimizationSuggestions?.success && 
           integratedResults.optimizationSuggestions.data.optimizedSqlData
      ? integratedResults.optimizationSuggestions.data.optimizedSqlData
      : null;
  }

  /**
   * 打印分析结果摘要到控制台
   * @param {Object} integratedResults - 整合的分析结果
   */
  printSummary(integratedResults) {
    console.log("📋 分析结果摘要:");
    console.log('='.repeat(60));
    
    // 性能分析
    if (integratedResults.performanceAnalysis?.success) {
      const perf = integratedResults.performanceAnalysis.data;
      console.log("\n📊 性能分析:");
      console.log(`   评分: ${perf.performanceScore || '未知'}`);
      console.log(`   复杂度: ${perf.complexityLevel || '未知'}`);
      if (perf.bottlenecks?.length > 0) {
        console.log(`   主要瓶颈: ${perf.bottlenecks.slice(0, 2).map(b => b.description).join(', ')}`);
      }
    }
    
    // 安全审计（考虑一票否决机制）
    if (integratedResults.securityAudit?.success) {
      const sec = integratedResults.securityAudit.data;
      const securityVeto = this.checkSecurityVeto(integratedResults.securityAudit);
      
      console.log("\n🔒 安全审计:");
      console.log(`   评分: ${sec.securityScore || '未知'}`);
      console.log(`   风险等级: ${sec.riskLevel || '未知'}`);
      
      // 如果触发一票否决，添加警告提示
      if (securityVeto.veto) {
        console.log(`   ⚠️  警告: 触发安全一票否决机制（评分<40或风险等级为高/严重）`);
      }
      
      if (sec.vulnerabilities?.length > 0) {
        console.log(`   主要漏洞: ${sec.vulnerabilities.slice(0, 2).map(v => v.description).join(', ')}`);
      }
    }
    
    // 编码规范
    if (integratedResults.standardsCheck?.success) {
      const std = integratedResults.standardsCheck.data;
      console.log("\n📝 编码规范:");
      console.log(`   评分: ${std.standardsScore || '未知'}`);
      console.log(`   合规等级: ${std.complianceLevel || '未知'}`);
      if (std.violations?.length > 0) {
        console.log(`   主要违规: ${std.violations.slice(0, 2).map(v => v.description).join(', ')}`);
      }
    }
    
    // 优化建议
    if (integratedResults.optimizationSuggestions?.success) {
      const opt = integratedResults.optimizationSuggestions.data;
      console.log("\n💡 优化建议:");
      console.log(`   优化潜力: ${opt.optimizationPotential || '未知'}`);
      if (opt.optimizationSuggestions?.length > 0) {
        console.log("   关键建议:");
        opt.optimizationSuggestions.slice(0, 3).forEach((suggestion, index) => {
          console.log(`   ${index + 1}. ${suggestion.description}`);
        });
      }
    }
    
    // 规则学习
    if (integratedResults.ruleLearning) {
      console.log("\n🎓 规则学习:");
      if (integratedResults.ruleLearning.success) {
        console.log(`   状态: 成功`);
        if (integratedResults.ruleLearning.data?.mdFilePath) {
          console.log(`   Markdown规则已保存到: ${integratedResults.ruleLearning.data.mdFilePath}`);
        }
      } else {
        console.log(`   状态: 失败 - ${integratedResults.ruleLearning.error}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

export default ReportGenerator;