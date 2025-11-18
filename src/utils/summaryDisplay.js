import chalk from 'chalk';
import { createTerminalSQLDisplay } from './sqlHighlight.js';

// 风险等级定义
const RISK_LEVEL_CN = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '严重'
};

const RISK_LEVEL_ICONS = {
  low: '🟢',
  medium: '🟡',
  high: '🟠',
  critical: '🔴'
};

// 企业级评分权重配置
const ENTERPRISE_WEIGHTS = {
  security: 0.45,      // 安全审计权重45%（最重要）
  performance: 0.35,   // 性能分析权重35%（影响用户体验）
  standards: 0.20      // 语法规范权重20%（代码质量）
};

// 评分阈值配置
const SCORE_THRESHOLDS = {
  low: 75,      // 低风险阈值
  medium: 60,   // 中风险阈值
  high: 40,     // 高风险阈值
  critical: 0   // 严重风险阈值
};

// 大模型分析置信度调整
const CONFIDENCE_ADJUSTMENTS = {
  high: 0,      // 高置信度不调整
  medium: -2,   // 中等置信度扣2分
  low: -5       // 低置信度扣5分
};

/**
 * 计算整体风险等级 - 企业级评分算法
 * @param {Object} result - 分析结果
 * @returns {string} 风险等级
 */
export function calculateOverallRisk(result) {
  if (!result.success || !result.data) return 'low';
  
  const { analysisResults, report } = result.data;
  
  // 收集所有有效的评分
  const scores = {
    security: null,
    performance: null,
    standards: null
  };
  
  // 提取安全评分
  if (analysisResults?.securityAudit?.success &&
      typeof analysisResults.securityAudit.data?.securityScore === 'number') {
    scores.security = analysisResults.securityAudit.data.securityScore;
  }
  
  // 提取性能评分
  if (analysisResults?.performanceAnalysis?.success &&
      typeof analysisResults.performanceAnalysis.data?.performanceScore === 'number') {
    scores.performance = analysisResults.performanceAnalysis.data.performanceScore;
  }
  
  // 提取规范评分
  if (analysisResults?.standardsCheck?.success &&
      typeof analysisResults.standardsCheck.data?.standardsScore === 'number') {
    scores.standards = analysisResults.standardsCheck.data.standardsScore;
  }
  
  // 计算有效评分的数量
  const validScores = Object.values(scores).filter(s => s !== null);
  
  if (validScores.length === 0) {
    // 如果没有任何评分数据，默认为低风险
    return 'low';
  }
  
  // 企业级评分算法
  return calculateEnterpriseRisk(scores, analysisResults);
}

/**
 * 企业级风险计算算法
 * @param {Object} scores - 各维度评分
 * @param {Object} analysisResults - 分析结果
 * @returns {string} 风险等级
 */
function calculateEnterpriseRisk(scores, analysisResults) {
  // 1. 检查极端安全漏洞（真正的严重威胁）
  const criticalVulnerabilities = getCriticalVulnerabilities(analysisResults);
  if (criticalVulnerabilities.length > 0) {
    // 只有真正的严重漏洞才触发critical
    return 'critical';
  }
  
  // 2. 计算加权平均分（企业级权重）
  const weightedScore = calculateWeightedScore(scores);
  
  // 3. 基于业务场景的风险调整
  const businessRiskAdjustment = calculateBusinessRiskAdjustment(analysisResults);
  
  // 4. 最终评分计算
  const finalScore = Math.max(0, Math.min(100, weightedScore + businessRiskAdjustment));
  
  // 5. 企业级风险阈值（更宽松和现实）
  return determineRiskLevel(finalScore, scores, analysisResults);
}

/**
 * 获取真正的严重漏洞
 * @param {Object} analysisResults - 分析结果
 * @returns {Array} 严重漏洞列表
 */
function getCriticalVulnerabilities(analysisResults) {
  if (!analysisResults?.securityAudit?.success) {
    return [];
  }
  
  const vulnerabilities = analysisResults.securityAudit.data?.vulnerabilities || [];
  
  // 只考虑真正的严重安全威胁
  return vulnerabilities.filter(v => {
    const severity = v.severity?.toLowerCase();
    const type = v.type?.toLowerCase();
    
    // 真正的严重威胁类型
    const criticalTypes = [
      'sql注入',
      'sql injection',
      'union攻击',
      'union attack',
      '权限提升',
      'privilege escalation',
      '数据泄露',
      'data breach'
    ];
    
    // 必须是高严重程度且是严重威胁类型
    return (severity === 'critical' || severity === '严重' || severity === '高') &&
           criticalTypes.some(criticalType => type?.includes(criticalType));
  });
}

