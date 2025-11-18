/**
 * 分析SQL命令模块
 * 提供SQL语句分析功能
 */

import { getAnalysisService } from '../../services/analysis/index.js';

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
    .option('--quick', '快速分析模式，只进行基础检查，不进行深度分析和学习')
    
    // Headless 模式选项
    .option('--headless', '无界面模式，适用于自动化和程序化调用')
    .option('--format <format>', '输出格式 (json|structured|summary)', 'summary')
    .option('--threshold <score>', '评分阈值，低于此值返回非零退出码 (0-100)', '70')
    .option('--exit-code', '根据评分阈值设置退出码')
    .option('--pipe', '管道模式，输出到stdout便于管道操作')
    .option('--output-file <file>', '输出到文件而非控制台')
    .option('--quiet', '静默模式，只输出结果和错误信息')
    
    .option('--no-learn', '禁用学习功能')
    .option('--no-performance', '禁用性能分析')
    .option('--no-security', '禁用安全审计')
    .option('--no-standards', '禁用编码规范检查')
    .action(async (options) => {
      try {
        const analysisService = getAnalysisService();
        await analysisService.analyzeSql(options);
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