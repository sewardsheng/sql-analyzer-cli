/**
 * stats命令模块
 * 老王我把stats命令独立出来了！
 */

import { createSQLAnalyzer } from '../../core/index.js';
import { cli as cliTools } from '../../utils/cli/index.js';

/**
 * 统计信息命令类
 */
export class StatsCommand {
  private analyzer: any;

  constructor() {
    // 初始化分析器
    this.analyzer = createSQLAnalyzer({
      enableCaching: true,
      enableKnowledgeBase: true,
      maxConcurrency: 3
    });
  }

  /**
   * 处理统计信息命令
   */
  async execute(): Promise<void> {
    console.log(cliTools.colors.cyan`📊 分析器统计信息:`);

    try {
      // 获取分析器统计信息
      const stats = this.analyzer.getStats();

      // 显示分析统计
      console.log(`总分析次数: ${cliTools.colors.yellow(stats.totalAnalyses || 0)}`);
      console.log(`成功分析: ${cliTools.colors.green(stats.successfulAnalyses || 0)}`);
      console.log(`失败次数: ${cliTools.colors.red(stats.errors || 0)}`);

      if (stats.totalAnalyses > 0) {
        const avgDuration = stats.totalDuration / stats.totalAnalyses;
        const successRate = ((stats.successfulAnalyses / stats.totalAnalyses) * 100).toFixed(1);
        const cacheHitRate = stats.cacheHits ? ((stats.cacheHits / stats.totalAnalyses) * 100).toFixed(1) : '0.0';

        console.log(`平均耗时: ${cliTools.colors.cyan(`${Math.round(avgDuration)}ms`)}`);
        console.log(`成功率: ${cliTools.colors.green(`${successRate}%`)}`);
        console.log(`缓存命中率: ${cliTools.colors.blue(`${cacheHitRate}%`)}`);
      } else {
        console.log(`平均耗时: ${cliTools.colors.cyan('0ms')}`);
        console.log(`成功率: ${cliTools.colors.green('--%')}`);
        console.log(`缓存命中率: ${cliTools.colors.blue('--%')}`);
      }

      console.log('');
      console.log(cliTools.colors.yellow`⚙️  当前配置:`);
      console.log(`分析器类型: ${cliTools.colors.cyan('SQLAnalyzer')}`);
      console.log(`知识库支持: ${cliTools.colors.green('启用')}`);
      console.log(`缓存功能: ${cliTools.colors.green('启用')}`);
      console.log(`并发数: ${cliTools.colors.cyan('3')}`);

    } catch (error: any) {
      cliTools.log.error(`获取统计信息失败: ${error.message}`);
      throw error;
    }
  }
}