/**
 * 计算加权平均分 - 基于大模型分析的权重分配
 * @param {Object} scores - 各维度评分
 * @returns {number} 加权平均分
 */
function calculateWeightedScore(scores) {
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const [dimension, score] of Object.entries(scores)) {
    if (score !== null) {
      weightedSum += score * ENTERPRISE_WEIGHTS[dimension];
      totalWeight += ENTERPRISE_WEIGHTS[dimension];
    }
  }
  
  // 如果某些维度没有评分，按已有评分的权重比例重新计算
  const baseScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  
  // 应用大模型置信度调整
  return applyConfidenceAdjustment(baseScore, scores);
}

/**
 * 应用大模型分析置信度调整
 * @param {number} baseScore - 基础评分
 * @param {Object} scores - 各维度评分
 * @returns {number} 调整后的评分
 */
function applyConfidenceAdjustment(baseScore, scores) {
  let adjustment = 0;
  
  // 检查各维度评分的合理性（大模型可能过度乐观或悲观）
  if (scores.security !== null) {
    // 安全评分通常应该更保守
    if (scores.security > 90) {
      adjustment -= 3; // 过高的安全评分可能不够准确
    }
  }
  
  if (scores.performance !== null) {
    // 性能评分考虑执行计划预测的准确性
    if (scores.performance > 85) {
      adjustment -= 2; // 性能评分过高可能遗漏潜在问题
    }
  }
  
  return Math.max(0, baseScore + adjustment);
}

/**
 * 计算业务风险调整 - 基于大模型分析的特点
 * @param {Object} analysisResults - 分析结果
 * @returns {number} 调整分数
 */
function calculateBusinessRiskAdjustment(analysisResults) {
  let adjustment = 0;
  
  // 性能分析调整 - 基于执行计划预测
  if (analysisResults?.performanceAnalysis?.success) {
    const perfData = analysisResults.performanceAnalysis.data;
    
    // 执行计划瓶颈调整
    const bottlenecks = perfData.bottlenecks || [];
    bottlenecks.forEach(bottleneck => {
      const severity = bottleneck.severity?.toLowerCase();
      const type = bottleneck.type?.toLowerCase();
      
      // 不同类型瓶颈的权重调整
      if (severity === '高' || severity === 'high') {
        if (type?.includes('全表扫描') || type?.includes('full table scan')) {
          adjustment -= 8; // 全表扫描影响最大
        } else if (type?.includes('缺失索引') || type?.includes('missing index')) {
          adjustment -= 6; // 缺失索引次之
        } else if (type?.includes('临时表') || type?.includes('temporary table')) {
          adjustment -= 5; // 临时表影响
        } else {
          adjustment -= 4; // 其他高严重性瓶颈
        }
      } else if (severity === '中' || severity === 'medium') {
        adjustment -= 3; // 增加中等严重性瓶颈的扣分
      } else if (severity === '低' || severity === 'low') {
        adjustment -= 1; // 低严重性瓶颈轻微扣分
      }
    });
    
    // 复杂度调整
    const complexityLevel = perfData.complexityLevel?.toLowerCase();
    if (complexityLevel === '高' || complexityLevel === 'high') {
      adjustment -= 3; // 高复杂度查询风险更高
    }
  }
  
  // 安全审计调整 - 基于漏洞检测
  if (analysisResults?.securityAudit?.success) {
    const secData = analysisResults.securityAudit.data;
    const vulnerabilities = secData.vulnerabilities || [];
    
    vulnerabilities.forEach(vulnerability => {
      const severity = vulnerability.severity?.toLowerCase();
      const type = vulnerability.type?.toLowerCase();
      
      // SQL注入风险权重最高，但普通SQL注入不算critical
      if (type?.includes('sql注入') || type?.includes('sql injection')) {
        if (severity === '高' || severity === 'high') {
          adjustment -= 8; // 降低SQL注入高风险的扣分
        } else if (severity === '中' || severity === 'medium') {
          adjustment -= 5; // SQL注入中等风险
        }
      }
      // 权限越权风险
      else if (type?.includes('权限') || type?.includes('privilege')) {
        if (severity === '高' || severity === 'high') {
          adjustment -= 8; // 权限问题高风险
        } else if (severity === '中' || severity === 'medium') {
          adjustment -= 4; // 权限问题中等风险
        }
      }
      // 敏感数据泄露风险
      else if (type?.includes('敏感数据') || type?.includes('sensitive data')) {
        if (severity === '高' || severity === 'high') {
          adjustment -= 7; // 数据泄露高风险
        } else if (severity === '中' || severity === 'medium') {
          adjustment -= 3; // 数据泄露中等风险
        }
      }
      // 其他安全问题
      else {
        if (severity === '高' || severity === 'high') {
          adjustment -= 5;
        } else if (severity === '中' || severity === 'medium') {
          adjustment -= 2;
        }
      }
    });
  }
  
  // 语法与规范检查调整
  if (analysisResults?.standardsCheck?.success) {
    const stdData = analysisResults.standardsCheck.data;
    const violations = stdData.violations || [];
    
    violations.forEach(violation => {
      const severity = violation.severity?.toLowerCase();
      const type = violation.type?.toLowerCase();
      
      // 语法错误权重最高
      if (type?.includes('语法') || type?.includes('syntax')) {
        if (severity === '高' || severity === 'high') {
          adjustment -= 6; // 语法错误高风险
        } else if (severity === '中' || severity === 'medium') {
          adjustment -= 3; // 语法问题中等风险
        }
      }
      // 编码规范问题
      else if (type?.includes('规范') || type?.includes('standard')) {
        if (severity === '高' || severity === 'high') {
          adjustment -= 3; // 规范问题
        } else if (severity === '中' || severity === 'medium') {
          adjustment -= 1; // 轻微规范问题
        }
      }
    });
  }
  
  return adjustment;
}

