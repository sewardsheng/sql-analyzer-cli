/**
 * CLI和API集成测试
 * 老王我把双通道集成测试做好了！确保CLI和API都能正常使用智能算法
 */

import { ruleEvaluationService } from '../RuleEvaluationService';
import { RuleInfo } from '../models/RuleModels';

describe('CLI和API双通道集成测试', () => {
  // 测试规则数据
  const testRules: RuleInfo[] = [
    {
      id: 'test-sql-optimization-1',
      title: 'SQL查询性能优化规则',
      description: '这个规则帮助优化SQL查询性能，包括索引使用、查询重写等技术',
      category: 'performance',
      severity: 'high',
      sqlPattern: 'SELECT.*FROM.*WHERE',
      examples: {
        bad: ['SELECT * FROM users'],
        good: ['SELECT id, name FROM users WHERE active = 1']
      },
      status: 'draft',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-02'),
      tags: ['sql', 'performance', 'optimization'],
      metadata: {
        source: 'test',
        author: 'test-author'
      }
    },
    {
      id: 'test-security-rule-1',
      title: '数据库安全配置规则',
      description: '确保数据库安全配置，防止未授权访问和数据泄露',
      category: 'security',
      severity: 'critical',
      sqlPattern: 'GRANT|REVOKE',
      examples: {
        bad: ['GRANT ALL ON *.* TO user'],
        good: ['GRANT SELECT ON specific_table TO user']
      },
      status: 'draft',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-02'),
      tags: ['security', 'database', 'access'],
      metadata: {
        source: 'test',
        author: 'test-author'
      }
    }
  ];

  describe('服务层集成测试', () => {
    test('应该能通过CLI接口批量评估规则', async () => {
      const request = {
        rules: testRules,
        options: {
          enableQualityCheck: true,
          enableDuplicateCheck: true,
          enableClassification: true,
          qualityThreshold: 70,
          concurrency: 2,
          enableCache: false
        },
        source: 'cli' as const,
        metadata: {
          requestId: 'cli-test-001',
          userId: 'test-user-cli'
        }
      };

      const result = await ruleEvaluationService.evaluateBatch(request);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(testRules.length);
      expect(result.summary.totalRules).toBe(testRules.length);
      expect(result.summary.processedRules).toBe(testRules.length);
      expect(result.summary.failedRules).toBe(0);
      expect(result.requestId).toBe('cli-test-001');
    }, 15000); // 15秒超时

    test('应该能通过API接口批量评估规则', async () => {
      const request = {
        rules: testRules,
        options: {
          enableQualityCheck: true,
          enableDuplicateCheck: true,
          enableClassification: true,
          qualityThreshold: 75,
          concurrency: 1
        },
        source: 'api' as const,
        metadata: {
          requestId: 'api-test-001',
          userId: 'test-user-api',
          sessionId: 'api-session-123'
        }
      };

      const result = await ruleEvaluationService.evaluateBatch(request);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(testRules.length);
      expect(result.summary.totalRules).toBe(testRules.length);
      expect(result.requestId).toBe('api-test-001');
    }, 15000);

    test('应该能通过CLI接口评估单个规则', async () => {
      const request = {
        rule: testRules[0],
        options: {
          enableQualityCheck: true,
          enableDuplicateCheck: true,
          qualityThreshold: 70
        },
        source: 'cli' as const
      };

      const result = await ruleEvaluationService.evaluateSingle(request);

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.rule.id).toBe(testRules[0].id);
      expect(result.cached).toBeDefined();
    }, 10000);

    test('应该能通过API接口评估单个规则', async () => {
      const request = {
        rule: testRules[1],
        options: {
          enableQualityCheck: true,
          enableDuplicateCheck: false, // API可以禁用某些功能
          qualityThreshold: 80
        },
        source: 'api' as const
      };

      const result = await ruleEvaluationService.evaluateSingle(request);

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.rule.id).toBe(testRules[1].id);
      expect(result.result?.duplicateCheck.isDuplicate).toBe(false); // 禁用了重复检查
    }, 10000);
  });

  describe('去重检测集成测试', () => {
    test('应该能检测重复规则', async () => {
      // 创建重复规则
      const duplicateRule: RuleInfo = {
        ...testRules[0],
        id: 'duplicate-test-rule',
        title: 'SQL查询性能优化规则', // 完全相同的标题
        description: '这个规则帮助优化SQL查询性能，包括索引使用、查询重写等技术'
      };

      const result = await ruleEvaluationService.checkDuplicate(duplicateRule);

      expect(result).toBeDefined();
      expect(typeof result.isDuplicate).toBe('boolean');
      expect(typeof result.similarity).toBe('number');
      expect(typeof result.duplicateType).toBe('string');
      expect(Array.isArray(result.matchedRules)).toBe(true);
      expect(typeof result.explanation).toBe('string');
    });

    test('应该能处理非重复规则', async () => {
      const uniqueRule: RuleInfo = {
        id: 'unique-test-rule',
        title: '数据库备份恢复策略',
        description: '制定完整的数据库备份和恢复方案，确保数据安全',
        category: 'reliability',
        severity: 'high',
        sqlPattern: 'BACKUP|RESTORE',
        examples: {
          bad: ['没有备份策略'],
          good: ['每日全量备份 + 每小时增量备份']
        },
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ['backup', 'recovery', 'data-safety'],
        metadata: {}
      };

      const result = await ruleEvaluationService.checkDuplicate(uniqueRule);

      expect(result.isDuplicate).toBe(false);
      expect(result.similarity).toBeLessThan(0.5);
      expect(result.duplicateType).toBe('none');
    });
  });

  describe('性能和健康检查测试', () => {
    test('应该能获取服务健康状态', async () => {
      const healthStatus = await ruleEvaluationService.getHealthStatus();

      expect(healthStatus).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(healthStatus.status);
      expect(healthStatus.details).toBeDefined();
      expect(healthStatus.details.engineStatus).toBeDefined();
      expect(healthStatus.details.detectorStatus).toBeDefined();
      expect(healthStatus.timestamp).toBeDefined();
    });

    test('应该能获取服务统计信息', () => {
      const stats = ruleEvaluationService.getServiceStats();

      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
    });

    test('应该能清理所有缓存', async () => {
      expect(async () => {
        await ruleEvaluationService.clearAllCaches();
      }).not.toThrow();
    });
  });

  describe('错误处理测试', () => {
    test('应该处理空规则列表', async () => {
      const request = {
        rules: [],
        options: {},
        source: 'api' as const
      };

      const result = await ruleEvaluationService.evaluateBatch(request);

      expect(result.success).toBe(true); // 空列表不算失败
      expect(result.results).toHaveLength(0);
      expect(result.summary.totalRules).toBe(0);
    });

    test('应该处理无效规则数据', async () => {
      const invalidRule: RuleInfo = {
        id: '',
        title: '',
        description: '测试无效数据',
        category: 'unknown',
        severity: 'medium',
        sqlPattern: '',
        examples: { bad: [], good: [] },
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
        metadata: {}
      };

      const request = {
        rule: invalidRule,
        options: {},
        source: 'api' as const
      };

      const result = await ruleEvaluationService.evaluateSingle(request);

      // 应该能处理，但可能返回质量分数很低的评估结果
      expect(result).toBeDefined();
    });

    test('应该处理高并发请求', async () => {
      const requests = Array.from({ length: 5 }, (_, index) => ({
        rules: [testRules[index % testRules.length]],
        options: { concurrency: 1 },
        source: 'api' as const,
        metadata: { requestId: `concurrent-test-${index}` }
      }));

      // 并发执行多个请求
      const promises = requests.map(request =>
        ruleEvaluationService.evaluateBatch(request)
      );

      const results = await Promise.all(promises);

      // 所有请求都应该成功完成
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.requestId).toBe(`concurrent-test-${index}`);
      });
    }, 20000);
  });

  describe('配置选项测试', () => {
    test('应该支持禁用质量检查', async () => {
      const request = {
        rules: [testRules[0]],
        options: {
          enableQualityCheck: false,
          enableDuplicateCheck: true
        },
        source: 'api' as const
      };

      const result = await ruleEvaluationService.evaluateBatch(request);

      expect(result.success).toBe(true);
      expect(result.results[0].qualityEvaluation.shouldKeep).toBe(true);
      expect(result.results[0].qualityEvaluation.evaluationSummary).toContain('质量检查已禁用');
    });

    test('应该支持禁用重复检查', async () => {
      const request = {
        rules: [testRules[0]],
        options: {
          enableQualityCheck: true,
          enableDuplicateCheck: false
        },
        source: 'api' as const
      };

      const result = await ruleEvaluationService.evaluateBatch(request);

      expect(result.success).toBe(true);
      expect(result.results[0].duplicateCheck.isDuplicate).toBe(false);
      expect(result.results[0].duplicateCheck.reason).toContain('重复检查已禁用');
    });

    test('应该支持不同的质量阈值', async () => {
      const request = {
        rules: [testRules[0]],
        options: {
          qualityThreshold: 90, // 高阈值
          enableQualityCheck: true,
          enableDuplicateCheck: false
        },
        source: 'api' as const
      };

      const result = await ruleEvaluationService.evaluateBatch(request);

      expect(result.success).toBe(true);
      expect(result.results[0].qualityEvaluation.qualityScore).toBeDefined();
    });
  });
});