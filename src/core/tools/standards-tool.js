/**
 * 规范检查工具
 * 专门检查SQL语句的编码规范和最佳实践
 */

import { BaseTool } from './base-tool.js';
import { buildPrompt } from '../../utils/format/prompt-loader.js';

/**
 * 规范检查工具类
 */
class StandardsTool extends BaseTool {
  constructor(llmService) {
    super(llmService);
    this.name = 'standards';
  }

  /**
   * 执行规范检查
   * @param {Object} context - 分析上下文
   * @returns {Promise<Object>} 分析结果
   */
  async execute(context) {
    try {
      if (!this.validateContext(context)) {
        throw new Error('无效的分析上下文');
      }

      const prompt = await this.buildPrompt(context);
      const llmResult = await this.llmService.call(prompt, {
        temperature: 0.1,
        maxTokens: 2000, // 增加token数量以支持更详细的分析
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
   * 构建规范检查提示词
   * @param {Object} context - 分析上下文
   * @returns {Promise<string>} 提示词
   */
  async buildPrompt(context) {
    const { sql, databaseType } = context;
    
    try {
      const { systemPrompt, userPrompt } = await buildPrompt('coding-standards-check.md', {
        databaseType,
        sql
      }, { category: 'analyzers' });
      
      return `${systemPrompt}\n\n${userPrompt}\n\nSQL语句：\n\`\`\`sql\n${sql}\n\`\`\``;
    } catch (error) {
      // 如果加载提示词失败，回退到硬编码提示词
      console.warn('加载编码规范检查提示词失败，使用回退提示词:', error.message);
      return `检查${databaseType} SQL规范：
\`\`\`sql
${sql}
\`\`\`

检查要点：命名规范、代码风格、最佳实践、可维护性。

返回JSON：
{
  "summary": "总结",
  "violations": [{"type": "类型", "description": "描述", "severity": "error|warning|info", "suggestion": "建议"}],
  "recommendations": [{"category": "类别", "action": "建议", "description": "说明"}],
  "complianceScore": 0.8,
  "standards": ["标准列表"],
  "metrics": {"readability": "可读性", "maintainability": "可维护性"}
}`;
    }
  }

  /**
   * 获取工具描述
   * @returns {string} 描述
   */
  getDescription() {
    return 'SQL规范检查工具，检查编码规范和最佳实践';
  }
}

export { StandardsTool };