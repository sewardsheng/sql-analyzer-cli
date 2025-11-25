/**
 * 全局上下文管理类
 * 管理整个分析流程的共享状态，包括SQL、数据库类型、分析选项等
 */

import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

/**
 * 全局上下文类
 * 用于在整个分析流程中传递和管理共享状态
 */
class GlobalContext {
  /**
   * 构造函数
   * @param {string} sql - 要分析的SQL语句
   * @param {Object} options - 分析选项
   * @param {string} options.databaseType - 指定的数据库类型（可选）
   * @param {boolean} options.performance - 是否启用性能分析
   * @param {boolean} options.security - 是否启用安全分析
   * @param {boolean} options.standards - 是否启用规范检查
   * @param {boolean} options.learning - 是否启用规则学习
   * @param {Object} options.metadata - 额外的元数据
   */
  constructor(sql, options = {}) {
    // 基础信息
    this.sql = sql;
    this.originalSql = sql;
    this.normalizedSql = this.normalizeSql(sql);
    this.databaseType = options.databaseType || null;
    this.dbConfidence = 0;
    this.dbDetectionMethod = null; // 'rule-based', 'llm-based', 'manual'
    
    // 分析配置
    this.options = {
      performance: options.performance !== false, // 默认启用
      security: options.security !== false,       // 默认启用
      standards: options.standards !== false,     // 默认启用
      learning: options.learning === true,         // 默认禁用
      ...options
    };
    
    // SQL元数据
    this.metadata = this.extractSqlMetadata(sql);
    
    // 分析结果存储
    this.analysisResults = {
      performance: null,
      security: null,
      standards: null
    };
    
    // 整合后的报告
    this.integratedReport = null;
    
    // 时间戳和标识
    this.timestamp = new Date().toISOString();
    this.requestId = options.requestId || uuidv4();
    
    // 性能指标
    this.metrics = {
      totalDuration: 0,
      llmCalls: 0,
      stages: {},
      cacheHits: 0
    };
    
    // 错误信息
    this.errors = [];
    
    // 缓存相关
    this.cacheKey = this.generateCacheKey();
  }
  
  /**
   * 规范化SQL语句
   * @param {string} sql - 原始SQL
   * @returns {string} 规范化后的SQL
   */
  normalizeSql(sql) {
    if (!sql || typeof sql !== 'string') {
      return '';
    }
    
    return sql
      .trim()
      .replace(/\s+/g, ' ')           // 多个空格替换为单个空格
      .replace(/\n\s*/g, ' ')          // 换行符替换为空格
      .replace(/;\s*$/, '')            // 移除末尾分号
      .toUpperCase();                  // 转换为大写便于分析
  }
  
