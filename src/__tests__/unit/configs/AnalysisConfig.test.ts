/**
 * AnalysisConfig 测试
 * 老王我先写测试，确保失败 (Red阶段)
 */

import { describe, it, expect } from 'vitest';

// 这里会失败，因为AnalysisConfig还不存在
import {
  AnalysisConfig,
  DEFAULT_ANALYSIS_CONFIG,
  validateAnalysisConfig,
  mergeAnalysisConfig
} from '../../../services/configs/AnalysisConfig.js';

describe('AnalysisConfig', () => {
  describe('DEFAULT_ANALYSIS_CONFIG', () => {
    it('应该有正确的默认配置', () => {
      const config = DEFAULT_ANALYSIS_CONFIG;

      expect(config.performance).toBe(true);
      expect(config.security).toBe(true);
      expect(config.standards).toBe(true);
      expect(config.learn).toBe(false);
      expect(config.service.enableCaching).toBe(true);
      expect(config.service.enableKnowledgeBase).toBe(true);
      expect(config.service.maxConcurrency).toBe(3);
    });

    it('应该是不可变的', () => {
      const originalConfig = { ...DEFAULT_ANALYSIS_CONFIG };

      expect(() => {
        // @ts-ignore - 故意尝试修改只读对象
        DEFAULT_ANALYSIS_CONFIG.performance = false;
      }).toThrow();

      expect(DEFAULT_ANALYSIS_CONFIG.performance).toBe(originalConfig.performance);
    });
  });

  describe('AnalysisConfig接口', () => {
    it('应该支持有效的配置对象', () => {
      const validConfig: AnalysisConfig = {
        performance: true,
        security: true,
        standards: true,
        learn: true,
        service: {
          enableCaching: true,
          enableKnowledgeBase: true,
          maxConcurrency: 5,
          cacheSize: 2000,
          timeout: 60000
        }
      };

      expect(validConfig.performance).toBe(true);
      expect(validConfig.security).toBe(true);
      expect(validConfig.standards).toBe(true);
      expect(validConfig.learn).toBe(true);
      expect(validConfig.service.maxConcurrency).toBe(5);
    });
  });

  describe('validateAnalysisConfig', () => {
    it('应该通过有效的配置', () => {
      const validConfig: AnalysisConfig = {
        performance: true,
        security: true,
        standards: true,
        learn: false,
        service: {
          enableCaching: true,
          enableKnowledgeBase: true,
          maxConcurrency: 3
        }
      };

      expect(() => {
        validateAnalysisConfig(validConfig);
      }).not.toThrow();
    });

    it('应该拒绝无效的服务配置', () => {
      const invalidConfig: AnalysisConfig = {
        performance: true,
        security: true,
        standards: true,
        learn: false,
        service: {
          enableCaching: true,
          enableKnowledgeBase: true,
          maxConcurrency: -1 // 无效的并发数
        }
      };

      expect(() => {
        validateAnalysisConfig(invalidConfig);
      }).toThrow('maxConcurrency不能为负数');
    });
  });

  describe('mergeAnalysisConfig', () => {
    it('应该正确合并配置', () => {
      const defaultConfig: AnalysisConfig = {
        performance: true,
        security: true,
        standards: true,
        learn: false,
        service: {
          enableCaching: true,
          enableKnowledgeBase: true,
          maxConcurrency: 3,
          cacheSize: 1000,
          timeout: 30000
        }
      };

      const userConfig = {
        learn: true,
        service: {
          maxConcurrency: 5,
          cacheSize: 2000
        }
      };

      const merged = mergeAnalysisConfig(defaultConfig, userConfig);

      expect(merged.performance).toBe(true);
      expect(merged.security).toBe(true);
      expect(merged.standards).toBe(true);
      expect(merged.learn).toBe(true);
      expect(merged.service.enableCaching).toBe(true);
      expect(merged.service.enableKnowledgeBase).toBe(true);
      expect(merged.service.maxConcurrency).toBe(5);
      expect(merged.service.cacheSize).toBe(2000);
      expect(merged.service.timeout).toBe(30000);
    });

    it('应该在合并时验证配置', () => {
      const defaultConfig: AnalysisConfig = {
        performance: true,
        security: true,
        standards: true,
        learn: false,
        service: {
          enableCaching: true,
          enableKnowledgeBase: true,
          maxConcurrency: 3
        }
      };

      const userConfig = {
        service: {
          maxConcurrency: -1
        }
      };

      expect(() => {
        mergeAnalysisConfig(defaultConfig, userConfig);
      }).toThrow('maxConcurrency不能为负数');
    });
  });
});