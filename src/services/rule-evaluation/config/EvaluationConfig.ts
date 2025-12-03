/**
 * 规则评估配置管理
 * 老王重构：统一所有评估相关配置，支持动态调整和热更新
 */

import { EvaluationConfig } from '../models/EvaluationModels';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 默认配置
 * 老王我把所有默认值都设为最优配置
 */
const DEFAULT_CONFIG: EvaluationConfig = {
  duplicateDetection: {
    enabled: true,
    thresholds: {
      exact: 0.95,        // 精确匹配阈值
      semantic: 0.85,     // 语义相似阈值
      structural: 0.75,   // 结构相似阈值
      warning: 0.60       // 警告阈值
    },
    weights: {
      exact: 0.40,        // 精确匹配权重
      semantic: 0.35,     // 语义相似权重
      structural: 0.15,   // 结构相似权重
      content: 0.10       // 内容特征权重
    }
  },
  qualityAssessment: {
    enabled: true,
    dimensionWeights: {
      accuracy: 0.25,     // 准确性权重
      practicality: 0.25, // 实用性权重
      completeness: 0.20, // 完整性权重
      generality: 0.15,   // 通用性权重
      consistency: 0.15   // 一致性权重
    },
    thresholds: {
      excellent: 90,      // 优秀阈值
      good: 75,          // 良好阈值
      fair: 60,          // 一般阈值
      minimum: 40        // 最低阈值
    }
  },
  classification: {
    enabled: true,
    thresholds: {
      minQualityScore: 70,        // 最低质量分数
      maxDuplicateRisk: 'medium',  // 最大重复风险
      minCompletenessScore: 60     // 最低完整性分数
    },
    manualReviewTriggers: {
      lowConfidence: true,         // 低置信度触发
      borderlineScores: true,      // 边界分数触发
      conflictingResults: true     // 冲突结果触发
    }
  },
  performance: {
    batchSize: 10,                 // 批量大小
    concurrency: 3,                // 并发数量
    cacheTtl: 3600,               // 缓存TTL（1小时）
    timeouts: {
      duplicateDetection: 30000,   // 去重检测超时（30秒）
      qualityEvaluation: 60000,    // 质量评估超时（60秒）
      classification: 10000,       // 分类超时（10秒）
      total: 120000                // 总超时（2分钟）
    }
  }
};

/**
 * 配置文件路径
 */
const CONFIG_PATHS = {
  base: path.join(process.cwd(), 'src', 'services', 'rule-evaluation', 'config'),
  main: 'evaluation-config.json',
  override: 'evaluation-config.override.json',
  backup: 'evaluation-config.backup.json'
};

/**
 * 评估配置管理器
 */
export class EvaluationConfigManager {
  private static instance: EvaluationConfigManager;
  private config: EvaluationConfig;
  private lastLoadTime: Date;
  private watchers: any[] = []; // TODO: 使用正确的文件监视器类型