/**
 * 确定风险等级 - 企业级阈值（基于大模型分析特点）
 * @param {number} finalScore - 最终评分
 * @param {Object} scores - 各维度评分
 * @param {Object} analysisResults - 分析结果
 * @returns {string} 风险等级
 */
function determineRiskLevel(finalScore, scores, analysisResults) {
  // 基础风险等级判定
  let riskLevel;
  if (finalScore >= SCORE_THRESHOLDS.low) riskLevel = 'low';
  else if (finalScore >= SCORE_THRESHOLDS.medium) riskLevel = 'medium';
  else if (finalScore >= SCORE_THRESHOLDS.high) riskLevel = 'high';
  else riskLevel = 'critical';
  
  // 基于大模型分析特点的特殊调整
  
  // 1. 安全维度特殊处理
  if (scores.security !== null) {
    // 安全评分极低时强制提升风险等级
    if (scores.security < 10) {
      if (riskLevel === 'low') riskLevel = 'medium';
      else if (riskLevel === 'medium') riskLevel = 'high';
      else if (riskLevel === 'high') riskLevel = 'critical';
    }
    // 安全评分较低时适度提升风险
    else if (scores.security < 25 && riskLevel === 'low') {
      riskLevel = 'medium';
    }
  }
  
  // 2. 性能维度特殊处理
  if (scores.performance !== null) {
    // 性能评分较低时提升风险
    if (scores.performance < 25) {
      if (riskLevel === 'low') riskLevel = 'medium';
      else if (riskLevel === 'medium') riskLevel = 'high';
    }
  }
  
  // 3. 基于具体问题类型的调整
  riskLevel = adjustRiskLevelByIssueTypes(riskLevel, analysisResults);
  
  // 4. 大模型分析置信度调整
  riskLevel = adjustRiskLevelByConfidence(riskLevel, scores, analysisResults);
  
  return riskLevel;
}

/**
 * 基于问题类型调整风险等级
 * @param {string} riskLevel - 当前风险等级
 * @param {Object} analysisResults - 分析结果
 * @returns {string} 调整后的风险等级
 */
