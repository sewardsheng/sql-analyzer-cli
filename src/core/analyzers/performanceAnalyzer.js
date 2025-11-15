/**
 * 性能分析子代理
 * 负责分析SQL查询的性能问题并提供优化建议
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { readConfig } from '../../services/config/index.js';
import { buildPrompt } from '../../utils/promptLoader.js';

/**
 * 性能分析子代理
 */
class PerformanceAnalyzer {
  constructor(config = {}) {
    this.config = config;
    this.llm = null;
    this.initialized = false;
  }

  /**
   * 初始化LLM
   */
  async initialize() {
    if (this.initialized) return;
    
    const envConfig = await readConfig();
    this.llm = new ChatOpenAI({
      modelName: this.config.model || envConfig.model,
      temperature: 0.1,
      maxTokens: 2000,
      configuration: {
        apiKey: this.config.apiKey || envConfig.apiKey,
        baseURL: this.config.baseURL || envConfig.baseURL
      }
    });
    
    this.initialized = true;
  }

  /**
   * 分析SQL性能
   * @param {Object} input - 输入参数
   * @param {string} input.sqlQuery - SQL查询语句
   * @param {string} input.databaseType - 数据库类型
   * @param {Object} input.parsedStructure - SQL解析结构
   * @returns {Promise<Object>} 性能分析结果
   */
  async analyzePerformance(input) {
    await this.initialize();
    
    const { sqlQuery, databaseType, parsedStructure } = input;
    
    // 使用提示词模板
    const { systemPrompt } = await buildPrompt(
      'performance-analyzer.md',
      {},
      {
        category: 'analyzers',
        section: '性能分析'
      }
    );

    // 构建上下文信息
    let contextInfo = "";
    if (parsedStructure) {
      contextInfo = `
已解析的SQL结构信息：
- 操作类型: ${parsedStructure.operationType}
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

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`请分析以下${databaseType || '未知'}数据库的SQL查询性能：

SQL查询:
${sqlQuery}

${contextInfo}`)
    ];

    try {
      const response = await this.llm.invoke(messages);
      let content = response.content;
      
      // 处理可能的代码块包装
      if (content.includes('```')) {
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          content = codeBlockMatch[1];
        }
      }
      
      const result = JSON.parse(content);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error("SQL性能分析失败:", error);
      return {
        success: false,
        error: `分析失败: ${error.message}`
      };
    }
  }

  /**
   * 生成执行计划分析
   * @param {Object} input - 输入参数
   * @param {string} input.sqlQuery - SQL查询语句
   * @param {string} input.databaseType - 数据库类型
   * @returns {Promise<Object>} 执行计划分析结果
   */
  async analyzeExecutionPlan(input) {
    await this.initialize();
    
    const { sqlQuery, databaseType } = input;
    
    // 使用提示词模板
    const { systemPrompt } = await buildPrompt(
      'performance-analyzer.md',
      {},
      {
        category: 'analyzers',
        section: '执行计划分析'
      }
    );

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`请分析以下${databaseType || '未知'}数据库的SQL执行计划：

SQL查询:
${sqlQuery}`)
    ];

    try {
      const response = await this.llm.invoke(messages);
      let content = response.content;
      
      // 处理可能的代码块包装
      if (content.includes('```')) {
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          content = codeBlockMatch[1];
        }
      }
      
      const result = JSON.parse(content);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error("执行计划分析失败:", error);
      return {
        success: false,
        error: `分析失败: ${error.message}`
      };
    }
  }
}

/**
 * 创建性能分析工具
 * @param {Object} config - 配置参数
 * @returns {Object} 工具对象
 */
export function createPerformanceAnalyzerTool(config = {}) {
  const agent = new PerformanceAnalyzer(config);
  
  return {
    name: "performance_analyzer",
    description: "分析SQL查询的性能问题并提供优化建议",
    parameters: {
      type: "object",
      properties: {
        sqlQuery: {
          type: "string",
          description: "要分析的SQL查询语句"
        },
        databaseType: {
          type: "string",
          description: "数据库类型(mysql, postgresql, oracle, sqlserver, sqlite等)"
        },
        parsedStructure: {
          type: "object",
          description: "SQL解析结构信息"
        }
      },
      required: ["sqlQuery", "databaseType"]
    },
    func: async (input) => {
      return await agent.analyzePerformance(input);
    }
  };
}

export default PerformanceAnalyzer;