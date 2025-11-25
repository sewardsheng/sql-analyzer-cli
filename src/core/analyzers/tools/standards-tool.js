/**
 * StandardsTool - SQL编码规范检查工具
 * 专门用于分析SQL语句的编码规范、代码质量和最佳实践遵循情况
 */

import { BaseTool } from './base-tool.js';

/**
 * 编码规范检查工具类
 * 继承自BaseTool，专注于SQL编码规范分析
 */
export class StandardsTool extends BaseTool {
  /**
   * 构造函数
   * @param {Function} llmInvoker - LLM调用器函数
   */
  constructor(llmInvoker) {
    super({
      name: 'analyze_standards',
      promptFile: 'coding-standards-check.md',
      category: 'analyzers',
      llmInvoker: llmInvoker,
      schema: {
        type: 'object',
        required: ['score', 'confidence', 'qualityLevel', 'standardsCompliance', 'complexityMetrics', 'violations', 'fixed_sql', 'fixSummary', 'recommendations', 'qualityMetrics', 'bestPractices'],
        properties: {
          score: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: '规范评分 (0-100)'
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: '分析置信度 (0.0-1.0)'
          },
          qualityLevel: {
            type: 'string',
            enum: ['优秀', '好', '一般', '差', '严重'],
            description: '代码质量等级'
          },
          standardsCompliance: {
            type: 'object',
            properties: {
              overallCompliance: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: '整体合规性 (0.0-1.0)'
              },
              namingCompliance: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: '命名规范合规性 (0.0-1.0)'
              },
              formattingCompliance: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: '格式化规范合规性 (0.0-1.0)'
              },
              structuralCompliance: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: '结构规范合规性 (0.0-1.0)'
              },
              documentationCompliance: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: '文档规范合规性 (0.0-1.0)'
              }
            }
          },
          complexityMetrics: {
            type: 'object',
            properties: {
              cyclomaticComplexity: {
                type: 'number',
                description: '圈复杂度'
              },
              nestingDepth: {
                type: 'number',
                description: '嵌套深度'
              },
              queryLength: {
                type: 'number',
                description: '查询长度'
              },
              joinCount: {
                type: 'number',
                description: '连接数量'
              },
              subqueryCount: {
                type: 'number',
                description: '子查询数量'
              },
              complexityLevel: {
                type: 'string',
                enum: ['低', '中', '高', '非常高'],
                description: '复杂度等级'
              }
            }
          },
          violations: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'category', 'severity', 'rule', 'description'],
              properties: {
                id: { type: 'string' },
                category: {
                  type: 'string',
                  enum: ['命名约定', '格式化', '结构', '文档', '性能', '安全']
                },
                subcategory: { type: 'string' },
                severity: {
                  type: 'string',
                  enum: ['严重', '高', '中', '低']
                },
                confidence: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1
                },
                rule: { type: 'string' },
                description: { type: 'string' },
                location: {
                  type: 'object',
                  properties: {
                    line: { type: 'number' },
                    column: { type: 'number' },
                    snippet: { type: 'string' }
                  }
                },
                impact: {
                  type: 'object',
                  properties: {
                    readability: {
                      type: 'string',
                      enum: ['无', '低', '中', '高']
                    },
                    maintainability: {
                      type: 'string',
                      enum: ['无', '低', '中', '高']
                    },
                    performance: {
                      type: 'string',
                      enum: ['无', '低', '中', '高']
                    },
                    security: {
                      type: 'string',
                      enum: ['无', '低', '中', '高']
                    }
                  }
                },
                standardsReference: { type: 'string' },
                evidence: { type: 'string' },
                suggestedFix: { type: 'string' }
              }
            }
          },
          fixed_sql: {
            type: 'string',
            description: '修正后的完整SQL语句'
          },
          fixSummary: {
            type: 'object',
            properties: {
              totalChanges: { type: 'number' },
              criticalFixes: { type: 'number' },
              majorFixes: { type: 'number' },
              minorFixes: { type: 'number' },
              categoriesFixed: {
                type: 'array',
                items: { type: 'string' }
              }
            }
          },
          recommendations: {
            type: 'array',
            items: {
              type: 'object',
              required: ['category', 'priority', 'title', 'description'],
              properties: {
                category: {
                  type: 'string',
                  enum: ['命名', '格式化', '结构', '文档', '性能', '最佳实践']
                },
                priority: {
                  type: 'string',
                  enum: ['严重', '高', '中', '低']
                },
                title: { type: 'string' },
                description: { type: 'string' },
                implementation: {
                  type: 'object',
                  properties: {
                    steps: {
                      type: 'array',
                      items: { type: 'string' }
                    },
                    examples: {
                      type: 'array',
                      items: { type: 'string' }
                    },
                    tools: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  }
                },
                benefits: {
                  type: 'object',
                  properties: {
                    readability: { type: 'string' },
                    maintainability: { type: 'string' },
                    performance: { type: 'string' },
                    teamProductivity: { type: 'string' }
                  }
                },
                effort: {
                  type: 'string',
                  enum: ['低', '中', '高']
                },
                impact: {
                  type: 'string',
                  enum: ['低', '中', '高']
                }
              }
            }
          },
          qualityMetrics: {
            type: 'object',
            properties: {
              readabilityScore: {
                type: 'number',
                minimum: 0,
                maximum: 100
              },
              maintainabilityIndex: {
                type: 'number',
                minimum: 0,
                maximum: 100
              },
              documentationCoverage: {
                type: 'number',
                minimum: 0,
                maximum: 1
              },
              standardsAdherence: {
                type: 'number',
                minimum: 0,
                maximum: 1
              },
              codeComplexity: {
                type: 'string',
                enum: ['低', '中', '高', '非常高']
              },
              technicalDebt: {
                type: 'string',
                enum: ['低', '中', '高', '严重']
              }
            }
          },
          bestPractices: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                practice: { type: 'string' },
                category: {
                  type: 'string',
                  enum: ['通用', 'mysql专有', 'postgresql专有', 'oracle专有', 'sqlserver专有', 'clickhouse专有', 'sqlite专有', '企业', '行业']
                },
                currentStatus: {
                  type: 'string',
                  enum: ['合规', '部分合规', '不合规']
                },
                improvementNeeded: { type: 'string' },
                implementation: { type: 'string' }
              }
            }
          }
        }
      }
    });
  }

  /**
   * 获取编码规范检查专用的默认结果
   * @returns {Object} 默认规范检查结果
   */
  getDefaultResult() {
    return {
      score: 50,
      confidence: 0,
      qualityLevel: '一般',
      standardsCompliance: {
        overallCompliance: 0.5,
        namingCompliance: 0.5,
        formattingCompliance: 0.5,
        structuralCompliance: 0.5,
        documentationCompliance: 0.5
      },
      complexityMetrics: {
        cyclomaticComplexity: 1,
        nestingDepth: 1,
        queryLength: 0,
        joinCount: 0,
        subqueryCount: 0,
        complexityLevel: '低'
      },
      violations: [],
      fixed_sql: '',
      fixSummary: {
        totalChanges: 0,
        criticalFixes: 0,
        majorFixes: 0,
        minorFixes: 0,
        categoriesFixed: []
      },
      recommendations: [],
      qualityMetrics: {
        readabilityScore: 50,
        maintainabilityIndex: 50,
        documentationCoverage: 0,
        standardsAdherence: 0.5,
        codeComplexity: '中',
        technicalDebt: '中'
      },
      bestPractices: []
    };
  }

  /**
   * 构建编码规范检查专用的用户提示词
   * @param {Object} params - 参数
   * @returns {string} 用户提示词
   */
  buildUserPrompt(params) {
    return `请对以下SQL语句进行深度编码规范检查：

数据库类型: ${params.databaseType}

SQL语句:
\`\`\`sql
${params.sql}
\`\`\`

请重点关注：
1. 命名约定（表、列、别名、函数等）
2. 格式化和样式（大小写、缩进、对齐等）
3. 结构标准（查询组织、子查询、连接等）
4. 复杂度评估（圈复杂度、嵌套深度等）
5. 可维护性分析
6. 最佳实践遵循情况
7. 提供完整的修正SQL

请按照coding-standards-check.md要求的JSON格式返回详细的分析结果。`;
  }

  /**
   * 验证编码规范检查结果的完整性
   * @param {Object} result - 分析结果
   * @returns {Object} 验证后的结果
   */
  async parseAndValidate(response) {
    const result = await super.parseAndValidate(response);

    // 编码规范检查特定的验证逻辑
    if (result.qualityLevel) {
      const validQualityLevels = ['优秀', '好', '一般', '差', '严重'];
      if (!validQualityLevels.includes(result.qualityLevel)) {
        result.qualityLevel = '一般';
      }
    }

    if (result.standardsCompliance) {
      // 确保合规性数值在有效范围内
      ['overallCompliance', 'namingCompliance', 'formattingCompliance', 'structuralCompliance', 'documentationCompliance'].forEach(key => {
        const value = result.standardsCompliance[key];
        if (typeof value !== 'number' || value < 0 || value > 1) {
          result.standardsCompliance[key] = 0.5;
        }
      });
    }

    if (result.complexityMetrics) {
      // 确保复杂度指标有效
      ['cyclomaticComplexity', 'nestingDepth', 'queryLength', 'joinCount', 'subqueryCount'].forEach(key => {
        if (typeof result.complexityMetrics[key] !== 'number' || result.complexityMetrics[key] < 0) {
          result.complexityMetrics[key] = 0;
        }
      });
      
      // 验证复杂度等级
      const validComplexityLevels = ['低', '中', '高', '非常高'];
      if (!validComplexityLevels.includes(result.complexityMetrics.complexityLevel)) {
        result.complexityMetrics.complexityLevel = '中';
      }
    }

    // 验证violations数组
    if (Array.isArray(result.violations)) {
      const validSeverities = ['严重', '高', '中', '低'];
      const validCategories = ['命名约定', '格式化', '结构', '文档', '性能', '安全'];
      const validImpacts = ['无', '低', '中', '高'];
      
      result.violations = result.violations.filter(violation => {
        return violation.id && 
               violation.category && 
               validCategories.includes(violation.category) &&
               violation.severity && 
               validSeverities.includes(violation.severity) &&
               violation.rule &&
               violation.description;
      });

      // 验证impact对象
      result.violations.forEach(violation => {
        if (violation.impact) {
          ['readability', 'maintainability', 'performance', 'security'].forEach(key => {
            if (!validImpacts.includes(violation.impact[key])) {
              violation.impact[key] = '无';
            }
          });
        }
      });
    }

    // 验证fixSummary
    if (result.fixSummary) {
      ['totalChanges', 'criticalFixes', 'majorFixes', 'minorFixes'].forEach(key => {
        if (typeof result.fixSummary[key] !== 'number' || result.fixSummary[key] < 0) {
          result.fixSummary[key] = 0;
        }
      });
      
      if (!Array.isArray(result.fixSummary.categoriesFixed)) {
        result.fixSummary.categoriesFixed = [];
      }
    }

    // 验证qualityMetrics
    if (result.qualityMetrics) {
      // 确保数值指标有效
      ['readabilityScore', 'maintainabilityIndex'].forEach(key => {
        const value = result.qualityMetrics[key];
        if (typeof value !== 'number' || value < 0 || value > 100) {
          result.qualityMetrics[key] = 50;
        }
      });
      
      ['documentationCoverage', 'standardsAdherence'].forEach(key => {
        const value = result.qualityMetrics[key];
        if (typeof value !== 'number' || value < 0 || value > 1) {
          result.qualityMetrics[key] = 0.5;
        }
      });
      
      // 验证枚举值
      const validComplexities = ['低', '中', '高', '非常高'];
      const validDebtLevels = ['低', '中', '高', '严重'];
      
      if (!validComplexities.includes(result.qualityMetrics.codeComplexity)) {
        result.qualityMetrics.codeComplexity = '中';
      }
      if (!validDebtLevels.includes(result.qualityMetrics.technicalDebt)) {
        result.qualityMetrics.technicalDebt = '中';
      }
    }

    return result;
  }

  /**
   * 获取编码规范检查工具的特定信息
   * @returns {Object} 工具信息
   */
  getToolInfo() {
    return {
      ...super.getToolInfo(),
      description: 'SQL编码规范检查工具，评估代码质量和最佳实践遵循情况',
      capabilities: [
        '命名约定检查',
        '格式化规范验证',
        '结构标准评估',
        '复杂度分析',
        '可维护性评估',
        'SQL修正建议'
      ],
      outputFields: [
        'score', 'confidence', 'qualityLevel', 'standardsCompliance', 'complexityMetrics',
        'violations', 'fixed_sql', 'fixSummary', 'recommendations', 'qualityMetrics', 'bestPractices'
      ],
      qualityDimensions: [
        '可读性', '可维护性', '一致性', '复杂性', '文档完整性'
      ],
      supportedDatabases: [
        'MySQL', 'PostgreSQL', 'Oracle', 'SQL Server', 'ClickHouse', 'SQLite'
      ]
    };
  }
}

export default StandardsTool;