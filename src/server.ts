#!/usr/bin/env node

/**
 * SQL Analyzer API 服务器入口点
 */

import { createApiServer } from './api/index.js';
import { config } from './config/index.js';
import { setupGlobalErrorHandlers, info as logInfo, error as logError, LogCategory } from './utils/logger.js';
import { getSmartPort, SmartPortManager } from './utils/port-manager.js';

// 设置全局错误处理
setupGlobalErrorHandlers();


// 从配置管理器获取配置
let serverConfig = config.getServerConfig();

// 获取智能端口
try {
  const requestedPort = serverConfig.port;
  const availablePort = await getSmartPort();

  // 更新服务器配置中的端口
  serverConfig = {
    ...serverConfig,
    port: availablePort
  };

  
  // 启动API服务器
  const server = await createApiServer(serverConfig);

  // 优雅关闭处理
  const gracefulShutdown = async (signal: string): Promise<void> => {
    logInfo(LogCategory.SYSTEM, `收到 ${signal} 信号，正在优雅关闭服务器...`);

    if (server && typeof server.stop === 'function') {
      server.stop();
    }

    // 给予一些时间完成正在进行的请求
    setTimeout(async () => {
      try {
        // 清理日志系统定时器
        const { getGlobalLogger } = await import('./utils/logger.js');
        const logger = getGlobalLogger();
        if (logger && typeof logger.cleanup === 'function') {
          await logger.cleanup();
          console.log('✅ 日志系统已清理');
        }
        logInfo(LogCategory.SYSTEM, '服务器已优雅关闭');
      } catch (error) {
        console.error('清理资源时出错:', error);
      }
      process.exit(0);
    }, 5000);
  };

  // 监听关闭信号
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // 监听未捕获的异常
  process.on('uncaughtException', (error: Error) => {
    logError(LogCategory.SYSTEM, '未捕获的异常', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    let error: Error;
    if (reason instanceof Error) {
      error = reason;
    } else {
      error = new Error(String(reason));
    }
    logError(LogCategory.SYSTEM, '未处理的Promise拒绝', error);
    process.exit(1);
  });

} catch (error: any) {
  // 根据错误消息判断是端口错误还是服务器启动错误
  if (error.message && error.message.includes('端口')) {
    logError(LogCategory.SYSTEM, '智能端口解析失败', error);
  } else {
    logError(LogCategory.SYSTEM, '启动API服务器失败', error);
  }
  process.exit(1);
}