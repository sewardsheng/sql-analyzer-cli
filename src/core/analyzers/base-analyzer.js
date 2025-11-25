/**
 * 分析器基类
 * 提供所有分析器的通用功能：LLM初始化、配置管理、GlobalContext集成等
 */

import { ChatOpenAI } from '@langchain/openai';
import { getConfigManager } from '../../config/index.js';
import GlobalContext from '../engine/context.js';
import ResponsePreprocessor from '../../utils/parsing/response-preprocessor.js';
import StructuredParser from '../../utils/parsing/structured-parser.js';
import IntelligentRepairer from '../../utils/parsing/intelligent-repairer.js';
import ResponseAdapter from '../../utils/parsing/response-adapter.js';

/**
 * 分析器基类
 */
class BaseAnalyzer {
  constructor(config = {}) {
    this.config = config;
    this.llm = null;
    this.initialized = false;
    this.globalContext = null;
  }

  /**
   * 初始化分析器
   * @param {GlobalContext} globalContext - 全局上下文（可选）
   */
  async initialize(globalContext = null) {
    if (this.initialized) return;
    
    // 设置全局上下文
    if (globalContext) {
      this.globalContext = globalContext;
    }
    
    const configManager = getConfigManager();
    const envConfig = await configManager.getConfig();
    this.llm = new ChatOpenAI({
      modelName: this.config.model || envConfig.model,
      temperature: 0.1,
      maxTokens: 99999,
      configuration: {
        apiKey: this.config.apiKey || envConfig.apiKey,
        baseURL: this.config.baseURL || envConfig.baseURL
      }
    });
    
    this.initialized = true;
  }

  /**
   * 获取LLM实例
   * @returns {ChatOpenAI} LLM实例
   */
  getLLM() {
    if (!this.initialized) {
      throw new Error('分析器未初始化，请先调用initialize()方法');
    }
    return this.llm;
  }


