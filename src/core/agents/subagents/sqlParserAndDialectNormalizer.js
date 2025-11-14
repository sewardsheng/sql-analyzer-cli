/**
 * SQL解析与方言标准化子代理
 * 负责解析不同数据库方言的SQL并转换为标准化格式
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { readConfig } from '../../../utils/config.js';

/**
 * SQL解析与方言标准化子代理
 */
class SqlParserAndDialectNormalizer {
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
   * 解析SQL并标准化方言
   * @param {Object} input - 输入参数
   * @param {string} input.sqlQuery - SQL查询语句
   * @param {string} [input.databaseType] - 数据库类型（可选，如果不提供将自动检测）
   * @param {boolean} [input.detectDialect] - 是否仅检测方言而不解析
   * @returns {Promise<Object>} 解析和标准化结果
   */
  async parseAndNormalize(input) {
    await this.initialize();
    
    const { sqlQuery, databaseType: providedDatabaseType, detectDialect = false } = input;
    
    // 如果没有提供数据库类型，则自动检测
    let databaseType = providedDatabaseType;
    let dialectInfo = null;
    
    if (!databaseType || detectDialect) {
      console.log("正在自动检测数据库方言...");
      const detectResult = await this.detectDialect(sqlQuery);
      if (detectResult.success) {
        databaseType = detectResult.data.detectedDatabaseType;
        dialectInfo = detectResult.data;
        console.log(`检测到数据库类型: ${databaseType} (置信度: ${detectResult.data.confidence})`);
      } else {
        console.warn("无法自动检测数据库类型，将使用通用分析");
        databaseType = 'generic';
      }
    }
    
    // 如果仅检测方言，直接返回检测结果
    if (detectDialect) {
      return {
        success: true,
        data: {
          detectedDatabaseType: databaseType,
          confidence: dialectInfo?.confidence || '中',
          evidence: dialectInfo?.evidence || ['通用分析'],
          alternativeTypes: dialectInfo?.alternativeTypes || []
        }
      };
    }
    
    const systemPrompt = `你是一个SQL解析和方言标准化专家，擅长处理各种数据库方言的SQL语句。

你的任务是：
1. 识别SQL语句的数据库方言类型
2. 解析SQL语句的结构
3. 将特定方言的语法转换为标准SQL格式
4. 提取关键信息（表名、字段、操作类型等）

请使用以下JSON格式返回结果：
{
  "originalDatabaseType": "原始数据库类型",
  "normalizedSql": "标准化后的SQL语句",
  "parsedStructure": {
    "operationType": "操作类型(SELECT/INSERT/UPDATE/DELETE/DDL)",
    "tables": ["涉及的表名列表"],
    "columns": ["涉及的字段列表"],
    "joins": ["连接信息"],
    "whereConditions": ["WHERE条件"],
    "groupBy": ["GROUP BY字段"],
    "orderBy": ["ORDER BY字段"],
    "aggregations": ["聚合函数"],
    "subqueries": ["子查询信息"]
  },
  "dialectFeatures": ["方言特性列表"],
  "conversionNotes": ["转换说明和注意事项"]
}`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`请解析并标准化以下${databaseType || '未知'}数据库的SQL语句：
      
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
      console.error("SQL解析和标准化失败:", error);
      return {
        success: false,
        error: `解析失败: ${error.message}`
      };
    }
  }

  /**
   * 检测SQL方言
   * @param {string} sqlQuery - SQL查询语句
   * @returns {Promise<Object>} 检测结果
   */
  async detectDialect(sqlQuery) {
    await this.initialize();
    
    const systemPrompt = `你是一个SQL方言检测专家，能够识别SQL语句所属的数据库类型。

请分析以下SQL语句，识别其最可能属于的数据库类型，并说明判断依据。

常见数据库方言特征：
- MySQL: 使用LIMIT, AUTO_INCREMENT, 反引号引用标识符
- PostgreSQL: 使用ILIKE, SERIAL, 双美元符号引用字符串
- SQL Server: 使用TOP, IDENTITY, 方括号引用标识符
- Oracle: 使用ROWNUM, SEQUENCE, 双引号引用标识符
- SQLite: 使用AUTOINCREMENT, 轻量级特性

请使用以下JSON格式返回结果：
{
  "detectedDatabaseType": "检测到的数据库类型",
  "confidence": "置信度(高/中/低)",
  "evidence": ["判断依据列表"],
  "alternativeTypes": ["其他可能的数据库类型"]
}`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`请检测以下SQL语句的数据库类型：
      
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
      console.error("SQL方言检测失败:", error);
      return {
        success: false,
        error: `检测失败: ${error.message}`
      };
    }
  }
}

/**
 * 创建SQL解析与方言标准化工具
 * @param {Object} config - 配置参数
 * @returns {Object} 工具对象
 */
export function createSqlParserAndDialectNormalizerTool(config = {}) {
  const agent = new SqlParserAndDialectNormalizer(config);
  
  return {
    name: "sql_parser_and_dialect_normalizer",
    description: "解析SQL语句并标准化不同数据库方言，支持自动检测数据库类型",
    parameters: {
      type: "object",
      properties: {
        sqlQuery: {
          type: "string",
          description: "要解析和标准化的SQL查询语句"
        },
        databaseType: {
          type: "string",
          description: "数据库类型(mysql, postgresql, oracle, sqlserver, sqlite等)，如果不提供将自动检测"
        },
        detectDialect: {
          type: "boolean",
          description: "是否仅检测数据库方言而不进行解析，默认为false"
        }
      },
      required: ["sqlQuery"]
    },
    func: async (input) => {
      return await agent.parseAndNormalize(input);
    }
  };
}

export default SqlParserAndDialectNormalizer;