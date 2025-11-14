import crypto from 'crypto';
import { isVectorStoreInitialized } from '../graph/vectorStore.js';

/**
 * 简单的内存缓存实现
 */
class MemoryCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * 获取缓存值
   * @param {string} key - 缓存键
   * @returns {any} 缓存值或undefined
   */
  get(key) {
    if (this.cache.has(key)) {
      // 移动到最后（LRU策略）
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return undefined;
  }

  /**
   * 设置缓存值
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   */
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 删除最旧的项
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  /**
   * 检查是否包含缓存键
   * @param {string} key - 缓存键
   * @returns {boolean} 是否包含
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * 清除缓存
   */
  clear() {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   * @returns {number} 缓存大小
   */
  size() {
    return this.cache.size;
  }
}

// 创建全局缓存实例
const analysisCache = new MemoryCache(50);
const documentCache = new MemoryCache(100);

/**
 * 生成缓存键
 * @param {string} sql - SQL查询
 * @param {Object} config - 配置对象
 * @returns {string} 缓存键
 */
function generateCacheKey(sql, config) {
  const keyData = {
    sql: sql.trim().toLowerCase(),
    databaseType: config.databaseType || 'mysql', // 默认使用mysql而不是unknown
    analysisDimensions: config.analysisDimensions || ['performance', 'security', 'standards']
  };
  return crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex');
}

/**
 * 获取缓存的SQL分析结果
 * @param {string} sql - SQL查询
 * @param {Object} config - 配置对象
 * @returns {Object|null} 缓存的分析结果或null
 */
function getCachedAnalysis(sql, config) {
  const cacheKey = generateCacheKey(sql, config);
  return analysisCache.get(cacheKey) || null;
}

/**
 * 缓存SQL分析结果
 * @param {string} sql - SQL查询
 * @param {Object} config - 配置对象
 * @param {Object} result - 分析结果
 */
function cacheAnalysis(sql, config, result) {
  const cacheKey = generateCacheKey(sql, config);
  analysisCache.set(cacheKey, {
    result,
    timestamp: Date.now()
  });
}

/**
 * 获取缓存的文档检索结果
 * @param {string} query - 查询字符串
 * @param {number} k - 返回结果数量
 * @returns {Array|null} 缓存的文档或null
 */
function getCachedDocuments(query, k = 4) {
  const cacheKey = crypto.createHash('md5')
    .update(`${query.trim().toLowerCase()}:${k}`)
    .digest('hex');
  return documentCache.get(cacheKey) || null;
}

/**
 * 缓存文档检索结果
 * @param {string} query - 查询字符串
 * @param {number} k - 返回结果数量
 * @param {Array} documents - 文档列表
 */
function cacheDocuments(query, k, documents) {
  const cacheKey = crypto.createHash('md5')
    .update(`${query.trim().toLowerCase()}:${k}`)
    .digest('hex');
  documentCache.set(cacheKey, {
    documents,
    timestamp: Date.now()
  });
}

/**
 * 清除过期的缓存项
 * @param {number} maxAge - 最大缓存时间（毫秒）
 */
function clearExpiredCache(maxAge = 30 * 60 * 1000) { // 默认30分钟
  const now = Date.now();
  
  // 清除分析缓存
  for (const [key, value] of analysisCache.cache.entries()) {
    if (now - value.timestamp > maxAge) {
      analysisCache.cache.delete(key);
    }
  }
  
  // 清除文档缓存
  for (const [key, value] of documentCache.cache.entries()) {
    if (now - value.timestamp > maxAge) {
      documentCache.cache.delete(key);
    }
  }
}

/**
 * 并行处理多个分析任务
 * @param {Array} tasks - 任务列表，每个任务包含sql和config
 * @param {number} concurrency - 并发数
 * @returns {Promise<Array>} 分析结果列表
 */
async function parallelAnalysis(tasks, concurrency = 3) {
  const results = [];
  
  // 分批处理任务
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchPromises = batch.map(async (task) => {
      try {
        // 检查缓存
        const cached = getCachedAnalysis(task.sql, task.config);
        if (cached) {
          return {
            sql: task.sql,
            result: cached.result,
            fromCache: true
          };
        }
        
        // 这里应该调用实际的分析函数
        // 由于循环依赖，我们使用动态导入
        const { analyzeSqlWithGraph } = await import('../graph/graphAnalyzer.js');
        const result = await analyzeSqlWithGraph(task.sql, null, task.config);
        
        // 缓存结果
        cacheAnalysis(task.sql, task.config, result);
        
        return {
          sql: task.sql,
          result,
          fromCache: false
        };
      } catch (error) {
        return {
          sql: task.sql,
          error: error.message,
          fromCache: false
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * 优化文档检索 - 只在知识库可用时检索
 * @param {string} query - 查询字符串
 * @param {number} k - 返回结果数量
 * @returns {Promise<Array>} 检索结果
 */
async function optimizedDocumentRetrieval(query, k = 4) {
  // 检查知识库是否可用
  if (!isVectorStoreInitialized()) {
    return [];
  }
  
  // 检查缓存
  const cached = getCachedDocuments(query, k);
  if (cached) {
    return cached.documents;
  }
  
  try {
      // 动态导入以避免循环依赖
      const { similaritySearch } = await import('../graph/vectorStore.js');
      const documents = await similaritySearch(query, k);
    
    // 缓存结果
    cacheDocuments(query, k, documents);
    
    return documents;
  } catch (error) {
    console.error('文档检索失败:', error);
    return [];
  }
}

/**
 * 定期清理过期缓存
 * @param {number} interval - 清理间隔时间（毫秒）
 * @returns {Object} 包含定时器ID和停止方法的对象
 */
function startCacheCleanup(interval = 10 * 60 * 1000) { // 默认10分钟
  const timerId = setInterval(clearExpiredCache, interval);
  
  return {
    timerId,
    stop: () => {
      clearInterval(timerId);
    }
  };
}

// 全局定时器引用，用于跟踪活动的定时器
let activeCleanupTimer = null;

// 停止缓存清理定时器
function stopCacheCleanup() {
  if (activeCleanupTimer) {
    activeCleanupTimer.stop();
    activeCleanupTimer = null;
  }
}

export {
  MemoryCache,
  analysisCache,
  documentCache,
  generateCacheKey,
  getCachedAnalysis,
  cacheAnalysis,
  getCachedDocuments,
  cacheDocuments,
  clearExpiredCache,
  parallelAnalysis,
  optimizedDocumentRetrieval,
  startCacheCleanup,
  stopCacheCleanup
};