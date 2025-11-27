/**
 * 性能分析工具
 * 专门分析SQL语句的性能问题
 */

import { BaseTool } from './base-tool.js';

/**
 * 性能分析工具类
 */
class PerformanceTool extends BaseTool {
  constructor(llmService) {
    super(llmService);
    this.name = 'performance';
  }

  /**
   * 执行性能分析
   * @param {Object} context - 分析上下文
   * @returns {Promise<Object>} 分析结果
   */
  async execute(context) {
    try {
      if (!this.validateContext(context)) {
        throw new Error('无效的分析上下文');
      }

      const prompt = this.buildPrompt(context);
      const llmResult = await this.llmService.call(prompt, {
        temperature: 0.3,
        maxTokens: 1000, // 进一步减少token数量
        timeout: 60000   // 更新超时时间
      });

      if (!llmResult.success) {
        throw new Error(llmResult.error);
      }

      return this.formatResult(llmResult, context);

    } catch (error) {
      return this.handleError(error, context);
    }
  }

  /**
   * 构建性能分析提示词
   * @param {Object} context - 分析上下文
   * @returns {string} 提示词
   */
  buildPrompt(context) {
    const { sql, databaseType } = context;

    return `分析${databaseType} SQL性能：
\`\`\`sql
${sql}
\`\`\`

分析要点：索引使用、全表扫描、JOIN效率、性能瓶颈、优化建议。

返回JSON：
{
  "summary": "总结",
  "issues": [{"type": "类型", "description": "描述", "severity": "high|medium|low"}],
  "recommendations": [{"action": "建议", "description": "说明"}],
  "metrics": {"complexity": "复杂度", "estimatedCost": "成本"},
  "confidence": 0.8
}`;
  }

  /**
   * 获取工具描述
   * @returns {string} 描述
   */
  getDescription() {
    return 'SQL性能分析工具，识别性能问题并提供优化建议';
  }
}

export { PerformanceTool };