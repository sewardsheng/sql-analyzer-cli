/**
 * 编码规范检查子代理
 * 负责检查SQL查询的编码规范和最佳实践
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { buildPrompt } from '../../utils/promptLoader.js';
import BaseAnalyzer from './BaseAnalyzer.js';

/**
 * 编码规范检查子代理
 */
class CodingStandardsChecker extends BaseAnalyzer {

  /**
   * 检查SQL编码规范
   * @param {Object} input - 输入参数
   * @param {string} input.sqlQuery - SQL查询语句
   * @returns {Promise<Object>} 编码规范检查结果
   */
  async checkCodingStandards(input) {
    await this.initialize();
    
    const { sqlQuery } = input;
    
    // 使用专用的编码规范检查提示词模板
    const { systemPrompt } = await buildPrompt(
      'coding-standards-check.md',
      {},
      { category: 'analyzers' }
    );

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`请检查以下SQL编码规范，并识别数据库类型：

SQL查询:
${sqlQuery}`)
    ];

    try {
      const result = await this.invokeLLMAndParse(messages);
      return this.formatResponse(result);
    } catch (error) {
      return this.handleError('SQL编码规范检查', error);
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
        }
      },
      required: ["sqlQuery"]
    },
    func: async (input) => {
      return await agent.checkCodingStandards(input);
    }
  };
}

export default CodingStandardsChecker;