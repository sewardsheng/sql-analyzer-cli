#!/usr/bin/env bun

/**
 * SQL Analyzer API 服务器入口点
 */

import { createApiServer } from './api/index.js';
import { config } from './config/index.js';
import { setupGlobalErrorHandlers, info as logInfo, error as logError, LogCategory } from './utils/logger.js';

// 设置全局错误处理
setupGlobalErrorHandlers();

// 记录服务器启动
logInfo(LogCategory.SYSTEM, 'SQL Analyzer API 服务器启动中...');

// 从配置管理器获取配置
const serverConfig = config.getServerConfig();

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
    let error;
    if (reason instanceof Error) {
      error = reason;
    } else {
      error = new Error(String(reason));
    }
    logError(LogCategory.SYSTEM, '未处理的Promise拒绝', error);
    process.exit(1);
  });
  
} catch (error) {
  logError(LogCategory.SYSTEM, '启动API服务器失败', error);
  process.exit(1);
}