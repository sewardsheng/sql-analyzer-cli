/**
 * 安全分析工具
 * 专门分析SQL语句的安全问题
 */

import { BaseTool } from './base-tool.js';

/**
 * 安全分析工具类
 */
class SecurityTool extends BaseTool {
  constructor(llmService) {
    super(llmService);
    this.name = 'security';
  }

  /**
   * 执行安全分析
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
        temperature: 0.2,
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
   * 构建安全分析提示词
   * @param {Object} context - 分析上下文
   * @returns {string} 提示词
   */
  buildPrompt(context) {
    const { sql, databaseType } = context;

    return `分析${databaseType} SQL安全：
\`\`\`sql
${sql}
\`\`\`

分析要点：SQL注入、权限控制、数据泄露、加密需求、合规性。

返回JSON：
{
  "summary": "总结",
  "vulnerabilities": [{"type": "类型", "description": "描述", "severity": "critical|high|medium|low"}],
  "recommendations": [{"action": "建议", "description": "说明", "priority": "high|medium|low"}],
  "riskLevel": "风险等级",
  "securityScore": 0.8,
  "compliance": ["合规标准"]
}`;
  }

  /**
   * 获取工具描述
   * @returns {string} 描述
   */
  getDescription() {
    return 'SQL安全分析工具，识别安全漏洞和风险';
  }
}

export { SecurityTool };