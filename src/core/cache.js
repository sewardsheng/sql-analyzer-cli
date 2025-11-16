/**
 * 分析结果缓存管理模块
 * 负责管理SQL分析结果的内存缓存
 */

import crypto from 'crypto';

/**
 * 缓存管理器
 */
class CacheManager {
  constructor(config = {}) {
    this.cache = new Map();
    this.enabled = config.enableCache !== false;
    this.maxSize = config.cacheMaxSize || 100;
  }

  /**
   * 生成缓存键（使用SQL和选项的哈希值）
   * @param {string} sqlQuery - SQL查询
   * @param {string} databaseType - 数据库类型
   * @param {Object} options - 分析选项
   * @returns {string} 缓存键
   */
  generateKey(sqlQuery, databaseType, options) {
    const optionsStr = JSON.stringify({
      performance: options.performance !== false,
      security: options.security !== false,
      standards: options.standards !== false,
      learn: options.learn !== false
    });
    const content = `${databaseType}:${sqlQuery.trim()}:${optionsStr}`;
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * 获取缓存结果
   * @param {string} key - 缓存键
   * @returns {Object|null} 缓存的分析结果
   */
  get(key) {
    if (!this.enabled) return null;
    return this.cache.get(key) || null;
  }

  /**
   * 设置缓存结果
   * @param {string} key - 缓存键
   * @param {Object} result - 分析结果
   */
  set(key, result) {
    if (!this.enabled) return;
    
    // 如果缓存已满，删除最早的条目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * 清除所有缓存
   */
  clear() {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 缓存统计
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      enabled: this.enabled
    };
  }
}

export default CacheManager;