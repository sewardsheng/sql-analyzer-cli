/**
 * 性能分析子代理
 * 负责分析SQL查询的性能问题并提供优化建议
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { buildPrompt } from '../../utils/promptLoader.js';
import JSONCleaner from '../../utils/jsonCleaner.js';
import BaseAnalyzer from './BaseAnalyzer.js';

/**
 * 性能分析子代理
 */
class PerformanceAnalyzer extends BaseAnalyzer {

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

    // 使用基类方法构建上下文信息
    const contextInfo = this.buildStructureContext(parsedStructure);

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`请分析以下${databaseType || '未知'}数据库的SQL查询性能：

SQL查询:
${sqlQuery}

${contextInfo}`)
    ];

    try {
      const response = await this.getLLM().invoke(messages);
      const result = JSONCleaner.parse(response.content);
      
      return {
        success: true,
        data: result,
        databaseType: result.databaseType || 'unknown' // 提取数据库类型
      };
    } catch (error) {
      return this.handleError('SQL性能分析', error);
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
      const response = await this.getLLM().invoke(messages);
      const result = JSONCleaner.parse(response.content);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return this.handleError('执行计划分析', error);
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