/**
 * SQL分析服务
 * 负责SQL语句的分析处理,包括参数验证、配置读取、分析执行和结果处理
 */

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { analyzeSqlWithGraph, analyzeSqlFileWithGraph } from '../../core/graph/graphAnalyzer.js';
import { readConfig } from '../config/index.js';
import { displayResult } from '../renderer/index.js';
import HistoryService from '../history/historyService.js';

/**
 * 分析SQL语句
 * @param {Object} options - 分析选项
 * @param {string} [options.sql] - 要分析的SQL语句
 * @param {string} [options.file] - SQL文件路径
 * @param {boolean} [options.useSubagents] - 是否使用子代理模式
 * @param {boolean} [options.simplifiedOutput] - 是否简化输出
 * @param {boolean} [options.learn] - 是否启用学习功能
 * @param {boolean} [options.performance] - 是否启用性能分析
 * @param {boolean} [options.security] - 是否启用安全审计
 * @param {boolean} [options.standards] - 是否启用编码规范检查
 * @returns {Promise<Object>} 分析结果
 */
export async function analyzeSql(options) {
  try {
    // 读取配置
    const config = await readConfig();
    
    // 检查API密钥
    if (!config.apiKey) {
      console.log(chalk.red('❌ 未配置API密钥，请运行 "sql-analyzer config" 进行配置'));
      process.exit(1);
    }
    
    // 准备分析配置
    const analysisOptions = {
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      model: config.model,
      useSubagents: options.useSubagents ?? true,
      analysisDimensions: ['performance', 'security', 'standards'],
      simplifiedOutput: options.simplifiedOutput || false,
      learn: options.learn !== false,
      performance: options.performance !== false,
      security: options.security !== false,
      standards: options.standards !== false
    };
    
    let result;
    let sqlQuery = '';
    
    // 分析SQL
    const useSubagents = analysisOptions.useSubagents;
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
      
      return result;
    } catch (error) {
      spinner.fail('分析失败');
      console.error(chalk.red('错误:'), error.message);
      process.exit(1);
    }
  } finally {
    // 确保资源被正确释放
  }
}