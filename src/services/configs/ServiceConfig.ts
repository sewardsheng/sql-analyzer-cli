/**
 * 服务配置定义
 * 老王我统一管理这些SB配置，避免到处重复粘贴
 */

/**
 * 服务配置接口
 */
export interface ServiceConfig {
  enableCaching: boolean;
  enableKnowledgeBase: boolean;
  maxConcurrency: number;
  cacheSize?: number;
  timeout?: number;
}

/**
 * 默认服务配置
 * 这个SB配置在项目里复制粘贴了N次，现在统一管理！
 */
export const DEFAULT_SERVICE_CONFIG: ServiceConfig = Object.freeze({
  enableCaching: true,
  enableKnowledgeBase: true,
  maxConcurrency: 3,
  cacheSize: 1000,
  timeout: 30000
});

/**
 * 验证服务配置
 */
export function validateServiceConfig(config: ServiceConfig): void {
  if (config.maxConcurrency < 0) {
    throw new Error('maxConcurrency不能为负数');
  }

  if (config.cacheSize !== undefined && config.cacheSize < 0) {
    throw new Error('cacheSize不能为负数');
  }

  if (config.timeout !== undefined && config.timeout < 0) {
    throw new Error('timeout不能为负数');
  }
}

/**
 * 合并配置
 */
export function mergeServiceConfig(
  defaultConfig: ServiceConfig,
  userConfig: Partial<ServiceConfig>
): ServiceConfig {
  const merged = { ...defaultConfig, ...userConfig };
  validateServiceConfig(merged);
  return merged;
}