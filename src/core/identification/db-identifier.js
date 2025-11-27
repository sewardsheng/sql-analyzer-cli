/**
 * 数据库类型识别器
 * 专注于快速规则匹配
 */

/**
 * 数据库类型识别器类
 */
class DatabaseIdentifier {
  constructor(config = {}) {
    this.config = config;
    
    // 缓存机制
    this.cache = new Map();
    this.cacheMaxSize = config.cacheMaxSize || 500;
    this.cacheTTL = config.cacheTTL || 3600000; // 1小时
    this.cacheHits = 0;
    this.cacheMisses = 0;
    
    // 核心识别规则
    this.corePatterns = {
      mysql: [
        /LIMIT\s+\d+(?!\s+OFFSET)/i,
        /AUTO_INCREMENT/i,
        /ENGINE\s*=\s*(InnoDB|MyISAM)/i,
        /GROUP_CONCAT\s*\(/i,
        /DATE_FORMAT\s*\(/i
      ],
      postgresql: [
        /LIMIT\s+\d+\s+OFFSET/i,
        /RETURNING/i,
        /ILIKE/i,
        /JSONB/i,
        /WITH\s+RECURSIVE/i
      ],
      oracle: [
        /ROWNUM/i,
        /DUAL/i,
        /SYSDATE/i,
        /NVL\s*\(/i,
        /TO_DATE\s*\(/i
      ],
      sqlserver: [
        /TOP\s+\d+/i,
        /NVARCHAR/i,
        /IDENTITY\s*\(/i,
        /ROW_NUMBER\s*\(\s*\)\s+OVER\s*\(/i,
        /PIVOT\s*\(/i
      ],
      clickhouse: [
        /ENGINE\s*=\s*MergeTree/i,
        /PREWHERE/i,
        /FINAL/i,
        /TUPLE\s*\(/i,
        /ARRAY\s+JOIN/i
      ],
      sqlite: [
        /AUTOINCREMENT/i,
        /PRAGMA/i,
        /WITHOUT\s+ROWID/i,
        /INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/i,
        /GLOB\s*/i
      ]
    };
    
    // 数据库优先级（按常见程度排序）
    this.databasePriority = ['mysql', 'postgresql', 'sqlserver', 'oracle', 'sqlite', 'clickhouse'];
  }
  
  /**
   * 识别数据库类型
   * @param {string} sql - SQL语句
   * @param {Object} options - 识别选项
   * @returns {Object} 识别结果
   */
  identify(sql, options = {}) {
    const startTime = Date.now();
    
    try {
      // 1. 快速缓存检查
      if (!options.skipCache) {
        const cacheKey = this.generateHash(sql);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          this.cacheHits++;
          return {
            ...cached,
            cached: true,
            duration: Date.now() - startTime
          };
        }
      }
      
      this.cacheMisses++;
      
      // 2. 快速规则匹配
      const result = this.quickMatch(sql);
      
      // 3. 缓存结果
      if (!options.skipCache) {
        const cacheKey = this.generateHash(sql);
        this.saveToCache(cacheKey, result);
      }
      
      return {
        ...result,
        cached: false,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('数据库识别失败:', error);
      
      return {
        type: 'mysql', // 默认返回MySQL
        confidence: 0.3,
        method: 'error-fallback',
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }
  
  /**
   * 快速匹配数据库类型
   * @param {string} sql - SQL语句
   * @returns {Object} 匹配结果
   */
  quickMatch(sql) {
    const normalizedSql = sql.toUpperCase().trim();
    const scores = {};
    
    // 计算每种数据库的匹配分数
    for (const [dbType, patterns] of Object.entries(this.corePatterns)) {
      let score = 0;
      const matches = [];
      
      // 快速模式匹配
      for (const pattern of patterns) {
        if (pattern.test(normalizedSql)) {
          score += 1;
          matches.push({
            type: 'pattern',
            pattern: pattern.toString(),
            match: normalizedSql.match(pattern)?.[0] || ''
          });
        }
      }
      
      if (score > 0) {
        scores[dbType] = { score, matches };
      }
    }
    
    // 如果没有匹配，返回默认数据库类型
    if (Object.keys(scores).length === 0) {
      return this.getDefaultDatabaseType(normalizedSql);
    }
    
    // 找出最高分数的数据库
    const sortedDatabases = Object.entries(scores)
      .sort(([,a], [,b]) => b.score - a.score);
    
    const bestMatch = sortedDatabases[0];
    const dbType = bestMatch[0];
    const scoreData = bestMatch[1];
    
    // 计算置信度
    const confidence = Math.min(0.9, 0.4 + (scoreData.score * 0.15));
    
    return {
      type: dbType,
      confidence: confidence,
      method: 'rule-based',
      scores: { [dbType]: scoreData.score },
      matches: scoreData.matches,
      candidates: [dbType]
    };
  }
  
  /**
   * 获取默认数据库类型
   * @param {string} normalizedSql - 标准化的SQL
   * @returns {Object} 默认数据库类型
   */
  getDefaultDatabaseType(normalizedSql) {
    // 检查基本SQL语法特征
    if (normalizedSql.includes('SELECT') && normalizedSql.includes('FROM')) {
      // 基于常见使用情况，MySQL作为默认选择
      return {
        type: 'mysql',
        confidence: 0.4,
        method: 'default-fallback',
        reasoning: '基本SQL语法，使用MySQL作为默认数据库类型',
        scores: { mysql: 0.4 },
        matches: []
      };
    }
    
    // 检查特定语法特征
    if (normalizedSql.includes('LIMIT ') && !normalizedSql.includes('OFFSET')) {
      return {
        type: 'mysql',
        confidence: 0.6,
        method: 'syntax-fallback',
        reasoning: '检测到LIMIT语法（无OFFSET），倾向于MySQL',
        scores: { mysql: 0.6 },
        matches: [{ type: 'pattern', pattern: 'LIMIT without OFFSET' }]
      };
    }
    
    if (normalizedSql.includes('LIMIT ') && normalizedSql.includes('OFFSET')) {
      return {
        type: 'postgresql',
        confidence: 0.7,
        method: 'syntax-fallback',
        reasoning: '检测到LIMIT OFFSET语法，倾向于PostgreSQL',
        scores: { postgresql: 0.7 },
        matches: [{ type: 'pattern', pattern: 'LIMIT OFFSET' }]
      };
    }
    
    if (normalizedSql.includes('TOP ')) {
      return {
        type: 'sqlserver',
        confidence: 0.7,
        method: 'syntax-fallback',
        reasoning: '检测到TOP语法，倾向于SQL Server',
        scores: { sqlserver: 0.7 },
        matches: [{ type: 'pattern', pattern: 'TOP' }]
      };
    }
    
    // 最后的默认选择
    return {
      type: 'mysql',
      confidence: 0.3,
      method: 'final-fallback',
      reasoning: '无法识别特定语法，使用MySQL作为默认选择',
      scores: { mysql: 0.3 },
      matches: []
    };
  }
  
  /**
   * 生成缓存键
   * @param {string} sql - SQL语句
   * @returns {string} 缓存键
   */
  generateHash(sql) {
    const normalizedSql = sql.toUpperCase().trim();
    let hash = 0;
    for (let i = 0; i < normalizedSql.length; i++) {
      const char = normalizedSql.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }
  
  /**
   * 从缓存获取结果
   * @param {string} key - 缓存键
   * @returns {Object|null} 缓存结果
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    // 检查过期
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.result;
  }
  
  /**
   * 保存结果到缓存
   * @param {string} key - 缓存键
   * @param {Object} result - 结果
   */
  saveToCache(key, result) {
    // 简单的LRU清理
    if (this.cache.size >= this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }
  
  /**
   * 清空缓存
   */
  clearCache() {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
  
  /**
   * 获取缓存统计
   * @returns {Object} 缓存统计
   */
  getCacheStats() {
    const total = this.cacheHits + this.cacheMisses;
    return {
      size: this.cache.size,
      maxSize: this.cacheMaxSize,
      ttl: this.cacheTTL,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? (this.cacheHits / total * 100).toFixed(2) + '%' : '0%'
    };
  }
  
  /**
   * 获取支持的数据库类型
   * @returns {Array<string>} 数据库类型列表
   */
  getSupportedDatabases() {
    return Object.keys(this.corePatterns);
  }
  
  /**
   * 获取识别器状态
   * @returns {Object} 状态信息
   */
  getStatus() {
    return {
      type: 'database-identifier',
      supportedDatabases: this.getSupportedDatabases(),
      cacheStats: this.getCacheStats(),
      config: {
        cacheMaxSize: this.cacheMaxSize,
        cacheTTL: this.cacheTTL
      },
      timestamp: new Date().toISOString()
    };
  }
}

// 创建全局实例
const databaseIdentifier = new DatabaseIdentifier();

// 导出类和实例
export { DatabaseIdentifier, databaseIdentifier };
export default databaseIdentifier;