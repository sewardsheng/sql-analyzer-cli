/**
 * ServiceConfig 测试
 * 老王我先写测试，确保失败 (Red阶段)
 */

import { describe, it, expect } from 'vitest';

// 这里会失败，因为ServiceConfig还不存在
import {
  ServiceConfig,
  DEFAULT_SERVICE_CONFIG,
  validateServiceConfig,
  mergeServiceConfig
} from '../../../services/configs/ServiceConfig.js';

describe('ServiceConfig', () => {
  describe('DEFAULT_SERVICE_CONFIG', () => {
    it('应该有正确的默认配置', () => {
      const config = DEFAULT_SERVICE_CONFIG;

      expect(config.enableCaching).toBe(true);
      expect(config.enableKnowledgeBase).toBe(true);
      expect(config.maxConcurrency).toBe(3);
      expect(config.cacheSize).toBe(1000);
      expect(config.timeout).toBe(30000);
    });

    it('应该是不可变的', () => {
      const originalConfig = { ...DEFAULT_SERVICE_CONFIG };

      // 尝试修改默认配置应该抛出错误
      expect(() => {
        // @ts-ignore - 故意尝试修改只读对象
        DEFAULT_SERVICE_CONFIG.enableCaching = false;
      }).toThrow();

      // 配置应该保持原值
      expect(DEFAULT_SERVICE_CONFIG.enableCaching).toBe(originalConfig.enableCaching);
    });
  });

  describe('ServiceConfig接口', () => {
    it('应该支持有效的配置对象', () => {
      const validConfig: ServiceConfig = {
        enableCaching: true,
        enableKnowledgeBase: true,
        maxConcurrency: 5,
        cacheSize: 2000,
        timeout: 60000
      };

      expect(validConfig.enableCaching).toBe(true);
      expect(validConfig.enableKnowledgeBase).toBe(true);
      expect(validConfig.maxConcurrency).toBe(5);
      expect(validConfig.cacheSize).toBe(2000);
      expect(validConfig.timeout).toBe(60000);
    });

    it('应该支持可选字段', () => {
      const minimalConfig: ServiceConfig = {
        enableCaching: false,
        enableKnowledgeBase: false,
        maxConcurrency: 1
      };

      expect(minimalConfig.cacheSize).toBeUndefined();
      expect(minimalConfig.timeout).toBeUndefined();
    });
  });

  describe('配置验证', () => {
    it('validateServiceConfig应该拒绝负数的maxConcurrency', () => {
      const invalidConfig = {
        enableCaching: true,
        enableKnowledgeBase: true,
        maxConcurrency: -1
      };

      expect(() => {
        validateServiceConfig(invalidConfig);
      }).toThrow('maxConcurrency不能为负数');
    });

    it('validateServiceConfig应该拒绝负数的cacheSize', () => {
      const invalidConfig = {
        enableCaching: true,
        enableKnowledgeBase: true,
        maxConcurrency: 3,
        cacheSize: -100
      };

      expect(() => {
        validateServiceConfig(invalidConfig);
      }).toThrow('cacheSize不能为负数');
    });

    it('validateServiceConfig应该拒绝负数的timeout', () => {
      const invalidConfig = {
        enableCaching: true,
        enableKnowledgeBase: true,
        maxConcurrency: 3,
        timeout: -1000
      };

      expect(() => {
        validateServiceConfig(invalidConfig);
      }).toThrow('timeout不能为负数');
    });
  });

  describe('mergeServiceConfig', () => {
    it('应该正确合并配置', () => {
      const defaultConfig: ServiceConfig = {
        enableCaching: true,
        enableKnowledgeBase: true,
        maxConcurrency: 3,
        cacheSize: 1000,
        timeout: 30000
      };

      const userConfig = {
        maxConcurrency: 5,
        cacheSize: 2000
      };

      const merged = mergeServiceConfig(defaultConfig, userConfig);

      expect(merged.enableCaching).toBe(true);
      expect(merged.enableKnowledgeBase).toBe(true);
      expect(merged.maxConcurrency).toBe(5);
      expect(merged.cacheSize).toBe(2000);
      expect(merged.timeout).toBe(30000);
    });

    it('应该在合并时验证配置', () => {
      const defaultConfig: ServiceConfig = {
        enableCaching: true,
        enableKnowledgeBase: true,
        maxConcurrency: 3
      };

      const userConfig = {
        maxConcurrency: -1
      };

      expect(() => {
        mergeServiceConfig(defaultConfig, userConfig);
      }).toThrow('maxConcurrency不能为负数');
    });
  });
});