  /**
   * 提取SQL元数据
   * @param {string} sql - SQL语句
   * @returns {Object} 提取的元数据
   */
  extractSqlMetadata(sql) {
    const normalizedSql = this.normalizeSql(sql);
    const metadata = {
      tables: [],
      operations: [],
      hasJoin: false,
      hasSubquery: false,
      hasAggregate: false,
      hasWindow: false,
      hasTransaction: false,
      complexity: 'simple'
    };
    
    // 提取表名（简单实现）
    const tableRegex = /FROM\s+([A-Z_][A-Z0-9_]*)|JOIN\s+([A-Z_][A-Z0-9_]*)|INTO\s+([A-Z_][A-Z0-9_]*)/gi;
    let match;
    while ((match = tableRegex.exec(normalizedSql)) !== null) {
      const tableName = match[1] || match[2] || match[3];
      if (tableName && !metadata.tables.includes(tableName)) {
        metadata.tables.push(tableName);
      }
    }
    
    // 提取操作类型
    const operations = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE'];
    operations.forEach(op => {
      if (normalizedSql.includes(op)) {
        metadata.operations.push(op);
      }
    });
    
    // 检查复杂度特征
    metadata.hasJoin = /\bJOIN\b/i.test(normalizedSql);
    metadata.hasSubquery = /\bSELECT\b.*\bFROM\b.*\bWHERE\b.*\bSELECT\b/i.test(normalizedSql) ||
                          /\bIN\s*\(/i.test(normalizedSql) ||
                          /\bEXISTS\s*\(/i.test(normalizedSql);
    metadata.hasAggregate = /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(normalizedSql);
    metadata.hasWindow = /\bOVER\s*\(/i.test(normalizedSql);
    metadata.hasTransaction = /\b(BEGIN|COMMIT|ROLLBACK|START\s+TRANSACTION)\b/i.test(normalizedSql);
    
    // 评估复杂度
    const complexityFactors = [
      metadata.hasJoin,
      metadata.hasSubquery,
      metadata.hasAggregate,
      metadata.hasWindow,
      metadata.tables.length > 2,
      metadata.operations.length > 1
    ];
    
    const complexCount = complexityFactors.filter(Boolean).length;
    if (complexCount >= 4) {
      metadata.complexity = 'complex';
    } else if (complexCount >= 2) {
      metadata.complexity = 'medium';
    }
    
    return metadata;
  }
  
  /**
   * 设置数据库类型
   * @param {string} databaseType - 数据库类型
   * @param {number} confidence - 置信度 (0-1)
   * @param {string} method - 检测方法
   */
  setDatabaseType(databaseType, confidence = 0, method = 'manual') {
    this.databaseType = databaseType;
    this.dbConfidence = confidence;
    this.dbDetectionMethod = method;
  }
  
  /**
   * 获取数据库类型信息
   * @returns {Object} 数据库类型信息
   */
  getDatabaseInfo() {
    return {
      type: this.databaseType,
      confidence: this.dbConfidence,
      method: this.dbDetectionMethod
    };
  }
  
  /**
   * 设置分析结果
   * @param {string} analyzerType - 分析器类型
   * @param {Object} result - 分析结果
   */
  setAnalysisResult(analyzerType, result) {
    if (this.analysisResults.hasOwnProperty(analyzerType)) {
      this.analysisResults[analyzerType] = result;
    } else {
      throw new Error(`未知的分析器类型: ${analyzerType}`);
    }
  }
  
  /**
   * 获取分析结果
   * @param {string} analyzerType - 分析器类型（可选）
   * @returns {Object|Object[]} 分析结果
   */
  getAnalysisResult(analyzerType = null) {
    if (analyzerType) {
      return this.analysisResults[analyzerType];
    }
    return this.analysisResults;
  }
  
  /**
   * 检查是否所有启用的分析器都已完成
   * @returns {boolean} 是否全部完成
   */
  isAnalysisComplete() {
    const enabledAnalyzers = Object.keys(this.options).filter(
      key => this.options[key] && key !== 'learning' && this.analysisResults.hasOwnProperty(key)
    );
    
    return enabledAnalyzers.every(analyzer => this.analysisResults[analyzer] !== null);
  }
  
  /**
   * 设置整合报告
   * @param {Object} report - 整合后的报告
   */
  setIntegratedReport(report) {
    this.integratedReport = report;
  }
  
  /**
   * 获取整合报告
   * @returns {Object} 整合后的报告
   */
  getIntegratedReport() {
    return this.integratedReport;
  }
  
  /**
   * 记录阶段性能指标
   * @param {string} stage - 阶段名称
   * @param {number} duration - 持续时间（毫秒）
   * @param {number} llmCalls - LLM调用次数
   */
  recordStageMetrics(stage, duration, llmCalls = 0) {
    this.metrics.stages[stage] = {
      duration,
      llmCalls,
      timestamp: new Date().toISOString()
    };
    this.metrics.totalDuration += duration;
    this.metrics.llmCalls += llmCalls;
  }
  
  /**
   * 增加缓存命中次数
   */
  incrementCacheHits() {
    this.metrics.cacheHits++;
  }
  
  /**
   * 添加错误信息
   * @param {string} stage - 发生错误的阶段
   * @param {Error|string} error - 错误信息
   */
  addError(stage, error) {
    this.errors.push({
      stage,
      message: error instanceof Error ? error.message : error,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * 获取错误列表
   * @param {string} stage - 特定阶段的错误（可选）
   * @returns {Array} 错误列表
   */
  getErrors(stage = null) {
    if (stage) {
      return this.errors.filter(error => error.stage === stage);
    }
    return this.errors;
  }
  
  /**
   * 检查是否有错误
   * @param {string} stage - 特定阶段的错误（可选）
   * @returns {boolean} 是否有错误
   */
  hasErrors(stage = null) {
    return this.getErrors(stage).length > 0;
  }
  
  /**
   * 生成缓存键
   * @returns {string} 缓存键
   */
  generateCacheKey() {
    // 使用SQL的哈希值和关键选项生成缓存键
    const keyData = {
      sql: this.normalizedSql,
      options: {
        performance: this.options.performance,
        security: this.options.security,
        standards: this.options.standards
      }
    };
    
    return createHash('md5')
      .update(JSON.stringify(keyData))
      .digest('hex');
  }
  
  /**
   * 获取缓存键
   * @returns {string} 缓存键
   */
  getCacheKey() {
    return this.cacheKey;
  }
  
  /**
   * 转换为JSON对象（用于序列化）
   * @returns {Object} JSON对象
   */
  toJSON() {
    return {
      sql: this.sql,
      originalSql: this.originalSql,
      normalizedSql: this.normalizedSql,
      databaseType: this.databaseType,
      dbConfidence: this.dbConfidence,
      dbDetectionMethod: this.dbDetectionMethod,
      options: this.options,
      metadata: this.metadata,
      analysisResults: this.analysisResults,
      integratedReport: this.integratedReport,
      timestamp: this.timestamp,
      requestId: this.requestId,
      metrics: this.metrics,
      errors: this.errors,
      cacheKey: this.cacheKey
    };
  }
  
  /**
   * 从JSON对象创建实例（用于反序列化）
   * @param {Object} json - JSON对象
   * @returns {GlobalContext} GlobalContext实例
   */
  static fromJSON(json) {
    const context = new GlobalContext(json.sql, json.options);
    
    // 恢复所有属性
    Object.assign(context, {
      originalSql: json.originalSql,
      normalizedSql: json.normalizedSql,
      databaseType: json.databaseType,
      dbConfidence: json.dbConfidence,
      dbDetectionMethod: json.dbDetectionMethod,
      metadata: json.metadata,
      analysisResults: json.analysisResults,
      integratedReport: json.integratedReport,
      timestamp: json.timestamp,
      requestId: json.requestId,
      metrics: json.metrics,
      errors: json.errors,
      cacheKey: json.cacheKey
    });
    
    return context;
  }
}

export default GlobalContext;