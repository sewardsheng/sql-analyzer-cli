/**
 * 数据库类型识别器
 * 实现两级数据库识别策略：规则引擎 + LLM推理
 * 包含缓存机制和投票机制
 */

import { ChatOpenAI } from '@langchain/openai';
import { getConfigManager } from '../../config/index.js';
import GlobalContext from '../engine/context.js';

/**
 * 数据库类型识别器类
 */
class DatabaseIdentifier {
  constructor(config = {}) {
    this.config = config;
    this.llm = null;
    this.initialized = false;
    
    // 优化的缓存机制
    this.cache = new Map();
    this.cacheMaxSize = config.cacheMaxSize || 2000; // 增加缓存大小
    this.cacheTTL = config.cacheTTL || 7200000; // 增加到2小时
    this.cacheHits = 0;
    this.cacheMisses = 0;
    
    // 数据库类型规则
    this.databaseRules = this.initializeDatabaseRules();
    
    // 投票机制权重
    this.votingWeights = {
      'rule-based': 0.6,
      'llm-based': 0.4
    };
  }
  
  /**
   * 初始化数据库识别规则
   * @returns {Object} 数据库规则对象
   */
  initializeDatabaseRules() {
    return {
      mysql: {
        patterns: [
          /LIMIT\s+\d+(?!\s+OFFSET)/i,
          /AUTO_INCREMENT/i,
          /ENGINE\s*=\s*(InnoDB|MyISAM|MEMORY)/i,
          /CHARSET\s*=\s*(utf8|utf8mb4|latin1)/i,
          /COLLATE\s*=\s*(utf8_general_ci|utf8mb4_unicode_ci)/i,
          /ON\s+DUPLICATE\s+KEY\s+UPDATE/i,
          /GROUP_CONCAT\s*\(/i,
          /IFNULL\s*\(/i,
          /DATE_FORMAT\s*\(/i,
          /UNIX_TIMESTAMP\s*\(/i
        ],
        keywords: ['MYSQL', 'INNODB', 'MYISAM'],
        weight: 1.0
      },
      postgresql: {
        patterns: [
          /LIMIT\s+\d+\s+OFFSET/i,
          /RETURNING/i,
          /SERIAL|BIGSERIAL/i,
          /ILIKE/i,
          /EXCLUDE\s*\(/i,
          /ON\s+CONFLICT/i,
          /ARRAY\s*\[/i,
          /JSONB/i,
          /WITH\s+RECURSIVE/i,
          /GENERATED\s+ALWAYS\s+AS/i,
          /PARTITION\s+BY/i
        ],
        keywords: ['POSTGRESQL', 'POSTGRES', 'PG'],
        weight: 1.0
      },
      oracle: {
        patterns: [
          /ROWNUM/i,
          /DUAL/i,
          /SYSDATE/i,
          /NVL\s*\(/i,
          /DECODE\s*\(/i,
          /CONNECT\s+BY\s+PRIOR/i,
          /WITH\s+READ\s+ONLY/i,
          /MERGE\s+INTO/i,
          /SEQUENCE\.NEXTVAL/i,
          /TO_DATE\s*\(/i,
          /TO_CHAR\s*\(/i
        ],
        keywords: ['ORACLE'],
        weight: 1.0
      },
      sqlserver: {
        patterns: [
          /TOP\s+\d+/i,
          /NVARCHAR/i,
          /VARCHAR\s*\(\s*MAX\s*\)/i,
          /IDENTITY\s*\(/i,
          /ROW_NUMBER\s*\(\s*\)\s+OVER\s*\(/i,
          /WITH\s+ROLLUP/i,
          /PIVOT\s*\(/i,
          /UNPIVOT\s*\(/i,
          /OUTPUT\s+INSERTED/i,
          /CROSS\s+APPLY/i,
          /OUTER\s+APPLY/i
        ],
        keywords: ['SQLSERVER', 'MSSQL', 'T-SQL'],
        weight: 1.0
      },
      clickhouse: {
        patterns: [
          /FINAL/i,
          /PREWHERE/i,
          /ENGINE\s*=\s*MergeTree/i,
          /ENGINE\s*=\s*ReplacingMergeTree/i,
          /ENGINE\s*=\s*SummingMergeTree/i,
          /ENGINE\s*=\s*AggregatingMergeTree/i,
          /ENGINE\s*=\s*ReplicatedMergeTree/i,
          /TUPLE\s*\(/i,
          /ARRAY\s+JOIN/i,
          /ANY\s+LEFT\s+JOIN/i,
          /GROUP\s+BY\s+ARRAY/i
        ],
        keywords: ['CLICKHOUSE'],
        weight: 1.0
      },
      sqlite: {
        patterns: [
          /AUTOINCREMENT/i,
          /PRAGMA/i,
          /WITHOUT\s+ROWID/i,
          /INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/i,
          /ATTACH\s+DATABASE/i,
          /DETACH\s+DATABASE/i,
          /VACUUM/i,
          /EXPLAIN\s+QUERY\s+PLAN/i,
          /GLOB\s*/i,
          /REGEXP\s*/i
        ],
        keywords: ['SQLITE'],
        weight: 1.0
      }
    };
  }
  
  /**
   * 初始化LLM
   */
  async initialize() {
    if (this.initialized) return;
    
    const configManager = getConfigManager();
    const envConfig = await configManager.getConfig();
    this.llm = new ChatOpenAI({
      modelName: this.config.model || envConfig.model,
      temperature: 0.1,
      maxTokens: 1000,
      configuration: {
        apiKey: this.config.apiKey || envConfig.apiKey,
        baseURL: this.config.baseURL || envConfig.baseURL
      }
    });
    
    this.initialized = true;
  }
  
  /**
   * 识别数据库类型
   * @param {string} sql - SQL语句
   * @param {Object} options - 识别选项
   * @returns {Promise<Object>} 识别结果
   */
  identify(sql, options = {}) {
    const startTime = Date.now();
    
    try {
      // 1. 检查缓存 - 优化缓存命中率统计
      const cacheKey = this.generateOptimizedCacheKey(sql);
      const cachedResult = this.getFromCacheOptimized(cacheKey);
      if (cachedResult && !options.skipCache) {
        this.cacheHits++;
        return {
          ...cachedResult,
          cached: true,
          duration: Date.now() - startTime
        };
      }
      
      this.cacheMisses++;
      
      // 2. 规则引擎识别（移除LLM依赖）
      const ruleResult = this.identifyByRulesOptimized(sql);
      
      // 3. 处理识别结果
      const finalResult = {
        ...ruleResult,
        method: 'rule-based',
        cached: false,
        duration: Date.now() - startTime
      };
      
      // 4. 保存到缓存
      this.saveToCacheOptimized(cacheKey, finalResult);
      
      return finalResult;
    } catch (error) {
      console.error('数据库类型识别失败:', error);
      
      // 返回降级结果
      return {
        type: 'unknown',
        confidence: 0.1,
        method: 'fallback',
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }
  
  /**
   * 基于规则的数据库识别
   * @param {string} sql - SQL语句
   * @returns {Object} 规则识别结果
   */
  identifyByRulesOptimized(sql) {
    const normalizedSql = sql.toUpperCase().trim();
    const scores = {};
    const matches = {};
    
    // 优化：预编译正则表达式
    const compiledPatterns = {};
    for (const [dbType, rules] of Object.entries(this.databaseRules)) {
      compiledPatterns[dbType] = rules.patterns.map(pattern => ({
        pattern: pattern,
        compiled: new RegExp(pattern.source, pattern.flags)
      }));
    }
    
    // 计算每种数据库的匹配分数
    for (const [dbType, rules] of Object.entries(this.databaseRules)) {
      let score = 0;
      const dbMatches = [];
      
      // 优化的模式匹配
      compiledPatterns[dbType].forEach(({ pattern, compiled }) => {
        if (compiled.test(normalizedSql)) {
          score += rules.weight;
          dbMatches.push({
            type: 'pattern',
            pattern: pattern.toString(),
            match: normalizedSql.match(pattern)?.[0] || ''
          });
        }
      });
      
      // 优化的关键词匹配 - 使用Set提高查找效率
      const keywordsSet = new Set(rules.keywords);
      const sqlWords = normalizedSql.split(/\s+/);
      for (const word of sqlWords) {
        if (keywordsSet.has(word)) {
          score += rules.weight * 0.5;
          dbMatches.push({
            type: 'keyword',
            keyword: word
          });
        }
      }
      
      if (score > 0) {
        scores[dbType] = score;
        matches[dbType] = dbMatches;
      }
    }
    
    // 确定最佳匹配
    const maxScore = Math.max(...Object.values(scores), 0);
    
    if (maxScore === 0) {
      // 对于简单SQL，提供默认数据库类型
      const defaultResult = this.getDefaultDatabaseType(sql);
      if (defaultResult) {
        return defaultResult;
      }
      
      return {
        type: 'unknown',
        confidence: 0.1,
        method: 'rule-based',
        scores: {},
        matches: {}
      };
    }
    
    // 找出所有具有最高分数的数据库类型
    const topCandidates = Object.keys(scores).filter(db => scores[db] === maxScore);
    
    // 如果有多个候选，选择第一个
    const selectedType = topCandidates[0];
    
    // 计算置信度
    const confidence = Math.min(0.9, 0.3 + (maxScore * 0.1));
    
    return {
      type: selectedType,
      confidence: confidence,
      method: 'rule-based',
      scores: scores,
      matches: matches[selectedType] || [],
      candidates: topCandidates
    };
  }
  
  /**
   * 基于LLM的数据库识别
   * @param {string} sql - SQL语句
   * @param {Object} ruleHint - 规则识别的提示
   * @returns {Promise<Object>} LLM识别结果
   */
  async identifyByLLMOptimized(sql, ruleHint) {
    const prompt = this.buildOptimizedLLMPrompt(sql, ruleHint);
    
    try {
      // 优化LLM调用参数
      const response = await this.llm.invoke([
        {
          role: 'system',
          content: '数据库类型识别专家。分析SQL，识别数据库类型。返回JSON格式。'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        temperature: 0.1,
        maxTokens: 500 // 减少token使用
      });
      
      const content = response.content.trim();
      const result = this.parseLLMResponseOptimized(content);
      
      return {
        ...result,
        method: 'llm-based',
        rawResponse: content
      };
    } catch (error) {
      console.error('LLM数据库识别失败:', error);
      
      // 返回降级结果
      return {
        type: 'unknown',
        confidence: 0.1,
        method: 'llm-based',
        error: error.message
      };
    }
  }
  
  /**
   * 构建LLM提示
   * @param {string} sql - SQL语句
   * @param {Object} ruleHint - 规则识别的提示
   * @returns {string} LLM提示
   */
  buildOptimizedLLMPrompt(sql, ruleHint) {
    const supportedDatabases = Object.keys(this.databaseRules).join(', ');
    
    // 优化提示长度
    let prompt = `分析SQL，识别数据库类型。\n\n`;
    prompt += `支持: ${supportedDatabases}\n\n`;
    prompt += `SQL: \`\`\`sql\n${sql}\n\`\`\`\n\n`;
    
    if (ruleHint && ruleHint.type !== 'unknown') {
      prompt += `提示: 可能是 ${ruleHint.type} (${(ruleHint.confidence * 100).toFixed(0)}%)\n\n`;
    }
    
    prompt += `返回JSON: {"type": "数据库类型", "confidence": 0.0-1.0}`;
    
    return prompt;
  }
  
  /**
   * 解析LLM响应
   * @param {string} content - LLM响应内容
   * @returns {Object} 解析后的结果
   */
  parseLLMResponseOptimized(content) {
    try {
      // 快速JSON解析
      return JSON.parse(content);
    } catch (error) {
      // 优化的JSON提取
      const jsonMatch = content.match(/\{[^}]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          // 忽略详细错误日志
        }
      }
      
      // 快速文本匹配
      const lowerContent = content.toLowerCase();
      for (const dbType of Object.keys(this.databaseRules)) {
        if (lowerContent.includes(dbType.toLowerCase())) {
          return {
            type: dbType,
            confidence: 0.5,
            reasoning: '文本推断',
            evidence: []
          };
        }
      }
      
      // 默认值
      return {
        type: 'unknown',
        confidence: 0.1,
        reasoning: '解析失败',
        evidence: []
      };
    }
  }
  
  /**
   * 整合规则和LLM结果
   * @param {Object} ruleResult - 规则识别结果
   * @param {Object} llmResult - LLM识别结果
   * @returns {Object} 整合后的结果
   */
  combineResultsOptimized(ruleResult, llmResult) {
    // 如果两者结果一致，提高置信度
    if (ruleResult.type === llmResult.type && ruleResult.type !== 'unknown') {
      return {
        type: ruleResult.type,
        confidence: Math.min(0.95, ruleResult.confidence + llmResult.confidence * 0.3),
        method: 'hybrid',
        ruleResult,
        llmResult,
        reasoning: `一致识别为${ruleResult.type}`
      };
    }
    
    // 优化的投票机制
    const ruleVote = ruleResult.confidence * this.votingWeights['rule-based'];
    const llmVote = llmResult.confidence * this.votingWeights['llm-based'];
    
    const selectedType = ruleVote >= llmVote ? ruleResult.type : llmResult.type;
    const confidence = Math.max(ruleVote, llmVote);
    
    return {
      type: selectedType,
      confidence: confidence,
      method: 'hybrid',
      ruleResult,
      llmResult,
      reasoning: `投票选择${selectedType}`
    };
  }
  
  /**
   * 生成缓存键
   * @param {string} sql - SQL语句
   * @returns {string} 缓存键
   */
  generateOptimizedCacheKey(sql) {
    // 优化：使用更快的哈希算法
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
   * @returns {Object|null} 缓存的结果
   */
  getFromCacheOptimized(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    // 优化的过期检查
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.result;
  }
  
  /**
   * 保存结果到缓存
   * @param {string} key - 缓存键
   * @param {Object} result - 要缓存的结果
   */
  saveToCacheOptimized(key, result) {
    // 优化的缓存清理 - LRU策略
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
  }
  
  /**
   * 获取缓存统计信息
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
   * 批量识别数据库类型
   * @param {string[]} sqlList - SQL语句列表
   * @param {Object} options - 识别选项
   * @returns {Promise<Object[]>} 识别结果列表
   */
  async identifyBatch(sqlList, options = {}) {
    const results = [];
    
    for (const sql of sqlList) {
      try {
        const result = await this.identify(sql, options);
        results.push(result);
      } catch (error) {
        results.push({
          type: 'unknown',
          confidence: 0.1,
          method: 'error',
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * 获取默认数据库类型 - 基于SQL特征推断
   * @param {string} sql - SQL语句
   * @returns {Object|null} 默认数据库类型结果
   */
  getDefaultDatabaseType(sql) {
    const normalizedSql = sql.toUpperCase().trim();
    
    // 检查是否为简单的SELECT语句
    if (this.isSimpleSelectSQL(normalizedSql)) {
      // 基于常见使用情况，MySQL作为默认选择
      return {
        type: 'mysql',
        confidence: 0.4,
        method: 'rule-based-default',
        reasoning: '简单SQL语句，使用MySQL作为默认数据库类型',
        scores: { mysql: 0.4 },
        matches: []
      };
    }
    
    // 检查特定语法特征
    if (normalizedSql.includes('LIMIT ') && !normalizedSql.includes('OFFSET')) {
      return {
        type: 'mysql',
        confidence: 0.6,
        method: 'rule-based-syntax',
        reasoning: '检测到LIMIT语法（无OFFSET），倾向于MySQL',
        scores: { mysql: 0.6 },
        matches: [{ type: 'pattern', pattern: 'LIMIT without OFFSET' }]
      };
    }
    
    if (normalizedSql.includes('LIMIT ') && normalizedSql.includes('OFFSET')) {
      return {
        type: 'postgresql',
        confidence: 0.7,
        method: 'rule-based-syntax',
        reasoning: '检测到LIMIT OFFSET语法，倾向于PostgreSQL',
        scores: { postgresql: 0.7 },
        matches: [{ type: 'pattern', pattern: 'LIMIT OFFSET' }]
      };
    }
    
    if (normalizedSql.includes('TOP ')) {
      return {
        type: 'sqlserver',
        confidence: 0.7,
        method: 'rule-based-syntax',
        reasoning: '检测到TOP语法，倾向于SQL Server',
        scores: { sqlserver: 0.7 },
        matches: [{ type: 'pattern', pattern: 'TOP' }]
      };
    }
    
    // 如果没有明显特征，返回null让系统使用unknown
    return null;
  }

  /**
   * 判断是否为简单的SELECT语句
   * @param {string} normalizedSql - 标准化的SQL语句
   * @returns {boolean} 是否为简单SELECT
   */
  isSimpleSelectSQL(normalizedSql) {
    // 匹配简单的SELECT * FROM table WHERE condition LIMIT n格式
    const simpleSelectPattern = /^SELECT\s+(.+?)\s+FROM\s+(\w+)(\s+WHERE\s+.+?)?(\s+LIMIT\s+\d+)?\s*;?\s*$/;
    return simpleSelectPattern.test(normalizedSql);
  }
}

export default DatabaseIdentifier;