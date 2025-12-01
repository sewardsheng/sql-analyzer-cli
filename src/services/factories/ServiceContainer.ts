/**
 * 服务容器 - 统一服务管理
 * 解决重复代码问题，提供统一的服务实例管理
 */

import { SQLAnalyzer } from '../../core/SQLAnalyzer.js';
import { FileAnalyzerService } from '../FileAnalyzerService.js';
import { getHistoryService } from '../history-service-impl.js';
import { KnowledgeService } from '../knowledge-service.js';
import { resultFormatter } from '../../utils/formatter.js';
import { ConfigFactory } from './ConfigFactory.js';
import { ServiceConfig } from '../configs/ServiceConfig.js';
import { AnalysisConfig } from '../configs/AnalysisConfig.js';
import { ISQLAnalyzer, IFileAnalyzerService, IHistoryService, IKnowledgeService } from '../interfaces/ServiceInterfaces.js';
import { RuleEvaluationService } from '../rule-evaluation/RuleEvaluationService.js';

/**
 * 服务容器类
 * 使用单例模式统一管理所有服务实例
 */
export class ServiceContainer {
  private static instance: ServiceContainer | null = null;
  private services: Map<string, any> = new Map();
  private serviceConfig: ServiceConfig;
  private analysisConfig: AnalysisConfig;

  private constructor() {
    this.serviceConfig = ConfigFactory.getServiceConfig();
    this.analysisConfig = ConfigFactory.getAnalysisConfig();
  }

  /**
   * 获取服务容器单例
   */
  static getInstance(): ServiceContainer {
    if (!this.instance) {
      this.instance = new ServiceContainer();
    }
    return this.instance;
  }

  /**
   * 重置单例实例（主要用于测试）
   */
  static resetInstance(): void {
    if (this.instance) {
      this.instance.cleanup();
      this.instance = null;
    }
  }

  /**
   * 获取SQL分析器
   */
  getSQLAnalyzer(): ISQLAnalyzer {
    const key = 'sqlAnalyzer';
    if (!this.services.has(key)) {
      this.services.set(key, new SQLAnalyzer(this.serviceConfig));
    }
    return this.services.get(key);
  }

  /**
   * 获取文件分析服务
   */
  getFileAnalyzerService(): IFileAnalyzerService {
    const key = 'fileAnalyzerService';
    if (!this.services.has(key)) {
      this.services.set(key, new FileAnalyzerService(this.serviceConfig));
    }
    return this.services.get(key);
  }

  /**
   * 获取历史服务
   */
  async getHistoryService(): Promise<IHistoryService> {
    const key = 'historyService';
    if (!this.services.has(key)) {
      const service = await getHistoryService();
      this.services.set(key, service);
    }
    return this.services.get(key);
  }

  /**
   * 获取知识库服务
   */
  getKnowledgeService(): IKnowledgeService {
    const key = 'knowledgeService';
    if (!this.services.has(key)) {
      this.services.set(key, new KnowledgeService());
    }
    return this.services.get(key);
  }

  /**
   * 获取规则评估服务
   */
  getRuleEvaluationService(): RuleEvaluationService {
    const key = 'ruleEvaluationService';
    if (!this.services.has(key)) {
      this.services.set(key, RuleEvaluationService.getInstance());
    }
    return this.services.get(key);
  }

  /**
   * 获取结果格式化器
   */
  getResultFormatter(): any {
    return resultFormatter;
  }

  /**
   * 更新服务配置
   */
  updateServiceConfig(config: Partial<ServiceConfig>): void {
    this.serviceConfig = ConfigFactory.getServiceConfig(config);
    // 清理现有服务，让它们重新创建
    this.cleanup();
  }

  /**
   * 更新分析配置
   */
  updateAnalysisConfig(config: Partial<AnalysisConfig>): void {
    this.analysisConfig = ConfigFactory.getAnalysisConfig(config);
    // 清理现有服务，让它们重新创建
    this.cleanup();
  }

  /**
   * 获取当前服务配置
   */
  getServiceConfig(): ServiceConfig {
    return this.serviceConfig;
  }

  /**
   * 获取当前分析配置
   */
  getAnalysisConfig(): AnalysisConfig {
    return this.analysisConfig;
  }

  /**
   * 创建开发环境服务容器
   */
  static createDevContainer(): ServiceContainer {
    const container = this.getInstance();
    container.updateServiceConfig({
      enableCaching: false,
      maxConcurrency: 1
    });
    container.updateAnalysisConfig({
      learn: true
    });
    return container;
  }

  /**
   * 创建生产环境服务容器
   */
  static createProdContainer(): ServiceContainer {
    const container = this.getInstance();
    container.updateServiceConfig(ConfigFactory.createProdConfig().service);
    container.updateAnalysisConfig(ConfigFactory.createProdConfig());
    return container;
  }

  /**
   * 创建测试环境服务容器
   */
  static createTestContainer(): ServiceContainer {
    const container = this.getInstance();
    container.updateServiceConfig(ConfigFactory.createTestConfig().service);
    container.updateAnalysisConfig(ConfigFactory.createTestConfig());
    return container;
  }

  /**
   * 清理所有服务
   */
  cleanup(): void {
    // 清理服务缓存
    this.services.clear();

    // 如果服务有清理方法，调用它们
    for (const [key, service] of this.services.entries()) {
      if (service && typeof service.cleanup === 'function') {
        try {
          service.cleanup();
        } catch (error) {
          console.warn(`清理服务 ${key} 时出错:`, error);
        }
      }
    }
  }

  /**
   * 获取服务状态信息
   */
  getServiceStatus(): Record<string, any> {
    return {
      servicesCount: this.services.size,
      loadedServices: Array.from(this.services.keys()),
      serviceConfig: this.serviceConfig,
      analysisConfig: this.analysisConfig
    };
  }

  /**
   * 预热所有服务
   */
  async warmup(): Promise<void> {
    try {
      // 预热核心服务
      await Promise.all([
        Promise.resolve(this.getSQLAnalyzer()),
        Promise.resolve(this.getFileAnalyzerService()),
        this.getHistoryService(),
        Promise.resolve(this.getKnowledgeService()),
        Promise.resolve(this.getRuleEvaluationService())
      ]);
    } catch (error) {
      console.warn('服务预热时出错:', error);
    }
  }
}