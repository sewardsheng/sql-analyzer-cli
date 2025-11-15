/**
 * 配置服务入口
 * 提供统一的配置管理功能
 */

// 核心服务和常量
export { DEFAULT_CONFIG, CONFIG_KEYS, CONFIG_DESCRIPTIONS } from './constants.js';
export { getConfig, setConfig, readConfig, clearConfigCache } from './configService.js';
export { readEnvFile, writeEnvFile } from './envHandler.js';

// 命令相关功能（commandManager已移除）

// 导出常用命令，方便直接使用
export { listConfig, configGet, configSet, resetConfig } from './commands/baseCommands.js';