/**
 * 性能分析子代理
 * 负责分析SQL查询的性能问题并提供优化建议
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { readConfig } from '../../../services/config/index.js';

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
    
    const systemPrompt = `你是一个SQL性能分析专家，擅长识别SQL查询中的性能瓶颈并提供优化建议。

你的任务是分析给定的SQL查询，识别潜在的性能问题，并提供具体的优化建议。

请关注以下性能方面：
1. 查询执行计划分析
2. 索引使用情况
3. 表连接策略
4. WHERE条件效率
5. 聚合函数性能
6. 子查询和临时表
7. 数据库特定优化

请使用以下JSON格式返回结果：
{
  "performanceScore": "性能评分(0-100)",
  "complexityLevel": "复杂度(低/中/高)",
  "estimatedExecutionTime": "预估执行时间",
  "resourceUsage": "资源使用情况(低/中/高)",
  "bottlenecks": [
    {
      "type": "瓶颈类型",
      "severity": "严重程度(高/中/低)",
      "description": "瓶颈描述",
      "location": "位置(行号或代码片段)",
      "impact": "影响说明"
    }
  ],
  "optimizationSuggestions": [
    {
      "category": "优化类别",
      "description": "优化描述",
      "example": "优化示例代码",
      "expectedImprovement": "预期改善效果"
    }
  ],
  "indexRecommendations": [
    {
      "table": "表名",
      "columns": ["列名"],
      "indexType": "索引类型",
      "reason": "创建索引的原因"
    }
  ],
  "executionPlanHints": ["执行计划提示"]
}`;

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
    
    const systemPrompt = `你是一个SQL执行计划分析专家，能够解释和分析不同数据库的执行计划。

你的任务是：
1. 生成给定SQL查询的预期执行计划
2. 解释执行计划中的关键步骤
3. 识别潜在的性能问题
4. 提供执行计划优化建议

请使用以下JSON格式返回结果：
{
  "executionPlan": "执行计划描述",
  "steps": [
    {
      "step": "步骤描述",
      "cost": "成本估算",
      "rows": "影响行数",
      "accessMethod": "访问方法",
      "bottleneck": "是否为瓶颈"
    }
  ],
  "bottlenecks": ["瓶颈列表"],
  "optimizationOpportunities": ["优化机会列表"]
}`;

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