function adjustRiskLevelByIssueTypes(riskLevel, analysisResults) {
  // 检查是否有SQL注入风险（最高优先级）
  if (analysisResults?.securityAudit?.success) {
    const vulnerabilities = analysisResults.securityAudit.data?.vulnerabilities || [];
    const sqlInjectionIssues = vulnerabilities.filter(v => {
      const type = v.type?.toLowerCase();
      return type?.includes('sql注入') || type?.includes('sql injection');
    });
    
    if (sqlInjectionIssues.length > 0) {
      const highSeveritySqlInjection = sqlInjectionIssues.filter(v =>
        v.severity === '高' || v.severity === 'high'
      );
      
      if (highSeveritySqlInjection.length > 0 && riskLevel === 'low') {
        riskLevel = 'medium'; // 高严重性SQL注入至少是中风险
      }
    }
    
    // 检查多个中等安全漏洞的累积效应
    const mediumVulnerabilities = vulnerabilities.filter(v =>
      v.severity === '中' || v.severity === 'medium'
    );
    
    if (mediumVulnerabilities.length >= 4 && riskLevel === 'low') {
      riskLevel = 'medium'; // 4个以上中等漏洞提升到中风险
    } else if (mediumVulnerabilities.length >= 6 && riskLevel === 'medium') {
      riskLevel = 'high'; // 6个以上中等漏洞提升到高风险
    }
  }
  
  // 检查是否有全表扫描等严重性能问题
  if (analysisResults?.performanceAnalysis?.success) {
    const bottlenecks = analysisResults.performanceAnalysis.data?.bottlenecks || [];
    const fullTableScanIssues = bottlenecks.filter(b => {
      const type = b.type?.toLowerCase();
      return type?.includes('全表扫描') || type?.includes('full table scan');
    });
    
    if (fullTableScanIssues.length > 0 && riskLevel === 'low') {
      riskLevel = 'medium'; // 有全表扫描至少是中风险
    }
    
    // 检查多个中等性能瓶颈的累积效应
    const mediumBottlenecks = bottlenecks.filter(b =>
      b.severity === '中' || b.severity === 'medium'
    );
    
    if (mediumBottlenecks.length >= 2 && riskLevel === 'low') {
      riskLevel = 'medium'; // 2个以上中等性能瓶颈提升到中风险
    }
  }
  
  return riskLevel;
}

/**
 * 基于大模型分析置信度调整风险等级
 * @param {string} riskLevel - 当前风险等级
 * @param {Object} scores - 各维度评分
 * @param {Object} analysisResults - 分析结果
 * @returns {string} 调整后的风险等级
 */
function adjustRiskLevelByConfidence(riskLevel, scores, analysisResults) {
  // 检查评分的一致性（大模型可能给出不一致的评分）
  const scoreValues = Object.values(scores).filter(s => s !== null);
  if (scoreValues.length >= 2) {
    const variance = calculateVariance(scoreValues);
    
    // 如果评分差异很大，说明大模型分析不够稳定
    if (variance > 400) { // 方差大于400表示评分差异很大
      if (riskLevel === 'low') riskLevel = 'medium';
    }
  }
  
  return riskLevel;
}

/**
 * 计算方差
 * @param {Array} values - 数值数组
 * @returns {number} 方差
 */
