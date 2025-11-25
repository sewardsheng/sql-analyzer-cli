import fs from 'fs/promises';
import path from 'path';

// 配置文件路径
const ENV_FILE = path.join(process.cwd(), '.env');

// 默认配置
export const DEFAULT_CONFIG = {
  baseURL: 'https://api.siliconflow.cn/v1',
  apiKey: '',
  model: 'zai-org/GLM-4.6',
  embeddingModel: 'BAAI/bge-m3',
  apiPort: 3001,
  apiHost: '0.0.0.0',
  apiCorsEnabled: true,
  apiCorsOrigin: '*',
  // 摘要显示配置
  enableAISummary: true,
  enableColors: true,
  summaryOutputFormat: 'pretty'
};

// 配置键映射 (内部键名 -> 环境变量名)
const CONFIG_MAP = {
  apiKey: 'CUSTOM_API_KEY',
  baseURL: 'CUSTOM_BASE_URL',
  model: 'CUSTOM_MODEL',
  embeddingModel: 'CUSTOM_EMBEDDING_MODEL',
  apiPort: 'API_PORT',
  apiHost: 'API_HOST',
  apiCorsEnabled: 'API_CORS_ENABLED',
  apiCorsOrigin: 'API_CORS_ORIGIN',
  enableAISummary: 'ENABLE_AI_SUMMARY',
  enableColors: 'ENABLE_COLORS',
  summaryOutputFormat: 'SUMMARY_OUTPUT_FORMAT'
};

// 配置键描述
const CONFIG_DESC = {
  apiKey: 'API密钥',
  baseURL: 'API基础URL',
  model: '模型名称',
  embeddingModel: '嵌入模型名称',
  apiPort: 'API服务器端口',
  apiHost: 'API服务器主机',
  apiCorsEnabled: '是否启用CORS',
  apiCorsOrigin: 'CORS允许的源',
  enableAISummary: '是否启用AI摘要',
  enableColors: '是否启用颜色输出',
  summaryOutputFormat: '摘要输出格式'
};

/**
 * 配置管理器单例类
 */
class ConfigManager {
  constructor() {
    if (ConfigManager.instance) {
      return ConfigManager.instance;
    }
    
    this._config = null;
    this._lastModified = null;
    this._initialized = false;
    ConfigManager.instance = this;
  }

