import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { analyzeSqlWithGraph, analyzeSqlFileWithGraph } from './core/graph/graphAnalyzer.js';
import { readConfig } from './utils/config.js';
import { displayResult } from './services/ui/sharedUI.js';
import HistoryService from './services/history/historyService.js';

/**
 * 分析SQL语句
 */
async function analyzeSql(options) {
  try {
    // 读取配置
    const config = await readConfig();
    
    // 从配置文件获取API相关设置
    const apiKey = config.apiKey;
    const baseURL = config.baseURL;
    const model = config.model;
    
    // 检查是否启用子代理模式
    const useSubagents = options.useSubagents || config.useSubagents || true;
    
    // 检查API密钥
    if (!apiKey) {
      console.log(chalk.red('❌ 未配置API密钥，请运行 "sql-analyzer config" 进行配置或使用 --api-key 参数'));
      process.exit(1);
    }
    
    // 准备分析配置
    const analysisOptions = {
      apiKey,
      baseURL,
      model,
      useSubagents,
      analysisDimensions: ['performance', 'security', 'standards'],
      // 其他选项
      simplifiedOutput: options.simplifiedOutput || false,
      learn: options.learn !== false, // 默认启用学习
      performance: options.performance !== false, // 默认启用性能分析
      security: options.security !== false, // 默认启用安全审计
      standards: options.standards !== false // 默认启用规范检查
    };
    
    let result;
    let sqlQuery = '';
    
    // 分析SQL
    const spinner = ora(`正在分析SQL语句${useSubagents ? ' (使用子代理模式)' : ''}...`).start();
    
    try {
      if (options.file) {
        // 从文件分析
        result = await analyzeSqlFileWithGraph(options.file, analysisOptions);
        sqlQuery = await fs.readFile(path.resolve(options.file), 'utf8');
        spinner.succeed('文件分析完成');
      } else if (options.sql) {
        // 直接分析SQL语句
        result = await analyzeSqlWithGraph(options.sql, analysisOptions);
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
        result: result,
        type: options.file ? 'file' : 'single'
      });
      
    } catch (error) {
      spinner.fail('分析失败');
      console.error(chalk.red('错误:'), error.message);
      process.exit(1);
    }
  } finally {
    // 确保资源被正确释放
  }
}

export {
  analyzeSql
};