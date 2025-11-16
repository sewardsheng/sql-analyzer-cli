/**
 * 分析结果摘要显示工具
 * 提供风险等级计算和颜色编码显示功能
 */

import chalk from 'chalk';

/**
 * 检测是否在CI环境中
 * @returns {boolean}
 */
export function isCI() {
  return !!(process.env.CI || process.env.GITHUB_ACTIONS || process.env.JENKINS_HOME);
}

/**
 * 风险等级枚举
 */
export const RISK_LEVELS = {
  SAFE: 'safe',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * 风险等级中文映射
 */
const RISK_LEVEL_CN = {
  [RISK_LEVELS.SAFE]: '安全',
  [RISK_LEVELS.LOW]: '低风险',
  [RISK_LEVELS.MEDIUM]: '中等风险',
  [RISK_LEVELS.HIGH]: '高风险',
  [RISK_LEVELS.CRITICAL]: '严重风险'
};

/**
 * 风险等级图标映射
 */
const RISK_LEVEL_ICONS = {
  [RISK_LEVELS.SAFE]: '✅',
  [RISK_LEVELS.LOW]: '🟢',
  [RISK_LEVELS.MEDIUM]: '🟡',
  [RISK_LEVELS.HIGH]: '🔴',
  [RISK_LEVELS.CRITICAL]: '🚨'
};

/**
 * 获取风险等级对应的颜色函数
 * @param {string} riskLevel - 风险等级
 * @returns {Function} chalk颜色函数
 */
export function getRiskColor(riskLevel) {
  const ci = isCI();
  
  if (ci) {
    // CI环境中禁用颜色
    return (text) => text;
  }
  
  switch (riskLevel) {
    case RISK_LEVELS.SAFE:
      return chalk.green;
    case RISK_LEVELS.LOW:
      return chalk.blue;
    case RISK_LEVELS.MEDIUM:
      return chalk.yellow;
    case RISK_LEVELS.HIGH:
      return chalk.red;
    case RISK_LEVELS.CRITICAL:
      return chalk.red.bold;
    default:
      return chalk.gray;
  }
}

/**
 * 计算整体风险等级
 * @param {Object} result - 分析结果
 * @returns {string} 风险等级
 */
export function calculateOverallRisk(result) {
  if (!result.success || !result.data) {
    return RISK_LEVELS.MEDIUM;
  }
  
  const { report, analysisResults } = result.data;
  
  // 检查安全一票否决
  if (report?.securityVeto) {
    return RISK_LEVELS.CRITICAL;
  }
  
  // 检查安全审计结果
  if (analysisResults?.securityAudit?.success) {
    const securityData = analysisResults.securityAudit.data;
    const riskLevel = securityData.riskLevel?.toLowerCase();
    
    if (riskLevel === '严重' || riskLevel === 'critical') {
      return RISK_LEVELS.CRITICAL;
    }
    if (riskLevel === '高' || riskLevel === 'high') {
      return RISK_LEVELS.HIGH;
    }
    
    // 根据安全评分判断
    const securityScore = securityData.securityScore;
    if (typeof securityScore === 'number') {
      if (securityScore < 40) return RISK_LEVELS.CRITICAL;
      if (securityScore < 60) return RISK_LEVELS.HIGH;
    }
  }
  
  // 根据总体评分判断
  const overallScore = report?.overallAssessment?.score;
  if (typeof overallScore === 'number') {
    if (overallScore >= 85) return RISK_LEVELS.SAFE;
    if (overallScore >= 70) return RISK_LEVELS.LOW;
    if (overallScore >= 50) return RISK_LEVELS.MEDIUM;
    if (overallScore >= 30) return RISK_LEVELS.HIGH;
    return RISK_LEVELS.CRITICAL;
  }
  
  return RISK_LEVELS.MEDIUM;
}

/**
 * 显示关键指标
 * @param {Object} result - 分析结果
 */
export function displayKeyMetrics(result) {
  if (!result.success || !result.data) return;
  
  const { report, analysisResults } = result.data;
  const ci = isCI();
  
  console.log(chalk.blue.bold('\n📊 关键指标:'));
  console.log('─'.repeat(60));
  
  // 总体评分
  const overallScore = report?.overallAssessment?.score;
  if (typeof overallScore === 'number') {
    const scoreColor = overallScore >= 70 ? chalk.green : 
                       overallScore >= 50 ? chalk.yellow : 
                       chalk.red;
    console.log(`   总体评分: ${ci ? overallScore : scoreColor(overallScore)}/100`);
  }
  
  // 性能指标
  if (analysisResults?.performanceAnalysis?.success) {
    const perfData = analysisResults.performanceAnalysis.data;
    const perfScore = perfData.performanceScore;
    if (typeof perfScore === 'number') {
      console.log(`   性能评分: ${perfScore}/100 (复杂度: ${perfData.complexityLevel || '未知'})`);
    }
    const bottlenecks = perfData.bottlenecks?.length || 0;
    if (bottlenecks > 0) {
      console.log(`   性能瓶颈: ${bottlenecks} 个`);
    }
  }
  
  // 安全指标
  if (analysisResults?.securityAudit?.success) {
    const secData = analysisResults.securityAudit.data;
    const secScore = secData.securityScore;
    if (typeof secScore === 'number') {
      const secColor = secScore >= 70 ? chalk.green : 
                       secScore >= 50 ? chalk.yellow : 
                       chalk.red;
      console.log(`   安全评分: ${ci ? secScore : secColor(secScore)}/100 (风险: ${secData.riskLevel || '未知'})`);
    }
    const vulnerabilities = secData.vulnerabilities?.length || 0;
    if (vulnerabilities > 0) {
      console.log(`   安全漏洞: ${vulnerabilities} 个`);
    }
  }
  
  // 规范指标
  if (analysisResults?.standardsCheck?.success) {
    const stdData = analysisResults.standardsCheck.data;
    const stdScore = stdData.standardsScore;
    if (typeof stdScore === 'number') {
      console.log(`   规范评分: ${stdScore}/100 (合规: ${stdData.complianceLevel || '未知'})`);
    }
    const violations = stdData.violations?.length || 0;
    if (violations > 0) {
      console.log(`   规范违规: ${violations} 个`);
    }
  }
  
  // 优化潜力
  if (analysisResults?.optimizationSuggestions?.success) {
    const optData = analysisResults.optimizationSuggestions.data;
    const potential = optData.optimizationPotential;
    if (potential) {
      console.log(`   优化潜力: ${potential}`);
    }
    const suggestions = optData.optimizationSuggestions?.length || 0;
    if (suggestions > 0) {
      console.log(`   优化建议: ${suggestions} 条`);
    }
  }
  
  console.log('─'.repeat(60));
}

/**
 * 显示增强的结果摘要
 * @param {Object} result - 分析结果
 * @param {Object} config - 配置选项
 */
export function displayEnhancedSummary(result, config = {}) {
  const ci = isCI();
  
  console.log(chalk.green.bold('\n✓ 分析完成!'));
  console.log('\n' + '='.repeat(60));
  
  // 计算并显示风险等级
  const riskLevel = calculateOverallRisk(result);
  const riskColor = getRiskColor(riskLevel);
  const riskText = RISK_LEVEL_CN[riskLevel];
  const riskIcon = RISK_LEVEL_ICONS[riskLevel];
  
  console.log(riskColor.bold(`\n${riskIcon} 整体风险等级: ${riskText.toUpperCase()}`));
  
  // 检查安全一票否决
  if (result.data?.report?.securityVeto) {
    console.log(chalk.red.bold('\n⚠️  警告: 安全审计未通过'));
    console.log(chalk.yellow('   建议: 请优先解决安全问题后再进行部署'));
  }
  
  // 显示关键指标
  displayKeyMetrics(result);
  
  // 显示优化后的SQL
  if (result.data?.report?.optimizedSql?.optimizedSql) {
    const optimizedData = result.data.report.optimizedSql;
    console.log(chalk.blue.bold('\n✨ 优化后的SQL:'));
    console.log('─'.repeat(60));
    console.log(chalk.cyan(optimizedData.optimizedSql));
    
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
  
  // CI模式输出机器可读格式
  if (ci) {
    console.log('\n# CI 输出');
    console.log(`::set-output name=risk_level::${riskLevel}`);
    console.log(`::set-output name=overall_score::${result.data?.report?.overallAssessment?.score || 0}`);
    console.log(`::set-output name=security_veto::${result.data?.report?.securityVeto || false}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(chalk.gray('\n详细分析结果请查看上方输出。'));
}

/**
 * 格式化建议列表
 * @param {Array} recommendations - 建议列表
 * @param {number} maxCount - 最大显示数量
 */
export function formatRecommendations(recommendations, maxCount = 5) {
  if (!recommendations || recommendations.length === 0) {
    console.log(chalk.gray('   无'));
    return;
  }
  
  const displayed = recommendations.slice(0, maxCount);
  displayed.forEach((rec, index) => {
    console.log(`   ${index + 1}. ${rec}`);
  });
  
  if (recommendations.length > maxCount) {
    console.log(chalk.gray(`   ... 还有 ${recommendations.length - maxCount} 条建议`));
  }
}