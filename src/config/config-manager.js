/**
 * 统一配置管理器
 * 整合所有模块的配置，提供统一的配置管理接口
 */

import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 默认配置
 */
const DEFAULT_UNIFIED_CONFIG = {
  // API配置（统一的服务器配置）
  api: {
    port: parseInt(process.env.API_PORT) || 3001,
    host: process.env.API_HOST || '0.0.0.0',
    corsEnabled: process.env.API_CORS_ENABLED !== 'false',
    corsOrigin: process.env.API_CORS_ORIGIN || '*',
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
  },

  // LLM配置
  llm: {
    apiKey: process.env.CUSTOM_API_KEY || '',
    model: process.env.CUSTOM_MODEL || 'zai-org/GLM-4.6',
    baseUrl: process.env.CUSTOM_BASE_URL || 'https://api.siliconflow.cn/v1',
    temperature: 0.7,
    maxTokens: 4000,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    headers: {}
  },

  // 规则学习配置
  ruleLearning: {
    // 学习触发条件
    learning: {
      enabled: process.env.RULE_LEARNING_ENABLED !== 'false',
      minConfidence: parseFloat(process.env.RULE_LEARNING_MIN_CONFIDENCE) || 0.7,
      minBatchSize: parseInt(process.env.RULE_LEARNING_BATCH_SIZE) || 5,
      learningInterval: 24 * 60 * 60 * 1000, // 24小时
      maxRecordsPerLearning: 50,
      enableRealTimeLearning: true,
      enableBatchLearning: true
    },
    
    // 规则生成配置
    generation: {
      maxRulesPerLearning: parseInt(process.env.RULE_GENERATION_MAX_RULES) || 10,
      categoryPriority: ['security', 'performance', 'standards'],
      enableDeduplication: true,
      deduplicationThreshold: 0.8,
      enableTemplates: true
    },
    
    // 质量评估配置
    evaluation: {
      autoApprovalThreshold: parseInt(process.env.RULE_EVALUATION_AUTO_APPROVAL_THRESHOLD) || 70,
      autoApprovalConfidence: parseFloat(process.env.RULE_EVALUATION_AUTO_APPROVAL_CONFIDENCE) || 0.8,
      basicValidationWeight: 0.3,
      llmEvaluationWeight: 0.7,
      enableSecuritySpecialHandling: true,
      securityMinSeverity: 'medium'
    },
    
    // 存储配置
    storage: {
      rulesRootDir: process.env.RULE_STORAGE_ROOT_DIR || 'rules/learning-rules',
      organizeByMonth: true,
      fileNameFormat: '{category}-{timestamp}-{hash}.md',
      keepRawAnalysis: true,
      rawDataDir: 'raw-data'
    },
    
    // 性能配置
    performance: {
      concurrentLearningTasks: parseInt(process.env.RULE_LEARNING_CONCURRENT_TASKS) || 3,
      taskTimeout: 5 * 60 * 1000, // 5分钟
      enableCache: true,
      cacheExpiration: 60 * 60 * 1000, // 1小时
      maxMemoryUsage: 512
    },
    
    // 日志配置
    logging: {
      level: process.env.RULE_LEARNING_LOG_LEVEL || 'info',
      verbose: false,
      logLearningProcess: true,
      logPerformanceMetrics: true,
      logFilePath: 'logs/rule-learning.log'
    }
  },

  // 验证器配置
  validation: {
    // 必需字段配置
    requiredFields: {
      basic: ['title', 'description', 'category', 'type', 'severity', 'confidence'],
      complete: ['title', 'description', 'category', 'type', 'severity', 'confidence', 'condition', 'example']
    },
    
    // 字段长度要求
    fieldLengths: {
      title: { min: 5, recommended: 10 },
      description: { min: 20, recommended: 30 },
      condition: { min: 10, recommended: 15 }
    },
    
    // 数值范围
    ranges: {
      confidence: { min: 0, max: 1, recommended: 0.5 }
    },
    
    // 有效值列表
    validValues: {
      severity: ['critical', 'high', 'medium', 'low', 'info'],
      category: ['performance', 'security', 'standards']
    },
    
    // SQL关键字用于示例验证
    sqlKeywords: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP']
  },

  // 审批器配置
  approval: {
    autoApproveThreshold: 0.7,  // 置信度阈值
    minQualityScore: 60,        // 质量分数阈值
    maxRulesPerBatch: 20,
    duplicateThreshold: 0.9,
    // 统一验证阈值，确保一致性
    completenessConfidenceThreshold: 0.7,  // 完整性验证置信度阈值
    securitySeverityThreshold: 'medium'    // 安全规则最低严重程度
  },

  // 中间件配置
  middleware: {
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15分钟
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
      message: '请求过于频繁，请稍后再试',
      keyGenerator: (req) => req.ip || 'unknown'
    },
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With'],
      maxAge: 86400, // 24小时
      credentials: false
    }
  },

  // 健康检查配置
  health: {
    enabled: true,
    checkInterval: 60000, // 1分钟
    timeout: 5000, // 5秒
    retries: 3
  },

  // 知识库配置（用于规则文档的向量化和搜索）
  knowledge: {
    enabled: process.env.KNOWLEDGE_BASE_ENABLED !== 'false',
    rulesDir: process.env.KNOWLEDGE_RULES_DIR || 'rules',  // 知识库扫描的规则目录
    maxFileSize: parseInt(process.env.KNOWLEDGE_MAX_FILE_SIZE) || 10485760, // 10MB
    supportedFormats: ['.md', '.txt', '.json']
  },

  // 系统配置
  system: {
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  }
};

