/**
 * 安全审计子代理
 * 负责分析SQL查询的安全风险并提供修复建议
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { readConfig } from '../../../utils/config.js';

/**
 * 安全审计子代理
 */
class SecurityAuditor {
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
   * 审计SQL安全性
   * @param {Object} input - 输入参数
   * @param {string} input.sqlQuery - SQL查询语句
   * @param {string} input.databaseType - 数据库类型
   * @param {Object} input.parsedStructure - SQL解析结构
   * @returns {Promise<Object>} 安全审计结果
   */
  async auditSecurity(input) {
    await this.initialize();
    
    const { sqlQuery, databaseType, parsedStructure } = input;
    
    const systemPrompt = `你是一个SQL安全审计专家，擅长识别SQL查询中的安全风险和漏洞。

你的任务是分析给定的SQL查询，识别潜在的安全问题，并提供修复建议。

请关注以下安全方面：
1. SQL注入风险
2. 权限提升风险
3. 敏感数据泄露
4. 数据完整性风险
5. 认证和授权问题
6. 数据库特定安全漏洞

请使用以下JSON格式返回结果：
{
  "securityScore": "安全评分(0-100)",
  "riskLevel": "风险等级(低/中/高)",
  "vulnerabilities": [
    {
      "type": "漏洞类型",
      "severity": "严重程度(高/中/低)",
      "description": "漏洞描述",
      "location": "位置(行号或代码片段)",
      "impact": "影响说明",
      "cveReferences": ["相关CVE编号"]
    }
  ],
  "recommendations": [
    {
      "category": "修复类别",
      "description": "修复描述",
      "example": "修复示例代码",
      "priority": "优先级(高/中/低)"
    }
  ],
  "sensitiveDataAccess": [
    {
      "table": "表名",
      "columns": ["敏感列名"],
      "riskType": "风险类型",
      "mitigation": "缓解措施"
    }
  ],
  "permissionRequirements": ["所需权限列表"],
  "complianceIssues": ["合规性问题列表"]
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
      new HumanMessage(`请审计以下${databaseType || '未知'}数据库的SQL查询安全性：

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
      console.error("SQL安全审计失败:", error);
      return {
        success: false,
        error: `审计失败: ${error.message}`
      };
    }
  }

  /**
   * 检测SQL注入风险
   * @param {Object} input - 输入参数
   * @param {string} input.sqlQuery - SQL查询语句
   * @param {string} input.databaseType - 数据库类型
   * @returns {Promise<Object>} SQL注入检测结果
   */
  async detectSqlInjection(input) {
    await this.initialize();
    
    const { sqlQuery, databaseType } = input;
    
    const systemPrompt = `你是一个SQL注入检测专家，擅长识别SQL查询中的注入风险。

你的任务是：
1. 识别SQL查询中的注入点
2. 分析注入风险的类型和严重程度
3. 提供防止SQL注入的建议

请使用以下JSON格式返回结果：
{
  "injectionRisk": "注入风险等级(无/低/中/高)",
  "injectionPoints": [
    {
      "location": "注入位置",
      "type": "注入类型",
      "severity": "严重程度",
      "description": "风险描述"
    }
  ],
  "preventionMethods": ["防止方法列表"],
  "secureAlternatives": ["安全替代方案"]
}`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`请检测以下${databaseType || '未知'}数据库的SQL注入风险：

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
      console.error("SQL注入检测失败:", error);
      return {
        success: false,
        error: `检测失败: ${error.message}`
      };
    }
  }
}

/**
 * 创建安全审计工具
 * @param {Object} config - 配置参数
 * @returns {Object} 工具对象
 */
export function createSecurityAuditorTool(config = {}) {
  const agent = new SecurityAuditor(config);
  
  return {
    name: "security_auditor",
    description: "分析SQL查询的安全风险并提供修复建议",
    parameters: {
      type: "object",
      properties: {
        sqlQuery: {
          type: "string",
          description: "要审计的SQL查询语句"
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
      return await agent.auditSecurity(input);
    }
  };
}

export default SecurityAuditor;