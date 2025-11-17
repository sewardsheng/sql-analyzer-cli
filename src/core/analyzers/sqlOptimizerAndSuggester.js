/**
 * SQL优化与建议生成子代理
 * 负责生成SQL优化建议和改进方案
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { buildPrompt } from '../../utils/promptLoader.js';
import JSONCleaner from '../../utils/jsonCleaner.js';
import BaseAnalyzer from './BaseAnalyzer.js';

/**
 * SQL优化与建议生成子代理
 */
class SqlOptimizerAndSuggester extends BaseAnalyzer {

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
    
    // 使用提示词模板
    const { systemPrompt } = await buildPrompt(
      'sql-optimizer-and-suggester.md',
      {},
      {
        category: 'analyzers',
        section: '优化建议生成'
      }
    );

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
      const response = await this.getLLM().invoke(messages);
      const result = JSONCleaner.parse(response.content);
      
      const { data, ...restResult } = result;
      
      // 如果生成了优化建议,自动生成优化后的SQL
      let optimizedSqlData = null;
      if (result.queryRewrites && result.queryRewrites.length > 0) {
        // 使用第一个查询重写作为优化后的SQL
        optimizedSqlData = {
          optimizedSql: result.queryRewrites[0].rewrittenQuery,
          changes: [{
            type: "查询重写",
            description: result.queryRewrites[0].description,
            before: sqlQuery,
            after: result.queryRewrites[0].rewrittenQuery,
            benefit: result.queryRewrites[0].benefit
          }]
        };
      } else if (result.optimizationSuggestions && result.optimizationSuggestions.length > 0) {
        // 如果没有queryRewrites,尝试从优化建议中生成
        const sqlSuggestions = result.optimizationSuggestions.filter(s =>
          s.optimizedCode && s.optimizedCode.toLowerCase().includes('select')
        );
        
        if (sqlSuggestions.length > 0) {
          optimizedSqlData = {
            optimizedSql: sqlSuggestions[0].optimizedCode,
            changes: sqlSuggestions.map(s => ({
              type: s.type,
              description: s.description,
              before: s.originalCode || sqlQuery,
              after: s.optimizedCode,
              benefit: s.expectedBenefit
            }))
          };
        }
      }
      
      // 构建结果对象，包含 databaseType 在 data 中以便基类处理
      const finalResult = {
        ...data,
        optimizedSqlData,
        databaseType: databaseType // 保留传入的 databaseType
      };
      
      // 使用基类的 formatResponse 方法，避免重复添加 databaseType
      return this.formatResponse(finalResult);
    } catch (error) {
      return this.handleError('SQL优化建议生成', error);
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
    
    // 使用提示词模板
    const { systemPrompt } = await buildPrompt(
      'sql-optimizer-and-suggester.md',
      {},
      {
        category: 'analyzers',
        section: 'SQL重写'
      }
    );

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
      const response = await this.getLLM().invoke(messages);
      const result = JSONCleaner.parse(response.content);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return this.handleError('SQL重写', error);
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