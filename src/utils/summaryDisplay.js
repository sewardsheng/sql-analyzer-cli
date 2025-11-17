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

/**
 * 计算整体风险等级
 * @param {Object} result - 分析结果
 * @returns {string} 风险等级
 */
function calculateOverallRisk(result) {
  if (!result.success || !result.data) return 'low';
  
  const { analysisResults, report } = result.data;
  
  // 优先检查安全一票否决
  if (report?.securityVeto) {
    return 'critical';
  }
  
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
  
  // 检查是否有致命的安全漏洞
  const hasCriticalVulnerability = analysisResults?.securityAudit?.success &&
    analysisResults.securityAudit.data?.vulnerabilities?.some(v =>
      v.severity === 'critical' || v.severity === '严重'
    );
  
  if (hasCriticalVulnerability) {
    return 'critical';
  }
  
  // 计算有效评分的数量和平均分
  const validScores = Object.values(scores).filter(s => s !== null);
  
  if (validScores.length === 0) {
    // 如果没有任何评分数据，默认为低风险
    return 'low';
  }
  
  const averageScore = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  
  // 根据平均分确定基础风险等级
  let baseRisk;
  if (averageScore >= 85) baseRisk = 'low';
  else if (averageScore >= 70) baseRisk = 'medium';
  else if (averageScore >= 50) baseRisk = 'high';
  else baseRisk = 'critical';
  
  // 如果安全评分特别低，提升风险等级
  if (scores.security !== null && scores.security < 40) {
    if (baseRisk === 'low') baseRisk = 'medium';
    else if (baseRisk === 'medium') baseRisk = 'high';
    else if (baseRisk === 'high') baseRisk = 'critical';
  }
  
  // 如果性能评分特别低，也要考虑提升风险
  if (scores.performance !== null && scores.performance < 30) {
    if (baseRisk === 'low') baseRisk = 'medium';
  }
  
  return baseRisk;
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