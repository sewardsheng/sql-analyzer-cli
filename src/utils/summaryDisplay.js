import chalk from 'chalk';

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
  
  const { analysisResults } = result.data;
  let riskScore = 0;
  
  // 检查安全评分
  if (analysisResults?.securityAudit?.success) {
    const secScore = analysisResults.securityAudit.data.securityScore;
    if (secScore < 50) riskScore += 3;
    else if (secScore < 70) riskScore += 2;
    else if (secScore < 85) riskScore += 1;
  }
  
  // 检查性能评分
  if (analysisResults?.performanceAnalysis?.success) {
    const perfScore = analysisResults.performanceAnalysis.data.performanceScore;
    if (perfScore < 50) riskScore += 2;
    else if (perfScore < 70) riskScore += 1;
  }
  
  // 检查规范评分
  if (analysisResults?.standardsCheck?.success) {
    const stdScore = analysisResults.standardsCheck.data.standardsScore;
    if (stdScore < 50) riskScore += 1;
  }
  
  // 检查安全一票否决
  if (result.data?.report?.securityVeto) {
    return 'critical';
  }
  
  // 根据总分确定风险等级
  if (riskScore >= 5) return 'critical';
  if (riskScore >= 3) return 'high';
  if (riskScore >= 1) return 'medium';
  return 'low';
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
    console.log(`   总体评分: ${scoreColor(overallScore)}/100`);
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
      console.log(`   安全评分: ${secColor(secScore)}/100 (风险: ${secData.riskLevel || '未知'})`);
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
  
  console.log('\n' + '='.repeat(60));
  console.log(chalk.gray('\n详细分析结果请查看上方输出。'));
}