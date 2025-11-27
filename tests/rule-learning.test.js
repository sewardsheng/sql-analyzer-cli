/**
 * 智能规则学习功能测试
 * 验证规则学习系统的各个组件是否正常工作
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { getRuleLearningConfig, resetRuleLearningConfig } from '../src/config/rule-learning-config.js';
import { getIntelligentRuleLearner } from '../src/services/rule-learning/rule-learner.js';
import { getLLMService } from '../src/core/llm-service.js';
import { getHistoryService } from '../src/services/history-service.js';

describe('智能规则学习系统测试', () => {
  let config;
  let ruleLearner;
  let historyService;
  let llmService;

  beforeEach(async () => {
    // 重置配置
    resetRuleLearningConfig();
    config = getRuleLearningConfig();
    
    // 初始化服务
    llmService = getLLMService();
    historyService = await getHistoryService();
    ruleLearner = getIntelligentRuleLearner(llmService, historyService);
  });

  afterEach(() => {
    // 清理测试数据
    resetRuleLearningConfig();
  });

  describe('配置管理测试', () => {
    it('应该能够获取默认配置', () => {
      const allConfig = config.getAll();
      
      expect(allConfig).toBeDefined();
      expect(allConfig.learning).toBeDefined();
      expect(allConfig.generation).toBeDefined();
      expect(allConfig.evaluation).toBeDefined();
      expect(allConfig.storage).toBeDefined();
      expect(allConfig.performance).toBeDefined();
      expect(allConfig.logging).toBeDefined();
    });

    it('应该能够获取特定配置项', () => {
      expect(config.get('learning.enabled')).toBe(true);
      expect(config.get('learning.minConfidence')).toBe(0.7);
      expect(config.get('generation.maxRulesPerLearning')).toBe(10);
      expect(config.get('evaluation.autoApprovalThreshold')).toBe(70);
    });

    it('应该能够更新配置', () => {
      config.set('learning.minConfidence', 0.8);
      expect(config.get('learning.minConfidence')).toBe(0.8);
      
      config.update({
        generation: {
          maxRulesPerLearning: 15
        }
      });
      expect(config.get('generation.maxRulesPerLearning')).toBe(15);
    });

    it('应该验证配置的有效性', () => {
      expect(() => {
        config.set('learning.minConfidence', 1.5);
      }).toThrow('minConfidence 必须在 0-1 之间');
      
      expect(() => {
        config.set('evaluation.autoApprovalThreshold', 150);
      }).toThrow('autoApprovalThreshold 必须在 0-100 之间');
    });

    it('应该能够重置配置', () => {
      config.set('learning.minConfidence', 0.9);
      config.reset();
      expect(config.get('learning.minConfidence')).toBe(0.7);
    });
  });

  describe('智能规则学习器测试', () => {
    it('应该能够创建规则学习器实例', () => {
      expect(ruleLearner).toBeDefined();
      expect(typeof ruleLearner.learnFromAnalysis).toBe('function');
      expect(typeof ruleLearner.performBatchLearning).toBe('function');
      expect(typeof ruleLearner.shouldTriggerLearning).toBe('function');
    });

    it('应该能够判断是否触发学习', async () => {
      // 模拟高质量分析结果
      const highQualityResult = {
        success: true,
        data: {
          performance: {
            metadata: { confidence: 0.9 }
          },
          security: {
            metadata: { confidence: 0.8 }
          },
          standards: {
            metadata: { confidence: 0.85 }
          }
        }
      };

      const shouldLearn = await ruleLearner.shouldTriggerLearning(
        'SELECT * FROM users WHERE id = 1',
        highQualityResult
      );
      
      expect(shouldLearn).toBe(true);
    });

    it('应该能够拒绝低质量分析结果', async () => {
      // 模拟低质量分析结果
      const lowQualityResult = {
        success: true,
        data: {
          performance: {
            metadata: { confidence: 0.5 }
          },
          security: {
            metadata: { confidence: 0.4 }
          },
          standards: {
            metadata: { confidence: 0.3 }
          }
        }
      };

      const shouldLearn = await ruleLearner.shouldTriggerLearning(
        'SELECT * FROM users WHERE id = 1',
        lowQualityResult
      );
      
      expect(shouldLearn).toBe(false);
    });
  });

  describe('历史数据分析器测试', () => {
    it('应该能够分析历史数据模式', async () => {
      // 创建测试历史数据
      const testHistory = [
        {
          sql: 'SELECT * FROM users WHERE id = 1',
          result: {
            success: true,
            data: {
              performance: { issues: [{ type: 'select_star' }] },
              security: { issues: [{ type: 'sql_injection_risk' }] }
            }
          }
        },
        {
          sql: 'SELECT * FROM users WHERE id = 2',
          result: {
            success: true,
            data: {
              performance: { issues: [{ type: 'select_star' }] },
              security: { issues: [{ type: 'sql_injection_risk' }] }
            }
          }
        }
      ];

      const historyAnalyzer = ruleLearner.historyAnalyzer;
      const patterns = await historyAnalyzer.analyzePatterns(testHistory);
      
      expect(patterns).toBeDefined();
      expect(patterns.sqlPatterns).toBeDefined();
      expect(patterns.issuePatterns).toBeDefined();
      expect(patterns.sqlPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('规则生成器测试', () => {
    it('应该能够生成规则', async () => {
      const ruleGenerator = ruleLearner.ruleGenerator;
      
      const learningData = {
        sqlPatterns: [
          {
            pattern: 'SELECT * FROM {table} WHERE {id} = {value}',
            examples: ['SELECT * FROM users WHERE id = 1'],
            frequency: 2
          }
        ],
        issuePatterns: [
          {
            type: 'select_star',
            category: 'performance',
            examples: ['SELECT * FROM users WHERE id = 1'],
            frequency: 2
          }
        ]
      };

      const rules = await ruleGenerator.generateRules(learningData);
      
      expect(rules).toBeDefined();
      expect(Array.isArray(rules)).toBe(true);
      if (rules.length > 0) {
        expect(rules[0]).toHaveProperty('title');
        expect(rules[0]).toHaveProperty('description');
        expect(rules[0]).toHaveProperty('category');
        expect(rules[0]).toHaveProperty('severity');
      }
    });
  });

  describe('质量评估器测试', () => {
    it('应该能够评估规则质量', async () => {
      const qualityEvaluator = ruleLearner.qualityEvaluator;
      
      const testRule = {
        title: '避免使用SELECT *',
        description: '在查询中避免使用SELECT *，应该明确指定需要的字段',
        category: 'performance',
        severity: 'medium',
        triggerCondition: '检测到SELECT *语句',
        recommendation: '明确指定需要的字段名'
      };

      const evaluation = await qualityEvaluator.evaluateRule(testRule);
      
      expect(evaluation).toBeDefined();
      expect(evaluation).toHaveProperty('basicValidation');
      expect(evaluation).toHaveProperty('llmEvaluation');
      expect(evaluation).toHaveProperty('combinedScore');
      expect(typeof evaluation.combinedScore).toBe('number');
    });
  });

  describe('自动审批器测试', () => {
    it('应该能够自动审批高质量规则', async () => {
      const autoApprover = ruleLearner.autoApprover;
      
      const highQualityRule = {
        id: 'test-rule-1',
        title: '避免使用SELECT *',
        description: '在查询中避免使用SELECT *，应该明确指定需要的字段',
        category: 'performance',
        severity: 'medium',
        triggerCondition: '检测到SELECT *语句',
        recommendation: '明确指定需要的字段名',
        evaluation: {
          combinedScore: 85,
          llmEvaluation: {
            confidence: 0.9
          }
        }
      };

      const approvalResult = await autoApprover.evaluateForAutoApproval(highQualityRule);
      
      expect(approvalResult).toBeDefined();
      expect(approvalResult).toHaveProperty('approved');
      expect(approvalResult).toHaveProperty('reason');
      if (approvalResult.approved) {
        expect(approvalResult.reason).toContain('自动审批通过');
      }
    });

    it('应该拒绝低质量规则', async () => {
      const autoApprover = ruleLearner.autoApprover;
      
      const lowQualityRule = {
        id: 'test-rule-2',
        title: '测试规则',
        description: '这是一个测试规则',
        category: 'performance',
        severity: 'low',
        triggerCondition: '测试条件',
        recommendation: '测试建议',
        evaluation: {
          combinedScore: 45,
          llmEvaluation: {
            confidence: 0.5
          }
        }
      };

      const approvalResult = await autoApprover.evaluateForAutoApproval(lowQualityRule);
      
      expect(approvalResult).toBeDefined();
      expect(approvalResult.approved).toBe(false);
      expect(approvalResult.reason).toContain('质量分数不足');
    });
  });

  describe('集成测试', () => {
    it('应该能够完成完整的学习流程', async () => {
      // 模拟分析结果
      const analysisResult = {
        success: true,
        data: {
          performance: {
            metadata: { confidence: 0.9 },
            issues: [
              {
                type: 'select_star',
                severity: 'medium',
                description: '使用了SELECT *语句'
              }
            ]
          },
          security: {
            metadata: { confidence: 0.8 },
            issues: [
              {
                type: 'sql_injection_risk',
                severity: 'high',
                description: '可能存在SQL注入风险'
              }
            ]
          },
          standards: {
            metadata: { confidence: 0.85 },
            issues: []
          }
        }
      };

      const sqlQuery = 'SELECT * FROM users WHERE id = 1';

      // 执行学习
      const learningResult = await ruleLearner.learnFromAnalysis(analysisResult, sqlQuery);
      
      expect(learningResult).toBeDefined();
      expect(learningResult).toHaveProperty('success');
      expect(learningResult).toHaveProperty('message');
    });
  });

  describe('API接口测试', () => {
    it('应该能够获取配置', async () => {
      // 这里可以添加HTTP API测试
      // 由于是单元测试，这里只测试配置获取逻辑
      const configData = config.getAll();
      expect(configData).toBeDefined();
      expect(configData.learning.enabled).toBe(true);
    });
  });
});

// 性能测试
describe('性能测试', () => {
  it('规则学习应该在合理时间内完成', async () => {
    const config = getRuleLearningConfig();
    const llmService = getLLMService();
    const historyService = await getHistoryService();
    const ruleLearner = getIntelligentRuleLearner(llmService, historyService);
    
    const startTime = Date.now();
    
    // 模拟简单学习过程
    const analysisResult = {
      success: true,
      data: {
        performance: { metadata: { confidence: 0.9 } },
        security: { metadata: { confidence: 0.8 } },
        standards: { metadata: { confidence: 0.85 } }
      }
    };
    
    await ruleLearner.shouldTriggerLearning('SELECT * FROM users', analysisResult);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // 应该在5秒内完成
    expect(duration).toBeLessThan(5000);
  });
});

// 错误处理测试
describe('错误处理测试', () => {
  it('应该能够处理无效的分析结果', async () => {
    const config = getRuleLearningConfig();
    const llmService = getLLMService();
    const historyService = await getHistoryService();
    const ruleLearner = getIntelligentRuleLearner(llmService, historyService);
    
    // 测试空结果
    const emptyResult = { success: false };
    const shouldLearn = await ruleLearner.shouldTriggerLearning('SELECT * FROM users', emptyResult);
    expect(shouldLearn).toBe(false);
    
    // 测试null结果
    const nullResult = null;
    const shouldLearnNull = await ruleLearner.shouldTriggerLearning('SELECT * FROM users', nullResult);
    expect(shouldLearnNull).toBe(false);
  });
});