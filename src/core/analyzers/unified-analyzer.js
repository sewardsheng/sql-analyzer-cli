/**
 * 统一分析器 - Orchestrator模式重构版本
 * 作为主控Agent，协调三个Sub-Agent工具进行多维度SQL分析
 * 
 * 架构模式：Agent-as-Tool
 * - 主控Agent：任务分解、工具调度、结果整合
 * - Sub-Agent：性能分析、安全审计、规范检查
 */

import BaseAnalyzer from './base-analyzer.js';
import { PerformanceTool } from './tools/performance-tool.js';
import { SecurityTool } from './tools/security-tool.js';
import { StandardsTool } from './tools/standards-tool.js';
import * as logger from '../../utils/logger.js';

/**
 * 统一分析器类 - Orchestrator模式
 * 继承自BaseAnalyzer，作为主控Agent协调多个Sub-Agent工具
 */
class UnifiedAnalyzer extends BaseAnalyzer {
  constructor(config = {}) {
    super(config);
    
    // 创建LLM调用器（绑定到BaseAnalyzer的方法）
    const llmInvoker = this.createLLMInvoker();
    
    // 初始化Sub-Agent工具
    this.tools = {
      performance: new PerformanceTool(llmInvoker),
      security: new SecurityTool(llmInvoker),
      standards: new StandardsTool(llmInvoker)
    };
    
    // Orchestrator配置
    this.config = {
      parallelExecution: config.parallelExecution !== false, // 默认启用并行执行
      timeout: config.timeout || 30000, // 30秒超时
      retryAttempts: config.retryAttempts || 2,
      ...config
    };
    
    logger.logInfo('[UnifiedAnalyzer] 初始化完成', {
      tools: Object.keys(this.tools),
      parallelExecution: this.config.parallelExecution,
      timeout: this.config.timeout
    });
  }

  /**
   * 获取分析器类型
   * @returns {string} 分析器类型
   */
  getAnalyzerType() {
    return 'unified';
  }

