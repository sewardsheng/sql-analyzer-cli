#!/usr/bin/env bun

/**
 * SQL Analyzer API 服务器入口点
 */

import { createApiServer } from './api/index.js';
import { unifiedConfigManager } from './config/config-manager.js';
import { setupGlobalErrorHandlers, info as logInfo, error as logError, LogCategory } from './utils/logger.js';

// 设置全局错误处理
setupGlobalErrorHandlers();

// 记录服务器启动
logInfo(LogCategory.SYSTEM, 'SQL Analyzer API 服务器启动中...');

// 从环境变量和配置管理器获取配置
const apiConfig = unifiedConfigManager.getAPIConfig();
const serverConfig = {
  port: parseInt(process.env.API_PORT) || apiConfig.port,
  host: process.env.API_HOST || apiConfig.host,
  cors: process.env.API_CORS_ENABLED !== 'false' && apiConfig.corsEnabled,
  corsOrigin: process.env.API_CORS_ORIGIN || apiConfig.corsOrigin,
  nodeEnv: process.env.NODE_ENV || apiConfig.nodeEnv || 'development',
  logLevel: process.env.LOG_LEVEL || apiConfig.logLevel || 'info'
};

// 验证环境变量
if (serverConfig.nodeEnv === 'production') {
  logInfo(LogCategory.SYSTEM, '生产环境模式已启用');
} else {
  logInfo(LogCategory.SYSTEM, '开发环境模式已启用');
}

// 启动API服务器
try {
  const server = await createApiServer(serverConfig);
  
  // 优雅关闭处理
  const gracefulShutdown = (signal) => {
    logInfo(LogCategory.SYSTEM, `收到 ${signal} 信号，正在优雅关闭服务器...`);
    
    if (server && typeof server.stop === 'function') {
      server.stop();
    }
    
    // 给予一些时间完成正在进行的请求
    setTimeout(() => {
      logInfo(LogCategory.SYSTEM, '服务器已优雅关闭');
      process.exit(0);
    }, 5000);
  };
  
  // 监听关闭信号
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // 监听未捕获的异常
  process.on('uncaughtException', (error) => {
    logError(LogCategory.SYSTEM, '未捕获的异常', error);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logError(LogCategory.SYSTEM, '未处理的Promise拒绝', new Error(reason));
    process.exit(1);
  });
  
} catch (error) {
  logError(LogCategory.SYSTEM, '启动API服务器失败', error);
  process.exit(1);
}