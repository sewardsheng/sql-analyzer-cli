/**
 * 快速分析子代理
 * 负责对SQL查询进行快速基础分析，只检查最常见和最重要的问题
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { buildPrompt } from '../../utils/promptLoader.js';
import BaseAnalyzer from './BaseAnalyzer.js';
import JSONCleaner from '../../utils/jsonCleaner.js';

/**
 * 快速分析子代理
 */
class QuickAnalyzer extends BaseAnalyzer {

  /**
   * 快速分析SQL
   * @param {Object} input - 输入参数
   * @param {string} input.sqlQuery - SQL查询语句
   * @returns {Promise<Object>} 快速分析结果
   */
  async quickAnalyze(input) {
    await this.initialize();
    
    const { sqlQuery } = input;
    
    // 使用快速分析提示词模板
    const { systemPrompt } = await buildPrompt(
      'quick-analyzer.md',
      {},
      {
        category: 'analyzers',
        section: '快速分析'
      }
    );

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`请快速分析以下SQL查询：

SQL查询:
${sqlQuery}`)
    ];

    try {
      const result = await this.invokeLLMAndParse(messages);
      
      // 使用基类的 formatResponse 方法
      return this.formatResponse(result);
    } catch (error) {
      return this.handleError('SQL快速分析', error);
    }
  }
}

/**
 * 创建快速分析工具
 * @param {Object} config - 配置参数
 * @returns {Object} 工具对象
 */
export function createQuickAnalyzerTool(config = {}) {
  const agent = new QuickAnalyzer(config);
  
  return {
    name: "quick_analyzer",
    description: "快速分析SQL查询的基础问题，不进行深度分析",
    parameters: {
      type: "object",
      properties: {
        sqlQuery: {
          type: "string",
          description: "要快速分析的SQL查询语句"
        }
      },
      required: ["sqlQuery"]
    },
    func: async (input) => {
      return await agent.quickAnalyze(input);
    }
  };
}

export default QuickAnalyzer;