  /**
   * 执行统一分析 - Orchestrator模式
   * @param {GlobalContext} context - 全局上下文
   * @returns {Promise<Object>} 分析结果
   */
  async analyze(context) {
    const startTime = Date.now();
    const requestId = context.requestId || 'unknown';
    
    logger.logInfo(`[UnifiedAnalyzer:${requestId}] 开始分析`, {
      databaseType: context.databaseType,
      sqlLength: context.sql?.length || 0,
      options: context.options
    });
    
    this.setGlobalContext(context);
    
    if (!this.initialized) {
      await this.initialize(context);
    }

    try {
      // 1. 解析启用的分析维度
      const enabledDimensions = this.getEnabledDimensions(context.options);
      
      if (!Object.values(enabledDimensions).some(Boolean)) {
        return this.createErrorResponse('未启用任何分析维度', requestId);
      }

      logger.logInfo(`[UnifiedAnalyzer:${requestId}] 启用维度`, enabledDimensions);

      // 2. 执行工具分析（并行或串行）
      const results = this.config.parallelExecution 
        ? await this.executeToolsInParallel(context, enabledDimensions, requestId)
        : await this.executeToolsInSequence(context, enabledDimensions, requestId);
      
      // 3. 整合工具结果
      const analysisResults = this.aggregateResults(results, enabledDimensions);
      
      // 4. 构建最终响应
      const response = {
        success: true,
        analyzer: 'unified',
        data: analysisResults,
        metadata: {
          duration: Date.now() - startTime,
          llmCalls: results.filter(r => r.success).length,
          totalToolCalls: results.length,
          confidence: this.calculateAverageConfidence(results),
          databaseType: context.databaseType || 'unknown',
          enabledDimensions,
          executionMode: this.config.parallelExecution ? 'parallel' : 'sequential',
          requestId
        },
        timestamp: new Date().toISOString()
      };

      // 5. 保存结果到上下文
      this.saveResultsToContext(context, analysisResults, response);

      logger.logInfo(`[UnifiedAnalyzer:${requestId}] 分析完成`, {
        duration: response.metadata.duration,
        llmCalls: response.metadata.llmCalls,
        success: true
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.logError(`[UnifiedAnalyzer:${requestId}] 分析失败`, error, {
        duration
      });
      
      context.addError(this.getAnalyzerType(), error);
      return this.createErrorResponse(error.message, requestId, duration);
    }
  }

  /**
   * 并行执行工具
   * @param {GlobalContext} context - 全局上下文
   * @param {Object} enabledDimensions - 启用的维度
   * @param {string} requestId - 请求ID
   * @returns {Promise<Array>} 工具执行结果
   */
  async executeToolsInParallel(context, enabledDimensions, requestId) {
    const toolPromises = [];
    const toolNames = [];

    // 准备并行执行的工具
    if (enabledDimensions.performance) {
      toolPromises.push(this.executeToolWithRetry('performance', context, requestId));
      toolNames.push('performance');
    }

    if (enabledDimensions.security) {
      toolPromises.push(this.executeToolWithRetry('security', context, requestId));
      toolNames.push('security');
    }

    if (enabledDimensions.standards) {
      toolPromises.push(this.executeToolWithRetry('standards', context, requestId));
      toolNames.push('standards');
    }

    // 并行执行所有工具，设置超时
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('工具执行超时')), this.config.timeout);
    });

    try {
      const results = await Promise.race([
        Promise.all(toolPromises),
        timeoutPromise
      ]);

      // 映射结果到维度名称
      return results.map((result, index) => ({
        dimension: toolNames[index],
        ...result
      }));
    } catch (error) {
      logger.logError(`[UnifiedAnalyzer:${requestId}] 并行执行失败`, new Error(error.message));
      
      // 如果并行执行失败，返回部分结果或默认结果
      return toolNames.map(dimension => ({
        dimension,
        success: false,
        error: error.message,
        data: this.tools[dimension].getDefaultResult()
      }));
    }
  }

  /**
   * 串行执行工具
   * @param {GlobalContext} context - 全局上下文
   * @param {Object} enabledDimensions - 启用的维度
   * @param {string} requestId - 请求ID
   * @returns {Promise<Array>} 工具执行结果
   */
  async executeToolsInSequence(context, enabledDimensions, requestId) {
    const results = [];
    const dimensions = ['performance', 'security', 'standards'];

    for (const dimension of dimensions) {
      if (enabledDimensions[dimension]) {
        const result = await this.executeToolWithRetry(dimension, context, requestId);
        results.push({
          dimension,
          ...result
        });
      }
    }

    return results;
  }

  /**
   * 带重试的工具执行
   * @param {string} dimension - 维度名称
   * @param {GlobalContext} context - 全局上下文
   * @param {string} requestId - 请求ID
   * @returns {Promise<Object>} 工具执行结果
   */
  async executeToolWithRetry(dimension, context, requestId) {
    const tool = this.tools[dimension];
    const params = {
      sql: context.sql,
      databaseType: context.databaseType
    };

    let lastError = null;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        logger.logDebug(`[UnifiedAnalyzer:${requestId}] 执行工具 ${dimension}`, {
          attempt,
          maxAttempts: this.config.retryAttempts
        });
        
        const result = await tool.execute(params);
        
        logger.logDebug(`[UnifiedAnalyzer:${requestId}] 工具 ${dimension} 执行成功`, {
          attempt,
          success: result.success,
          confidence: result.metadata?.confidence
        });
        
        return result;
      } catch (error) {
        lastError = error;
        logger.logWarning(`[UnifiedAnalyzer:${requestId}] 工具 ${dimension} 执行失败`, {
          attempt,
          error: error.message
        });
        
        // 如果不是最后一次尝试，等待一段时间再重试
        if (attempt < this.config.retryAttempts) {
          await this.delay(1000 * attempt); // 递增延迟
        }
      }
    }
    
    // 所有重试都失败了
    logger.logError(`[UnifiedAnalyzer:${requestId}] 工具 ${dimension} 最终失败`, new Error(`工具执行失败: ${lastError?.message}`), {
      attempts: this.config.retryAttempts,
      lastError: lastError?.message
    });
    
    return {
      success: false,
      error: lastError?.message || '工具执行失败',
      data: tool.getDefaultResult()
    };
  }

  /**
   * 整合工具结果
   * @param {Array} results - 工具执行结果
   * @param {Object} enabledDimensions - 启用的维度
   * @returns {Object} 整合后的分析结果
   */
  aggregateResults(results, enabledDimensions) {
    const aggregated = {
      performance: null,
      security: null,
      standards: null
    };

    results.forEach(result => {
      if (result.success && result.data) {
        aggregated[result.dimension] = result.data;
      } else if (enabledDimensions[result.dimension] && result.error) {
        // 只有当工具执行失败且有错误时，才使用默认结果
        aggregated[result.dimension] = this.tools[result.dimension].getDefaultResult();
        logger.logWarning(`[UnifiedAnalyzer] 使用默认结果`, {
          dimension: result.dimension,
          error: result.error
        });
      }
      // 如果维度未启用，保持null
    });

    return aggregated;
  }

  /**
   * 计算平均置信度
   * @param {Array} results - 工具执行结果
   * @returns {number} 平均置信度
   */
  calculateAverageConfidence(results) {
    const successfulResults = results.filter(r => r.success && r.data?.confidence !== undefined);
    
    if (successfulResults.length === 0) {
      return 0;
    }
    
    const totalConfidence = successfulResults.reduce((sum, r) => sum + r.data.confidence, 0);
    return totalConfidence / successfulResults.length;
  }

  /**
   * 获取启用的分析维度
   * @param {Object} options - 分析选项
   * @returns {Object} 启用的维度配置
   */
  getEnabledDimensions(options = {}) {
    return {
      performance: options.performance !== false,
      security: options.security !== false,
      standards: options.standards !== false
    };
  }

  /**
   * 创建LLM调用器
   * @returns {Function} LLM调用器函数
   */
  createLLMInvoker() {
    return async (messages, options = {}) => {
      try {
        // 使用BaseAnalyzer的invokeLLMAndParse方法
        const result = await this.invokeLLMAndParse(messages, options);
        return result;
      } catch (error) {
        logger.logError('[UnifiedAnalyzer] LLM调用失败', new Error(error.message));
        throw error;
      }
    };
  }

  /**
   * 创建错误响应
   * @param {string} message - 错误消息
   * @param {string} requestId - 请求ID
   * @param {number} duration - 执行时长
   * @returns {Object} 错误响应
   */
  createErrorResponse(message, requestId, duration = 0) {
    return {
      success: false,
      analyzer: 'unified',
      error: message,
      data: null,
      metadata: {
        duration,
        requestId,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 保存结果到上下文
   * @param {GlobalContext} context - 全局上下文
   * @param {Object} analysisResults - 分析结果
   * @param {Object} response - 响应对象
   */
  saveResultsToContext(context, analysisResults, response) {
    Object.keys(analysisResults).forEach(dimension => {
      if (analysisResults[dimension] !== null) {
        context.setAnalysisResult(dimension, {
          success: true,
          analyzer: dimension,
          data: analysisResults[dimension],
          metadata: response.metadata,
          timestamp: response.timestamp
        });
      }
    });
  }

  /**
   * 延迟函数
   * @param {number} ms - 延迟毫秒数
   * @returns {Promise} Promise对象
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取工具信息
   * @returns {Object} 工具信息
   */
  getToolsInfo() {
    return {
      available: Object.keys(this.tools),
      details: Object.entries(this.tools).map(([name, tool]) => ({
        name,
        ...tool.getToolInfo()
      })),
      config: this.config
    };
  }

  /**
   * 批量分析多个SQL语句
   * @param {Array<GlobalContext>} contexts - 全局上下文数组
   * @returns {Promise<Array>} 分析结果数组
   */
  async batchAnalyze(contexts) {
    if (!Array.isArray(contexts)) {
      throw new Error('批量分析需要传入GlobalContext数组');
    }

    logger.logInfo('[UnifiedAnalyzer] 开始批量分析', {
      count: contexts.length
    });

    const results = [];
    
    // 并行处理多个上下文（限制并发数）
    const concurrencyLimit = 5;
    const batches = [];
    
    for (let i = 0; i < contexts.length; i += concurrencyLimit) {
      batches.push(contexts.slice(i, i + concurrencyLimit));
    }

    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(context => this.analyze(context))
      );
      
      results.push(...batchResults.map((result, index) => ({
        context: batch[index].requestId,
        result
      })));
    }

    logger.logInfo('[UnifiedAnalyzer] 批量分析完成', {
      total: results.length,
      successful: results.filter(r => r.result.success).length
    });

    return results;
  }
}

export default UnifiedAnalyzer;