/**
 * 配置管理模块
 * 直接使用环境变量，移除复杂的配置管理逻辑
 */

import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 获取LLM配置
 */
export function getLLMConfig() {
  return {
    apiKey: process.env.CUSTOM_API_KEY || '',
    model: process.env.CUSTOM_MODEL || 'zai-org/GLM-4.6',
    baseUrl: process.env.CUSTOM_BASE_URL || 'https://api.siliconflow.cn/v1',
    embeddingModel: process.env.CUSTOM_EMBEDDING_MODEL || 'BAAI/bge-m3'
  };
}

/**
 * 获取服务器配置
 */
export function getServerConfig() {
  return {
    port: parseInt(process.env.PORT) || 3001,
    host: process.env.HOST || '0.0.0.0',
    cors: process.env.CORS !== 'false',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
  };
}

/**
 * 获取API配置
 */
export function getApiConfig() {
  return {
    port: parseInt(process.env.API_PORT) || 3001,
    host: process.env.API_HOST || '0.0.0.0',
    corsEnabled: process.env.API_CORS_ENABLED !== 'false',
    corsOrigin: process.env.API_CORS_ORIGIN || '*',
    enableAISummary: process.env.ENABLE_AI_SUMMARY !== 'false',
    enableColors: process.env.ENABLE_COLORS !== 'false',
    summaryOutputFormat: process.env.SUMMARY_OUTPUT_FORMAT || 'pretty'
  };
}