#!/usr/bin/env bun

import { program } from 'commander';
import path from 'path';
import { config } from 'dotenv';
import { createRequire } from 'module';

// 加载环境变量
config();

// 设置全局错误处理
import { setupGlobalErrorHandlers, logInfo } from '../src/utils/logger.js';
setupGlobalErrorHandlers();

// 记录CLI启动
logInfo(`SQL分析器CLI启动，命令: ${process.argv.join(' ')}`);

// 导入CLI模块
import { analyzeSql } from '../src/index.js';

// 配置CLI程序
program
  .name('sql-analyzer')
  .description('SQL语句智能分析与扫描工具')
  .version('1.0.0');

// 默认行为：显示帮助信息
program.action(() => {
  console.log('错误：未知的命令或参数。');
  program.help();
});

// UI命令：启动Terminal UI模式
program
  .command('ui')
  .description('启动Terminal UI模式，提供交互式菜单界面')
  .action(async () => {
    try {
      const { terminalUIMode } = await import('../src/services/ui/terminalUI.js');
      await terminalUIMode();
    } catch (error) {
      console.error('Terminal UI模式中发生错误:', error.message);
      process.exit(1);
    }
  });

// 分析SQL命令
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
    } catch (error) {
      console.error('分析过程中发生错误:', error.message);
      process.exit(1);
    }
  });

// 初始化命令
program
  .command('init')
  .description('初始化环境配置文件')
  .action(async () => {
    try {
      const { initEnvironment } = await import('../src/utils/env.js');
      await initEnvironment();
    } catch (error) {
      console.error('初始化过程中发生错误:', error.message);
      process.exit(1);
    }
  });

// 配置命令
const configCommand = program
  .command('config')
  .description('配置API密钥和模型设置');

// 配置子命令：list
configCommand
  .command('list')
  .description('显示所有配置项')
  .action(async () => {
    try {
      const { listConfig } = await import('../src/utils/config.js');
      await listConfig();
    } catch (error) {
      console.error('显示配置列表时发生错误:', error.message);
      process.exit(1);
    }
  });

// 配置子命令：get
configCommand
  .command('get <key>')
  .description('获取特定配置项')
  .action(async (key) => {
    try {
      const { getConfigValue } = await import('../src/utils/config.js');
      await getConfigValue(key);
    } catch (error) {
      console.error('获取配置项时发生错误:', error.message);
      process.exit(1);
    }
  });

// 配置子命令：set
configCommand
  .command('set <key> <value>')
  .description('设置配置项')
  .action(async (key, value) => {
    try {
      const { setConfigValue } = await import('../src/utils/config.js');
      await setConfigValue(key, value);
    } catch (error) {
      console.error('设置配置项时发生错误:', error.message);
      process.exit(1);
    }
  });

// 配置子命令：reset
configCommand
  .command('reset')
  .description('重置所有配置为默认值')
  .action(async () => {
    try {
      const { resetConfig } = await import('../src/utils/config.js');
      await resetConfig();
    } catch (error) {
      console.error('重置配置时发生错误:', error.message);
      process.exit(1);
    }
  });

// 默认config命令行为（保持向后兼容）
configCommand
  .action(async () => {
    try {
      const { configureSettings } = await import('../src/utils/config.js');
      await configureSettings();
    } catch (error) {
      console.error('配置过程中发生错误:', error.message);
      process.exit(1);
    }
  });

// 学习命令
program
  .command('learn')
  .description('加载rules目录中的文档到知识库，供Agent使用')
  .option('-r, --rules-dir <dir>', 'rules目录路径', './rules')
  .option('--reset', '重置知识库')
  .option('--api-key <key>', 'OpenAI API密钥')
  .option('--base-url <url>', 'API基础URL')
  .option('--model <model>', '使用的模型名称')
  .option('--embedding-model <model>', '使用的嵌入模型名称')
  .action(async (options) => {
    try {
      const { learnDocuments } = await import('../src/services/knowledge/learn.js');
      await learnDocuments(options);
    } catch (error) {
      console.error('学习过程中发生错误:', error.message);
      process.exit(1);
    }
  });

// 知识库状态命令
program
  .command('status')
  .description('显示知识库状态')
  .option('--interactive', '以交互模式显示状态，支持返回主菜单')
  .action(async (options) => {
    try {
      const { showKnowledgeStatus } = await import('../src/services/knowledge/learn.js');
      const returnToMenu = await showKnowledgeStatus(options.interactive);
      
      // 如果是交互模式且用户选择返回主菜单，则启动Terminal UI模式
      if (options.interactive && returnToMenu) {
        const { terminalUIMode } = await import('../src/services/ui/terminalUI.js');
        await terminalUIMode();
      }
    } catch (error) {
      console.error('检查状态过程中发生错误:', error.message);
      process.exit(1);
    }
  });

// API服务器命令
program
  .command('api')
  .description('启动SQL分析API服务器')
  .option('-p, --port <port>', 'API服务器端口', '3000')
  .option('-h, --host <host>', 'API服务器主机', '0.0.0.0')
  .option('--no-cors', '禁用CORS')
  .option('--cors-origin <origin>', 'CORS允许的源', '*')
  .action(async (options) => {
    try {
      const { createApiServer } = await import('../src/services/api/apiServer.js');
      createApiServer(options);
    } catch (error) {
      console.error('启动API服务器时发生错误:', error.message);
      process.exit(1);
    }
  });

// 历史记录命令
const historyCommand = program
  .command('history')
  .description('管理SQL分析历史记录，支持查看、删除和清空历史记录');

// 历史记录子命令：list
historyCommand
  .command('list')
  .description('显示所有历史记录列表')
  .action(async () => {
    const { listHistory } = await import('../src/services/history/history.js');
    listHistory();
  });

// 历史记录子命令：detail
historyCommand
  .command('detail <id>')
  .description('显示指定ID的历史记录详情')
  .action(async (id) => {
    const { showHistoryDetail } = await import('../src/services/history/history.js');
    showHistoryDetail(id);
  });

// 历史记录子命令：delete
historyCommand
  .command('delete <id>')
  .description('删除指定ID的历史记录')
  .action(async (id) => {
    const { deleteHistory } = await import('../src/services/history/history.js');
    deleteHistory(id);
  });

// 历史记录子命令：clear
historyCommand
  .command('clear')
  .description('清空所有历史记录')
  .action(async () => {
    const { clearAllHistory } = await import('../src/services/history/history.js');
    clearAllHistory();
  });

// 历史记录子命令：stats
historyCommand
  .command('stats')
  .description('显示历史记录统计信息')
  .action(async () => {
    const { showHistoryStats } = await import('../src/services/history/history.js');
    showHistoryStats();
  });

// 解析命令行参数
program.parse();