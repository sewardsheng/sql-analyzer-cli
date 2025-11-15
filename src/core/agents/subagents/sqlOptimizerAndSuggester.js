/**
 * SQL优化与建议生成子代理
 * 负责生成SQL优化建议和改进方案
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { readConfig } from '../../../services/config/index.js';

/**
 * SQL优化与建议生成子代理
 */
class SqlOptimizerAndSuggester {
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
   * 生成SQL优化建议
   * @param {Object} input - 输入参数
   * @param {string} input.sqlQuery - SQL查询语句
   * @param {string} input.databaseType - 数据库类型
   * @param {Object} input.parsedStructure - SQL解析结构
   * @param {Object} input.performanceAnalysis - 性能分析结果
   * @param {Object} input.securityAudit - 安全审计结果
   * @param {Object} input.standardsCheck - 编码规范检查结果
   * @returns {Promise<Object>} 优化建议结果
   */
  async generateOptimizationSuggestions(input) {
    await this.initialize();
    
    const { 
      sqlQuery, 
      databaseType, 
      parsedStructure,
      performanceAnalysis,
      securityAudit,
      standardsCheck
    } = input;
    
    const systemPrompt = `你是一个SQL优化专家，能够基于多维度分析结果生成全面的SQL优化建议。

你的任务是综合性能分析、安全审计和编码规范检查的结果，生成全面的SQL优化建议。

请关注以下优化方面：
1. 查询重写和重构
2. 索引优化
3. 表结构优化
4. 执行计划优化
5. 数据库特定优化
6. 安全性改进
7. 可读性和维护性改进

请使用以下JSON格式返回结果：
{
  "overallScore": "整体评分(0-100)",
  "optimizationLevel": "优化等级(低/中/高)",
  "optimizationPotential": "优化潜力(低/中/高)",
  "priorityIssues": [
    {
      "category": "问题类别",
      "description": "问题描述",
      "severity": "严重程度(高/中/低)",
      "impact": "影响说明",
      "effort": "修复工作量(低/中/高)"
    }
  ],
  "optimizationSuggestions": [
    {
      "type": "优化类型",
      "description": "优化描述",
      "originalCode": "原始代码片段",
      "optimizedCode": "优化后代码",
      "expectedBenefit": "预期收益",
      "implementationComplexity": "实现复杂度(低/中/高)"
    }
  ],
  "indexOptimizations": [
    {
      "table": "表名",
      "indexType": "索引类型",
      "columns": ["列名"],
      "reason": "创建原因",
      "expectedImprovement": "预期改善"
    }
  ],
  "queryRewrites": [
    {
      "description": "重写描述",
      "originalQuery": "原始查询",
      "rewrittenQuery": "重写后查询",
      "benefit": "改进效果"
    }
  ],
  "implementationPlan": [
    {
      "step": "实施步骤",
      "description": "步骤描述",
      "dependencies": ["依赖项"]
    }
  ]
}`;

    // 构建上下文信息
    let contextInfo = "";
    
    if (parsedStructure) {
      contextInfo += `
SQL解析结构信息：
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
    
    if (performanceAnalysis && performanceAnalysis.data) {
      contextInfo += `
性能分析结果：
- 性能评分: ${performanceAnalysis.data.performanceScore || '未知'}
- 复杂度: ${performanceAnalysis.data.complexityLevel || '未知'}
- 预估执行时间: ${performanceAnalysis.data.estimatedExecutionTime || '未知'}
- 瓶颈数量: ${performanceAnalysis.data.bottlenecks?.length || 0}
- 优化建议数量: ${performanceAnalysis.data.optimizationSuggestions?.length || 0}
`;
    }
    
    if (securityAudit && securityAudit.data) {
      contextInfo += `
安全审计结果：
- 安全评分: ${securityAudit.data.securityScore || '未知'}
- 风险等级: ${securityAudit.data.riskLevel || '未知'}
- 漏洞数量: ${securityAudit.data.vulnerabilities?.length || 0}
- 修复建议数量: ${securityAudit.data.recommendations?.length || 0}
`;
    }
    
    if (standardsCheck && standardsCheck.data) {
      contextInfo += `
编码规范检查结果：
- 规范评分: ${standardsCheck.data.standardsScore || '未知'}
- 合规等级: ${standardsCheck.data.complianceLevel || '未知'}
- 违规数量: ${standardsCheck.data.violations?.length || 0}
- 建议数量: ${standardsCheck.data.recommendations?.length || 0}
`;
    }

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`请为以下${databaseType || '未知'}数据库的SQL查询生成优化建议：

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
      console.error("SQL优化建议生成失败:", error);
      return {
        success: false,
        error: `生成失败: ${error.message}`
      };
    }
  }

