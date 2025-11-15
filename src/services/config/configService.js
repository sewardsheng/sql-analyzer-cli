import { DEFAULT_CONFIG, CONFIG_KEYS, ENV_FILE, CACHE_DURATION } from './constants.js';
import { readEnvFile, writeEnvFile } from './envHandler.js';

// 配置缓存，避免频繁读取文件
let configCache = null;
let lastReadTime = 0;

/**
 * 清除配置缓存
 */
export function clearConfigCache() {
  configCache = null;
  lastReadTime = 0;
}

/**
 * 检查缓存是否有效
 * @returns {boolean} 缓存是否有效
 */
function isCacheValid() {
  const now = Date.now();
  return configCache && (now - lastReadTime < CACHE_DURATION);
}

/**
 * 获取缓存的配置
 * @returns {Object|null} 缓存的配置对象或null
 */
function getCachedConfig() {
  return configCache ? { ...configCache } : null;
}

/**
 * 设置配置缓存
 * @param {Object} config 要缓存的配置对象
 */
function setConfigCache(config) {
  configCache = { ...config };
  lastReadTime = Date.now();
}

/**
 * 读取配置
 * @returns {Promise<Object>} 配置对象
 */
export async function readConfig() {
  // 检查缓存是否有效
  if (isCacheValid()) {
    return getCachedConfig();
  }
  
  try {
    const env = await readEnvFile();
    
    // 从环境变量中读取配置，优先使用.env文件中的值
    const config = {
      baseURL: env.CUSTOM_BASE_URL || process.env.CUSTOM_BASE_URL || DEFAULT_CONFIG.baseURL,
      apiKey: env.CUSTOM_API_KEY || process.env.CUSTOM_API_KEY || DEFAULT_CONFIG.apiKey,
      model: env.CUSTOM_MODEL || process.env.CUSTOM_MODEL || DEFAULT_CONFIG.model,
      embeddingModel: env.CUSTOM_EMBEDDING_MODEL || process.env.CUSTOM_EMBEDDING_MODEL || DEFAULT_CONFIG.embeddingModel,
      // API服务器配置 - 为数值类型添加类型转换
      apiPort: parseInt(env.API_PORT || process.env.API_PORT || DEFAULT_CONFIG.apiPort, 10),
      apiHost: env.API_HOST || process.env.API_HOST || DEFAULT_CONFIG.apiHost,
      apiCorsEnabled: env.API_CORS_ENABLED !== undefined ? env.API_CORS_ENABLED === 'true' : DEFAULT_CONFIG.apiCorsEnabled,
      apiCorsOrigin: env.API_CORS_ORIGIN || process.env.API_CORS_ORIGIN || DEFAULT_CONFIG.apiCorsOrigin
    };
    
    // 确保apiPort是有效的数字
    if (isNaN(config.apiPort)) {
      config.apiPort = DEFAULT_CONFIG.apiPort;
    }
    
    // 更新缓存
    setConfigCache(config);
    
    return config;
  } catch (error) {
    console.error('读取配置时出错:', error);
    // 如果出现错误，返回默认配置
    return DEFAULT_CONFIG;
  }
}

/**
 * 获取配置值
 * @param {string} [key] 配置键名，如果不提供则返回所有配置
 * @returns {Promise<any>} 配置值或配置对象
 */
export async function getConfig(key) {
  const config = await readConfig();
  
  if (key) {
    // 检查键是否存在
    if (!config.hasOwnProperty(key)) {
      return null;
    }
    return config[key];
  }
  
  return config;
}

/**
 * 设置配置值
 * @param {string} key 配置键名
 * @param {string} value 配置值
 * @returns {Promise<boolean>} 是否设置成功
 */
export async function setConfig(key, value) {
  // 检查键是否有效
  if (!CONFIG_KEYS[key]) {
    return false;
  }
  
  try {
    // 读取当前环境变量
    const env = await readEnvFile();
    
    // 设置环境变量
    const envKey = CONFIG_KEYS[key];
    
    // 特殊处理布尔类型
    if (key === 'apiCorsEnabled') {
      env[envKey] = String(value).toLowerCase();
    } 
    // 特殊处理数字类型
    else if (key === 'apiPort') {
      const port = parseInt(value, 10);
      env[envKey] = isNaN(port) ? DEFAULT_CONFIG.apiPort : port;
    }
    else {
      env[envKey] = value;
    }
    
    // 写入环境变量
    await writeEnvFile(env);
    
    // 清除缓存
    clearConfigCache();
    
    return true;
  } catch (error) {
    console.error('设置配置时出错:', error);
    return false;
  }
}