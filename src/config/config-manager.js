import { ConfigSchema } from './config-schema.js';
import { EnvLoader } from './env-loader.js';
import { ConfigValidator } from './config-validator.js';

/**
 * 配置管理器
 * 负责加载、合并和验证应用配置
 */
export class ConfigManager {
  constructor(customConfig = {}) {
    // 1. 加载默认配置
    this.config = this.deepClone(ConfigSchema);
    
    // 2. 加载并应用环境变量
    const envConfig = EnvLoader.removeUndefined(EnvLoader.load());
    this.config = this.deepMerge(this.config, envConfig);
    
    // 3. 应用自定义配置
    this.config = this.deepMerge(this.config, customConfig);
    
    // 4. 验证配置
    ConfigValidator.validate(this.config);
  }

  /**
   * 获取配置值
   * @param {string} path - 配置路径，如 'server.port'
   * @param {*} defaultValue - 默认值
   * @returns {*} 配置值
   */
  get(path, defaultValue = undefined) {
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  /**
   * 设置配置值
   * @param {string} path - 配置路径
   * @param {*} value - 配置值
   */
  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.config;
    
    for (const key of keys) {
      if (!(key in target) || typeof target[key] !== 'object') {
        target[key] = {};
      }
      target = target[key];
    }
    
    target[lastKey] = value;
    ConfigValidator.validate(this.config);
  }

  /**
   * 获取完整配置
   * @returns {Object} 完整配置对象
   */
  getAll() {
    return this.deepClone(this.config);
  }

  /**
   * 获取配置模块
   * @param {string} module - 模块名称
   * @returns {Object} 模块配置
   */
  getModule(module) {
    return this.get(module, {});
  }

  /**
   * 更新配置
   * @param {Object} newConfig - 新配置
   */
  update(newConfig) {
    this.config = this.deepMerge(this.config, newConfig);
    ConfigValidator.validate(this.config);
  }

  /**
   * 重置为默认配置
   */
  reset() {
    this.config = this.deepClone(ConfigSchema);
    ConfigValidator.validate(this.config);
  }

  /**
   * 从环境变量重新加载配置
   */
  reloadFromEnv() {
    const envConfig = EnvLoader.removeUndefined(EnvLoader.load());
    this.config = this.deepMerge(this.config, envConfig);
    ConfigValidator.validate(this.config);
  }

  /**
   * 深度克隆对象
   * @param {Object} obj - 要克隆的对象
   * @returns {Object} 克隆后的对象
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * 深度合并对象
   * @param {Object} target - 目标对象
   * @param {Object} source - 源对象
   * @returns {Object} 合并后的对象
   */
  deepMerge(target, source) {
    const result = this.deepClone(target);
    
    function merge(target, source) {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          target[key] = target[key] || {};
          merge(target[key], source[key]);
        } else if (source[key] !== undefined) {
          target[key] = source[key];
        }
      }
    }
    
    merge(result, source);
    return result;
  }

  // 便捷访问方法
  getServerConfig() {
    return this.getModule('server');
  }

  getLLMConfig() {
    return this.getModule('llm');
  }

  getRuleLearningConfig() {
    return this.getModule('ruleLearning');
  }

  getKnowledgeConfig() {
    return this.getModule('knowledge');
  }

  getLoggingConfig() {
    return this.getModule('logging');
  }

  getSystemConfig() {
    return this.getModule('system');
  }
}

// 创建并导出全局配置实例
export const config = new ConfigManager();