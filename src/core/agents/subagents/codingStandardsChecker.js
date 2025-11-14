/**
 * 编码规范检查子代理
 * 负责检查SQL查询的编码规范和最佳实践
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { readConfig } from '../../../utils/config.js';

/**
 * 编码规范检查子代理
 */
class CodingStandardsChecker {
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
   * 检查SQL编码规范
   * @param {Object} input - 输入参数
   * @param {string} input.sqlQuery - SQL查询语句
   * @param {string} input.databaseType - 数据库类型
   * @param {Object} input.parsedStructure - SQL解析结构
   * @returns {Promise<Object>} 编码规范检查结果
   */
  async checkCodingStandards(input) {
    await this.initialize();
    
    const { sqlQuery, databaseType, parsedStructure } = input;
    
    const systemPrompt = `你是一个SQL编码规范检查专家，擅长评估SQL查询的代码质量和最佳实践。

你的任务是检查给定的SQL查询，评估其是否符合编码规范和最佳实践。

请关注以下编码规范方面：
1. 命名规范
2. 代码格式和缩进
3. 注释和文档
4. 可读性和维护性
5. 性能最佳实践
6. 安全最佳实践
7. 数据库特定规范

请使用以下JSON格式返回结果：
{
  "standardsScore": "规范评分(0-100)",
  "complianceLevel": "合规等级(高/中/低)",
  "violations": [
    {
      "type": "违规类型",
      "severity": "严重程度(高/中/低)",
      "description": "违规描述",
      "location": "位置(行号或代码片段)",
      "rule": "违反的规则",
      "suggestion": "修改建议"
    }
  ],
  "recommendations": [
    {
      "category": "建议类别",
      "description": "建议描述",
      "example": "示例代码",
      "benefit": "改进后的好处"
    }
  ],
  "formattingIssues": [
    {
      "type": "格式问题类型",
      "description": "问题描述",
      "fix": "修复方法"
    }
  ],
  "namingConventions": [
    {
      "type": "命名类型",
      "current": "当前命名",
      "suggested": "建议命名",
      "reason": "原因"
    }
  ]
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
      new HumanMessage(`请检查以下${databaseType || '未知'}数据库的SQL编码规范：

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
      console.error("SQL编码规范检查失败:", error);
      return {
        success: false,
        error: `检查失败: ${error.message}`
      };
    }
  }

  /**
   * 格式化SQL代码
   * @param {Object} input - 输入参数
   * @param {string} input.sqlQuery - SQL查询语句
   * @param {string} input.databaseType - 数据库类型
   * @returns {Promise<Object>} 格式化结果
   */
  async formatSql(input) {
    await this.initialize();
    
    const { sqlQuery, databaseType } = input;
    
    const systemPrompt = `你是一个SQL代码格式化专家，能够按照最佳实践格式化SQL代码。

你的任务是：
1. 格式化给定的SQL查询
2. 确保代码可读性和一致性
3. 遵循数据库特定的格式化规范

请使用以下JSON格式返回结果：
{
  "formattedSql": "格式化后的SQL代码",
  "formattingChanges": [
    {
      "type": "格式化类型",
      "description": "格式化描述",
      "before": "格式化前",
      "after": "格式化后"
    }
  ],
  "styleGuide": "遵循的格式化指南"
}`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`请格式化以下${databaseType || '未知'}数据库的SQL代码：

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
      console.error("SQL代码格式化失败:", error);
      return {
        success: false,
        error: `格式化失败: ${error.message}`
      };
    }
  }
}

/**
 * 创建编码规范检查工具
 * @param {Object} config - 配置参数
 * @returns {Object} 工具对象
 */
export function createCodingStandardsCheckerTool(config = {}) {
  const agent = new CodingStandardsChecker(config);
  
  return {
    name: "coding_standards_checker",
    description: "检查SQL查询的编码规范和最佳实践",
    parameters: {
      type: "object",
      properties: {
        sqlQuery: {
          type: "string",
          description: "要检查的SQL查询语句"
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
      return await agent.checkCodingStandards(input);
    }
  };
}

export default CodingStandardsChecker;