import path from 'path';

/**
 * 配置文件路径
 */
export const ENV_FILE = path.join(process.cwd(), '.env');

/**
 * 默认配置
 */
export const DEFAULT_CONFIG = {
  baseURL: 'https://api.siliconflow.cn/v1',
  apiKey: '',
  model: 'zai-org/GLM-4.6',
  embeddingModel: 'BAAI/bge-m3',
  // API服务器配置
  apiPort: 3000,
  apiHost: '0.0.0.0',
  apiCorsEnabled: true,
  apiCorsOrigin: '*'
};

/**
 * 配置键映射
 * 将内部配置键映射到环境变量键
 */
export const CONFIG_KEYS = {
  apiKey: 'CUSTOM_API_KEY',
  baseURL: 'CUSTOM_BASE_URL',
  model: 'CUSTOM_MODEL',
  embeddingModel: 'CUSTOM_EMBEDDING_MODEL',
  apiPort: 'API_PORT',
  apiHost: 'API_HOST',
  apiCorsEnabled: 'API_CORS_ENABLED',
  apiCorsOrigin: 'API_CORS_ORIGIN'
};

/**
 * 配置项描述映射
 * 为环境变量提供描述信息
 */
export const CONFIG_DESCRIPTIONS = {
  CUSTOM_API_KEY: 'API密钥',
  CUSTOM_BASE_URL: '自定义API基础URL',
  CUSTOM_MODEL: '模型名称',
  CUSTOM_EMBEDDING_MODEL: '嵌入模型名称',
  API_PORT: 'API服务器端口',
  API_HOST: 'API服务器主机',
  API_CORS_ENABLED: '是否启用CORS',
  API_CORS_ORIGIN: 'CORS允许的源'
};

/**
 * 环境变量写入顺序
 */
export const ENV_ORDER = Object.values(CONFIG_KEYS);

/**
 * 缓存持续时间（毫秒）
 */
export const CACHE_DURATION = 1000;