/**
 * 分析器基类
 * 提供所有分析器的通用功能：LLM初始化、配置管理等
 */

import { ChatOpenAI } from '@langchain/openai';
import { getConfigManager } from '../../services/config/index.js';
import JSONCleaner from '../../utils/jsonCleaner.js';

/**
 * 分析器基类
 */
class BaseAnalyzer {
  constructor(config = {}) {
    this.config = config;
    this.llm = null;
    this.initialized = false;
  }

  /**
   * 初始化LLM
   * 所有子类共享此方法，无需重复实现
   */
  async initialize() {
    if (this.initialized) return;
    
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
   * 构建SQL结构上下文信息
   * @param {Object} parsedStructure - SQL解析结构
   * @returns {string} 格式化的上下文信息
   */
  buildStructureContext(parsedStructure) {
    if (!parsedStructure) return "";
    
    return `
已解析的SQL结构信息：
- 操作类型: ${parsedStructure.operationType || '未知'}
- 涉及表: ${parsedStructure.tables?.join(', ') || '未知'}
- 涉及字段: ${parsedStructure.columns?.join(', ') || '未知'}
- 连接信息: ${parsedStructure.joins?.join(', ') || '无'}
- WHERE条件: ${parsedStructure.whereConditions?.join(', ') || '无'}
- 分组字段: ${parsedStructure.groupBy?.join(', ') || '无'}
- 排序字段: ${parsedStructure.orderBy?.join(', ') || '无'}
- 聚合函数: ${parsedStructure.aggregations?.join(', ') || '无'}
- 子查询: ${parsedStructure.subqueries?.join(', ') || '无'}
`;
  }

  /**
   * 调用LLM并解析JSON响应
   * 提供统一的LLM调用和JSON解析逻辑，避免子类重复实现
   * @param {Array} messages - LLM消息数组
   * @returns {Promise<Object>} 解析后的JSON对象
   */
  async invokeLLMAndParse(messages) {
    const response = await this.getLLM().invoke(messages);
    return JSONCleaner.parse(response.content);
  }

  /**
   * 格式化分析响应
   * 提供统一的响应格式化逻辑
   * @param {Object} result - LLM返回的分析结果
   * @param {string} databaseType - 数据库类型（可选）
   * @returns {Object} 标准化的响应对象
   */
  formatResponse(result, databaseType = null) {
    // 标准化分数字段为数字类型
    const normalizedResult = this.normalizeScoreFields(result);
    
    const response = {
      success: true,
      data: {
        ...normalizedResult
      }
    };
    
    // 只有在结果中明确包含 databaseType 时才添加到外层（仅限性能分析器）
    // 避免在 performanceAnalysis 和 optimizationSuggestions 的外层重复添加
    if (normalizedResult.databaseType && !this.shouldSkipDatabaseType(normalizedResult)) {
      response.databaseType = normalizedResult.databaseType;
    }
    
    return response;
  }

  /**
   * 标准化分数字段为数字类型
   * @param {Object} result - 分析结果对象
   * @returns {Object} 标准化后的结果对象
   */
  normalizeScoreFields(result) {
    const normalized = { ...result };
    
    // 定义需要标准化的分数字段
    const scoreFields = [
      'securityScore',
      'performanceScore',
      'standardsScore',
      'overallScore'
    ];
    
    scoreFields.forEach(field => {
      if (normalized[field] !== undefined) {
        // 如果是字符串，尝试转换为数字
        if (typeof normalized[field] === 'string') {
          const numValue = parseFloat(normalized[field]);
          if (!isNaN(numValue)) {
            normalized[field] = numValue;
          }
        }
        // 如果已经是数字，确保是有效的
        else if (typeof normalized[field] === 'number') {
          if (isNaN(normalized[field])) {
            normalized[field] = 0;
          }
        }
        // 其他类型（如null、undefined）保持原样或设为默认值
        else {
          normalized[field] = 0;
        }
      }
    });
    
    return normalized;
  }

  /**
   * 判断是否应该跳过添加 databaseType 到外层
   * @param {Object} result - 分析结果对象
   * @returns {boolean} 是否跳过
   */
  shouldSkipDatabaseType(result) {
    // 如果是性能分析或优化建议的结果，不在外层重复添加 databaseType
    // 因为这些结果会被嵌套在 analysisResults 中，已经有 databaseType 了
    const skipTypes = ['performanceAnalysis', 'optimizationSuggestions'];
    
    // 检查结果中是否包含这些类型的标识
    for (const type of skipTypes) {
      if (result.type === type || result.analyzerType === type) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 处理分析错误
   * @param {string} operation - 操作名称
   * @param {Error} error - 错误对象
   * @returns {Object} 标准化的错误响应
   */
  handleError(operation, error) {
    console.error(`${operation}失败:`, error);
    return {
      success: false,
      error: `${operation}失败: ${error.message}`
    };
  }
}

export default BaseAnalyzer;