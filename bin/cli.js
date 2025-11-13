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

// 导入命令注册器
import { commandRegistry } from '../src/cli/commandRegistry.js';

// 导入所有命令模块
import uiCommand from '../src/cli/commands/ui.js';
import analyzeCommand from '../src/cli/commands/analyze.js';
import initCommand from '../src/cli/commands/init.js';
import configCommand from '../src/cli/commands/config.js';
import learnCommand from '../src/cli/commands/learn.js';
import statusCommand from '../src/cli/commands/status.js';
import apiCommand from '../src/cli/commands/api.js';
import historyCommand from '../src/cli/commands/history.js';

// 配置CLI程序
program
  .name('sql-analyzer')
  .description('SQL语句智能分析与扫描工具')
  .version('1.0.0');

// 默认行为：显示帮助信息
program.action(() => {
  console.log('错误：未知的命令或参数。');
  program.help();
  process.exit(0);
});

// 注册所有命令
commandRegistry.registerBatch({
  ui: uiCommand,
  analyze: analyzeCommand,
  init: initCommand,
  config: configCommand,
  learn: learnCommand,
  status: statusCommand,
  api: apiCommand,
  history: historyCommand
});

// 加载所有命令
await commandRegistry.loadAllCommands();

// 解析命令行参数
program.parse();