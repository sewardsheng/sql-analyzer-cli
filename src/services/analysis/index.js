/**
 * SQL分析服务入口
 * 提供SQL分析功能的统一接口
 */

import { createCoordinator } from '../../core/coordinator.js';
import { readConfig } from '../config/index.js';
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
 * @param {boolean} [options.simplifiedOutput] - 是否简化输出
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
    
    // 获取SQL语句
    let sqlQuery;
    if (sql) {
      sqlQuery = sql;
      console.log(chalk.blue('\n正在分析SQL语句...'));
    } else {
      console.log(chalk.blue(`\n正在从文件读取SQL: ${file}`));
      sqlQuery = await readSqlFromFile(file);
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
    
    // 显示结果摘要
    console.log(chalk.green.bold('\n✓ 分析完成!'));
    console.log(chalk.gray('\n分析结果已生成，详细信息请查看上方输出。'));
    
    // 如果需要简化输出，只返回关键信息
    if (analysisOptions.simplifiedOutput) {
      return {
        success: true,
        summary: result.data.report?.summary || '分析完成',
        overallScore: result.data.report?.overallAssessment?.score || '未知',
        databaseType: result.data.databaseType,
        recommendations: result.data.report?.overallAssessment?.recommendations || []
      };
    }
    
    return result;
  } catch (error) {
    console.error(chalk.red(`\n✗ 分析失败: ${error.message}`));
    throw error;
  }
}

export {
  analyzeSql
};