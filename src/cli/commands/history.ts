/**
 * history命令模块
 * 老王我把历史记录管理独立出来了！
 */

import { ServiceContainer } from '../../services/factories/ServiceContainer.js';
import { cli as cliTools } from '../../utils/cli/index.js';

/**
 * 历史记录管理命令类
 */
export class HistoryCommand {
  private historyService: any;

  constructor() {
    // 使用ServiceContainer统一管理服务
    this.historyService = null; // 延迟初始化
  }

  /**
   * 获取历史服务
   */
  private async getHistoryService() {
    if (!this.historyService) {
      const serviceContainer = ServiceContainer.getInstance();
      this.historyService = await serviceContainer.getHistoryService();
    }
    return this.historyService;
  }

  /**
   * 处理历史记录命令
   */
  async execute(options: any): Promise<void> {
    const subcommand = options._?.[1] || 'list';

    try {
      switch (subcommand) {
        case 'list':
          await this.listHistory(options);
          break;
        case 'show':
          await this.showHistory(options.id);
          break;
        case 'search':
          await this.searchHistory(options.query);
          break;
        case 'clear':
          await this.clearHistory();
          break;
        default:
          this.showHelp();
      }
    } catch (error: any) {
      cliTools.log.error(`历史记录操作失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 列出历史记录
   */
  private async listHistory(options: any): Promise<void> {
    cliTools.log.info('📋 获取历史记录...');

    const historyService = await this.getHistoryService();
    const history = await historyService.getAllHistory({
      limit: options.limit || 20,
      offset: options.offset || 0
    });

    console.log(cliTools.colors.cyan('\n📜 分析历史记录'));
    console.log(cliTools.colors.gray('=================================================='));

    if (history.length === 0) {
      console.log(cliTools.colors.yellow('📭 暂无历史记录'));
      return;
    }

    history.forEach((record: any, index: number) => {
      console.log(`\n${cliTools.colors.yellow(`${index + 1}. ${record.id}`)}`);
      console.log(`  时间: ${cliTools.colors.blue(new Date(record.timestamp).toLocaleString())}`);
      console.log(`  SQL: ${cliTools.colors.gray(record.sql?.substring(0, 100) + (record.sql?.length > 100 ? '...' : ''))}`);

      if (record.analysis && (record.analysis as any).overallScore) {
        let scoreColor = cliTools.colors.green;
        if ((record.analysis as any).overallScore < 60) scoreColor = cliTools.colors.red;
        else if ((record.analysis as any).overallScore < 80) scoreColor = cliTools.colors.yellow;
        console.log(`  评分: ${scoreColor((record.analysis as any).overallScore + '分')}`);
      }
    });
  }

  /**
   * 显示历史记录详情
   */
  private async showHistory(id: string): Promise<void> {
    if (!id) {
      console.log(cliTools.colors.red('❌ 请指定历史记录ID'));
      console.log(cliTools.colors.gray('用法: sql-analyzer history show <id>'));
      return;
    }

    cliTools.log.info(`🔍 获取历史记录详情: ${cliTools.colors.cyan(id)}`);

    const historyService = await this.getHistoryService();
    const record = await historyService.getHistoryById(id);

    if (!record) {
      console.log(cliTools.colors.red(`❌ 未找到ID为 ${id} 的历史记录`));
      return;
    }

    console.log(cliTools.colors.cyan('\n📜 历史记录详情'));
    console.log(cliTools.colors.gray('=================================================='));
    console.log(`ID: ${cliTools.colors.yellow(record.id)}`);
    console.log(`时间: ${cliTools.colors.blue(new Date(record.timestamp).toLocaleString())}`);
    console.log(`SQL: ${cliTools.colors.gray(record.sql)}`);

    if ((record as any).analysis) {
      const analysis = (record as any).analysis;
      if (analysis.overallScore) {
        let scoreColor = cliTools.colors.green;
        if (analysis.overallScore < 60) scoreColor = cliTools.colors.red;
        else if (analysis.overallScore < 80) scoreColor = cliTools.colors.yellow;
        console.log(`评分: ${scoreColor(analysis.overallScore + '分')}`);
      }

      if (analysis.issues && analysis.issues.length > 0) {
        console.log(`问题数: ${cliTools.colors.red(analysis.issues.length.toString())}`);
      }

      if (analysis.recommendations && analysis.recommendations.length > 0) {
        console.log(`建议数: ${cliTools.colors.blue(analysis.recommendations.length.toString())}`);
      }
    }
  }

  /**
   * 搜索历史记录
   */
  private async searchHistory(query: string): Promise<void> {
    if (!query) {
      console.log(cliTools.colors.red('❌ 请指定搜索关键词'));
      console.log(cliTools.colors.gray('用法: sql-analyzer history search <query>'));
      return;
    }

    cliTools.log.info(`🔍 搜索历史记录: ${cliTools.colors.cyan(query)}`);

    const historyService = await this.getHistoryService();
    const results = await historyService.searchHistory(query, {
      limit: 10
    });

    console.log(cliTools.colors.cyan('\n🔍 搜索结果'));
    console.log(cliTools.colors.gray('=================================================='));

    if (results.length === 0) {
      console.log(cliTools.colors.yellow('📭 未找到匹配的历史记录'));
      return;
    }

    results.forEach((record: any, index: number) => {
      console.log(`\n${cliTools.colors.yellow(`${index + 1}. ${record.id}`)}`);
      console.log(`  时间: ${cliTools.colors.blue(new Date(record.timestamp).toLocaleString())}`);
      console.log(`  SQL: ${cliTools.colors.gray(record.sql?.substring(0, 100) + '...')}`);
    });
  }

  /**
   * 清空历史记录
   */
  private async clearHistory(): Promise<void> {
    cliTools.log.warn('🗑️ 清空历史记录...');

    // 模拟用户确认（在实际应用中可以添加交互式确认）
    console.log(cliTools.colors.yellow('⚠️  这将删除所有历史记录，此操作不可恢复！'));

    const historyService = await this.getHistoryService();
    await historyService.clearHistory();
    console.log(cliTools.colors.green('✅ 历史记录已清空'));
  }

  /**
   * 显示帮助信息
   */
  private showHelp(): void {
    console.log(cliTools.colors.cyan('\n📜 历史记录管理命令'));
    console.log(cliTools.colors.gray('=================================================='));
    console.log('子命令:');
    console.log('  list                    列出历史记录');
    console.log('  show <id>               显示历史记录详情');
    console.log('  search <query>          搜索历史记录');
    console.log('  clear                   清空历史记录');
    console.log('\n选项:');
    console.log('  --limit <number>        限制显示数量 (默认: 20)');
    console.log('  --offset <number>       跳过指定数量');
    console.log('\n用法:');
    console.log('  sql-analyzer history list');
    console.log('  sql-analyzer history show abc123');
    console.log('  sql-analyzer history search "SELECT"');
    console.log('  sql-analyzer history clear');
  }
}