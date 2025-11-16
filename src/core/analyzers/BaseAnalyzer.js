/**
 * 分析器基类
 * 提供所有分析器的通用功能：LLM初始化、配置管理等
 */

import { ChatOpenAI } from '@langchain/openai';
import { readConfig } from '../../services/config/index.js';
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
    
    const envConfig = await readConfig();
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
    return {
      success: true,
      data: {
        ...result,
        databaseType: result.databaseType || databaseType || 'unknown'
      }
    };
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