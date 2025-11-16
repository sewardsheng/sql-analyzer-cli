/**
 * 编码规范检查子代理
 * 负责检查SQL查询的编码规范和最佳实践
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { buildPrompt } from '../../utils/promptLoader.js';
import JSONCleaner from '../../utils/jsonCleaner.js';
import BaseAnalyzer from './BaseAnalyzer.js';

/**
 * 编码规范检查子代理
 */
class CodingStandardsChecker extends BaseAnalyzer {

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

    const contextInfo = this.buildStructureContext(parsedStructure);

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`请检查以下${databaseType || '未知'}数据库的SQL编码规范：

SQL查询:
${sqlQuery}

${contextInfo}`)
    ];

    try {
      const response = await this.getLLM().invoke(messages);
      const result = JSONCleaner.parse(response.content);
      
      return {
        success: true,
        data: {
          ...result,
          databaseType: result.databaseType || databaseType || 'unknown'
        }
      };
    } catch (error) {
      return this.handleError('SQL编码规范检查', error);
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
      const response = await this.getLLM().invoke(messages);
      const result = JSONCleaner.parse(response.content);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return this.handleError('SQL代码格式化', error);
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