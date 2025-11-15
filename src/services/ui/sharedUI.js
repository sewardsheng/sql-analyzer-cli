import chalk from 'chalk';

/**
 * 显示分析结果
 * @param {Object} result - 分析结果
 */
function displayResult(result) {
  if (!result) {
    console.log(chalk.red('❌ 未获取到分析结果'));
    return;
  }
  
  // 检查是否有错误
  if (result.error) {
    console.log(chalk.red(`分析失败: ${result.error}`));
    return;
  }
  
  // 如果是子代理模式的结果
  if (result.subagentsData || 
      (result.performanceAnalysis && result.securityAudit && result.standardsCheck)) {
    displaySubagentsResult(result);
    return;
  }
  
  // 显示基本分析结果
  if (result.summary) {
    console.log(chalk.green('📝 分析摘要:'));
    console.log(result.summary);
    console.log();
  }
  
  // 也支持通过analysisResult访问结果
  if (result.analysisResult && result.analysisResult.summary) {
    console.log(chalk.green('📝 分析摘要:'));
    console.log(result.analysisResult.summary);
    console.log();
  }
  
  // 显示性能分析
  if (result.performanceAnalysis) {
    console.log(chalk.blue('🔍 性能分析:'));
    console.log(result.performanceAnalysis);
    console.log();
  }
  
  // 显示安全审计
  if (result.securityAudit) {
    console.log(chalk.yellow('🛡️  安全审计:'));
    console.log(result.securityAudit);
    console.log();
  }
  
  // 显示编码规范检查
  if (result.standardsCheck) {
    console.log(chalk.cyan('📝 编码规范检查:'));
    console.log(result.standardsCheck);
    console.log();
  }
  
  // 显示优化建议
  if (result.optimizationSuggestions) {
    console.log(chalk.magenta('💡 优化建议:'));
    console.log(result.optimizationSuggestions);
    console.log();
  }
  
  // 显示发现的问题
  if (result.analysisResult && result.analysisResult.issues && result.analysisResult.issues.length > 0) {
    console.log(chalk.yellow('⚠️  发现的问题:'));
    result.analysisResult.issues.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.severity}] ${issue.type}`);
      console.log(`   描述: ${issue.description}`);
      if (issue.solution) {
        console.log(`   解决方案: ${issue.solution}`);
      }
      console.log();
    });
  }
}

/**
 * 显示分析结果
 * @param {Object} result - 分析结果
 */
function displaySubagentsResult(result) {
  console.log(chalk.blue('\n🚀 分析结果\n'));
  
  // 显示性能分析
  if (result.performanceAnalysis) {
    console.log(chalk.blue('🔍 性能分析:'));
    console.log(result.performanceAnalysis);
    console.log();
  }
  
  // 显示安全审计
  if (result.securityAudit) {
    console.log(chalk.yellow('🛡️  安全审计:'));
    console.log(result.securityAudit);
    console.log();
  }
  
  // 显示编码规范检查
  if (result.standardsCheck) {
    console.log(chalk.cyan('📝 编码规范检查:'));
    console.log(result.standardsCheck);
    console.log();
  }
  
  // 显示分析元数据，包括agent执行总时间
  if (result.metadata && result.metadata.duration !== undefined) {
    console.log(chalk.gray('📊 分析元数据:'));
    // 格式化时间，转换为秒和毫秒的格式
    const durationMs = result.metadata.duration;
    const durationSec = (durationMs / 1000).toFixed(2);
    console.log(`Agent执行总时间: ${durationMs}ms (${durationSec}s)`);
    
    // 显示使用的模型（如果有）
    if (result.config && result.config.model) {
      console.log(`使用模型: ${result.config.model}`);
    }
    
    console.log();
  }
  // 兼容旧格式，保持向后兼容
  else if (result.subagentsData) {
    console.log(chalk.gray('📊 分析元数据:'));
    console.log(`分析维度: ${Object.keys(result.subagentsData).join(', ')}`);
    console.log();
  }
}

export {
  displayResult,
  displaySubagentsResult
};