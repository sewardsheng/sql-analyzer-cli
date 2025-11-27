/**
 * 智能规则学习配置管理
 * 提供灵活的配置选项来控制规则学习行为
 */

/**
 * 默认配置
 */
const DEFAULT_CONFIG = {
  // 学习触发条件
  learning: {
    // 是否启用规则学习
    enabled: true,
    
    // 最小置信度阈值
    minConfidence: 0.7,
    
    // 批量学习的最小记录数
    minBatchSize: 5,
    
    // 学习间隔（毫秒）
    learningInterval: 24 * 60 * 60 * 1000, // 24小时
    
    // 每次学习的最大记录数
    maxRecordsPerLearning: 50,
    
    // 是否启用实时学习
    enableRealTimeLearning: true,
    
    // 是否启用批量学习
    enableBatchLearning: true
  },
  
  // 规则生成配置
  generation: {
    // 最大生成规则数
    maxRulesPerLearning: 10,
    
    // 规则类别优先级
    categoryPriority: ['security', 'performance', 'standards'],
    
    // 是否启用规则去重
    enableDeduplication: true,
    
    // 去重相似度阈值
    deduplicationThreshold: 0.8,
    
    // 是否启用规则模板
    enableTemplates: true
  },
  
  // 质量评估配置
  evaluation: {
    // 自动审批阈值
    autoApprovalThreshold: 70,
    
    // 自动审批置信度阈值
    autoApprovalConfidence: 0.8,
    
    // 基础验证权重
    basicValidationWeight: 0.3,
    
    // LLM评估权重
    llmEvaluationWeight: 0.7,
    
    // 是否启用安全规则特殊处理
    enableSecuritySpecialHandling: true,
    
    // 安全规则最低严重程度
    securityMinSeverity: 'medium'
  },
  
  // 存储配置
  storage: {
    // 规则存储根目录
    rulesRootDir: 'rules/learning-rules',
    
    // 是否按月份组织目录
    organizeByMonth: true,
    
    // 文件命名格式
    fileNameFormat: '{category}-{timestamp}-{hash}.md',
    
    // 是否保留原始分析数据
    keepRawAnalysis: true,
    
    // 原始数据存储目录
    rawDataDir: 'raw-data'
  },
  
  // 性能配置
  performance: {
    // 并发学习任务数
    concurrentLearningTasks: 3,
    
    // 单个任务超时时间（毫秒）
    taskTimeout: 5 * 60 * 1000, // 5分钟
    
    // 是否启用缓存
    enableCache: true,
    
    // 缓存过期时间（毫秒）
    cacheExpiration: 60 * 60 * 1000, // 1小时
    
    // 最大内存使用量（MB）
    maxMemoryUsage: 512
  },
  
  // 日志配置
  logging: {
    // 日志级别
    level: 'info',
    
    // 是否记录详细日志
    verbose: false,
    
    // 是否记录学习过程
    logLearningProcess: true,
    
    // 是否记录性能指标
    logPerformanceMetrics: true,
    
    // 日志文件路径
    logFilePath: 'logs/rule-learning.log'
  }
};

/**
 * 配置管理器
 */
