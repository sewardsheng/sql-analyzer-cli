/**
 * SQL分析引擎 - 纯新架构版本
 * 实现四阶段分析流程：预处理→并行分析→整合→学习
 * 专注于新架构，移除所有向后兼容代码
 */

import GlobalContext from './context.js';
import { DatabaseIdentifier } from '../identification/index.js';
import { UnifiedAnalyzer } from '../analyzers/index.js';
import { ReportIntegrator } from '../reporting/index.js';
import { getConfigManager } from '../../config/index.js';

/**
 * SQL分析引擎类 - 纯新架构版本
 */
class AnalysisEngine {
  constructor() {
    this.configManager = getConfigManager();
    this.databaseIdentifier = null;
    this.unifiedAnalyzer = null;
    this.reportIntegrator = null;
    this.initialized = false;
  }

  /**
   * 初始化引擎组件
   */
  async initialize() {
    if (this.initialized) return;

    try {
      const config = await this.configManager.getConfig();
      
      // 初始化新架构组件
      this.databaseIdentifier = new DatabaseIdentifier(config);
      this.unifiedAnalyzer = new UnifiedAnalyzer(config);
      this.reportIntegrator = new ReportIntegrator(config);
      
      // 初始化分析器
      await this.unifiedAnalyzer.initialize();
      
      this.initialized = true;
    } catch (error) {
      console.error('分析引擎初始化失败:', error);
      throw error;
    }
  }

  /**
   * 确保引擎已初始化
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * 预处理阶段
   * 创建GlobalContext实例，识别数据库类型，提取SQL元数据
   * @param {string} sql - SQL语句
   * @param {Object} options - 分析选项
   * @returns {Promise<GlobalContext>} 全局上下文
   */
  async _preprocessingPhase(sql, options = {}) {
    const startTime = Date.now();
    
    try {
      // 1. 创建GlobalContext实例
      const context = new GlobalContext(sql, options);
      
      // 2. 如果未指定数据库类型，进行自动识别
      if (!context.databaseType) {
        const dbResult = await this.databaseIdentifier.identify(sql, {
          skipCache: options.skipCache || false
        });
        
        context.setDatabaseType(
          dbResult.type,
          dbResult.confidence,
          dbResult.method
        );
        
        // 如果使用了缓存，记录缓存命中
        if (dbResult.cached) {
          context.incrementCacheHits();
        }
      }
      
      // 3. 记录预处理阶段性能指标
      context.recordStageMetrics('preprocessing', Date.now() - startTime, 0);
      
      return context;
    } catch (error) {
      console.error('预处理阶段失败:', error);
      throw new Error(`预处理失败: ${error.message}`);
    }
  }

  /**
   * 分析阶段
   * 使用UnifiedAnalyzer进行多维度并行分析
   * @param {GlobalContext} context - 全局上下文
   * @returns {Promise<GlobalContext>} 更新后的全局上下文
   */
  async _analysisPhase(context) {
    const startTime = Date.now();
    
    try {
      // 1. 使用UnifiedAnalyzer进行统一分析
      const analysisResult = await this.unifiedAnalyzer.analyze(context);
      
      // 2. 记录分析阶段性能指标
      const llmCalls = analysisResult.metadata?.llmCalls || 1;
      context.recordStageMetrics('analysis', Date.now() - startTime, llmCalls);
      
      // 3. 如果分析失败，记录错误但不中断流程
      if (!analysisResult.success) {
        context.addError('analysis', analysisResult.error);
      }
      
      return context;
    } catch (error) {
      console.error('分析阶段失败:', error);
      context.addError('analysis', error);
      return context;
    }
  }

  /**
   * 整合阶段
   * 使用ReportIntegrator整合分析结果，生成综合报告
   * @param {GlobalContext} context - 全局上下文
   * @returns {Promise<GlobalContext>} 更新后的全局上下文
   */
  async _integrationPhase(context) {
    const startTime = Date.now();
    
    try {
      // 1. 使用ReportIntegrator整合结果
      const report = await this.reportIntegrator.integrateReport(context);
      
      // 2. 记录整合阶段性能指标
      context.recordStageMetrics('integration', Date.now() - startTime, 0);
      
      return context;
    } catch (error) {
      console.error('整合阶段失败:', error);
      context.addError('integration', error);
      return context;
    }
  }

  /**
   * 学习阶段（可选）
   * 如果启用学习选项，执行规则学习
   * @param {GlobalContext} context - 全局上下文
   * @returns {Promise<GlobalContext>} 更新后的全局上下文
   */
  async _learningPhase(context) {
    const startTime = Date.now();
    
    try {
      // 只有在启用学习选项时才执行
      if (!context.options.learning) {
        return context;
      }
      
      // TODO: 实现规则学习逻辑
      // 这里可以集成IntelligentRuleLearner组件
      // 目前先记录学习阶段完成
      
      context.recordStageMetrics('learning', Date.now() - startTime, 0);
      
      return context;
    } catch (error) {
      console.error('学习阶段失败:', error);
      context.addError('learning', error);
      // 学习阶段失败不影响主流程
      return context;
    }
  }

