/**
 * 服务器配置管理
 * 从环境变量读取服务器配置并提供默认值
 */

import { logInfo } from '../utils/logger.js';

/**
 * 获取服务器配置
 * @returns {Object} 服务器配置对象
 */
export function getServerConfig() {
  const serverConfig = {
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0',
    cors: process.env.CORS !== 'false',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
  };

  // 验证环境变量并记录
  if (serverConfig.nodeEnv === 'production') {
    logInfo('生产环境模式已启用');
  } else {
    logInfo('开发环境模式已启用');
  }

  return serverConfig;
}

/**
 * 验证服务器配置
 * @param {Object} config 服务器配置
 * @returns {boolean} 配置是否有效
 */
export function validateServerConfig(config) {
  if (!config.port || config.port < 1 || config.port > 65535) {
    return false;
  }
  
  if (!config.host) {
    return false;
  }
  
  return true;
}

/**
 * 获取数据库配置
 * @returns {Object} 数据库配置对象
 */
export function getDatabaseConfig() {
  return {
    // 这里可以添加数据库相关配置
    // 目前项目主要使用文件存储，所以配置较少
  };
}

export default {
  getServerConfig,
  validateServerConfig,
  getDatabaseConfig
};