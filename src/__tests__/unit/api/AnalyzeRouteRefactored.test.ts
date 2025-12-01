/**
 * 重构后的API路由测试
 * 老王我测试重构后的API路由
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServiceContainer } from '../../../services/factories/ServiceContainer.js';

describe('API路由重构 (analyze.ts)', () => {
  let serviceContainer: ServiceContainer;

  beforeEach(() => {
    // 重置ServiceContainer单例
    ServiceContainer.resetInstance();

    // Mock console方法
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    ServiceContainer.resetInstance();
  });

  describe('ServiceContainer集成', () => {
    it('应该能够获取SQL分析器', () => {
      const container = ServiceContainer.getInstance();
      const analyzer = container.getSQLAnalyzer();

      expect(analyzer).toBeDefined();
      expect(typeof analyzer.analyzeSQL).toBe('function');
    });

    it('应该能够获取历史服务', async () => {
      const container = ServiceContainer.getInstance();
      const historyService = await container.getHistoryService();

      expect(historyService).toBeDefined();
      expect(typeof historyService.saveAnalysis).toBe('function');
    });

    it('应该能够获取文件分析服务', () => {
      const container = ServiceContainer.getInstance();
      const fileAnalyzer = container.getFileAnalyzerService();

      expect(fileAnalyzer).toBeDefined();
      expect(typeof fileAnalyzer.analyzeDirectory).toBe('function');
    });

    it('应该能够获取知识库服务', () => {
      const container = ServiceContainer.getInstance();
      const knowledgeService = container.getKnowledgeService();

      expect(knowledgeService).toBeDefined();
      expect(typeof knowledgeService.searchKnowledge).toBe('function');
    });

    it('应该能够获取结果格式化器', () => {
      const container = ServiceContainer.getInstance();
      const formatter = container.getResultFormatter();

      expect(formatter).toBeDefined();
      expect(typeof formatter.displaySummary).toBe('function');
    });
  });

  describe('配置管理', () => {
    it('应该使用正确的默认配置', () => {
      const container = ServiceContainer.getInstance();
      const serviceConfig = container.getServiceConfig();

      expect(serviceConfig.enableCaching).toBe(true);
      expect(serviceConfig.enableKnowledgeBase).toBe(true);
      expect(serviceConfig.maxConcurrency).toBe(3);
    });

    it('应该支持配置更新', () => {
      const container = ServiceContainer.getInstance();

      container.updateServiceConfig({
        maxConcurrency: 10,
        enableCaching: false,
        timeout: 60000
      });

      const updatedConfig = container.getServiceConfig();
      expect(updatedConfig.maxConcurrency).toBe(10);
      expect(updatedConfig.enableCaching).toBe(false);
      expect(updatedConfig.timeout).toBe(60000);
    });

    it('应该验证配置参数', () => {
      const container = ServiceContainer.getInstance();

      expect(() => {
        container.updateServiceConfig({
          maxConcurrency: -1 // 无效配置
        });
      }).toThrow('maxConcurrency不能为负数');
    });
  });

  describe('服务复用', () => {
    it('应该复用SQL分析器实例', () => {
      const container = ServiceContainer.getInstance();
      const analyzer1 = container.getSQLAnalyzer();
      const analyzer2 = container.getSQLAnalyzer();

      expect(analyzer1).toBe(analyzer2);
    });

    it('应该复用文件分析服务实例', () => {
      const container = ServiceContainer.getInstance();
      const service1 = container.getFileAnalyzerService();
      const service2 = container.getFileAnalyzerService();

      expect(service1).toBe(service2);
    });
  });

  describe('环境配置', () => {
    it('应该支持创建测试环境配置', () => {
      const testContainer = ServiceContainer.createTestContainer();
      const testConfig = testContainer.getServiceConfig();

      expect(testConfig.enableCaching).toBe(false);
      expect(testConfig.maxConcurrency).toBe(1);
    });

    it('应该支持创建生产环境配置', () => {
      const prodContainer = ServiceContainer.createProdContainer();
      const prodConfig = prodContainer.getServiceConfig();

      expect(prodConfig.enableCaching).toBe(true);
      expect(prodConfig.maxConcurrency).toBe(5);
      expect(prodConfig.cacheSize).toBe(10000);
    });
  });

  describe('状态管理', () => {
    it('应该能够获取服务状态', () => {
      const container = ServiceContainer.getInstance();
      const status = container.getServiceStatus();

      expect(status).toHaveProperty('servicesCount');
      expect(status).toHaveProperty('loadedServices');
      expect(status).toHaveProperty('serviceConfig');
      expect(status).toHaveProperty('analysisConfig');
    });
  });
});