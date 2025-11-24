/**
 * 性能分析子代理
 * 负责分析SQL查询的性能问题并提供优化建议
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { buildPrompt } from '../../utils/format/prompt-loader.js';
import BaseAnalyzer from './base-analyzer.js';

/**
 * 性能分析子代理
 */
class PerformanceAnalyzer extends BaseAnalyzer {

  /**
   * 分析SQL性能
   * @param {Object} input - 输入参数
   * @param {string} input.sqlQuery - SQL查询语句
   * @returns {Promise<Object>} 性能分析结果
   */
  async analyzePerformance(input) {
    await this.initialize();
    
    const { sqlQuery } = input;
    
    // 使用专用的性能分析提示词模板
    const { systemPrompt } = await buildPrompt(
      'performance-analysis.md',
      {},
      { category: 'analyzers' }
    );

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`请分析以下SQL查询性能，并识别数据库类型：

SQL查询:
${sqlQuery}`)
    ];

    try {
      const result = await this.invokeLLMAndParse(messages);
      
      // 使用基类的 formatResponse 方法，避免重复添加 databaseType
      return this.formatResponse(result);
    } catch (error) {
      return this.handleError('SQL性能分析', error);
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
        }
      },
      required: ["sqlQuery"]
    },
    func: async (input) => {
      return await agent.analyzePerformance(input);
    }
  };
}

export default PerformanceAnalyzer;