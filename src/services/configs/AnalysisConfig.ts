/**
 * 分析配置定义
 * 老王我统一管理分析相关的SB配置，避免到处重复
 */

import { ServiceConfig, DEFAULT_SERVICE_CONFIG, validateServiceConfig } from './ServiceConfig.js';

/**
 * 分析配置接口
 */
export interface AnalysisConfig {
  performance: boolean;
  security: boolean;
  standards: boolean;
  learn: boolean;
  service: ServiceConfig;
}

/**
 * 默认分析配置
 * 这个SB配置也在各处重复，现在统一管理！
 */
export const DEFAULT_ANALYSIS_CONFIG: AnalysisConfig = Object.freeze({
  performance: true,
  security: true,
  standards: true,
  learn: false,
  service: DEFAULT_SERVICE_CONFIG
});

/**
 * 验证分析配置
 */
export function validateAnalysisConfig(config: AnalysisConfig): void {
  if (typeof config.performance !== 'boolean') {
    throw new Error('performance必须为布尔值');
  }

  if (typeof config.security !== 'boolean') {
    throw new Error('security必须为布尔值');
  }

  if (typeof config.standards !== 'boolean') {
    throw new Error('standards必须为布尔值');
  }

  if (typeof config.learn !== 'boolean') {
    throw new Error('learn必须为布尔值');
  }

  // 验证服务配置
  validateServiceConfig(config.service);
}

/**
 * 合并分析配置
 */
export function mergeAnalysisConfig(
  defaultConfig: AnalysisConfig,
  userConfig: Partial<AnalysisConfig>
): AnalysisConfig {
  const merged: AnalysisConfig = {
    performance: userConfig.performance ?? defaultConfig.performance,
    security: userConfig.security ?? defaultConfig.security,
    standards: userConfig.standards ?? defaultConfig.standards,
    learn: userConfig.learn ?? defaultConfig.learn,
    service: userConfig.service
      ? { ...defaultConfig.service, ...userConfig.service }
      : defaultConfig.service
  };

  validateAnalysisConfig(merged);
  return merged;
}