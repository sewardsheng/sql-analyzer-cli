// 在 CommonJS 中使用 inquirer 的正确方式
const inquirer = require('inquirer').default || require('inquirer');
// 在 CommonJS 中使用 chalk 的正确方式
const chalk = require('chalk').default;
// 在 CommonJS 中使用 ora 的正确方式
const ora = require('ora').default;
const { analyzeSqlWithAgent } = require('../core/analyzer');
const { readConfig } = require('../utils/config');

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
        const result = await analyzeSqlWithAgent(sql, {
          databaseType,
          apiKey,
          baseURL,
          model
        });
        
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
  
  // 直接显示完整的响应内容
  if (result.fullResponse) {
    console.log(result.fullResponse);
  } else {
    console.log(chalk.yellow('⚠️  未获取到分析结果'));
  }
}

module.exports = {
  interactiveMode,
  displayResult
};