function calculateVariance(values) {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * 获取风险等级对应的颜色
 * @param {string} riskLevel - 风险等级
 * @returns {Function} chalk颜色函数
 */
function getRiskColor(riskLevel) {
  switch (riskLevel) {
    case 'critical': return chalk.red.bold;
    case 'high': return chalk.red;
    case 'medium': return chalk.yellow;
    case 'low': return chalk.green;
    default: return chalk.gray;
  }
}

/**
 * 显示关键指标
 * @param {Object} result - 分析结果
 */
export function displayKeyMetrics(result) {
  if (!result.success || !result.data) return;
  
  const { report, analysisResults } = result.data;
  
  console.log(chalk.blue.bold('\n📊 数据统计:'));
  console.log('─'.repeat(60));
  
  // 总体评分
  const overallScore = report?.overallAssessment?.score;
  if (typeof overallScore === 'number') {
    const scoreColor = overallScore >= 70 ? chalk.green :
                       overallScore >= 50 ? chalk.yellow :
                       chalk.red;
    console.log(`   ${chalk.bold('总体评分:')} ${scoreColor.bold(overallScore + '/100')}`);
  }
  
  // 性能指标
  if (analysisResults?.performanceAnalysis?.success) {
    const perfData = analysisResults.performanceAnalysis.data;
    const perfScore = perfData.performanceScore;
    
    console.log(`\n   ${chalk.bold('📊 性能分析:')}`);
    if (typeof perfScore === 'number') {
      const perfColor = perfScore >= 70 ? chalk.green :
                        perfScore >= 50 ? chalk.yellow :
                        chalk.red;
      console.log(`      评分: ${perfColor.bold(perfScore + '/100')} | 复杂度: ${chalk.cyan(perfData.complexityLevel || '未知')}`);
    }
    
    // 显示性能瓶颈详情
    const bottlenecks = perfData.bottlenecks || [];
    if (bottlenecks.length > 0) {
      console.log(`      ${chalk.yellow('⚠ 性能瓶颈')} (${bottlenecks.length} 个):`);
      bottlenecks.forEach((b, idx) => {
        console.log(`         ${idx + 1}. ${chalk.red(b.type || '未知类型')}: ${b.description}`);
        if (b.severity) {
          console.log(`            严重程度: ${chalk.yellow(b.severity)}`);
        }
      });
    }
  }
  
  // 安全指标
  if (analysisResults?.securityAudit?.success) {
    const secData = analysisResults.securityAudit.data;
    const secScore = secData.securityScore;
    
    console.log(`\n   ${chalk.bold('🔒 安全审计:')}`);
    if (typeof secScore === 'number') {
      const secColor = secScore >= 70 ? chalk.green :
                       secScore >= 50 ? chalk.yellow :
                       chalk.red;
      console.log(`      评分: ${secColor.bold(secScore + '/100')} | 风险: ${chalk.cyan(secData.riskLevel || '未知')}`);
    }
    
    // 显示安全漏洞详情
    const vulnerabilities = secData.vulnerabilities || [];
    if (vulnerabilities.length > 0) {
      console.log(`      ${chalk.red('🚨 安全漏洞')} (${vulnerabilities.length} 个):`);
      vulnerabilities.forEach((v, idx) => {
        console.log(`         ${idx + 1}. ${chalk.red(v.type || '未知类型')}: ${v.description}`);
        if (v.severity) {
          console.log(`            严重程度: ${chalk.yellow(v.severity)}`);
        }
        if (v.recommendations && v.recommendations.length > 0) {
          console.log(`            ${chalk.green('💡 建议:')} ${v.recommendations[0]}`);
        }
      });
    }
  }
  
  // 规范指标
  if (analysisResults?.standardsCheck?.success) {
    const stdData = analysisResults.standardsCheck.data;
    const stdScore = stdData.standardsScore;
    
    console.log(`\n   ${chalk.bold('📝 编码规范:')}`);
    if (typeof stdScore === 'number') {
      const stdColor = stdScore >= 70 ? chalk.green :
                       stdScore >= 50 ? chalk.yellow :
                       chalk.red;
      console.log(`      评分: ${stdColor.bold(stdScore + '/100')} | 合规: ${chalk.cyan(stdData.complianceLevel || '未知')}`);
    }
    
    // 显示规范违规详情
    const violations = stdData.violations || [];
    if (violations.length > 0) {
      console.log(`      ${chalk.yellow('⚠ 规范违规')} (${violations.length} 个):`);
      violations.forEach((v, idx) => {
        console.log(`         ${idx + 1}. ${chalk.yellow(v.type || '未知类型')}: ${v.description}`);
        if (v.severity) {
          console.log(`            严重程度: ${chalk.yellow(v.severity)}`);
        }
        if (v.recommendations && v.recommendations.length > 0) {
          console.log(`            ${chalk.green('💡 建议:')} ${v.recommendations[0]}`);
        }
      });
    }
  }
  
  // 优化潜力
  if (analysisResults?.optimizationSuggestions?.success) {
    const optData = analysisResults.optimizationSuggestions.data;
    const potential = optData.optimizationPotential;
    
    console.log(`\n   ${chalk.bold('💡 优化建议:')}`);
    if (potential) {
      console.log(`      优化潜力: ${chalk.cyan(potential)}`);
    }
    const suggestions = optData.optimizationSuggestions || [];
    if (suggestions.length > 0) {
      console.log(`      关键建议 (${suggestions.length} 条):`);
      suggestions.slice(0, 3).forEach((s, idx) => {
        console.log(`         ${idx + 1}. ${s.description}`);
        if (s.priority) {
          console.log(`            优先级: ${chalk.cyan(s.priority)}`);
        }
      });
      if (suggestions.length > 3) {
        console.log(`         ${chalk.gray('... 还有 ' + (suggestions.length - 3) + ' 条建议')}`);
      }
    }
  }
  
  console.log('\n' + '─'.repeat(60));
}

/**
 * 显示增强的结果摘要
 * @param {Object} result - 分析结果
 * @param {Object} config - 配置选项
 */
export function displayEnhancedSummary(result, config = {}) {
  console.log(chalk.green.bold('\n✓ 分析完成!'));
  
  // 检查是否为快速分析模式
  if (result.data?.analysisResults?.quickAnalysis) {
    displayQuickSummary(result);
    return;
  }
  
  // 计算并显示风险等级
  const riskLevel = calculateOverallRisk(result);
  const riskColor = getRiskColor(riskLevel);
  const riskText = RISK_LEVEL_CN[riskLevel];
  const riskIcon = RISK_LEVEL_ICONS[riskLevel];
  
  console.log(riskColor.bold(`\n${riskIcon} 整体风险等级: ${riskText.toUpperCase()}`));
  
  // 显示关键指标
  displayKeyMetrics(result);
  
  // 显示优化后的SQL
  if (result.data?.report?.optimizedSql?.optimizedSql) {
    const optimizedData = result.data.report.optimizedSql;
    console.log(chalk.blue.bold('\n✨ 优化后的SQL:'));
    console.log('─'.repeat(60));
    
    // 使用SQL语法高亮显示
    const highlightedSQL = createTerminalSQLDisplay(
      optimizedData.optimizedSql,
      result.data?.databaseType || 'generic'
    );
    console.log(highlightedSQL);
    
    if (optimizedData.changes && optimizedData.changes.length > 0) {
      console.log(chalk.yellow.bold('\n📝 优化说明:'));
      optimizedData.changes.forEach((change, index) => {
        console.log(`   ${index + 1}. ${chalk.bold(change.type)}: ${change.description}`);
        if (change.benefit) {
          console.log(`      ${chalk.green('→ 预期收益:')} ${change.benefit}`);
        }
      });
    }
    console.log('─'.repeat(60));
  }
  
  console.log(chalk.gray('\n详细分析结果请查看上方输出。'));
}

/**
 * 显示快速分析结果摘要
 * @param {Object} result - 快速分析结果
 */
function displayQuickSummary(result) {
  const quickData = result.data?.analysisResults?.quickAnalysis?.data || result.data?.analysisResults?.quickAnalysis;
  
  if (!quickData) {
    console.log(chalk.yellow('\n⚠️  快速分析结果为空'));
    return;
  }
  
  
  // 显示快速评分
  const quickScore = quickData.quickScore || 0;
  const scoreColor = quickScore >= 70 ? chalk.green :
                     quickScore >= 50 ? chalk.yellow :
                     chalk.red;
  
  console.log(scoreColor.bold(`\n⚡ 快速评分: ${quickScore}/100`));
  console.log(chalk.blue(`🗄️  数据库类型: ${quickData.databaseType || '未知'}`));
  
  
  // 显示关键问题
  if (quickData.criticalIssues && quickData.criticalIssues.length > 0) {
    console.log(chalk.red.bold('\n⚠️  关键问题:'));
    quickData.criticalIssues.forEach((issue, index) => {
      const severityIcon = issue.severity === '高' ? '🔴' : issue.severity === '中' ? '🟡' : '🟢';
      console.log(`   ${index + 1}. ${severityIcon} [${issue.type}] ${issue.description}`);
      if (issue.location) {
        console.log(`      ${chalk.gray('位置:')} ${issue.location}`);
      }
    });
  } else {
    console.log(chalk.green.bold('\n✅ 未发现关键问题'));
  }
  
  // 显示快速建议
  if (quickData.quickSuggestions && quickData.quickSuggestions.length > 0) {
    console.log(chalk.blue.bold('\n💡 快速建议:'));
    quickData.quickSuggestions.forEach((suggestion, index) => {
      console.log(`   ${index + 1}. [${chalk.cyan(suggestion.category)}] ${suggestion.description}`);
      if (suggestion.example && suggestion.example !== '保持当前写法') {
        console.log(`      ${chalk.gray('示例:')} ${suggestion.example}`);
      }
    });
  }
  
  console.log(chalk.gray('\n快速分析完成。如需详细分析，请使用完整模式。'));
}