  /**
   * 调用LLM并解析JSON响应（增强版）
   * 提供统一的LLM调用和JSON解析逻辑，支持GlobalContext
   * @param {Array} messages - LLM消息数组
   * @param {Object} options - 调用选项
   * @returns {Promise<Object>} 解析后的JSON对象
   */
  async invokeLLMAndParse(messages, options = {}) {
    try {
      // 1. 记录发送的提示词
      console.log('\n=== LLM Request ===');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Messages count:', messages.length);
      console.log('System prompt length:', messages[0]?.content?.length || 0);
      console.log('User prompt:', messages[messages.length - 1]?.content?.substring(0, 200) + '...');
      console.log('Options:', JSON.stringify(options));
      
      // 2. 记录LLM调用
      if (this.globalContext) {
        this.globalContext.metrics.llmCalls++;
      }
      
      // 3. 调用LLM
      const startTime = Date.now();
      const response = await this.getLLM().invoke(messages, {
        temperature: options.temperature || 0.1,
        maxTokens: options.maxTokens || 4000
      });
      const duration = Date.now() - startTime;
      
      // 4. 记录原始响应
      console.log('\n=== LLM Raw Response ===');
      console.log('Duration:', duration, 'ms');
      console.log('Response type:', typeof response);
      console.log('Response length:', typeof response === 'string' ? response.length : JSON.stringify(response).length);
      console.log('Response preview:', typeof response === 'string'
        ? response.substring(0, 500) + '...'
        : JSON.stringify(response, null, 2).substring(0, 500) + '...');
      
      // 5. 使用ResponseAdapter统一处理响应
      const adaptedResponse = ResponseAdapter.adapt(response);
      
      if (!adaptedResponse.success) {
        throw new Error(`响应适配失败: ${adaptedResponse.error}`);
      }
      
      const responseContent = adaptedResponse.content;
      
      // 记录适配结果
      console.log('Response Adapter Results:');
      console.log('  - Response Type:', adaptedResponse.metadata.responseType);
      console.log('  - Confidence:', adaptedResponse.metadata.confidence);
      console.log('  - Content Length:', responseContent.length);
      console.log('  - Raw Structure:', JSON.stringify(adaptedResponse.metadata.rawStructure, null, 2));
      const processedResponse = ResponsePreprocessor.process(responseContent);
      console.log('\n=== Processed Response ===');
      console.log('Format detected:', processedResponse.metadata.format);
      console.log('Content length:', processedResponse.content.length);
      console.log('Validation:', processedResponse.validation.summary);
      
      // 新增：详细的验证日志
      if (!processedResponse.validation.valid) {
        console.warn('⚠️ Validation issues:', processedResponse.validation.issues);
      }
      
      console.log('Metadata:', JSON.stringify(processedResponse.metadata));
      console.log('Content preview:', processedResponse.content.substring(0, 500) + '...');
      
      // 7. 结构化解析
      const parseResult = await StructuredParser.parse(processedResponse);
      console.log('\n=== Parse Result ===');
      console.log('Parse success:', parseResult.success);
      console.log('Parse strategy:', parseResult.strategy);
      console.log('Parse confidence:', parseResult.confidence);
      
      if (parseResult.success && parseResult.data) {
        console.log('Parsed data keys:', Object.keys(parseResult.data));
        console.log('Data structure:', JSON.stringify(Object.keys(parseResult.data).reduce((acc, key) => {
          acc[key] = typeof parseResult.data[key];
          return acc;
        }, {})));
      }
      
      if (!parseResult.success) {
        console.error('\n=== Parse Failed ===');
        console.error('Parse error:', parseResult.error);
        console.error('Original response (full):', responseContent);
        console.error('Processed content (full):', processedResponse.content);
        
        // 尝试智能修复
        console.log('\n=== Attempting Intelligent Repair ===');
        const repaired = await IntelligentRepairer.repair(parseResult, responseContent, this.getLLM());
        console.log('Repair result:', repaired ? 'success' : 'failed');
        
        if (repaired && repaired.success) {
          console.log('Repaired parse success:', repaired.success);
          console.log('Repaired data keys:', Object.keys(repaired.data || {}));
          
          // 记录性能指标
          if (this.globalContext) {
            this.globalContext.recordStageMetrics(this.getAnalyzerType(), duration, 1);
          }
          
          console.log('\n=== Parse Complete (with Repair) ===\n');
          return this.formatResponse(repaired.data);
        }
      }
      
      // 记录性能指标
      if (this.globalContext) {
        this.globalContext.recordStageMetrics(this.getAnalyzerType(), duration, 1);
      }
      
      console.log('\n=== Parse Complete ===\n');
      return this.formatResponse(parseResult.data);
      
    } catch (error) {
      console.error('\n=== LLM Invocation Error ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // 优化的错误处理
      return this.handleOptimizedError('LLM调用和解析', error);
    }
  }
  
  /**
   * 简单的JSON解析方法
   * @param {string} content - LLM响应内容
   * @returns {Object} 解析后的数据
   */
  optimizedJsonParse(content) {
    try {
      // 快速直接解析
      return JSON.parse(content);
    } catch (error) {
      // 优化的修复策略
      let fixed = content.trim();
      
      // 快速移除markdown标记
      fixed = fixed.replace(/^```(?:json|javascript|js)?\s*/i, '');
      fixed = fixed.replace(/\s*```$/, '');
      
      // 快速提取JSON
      const jsonStart = fixed.indexOf('{');
      const jsonEnd = fixed.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        fixed = fixed.substring(jsonStart, jsonEnd + 1);
        try {
          return JSON.parse(fixed);
        } catch (e) {
          // 忽略详细错误
        }
      }
      
      // 返回简化的默认响应
      return {
        score: 0,
        confidence: 0.1,
        issues: [],
        recommendations: [{
          category: "General",
          priority: "Medium",
          description: "分析失败，请检查输入"
        }]
      };
    }
  }
  
  
  /**
   * 获取分析器类型
   * @returns {string} 分析器类型
   */
  getAnalyzerType() {
    // 由子类实现
    throw new Error('子类必须实现getAnalyzerType方法');
  }
  
  /**
   * 设置全局上下文
   * @param {GlobalContext} globalContext - 全局上下文
   */
  setGlobalContext(globalContext) {
    this.globalContext = globalContext;
  }
  
  /**
   * 获取全局上下文
   * @returns {GlobalContext} 全局上下文
   */
  getGlobalContext() {
    return this.globalContext;
  }
  
