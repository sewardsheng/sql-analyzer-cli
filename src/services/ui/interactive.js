// 直接导入模块，Bun原生支持ES模块
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { analyzeSqlWithGraph } from '../../core/graph/graphAnalyzer.js';
import { readConfig } from '../../utils/config.js';

/**
 * 交互式SQL分析模式
 */
async function interactiveMode(options = {}) {
  console.log(chalk.blue('🔍 SQL语句智能分析工具 - 交互模式'));
  console.log(chalk.gray('输入 "exit" 或按 Ctrl+C 退出\n'));
  
  // 读取配置
  const config = await readConfig();
  
  // 合并命令行选项和配置文件
  const apiKey = options.apiKey || config.apiKey;
  const baseURL = options.baseURL || config.baseURL;
  const model = options.model || config.model;
  
  // 检查API密钥
  if (!apiKey) {
    console.log(chalk.red('❌ 未配置API密钥，请先运行 "sql-analyzer config" 进行配置'));
    return;
  }
  
  // 主循环
  while (true) {
    try {
      const { sql, databaseType } = await inquirer.prompt([
        {
          type: 'input',
          name: 'sql',
          message: '请输入要分析的SQL语句:',
          validate: (input) => {
            if (input.trim() === '') return 'SQL语句不能为空';
            if (input.toLowerCase() === 'exit') return true;
            return true;
          }
        },
        {
          type: 'list',
          name: 'databaseType',
          message: '选择数据库类型:',
          choices: ['mysql', 'postgresql', 'oracle', 'sqlserver'],
          default: config.defaultDatabaseType,
          when: (answers) => answers.sql.toLowerCase() !== 'exit'
        }
      ]);
      
      // 检查是否要退出
      if (sql.toLowerCase() === 'exit') {
        console.log(chalk.blue('👋 再见！'));
        break;
      }
      
      // 分析SQL
      const spinner = ora('正在分析SQL语句...').start();
      
      try {
        // 准备LangGraph配置
        const graphConfig = {
          apiKey,
          baseURL,
          model,
          databaseType,
          analysisDimensions: ['performance', 'security', 'standards']
        };
        
        const result = await analyzeSqlWithGraph(sql, null, graphConfig);
        
        spinner.succeed('分析完成');
        
        // 显示结果
        displayResult(result);
        
      } catch (error) {
        spinner.fail('分析失败');
        console.error(chalk.red('错误:'), error.message);
      }
      
      console.log(); // 添加空行分隔
      
    } catch (error) {
      if (error.isTtyError) {
        console.log(chalk.red('❌ 无法运行交互模式，当前环境不支持'));
        break;
      } else {
        console.error(chalk.red('发生错误:'), error.message);
      }
    }
  }
}

/**
 * 显示子代理模式的分析结果
 * @param {Object} result - 子代理分析结果
 */
function displaySubagentsResult(result) {
  const { subagentsData, analysisResult, performanceAnalysis, securityAudit, standardsCheck, optimizationSuggestions, metadata } = result;
  
  // 显示分析摘要
  if (analysisResult && analysisResult.summary) {
    console.log(chalk.green('📝 分析摘要:'));
    console.log(analysisResult.summary);
    console.log();
  }
  
  // 显示性能分析详情
  if (performanceAnalysis && performanceAnalysis.success && performanceAnalysis.data) {
    console.log(chalk.blue('🔍 性能分析详情:'));
    const perf = performanceAnalysis.data;
    console.log(`- 性能评分: ${perf.performanceScore || '未知'}`);
    console.log(`- 复杂度级别: ${perf.complexityLevel || '未知'}`);
    
    if (perf.bottlenecks && perf.bottlenecks.length > 0) {
      console.log('- 性能瓶颈:');
      perf.bottlenecks.forEach((bottleneck, index) => {
        console.log(`  ${index + 1}. ${bottleneck.description}`);
        if (bottleneck.severity) {
          console.log(`     严重程度: ${bottleneck.severity}`);
        }
        if (bottleneck.recommendation) {
          console.log(`     建议: ${bottleneck.recommendation}`);
        }
      });
    } else {
      console.log('- 未发现明显性能瓶颈');
    }
    console.log();
  }
  
  // 显示安全审计详情
  if (securityAudit && securityAudit.success && securityAudit.data) {
    console.log(chalk.yellow('🛡️  安全审计详情:'));
    const sec = securityAudit.data;
    console.log(`- 安全评分: ${sec.securityScore || '未知'}`);
    console.log(`- 风险等级: ${sec.riskLevel || '未知'}`);
    
    if (sec.vulnerabilities && sec.vulnerabilities.length > 0) {
      console.log('- 安全漏洞:');
      sec.vulnerabilities.forEach((vuln, index) => {
        console.log(`  ${index + 1}. ${vuln.description}`);
        if (vuln.severity) {
          console.log(`     严重程度: ${vuln.severity}`);
        }
        if (vuln.recommendation) {
          console.log(`     建议: ${vuln.recommendation}`);
        }
      });
    } else {
      console.log('- 未发现明显安全漏洞');
    }
    console.log();
  }
  
  // 显示编码规范检查详情
  if (standardsCheck && standardsCheck.success && standardsCheck.data) {
    console.log(chalk.cyan('📝 编码规范检查详情:'));
    const std = standardsCheck.data;
    console.log(`- 规范评分: ${std.standardsScore || '未知'}`);
    console.log(`- 合规等级: ${std.complianceLevel || '未知'}`);
    
    if (std.violations && std.violations.length > 0) {
      console.log('- 规范违规:');
      std.violations.forEach((violation, index) => {
        console.log(`  ${index + 1}. ${violation.description}`);
        if (violation.severity) {
          console.log(`     严重程度: ${violation.severity}`);
        }
        if (violation.recommendation) {
          console.log(`     建议: ${violation.recommendation}`);
        }
      });
    } else {
      console.log('- 未发现明显规范违规');
    }
    console.log();
  }
  
  // 显示优化建议详情
  if (optimizationSuggestions && optimizationSuggestions.success && optimizationSuggestions.data) {
    console.log(chalk.magenta('💡 优化建议详情:'));
    const opt = optimizationSuggestions.data;
    console.log(`- 整体评分: ${opt.overallScore || '未知'}`);
    console.log(`- 优化等级: ${opt.optimizationLevel || '未知'}`);
    console.log(`- 优化潜力: ${opt.optimizationPotential || '未知'}`);
    
    if (opt.optimizationSuggestions && opt.optimizationSuggestions.length > 0) {
      console.log('- 具体建议:');
      opt.optimizationSuggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion.description}`);
        if (suggestion.type) {
          console.log(`     类型: ${suggestion.type}`);
        }
        if (suggestion.priority) {
          console.log(`     优先级: ${suggestion.priority}`);
        }
        if (suggestion.impact) {
          console.log(`     预期影响: ${suggestion.impact}`);
        }
      });
    } else {
      console.log('- 暂无优化建议');
    }
    console.log();
  }
  
  // 显示元数据
  if (metadata) {
    console.log(chalk.gray('📊 分析元数据:'));
    console.log(`- 分析时间: ${new Date(metadata.timestamp).toLocaleString()}`);
    console.log(`- 分析耗时: ${metadata.duration || '未知'}ms`);
    console.log(`- 使用的模型: ${metadata.model || '未知'}`);
    console.log();
  }
}

/**
 * 显示分析结果
 * @param {Object} result - 分析结果
 */
function displayResult(result) {
  if (!result) {
    console.log(chalk.red('❌ 未获取到分析结果'));
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
}

export { interactiveMode, displayResult };