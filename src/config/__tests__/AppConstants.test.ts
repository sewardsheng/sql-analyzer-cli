/**
 * AppConstants配置测试
 * 测试配置集中化管理功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { APP_CONFIG, getConfig, validateConfig } from '../AppConstants.js';

describe('AppConstants - 配置管理测试', () => {
  beforeEach(() => {
    // 重置配置状态（如果需要）
  });

  afterEach(() => {
    // 清理配置状态
  });

  describe('评分系统配置', () => {
    it('应该包含完整的评分阈值配置', () => {
      expect(APP_CONFIG.SCORING.QUALITY_THRESHOLDS).toBeDefined();
      expect(APP_CONFIG.SCORING.QUALITY_THRESHOLDS.EXCELLENT).toBe(90);
      expect(APP_CONFIG.SCORING.QUALITY_THRESHOLDS.GOOD).toBe(80);
      expect(APP_CONFIG.SCORING.QUALITY_THRESHOLDS.AVERAGE).toBe(70);
      expect(APP_CONFIG.SCORING.QUALITY_THRESHOLDS.POOR).toBe(60);
      expect(APP_CONFIG.SCORING.QUALITY_THRESHOLDS.MINIMUM).toBe(40);
    });

    it('应该包含默认评分配置', () => {
      expect(APP_CONFIG.SCORING.DEFAULT_SCORES).toBeDefined();
      expect(APP_CONFIG.SCORING.DEFAULT_SCORES.BASE).toBe(50);
      expect(APP_CONFIG.SCORING.DEFAULT_SCORES.RULE_GENERATION).toBe(70);
      expect(APP_CONFIG.SCORING.DEFAULT_SCORES.LLM_EVALUATION).toBe(70);
      expect(APP_CONFIG.SCORING.DEFAULT_SCORES.MIN_ADJUSTED).toBe(60);
    });

    it('应该包含评分调整配置', () => {
      expect(APP_CONFIG.SCORING.SCORE_ADJUSTMENTS).toBeDefined();
      expect(APP_CONFIG.SCORING.SCORE_ADJUSTMENTS.MINIMUM_BONUS).toBe(15);
      expect(APP_CONFIG.SCORING.SCORE_ADJUSTMENTS.BASE_FLOOR).toBe(60);
      expect(APP_CONFIG.SCORING.SCORE_ADJUSTMENTS.AUTO_APPROVE).toBe(80);
    });

    it('应该包含字段扣分规则', () => {
      expect(APP_CONFIG.SCORING.FIELD_PENALTIES).toBeDefined();
      expect(APP_CONFIG.SCORING.FIELD_PENALTIES.MISSING_CRITICAL).toBe(20);
      expect(APP_CONFIG.SCORING.FIELD_PENALTIES.MISSING_IMPORTANT).toBe(15);
      expect(APP_CONFIG.SCORING.FIELD_PENALTIES.MISSING_MINOR).toBe(10);
      expect(APP_CONFIG.SCORING.FIELD_PENALTIES.QUALITY_ISSUE).toBe(10);
    });
  });

  describe('规则管理配置', () => {
    it('应该包含文件分类阈值配置', () => {
      expect(APP_CONFIG.RULE_MANAGEMENT.CLASSIFICATION_THRESHOLDS).toBeDefined();
      expect(APP_CONFIG.RULE_MANAGEMENT.CLASSIFICATION_THRESHOLDS.APPROVED).toBe(85);
      expect(APP_CONFIG.RULE_MANAGEMENT.CLASSIFICATION_THRESHOLDS.MANUAL_REVIEW).toBe(65);
      expect(APP_CONFIG.RULE_MANAGEMENT.CLASSIFICATION_THRESHOLDS.LOW_QUALITY).toBe(0);
    });

    it('应该包含规则验证配置', () => {
      expect(APP_CONFIG.RULE_MANAGEMENT.VALIDATION).toBeDefined();
      expect(APP_CONFIG.RULE_MANAGEMENT.VALIDATION.MAX_RULES_PER_BATCH).toBe(10);
      expect(APP_CONFIG.RULE_MANAGEMENT.VALIDATION.MIN_SQL_LENGTH).toBe(10);
      expect(APP_CONFIG.RULE_MANAGEMENT.VALIDATION.MAX_RULE_LENGTH).toBe(5000);
    });
  });

  describe('系统性能配置', () => {
    it('应该包含批处理配置', () => {
      expect(APP_CONFIG.PERFORMANCE.BATCH).toBeDefined();
      expect(APP_CONFIG.PERFORMANCE.BATCH.DEFAULT_SIZE).toBe(10);
      expect(APP_CONFIG.PERFORMANCE.BATCH.MAX_SIZE).toBe(50);
      expect(APP_CONFIG.PERFORMANCE.BATCH.MAX_FILE_SIZE).toBe(10485760); // 10MB
    });

    it('应该包含缓存配置', () => {
      expect(APP_CONFIG.PERFORMANCE.CACHE).toBeDefined();
      expect(APP_CONFIG.PERFORMANCE.CACHE.TIMEOUT).toBe(1800000); // 30分钟
      expect(APP_CONFIG.PERFORMANCE.CACHE.MAX_SIZE).toBe(1000);
      expect(APP_CONFIG.PERFORMANCE.CACHE.CLEANUP_INTERVAL).toBe(30000); // 30秒
    });

    it('应该包含并发配置', () => {
      expect(APP_CONFIG.PERFORMANCE.CONCURRENCY).toBeDefined();
      expect(APP_CONFIG.PERFORMANCE.CONCURRENCY.DEFAULT).toBe(3);
      expect(APP_CONFIG.PERFORMANCE.CONCURRENCY.MAX).toBe(10);
    });
  });

  describe('API和接口配置', () => {
    it('应该包含分页配置', () => {
      expect(APP_CONFIG.API.PAGINATION).toBeDefined();
      expect(APP_CONFIG.API.PAGINATION.DEFAULT_PAGE_SIZE).toBe(10);
      expect(APP_CONFIG.API.PAGINATION.MAX_PAGE_SIZE).toBe(100);
    });

    it('应该包含请求限制配置', () => {
      expect(APP_CONFIG.API.REQUEST_LIMITS).toBeDefined();
      expect(APP_CONFIG.API.REQUEST_LIMITS.MAX_SQL_LENGTH).toBe(50000);
      expect(APP_CONFIG.API.REQUEST_LIMITS.MAX_BATCH_SIZE).toBe(50);
      expect(APP_CONFIG.API.REQUEST_LIMITS.MAX_INPUT_LENGTH).toBe(1000);
      expect(APP_CONFIG.API.REQUEST_LIMITS.MAX_BODY_PREVIEW).toBe(100);
    });

    it('应该包含响应配置', () => {
      expect(APP_CONFIG.API.RESPONSE).toBeDefined();
      expect(APP_CONFIG.API.RESPONSE.DEFAULT_CONFIDENCE).toBe(0.85);
      expect(APP_CONFIG.API.RESPONSE.TIMEOUT_OFFSET).toBe(100);
    });
  });

  describe('日志和监控配置', () => {
    it('应该包含文件配置', () => {
      expect(APP_CONFIG.LOGGING.FILES).toBeDefined();
      expect(APP_CONFIG.LOGGING.FILES.MAX_SIZE).toBe(10485760); // 10MB
      expect(APP_CONFIG.LOGGING.FILES.MAX_FILES).toBe(10);
      expect(APP_CONFIG.LOGGING.FILES.RETENTION_HOURS).toBe(48);
    });

    it('应该包含缓冲区配置', () => {
      expect(APP_CONFIG.LOGGING.BUFFER).toBeDefined();
      expect(APP_CONFIG.LOGGING.BUFFER.MAX_SIZE).toBe(1000);
      expect(APP_CONFIG.LOGGING.BUFFER.TRIM_SIZE).toBe(500);
      expect(APP_CONFIG.LOGGING.BUFFER.AGGREGATION_INTERVAL).toBe(300000); // 5分钟
      expect(APP_CONFIG.LOGGING.BUFFER.MIN_AGGREGATION_LOGS).toBe(10);
    });

    it('应该包含性能监控配置', () => {
      expect(APP_CONFIG.LOGGING.PERFORMANCE).toBeDefined();
      expect(APP_CONFIG.LOGGING.PERFORMANCE.COLLECTION_INTERVAL).toBe(30000); // 30秒
      expect(APP_CONFIG.LOGGING.PERFORMANCE.MAX_METRICS).toBe(100);
      expect(APP_CONFIG.LOGGING.PERFORMANCE.SAMPLE_SIZE).toBe(10);
    });
  });

  describe('网络和服务器配置', () => {
    it('应该包含端口配置', () => {
      expect(APP_CONFIG.NETWORK.PORTS).toBeDefined();
      expect(APP_CONFIG.NETWORK.PORTS.DEFAULT_API).toBe(3000);
      expect(APP_CONFIG.NETWORK.PORTS.HEALTH_CHECK).toBe(8080);
    });

    it('应该包含连接配置', () => {
      expect(APP_CONFIG.NETWORK.CONNECTION).toBeDefined();
      expect(APP_CONFIG.NETWORK.CONNECTION.MAX_ATTEMPTS).toBe(50);
      expect(APP_CONFIG.NETWORK.CONNECTION.TIMEOUT).toBe(30000); // 30秒
      expect(APP_CONFIG.NETWORK.CONNECTION.RETRY_DELAY).toBe(1000); // 1秒
    });
  });

  describe('安全配置', () => {
    it('应该包含限流配置', () => {
      expect(APP_CONFIG.SECURITY.RATE_LIMITING).toBeDefined();
      expect(APP_CONFIG.SECURITY.RATE_LIMITING.DEFAULT_WINDOW).toBe(900000); // 15分钟
      expect(APP_CONFIG.SECURITY.RATE_LIMITING.DEFAULT_MAX).toBe(100);
      expect(APP_CONFIG.SECURITY.RATE_LIMITING.ANALYSIS_WINDOW).toBe(600000); // 10分钟
      expect(APP_CONFIG.SECURITY.RATE_LIMITING.ANALYSIS_MAX).toBe(20);
      expect(APP_CONFIG.SECURITY.RATE_LIMITING.ADMIN_WINDOW).toBe(300000); // 5分钟
      expect(APP_CONFIG.SECURITY.RATE_LIMITING.ADMIN_MAX).toBe(200);
    });

    it('应该包含CORS配置', () => {
      expect(APP_CONFIG.SECURITY.CORS).toBeDefined();
      expect(APP_CONFIG.SECURITY.CORS.MAX_AGE).toBe(600);
    });
  });

  describe('数据库识别配置', () => {
    it('应该包含置信度配置', () => {
      expect(APP_CONFIG.DATABASE.CONFIDENCE).toBeDefined();
      expect(APP_CONFIG.DATABASE.CONFIDENCE.BASE).toBe(0.4);
      expect(APP_CONFIG.DATABASE.CONFIDENCE.MULTIPLIER).toBe(0.15);
      expect(APP_CONFIG.DATABASE.CONFIDENCE.MAX).toBe(0.9);
    });

    it('应该包含上下文加分配置', () => {
      expect(APP_CONFIG.DATABASE.CONTEXT_BONUS).toBe(10);
    });
  });

  describe('规则学习配置', () => {
    it('应该包含默认配置', () => {
      expect(APP_CONFIG.RULE_LEARNING.DEFAULTS).toBeDefined();
      expect(APP_CONFIG.RULE_LEARNING.DEFAULTS.MIN_CONFIDENCE).toBe(0.7);
      expect(APP_CONFIG.RULE_LEARNING.DEFAULTS.MIN_BATCH_SIZE).toBe(5);
      expect(APP_CONFIG.RULE_LEARNING.DEFAULTS.AUTO_APPROVE_THRESHOLD).toBe(80);
    });

    it('应该包含质量权重配置', () => {
      expect(APP_CONFIG.RULE_LEARNING.QUALITY_WEIGHTS).toBeDefined();
      expect(APP_CONFIG.RULE_LEARNING.QUALITY_WEIGHTS.CLARITY).toBe(0.95);
      expect(APP_CONFIG.RULE_LEARNING.QUALITY_WEIGHTS.CONSISTENCY).toBe(0.9);
    });
  });

  describe('getConfig函数', () => {
    it('应该正确获取现有配置值', () => {
      const result = getConfig('SCORING.QUALITY_THRESHOLDS.EXCELLENT');
      expect(result).toBe(90);
    });

    it('应该返回默认值当配置不存在', () => {
      const result = getConfig('NON_EXISTENT.PATH', 'default-value');
      expect(result).toBe('default-value');
    });

    it('应该处理嵌套路径', () => {
      const result = getConfig('API.REQUEST_LIMITS.MAX_BATCH_SIZE');
      expect(result).toBe(50);
    });

    it('应该处理深层嵌套路径', () => {
      const result = getConfig('LOGGING.PERFORMANCE.COLLECTION_INTERVAL');
      expect(result).toBe(30000);
    });
  });

  describe('validateConfig函数', () => {
    it('应该验证必需的配置路径存在', () => {
      expect(() => validateConfig()).not.toThrow();
    });

    it('应该验证配置值的类型正确', () => {
      const thresholds = getConfig('SCORING.QUALITY_THRESHOLDS');
      expect(typeof thresholds.EXCELLENT).toBe('number');
      expect(typeof thresholds.GOOD).toBe('number');
      expect(typeof thresholds.AVERAGE).toBe('number');
      expect(typeof thresholds.POOR).toBe('number');
      expect(typeof thresholds.MINIMUM).toBe('number');
    });

    it('应该验证数值配置在合理范围内', () => {
      const thresholds = getConfig('SCORING.QUALITY_THRESHOLDS');
      expect(thresholds.EXCELLENT).toBeGreaterThan(thresholds.GOOD);
      expect(thresholds.GOOD).toBeGreaterThan(thresholds.AVERAGE);
      expect(thresholds.AVERAGE).toBeGreaterThan(thresholds.POOR);
      expect(thresholds.POOR).toBeGreaterThan(thresholds.MINIMUM);

      expect(thresholds.EXCELLENT).toBeLessThanOrEqual(100);
      expect(thresholds.MINIMUM).toBeGreaterThanOrEqual(0);
    });

    it('应该验证布尔配置', () => {
      const apiConfig = getConfig('API.PAGINATION');
      expect(typeof apiConfig.DEFAULT_PAGE_SIZE).toBe('number');
      expect(typeof apiConfig.MAX_PAGE_SIZE).toBe('number');
    });
  });

  describe('配置值类型和范围验证', () => {
    it('评分阈值应该为有效的百分比', () => {
      const thresholds = APP_CONFIG.SCORING.QUALITY_THRESHOLDS;

      for (const [key, value] of Object.entries(thresholds)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    });

    it('文件大小应该为合理的数值', () => {
      expect(APP_CONFIG.PERFORMANCE.BATCH.MAX_FILE_SIZE).toBeGreaterThan(0);
      expect(APP_CONFIG.LOGGING.FILES.MAX_SIZE).toBeGreaterThan(0);
      expect(APP_CONFIG.API.REQUEST_LIMITS.MAX_SQL_LENGTH).toBeGreaterThan(0);
    });

    it('时间配置应该为合理的毫秒数', () => {
      expect(APP_CONFIG.PERFORMANCE.CACHE.TIMEOUT).toBeGreaterThan(0);
      expect(APP_CONFIG.NETWORK.CONNECTION.TIMEOUT).toBeGreaterThan(0);
      expect(APP_CONFIG.LOGGING.BUFFER.AGGREGATION_INTERVAL).toBeGreaterThan(0);
    });

    it('端口配置应该在有效范围内', () => {
      expect(APP_CONFIG.NETWORK.PORTS.DEFAULT_API).toBeGreaterThan(0);
      expect(APP_CONFIG.NETWORK.PORTS.DEFAULT_API).toBeLessThan(65536);
      expect(APP_CONFIG.NETWORK.PORTS.HEALTH_CHECK).toBeGreaterThan(0);
      expect(APP_CONFIG.NETWORK.PORTS.HEALTH_CHECK).toBeLessThan(65536);
    });
  });

  describe('配置一致性验证', () => {
    it('最大值应该大于默认值', () => {
      expect(APP_CONFIG.PERFORMANCE.BATCH.MAX_SIZE).toBeGreaterThan(
        APP_CONFIG.PERFORMANCE.BATCH.DEFAULT_SIZE
      );
      expect(APP_CONFIG.API.PAGINATION.MAX_PAGE_SIZE).toBeGreaterThan(
        APP_CONFIG.API.PAGINATION.DEFAULT_PAGE_SIZE
      );
    });

    it('缓存相关配置应该合理', () => {
      expect(APP_CONFIG.PERFORMANCE.CACHE.MAX_SIZE).toBeGreaterThan(0);
      expect(APP_CONFIG.PERFORMANCE.CACHE.CLEANUP_INTERVAL).toBeGreaterThan(0);
      expect(APP_CONFIG.LOGGING.BUFFER.MAX_SIZE).toBeGreaterThan(
        APP_CONFIG.LOGGING.BUFFER.TRIM_SIZE
      );
    });

    it('限流配置应该合理', () => {
      expect(APP_CONFIG.SECURITY.RATE_LIMITING.DEFAULT_MAX).toBeGreaterThan(0);
      expect(APP_CONFIG.SECURITY.RATE_LIMITING.DEFAULT_WINDOW).toBeGreaterThan(0);
      expect(APP_CONFIG.SECURITY.RATE_LIMITING.ADMIN_MAX).toBeGreaterThan(
        APP_CONFIG.SECURITY.RATE_LIMITING.ANALYSIS_MAX
      );
    });
  });

  describe('边界条件和错误处理', () => {
    it('应该处理不存在的配置路径', () => {
      const result = getConfig('PATH.DOES.NOT.EXIST', 'fallback');
      expect(result).toBe('fallback');
    });

    it('应该处理null和undefined默认值', () => {
      const result1 = getConfig('PATH.DOES.NOT.EXIST', null);
      const result2 = getConfig('PATH.DOES.NOT.EXIST', undefined);

      expect(result1).toBe(null);
      expect(result2).toBe(undefined);
    });

    it('应该处理空字符串路径', () => {
      const result = getConfig('', 'fallback');
      expect(result).toBe('fallback');
    });
  });

  describe('配置的可扩展性', () => {
    it('应该支持动态添加配置', () => {
      // 测试是否可以添加新的配置属性
      const testConfig = { ...APP_CONFIG };
      testConfig.TEST_SECTION = {
        TEST_VALUE: 'test-data',
        TEST_NUMBER: 42
      };

      expect(testConfig.TEST_SECTION.TEST_VALUE).toBe('test-data');
      expect(testConfig.TEST_SECTION.TEST_NUMBER).toBe(42);
    });

    it('应该保持向后兼容性', () => {
      // 确保所有现有配置路径仍然有效
      expect(() => {
        getConfig('SCORING.QUALITY_THRESHOLDS.EXCELLENT');
        getConfig('PERFORMANCE.BATCH.DEFAULT_SIZE');
        getConfig('API.PAGINATION.DEFAULT_PAGE_SIZE');
        getConfig('LOGGING.FILES.MAX_SIZE');
        getConfig('NETWORK.PORTS.DEFAULT_API');
        getConfig('SECURITY.RATE_LIMITING.DEFAULT_MAX');
      }).not.toThrow();
    });
  });

  describe('配置值的业务逻辑验证', () => {
    it('规则分类阈值应该有合理的间隔', () => {
      const thresholds = APP_CONFIG.RULE_MANAGEMENT.CLASSIFICATION_THRESHOLDS;
      const gap1 = thresholds.APPROVED - thresholds.MANUAL_REVIEW;
      const gap2 = thresholds.MANUAL_REVIEW - thresholds.LOW_QUALITY;

      expect(gap1).toBeGreaterThan(10); // 至少10分的间隔
      expect(gap2).toBeGreaterThan(10);
    });

    it('批处理大小应该合理', () => {
      expect(APP_CONFIG.PERFORMANCE.BATCH.DEFAULT_SIZE).toBeLessThan(50);
      expect(APP_CONFIG.PERFORMANCE.BATCH.DEFAULT_SIZE).toBeGreaterThan(1);
      expect(APP_CONFIG.API.REQUEST_LIMITS.MAX_BATCH_SIZE).toBeLessThan(100);
    });

    it('缓存超时时间应该合理', () => {
      const cacheTimeout = APP_CONFIG.PERFORMANCE.CACHE.TIMEOUT;
      expect(cacheTimeout).toBeGreaterThan(60000); // 至少1分钟
      expect(cacheTimeout).toBeLessThan(7200000); // 不超过2小时
    });

    it('重试次数应该是合理的数值', () => {
      expect(APP_CONFIG.NETWORK.CONNECTION.MAX_ATTEMPTS).toBeGreaterThan(1);
      expect(APP_CONFIG.NETWORK.CONNECTION.MAX_ATTEMPTS).toBeLessThan(100);
    });
  });
});