  /**
   * 解析.env文件内容
   * @param {string} content - 文件内容
   * @returns {Object} 环境变量对象
   */
  parseEnvContent(content) {
    const env = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim();
      }
    }
    return env;
  }

  /**
   * 检查配置文件是否已修改
   * @returns {Promise<boolean>} 是否已修改
   */
  async _isConfigModified() {
    try {
      const stats = await fs.stat(ENV_FILE);
      const currentModified = stats.mtime.getTime();
      
      if (this._lastModified !== currentModified) {
        this._lastModified = currentModified;
        return true;
      }
      return false;
    } catch {
      // 文件不存在，检查是否之前也不存在
      return this._config !== null;
    }
  }

  /**
   * 从文件加载配置
   * @returns {Promise<Object>} 配置对象
   */
  async _loadConfigFromFile() {
    try {
      const content = await fs.readFile(ENV_FILE, 'utf8');
      const env = this.parseEnvContent(content);
      
      // 构建配置对象
      const config = {};
      for (const [key, envKey] of Object.entries(CONFIG_MAP)) {
        const envValue = env[envKey] || process.env[envKey];
        
        // 类型转换
        if (key === 'apiPort') {
          config[key] = envValue ? parseInt(envValue, 10) : DEFAULT_CONFIG[key];
          if (isNaN(config[key])) config[key] = DEFAULT_CONFIG[key];
        } else if (key === 'apiCorsEnabled' || key === 'enableAISummary' || key === 'enableColors') {
          config[key] = envValue ? envValue === 'true' : DEFAULT_CONFIG[key];
        } else {
          config[key] = envValue || DEFAULT_CONFIG[key];
        }
      }
      
      return config;
    } catch (error) {
      // 文件不存在或读取失败，返回默认配置
      return { ...DEFAULT_CONFIG };
    }
  }

  /**
   * 获取配置（带缓存）
   * @param {boolean} forceRefresh - 是否强制刷新
   * @returns {Promise<Object>} 配置对象
   */
  async getConfig(forceRefresh = false) {
    // 如果未初始化或需要强制刷新，重新加载
    if (!this._initialized || forceRefresh) {
      await this._refreshConfig();
      this._initialized = true;
    }
    
    // 检查文件是否被修改
    if (await this._isConfigModified()) {
      await this._refreshConfig();
    }
    
    return this._config;
  }

  /**
   * 刷新配置
   */
  async _refreshConfig() {
    this._config = await this._loadConfigFromFile();
  }

  /**
   * 获取单个配置项
   * @param {string} key - 配置键名
   * @returns {Promise<any>} 配置值
   */
  async get(key) {
    const config = await this.getConfig();
    return config[key];
  }

  /**
   * 设置配置项
   * @param {string} key - 配置键名
   * @param {any} value - 配置值
   * @returns {Promise<boolean>} 是否成功
   */
  async set(key, value) {
    if (!CONFIG_MAP[key]) {
      throw new Error(`无效的配置键: ${key}`);
    }
    
    try {
      // 读取现有配置
      let env = {};
      try {
        const content = await fs.readFile(ENV_FILE, 'utf8');
        env = this.parseEnvContent(content);
      } catch {
        // 文件不存在，使用空对象
      }
      
      // 更新配置
      const envKey = CONFIG_MAP[key];
      env[envKey] = String(value);
      
      // 写入文件
      await this._writeEnvFile(env);
      
      // 强制刷新缓存
      await this.getConfig(true);
      
      return true;
    } catch (error) {
      console.error('设置配置失败:', error);
      return false;
    }
  }

  /**
   * 写入.env文件
   * @param {Object} env - 环境变量对象
   */
  async _writeEnvFile(env) {
    let content = '';
    
    // 按照配置映射的顺序写入
    for (const [key, envKey] of Object.entries(CONFIG_MAP)) {
      if (env[envKey] !== undefined) {
        content += `# ${CONFIG_DESC[key]}\n`;
        content += `${envKey}=${env[envKey]}\n\n`;
      }
    }
    
    await fs.writeFile(ENV_FILE, content, 'utf8');
  }

  /**
   * 重置配置为默认值
   */
  async reset() {
    const env = {};
    for (const [key, envKey] of Object.entries(CONFIG_MAP)) {
      env[envKey] = String(DEFAULT_CONFIG[key]);
    }
    
    await this._writeEnvFile(env);
    
    // 强制刷新缓存
    await this.getConfig(true);
    
    console.log('✅ 配置已重置为默认值\n');
    
    return {
      success: true,
      data: {
        message: '配置已重置为默认值'
      }
    };
  }

  /**
   * 列出所有配置
   */
  async list() {
    const config = await this.getConfig();
    
    return {
      success: true,
      data: {
        config: config,
        descriptions: CONFIG_DESC
      }
    };
  }

  /**
   * 清除缓存（用于测试）
   */
  _clearCache() {
    this._config = null;
    this._lastModified = null;
    this._initialized = false;
  }
}

// 创建全局单例实例
const configManager = new ConfigManager();

// ============================================================================
// 向后兼容的导出函数
// ============================================================================

/**
 * 读取配置（向后兼容）
 * @returns {Promise<Object>} 配置对象
 */
export async function readConfig() {
  return await configManager.getConfig();
}

/**
 * 获取单个配置项（向后兼容）
 * @param {string} key - 配置键名
 * @returns {Promise<any>} 配置值
 */
export async function getConfig(key) {
  return await configManager.get(key);
}

/**
 * 设置配置项（向后兼容）
 * @param {string} key - 配置键名
 * @param {any} value - 配置值
 * @returns {Promise<boolean>} 是否成功
 */
export async function setConfig(key, value) {
  return await configManager.set(key, value);
}

/**
 * 列出所有配置（向后兼容）
 */
export async function listConfig() {
  return await configManager.list();
}

/**
 * 重置配置为默认值（向后兼容）
 */
export async function resetConfig() {
  return await configManager.reset();
}

// ============================================================================
// 新的导出 - 直接访问单例
// ============================================================================

/**
 * 获取配置管理器实例
 * @returns {ConfigManager} 配置管理器实例
 */
export function getConfigManager() {
  return configManager;
}

// 导出单例实例（用于高级用法）
export { configManager };