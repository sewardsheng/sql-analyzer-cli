/**
 * 配置工厂类
 * 老王我专门搞个工厂来统一管理这些SB配置
 */

import { ServiceConfig } from '../configs/ServiceConfig.js';
import { AnalysisConfig } from '../configs/AnalysisConfig.js';
import { DEFAULT_SERVICE_CONFIG } from '../configs/ServiceConfig.js';
import { DEFAULT_ANALYSIS_CONFIG } from '../configs/AnalysisConfig.js';
import { mergeServiceConfig } from '../configs/ServiceConfig.js';
import { mergeAnalysisConfig } from '../configs/AnalysisConfig.js';

/**
 * 缓存配置接口
 */
export interface CacheConfig {
  maxSize: number;
  ttl: number;
  enableLRU: boolean;
}

/**
 * 配置工厂类
 * 统一管理所有配置，避免重复粘贴
 */
export class ConfigFactory {
  /**
   * 获取服务配置
   */
  static getServiceConfig(userConfig?: Partial<ServiceConfig>): ServiceConfig {
    if (!userConfig) {
      return DEFAULT_SERVICE_CONFIG;
    }

    return mergeServiceConfig(DEFAULT_SERVICE_CONFIG, userConfig);
  }

  /**
   * 获取分析配置
   */
  static getAnalysisConfig(userConfig?: Partial<AnalysisConfig>): AnalysisConfig {
    if (!userConfig) {
      return DEFAULT_ANALYSIS_CONFIG;
    }

    return mergeAnalysisConfig(DEFAULT_ANALYSIS_CONFIG, userConfig);
  }

  /**
   * 通用配置合并方法
   */
  static mergeConfig<T extends Record<string, any>>(
    defaultConfig: T,
    userConfig: Partial<T>
  ): T {
    const result = { ...defaultConfig };

    for (const key in userConfig) {
      if (userConfig[key] !== undefined) {
        if (typeof userConfig[key] === 'object' && userConfig[key] !== null && !Array.isArray(userConfig[key])) {
          // 深度合并对象
          result[key] = this.mergeConfig(result[key] || {}, userConfig[key]);
        } else {
          result[key] = userConfig[key] as T[Extract<keyof T, string>];
        }
      }
    }

    return result;
  }

  /**
   * 创建开发环境配置
   */
  static createDevConfig(): AnalysisConfig {
    return this.getAnalysisConfig({
      learn: true,
      service: {
        enableCaching: false,
        maxConcurrency: 1
      }
    });
  }

  /**
   * 创建生产环境配置
   */
  static createProdConfig(): AnalysisConfig {
    return this.getAnalysisConfig({
      learn: false,
      service: {
        enableCaching: true,
        enableKnowledgeBase: true,
        maxConcurrency: 5,
        cacheSize: 10000,
        timeout: 120000
      }
    });
  }

  /**
   * 创建测试环境配置
   */
  static createTestConfig(): AnalysisConfig {
    return this.getAnalysisConfig({
      learn: false,
      service: {
        enableCaching: false,
        enableKnowledgeBase: false,
        maxConcurrency: 1,
        timeout: 5000
      }
    });
  }
}

/**
 * 缓存工厂类
 */
export class CacheFactory {
  private static readonly DEFAULT_CACHE_CONFIG: CacheConfig = {
    maxSize: 1000,
    ttl: 300000, // 5分钟
    enableLRU: true
  };

  /**
   * 获取缓存配置
   */
  static getCacheConfig(maxSize?: number, ttl?: number): CacheConfig {
    return {
      maxSize: maxSize ?? this.DEFAULT_CACHE_CONFIG.maxSize,
      ttl: ttl ?? this.DEFAULT_CACHE_CONFIG.ttl,
      enableLRU: this.DEFAULT_CACHE_CONFIG.enableLRU
    };
  }

  /**
   * 获取分析缓存配置
   */
  static getAnalysisCacheConfig(): CacheConfig {
    return this.getCacheConfig(500, 60000); // 500条记录，1分钟TTL
  }

  /**
   * 获取历史缓存配置
   */
  static getHistoryCacheConfig(): CacheConfig {
    return this.getCacheConfig(2000, 600000); // 2000条记录，10分钟TTL
  }

  /**
   * 获取知识库缓存配置
   */
  static getKnowledgeCacheConfig(): CacheConfig {
    return this.getCacheConfig(10000, 3600000); // 10000条记录，1小时TTL
  }
}