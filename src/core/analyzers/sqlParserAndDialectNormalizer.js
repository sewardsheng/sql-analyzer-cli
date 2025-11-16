/**
 * SQL解析与方言标准化子代理
 * 负责解析不同数据库方言的SQL并转换为标准化格式
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { buildPrompt } from '../../utils/promptLoader.js';
import JSONCleaner from '../../utils/jsonCleaner.js';
import BaseAnalyzer from './BaseAnalyzer.js';

/**
 * SQL解析与方言标准化子代理
 */
class SqlParserAndDialectNormalizer extends BaseAnalyzer {

  /**
   * 预处理SQL，检测可能导致解析失败的模式
   * @param {string} sqlQuery - SQL查询语句
   * @returns {Object} 预处理结果
   */
  preprocessSql(sqlQuery) {
    const warnings = [];
    let safe = true;
    
    // 检查特殊控制字符
    const controlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;
    if (controlChars.test(sqlQuery)) {
      warnings.push('包含特殊控制字符');
      safe = false;
    }
    
    // 检查连续引号
    if (/['"]{3,}/.test(sqlQuery)) {
      warnings.push('包含连续引号模式');
    }
    
    // 检查Unicode转义
    if (/\\u[0-9a-fA-F]{4}/.test(sqlQuery)) {
      warnings.push('包含Unicode转义序列');
    }
    
    // 检查嵌套注释
    if (/\/\*[\s\S]*?\/\*/.test(sqlQuery)) {
      warnings.push('包含嵌套注释');
    }
    
    // 检查异常的空白字符
    if (/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/.test(sqlQuery)) {
      warnings.push('包含非标准空白字符');
    }
    
    return { safe, warnings };
  }

  /**
   * 基于规则快速检测数据库方言
   * @param {string} sqlQuery - SQL查询语句
   * @returns {Object|null} 检测结果或null（需要使用LLM）
   */
  detectDialectByRules(sqlQuery) {
    const dialectFeatures = {
      mysql: [
        /LIMIT\s+\d+/i,
        /AUTO_INCREMENT/i,
        /`[^`]+`/,
        /UNSIGNED/i,
        /CHARSET\s*=/i,
        /ENGINE\s*=/i
      ],
      postgresql: [
        /ILIKE/i,
        /SERIAL/i,
        /\$\$/,
        /RETURNING/i,
        /::/,
        /ARRAY\[/i
      ],
      sqlserver: [
        /TOP\s+\d+/i,
        /IDENTITY/i,
        /\[[^\]]+\]/,
        /GETDATE\(\)/i,
        /LEN\(/i,
        /NVARCHAR/i
      ],
      oracle: [
        /ROWNUM/i,
        /SEQUENCE/i,
        /DUAL/i,
        /SYSDATE/i,
        /NVL\(/i,
        /VARCHAR2/i
      ]
    };
    
    const scores = {};
    for (const [dialect, patterns] of Object.entries(dialectFeatures)) {
      scores[dialect] = patterns.filter(pattern => pattern.test(sqlQuery)).length;
    }
    
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore >= 2) {
      const detected = Object.entries(scores)
        .filter(([_, score]) => score === maxScore)
        .map(([dialect, _]) => dialect);
      
      return {
        detected: detected[0],
        confidence: maxScore >= 3 ? '高' : '中',
        alternatives: detected.slice(1),
        evidence: [`匹配到${maxScore}个方言特征`]
      };
    }
    
    return null;
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
    
    // 预处理SQL，检测可能的问题
    const preprocessResult = this.preprocessSql(sqlQuery);
    if (!preprocessResult.safe) {
      console.warn(`⚠️  检测到潜在的解析问题: ${preprocessResult.warnings.join(', ')}`);
    }
    
    // 如果没有提供数据库类型，则自动检测
    let databaseType = providedDatabaseType;
    let dialectInfo = null;
    
    if (!databaseType || detectDialect) {
      console.log("正在自动检测数据库方言...");
      
      // 先尝试基于规则的快速检测
      const ruleBasedResult = this.detectDialectByRules(sqlQuery);
      if (ruleBasedResult) {
        databaseType = ruleBasedResult.detected;
        dialectInfo = ruleBasedResult;
        console.log(`🎯 规则检测到数据库类型: ${databaseType} (置信度: ${ruleBasedResult.confidence})`);
      } else {
        // 规则检测失败，使用LLM
        const detectResult = await this.detectDialect(sqlQuery);
        if (detectResult.success) {
          databaseType = detectResult.data.detectedDatabaseType;
          dialectInfo = detectResult.data;
          console.log(`🤖 LLM检测到数据库类型: ${databaseType} (置信度: ${detectResult.data.confidence})`);
        } else {
          console.warn("无法自动检测数据库类型，将使用通用分析");
          databaseType = 'generic';
        }
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
    
    // 使用提示词模板
    const { systemPrompt } = await buildPrompt(
      'sql-parser-and-dialect-normalizer.md',
      {},
      {
        category: 'analyzers',
        section: 'SQL解析'
      }
    );

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`请解析以下${databaseType || '未知'}数据库的SQL语句（保留原始形态，不要标准化）：
      
${sqlQuery}`)
    ];

    try {
      const response = await this.getLLM().invoke(messages);
      const result = JSONCleaner.parse(response.content);
      
      // 将预处理警告添加到结果中
      if (preprocessResult && preprocessResult.warnings.length > 0) {
        result.parseWarnings = [
          ...(result.parseWarnings || []),
          ...preprocessResult.warnings
        ];
      }
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error("❌ SQL解析失败:", error);
      
      // 即使解析失败，也返回基本信息
      return {
        success: false,
        data: {
          originalDatabaseType: databaseType || 'unknown',
          parseStatus: 'failed',
          originalSql: sqlQuery,  // 保留原始SQL
          error: error.message,
          parseWarnings: preprocessResult?.warnings || [],
          parsedStructure: {
            operationType: 'UNKNOWN',
            tables: [],
            columns: []
          }
        },
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
    
    // 使用提示词模板
    const { systemPrompt } = await buildPrompt(
      'sql-parser-and-dialect-normalizer.md',
      {},
      {
        category: 'analyzers',
        section: 'SQL方言检测'
      }
    );

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`请检测以下SQL语句的数据库类型：
      
${sqlQuery}`)
    ];

    try {
      const response = await this.getLLM().invoke(messages);
      const result = JSONCleaner.parse(response.content);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error("❌ SQL方言检测失败:", error);
      
      // 检测失败时返回基本信息
      return {
        success: false,
        data: {
          detectedDatabaseType: 'unknown',
          confidence: '低',
          evidence: ['LLM检测失败'],
          alternativeTypes: []
        },
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