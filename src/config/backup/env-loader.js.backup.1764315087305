/**
 * 环境变量加载器
 * 负责将环境变量转换为配置对象
 */
export class EnvLoader {
  /**
   * 加载所有环境变量并转换为配置对象
   */
  static load() {
    return {
      server: {
        port: this.parseNumber('API_PORT'),
        host: process.env.API_HOST,
        cors: {
          enabled: this.parseBoolean('API_CORS_ENABLED', true),
          origin: process.env.API_CORS_ORIGIN
        },
        rateLimit: {
          windowMs: this.parseNumber('RATE_LIMIT_WINDOW'),
          max: this.parseNumber('RATE_LIMIT_MAX')
        }
      },

      llm: {
        apiKey: process.env.CUSTOM_API_KEY,
        model: process.env.CUSTOM_MODEL,
        baseUrl: process.env.CUSTOM_BASE_URL,
        timeout: this.parseNumber('LLM_TIMEOUT')
      },

      ruleLearning: {
        enabled: this.parseBoolean('RULE_LEARNING_ENABLED', true),
        minConfidence: this.parseFloat('RULE_LEARNING_MIN_CONFIDENCE'),
        batchSize: this.parseNumber('RULE_LEARNING_BATCH_SIZE'),
        maxRulesPerGeneration: this.parseNumber('RULE_GENERATION_MAX_RULES'),
        autoApproval: {
          enabled: this.parseBoolean('RULE_AUTO_APPROVAL_ENABLED', true),
          threshold: this.parseNumber('RULE_EVALUATION_AUTO_APPROVAL_THRESHOLD'),
          confidenceThreshold: this.parseFloat('RULE_EVALUATION_AUTO_APPROVAL_CONFIDENCE')
        },
        storage: {
          rootDir: process.env.RULE_STORAGE_ROOT_DIR
        },
        performance: {
          concurrentTasks: this.parseNumber('RULE_LEARNING_CONCURRENT_TASKS')
        }
      },

      knowledge: {
        enabled: this.parseBoolean('KNOWLEDGE_BASE_ENABLED', true),
        rulesDir: process.env.KNOWLEDGE_RULES_DIR,
        maxFileSize: this.parseNumber('KNOWLEDGE_MAX_FILE_SIZE')
      },

      logging: {
        level: process.env.LOG_LEVEL,
        enableRequestBody: this.parseBoolean('LOG_REQUEST_BODY'),
        enablePerformanceMetrics: this.parseBoolean('LOG_PERFORMANCE_METRICS', true)
      },

      system: {
        environment: process.env.NODE_ENV
      }
    };
  }

  /**
   * 解析数字类型环境变量
   */
  static parseNumber(envVar) {
    const value = process.env[envVar];
    return value ? parseInt(value, 10) : undefined;
  }

  /**
   * 解析浮点数类型环境变量
   */
  static parseFloat(envVar) {
    const value = process.env[envVar];
    return value ? parseFloat(value) : undefined;
  }

  /**
   * 解析布尔类型环境变量
   */
  static parseBoolean(envVar, defaultValue = undefined) {
    const value = process.env[envVar];
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  /**
   * 移除配置中的undefined值
   */
  static removeUndefined(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefined(item));
    }
    
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = this.removeUndefined(value);
      }
    }
    
    return result;
  }
}