class RuleLearningConfig {
  constructor(customConfig = {}) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, customConfig);
    this.validateConfig();
  }
  
  /**
   * 合并配置
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
    const { learning, generation, evaluation, storage, performance } = this.config;
    
    // 验证学习配置
    if (learning.minConfidence < 0 || learning.minConfidence > 1) {
      throw new Error('minConfidence 必须在 0-1 之间');
    }
    
    if (learning.minBatchSize < 1) {
      throw new Error('minBatchSize 必须大于 0');
    }
    
    // 验证生成配置
    if (generation.maxRulesPerLearning < 1) {
      throw new Error('maxRulesPerLearning 必须大于 0');
    }
    
    if (generation.deduplicationThreshold < 0 || generation.deduplicationThreshold > 1) {
      throw new Error('deduplicationThreshold 必须在 0-1 之间');
    }
    
    // 验证评估配置
    if (evaluation.autoApprovalThreshold < 0 || evaluation.autoApprovalThreshold > 100) {
      throw new Error('autoApprovalThreshold 必须在 0-100 之间');
    }
    
    if (evaluation.autoApprovalConfidence < 0 || evaluation.autoApprovalConfidence > 1) {
      throw new Error('autoApprovalConfidence 必须在 0-1 之间');
    }
    
    const totalWeight = evaluation.basicValidationWeight + evaluation.llmEvaluationWeight;
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      throw new Error('基础验证权重和LLM评估权重之和必须等于1.0');
    }
    
    // 验证性能配置
    if (performance.concurrentLearningTasks < 1) {
      throw new Error('concurrentLearningTasks 必须大于 0');
    }
    
    if (performance.taskTimeout < 1000) {
      throw new Error('taskTimeout 必须大于等于1000毫秒');
    }
  }
  
  /**
   * 获取配置值
   * @param {string} path - 配置路径，如 'learning.minConfidence'
   * @returns {*} 配置值
   */
  get(path) {
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
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
    return JSON.parse(JSON.stringify(this.config));
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
    this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
  
  /**
   * 从环境变量加载配置
   */
  loadFromEnv() {
    const envConfig = {};
    
    // 学习配置
    if (process.env.RULE_LEARNING_ENABLED !== undefined) {
      envConfig.learning = { ...envConfig.learning, enabled: process.env.RULE_LEARNING_ENABLED === 'true' };
    }
    
    if (process.env.RULE_LEARNING_MIN_CONFIDENCE) {
      envConfig.learning = { ...envConfig.learning, minConfidence: parseFloat(process.env.RULE_LEARNING_MIN_CONFIDENCE) };
    }
    
    if (process.env.RULE_LEARNING_BATCH_SIZE) {
      envConfig.learning = { ...envConfig.learning, minBatchSize: parseInt(process.env.RULE_LEARNING_BATCH_SIZE) };
    }
    
    // 生成配置
    if (process.env.RULE_GENERATION_MAX_RULES) {
      envConfig.generation = { ...envConfig.generation, maxRulesPerLearning: parseInt(process.env.RULE_GENERATION_MAX_RULES) };
    }
    
    // 评估配置
    if (process.env.RULE_EVALUATION_AUTO_APPROVAL_THRESHOLD) {
      envConfig.evaluation = { ...envConfig.evaluation, autoApprovalThreshold: parseInt(process.env.RULE_EVALUATION_AUTO_APPROVAL_THRESHOLD) };
    }
    
    if (process.env.RULE_EVALUATION_AUTO_APPROVAL_CONFIDENCE) {
      envConfig.evaluation = { ...envConfig.evaluation, autoApprovalConfidence: parseFloat(process.env.RULE_EVALUATION_AUTO_APPROVAL_CONFIDENCE) };
    }
    
    // 存储配置
    if (process.env.RULE_STORAGE_ROOT_DIR) {
      envConfig.storage = { ...envConfig.storage, rulesRootDir: process.env.RULE_STORAGE_ROOT_DIR };
    }
    
    // 性能配置
    if (process.env.RULE_LEARNING_CONCURRENT_TASKS) {
      envConfig.performance = { ...envConfig.performance, concurrentLearningTasks: parseInt(process.env.RULE_LEARNING_CONCURRENT_TASKS) };
    }
    
    if (Object.keys(envConfig).length > 0) {
      this.update(envConfig);
    }
  }
  
  /**
   * 保存配置到文件
   * @param {string} filePath - 文件路径
   */
  async saveToFile(filePath) {
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, JSON.stringify(this.config, null, 2), 'utf8');
  }
  
  /**
   * 从文件加载配置
   * @param {string} filePath - 文件路径
   */
  async loadFromFile(filePath) {
    const fs = await import('fs/promises');
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const config = JSON.parse(content);
      this.update(config);
    } catch (error) {
      throw new Error(`加载配置文件失败: ${error.message}`);
    }
  }
}

// 全局配置实例
let globalConfig = null;

/**
 * 获取全局配置实例
 * @param {Object} customConfig - 自定义配置
 * @returns {RuleLearningConfig} 配置实例
 */
function getRuleLearningConfig(customConfig = {}) {
  if (!globalConfig) {
    globalConfig = new RuleLearningConfig(customConfig);
    // 尝试从环境变量加载配置
    globalConfig.loadFromEnv();
  }
  return globalConfig;
}

/**
 * 重置全局配置
 */
function resetRuleLearningConfig() {
  globalConfig = null;
}

export {
  RuleLearningConfig,
  getRuleLearningConfig,
  resetRuleLearningConfig,
  DEFAULT_CONFIG
};