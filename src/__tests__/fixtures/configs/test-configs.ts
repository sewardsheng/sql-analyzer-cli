/**
 * 配置测试数据
 * 老王我准备的各种SB配置，用于测试
 */

export const SERVICE_CONFIGS = {
  // 默认配置
  default: {
    enableCaching: true,
    enableKnowledgeBase: true,
    maxConcurrency: 3,
    cacheSize: 1000,
    timeout: 30000
  },

  // 禁用缓存
  noCache: {
    enableCaching: false,
    enableKnowledgeBase: true,
    maxConcurrency: 3,
    cacheSize: 0,
    timeout: 30000
  },

  // 禁用知识库
  noKnowledge: {
    enableCaching: true,
    enableKnowledgeBase: false,
    maxConcurrency: 3,
    cacheSize: 1000,
    timeout: 30000
  },

  // 高并发配置
  highConcurrency: {
    enableCaching: true,
    enableKnowledgeBase: true,
    maxConcurrency: 10,
    cacheSize: 5000,
    timeout: 60000
  },

  // 生产配置
  production: {
    enableCaching: true,
    enableKnowledgeBase: true,
    maxConcurrency: 5,
    cacheSize: 10000,
    timeout: 120000
  }
};

export const ANALYSIS_CONFIGS = {
  // 默认分析配置
  default: {
    performance: true,
    security: true,
    standards: true,
    learn: false,
    service: SERVICE_CONFIGS.default
  },

  // 仅性能分析
  performanceOnly: {
    performance: true,
    security: false,
    standards: false,
    learn: false,
    service: SERVICE_CONFIGS.default
  },

  // 仅安全分析
  securityOnly: {
    performance: false,
    security: true,
    standards: false,
    learn: false,
    service: SERVICE_CONFIGS.default
  },

  // 仅规范分析
  standardsOnly: {
    performance: false,
    security: false,
    standards: true,
    learn: false,
    service: SERVICE_CONFIGS.default
  },

  // 启用学习
  withLearning: {
    performance: true,
    security: true,
    standards: true,
    learn: true,
    service: SERVICE_CONFIGS.default
  },

  // 全功能配置
  fullFeatured: {
    performance: true,
    security: true,
    standards: true,
    learn: true,
    service: SERVICE_CONFIGS.highConcurrency
  }
};