  private constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.lastLoadTime = new Date();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): EvaluationConfigManager {
    if (!EvaluationConfigManager.instance) {
      EvaluationConfigManager.instance = new EvaluationConfigManager();
    }
    return EvaluationConfigManager.instance;
  }

  /**
   * 获取当前配置
   */
  getConfig(): EvaluationConfig {
    return { ...this.config };
  }

  /**
   * 获取特定配置部分
   */
  getDuplicateDetectionConfig() {
    return { ...this.config.duplicateDetection };
  }

  getQualityAssessmentConfig() {
    return { ...this.config.qualityAssessment };
  }

  getClassificationConfig() {
    return { ...this.config.classification };
  }

  getPerformanceConfig() {
    return { ...this.config.performance };
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<EvaluationConfig>): void {
    this.config = this.deepMerge(this.config, updates);
    this.lastLoadTime = new Date();
  }

  /**
   * 更新去重检测配置
   */
  updateDuplicateDetectionConfig(config: Partial<EvaluationConfig['duplicateDetection']>): void {
    this.config.duplicateDetection = {
      ...this.config.duplicateDetection,
      ...config
    };
    this.lastLoadTime = new Date();
  }

  /**
   * 更新质量评估配置
   */
  updateQualityAssessmentConfig(config: Partial<EvaluationConfig['qualityAssessment']>): void {
    this.config.qualityAssessment = {
      ...this.config.qualityAssessment,
      ...config
    };
    this.lastLoadTime = new Date();
  }

  /**
   * 更新分类配置
   */
  updateClassificationConfig(config: Partial<EvaluationConfig['classification']>): void {
    this.config.classification = {
      ...this.config.classification,
      ...config
    };
    this.lastLoadTime = new Date();
  }

  /**
   * 更新性能配置
   */
  updatePerformanceConfig(config: Partial<EvaluationConfig['performance']>): void {
    this.config.performance = {
      ...this.config.performance,
      ...config
    };
    this.lastLoadTime = new Date();
  }

  /**
   * 从文件加载配置
   */
  async loadFromFile(configPath?: string): Promise<void> {
    try {
      const filePath = configPath || path.join(CONFIG_PATHS.base, CONFIG_PATHS.main);

      const fileExists = await this.fileExists(filePath);
      if (!fileExists) {
        console.warn(`配置文件不存在: ${filePath}，使用默认配置`);
        await this.saveConfig(); // 保存默认配置
        return;
      }

      const configData = await fs.readFile(filePath, 'utf-8');
      const loadedConfig = JSON.parse(configData) as EvaluationConfig;

      // 验证配置格式
      this.validateConfig(loadedConfig);

      // 合并配置
      this.config = this.deepMerge(DEFAULT_CONFIG, loadedConfig);
      this.lastLoadTime = new Date();

      console.log(`配置加载成功: ${filePath}`);
    } catch (error) {
      console.error('配置加载失败:', error);
      throw new Error(`配置加载失败: ${error.message}`);
    }
  }

  /**
   * 保存配置到文件
   */
  async saveConfig(configPath?: string): Promise<void> {
    try {
      const filePath = configPath || path.join(CONFIG_PATHS.base, CONFIG_PATHS.main);

      // 确保目录存在
      await this.ensureDirectoryExists(path.dirname(filePath));

      const configJson = JSON.stringify(this.config, null, 2);
      await fs.writeFile(filePath, configJson, 'utf-8');

      console.log(`配置保存成功: ${filePath}`);
    } catch (error) {
      console.error('配置保存失败:', error);
      throw new Error(`配置保存失败: ${error.message}`);
    }
  }

  /**
   * 创建备份
   */
  async createBackup(): Promise<string> {
    try {
      const backupPath = path.join(CONFIG_PATHS.base, CONFIG_PATHS.backup);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = `evaluation-config.backup.${timestamp}.json`;
      const fullBackupPath = path.join(path.dirname(backupPath), backupFile);

      await this.saveConfig(fullBackupPath);
      return fullBackupPath;
    } catch (error) {
      console.error('配置备份失败:', error);
      throw error;
    }
  }

  /**
   * 恢复配置
   */
  async restoreFromBackup(backupPath: string): Promise<void> {
    try {
      await this.loadFromFile(backupPath);
      await this.saveConfig(); // 保存为当前配置
      console.log(`配置恢复成功: ${backupPath}`);
    } catch (error) {
      console.error('配置恢复失败:', error);
      throw error;
    }
  }

  /**
   * 重置为默认配置
   */
  resetToDefault(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.lastLoadTime = new Date();
  }

  /**
   * 获取配置版本信息
   */
  getVersionInfo() {
    return {
      version: '1.0.0',
      lastLoadTime: this.lastLoadTime,
      configHash: this.calculateConfigHash(),
      isDefault: JSON.stringify(this.config) === JSON.stringify(DEFAULT_CONFIG)
    };
  }

  /**
   * 验证配置
   */
  private validateConfig(config: any): void {
    const requiredFields = [
      'duplicateDetection',
      'qualityAssessment',
      'classification',
      'performance'
    ];

    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`配置缺少必需字段: ${field}`);
      }
    }

    // 验证阈值范围
    if (config.duplicateDetection?.thresholds) {
      const thresholds = config.duplicateDetection.thresholds;
      for (const [key, value] of Object.entries(thresholds)) {
        if (typeof value !== 'number' || value < 0 || value > 1) {
          throw new Error(`去重阈值 ${key} 必须是0-1之间的数字`);
        }
      }
    }

    // 验证权重总和
    if (config.duplicateDetection?.weights) {
      const weights = config.duplicateDetection.weights;
      const totalWeight = Object.values(weights).reduce((sum: number, weight: any) => {
      const numWeight = Number(weight);
      return sum + (isNaN(numWeight) ? 0 : numWeight);
    }, 0);
      if (Math.abs(totalWeight - 1.0) > 0.01) {
        throw new Error(`去重权重总和必须等于1.0，当前为${totalWeight}`);
      }
    }
  }

  /**
   * 深度合并对象
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (this.isObject(source[key]) && this.isObject(target[key])) {
          result[key] = this.deepMerge(target[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * 检查是否为对象
   */
  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * 检查文件是否存在
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 确保目录存在
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // 忽略目录已存在的错误
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * 计算配置哈希
   */
  private calculateConfigHash(): string {
    const crypto = require('crypto');
    const configString = JSON.stringify(this.config);
    return crypto.createHash('md5').update(configString).digest('hex');
  }

  /**
   * 启用配置文件监听（热更新）
   */
  async enableConfigWatch(): Promise<void> {
    try {
      const configPath = path.join(CONFIG_PATHS.base, CONFIG_PATHS.main);

      const watcher = fs.watch(configPath, { recursive: false }, async (eventType) => {
        if (eventType === 'change') {
          console.log('检测到配置文件变更，重新加载...');
          try {
            await this.loadFromFile();
            console.log('配置热更新成功');
          } catch (error) {
            console.error('配置热更新失败:', error);
          }
        }
      });

      this.watchers.push(watcher);
      console.log('配置文件监听已启用');
    } catch (error) {
      console.error('启用配置文件监听失败:', error);
    }
  }

  /**
   * 停止配置文件监听
   */
  async disableConfigWatch(): Promise<void> {
    for (const watcher of this.watchers) {
      try {
        await watcher.close();
      } catch (error) {
        console.error('停止配置监听失败:', error);
      }
    }
    this.watchers = [];
    console.log('配置文件监听已停止');
  }
}

/**
 * 导出配置管理器实例
 */
export const configManager = EvaluationConfigManager.getInstance();

/**
 * 便捷函数：获取配置
 */
export function getEvaluationConfig(): EvaluationConfig {
  return configManager.getConfig();
}

/**
 * 便捷函数：更新配置
 */
export function updateEvaluationConfig(updates: Partial<EvaluationConfig>): void {
  configManager.updateConfig(updates);
}