/**
 * 统一配置管理器
 * 整合所有模块的配置，提供统一的配置管理接口
 */

import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

// 加载环境变量
dotenv.config();

/**
 * 默认配置
 */
const DEFAULT_UNIFIED_CONFIG = {
  // 服务器配置
  server: {
    port: parseInt(process.env.PORT) || 3001,
    host: process.env.HOST || '0.0.0.0',
    cors: process.env.CORS !== 'false',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
  },

  // API配置
  api: {
    port: parseInt(process.env.API_PORT) || 3001,
    host: process.env.API_HOST || '0.0.0.0',
    corsEnabled: process.env.API_CORS_ENABLED !== 'false',
    corsOrigin: process.env.API_CORS_ORIGIN || '*',
    enableAISummary: process.env.ENABLE_AI_SUMMARY !== 'false',
    enableColors: process.env.ENABLE_COLORS !== 'false',
    summaryOutputFormat: process.env.SUMMARY_OUTPUT_FORMAT || 'pretty'
  },

  // LLM配置
  llm: {
    apiKey: process.env.CUSTOM_API_KEY || '',
    model: process.env.CUSTOM_MODEL || 'zai-org/GLM-4.6',
    baseUrl: process.env.CUSTOM_BASE_URL || 'https://api.siliconflow.cn/v1',
    embeddingModel: process.env.CUSTOM_EMBEDDING_MODEL || 'BAAI/bge-m3',
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
    autoApproveThreshold: 0.8,
    minQualityScore: 70,
    maxRulesPerBatch: 20,
    duplicateThreshold: 0.9
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

  // 知识库配置
  knowledge: {
    enabled: process.env.KNOWLEDGE_BASE_ENABLED !== 'false',
    dataDir: process.env.KNOWLEDGE_DATA_DIR || 'data/knowledge',
    maxFileSize: parseInt(process.env.KNOWLEDGE_MAX_FILE_SIZE) || 10485760, // 10MB
    supportedFormats: ['.md', '.txt', '.json'],
    embeddingModel: process.env.CUSTOM_EMBEDDING_MODEL || 'BAAI/bge-m3'
  },

  // 系统配置
  system: {
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    debug: process.env.DEBUG === 'true',
    maxMemoryUsage: parseInt(process.env.MAX_MEMORY_USAGE) || 1024, // MB
    gcInterval: parseInt(process.env.GC_INTERVAL) || 300000, // 5分钟
    tempDir: process.env.TEMP_DIR || 'temp'
  }
};

/**
 * 统一配置管理器类
 */
export class UnifiedConfigManager {
  constructor(customConfig = {}) {
    this.config = this.mergeConfig(DEFAULT_UNIFIED_CONFIG, customConfig);
    this.validateConfig();
    this.watchers = new Map();
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
    const { server, api, llm, ruleLearning, validation, approval, middleware } = this.config;

    // 验证服务器配置
    if (server.port < 1 || server.port > 65535) {
      throw new Error('服务器端口必须在 1-65535 之间');
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
    
    const oldValue = target[lastKey];
    target[lastKey] = value;
    
    try {
      this.validateConfig();
      this.notifyWatchers(path, value, oldValue);
    } catch (error) {
      // 回滚更改
      target[lastKey] = oldValue;
      throw error;
    }
  }

  /**
   * 获取完整配置
   * @returns {Object} 完整配置对象
   */
  getAll() {
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
    const oldConfig = JSON.parse(JSON.stringify(this.config));
    this.config = this.mergeConfig(this.config, newConfig);
    
    try {
      this.validateConfig();
      this.notifyWatchers('*', this.config, oldConfig);
    } catch (error) {
      // 回滚更改
      this.config = oldConfig;
      throw error;
    }
  }

  /**
   * 重置为默认配置
   */
  reset() {
    const oldConfig = JSON.parse(JSON.stringify(this.config));
    this.config = JSON.parse(JSON.stringify(DEFAULT_UNIFIED_CONFIG));
    this.notifyWatchers('*', this.config, oldConfig);
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

    // 服务器配置
    if (process.env.PORT) {
      envConfig.server = { ...envConfig.server, port: parseInt(process.env.PORT) };
    }
    if (process.env.HOST) {
      envConfig.server = { ...envConfig.server, host: process.env.HOST };
    }

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
   * 保存配置到文件
   * @param {string} filePath - 文件路径
   */
  async saveToFile(filePath) {
    try {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(this.config, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`保存配置文件失败: ${error.message}`);
    }
  }

  /**
   * 从文件加载配置
   * @param {string} filePath - 文件路径
   */
  async loadFromFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const config = JSON.parse(content);
      this.update(config);
    } catch (error) {
      throw new Error(`加载配置文件失败: ${error.message}`);
    }
  }

  /**
   * 监听配置变化
   * @param {string} path - 配置路径，'*' 表示监听所有变化
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消监听的函数
   */
  watch(path, callback) {
    if (!this.watchers.has(path)) {
      this.watchers.set(path, new Set());
    }
    
    this.watchers.get(path).add(callback);
    
    // 返回取消监听的函数
    return () => {
      const watchers = this.watchers.get(path);
      if (watchers) {
        watchers.delete(callback);
        if (watchers.size === 0) {
          this.watchers.delete(path);
        }
      }
    };
  }

  /**
   * 通知监听器
   * @param {string} path - 配置路径
   * @param {*} newValue - 新值
   * @param {*} oldValue - 旧值
   */
  notifyWatchers(path, newValue, oldValue) {
    // 通知特定路径的监听器
    const pathWatchers = this.watchers.get(path);
    if (pathWatchers) {
      pathWatchers.forEach(callback => {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          console.error(`配置监听器错误 (${path}):`, error);
        }
      });
    }

    // 通知全局监听器
    const globalWatchers = this.watchers.get('*');
    if (globalWatchers) {
      globalWatchers.forEach(callback => {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          console.error(`全局配置监听器错误:`, error);
        }
      });
    }
  }

  /**
   * 获取配置统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      totalKeys: this.countKeys(this.config),
      modules: Object.keys(this.config),
      watchers: Array.from(this.watchers.keys()),
      environment: this.config.system.environment,
      version: this.config.system.version
    };
  }

  /**
   * 递归计算配置键的数量
   * @param {Object} obj - 对象
   * @returns {number} 键的数量
   */
  countKeys(obj) {
    let count = 0;
    for (const key in obj) {
      count++;
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        count += this.countKeys(obj[key]);
      }
    }
    return count;
  }

  /**
   * 导出配置为环境变量格式
   * @returns {Object} 环境变量对象
   */
  exportToEnv() {
    const env = {};
    
    function flatten(obj, prefix = '') {
      for (const key in obj) {
        const newKey = prefix ? `${prefix}_${key.toUpperCase()}` : key.toUpperCase();
        
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          flatten(obj[key], newKey);
        } else {
          env[newKey] = obj[key];
        }
      }
    }
    
    flatten(this.config);
    return env;
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
   * 获取服务器配置
   * @returns {Object} 服务器配置
   */
  getServerConfig() {
    return this.getModule('server');
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

// 全局配置实例
let globalConfigManager = null;

/**
 * 获取全局配置管理器实例
 * @param {Object} customConfig - 自定义配置
 * @returns {UnifiedConfigManager} 配置管理器实例
 */
export function getUnifiedConfigManager(customConfig = {}) {
  if (!globalConfigManager) {
    globalConfigManager = new UnifiedConfigManager(customConfig);
  }
  return globalConfigManager;
}

/**
 * 重置全局配置管理器
 */
export function resetUnifiedConfigManager() {
  if (globalConfigManager) {
    // 清理所有监听器
    globalConfigManager.watchers.clear();
  }
  globalConfigManager = null;
}

/**
 * 便捷函数：获取配置值
 * @param {string} path - 配置路径
 * @param {*} defaultValue - 默认值
 * @returns {*} 配置值
 */
export function getConfig(path, defaultValue) {
  const manager = getUnifiedConfigManager();
  return manager.get(path, defaultValue);
}

/**
 * 便捷函数：设置配置值
 * @param {string} path - 配置路径
 * @param {*} value - 配置值
 */
export function setConfig(path, value) {
  const manager = getUnifiedConfigManager();
  manager.set(path, value);
}

// 创建并导出全局配置管理器实例
export const unifiedConfigManager = getUnifiedConfigManager();

export default UnifiedConfigManager;