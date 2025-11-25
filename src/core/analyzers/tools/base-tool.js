/**
 * BaseTool - 分析工具的抽象基类
 * 为所有Sub-Agent工具提供标准化的执行流程和接口
 */

import { buildPrompt } from '../../../utils/format/prompt-loader.js';
import StructuredParser from '../../../utils/parsing/structured-parser.js';
import * as logger from '../../../utils/logger.js';

/**
 * 分析工具基类
 * 定义了所有分析工具的通用接口和执行流程
 */
export class BaseTool {
  /**
   * 构造函数
   * @param {Object} config - 工具配置
   * @param {string} config.name - 工具名称
   * @param {string} config.promptFile - 提示词文件名
   * @param {Object} config.schema - JSON Schema定义
   * @param {string} config.category - 提示词分类，默认为'analyzers'
   * @param {Function} config.llmInvoker - LLM调用器函数
   */
  constructor(config) {
    if (!config.name || !config.promptFile || !config.schema) {
      throw new Error('BaseTool构造函数需要name、promptFile和schema参数');
    }

    this.name = config.name;
    this.promptFile = config.promptFile;
    this.schema = config.schema;
    this.category = config.category || 'analyzers';
    this.llmInvoker = config.llmInvoker;

    if (!this.llmInvoker || typeof this.llmInvoker !== 'function') {
      throw new Error(`${this.name}: 必须提供有效的llmInvoker函数`);
    }
  }

  /**
   * 执行工具分析
   * @param {Object} params - 分析参数
   * @param {string} params.sql - 待分析的SQL语句
   * @param {string} params.databaseType - 数据库类型
   * @returns {Promise<Object>} 分析结果
   */
  async execute(params) {
    const startTime = Date.now();
    
    try {
      // 参数验证
      this.validateParams(params);
      
      // 1. 加载专用提示词
      const systemPrompt = await this.loadPrompt(params);
      
      // 2. 构建消息数组
      const messages = this.buildMessages(systemPrompt, params);
      
      // 3. 调用LLM
      const llmResponse = await this.invokeLLM(messages);
      
      // 4. 解析和验证响应
      const result = await this.parseAndValidate(llmResponse);
      
      const duration = Date.now() - startTime;
      
      logger.logInfo(`[${this.name}] 执行成功`, {
        duration,
        sqlLength: params.sql?.length || 0,
        databaseType: params.databaseType
      });

      return {
        success: true,
        data: result,
        metadata: {
          tool: this.name,
          confidence: result.confidence || 0.5,
          duration,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.logError(`[${this.name}] 执行失败:`, error, {
        duration,
        sqlLength: params.sql?.length || 0,
        databaseType: params.databaseType
      });

      return {
        success: false,
        error: error.message,
        data: this.getDefaultResult(),
        metadata: {
          tool: this.name,
          duration,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * 验证输入参数
   * @param {Object} params - 输入参数
   */
  validateParams(params) {
    if (!params) {
      throw new Error('参数不能为空');
    }

    if (!params.sql || typeof params.sql !== 'string') {
      throw new Error('sql参数必须是有效的字符串');
    }

    if (!params.databaseType || typeof params.databaseType !== 'string') {
      throw new Error('databaseType参数必须是有效的字符串');
    }

    // 检查SQL长度，防止过长的查询
    if (params.sql.length > 50000) {
      throw new Error('SQL语句过长，最大支持50000字符');
    }
  }

  /**
   * 加载专用提示词
   * @param {Object} params - 参数
   * @returns {Promise<string>} 系统提示词
   */
  async loadPrompt(params) {
    try {
      const promptResult = await buildPrompt(
        this.promptFile,
        {
          DatabaseType: params.databaseType || '未知',
          dialect: params.databaseType || 'generic'
        },
        { category: this.category }
      );
      
      if (!promptResult || !promptResult.systemPrompt) {
        throw new Error(`无法加载提示词文件: ${this.promptFile}`);
      }
      
      return promptResult.systemPrompt;
    } catch (error) {
      throw new Error(`加载提示词失败: ${error.message}`);
    }
  }

  /**
   * 构建消息数组
   * @param {string} systemPrompt - 系统提示词
   * @param {Object} params - 参数
   * @returns {Array} 消息数组
   */
  buildMessages(systemPrompt, params) {
    return [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: this.buildUserPrompt(params)
      }
    ];
  }

  /**
   * 构建用户提示词
   * @param {Object} params - 参数
   * @returns {string} 用户提示词
   */
  buildUserPrompt(params) {
    return `请分析以下SQL语句：

数据库类型: ${params.databaseType}

SQL语句:
\`\`\`sql
${params.sql}
\`\`\`

请按照要求的JSON格式返回分析结果。`;
  }

  /**
   * 调用LLM
   * @param {Array} messages - 消息数组
   * @returns {Promise<Object>} LLM响应
   */
  async invokeLLM(messages) {
    try {
      const response = await this.llmInvoker(messages, {
        temperature: 0.1,
        maxTokens: 4000
      });
      
      if (!response) {
        throw new Error('LLM返回空响应');
      }
      
      return response;
    } catch (error) {
      throw new Error(`LLM调用失败: ${error.message}`);
    }
  }

  /**
   * 解析和验证响应
   * @param {Object} response - LLM响应
   * @returns {Promise<Object>} 解析后的结果
   */
  async parseAndValidate(response) {
    try {
      const parseResult = await StructuredParser.parse(response);
      const result = parseResult.success ? parseResult.data : {};
      
      // 基础字段验证
      if (typeof result.score !== 'number' || result.score < 0 || result.score > 100) {
        logger.logWarning(`[${this.name}] score字段异常，使用默认值50`);
        result.score = 50;
      }
      
      if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
        logger.logWarning(`[${this.name}] confidence字段异常，使用默认值0.5`);
        result.confidence = 0.5;
      }
      
      return result;
    } catch (error) {
      logger.logError(`[${this.name}] 解析响应失败:`, error);
      throw new Error(`响应解析失败: ${error.message}`);
    }
  }

  /**
   * 获取默认结果（错误时使用）
   * 子类应该重写此方法以提供特定维度的默认结果
   * @returns {Object} 默认结果
   */
  getDefaultResult() {
    return {
      score: 50,
      confidence: 0,
      issues: [],
      recommendations: []
    };
  }

  /**
   * 获取工具信息
   * @returns {Object} 工具信息
   */
  getToolInfo() {
    return {
      name: this.name,
      promptFile: this.promptFile,
      category: this.category,
      schema: this.schema
    };
  }
}

export default BaseTool;