/**
 * 统一配置管理器类
 */
export class UnifiedConfigManager {
  constructor(customConfig = {}) {
    this.config = this.mergeConfig(DEFAULT_UNIFIED_CONFIG, customConfig);
    this.validateConfig();
  }

  /**
   * 深度合并配置
   * @param {Object} defaultConfig - 默认配置
   * @param {Object} customConfig - 自定义配置
   * @returns {Object} 合并后的配置
   */
  mergeConfig(defaultConfig, customConfig) {
    const merged = JSON.parse(JSON.stringify(defaultConfig));
    
    function deepMerge(target, source) {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          target[key] = target[key] || {};
          deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
    
    deepMerge(merged, customConfig);
    return merged;
  }

  /**
   * 验证配置
   */
  validateConfig() {
    const { api, llm, ruleLearning, validation, approval, middleware } = this.config;

    // 验证API配置（配置中使用的是 api，不是 server）
    if (api && api.port && (api.port < 1 || api.port > 65535)) {
      throw new Error('API端口必须在 1-65535 之间');
    }

    // 验证API配置
    if (api.port < 1 || api.port > 65535) {
      throw new Error('API端口必须在 1-65535 之间');
    }

    // 验证LLM配置
    if (!llm.apiKey) {
      console.warn('警告: LLM API密钥未配置');
    }

    // 验证规则学习配置
    const { learning, generation, evaluation } = ruleLearning;
    
    if (learning.minConfidence < 0 || learning.minConfidence > 1) {
      throw new Error('minConfidence 必须在 0-1 之间');
    }
    
    if (generation.deduplicationThreshold < 0 || generation.deduplicationThreshold > 1) {
      throw new Error('deduplicationThreshold 必须在 0-1 之间');
    }
    
    if (evaluation.autoApprovalThreshold < 0 || evaluation.autoApprovalThreshold > 100) {
      throw new Error('autoApprovalThreshold 必须在 0-100 之间');
    }

    // 验证审批器配置
    if (approval.autoApproveThreshold < 0 || approval.autoApproveThreshold > 1) {
      throw new Error('autoApproveThreshold 必须在 0-1 之间');
    }

    // 验证中间件配置
    if (middleware.rateLimit.windowMs < 1000) {
      throw new Error('rateLimit.windowMs 必须大于等于1000毫秒');
    }
  }

  /**
   * 获取配置值
   * @param {string} path - 配置路径，如 'server.port'
   * @param {*} defaultValue - 默认值
   * @returns {*} 配置值
   */
  get(path, defaultValue = undefined) {
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  /**
   * 设置配置值
   * @param {string} path - 配置路径
   * @param {*} value - 配置值
   */
  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.config;
    
    for (const key of keys) {
      if (!(key in target) || typeof target[key] !== 'object') {
        target[key] = {};
      }
      target = target[key];
    }
    
    target[lastKey] = value;
    this.validateConfig();
  }

  /**
   * 获取完整配置
   * @returns {Object} 完整配置对象
   */
  getAll() {
    // 添加诊断日志
    console.log('[DEBUG] ConfigManager.getAll() 被调用');
    console.log('[DEBUG] this.config 类型:', typeof this.config);
    console.log('[DEBUG] this.config 值:', this.config);
    console.log('[DEBUG] this 是否为 ConfigManager 实例:', this instanceof UnifiedConfigManager);
    
    // 确保方法被正确调用
    if (!this.config) {
      console.error('[DEBUG] 配置未初始化：this.config 不存在');
      console.error('[DEBUG] 当前实例属性:', Object.keys(this));
      throw new Error('配置未初始化：this.config 不存在');
    }
    
    console.log('[DEBUG] 配置获取成功，配置键数量:', Object.keys(this.config).length);
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * 获取特定模块配置
   * @param {string} module - 模块名称
   * @returns {Object} 模块配置
   */
  getModule(module) {
    return this.get(module, {});
  }

  /**
   * 更新配置
   * @param {Object} newConfig - 新配置
   */
  update(newConfig) {
    this.config = this.mergeConfig(this.config, newConfig);
    this.validateConfig();
  }

  /**
   * 重置为默认配置
   */
  reset() {
    this.config = JSON.parse(JSON.stringify(DEFAULT_UNIFIED_CONFIG));
  }

  /**
   * 从环境变量重新加载配置
   */
  reloadFromEnv() {
    // 重新加载环境变量
    dotenv.config();
    
    // 构建环境变量配置
    const envConfig = this.buildEnvConfig();
    
    // 更新配置
    this.update(envConfig);
  }

  /**
   * 从环境变量构建配置
   * @returns {Object} 环境变量配置
   */
  buildEnvConfig() {
    const envConfig = {};


    // LLM配置
    if (process.env.CUSTOM_API_KEY) {
      envConfig.llm = { ...envConfig.llm, apiKey: process.env.CUSTOM_API_KEY };
    }
    if (process.env.CUSTOM_MODEL) {
      envConfig.llm = { ...envConfig.llm, model: process.env.CUSTOM_MODEL };
    }
    if (process.env.CUSTOM_BASE_URL) {
      envConfig.llm = { ...envConfig.llm, baseUrl: process.env.CUSTOM_BASE_URL };
    }

    // 规则学习配置
    if (process.env.RULE_LEARNING_ENABLED !== undefined) {
      envConfig.ruleLearning = {
        ...envConfig.ruleLearning,
        learning: { ...envConfig.ruleLearning?.learning, enabled: process.env.RULE_LEARNING_ENABLED === 'true' }
      };
    }

    return envConfig;
  }




  /**
   * 获取API配置
   * @returns {Object} API配置
   */
  getAPIConfig() {
    return this.getModule('api');
  }

  /**
   * 获取LLM配置
   * @returns {Object} LLM配置
   */
  getLLMConfig() {
    return this.getModule('llm');
  }


  /**
   * 获取知识库配置
   * @returns {Object} 知识库配置
   */
  getKnowledgeConfig() {
    return this.getModule('knowledge');
  }

  /**
   * 获取规则学习配置
   * @returns {Object} 规则学习配置
   */
  getLearningConfig() {
    return this.getModule('ruleLearning');
  }

  /**
   * 获取规则生成配置
   * @returns {Object} 规则生成配置
   */
  getGenerationConfig() {
    return this.get('ruleLearning.generation', {});
  }

  /**
   * 获取规则评估配置
   * @returns {Object} 规则评估配置
   */
  getEvaluationConfig() {
    return this.get('ruleLearning.evaluation', {});
  }

  /**
   * 获取审批器配置
   * @returns {Object} 审批器配置
   */
  getApprovalConfig() {
    return this.getModule('approval');
  }

  /**
   * 获取存储配置
   * @returns {Object} 存储配置
   */
  getStorageConfig() {
    return this.get('ruleLearning.storage', {});
  }

  /**
   * 获取中间件配置
   * @returns {Object} 中间件配置
   */
  getMiddlewareConfig() {
    return this.getModule('middleware');
  }

  /**
   * 获取验证器配置
   * @returns {Object} 验证器配置
   */
  getValidationConfig() {
    return this.getModule('validation');
  }

  /**
   * 更新规则学习配置
   * @param {Object} newConfig - 新配置
   */
  updateLearningConfig(newConfig) {
    this.set('ruleLearning', this.mergeConfig(this.getModule('ruleLearning'), newConfig));
  }

  /**
   * 重置规则学习配置
   */
  resetLearningConfig() {
    this.set('ruleLearning', JSON.parse(JSON.stringify(DEFAULT_UNIFIED_CONFIG.ruleLearning)));
  }

  /**
   * 更新审批器配置
   * @param {Object} newConfig - 新配置
   */
  updateApprovalConfig(newConfig) {
    this.set('approval', this.mergeConfig(this.getModule('approval'), newConfig));
  }

  /**
   * 更新验证器配置
   * @param {Object} newConfig - 新配置
   */
  updateValidationConfig(newConfig) {
    this.set('validation', this.mergeConfig(this.getModule('validation'), newConfig));
  }
}

// 创建并导出全局配置管理器实例
export const unifiedConfigManager = new UnifiedConfigManager();

export default UnifiedConfigManager;