  /**
   * 构建分析提示（基础实现）
   * 子类可以重写此方法以提供特定的提示构建逻辑
   * @param {GlobalContext} context - 全局上下文
   * @returns {Array} LLM消息数组
   */
  buildPrompt(context) {
    const databaseType = context.databaseType || 'unknown';
    const sql = context.sql;
    
    return [
      {
        role: 'system',
        content: `你是一个专业的SQL分析专家，专门进行${this.getAnalyzerType()}分析。`
      },
      {
        role: 'user',
        content: `请分析以下SQL语句的${this.getAnalyzerType()}方面：

数据库类型: ${databaseType}
SQL语句:
\`\`\`sql
${sql}
\`\`\`

请以JSON格式返回分析结果。`
      }
    ];
  }
  
  /**
   * 执行分析（新架构统一接口）
   * @param {GlobalContext} context - 全局上下文
   * @returns {Promise<Object>} 分析结果
   */
  async analyze(context) {
    // 设置全局上下文
    this.setGlobalContext(context);
    
    // 确保已初始化
    if (!this.initialized) {
      await this.initialize(context);
    }
    
    try {
      // 构建提示
      const messages = this.buildPrompt(context);
      
      // 调用LLM并解析
      const result = await this.invokeLLMAndParse(messages);
      
      // 添加分析器元数据
      result.analyzer = this.getAnalyzerType();
      result.timestamp = new Date().toISOString();
      
      // 保存到全局上下文
      context.setAnalysisResult(this.getAnalyzerType(), result);
      
      return result;
    } catch (error) {
      // 记录错误
      context.addError(this.getAnalyzerType(), error);
      
      return {
        success: false,
        analyzer: this.getAnalyzerType(),
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 格式化分析响应（增强版）
   * 提供统一的响应格式化逻辑，支持新架构的数据结构
   * @param {Object} result - LLM返回的分析结果
   * @param {string} databaseType - 数据库类型（可选）
   * @returns {Object} 标准化的响应对象
   */
  formatResponse(result, databaseType = null) {
    // 标准化分数字段为数字类型
    const normalizedResult = this.normalizeScoreFields(result);
    
    // 构建标准响应格式
    const response = {
      success: true,
      analyzer: this.getAnalyzerType(),
      data: {
        score: normalizedResult.score || 0,
        level: this.determineLevel(normalizedResult.score || 0),
        issues: normalizedResult.issues || [],
        suggestions: normalizedResult.suggestions || normalizedResult.recommendations || [],
        ...normalizedResult
      },
      metadata: {
        duration: 0, // 将在invokeLLMAndParse中设置
        llmCalls: 1,
        confidence: normalizedResult.confidence || 0.5,
        databaseType: databaseType || (this.globalContext?.databaseType) || 'unknown'
      }
    };
    
    // 移除已处理的字段，避免重复
    delete response.data.score;
    delete response.data.issues;
    delete response.data.suggestions;
    delete response.data.confidence;
    
    return response;
  }
  
  /**
   * 根据分数确定等级
   * @param {number} score - 分数 (0-100)
   * @returns {string} 等级
   */
  determineLevel(score) {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'warning';
    return 'critical';
  }

  /**
   * 标准化分数字段为数字类型（增强版）
   * @param {Object} result - 分析结果对象
   * @returns {Object} 标准化后的结果对象
   */
  normalizeScoreFields(result) {
    const normalized = { ...result };
    
    // 优化：预定义评分字段映射
    const scoreFieldRanges = {
      'score': { min: 0, max: 100 },
      'confidence': { min: 0, max: 1 },
      'cvss_score': { min: 0, max: 10 },
      'default': { min: 0, max: 100 }
    };
    
    // 批量标准化评分字段
    Object.keys(normalized).forEach(fieldName => {
      if (fieldName.toLowerCase().includes('score') || fieldName.toLowerCase().includes('confidence')) {
        const range = scoreFieldRanges[fieldName] || scoreFieldRanges.default;
        normalized[fieldName] = this.clampScore(Number(normalized[fieldName]) || 0, range.min, range.max);
      }
    });
    
    return normalized;
  }
  
  /**
   * 标准化单个评分字段
   * @param {*} value - 评分值
   * @param {string} fieldName - 字段名称
   * @returns {number} 标准化后的数值
   */
  normalizeSingleScore(value, fieldName) {
    // 优化：快速数字转换
    if (typeof value === 'number') {
      return isNaN(value) ? 0 : Math.max(0, Math.min(100, value));
    }
    
    if (typeof value === 'string') {
      // 快速处理百分比
      if (value.includes('%')) {
        const numValue = parseFloat(value.replace('%', ''));
        return isNaN(numValue) ? 0 : Math.max(0, Math.min(100, numValue));
      }
      
      // 快速处理分数
      if (value.includes('/')) {
        const parts = value.split('/');
        if (parts.length === 2) {
          const numerator = parseFloat(parts[0]);
          const denominator = parseFloat(parts[1]);
          if (!isNaN(numerator) && !isNaN(denominator) && denominator > 0) {
            return Math.max(0, Math.min(100, (numerator / denominator) * 100));
          }
        }
      }
      
      // 快速处理描述性评分
      const descriptiveScores = {
        '高': 85, 'high': 85, '严重': 95, 'critical': 95,
        '中': 60, 'medium': 60, 'moderate': 60,
        '低': 30, 'low': 30, 'minor': 20,
        '优秀': 90, 'excellent': 90,
        '良好': 75, 'good': 75,
        '一般': 50, 'average': 50,
        '差': 25, 'poor': 25
      };
      
      const lowerValue = value.toLowerCase().trim();
      return descriptiveScores[lowerValue] || 0;
    }
    
    return 0;
  }
  
  /**
   * 限制评分在合理范围内
   * @param {number} score - 评分值
   * @param {string} fieldName - 字段名称
   * @returns {number} 限制后的评分
   */
  clampScore(score, min = 0, max = 100) {
    // 优化的范围限制
    return Math.max(min, Math.min(max, Number(score) || 0));
  }
  
  /**
   * 递归处理嵌套对象中的评分字段
   * @param {Object} obj - 要处理的对象
   */
  normalizeNestedScoreFields(obj) {
    if (!obj || typeof obj !== 'object') return;
    
    // 优化：简化嵌套处理
    const processItem = (item) => {
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(key => {
          const value = item[key];
          if (key.toLowerCase().includes('score') || key.toLowerCase().includes('confidence')) {
            item[key] = this.normalizeSingleScore(value, key);
          } else if (typeof value === 'object') {
            processItem(value);
          }
        });
      }
    };
    
    processItem(obj);
  }

  /**
   * 判断是否应该跳过添加 databaseType 到外层
   * @param {Object} result - 分析结果对象
   * @returns {boolean} 是否跳过
   */
  shouldSkipDatabaseType(result) {
    // 如果是性能分析或优化建议的结果，不在外层重复添加 databaseType
    // 因为这些结果会被嵌套在 analysisResults 中，已经有 databaseType 了
    const skipTypes = ['performance', 'optimizationSuggestions'];
    
    // 检查结果中是否包含这些类型的标识
    for (const type of skipTypes) {
      if (result.type === type || result.analyzerType === type) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 处理分析错误（增强版）
   * @param {string} operation - 操作名称
   * @param {Error} error - 错误对象
   * @returns {Object} 标准化的错误响应
   */
  handleOptimizedError(operation, error) {
    // 优化的错误处理
    if (this.globalContext) {
      this.globalContext.addError(this.getAnalyzerType(), error);
    }
    
    return {
      success: false,
      analyzer: this.getAnalyzerType(),
      error: `${operation}失败: ${error.message}`,
      data: {
        score: 0,
        level: 'critical',
        issues: [],
        suggestions: []
      },
      metadata: {
        duration: 0,
        llmCalls: 0,
        confidence: 0,
        databaseType: this.globalContext?.databaseType || 'unknown'
      },
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * 验证分析结果
   * @param {Object} result - 分析结果
   * @returns {boolean} 是否有效
   */
  validateResult(result) {
    // 优化的结果验证
    if (!result || typeof result !== 'object') {
      return false;
    }
    
    // 快速检查必要字段
    const hasRequiredFields = result.success !== undefined && result.analyzer !== undefined;
    if (!hasRequiredFields) {
      return false;
    }
    
    // 简化数据结构检查
    if (result.success && result.data) {
      const hasDataFields = result.data.score !== undefined &&
                           Array.isArray(result.data.issues) &&
                           Array.isArray(result.data.suggestions);
      return hasDataFields;
    }
    
    return true;
  }
}

export default BaseAnalyzer;