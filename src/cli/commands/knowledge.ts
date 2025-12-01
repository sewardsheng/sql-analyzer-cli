/**
 * knowledge命令模块
 * 老王我把知识库管理独立出来了！
 */

import { knowledgeService } from '../../services/knowledge-service.js';
import { cli as cliTools } from '../../utils/cli/index.js';

/**
 * 知识库管理命令类
 */
export class KnowledgeCommand {
  /**
   * 处理知识库命令
   */
  async execute(options: any): Promise<void> {
    const subcommand = options._?.[1] || 'status';

    try {
      switch (subcommand) {
        case 'status':
          await this.showStatus();
          break;
        case 'reset':
          await this.resetKnowledge();
          break;
        case 'learn':
          await this.learnRules(options.directory);
          break;
        default:
          this.showHelp();
      }
    } catch (error: any) {
      cliTools.log.error(`知识库操作失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 显示知识库状态
   */
  private async showStatus(): Promise<void> {
    cliTools.log.info('🔍 查询知识库状态...');

    const status = await knowledgeService.getStatus();

    console.log(cliTools.colors.cyan('\n📚 知识库状态'));
    console.log(cliTools.colors.gray('=================================================='));

    const enabledColor = status.enabled ? cliTools.colors.green : cliTools.colors.red;
    const initializedColor = status.initialized ? cliTools.colors.green : cliTools.colors.red;

    console.log(`知识库功能: ${enabledColor(status.enabled ? '启用' : '禁用')}`);
    console.log(`初始化状态: ${initializedColor(status.initialized ? '已初始化' : '未初始化')}`);
    console.log(`规则数量: ${cliTools.colors.yellow(status.rulesCount?.toString() || '0')}`);

    if (status.error) {
      console.log(`错误信息: ${cliTools.colors.red(status.error)}`);
    }
  }

  /**
   * 重置知识库
   */
  private async resetKnowledge(): Promise<void> {
    cliTools.log.warn('🔄 重置知识库...');

    const result = await knowledgeService.resetKnowledge();

    if (result.success) {
      console.log(cliTools.colors.green('✅ 知识库重置成功'));
    } else {
      console.log(cliTools.colors.red(`❌ 知识库重置失败: ${result.error}`));
    }
  }

  /**
   * 学习规则文档
   */
  private async learnRules(directory: string): Promise<void> {
    if (!directory) {
      console.log(cliTools.colors.red('❌ 请指定学习文档的目录路径'));
      console.log(cliTools.colors.gray('用法: sql-analyzer knowledge learn <directory>'));
      return;
    }

    cliTools.log.info(`📖 从目录学习规则: ${cliTools.colors.cyan(directory)}`);

    const result = await knowledgeService.learnDocuments({
      inputDirectory: directory,
      clearExisting: false
    });

    if (result.success) {
      console.log(cliTools.colors.green('✅ 规则学习完成'));
      console.log(`状态: ${cliTools.colors.yellow(result.message || '完成')}`);
    } else {
      console.log(cliTools.colors.red(`❌ 规则学习失败: ${result.error}`));
    }
  }

  /**
   * 显示帮助信息
   */
  private showHelp(): void {
    console.log(cliTools.colors.cyan('\n📚 知识库管理命令'));
    console.log(cliTools.colors.gray('=================================================='));
    console.log('子命令:');
    console.log('  status                  显示知识库状态');
    console.log('  reset                   重置知识库');
    console.log('  learn <directory>       从指定目录学习规则文档');
    console.log('\n用法:');
    console.log('  sql-analyzer knowledge status');
    console.log('  sql-analyzer knowledge reset');
    console.log('  sql-analyzer knowledge learn ./rules');
  }
}