  /**
   * 生成优化后的SQL
   * @param {Object} input - 输入参数
   * @param {string} input.sqlQuery - SQL查询语句
   * @param {string} input.databaseType - 数据库类型
   * @param {Object} input.optimizationSuggestions - 优化建议
   * @returns {Promise<Object>} 优化后的SQL
   */
  async generateOptimizedSql(input) {
    await this.initialize();
    
    const { sqlQuery, databaseType, optimizationSuggestions } = input;
    
    const systemPrompt = `你是一个SQL重写专家，能够根据优化建议生成优化后的SQL代码。

你的任务是：
1. 根据优化建议重写SQL查询
2. 确保功能等价性
3. 提高性能和安全性
4. 改善可读性和维护性

请使用以下JSON格式返回结果：
{
  "optimizedSql": "优化后的SQL代码",
  "changes": [
    {
      "type": "变更类型",
      "description": "变更描述",
      "before": "变更前",
      "after": "变更后",
      "benefit": "改进效果"
    }
  ],
  "performanceImprovement": "性能改善估算",
  "securityImprovement": "安全性改善估算",
  "readabilityImprovement": "可读性改善估算"
}`;

    let suggestionsInfo = "";
    if (optimizationSuggestions && optimizationSuggestions.data) {
      suggestionsInfo = `
优化建议：
- 整体评分: ${optimizationSuggestions.data.overallScore || '未知'}
- 优化等级: ${optimizationSuggestions.data.optimizationLevel || '未知'}
- 优先问题数量: ${optimizationSuggestions.data.priorityIssues?.length || 0}
- 优化建议数量: ${optimizationSuggestions.data.optimizationSuggestions?.length || 0}
- 索引优化数量: ${optimizationSuggestions.data.indexOptimizations?.length || 0}
- 查询重写数量: ${optimizationSuggestions.data.queryRewrites?.length || 0}
`;
    }

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`请根据以下优化建议重写${databaseType || '未知'}数据库的SQL查询：

原始SQL查询:
${sqlQuery}

${suggestionsInfo}`)
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
      console.error("SQL重写失败:", error);
      return {
        success: false,
        error: `重写失败: ${error.message}`
      };
    }
  }
}

/**
 * 创建SQL优化与建议生成工具
 * @param {Object} config - 配置参数
 * @returns {Object} 工具对象
 */
export function createSqlOptimizerAndSuggesterTool(config = {}) {
  const agent = new SqlOptimizerAndSuggester(config);
  
  return {
    name: "sql_optimizer_and_suggester",
    description: "生成SQL优化建议和改进方案",
    parameters: {
      type: "object",
      properties: {
        sqlQuery: {
          type: "string",
          description: "要优化的SQL查询语句"
        },
        databaseType: {
          type: "string",
          description: "数据库类型(mysql, postgresql, oracle, sqlserver, sqlite等)"
        },
        parsedStructure: {
          type: "object",
          description: "SQL解析结构信息"
        },
        performanceAnalysis: {
          type: "object",
          description: "性能分析结果"
        },
        securityAudit: {
          type: "object",
          description: "安全审计结果"
        },
        standardsCheck: {
          type: "object",
          description: "编码规范检查结果"
        }
      },
      required: ["sqlQuery", "databaseType"]
    },
    func: async (input) => {
      return await agent.generateOptimizationSuggestions(input);
    }
  };
}

export default SqlOptimizerAndSuggester;