  /**
   * 执行四阶段分析流程
   * @param {string} sql - SQL语句
   * @param {Object} options - 分析选项
   * @returns {Promise<Object>} 分析结果
   */
  async _executeFourPhaseAnalysis(sql, options = {}) {
    // 确保引擎已初始化
    await this.ensureInitialized();
    
    let context;
    
    try {
      // 阶段1: 预处理
      context = await this._preprocessingPhase(sql, options);
      
      // 阶段2: 分析
      context = await this._analysisPhase(context);
      
      // 阶段3: 整合
      context = await this._integrationPhase(context);
      
      // 阶段4: 学习（可选）
      context = await this._learningPhase(context);
      
      // 构建最终结果
      const finalResult = this.buildFinalResult(context);
      
      return finalResult;
    } catch (error) {
      console.error('四阶段分析流程失败:', error);
      
      // 如果有上下文，尝试构建错误结果
      if (context) {
        context.addError('engine', error);
        return this.buildErrorResult(context, error);
      }
      
      // 完全失败，返回基本错误结果
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 构建最终结果
   * @param {GlobalContext} context - 全局上下文
   * @returns {Object} 最终分析结果
   */
  buildFinalResult(context) {
    const report = context.getIntegratedReport();
    const errors = context.getErrors();
    
    // 构建新架构的纯粹结果格式
    const result = {
      success: errors.length === 0,
      data: report || {},
      metadata: {
        requestId: context.requestId,
        timestamp: context.timestamp,
        databaseType: context.databaseType,
        dbConfidence: context.dbConfidence,
        sqlComplexity: context.metadata.complexity,
        metrics: context.metrics,
        options: context.options
      },
      errors: errors.length > 0 ? errors : undefined
    };
    
    // 如果有错误但仍有部分结果，标记为部分成功
    if (errors.length > 0 && report) {
      result.success = 'partial';
      result.warning = '分析过程中出现部分错误，但生成了部分结果';
    }
    
    return result;
  }

  /**
   * 构建错误结果
   * @param {GlobalContext} context - 全局上下文
   * @param {Error} error - 错误对象
   * @returns {Object} 错误结果
   */
  buildErrorResult(context, error) {
    return {
      success: false,
      error: error.message,
      metadata: {
        requestId: context.requestId,
        timestamp: context.timestamp,
        databaseType: context.databaseType,
        metrics: context.metrics
      },
      errors: context.getErrors()
    };
  }

  /**
   * 分析SQL语句（新架构主要业务流程）
   * @param {Object} options - 分析选项
   * @param {string} [options.sql] - 要分析的SQL语句
   * @param {boolean} [options.learning] - 是否启用学习功能
   * @param {Object} [options.analysisConfig] - 分析配置
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeSql(options) {
    try {
      const { sql, ...analysisOptions } = options;
      
      if (!sql || typeof sql !== 'string') {
        throw new Error('必须提供有效的SQL语句');
      }
      
      const sqlQuery = sql.trim();
      if (!sqlQuery) {
        throw new Error('SQL语句不能为空');
      }
      
      // 执行四阶段分析流程
      const result = await this._executeFourPhaseAnalysis(sqlQuery, analysisOptions);
      
      return result;
    } catch (error) {
      console.error(`分析失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 批量分析SQL语句
   * @param {Array<string>} sqlQueries - SQL查询数组
   * @param {Object} options - 分析选项
   * @returns {Promise<Array>} 分析结果数组
   */
  async analyzeBatch(sqlQueries, options = {}) {
    if (!Array.isArray(sqlQueries)) {
      throw new Error('批量分析需要传入SQL数组');
    }
    
    const results = [];
    
    // 串行处理以确保资源控制
    for (let i = 0; i < sqlQueries.length; i++) {
      const sqlQuery = sqlQueries[i];
      
      try {
        const result = await this.analyzeSql({ sql: sqlQuery, ...options });
        results.push({ 
          index: i, 
          success: true, 
          result,
          requestId: result.metadata?.requestId
        });
      } catch (error) {
        results.push({ 
          index: i, 
          success: false, 
          error: error.message,
          sql: sqlQuery
        });
      }
    }
    
    return results;
  }

  /**
   * 获取分析引擎状态
   * @returns {Promise<Object>} 引擎状态信息
   */
  async getStatus() {
    const status = {
      engine: 'ready',
      initialized: this.initialized,
      components: {
        databaseIdentifier: !!this.databaseIdentifier,
        unifiedAnalyzer: !!this.unifiedAnalyzer,
        reportIntegrator: !!this.reportIntegrator
      },
      timestamp: new Date().toISOString()
    };
    
    // 如果组件已初始化，获取缓存统计
    if (this.databaseIdentifier) {
      status.cacheStats = this.databaseIdentifier.getCacheStats();
    }
    
    return status;
  }

  /**
   * 清空缓存
   */
  async clearCache() {
    if (this.databaseIdentifier) {
      this.databaseIdentifier.clearCache();
    }
  }

  /**
   * 获取引擎配置信息
   * @returns {Promise<Object>} 配置信息
   */
  async getConfig() {
    return await this.configManager.getConfig();
  }
}

// 创建引擎实例
const analysisEngine = new AnalysisEngine();

// ============================================================================
// 导出引擎实例 - 新架构版本
// ============================================================================

/**
 * 获取分析引擎实例
 * @returns {AnalysisEngine} 分析引擎实例
 */
export function getAnalysisEngine() {
  return analysisEngine;
}

// 导出引擎类和实例
export { AnalysisEngine, analysisEngine };

// 默认导出引擎实例
export default analysisEngine;