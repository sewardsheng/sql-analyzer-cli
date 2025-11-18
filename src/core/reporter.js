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
    
    // 检查是否为快速分析模式
    if (integratedResults.quickAnalysis) {
      return this.generateQuickReport(sqlQuery, parsedSQL, databaseType, integratedResults.quickAnalysis);
    }
    
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
   * 生成快速分析报告
   * @param {string} sqlQuery - SQL查询
   * @param {string} parsedSQL - 解析后的SQL
   * @param {string} databaseType - 数据库类型
   * @param {Object} quickAnalysis - 快速分析结果
   * @returns {Object} 快速分析报告
   */
  generateQuickReport(sqlQuery, parsedSQL, databaseType, quickAnalysis) {
    const quickData = quickAnalysis.data || quickAnalysis;
    const quickScore = quickData.quickScore || 0;
    
    // 生成快速分析摘要
    const summary = `SQL快速分析完成，快速评分: ${quickScore}/100`;
    
    // 收集快速建议
    const recommendations = this.collectQuickRecommendations(quickData);
    
    return {
      summary,
      quickAnalysis: {
        score: quickScore,
        databaseType: quickData.databaseType || databaseType,
        criticalIssues: quickData.criticalIssues || [],
        quickSuggestions: quickData.quickSuggestions || []
      },
      queryOverview: {
        originalQuery: sqlQuery,
        normalizedQuery: parsedSQL,
        databaseType: quickData.databaseType || databaseType,
        complexity: '快速分析'
      },
      overallAssessment: {
        score: quickScore,
        recommendations: recommendations.slice(0, 5)
      }
    };
  }

  /**
   * 收集快速分析建议
   * @param {Object} quickData - 快速分析数据
   * @returns {Array} 建议列表
   */
  collectQuickRecommendations(quickData) {
    const recommendations = [];
    
    // 收集快速建议
    if (quickData.quickSuggestions) {
      quickData.quickSuggestions.forEach(s => {
        recommendations.push(`[快速] ${s.description}`);
      });
    }
    
    // 收集关键问题建议
    if (quickData.criticalIssues) {
      quickData.criticalIssues.forEach(issue => {
        if (issue.severity === '高') {
          recommendations.push(`[关键] ${issue.description}`);
        }
      });
    }
    
    return recommendations;
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
   * 收集所有建议并按优先级排序
   * @param {Object} integratedResults - 整合的分析结果
   * @returns {Array} 按优先级排序的建议列表
   */
  collectRecommendations(integratedResults) {
    const recommendations = [];
    
    // 从性能分析提取优化建议
    if (integratedResults.performanceAnalysis?.success) {
      const perfData = integratedResults.performanceAnalysis.data;
      
      // 瓶颈相关建议
      (perfData.bottlenecks || []).forEach(b => {
        recommendations.push({
          category: '性能',
          severity: b.severity || '中',
          type: b.type,
          description: b.description,
          impact: b.impact,
          suggestion: `优化${b.type}: ${b.description}`,
          effort: this.estimateEffort(b.severity)
        });
      });
      
      // 索引建议
      (perfData.indexRecommendations || []).forEach(idx => {
        recommendations.push({
          category: '性能',
          severity: '中',
          type: '索引优化',
          description: `在${idx.table}表的${idx.columns.join(', ')}列创建${idx.indexType}索引`,
          impact: idx.reason,
          suggestion: `CREATE ${idx.indexType} INDEX idx_${idx.table}_${idx.columns.join('_')} ON ${idx.table}(${idx.columns.join(', ')})`,
          effort: '中'
        });
      });
      
      // 直接的优化建议
      (perfData.optimizationSuggestions || []).forEach(opt => {
        recommendations.push({
          category: '性能',
          severity: '中',
          type: opt.category || '查询优化',
          description: opt.description,
          impact: opt.expectedImprovement,
          suggestion: opt.example || opt.description,
          effort: '低'
        });
      });
    }
    
    // 从安全审计提取修复建议
    if (integratedResults.securityAudit?.success) {
      const secData = integratedResults.securityAudit.data;
      
      // 漏洞修复建议
      (secData.vulnerabilities || []).forEach(v => {
        recommendations.push({
          category: '安全',
          severity: v.severity || '高',
          type: v.type,
          description: v.description,
          impact: v.impact,
          suggestion: `修复${v.type}漏洞`,
          effort: this.estimateEffort(v.severity)
        });
      });
      
      // 安全修复建议
      (secData.recommendations || []).forEach(rec => {
        recommendations.push({
          category: '安全',
          severity: rec.priority === '高' ? '高' : '中',
          type: rec.category || '安全修复',
          description: rec.description,
          impact: '提升安全性',
          suggestion: rec.example || rec.description,
          effort: rec.priority === '高' ? '低' : '中'
        });
      });
    }
    
    // 从编码规范提取改进建议
    if (integratedResults.standardsCheck?.success) {
      const stdData = integratedResults.standardsCheck.data;
      
      // 违规修复建议
      (stdData.violations || []).forEach(v => {
        recommendations.push({
          category: '规范',
          severity: v.severity || '低',
          type: v.type,
          description: v.description,
          impact: v.impact || '提升代码可读性',
          suggestion: v.suggestion || `修复${v.type}违规`,
          effort: '低'
        });
      });
      
      // 最佳实践建议
      (stdData.bestPractices || []).forEach(bp => {
        recommendations.push({
          category: '规范',
          severity: '低',
          type: '最佳实践',
          description: bp.description || bp,
          impact: '提升代码质量',
          suggestion: bp.example || bp.description || bp,
          effort: '低'
        });
      });
    }
    
    // 按优先级排序
    return this.prioritizeRecommendations(recommendations);
  }
  
  /**
   * 按优先级排序建议
   * @param {Array} recommendations - 建议列表
   * @returns {Array} 排序后的建议列表
   */
  prioritizeRecommendations(recommendations) {
    const severityWeight = { '高': 3, 'high': 3, '中': 2, 'medium': 2, '低': 1, 'low': 1 };
    const effortWeight = { '低': 3, 'low': 3, '中': 2, 'medium': 2, '高': 1, 'high': 1 };
    const categoryWeight = { '安全': 3, '性能': 2, '规范': 1 };
    
    return recommendations
      .map(rec => ({
        ...rec,
        priority: (
          (severityWeight[rec.severity] || 1) * 0.5 +
          (effortWeight[rec.effort] || 1) * 0.3 +
          (categoryWeight[rec.category] || 1) * 0.2
        )
      }))
      .sort((a, b) => b.priority - a.priority)
      .map(rec => `[${rec.category}] ${rec.description}`);
  }
  
  /**
   * 估算修复工作量
   * @param {string} severity - 严重程度
   * @returns {string} 工作量评估
   */
  estimateEffort(severity) {
    const severityMap = {
      '高': '低',  // 高优先级问题通常有明确解决方案,工作量反而低
      'high': '低',
      '中': '中',
      'medium': '中',
      '低': '低',
      'low': '低'
    };
    return severityMap[severity] || '中';
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
   * 构建优化建议部分(从前3个分析器整合)
   */
  buildOptimizationSection(integratedResults) {
    // 整合所有优化建议
    const allSuggestions = this.mergeOptimizationSuggestions(integratedResults);
    
    if (allSuggestions.length === 0) return null;
    
    // 生成实施计划
    const implementationPlan = this.generateImplementationPlan(allSuggestions);
    
    // 生成查询重写(如果适用)
    const queryRewrites = this.generateQueryRewrites(integratedResults);
    
    return {
      optimizationPotential: this.assessOptimizationPotential(integratedResults),
      priorityIssues: allSuggestions.slice(0, 5).map(s => ({
        category: s.category,
        type: s.type,
        severity: s.severity,
        description: s.description,
        impact: s.impact,
        effort: s.effort
      })),
      implementationPlan: implementationPlan,
      queryRewrites: queryRewrites,
      topSuggestions: allSuggestions.slice(0, 3).map(s => ({
        category: s.category,
        type: s.type,
        description: s.description
      }))
    };
  }
  
  /**
   * 整合所有优化建议
   * @param {Object} integratedResults - 整合的分析结果
   * @returns {Array} 优化建议列表
   */
  mergeOptimizationSuggestions(integratedResults) {
    const suggestions = [];
    
    // 从性能分析提取
    if (integratedResults.performanceAnalysis?.success) {
      const perfData = integratedResults.performanceAnalysis.data;
      
      (perfData.bottlenecks || []).forEach(b => {
        suggestions.push({
          category: '性能',
          type: b.type,
          severity: b.severity,
          description: b.description,
          impact: b.impact,
          effort: this.estimateEffort(b.severity)
        });
      });
      
      (perfData.optimizationSuggestions || []).forEach(opt => {
        suggestions.push({
          category: '性能',
          type: opt.category || '查询优化',
          severity: '中',
          description: opt.description,
          impact: opt.expectedImprovement,
          effort: '低'
        });
      });
      
      (perfData.indexRecommendations || []).forEach(idx => {
        suggestions.push({
          category: '性能',
          type: '索引优化',
          severity: '中',
          description: `在${idx.table}表的${idx.columns.join(', ')}列创建${idx.indexType}索引`,
          impact: idx.reason,
          effort: '中'
        });
      });
    }
    
    // 从安全审计提取
    if (integratedResults.securityAudit?.success) {
      const secData = integratedResults.securityAudit.data;
      
      (secData.vulnerabilities || []).forEach(v => {
        suggestions.push({
          category: '安全',
          type: v.type,
          severity: v.severity,
          description: v.description,
          impact: v.impact,
          effort: this.estimateEffort(v.severity)
        });
      });
      
      (secData.recommendations || []).forEach(rec => {
        suggestions.push({
          category: '安全',
          type: rec.category || '安全修复',
          severity: rec.priority === '高' ? '高' : '中',
          description: rec.description,
          impact: '提升安全性',
          effort: rec.priority === '高' ? '低' : '中'
        });
      });
    }
    
    // 从编码规范提取
    if (integratedResults.standardsCheck?.success) {
      const stdData = integratedResults.standardsCheck.data;
      
      (stdData.violations || []).forEach(v => {
        suggestions.push({
          category: '规范',
          type: v.type,
          severity: v.severity || '低',
          description: v.description,
          impact: v.impact || '提升代码质量',
          effort: '低'
        });
      });
    }
    
    return this.prioritizeSuggestions(suggestions);
  }
  
  /**
   * 按优先级排序建议(用于优化建议部分)
   * @param {Array} suggestions - 建议列表
   * @returns {Array} 排序后的建议
   */
  prioritizeSuggestions(suggestions) {
    const severityWeight = { '高': 3, 'high': 3, '中': 2, 'medium': 2, '低': 1, 'low': 1 };
    const effortWeight = { '低': 3, 'low': 3, '中': 2, 'medium': 2, '高': 1, 'high': 1 };
    const categoryWeight = { '安全': 3, '性能': 2, '规范': 1 };
    
    return suggestions
      .map(s => ({
        ...s,
        priority: (
          (severityWeight[s.severity] || 1) * 0.5 +
          (effortWeight[s.effort] || 1) * 0.3 +
          (categoryWeight[s.category] || 1) * 0.2
        )
      }))
      .sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * 生成实施计划
   * @param {Array} suggestions - 优化建议
   * @returns {Array} 实施步骤
   */
  generateImplementationPlan(suggestions) {
    const plan = [];
    
    // 按类别分组
    const grouped = {
      '安全': suggestions.filter(s => s.category === '安全'),
      '性能': suggestions.filter(s => s.category === '性能'),
      '规范': suggestions.filter(s => s.category === '规范')
    };
    
    let stepNumber = 1;
    
    // 优先处理安全问题
    if (grouped['安全'].length > 0) {
      plan.push({
        step: stepNumber++,
        phase: '紧急修复',
        description: '修复安全漏洞',
        tasks: grouped['安全'].slice(0, 3).map(s => s.description),
        dependencies: []
      });
    }
    
    // 性能优化
    if (grouped['性能'].length > 0) {
      const perfTasks = grouped['性能'].slice(0, 3);
      
      // 索引优化(如果有)
      const indexTasks = perfTasks.filter(s => s.type?.includes('索引'));
      if (indexTasks.length > 0) {
        const prevSteps = grouped['安全'].length > 0 ? [1] : [];
        plan.push({
          step: stepNumber++,
          phase: '性能优化',
          description: '创建必要的索引',
          tasks: indexTasks.map(s => s.description),
          dependencies: prevSteps
        });
      }
      
      // 查询优化
      const queryTasks = perfTasks.filter(s => !s.type?.includes('索引'));
      if (queryTasks.length > 0) {
        const prevSteps = indexTasks.length > 0 ? [stepNumber - 1] : [];
        plan.push({
          step: stepNumber++,
          phase: '性能优化',
          description: '优化SQL查询',
          tasks: queryTasks.map(s => s.description),
          dependencies: prevSteps
        });
      }
    }
    
    // 规范改进
    if (grouped['规范'].length > 0) {
      plan.push({
        step: stepNumber++,
        phase: '代码规范',
        description: '改进代码规范',
        tasks: grouped['规范'].slice(0, 3).map(s => s.description),
        dependencies: []
      });
    }
    
    // 验证测试
    plan.push({
      step: stepNumber++,
      phase: '验证测试',
      description: '测试优化效果',
      tasks: ['使用EXPLAIN分析执行计划', '性能基准测试', '回归测试'],
      dependencies: plan.length > 0 ? [plan.length] : []
    });
    
    return plan;
  }
  
  /**
   * 生成查询重写建议
   * @param {Object} integratedResults - 整合的分析结果
   * @returns {Array} 查询重写列表
   */
  generateQueryRewrites(integratedResults) {
    const rewrites = [];
    
    // 从性能分析提取重写建议
    if (integratedResults.performanceAnalysis?.success) {
      const perfData = integratedResults.performanceAnalysis.data;
      
      // 检查是否有子查询优化建议
      (perfData.bottlenecks || []).forEach(b => {
        if (b.type?.includes('子查询') && b.location) {
          rewrites.push({
            type: '子查询优化',
            description: '将子查询改写为JOIN',
            reason: b.description,
            benefit: b.impact || '性能提升30-70%'
          });
        }
        
        // 检查全表扫描
        if (b.type?.includes('全表扫描') && b.location) {
          rewrites.push({
            type: '索引优化',
            description: '添加索引避免全表扫描',
            reason: b.description,
            benefit: '性能提升10-100倍'
          });
        }
      });
    }
    
    // 从安全审计提取重写建议
    if (integratedResults.securityAudit?.success) {
      const secData = integratedResults.securityAudit.data;
      
      (secData.vulnerabilities || []).forEach(v => {
        if (v.type?.includes('SQL注入') || v.type?.includes('注入')) {
          rewrites.push({
            type: '安全修复',
            description: '使用参数化查询',
            reason: v.description,
            benefit: '完全消除SQL注入风险'
          });
        }
      });
    }
    
    return rewrites;
  }
  
  /**
   * 评估优化潜力
   * @param {Object} integratedResults - 整合的分析结果
   * @returns {string} 优化潜力评估
   */
  assessOptimizationPotential(integratedResults) {
    let score = 0;
    let count = 0;
    
    if (integratedResults.performanceAnalysis?.success) {
      score += 100 - (integratedResults.performanceAnalysis.data.performanceScore || 50);
      count++;
    }
    
    if (integratedResults.securityAudit?.success) {
      score += 100 - (integratedResults.securityAudit.data.securityScore || 50);
      count++;
    }
    
    if (integratedResults.standardsCheck?.success) {
      score += 100 - (integratedResults.standardsCheck.data.standardsScore || 50);
      count++;
    }
    
    const avgGap = count > 0 ? score / count : 0;
    
    if (avgGap > 50) return '高';
    if (avgGap > 30) return '中';
    return '低';
  }

  /**
   * 提取优化后的SQL(暂时保留兼容性)
   */
  extractOptimizedSql(integratedResults) {
    // 优先从optimizationSuggestions提取(向后兼容)
    if (integratedResults.optimizationSuggestions?.success &&
        integratedResults.optimizationSuggestions.data.optimizedSqlData) {
      return integratedResults.optimizationSuggestions.data.optimizedSqlData;
    }
    
    // 未来可以从前3个分析器生成优化SQL
    return null;
  }

  /**
   * 打印分析结果摘要到控制台
   * @param {Object} integratedResults - 整合的分析结果
   */
  printSummary(integratedResults) {
    // 检查是否为快速分析模式
    if (integratedResults.quickAnalysis) {
      this.printQuickSummary(integratedResults.quickAnalysis);
      return;
    }
    
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

  /**
   * 打印快速分析结果摘要到控制台
   * @param {Object} quickAnalysis - 快速分析结果
   */
  printQuickSummary(quickAnalysis) {
    const quickData = quickAnalysis.data || quickAnalysis;
    
    console.log("⚡ 快速分析结果:");
    console.log('='.repeat(60));
    
    // 快速评分
    console.log(`\n📊 快速评分: ${quickData.quickScore || '未知'}/100`);
    console.log(`🗄️  数据库类型: ${quickData.databaseType || '未知'}`);
    
    // 关键问题
    if (quickData.criticalIssues && quickData.criticalIssues.length > 0) {
      console.log("\n⚠️  关键问题:");
      quickData.criticalIssues.forEach((issue, index) => {
        const severityIcon = issue.severity === '高' ? '🔴' : issue.severity === '中' ? '🟡' : '🟢';
        console.log(`   ${index + 1}. ${severityIcon} [${issue.type}] ${issue.description}`);
        if (issue.location) {
          console.log(`      位置: ${issue.location}`);
        }
      });
    } else {
      console.log("\n✅ 未发现关键问题");
    }
    
    // 快速建议
    if (quickData.quickSuggestions && quickData.quickSuggestions.length > 0) {
      console.log("\n💡 快速建议:");
      quickData.quickSuggestions.forEach((suggestion, index) => {
        console.log(`   ${index + 1}. [${suggestion.category}] ${suggestion.description}`);
        if (suggestion.example && suggestion.example !== '保持当前写法') {
          console.log(`      示例: ${suggestion.example}`);
        }
      });
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

export default ReportGenerator;