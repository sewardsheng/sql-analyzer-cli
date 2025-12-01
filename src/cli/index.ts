#!/usr/bin/env node

/**
 * SQL分析器CLI工具 - 模块化版本
 * 老王我把这个重构得专业多了！每个子命令都独立了！
 */

import { Command } from 'commander';
import { AnalyzeCommand, StatsCommand, HealthCommand, KnowledgeCommand, HistoryCommand, LearnCommand, MenuCommand } from './commands/index.js';
import { cli as cliTools } from '../utils/cli/index.js';

/**
 * SQL分析器CLI主类 - 大大简化！
 */
export class SQLAnalyzerCLI {
  private program: Command;
  private commands: {
    analyze: AnalyzeCommand;
    stats: StatsCommand;
    health: HealthCommand;
    knowledge: KnowledgeCommand;
    history: HistoryCommand;
    learn: LearnCommand;
    menu: MenuCommand;
  };

  constructor() {
    this.program = new Command();
    this.commands = {
      analyze: new AnalyzeCommand(),
      stats: new StatsCommand(),
      health: new HealthCommand(),
      knowledge: new KnowledgeCommand(),
      history: new HistoryCommand(),
      learn: new LearnCommand(),
      menu: new MenuCommand()
    };
    this.setupProgram();
  }

  /**
   * 设置commander程序
   */
  private setupProgram(): void {
    this.program
      .name('sql-analyzer')
      .description('🚀 SQL Analyzer CLI - SQL语句智能分析工具')
      .version('1.0.0')
      .option('--debug', '启用调试模式');

    // 注册子命令
    this.registerMenuCommand();
    this.registerAnalyzeCommand();
    this.registerLearnCommand();
    this.registerHealthCommand();
    this.registerStatsCommand();
    this.registerKnowledgeCommand();
    this.registerHistoryCommand();

    // 处理未知命令
    this.program.on('command:*', () => {
      console.error(cliTools.colors.red(`❌ 未知命令: ${this.program.args.join(' ')}`));
      console.log(cliTools.colors.gray('使用 --help 查看可用命令'));
      process.exit(1);
    });
  }

  /**
   * 注册menu命令
   */
  private registerMenuCommand(): void {
    this.program
      .command('menu')
      .alias('m')
      .description('🎯 启动交互式菜单界面')
      .action(async () => {
        try {
          await this.commands.menu.execute();
        } catch (error: any) {
          cliTools.log.error(error.message);
          process.exit(1);
        }
      });
  }

  /**
   * 注册analyze命令
   */
  private registerAnalyzeCommand(): void {
    this.program
      .command('analyze')
      .alias('a')
      .description('分析SQL语句、SQL文件或目录')
      .option('-s, --sql <sql>', '要分析的SQL语句')
      .option('-f, --file <file>', '要分析的SQL文件路径')
      .option('-d, --directory <directory>', '分析目录中的所有SQL文件')
      .option('-r, --recursive', '递归分析子目录')
      .option('--batch-size <size>', '批处理大小', '10')
      .option('--types <types>', '指定分析类型（逗号分隔）')
      .option('--performance', '启用性能分析')
      .option('--security', '启用安全分析')
      .option('--standards', '启用规范分析')
      .option('--json', '以JSON格式输出结果')
      .option('-o, --output <file>', '输出结果到文件')
      .option('--cache', '启用缓存', true)
      .action(async (options) => {
        try {
          await this.commands.analyze.execute(options);
        } catch (error: any) {
          cliTools.log.error(error.message);
          process.exit(1);
        }
      });
  }

  /**
   * 注册learn命令
   */
  private registerLearnCommand(): void {
    this.program
      .command('learn')
      .alias('l')
      .description('🧠 规则学习 - 从历史记录中学习新的SQL规则')
      .option('--min-confidence <value>', '最小置信度阈值', '0.7')
      .option('--max-rules <count>', '最大生成规则数', '10')
      .option('--force', '强制学习，忽略历史记录数量限制')
      .option('--debug', '显示调试信息')
      .action(async (options) => {
        try {
          await this.commands.learn.execute(options);
        } catch (error: any) {
          cliTools.log.error(error.message);
          process.exit(1);
        }
      });
  }

  /**
   * 注册health命令
   */
  private registerHealthCommand(): void {
    this.program
      .command('health')
      .alias('h')
      .description('系统健康检查')
      .option('--verbose', '显示详细信息')
      .action(async (options) => {
        try {
          await this.commands.health.execute(options);
        } catch (error: any) {
          cliTools.log.error(error.message);
          process.exit(1);
        }
      });
  }

  /**
   * 注册stats命令
   */
  private registerStatsCommand(): void {
    this.program
      .command('stats')
      .alias('s')
      .description('显示分析器统计信息')
      .action(async () => {
        try {
          await this.commands.stats.execute();
        } catch (error: any) {
          cliTools.log.error(error.message);
          process.exit(1);
        }
      });
  }

  /**
   * 注册knowledge命令
   */
  private registerKnowledgeCommand(): void {
    this.program
      .command('knowledge')
      .alias('k')
      .description('知识库管理')
      .action(async (options) => {
        try {
          await this.commands.knowledge.execute(options);
        } catch (error: any) {
          cliTools.log.error(error.message);
          process.exit(1);
        }
      });
  }

  /**
   * 注册history命令
   */
  private registerHistoryCommand(): void {
    this.program
      .command('history')
      .alias('hi')
      .description('历史记录管理')
      .action(async (options) => {
        try {
          await this.commands.history.execute(options);
        } catch (error: any) {
          cliTools.log.error(error.message);
          process.exit(1);
        }
      });
  }

  /**
   * 运行CLI程序
   */
  async run(argv: string[]): Promise<void> {
    let hasExited = false;

    const doCleanupAndExit = async (code: number = 0) => {
      if (!hasExited) {
        hasExited = true;
        await this.cleanupAndExit(code);
      }
    };

    try {
      await this.program.parseAsync(argv);
      // parseAsync会等待命令完成，完成后清理并退出
      // 正常完成，退出码为0
      await doCleanupAndExit();
    } catch (error: any) {
      cliTools.log.error(`CLI运行错误: ${error.message}`);
      // 发生错误，退出码为1
      await doCleanupAndExit(1);
    }
  }

  
  /**
   * 清理资源并退出
   */
  private async cleanupAndExit(exitCode: number = 0): Promise<void> {
    try {
      // 清理日志系统定时器 - 使用按需初始化的日志器
      const { getGlobalLogger } = await import('../utils/logger.js');
      const logger = getGlobalLogger();
      if (logger && typeof logger.cleanup === 'function') {
        await logger.cleanup();
        // 静默清理日志系统，不显示清理消息
      }
    } catch (error) {
      // 忽略清理错误，确保进程能退出
      console.error('清理资源时出错:', error);
    }
    process.exit(exitCode);
  }
}

// 创建并运行CLI实例
const cli = new SQLAnalyzerCLI();
cli.run(process.argv);