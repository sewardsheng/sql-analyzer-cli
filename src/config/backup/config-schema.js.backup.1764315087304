/**
 * 应用配置架构定义
 * 纯默认配置，不包含任何环境变量处理
 */
export const ConfigSchema = {
  // API服务器配置
  server: {
    port: 3001,
    host: '0.0.0.0',
    cors: {
      enabled: true,
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With']
    },
    rateLimit: {
      windowMs: 900000, // 15分钟
      max: 100
    }
  },

  // LLM配置
  llm: {
    apiKey: '',
    model: 'zai-org/GLM-4.6',
    baseUrl: 'https://api.siliconflow.cn/v1',
    temperature: 0.7,
    maxTokens: 4000,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    timeout: 30000
  },

  // 规则学习配置
  ruleLearning: {
    enabled: true,
    minConfidence: 0.7,
    batchSize: 5,
    maxRulesPerGeneration: 10,
    autoApproval: {
      enabled: true,
      threshold: 70,
      confidenceThreshold: 0.8
    },
    storage: {
      rootDir: 'rules/learning-rules',
      organizeByMonth: true,
      fileNameFormat: '{category}-{timestamp}-{hash}.md'
    },
    performance: {
      concurrentTasks: 3,
      taskTimeout: 300000, // 5分钟
      enableCache: true,
      cacheExpiration: 3600000 // 1小时
    }
  },

  // 知识库配置
  knowledge: {
    enabled: true,
    rulesDir: 'rules',
    maxFileSize: 10485760, // 10MB
    supportedFormats: ['.md', '.txt', '.json']
  },

  // 日志配置
  logging: {
    level: 'info',
    enableRequestBody: false,
    enablePerformanceMetrics: true
  },

  // 系统配置
  system: {
    version: '1.0.0',
    environment: 'development'
  }
};