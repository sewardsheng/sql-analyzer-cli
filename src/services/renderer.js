/**
 * 结果渲染服务
 * 负责将分析结果格式化并显示到控制台
 */

import chalk from 'chalk';

/**
 * 显示分析结果
 * @param {Object} result - 分析结果
 */
export function displayResult(result) {
  if (!result) {
    console.log(chalk.red('❌ 未获取到分析结果'));
    return;
  }
  
  if (result.error) {
    console.log(chalk.red(`分析失败: ${result.error}`));
    return;
  }
  
  // 子代理模式结果
  if (result.subagentsData ||
      (result.performance && result.security && result.standards)) {
    displaySubagentsResult(result);
    return;
  }
  
  // 标准分析结果
  displayStandardResult(result);
}

/**
 * 显示标准分析结果
 * @param {Object} result - 分析结果
 */
function displayStandardResult(result) {
  if (result.summary) {
    console.log(chalk.green('📝 分析摘要:'));
    console.log(result.summary);
    console.log();
  }
  
  if (result.analysisResult?.summary) {
    console.log(chalk.green('📝 分析摘要:'));
    console.log(result.analysisResult.summary);
    console.log();
  }
  
  if (result.performance) {
    console.log(chalk.blue('🔍 性能分析:'));
    console.log(result.performance);
    console.log();
  }
  
  if (result.security) {
    console.log(chalk.yellow('🛡️  安全审计:'));
    console.log(result.security);
    console.log();
  }
  
  if (result.standards) {
    console.log(chalk.cyan('📝 编码规范检查:'));
    console.log(result.standards);
    console.log();
  }
  
  if (result.optimizationSuggestions) {
    console.log(chalk.magenta('💡 优化建议:'));
    console.log(result.optimizationSuggestions);
    console.log();
  }
  
  // 显示发现的问题
  const issues = result.analysisResult?.issues;
  if (issues && issues.length > 0) {
    console.log(chalk.yellow('⚠️  发现的问题:'));
    issues.forEach((issue, index) => {
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
 * 显示子代理分析结果
 * @param {Object} result - 分析结果
 */
function displaySubagentsResult(result) {
  console.log(chalk.blue('\n🚀 分析结果\n'));
  
  if (result.performance) {
    console.log(chalk.blue('🔍 性能分析:'));
    console.log(result.performance);
    console.log();
  }
  
  if (result.security) {
    console.log(chalk.yellow('🛡️  安全审计:'));
    console.log(result.security);
    console.log();
  }
  
  if (result.standards) {
    console.log(chalk.cyan('📝 编码规范检查:'));
    console.log(result.standards);
    console.log();
  }
  
  // 显示元数据
  if (result.metadata?.duration !== undefined) {
    console.log(chalk.gray('📊 分析元数据:'));
    const durationMs = result.metadata.duration;
    const durationSec = (durationMs / 1000).toFixed(2);
    console.log(`Agent执行总时间: ${durationMs}ms (${durationSec}s)`);
    
    if (result.config?.model) {
      console.log(`使用模型: ${result.config.model}`);
    }
    console.log();
  } else if (result.subagentsData) {
    console.log(chalk.gray('📊 分析元数据:'));
    console.log(`分析维度: ${Object.keys(result.subagentsData).join(', ')}`);
    console.log();
  }
}