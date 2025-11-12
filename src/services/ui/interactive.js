// 在 ES 模块中使用 inquirer 的正确方式
import inquirerModule from 'inquirer';
const inquirer = inquirerModule.default || inquirerModule;
// 在 ES 模块中使用 chalk 的正确方式
import chalkModule from 'chalk';
const chalk = chalkModule.default || chalkModule;
// 在 ES 模块中使用 ora 的正确方式
import oraModule from 'ora';
const ora = oraModule.default || oraModule;
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
 * 显示分析结果
 */
function displayResult(result) {
  console.log(chalk.blue('\n📊 SQL分析结果\n'));
  
  // 检查是否有错误
  if (result.error) {
    console.log(chalk.red(`❌ 分析失败: ${result.error}`));
    return;
  }
  
  // 显示分析摘要
  if (result.analysisResult && result.analysisResult.summary) {
    console.log(chalk.green('📝 分析摘要:'));
    console.log(result.analysisResult.summary);
    console.log();
  }
  
  // 显示发现的问题
  if (result.analysisResult && result.analysisResult.issues && result.analysisResult.issues.length > 0) {
    console.log(chalk.yellow('⚠️  发现的问题:'));
    result.analysisResult.issues.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.severity}] ${issue.type}`);
      console.log(`   描述: ${issue.description}`);
      if (issue.location) {
        console.log(`   位置: ${issue.location}`);
      }
      console.log(`   建议: ${issue.recommendation}`);
      console.log();
    });
  } else {
    console.log(chalk.green('✅ 未发现明显问题'));
    console.log();
  }
  
  // 显示改进建议
  if (result.analysisResult && result.analysisResult.suggestions && result.analysisResult.suggestions.length > 0) {
    console.log(chalk.blue('💡 改进建议:'));
    result.analysisResult.suggestions.forEach((suggestion, index) => {
      console.log(`${index + 1}. [${suggestion.category}] ${suggestion.description}`);
      if (suggestion.example) {
        console.log(`   示例: ${suggestion.example}`);
      }
      console.log();
    });
  }
  
  // 显示性能指标
  if (result.analysisResult && result.analysisResult.metrics) {
    console.log(chalk.magenta('📈 性能指标:'));
    const metrics = result.analysisResult.metrics;
    console.log(`- 复杂度: ${metrics.complexity || '未知'}`);
    console.log(`- 预估执行时间: ${metrics.estimatedExecutionTime || '未知'}`);
    console.log(`- 资源使用: ${metrics.resourceUsage || '未知'}`);
    console.log();
  }
  
  // 显示执行信息
  if (result.metadata) {
    console.log(chalk.gray('ℹ️  执行信息:'));
    console.log(`- 分析类型: ${result.metadata.analysisType || '综合分析'}`);
    if (result.metadata.duration) {
      console.log(`- 执行时间: ${(result.metadata.duration / 1000).toFixed(2)}秒`);
    }
    console.log();
  }
}

export {
  interactiveMode,
  displayResult
};