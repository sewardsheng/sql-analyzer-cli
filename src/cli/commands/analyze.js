/**
 * 分析SQL命令模块
 * 提供SQL语句分析功能
 */

import { analyzeSql } from '../../services/analysis/index.js';

/**
 * 注册analyze命令
 * @param {Object} program - commander程序对象
 */
function register(program) {
  program
    .command('analyze')
    .description('分析SQL语句的性能、安全性和规范性')
    .option('-s, --sql <sql>', '要分析的SQL语句')
    .option('-f, --file <file>', '包含SQL语句的文件路径')
    .option('--no-learn', '禁用学习功能')
    .option('--no-performance', '禁用性能分析')
    .option('--no-security', '禁用安全审计')
    .option('--no-standards', '禁用编码规范检查')
    .action(async (options) => {
      try {
        await analyzeSql(options);
        process.exit(0);
      } catch (error) {
        console.error('分析过程中发生错误:', error.message);
        process.exit(1);
      }
    });
}

export default {
  register
};