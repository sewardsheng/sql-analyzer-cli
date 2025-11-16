/**
 * SQL分析服务入口
 * 提供SQL分析功能的统一接口
 */

import { createCoordinator } from '../../core/coordinator.js';
import { readConfig } from '../config/index.js';
import HistoryService from '../history/historyService.js';
import { displayEnhancedSummary } from '../../utils/summaryDisplay.js';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

/**
 * 从文件读取SQL语句
 * @param {string} filePath - SQL文件路径
 * @returns {Promise<string>} SQL语句内容
 */
async function readSqlFromFile(filePath) {
  try {
    const absolutePath = path.resolve(filePath);
    const content = await fs.readFile(absolutePath, 'utf8');
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      throw new Error(`文件 ${filePath} 为空或只包含空白字符`);
    }

    return trimmedContent;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`文件不存在: ${filePath}`);
    } else if (error.code === 'EACCES') {
      throw new Error(`没有权限读取文件: ${filePath}`);
    } else {
      throw new Error(`无法读取文件 ${filePath}: ${error.message}`);
    }
  }
}

/**
 * 分析SQL语句
 * @param {Object} options - 分析选项
 * @param {string} [options.sql] - 要分析的SQL语句
 * @param {string} [options.file] - 包含SQL语句的文件路径
 * @param {boolean} [options.learn] - 是否启用学习功能
 * @param {boolean} [options.performance] - 是否启用性能分析
 * @param {boolean} [options.security] - 是否启用安全审计
 * @param {boolean} [options.standards] - 是否启用编码规范检查
 * @returns {Promise<Object>} 分析结果
 */
async function analyzeSql(options) {
  try {
    const { sql, file, ...analysisOptions } = options;
    
    // 验证输入
    if (!sql && !file) {
      throw new Error('必须提供 --sql 或 --file 参数');
    }
    
    // 获取SQL语句和输入类型
    let sqlQuery;
    let inputType; // 'command' 表示命令行输入, 'file' 表示文件输入
    
    if (sql) {
      sqlQuery = sql;
      inputType = 'command';
      console.log(chalk.blue('\n正在分析SQL语句...'));
    } else {
      sqlQuery = await readSqlFromFile(file);
      inputType = 'file';
      console.log(chalk.blue(`\n正在从文件读取SQL: ${file}`));
      console.log(chalk.green('✓ 文件读取成功'));
    }
    
    // 读取配置
    const config = await readConfig();
    
    // 创建协调器
    const coordinator = createCoordinator(config);
    
    // 执行分析
    console.log(chalk.blue('\n开始执行多维度SQL分析...\n'));
    console.log('='.repeat(60));
    
    // 添加错误捕获以便调试
    console.log(chalk.gray('调用协调器进行分析...'));
    
    const result = await coordinator.coordinateAnalysis({
      sqlQuery,
      options: analysisOptions
    });
    
    console.log('='.repeat(60));
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    // 保存分析结果到历史记录
    try {
      const historyService = new HistoryService();
      const historyId = historyService.saveAnalysis({
        sql: sqlQuery,
        result: result,
        type: inputType // 使用实际的输入类型: 'command' 或 'file'
      });
      console.log(chalk.gray(`\n历史记录已保存: ${historyId}`));
    } catch (historyError) {
      console.warn(chalk.yellow(`警告: 保存历史记录失败: ${historyError.message}`));
    }
    
    // 显示增强的结果摘要
    // displayEnhancedSummary(result, config);
    console.log("--flag 显示增强的结果摘要");
    return result;
  } catch (error) {
    console.error(chalk.red(`\n✗ 分析失败: ${error.message}`));
    throw error;
  }
}

export {
  analyzeSql
};