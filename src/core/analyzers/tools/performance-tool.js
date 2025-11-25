/**
 * PerformanceTool - SQL性能分析工具
 * 专门用于分析SQL语句的性能瓶颈、执行计划和优化建议
 */

import { BaseTool } from './base-tool.js';

/**
 * 性能分析工具类
 * 继承自BaseTool，专注于SQL性能分析
 */
export class PerformanceTool extends BaseTool {
  /**
   * 构造函数
   * @param {Function} llmInvoker - LLM调用器函数
   */
  constructor(llmInvoker) {
    super({
      name: 'analyze_performance',
      promptFile: 'performance-analysis.md',
      category: 'analyzers',
      llmInvoker: llmInvoker,
      schema: {
        type: 'object',
        required: ['score', 'confidence', 'executionPlan', 'issues', 'optimizations', 'metrics', 'recommendations'],
        properties: {
          score: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: '性能评分 (0-100)'
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: '分析置信度 (0.0-1.0)'
          },
          executionPlan: {
            type: 'object',
            properties: {
              estimatedCost: {
                type: 'number',
                description: '估算执行成本'
              },
              estimatedRows: {
                type: 'number',
                description: '估算返回行数'
              },
              operations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    description: { type: 'string' },
                    cost: { type: 'number' },
                    rows: { type: 'number' },
                    optimizationNotes: { type: 'string' }
                  }
                }
              }
            }
          },
          issues: {
            type: 'array',
            items: {
              type: 'object',
              required: ['type', 'severity', 'description'],
              properties: {
                type: {
                  type: 'string',
                  enum: ['扫描与索引瓶颈', '连接操作与中间结果瓶颈', '查询逻辑与计算瓶颈', '资源使用与并发瓶颈']
                },
                severity: {
                  type: 'string',
                  enum: ['Critical', 'High', 'Medium', 'Low']
                },
                confidence: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1
                },
                description: { type: 'string' },
                location: { type: 'string' },
                rootCause: { type: 'string' },
                performanceImpact: { type: 'string' },
                evidence: { type: 'string' }
              }
            }
          },
          optimizations: {
            type: 'array',
            items: {
              type: 'object',
              required: ['approach', 'suggestion', 'explanation'],
              properties: {
                issueId: { type: 'string' },
                approach: {
                  type: 'string',
                  enum: ['Primary', 'Secondary', 'Alternative']
                },
                suggestion: { type: 'string' },
                sql_rewrite: { type: 'string' },
                explanation: { type: 'string' },
                expectedImprovement: { type: 'string' },
                implementationComplexity: {
                  type: 'string',
                  enum: ['Low', 'Medium', 'High']
                },
                tradeoffs: { type: 'string' },
                prerequisites: { type: 'string' }
              }
            }
          },
          metrics: {
            type: 'object',
            properties: {
              estimatedExecutionTime: { type: 'string' },
              ioOperations: { type: 'number' },
              memoryUsage: { type: 'string' },
              cpuComplexity: {
                type: 'string',
                enum: ['Low', 'Medium', 'High']
              },
              parallelismPotential: {
                type: 'string',
                enum: ['Low', 'Medium', 'High']
              }
            }
          },
          recommendations: {
            type: 'array',
            items: {
              type: 'object',
              required: ['category', 'priority', 'description'],
              properties: {
                category: {
                  type: 'string',
                  enum: ['Index', 'Schema', 'Query', 'Configuration']
                },
                priority: {
                  type: 'string',
                  enum: ['Critical', 'High', 'Medium', 'Low']
                },
                description: { type: 'string' },
                implementation: { type: 'string' },
                impact: { type: 'string' }
              }
            }
          }
        }
      }
    });
  }

  /**
   * 获取性能分析专用的默认结果
   * @returns {Object} 默认性能分析结果
   */
  getDefaultResult() {
    return {
      score: 50,
      confidence: 0,
      executionPlan: {
        estimatedCost: 0,
        estimatedRows: 0,
        operations: []
      },
      issues: [],
      optimizations: [],
      metrics: {
        estimatedExecutionTime: 'unknown',
        ioOperations: 0,
        memoryUsage: 'unknown',
        cpuComplexity: 'Medium',
        parallelismPotential: 'Low'
      },
      recommendations: []
    };
  }

  /**
   * 构建性能分析专用的用户提示词
   * @param {Object} params - 参数
   * @returns {string} 用户提示词
   */
  buildUserPrompt(params) {
    return `请对以下SQL语句进行深度性能分析：

数据库类型: ${params.databaseType}

SQL语句:
\`\`\`sql
${params.sql}
\`\`\`

请重点关注：
1. 索引使用情况和缺失的索引机会
2. 查询执行计划和潜在瓶颈
3. 连接操作和中间结果处理
4. 资源使用情况（I/O、内存、CPU）
5. 具体的优化建议和SQL重写方案

请按照performance-analysis.md要求的JSON格式返回详细的分析结果。`;
  }

  /**
   * 验证性能分析结果的完整性
   * @param {Object} result - 分析结果
   * @returns {Object} 验证后的结果
   */
  async parseAndValidate(response) {
    const result = await super.parseAndValidate(response);

    // 性能分析特定的验证逻辑
    if (result.executionPlan) {
      // 确保executionPlan的数值字段有效
      if (typeof result.executionPlan.estimatedCost !== 'number') {
        result.executionPlan.estimatedCost = 0;
      }
      if (typeof result.executionPlan.estimatedRows !== 'number') {
        result.executionPlan.estimatedRows = 0;
      }
      if (!Array.isArray(result.executionPlan.operations)) {
        result.executionPlan.operations = [];
      }
    }

    if (result.metrics) {
      // 确保metrics的数值字段有效
      if (typeof result.metrics.ioOperations !== 'number') {
        result.metrics.ioOperations = 0;
      }
      
      // 验证枚举值
      const validComplexity = ['Low', 'Medium', 'High'];
      if (!validComplexity.includes(result.metrics.cpuComplexity)) {
        result.metrics.cpuComplexity = 'Medium';
      }
      if (!validComplexity.includes(result.metrics.parallelismPotential)) {
        result.metrics.parallelismPotential = 'Low';
      }
    }

    // 验证issues数组
    if (Array.isArray(result.issues)) {
      const validSeverities = ['Critical', 'High', 'Medium', 'Low'];
      const validTypes = ['扫描与索引瓶颈', '连接操作与中间结果瓶颈', '查询逻辑与计算瓶颈', '资源使用与并发瓶颈'];
      
      result.issues = result.issues.filter(issue => {
        return issue.type && 
               validTypes.includes(issue.type) &&
               issue.severity && 
               validSeverities.includes(issue.severity) &&
               issue.description;
      });
    }

    // 验证optimizations数组
    if (Array.isArray(result.optimizations)) {
      const validApproaches = ['Primary', 'Secondary', 'Alternative'];
      const validComplexities = ['Low', 'Medium', 'High'];
      
      result.optimizations = result.optimizations.filter(opt => {
        return opt.approach && 
               validApproaches.includes(opt.approach) &&
               opt.suggestion && 
               opt.explanation;
      });
    }

    return result;
  }

  /**
   * 获取性能分析工具的特定信息
   * @returns {Object} 工具信息
   */
  getToolInfo() {
    return {
      ...super.getToolInfo(),
      description: 'SQL性能分析工具，识别性能瓶颈并提供优化建议',
      capabilities: [
        '执行计划分析',
        '索引使用评估',
        '连接优化建议',
        '资源使用分析',
        'SQL重写建议'
      ],
      outputFields: [
        'score', 'confidence', 'executionPlan', 'issues', 
        'optimizations', 'metrics', 'recommendations'
      ]
    };
  }
}

export default PerformanceTool;