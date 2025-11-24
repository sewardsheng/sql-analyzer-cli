/**
 * 安全审计子代理
 * 负责分析SQL查询的安全风险并提供修复建议
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { buildPrompt } from '../../utils/format/prompt-loader.js';
import BaseAnalyzer from './base-analyzer.js';

/**
 * 安全审计子代理
 */
class SecurityAuditor extends BaseAnalyzer {

  /**
   * 审计SQL安全性
   * @param {Object} input - 输入参数
   * @param {string} input.sqlQuery - SQL查询语句
   * @returns {Promise<Object>} 安全审计结果
   */
  async auditSecurity(input) {
    await this.initialize();
    
    const { sqlQuery } = input;
    
    // 使用专用的安全审计提示词模板
    const { systemPrompt } = await buildPrompt(
      'security-audit.md',
      {},
      { category: 'analyzers' }
    );

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`请审计以下SQL查询安全性，并识别数据库类型：

SQL查询:
${sqlQuery}`)
    ];

    try {
      const result = await this.invokeLLMAndParse(messages);
      return this.formatResponse(result);
    } catch (error) {
      return this.handleError('SQL安全审计', error);
    }
  }
}

/**
 * 创建安全审计工具
 * @param {Object} config - 配置参数
 * @returns {Object} 工具对象
 */
export function createSecurityAuditorTool(config = {}) {
  const agent = new SecurityAuditor(config);
  
  return {
    name: "security_auditor",
    description: "分析SQL查询的安全风险并提供修复建议",
    parameters: {
      type: "object",
      properties: {
        sqlQuery: {
          type: "string",
          description: "要审计的SQL查询语句"
        }
      },
      required: ["sqlQuery"]
    },
    func: async (input) => {
      return await agent.auditSecurity(input);
    }
  };
}

export default SecurityAuditor;