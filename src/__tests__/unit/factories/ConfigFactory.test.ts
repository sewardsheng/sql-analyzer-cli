/**
 * ConfigFactory 测试
 * 老王我先写测试，确保失败 (Red阶段)
 */

import { describe, it, expect } from 'vitest';

// 这里会失败，因为ConfigFactory还不存在
import {
  ConfigFactory,
  CacheFactory
} from '../../../services/factories/ConfigFactory.js';

describe('ConfigFactory', () => {
  describe('getServiceConfig', () => {
    it('应该返回默认服务配置', () => {
      const config = ConfigFactory.getServiceConfig();

      expect(config.enableCaching).toBe(true);
      expect(config.enableKnowledgeBase).toBe(true);
      expect(config.maxConcurrency).toBe(3);
      expect(config.cacheSize).toBe(1000);
      expect(config.timeout).toBe(30000);
    });

    it('应该合并用户配置', () => {
      const userConfig = {
        maxConcurrency: 5,
        cacheSize: 2000
      };

      const config = ConfigFactory.getServiceConfig(userConfig);

      expect(config.enableCaching).toBe(true);
      expect(config.enableKnowledgeBase).toBe(true);
      expect(config.maxConcurrency).toBe(5);
      expect(config.cacheSize).toBe(2000);
      expect(config.timeout).toBe(30000);
    });

    it('应该拒绝无效配置', () => {
      const invalidConfig = {
        maxConcurrency: -1
      };

      expect(() => {
        ConfigFactory.getServiceConfig(invalidConfig);
      }).toThrow('maxConcurrency不能为负数');
    });
  });

  describe('getAnalysisConfig', () => {
    it('应该返回默认分析配置', () => {
      const config = ConfigFactory.getAnalysisConfig();

      expect(config.performance).toBe(true);
      expect(config.security).toBe(true);
      expect(config.standards).toBe(true);
      expect(config.learn).toBe(false);
      expect(config.service.enableCaching).toBe(true);
      expect(config.service.enableKnowledgeBase).toBe(true);
      expect(config.service.maxConcurrency).toBe(3);
    });

    it('应该合并用户配置', () => {
      const userConfig = {
        learn: true,
        service: {
          maxConcurrency: 5
        }
      };

      const config = ConfigFactory.getAnalysisConfig(userConfig);

      expect(config.performance).toBe(true);
      expect(config.security).toBe(true);
      expect(config.standards).toBe(true);
      expect(config.learn).toBe(true);
      expect(config.service.maxConcurrency).toBe(5);
    });

    it('应该拒绝无效配置', () => {
      const invalidConfig = {
        service: {
          maxConcurrency: -1
        }
      };

      expect(() => {
        ConfigFactory.getAnalysisConfig(invalidConfig);
      }).toThrow('maxConcurrency不能为负数');
    });
  });

  describe('mergeConfig', () => {
    it('应该正确合并简单对象', () => {
      const defaultConfig = {
        a: 1,
        b: 2,
        c: 3
      };

      const userConfig = {
        b: 20,
        d: 4
      };

      const merged = ConfigFactory.mergeConfig(defaultConfig, userConfig);

      expect(merged).toEqual({
        a: 1,
        b: 20,
        c: 3,
        d: 4
      });
    });

    it('应该正确合并嵌套对象', () => {
      const defaultConfig = {
        a: 1,
        nested: {
          x: 10,
          y: 20
        }
      };

      const userConfig = {
        nested: {
          y: 200,
          z: 30
        }
      };

      const merged = ConfigFactory.mergeConfig(defaultConfig, userConfig);

      expect(merged).toEqual({
        a: 1,
        nested: {
          x: 10,
          y: 200,
          z: 30
        }
      });
    });
  });
});

describe('CacheFactory', () => {
  describe('getCacheConfig', () => {
    it('应该返回默认缓存配置', () => {
      const config = CacheFactory.getCacheConfig();

      expect(config.maxSize).toBe(1000);
      expect(config.ttl).toBe(300000);
      expect(config.enableLRU).toBe(true);
    });

    it('应该返回自定义缓存配置', () => {
      const config = CacheFactory.getCacheConfig(5000, 600000);

      expect(config.maxSize).toBe(5000);
      expect(config.ttl).toBe(600000);
      expect(config.enableLRU).toBe(true);
    });
  });
});