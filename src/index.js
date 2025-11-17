#!/usr/bin/env bun

import { program } from 'commander';

// 设置全局错误处理
import { setupGlobalErrorHandlers, logInfo } from './utils/logger.js';
setupGlobalErrorHandlers();

// 记录CLI启动
logInfo(`SQL分析器CLI启动，命令: ${process.argv.join(' ')}`);

// 预加载配置以提升性能
import { getConfigManager } from './services/config/index.js';
const configManager = getConfigManager();
await configManager.getConfig(); // 预热配置缓存
logInfo('配置已预加载到缓存');

// 导入命令注册器
import { commandRegistry } from './cli/commandRegistry.js';

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

// 动态注册所有命令
const commandFiles = [
  'analyze',   // SQL分析命令
  'config',    // 配置管理命令
  'learn',     // 知识库学习命令
  'status',    // 状态查询命令
  'history',   // 历史记录命令
  'init',      // 初始化命令
  'api',       // API服务器命令
  'search',    // 知识库搜索命令
  'ui'         // 可视化终端界面命令
];

// 使用动态导入自动注册命令
for (const cmdName of commandFiles) {
  const cmd = await import(`./cli/commands/${cmdName}.js`);
  commandRegistry.register(cmdName, cmd.default);
}

// 加载所有命令
await commandRegistry.loadAllCommands();

// 解析命令行参数
program.parse();