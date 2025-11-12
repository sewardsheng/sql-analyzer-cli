import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { analyzeSqlWithGraph, analyzeSqlFileWithGraph } from './core/graph/graphAnalyzer.js';
import { readConfig } from './utils/config.js';
import { displayResult } from './services/ui/interactive.js';
import { initializePerformance, stopPerformance } from './core/performance/initPerformance.js';
import HistoryService from './services/history/historyService.js';

// 初始化性能优化功能
initializePerformance();

/**
 * 分析SQL语句
 */
async function analyzeSql(options) {
  try {
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
    
    // 准备LangGraph配置
    const graphConfig = {
      apiKey,
      baseURL,
      model,
      databaseType,
      analysisDimensions: ['performance', 'security', 'standards']
    };
    
    let result;
    let sqlQuery = '';
    
    // 分析SQL
    const spinner = ora('正在分析SQL语句...').start();
    
    try {
      if (options.file) {
        // 从文件分析
        result = await analyzeSqlFileWithGraph(options.file, graphConfig);
        sqlQuery = await fs.readFile(path.resolve(options.file), 'utf8');
        spinner.succeed('文件分析完成');
      } else if (options.sql) {
        // 直接分析SQL语句
        result = await analyzeSqlWithGraph(options.sql, null, graphConfig);
        sqlQuery = options.sql;
        spinner.succeed('分析完成');
      } else {
        spinner.fail('参数错误');
        console.log(chalk.red('❌ 请提供SQL语句或SQL文件路径'));
        console.log(chalk.gray('使用 --sql 参数直接提供SQL语句，或使用 --file 参数指定SQL文件'));
        process.exit(1);
      }
      
      // 显示结果
      displayResult(result);
      
      // 保存到历史记录
      const historyService = new HistoryService();
      historyService.saveAnalysis({
        sql: sqlQuery,
        databaseType: databaseType,
        result: result,
        type: options.file ? 'file' : 'single'
      });
      
    } catch (error) {
      spinner.fail('分析失败');
      console.error(chalk.red('错误:'), error.message);
      process.exit(1);
    }
  } finally {
    // 停止性能优化功能，确保进程可以正常退出
    stopPerformance();
  }
}

export {
  analyzeSql
};