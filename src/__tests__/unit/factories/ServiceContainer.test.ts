/**
 * ServiceContainer 测试
 * 老王我先写测试，确保失败 (Red阶段)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// 这里会失败，因为ServiceContainer还不存在
import { ServiceContainer } from '../../../services/factories/ServiceContainer.js';

describe('ServiceContainer', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    // 清理单例实例
    ServiceContainer.resetInstance();
    container = ServiceContainer.getInstance();
  });

  afterEach(() => {
    // 清理服务
    container.cleanup();
    ServiceContainer.resetInstance();
  });

  describe('单例模式', () => {
    it('应该返回相同的实例', () => {
      const container1 = ServiceContainer.getInstance();
      const container2 = ServiceContainer.getInstance();

      expect(container1).toBe(container2);
    });

    it('resetInstance应该创建新实例', () => {
      const container1 = ServiceContainer.getInstance();
      ServiceContainer.resetInstance();
      const container2 = ServiceContainer.getInstance();

      expect(container1).not.toBe(container2);
    });
  });

  describe('服务获取', () => {
    it('getSQLAnalyzer应该返回SQL分析器实例', () => {
      const analyzer = container.getSQLAnalyzer();

      expect(analyzer).toBeDefined();
      expect(typeof analyzer.analyzeSQL).toBe('function');
    });

    it('getFileAnalyzerService应该返回文件分析服务实例', () => {
      const fileAnalyzer = container.getFileAnalyzerService();

      expect(fileAnalyzer).toBeDefined();
      expect(typeof fileAnalyzer.analyzeDirectory).toBe('function');
      expect(typeof fileAnalyzer.analyzeFile).toBe('function');
    });

    it('getHistoryService应该返回历史服务实例', async () => {
      const historyService = await container.getHistoryService();

      expect(historyService).toBeDefined();
      expect(typeof historyService.saveAnalysis).toBe('function');
      expect(typeof historyService.getAllHistory).toBe('function');
    });

    it('getKnowledgeService应该返回知识库服务实例', () => {
      const knowledgeService = container.getKnowledgeService();

      expect(knowledgeService).toBeDefined();
      expect(typeof knowledgeService.searchKnowledge).toBe('function');
      expect(typeof knowledgeService.learnDocuments).toBe('function');
    });

    it('getResultFormatter应该返回结果格式化器实例', () => {
      const formatter = container.getResultFormatter();

      expect(formatter).toBeDefined();
      expect(typeof formatter.displaySummary).toBe('function');
      expect(typeof formatter.displayIssues).toBe('function');
    });
  });

  describe('服务复用', () => {
    it('应该复用相同的服务实例', () => {
      const analyzer1 = container.getSQLAnalyzer();
      const analyzer2 = container.getSQLAnalyzer();

      expect(analyzer1).toBe(analyzer2);
    });

    it('应该复用文件分析服务', () => {
      const service1 = container.getFileAnalyzerService();
      const service2 = container.getFileAnalyzerService();

      expect(service1).toBe(service2);
    });

    it('应该复用历史服务', async () => {
      const service1 = await container.getHistoryService();
      const service2 = await container.getHistoryService();

      expect(service1).toBe(service2);
    });
  });

  describe('配置管理', () => {
    it('应该使用默认配置', () => {
      const analyzer = container.getSQLAnalyzer();
      expect(analyzer).toBeDefined();
    });

    it('应该支持自定义配置', () => {
      const customContainer = ServiceContainer.getInstance();
      const customConfig = {
        maxConcurrency: 5,
        enableCaching: false
      };

      customContainer.updateServiceConfig(customConfig);
      const analyzer = customContainer.getSQLAnalyzer();

      expect(analyzer).toBeDefined();
    });
  });

  describe('生命周期管理', () => {
    it('cleanup应该清理所有服务', () => {
      // 创建一些服务
      container.getSQLAnalyzer();
      container.getFileAnalyzerService();
      container.getHistoryService();

      // 清理
      container.cleanup();

      // 服务应该仍然可用，但会重新创建
      const newAnalyzer = container.getSQLAnalyzer();
      expect(newAnalyzer).toBeDefined();
    });

    it('清理后创建的服务应该是新实例', () => {
      const analyzer1 = container.getSQLAnalyzer();
      container.cleanup();
      const analyzer2 = container.getSQLAnalyzer();

      expect(analyzer1).not.toBe(analyzer2);
    });
  });

  describe('规则评估服务', () => {
    it('getRuleEvaluationService应该返回规则评估服务实例', () => {
      const ruleEvaluationService = container.getRuleEvaluationService();

      expect(ruleEvaluationService).toBeDefined();
      expect(typeof ruleEvaluationService.evaluateBatch).toBe('function');
      expect(typeof ruleEvaluationService.evaluateSingle).toBe('function');
    });

    it('应该复用规则评估服务', () => {
      const service1 = container.getRuleEvaluationService();
      const service2 = container.getRuleEvaluationService();

      expect(service1).toBe(service2);
    });

    it('清理后仍然返回相同的规则评估服务实例（单例模式）', () => {
      const service1 = container.getRuleEvaluationService();
      container.cleanup();
      const service2 = container.getRuleEvaluationService();

      // RuleEvaluationService使用静态单例模式，cleanup不会重置它
      expect(service1).toBe(service2);
    });
  });
});