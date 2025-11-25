/**
 * SecurityTool - SQL安全审计工具
 * 专门用于分析SQL语句的安全漏洞、威胁评估和合规性检查
 */

import { BaseTool } from './base-tool.js';

/**
 * 安全审计工具类
 * 继承自BaseTool，专注于SQL安全分析
 */
export class SecurityTool extends BaseTool {
  /**
   * 构造函数
   * @param {Function} llmInvoker - LLM调用器函数
   */
  constructor(llmInvoker) {
    super({
      name: 'analyze_security',
      promptFile: 'security-audit.md',
      category: 'analyzers',
      llmInvoker: llmInvoker,
      schema: {
        type: 'object',
        required: ['score', 'confidence', 'threatLevel', 'attackSurface', 'vulnerabilities', 'recommendations', 'securityMetrics', 'complianceAssessment', 'bestPractices'],
        properties: {
          score: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: '安全评分 (0-100)'
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: '分析置信度 (0.0-1.0)'
          },
          threatLevel: {
            type: 'string',
            enum: ['严重', '高', '中', '低'],
            description: '威胁等级'
          },
          attackSurface: {
            type: 'object',
            properties: {
              totalVectors: {
                type: 'number',
                description: '总攻击向量数'
              },
              highRiskVectors: {
                type: 'number',
                description: '高风险攻击向量数'
              },
              exploitableVectors: {
                type: 'number',
                description: '可利用攻击向量数'
              }
            }
          },
          vulnerabilities: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'type', 'severity', 'description'],
              properties: {
                id: { type: 'string' },
                type: {
                  type: 'string',
                  enum: ['SQL注入', '权限提升', '数据泄露', '身份验证绕过', '配置问题']
                },
                subtype: { type: 'string' },
                severity: {
                  type: 'string',
                  enum: ['Critical', 'High', 'Medium', 'Low']
                },
                confidence: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1
                },
                cwe_id: { type: 'string' },
                cvss_score: {
                  type: 'number',
                  minimum: 0,
                  maximum: 10
                },
                mitre_tactic: { type: 'string' },
                mitre_technique: { type: 'string' },
                description: { type: 'string' },
                location: { type: 'string' },
                attackVector: { type: 'string' },
                exploitationScenario: { type: 'string' },
                impact: {
                  type: 'object',
                  properties: {
                    confidentiality: {
                      type: 'string',
                      enum: ['None', 'Low', 'High', 'Complete']
                    },
                    integrity: {
                      type: 'string',
                      enum: ['None', 'Low', 'High', 'Complete']
                    },
                    availability: {
                      type: 'string',
                      enum: ['None', 'Low', 'High', 'Complete']
                    },
                    compliance: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  }
                },
                evidence: { type: 'string' },
                conditions: { type: 'string' }
              }
            }
          },
          recommendations: {
            type: 'array',
            items: {
              type: 'object',
              required: ['vulnerabilityId', 'priority', 'action', 'description'],
              properties: {
                vulnerabilityId: { type: 'string' },
                priority: {
                  type: 'string',
                  enum: ['Critical', 'High', 'Medium', 'Low']
                },
                category: {
                  type: 'string',
                  enum: ['ImmediateFix', 'ShortTerm', 'LongTerm', 'Configuration']
                },
                action: { type: 'string' },
                description: { type: 'string' },
                implementation: {
                  type: 'object',
                  properties: {
                    codeExample: { type: 'string' },
                    configuration: { type: 'string' },
                    prerequisites: { type: 'string' }
                  }
                },
                validation: {
                  type: 'object',
                  properties: {
                    testMethod: { type: 'string' },
                    expectedResult: { type: 'string' }
                  }
                },
                alternatives: {
                  type: 'array',
                  items: { type: 'string' }
                },
                tradeoffs: { type: 'string' }
              }
            }
          },
          securityMetrics: {
            type: 'object',
            properties: {
              totalVulnerabilities: { type: 'number' },
              criticalVulnerabilities: { type: 'number' },
              highRiskVulnerabilities: { type: 'number' },
              exploitableVulnerabilities: { type: 'number' },
              complianceViolations: { type: 'number' },
              securityPosture: {
                type: 'string',
                enum: ['Excellent', 'Good', 'Fair', 'Poor', 'Critical']
              }
            }
          },
          complianceAssessment: {
            type: 'object',
            properties: {
              gdpr: {
                type: 'array',
                items: { type: 'string' }
              },
              hipaa: {
                type: 'array',
                items: { type: 'string' }
              },
              pciDss: {
                type: 'array',
                items: { type: 'string' }
              },
              sox: {
                type: 'array',
                items: { type: 'string' }
              }
            }
          },
          bestPractices: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  enum: ['InputValidation', 'Authentication', 'Authorization', 'Encryption', 'Logging']
                },
                practice: { type: 'string' },
                implementation: { type: 'string' },
                relevance: { type: 'string' }
              }
            }
          }
        }
      }
    });
  }

  /**
   * 获取安全审计专用的默认结果
   * @returns {Object} 默认安全审计结果
   */
  getDefaultResult() {
    return {
      score: 50,
      confidence: 0,
      threatLevel: '中',
      attackSurface: {
        totalVectors: 0,
        highRiskVectors: 0,
        exploitableVectors: 0
      },
      vulnerabilities: [],
      recommendations: [],
      securityMetrics: {
        totalVulnerabilities: 0,
        criticalVulnerabilities: 0,
        highRiskVulnerabilities: 0,
        exploitableVulnerabilities: 0,
        complianceViolations: 0,
        securityPosture: 'Fair'
      },
      complianceAssessment: {
        gdpr: [],
        hipaa: [],
        pciDss: [],
        sox: []
      },
      bestPractices: []
    };
  }

  /**
   * 构建安全审计专用的用户提示词
   * @param {Object} params - 参数
   * @returns {string} 用户提示词
   */
  buildUserPrompt(params) {
    return `请对以下SQL语句进行深度安全审计：

数据库类型: ${params.databaseType}

SQL语句:
\`\`\`sql
${params.sql}
\`\`\`

请重点关注：
1. SQL注入漏洞（UNION注入、盲注、错误注入等）
2. 权限提升和访问控制问题
3. 敏感数据泄露风险
4. 身份验证绕过可能性
5. 配置安全问题
6. 合规性违规（GDPR、HIPAA、PCI-DSS等）

请按照security-audit.md要求的JSON格式返回详细的安全评估结果。`;
  }

  /**
   * 验证安全审计结果的完整性
   * @param {Object} result - 分析结果
   * @returns {Object} 验证后的结果
   */
  async parseAndValidate(response) {
    const result = await super.parseAndValidate(response);

    // 安全审计特定的验证逻辑
    if (result.threatLevel) {
      const validThreatLevels = ['严重', '高', '中', '低'];
      if (!validThreatLevels.includes(result.threatLevel)) {
        result.threatLevel = '中';
      }
    }

    if (result.attackSurface) {
      // 确保attackSurface的数值字段有效
      ['totalVectors', 'highRiskVectors', 'exploitableVectors'].forEach(key => {
        if (typeof result.attackSurface[key] !== 'number') {
          result.attackSurface[key] = 0;
        }
      });
    }

    if (result.securityMetrics) {
      // 确保securityMetrics的数值字段有效
      ['totalVulnerabilities', 'criticalVulnerabilities', 'highRiskVulnerabilities', 'exploitableVulnerabilities', 'complianceViolations'].forEach(key => {
        if (typeof result.securityMetrics[key] !== 'number') {
          result.securityMetrics[key] = 0;
        }
      });
      
      // 验证安全态势枚举值
      const validPostures = ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'];
      if (!validPostures.includes(result.securityMetrics.securityPosture)) {
        result.securityMetrics.securityPosture = 'Fair';
      }
    }

    // 验证vulnerabilities数组
    if (Array.isArray(result.vulnerabilities)) {
      const validSeverities = ['Critical', 'High', 'Medium', 'Low'];
      const validTypes = ['SQL注入', '权限提升', '数据泄露', '身份验证绕过', '配置问题'];
      const validImpacts = ['None', 'Low', 'High', 'Complete'];
      
      result.vulnerabilities = result.vulnerabilities.filter(vuln => {
        return vuln.type && 
               validTypes.includes(vuln.type) &&
               vuln.severity && 
               validSeverities.includes(vuln.severity) &&
               vuln.description &&
               vuln.id;
      });

      // 验证impact对象
      result.vulnerabilities.forEach(vuln => {
        if (vuln.impact) {
          ['confidentiality', 'integrity', 'availability'].forEach(key => {
            if (!validImpacts.includes(vuln.impact[key])) {
              vuln.impact[key] = 'None';
            }
          });
        }
      });
    }

    // 验证recommendations数组
    if (Array.isArray(result.recommendations)) {
      const validPriorities = ['Critical', 'High', 'Medium', 'Low'];
      const validCategories = ['ImmediateFix', 'ShortTerm', 'LongTerm', 'Configuration'];
      
      result.recommendations = result.recommendations.filter(rec => {
        return rec.vulnerabilityId && 
               rec.priority && 
               validPriorities.includes(rec.priority) &&
               rec.action && 
               rec.description;
      });

      // 验证category字段
      result.recommendations.forEach(rec => {
        if (rec.category && !validCategories.includes(rec.category)) {
          rec.category = 'ShortTerm';
        }
      });
    }

    return result;
  }

  /**
   * 获取安全审计工具的特定信息
   * @returns {Object} 工具信息
   */
  getToolInfo() {
    return {
      ...super.getToolInfo(),
      description: 'SQL安全审计工具，识别安全漏洞和合规性风险',
      capabilities: [
        'SQL注入检测',
        '权限提升分析',
        '数据泄露评估',
        '合规性检查',
        '安全最佳实践建议'
      ],
      outputFields: [
        'score', 'confidence', 'threatLevel', 'attackSurface', 'vulnerabilities',
        'recommendations', 'securityMetrics', 'complianceAssessment', 'bestPractices'
      ],
      securityFrameworks: ['MITRE ATT&CK', 'CWE', 'CVSS', 'NIST'],
      complianceStandards: ['GDPR', 'HIPAA', 'PCI-DSS', 'SOX']
    };
  }
}

export default SecurityTool;