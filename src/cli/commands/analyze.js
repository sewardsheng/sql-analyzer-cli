/**
 * 分析SQL命令模块
 * 提供SQL语句分析功能
 */

import { analyzeSql } from '../../index.js';

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
    .option('-d, --database <type>', '数据库类型 (mysql, postgresql, oracle, sqlserver)', 'mysql')
    .option('--api-key <key>', 'OpenAI API密钥')
    .option('--base-url <url>', 'API基础URL')
    .option('--model <model>', '使用的模型名称')
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