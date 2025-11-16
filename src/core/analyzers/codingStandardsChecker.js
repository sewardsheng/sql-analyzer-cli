/**
 * 编码规范检查子代理
 * 负责检查SQL查询的编码规范和最佳实践
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { readConfig } from '../../services/config/index.js';
import { buildPrompt } from '../../utils/promptLoader.js';

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
      maxTokens: 99999,
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
    
    // 使用提示词模板
    const { systemPrompt } = await buildPrompt(
      'coding-standards-checker.md',
      {},
      {
        category: 'analyzers',
        section: '编码规范检查'
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
      
      // 清理内容：移除可能的BOM和额外空白
      content = content.trim();
      
      // 尝试解析JSON
      let result;
      try {
        result = JSON.parse(content);
      } catch (parseError) {
        // 如果直接解析失败，尝试修复常见的JSON格式问题
        console.warn("首次JSON解析失败，尝试修复格式...");
        
        // 尝试修复：移除注释、修复换行等
        let fixedContent = content
          .replace(/\/\*[\s\S]*?\*\//g, '') // 移除多行注释
          .replace(/\/\/.*/g, '') // 移除单行注释
          .replace(/,(\s*[}\]])/g, '$1') // 移除尾随逗号
          .trim();
        
        try {
          result = JSON.parse(fixedContent);
        } catch (secondError) {
          // 如果还是失败，返回一个默认结构
          console.error("JSON解析失败，使用默认结构:", secondError.message);
          console.error("原始内容:", content.substring(0, 500));
          
          return {
            success: true,
            data: {
              standardsScore: 0,
              complianceLevel: "未知",
              violations: [{
                type: "解析错误",
                severity: "高",
                description: "LLM返回的内容格式异常，无法解析",
                location: "整个查询",
                rule: "N/A",
                suggestion: "请检查LLM配置或重试"
              }],
              recommendations: [],
              formattingIssues: [],
              namingConventions: []
            }
          };
        }
      }
      
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
    
    // 使用提示词模板
    const { systemPrompt } = await buildPrompt(
      'coding-standards-checker.md',
      {},
      {
        category: 'analyzers',
        section: 'SQL代码格式化'
      }
    );

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
      
      // 清理内容：移除可能的BOM和额外空白
      content = content.trim();
      
      // 尝试解析JSON
      let result;
      try {
        result = JSON.parse(content);
      } catch (parseError) {
        // 如果直接解析失败，尝试修复常见的JSON格式问题
        console.warn("首次JSON解析失败，尝试修复格式...");
        
        // 尝试修复：移除注释、修复换行等
        let fixedContent = content
          .replace(/\/\*[\s\S]*?\*\//g, '') // 移除多行注释
          .replace(/\/\/.*/g, '') // 移除单行注释
          .replace(/,(\s*[}\]])/g, '$1') // 移除尾随逗号
          .trim();
        
        try {
          result = JSON.parse(fixedContent);
        } catch (secondError) {
          // 如果还是失败，返回一个默认结构
          console.error("JSON解析失败，使用默认结构:", secondError.message);
          console.error("原始内容:", content.substring(0, 500));
          
          return {
            success: true,
            data: {
              formattedSql: sqlQuery,
              formattingChanges: [],
              styleGuide: "无法生成格式化建议"
            }
          };
        }
      }
      
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