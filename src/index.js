const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk').default; // CommonJS环境中使用.default访问ES模块的默认导出
const ora = require('ora').default; // CommonJS环境中使用.default访问ES模块的默认导出
const { analyzeSqlWithAgent, readSqlFromFile } = require('./core/analyzer');
const { readConfig } = require('./utils/config');
const { displayResult } = require('./services/interactive');

/**
 * 分析SQL语句
 */
async function analyzeSql(options) {
  // 读取配置
  const config = await readConfig();
  
  // 合并命令行选项和配置文件
  const apiKey = options.apiKey || config.apiKey;
  const baseURL = options.baseURL || config.baseURL;
  const model = options.model || config.model;
  const databaseType = options.database || config.defaultDatabaseType;
  
  // 检查API密钥
  if (!apiKey) {
    console.log(chalk.red('❌ 未配置API密钥，请运行 "sql-analyzer config" 进行配置或使用 --api-key 参数'));
    process.exit(1);
  }
  
  let sql;
  
  // 获取SQL语句
  if (options.sql) {
    sql = options.sql;
  } else if (options.file) {
    const spinner = ora('正在读取SQL文件...').start();
    try {
      sql = await readSqlFromFile(options.file);
      spinner.succeed('文件读取完成');
    } catch (error) {
      spinner.fail('文件读取失败');
      console.error(chalk.red('错误:'), error.message);
      process.exit(1);
    }
  } else {
    console.log(chalk.red('❌ 请提供SQL语句或SQL文件路径'));
    console.log(chalk.gray('使用 --sql 参数直接提供SQL语句，或使用 --file 参数指定SQL文件'));
    process.exit(1);
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
    process.exit(1);
  }
}

module.exports = {
  analyzeSql
};