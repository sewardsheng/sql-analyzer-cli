#!/usr/bin/env bun

/**
 * SQL Analyzer API 服务器入口点
 * 纯API模式，移除所有CLI相关功能
 */

import { createApiServer } from './api/index.js';
import { setupGlobalErrorHandlers, logInfo, logError } from './utils/logger.js';

// 设置全局错误处理
setupGlobalErrorHandlers();

// 记录服务器启动
logInfo('SQL Analyzer API 服务器启动中...');

// 从环境变量获取配置
const serverConfig = {
  port: parseInt(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  cors: process.env.CORS !== 'false',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info'
};

// 验证环境变量
if (serverConfig.nodeEnv === 'production') {
  logInfo('生产环境模式已启用');
} else {
  logInfo('开发环境模式已启用');
}

// 启动API服务器
try {
  console.log('[DEBUG] 开始创建API服务器...');
  const server = await createApiServer(serverConfig);
  console.log('[DEBUG] API服务器创建成功');
  
  // 优雅关闭处理
  const gracefulShutdown = (signal) => {
    console.log(`[DEBUG] 收到 ${signal} 信号，正在优雅关闭服务器...`);
    logInfo(`收到 ${signal} 信号，正在优雅关闭服务器...`);
    
    if (server && typeof server.stop === 'function') {
      server.stop();
    }
    
    // 给予一些时间完成正在进行的请求
    setTimeout(() => {
      console.log('[DEBUG] 服务器已优雅关闭');
      logInfo('服务器已优雅关闭');
      process.exit(0);
    }, 5000);
  };
  
  // 监听关闭信号
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // 监听未捕获的异常
  process.on('uncaughtException', (error) => {
    console.log('[DEBUG] 未捕获的异常:', error);
    logError('未捕获的异常', error);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.log('[DEBUG] 未处理的Promise拒绝:', reason);
    logError('未处理的Promise拒绝', new Error(reason));
    process.exit(1);
  });
  
  console.log('[DEBUG] 服务器启动完成，保持运行状态...');
  
} catch (error) {
  console.log('[DEBUG] 启动API服务器失败:', error);
  logError('启动API服务器失败', error);
  process.exit(1);
}