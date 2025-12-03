/**
 * 应用全局配置常量
 * 老王我把所有散落的魔法数字都集中到这里管理！
 */

export const APP_CONFIG = {
  // ==================== 评分系统配置 ====================
  SCORING: {
    // 质量评分阈值
    QUALITY_THRESHOLDS: {
      EXCELLENT: 90,    // 优秀
      GOOD: 80,        // 良好
      AVERAGE: 70,     // 一般
      POOR: 60,        // 较差
      MINIMUM: 40      // 最低
    },

    // 默认评分
    DEFAULT_SCORES: {
      BASE: 50,           // 基础分数
      RULE_GENERATION: 70, // 规则生成默认分
      LLM_EVALUATION: 70,  // LLM评估默认分
      MIN_ADJUSTED: 60     // 最低调整分数
    },

    // 评分调整
    SCORE_ADJUSTMENTS: {
      MINIMUM_BONUS: 15,    // 最低加分
      BASE_FLOOR: 60,       // 基础地板分
      AUTO_APPROVE: 80      // 自动批准阈值
    },

    // 字段扣分规则
    FIELD_PENALTIES: {
      MISSING_CRITICAL: 20,  // 缺少关键字段
      MISSING_IMPORTANT: 15, // 缺少重要字段
      MISSING_MINOR: 10,     // 缺少次要字段
      QUALITY_ISSUE: 10      // 质量问题扣分
    }
  },

  // ==================== 规则管理配置 ====================
  RULE_MANAGEMENT: {
    // 文件分类阈值 (基于FileMover.ts)
    CLASSIFICATION_THRESHOLDS: {
      APPROVED: 85,      // 批准阈值
      MANUAL_REVIEW: 65,  // 手动审核阈值
      LOW_QUALITY: 0     // 低质量阈值（其余）
    },

    // 规则验证配置
    VALIDATION: {
      MAX_RULES_PER_BATCH: 10,    // 每批次最大规则数
      MIN_SQL_LENGTH: 10,         // 最小SQL长度
      MAX_RULE_LENGTH: 5000       // 最大规则长度
    }
  },

  // ==================== 系统性能配置 ====================
  PERFORMANCE: {
    // 批处理配置
    BATCH: {
      DEFAULT_SIZE: 10,        // 默认批处理大小
      MAX_SIZE: 50,           // 最大批处理大小
      MAX_FILE_SIZE: 10485760  // 最大文件大小 (10MB)
    },

    // 缓存配置
    CACHE: {
      TIMEOUT: 1800000,       // 30分钟缓存 (毫秒)
      MAX_SIZE: 1000,         // 最大缓存条目
      CLEANUP_INTERVAL: 30000 // 清理间隔 (毫秒)
    },

    // 并发配置
    CONCURRENCY: {
      DEFAULT: 3,     // 默认并发数
      MAX: 10         // 最大并发数
    }
  },

  // ==================== API和接口配置 ====================
  API: {
    // 分页配置
    PAGINATION: {
      DEFAULT_PAGE_SIZE: 10,  // 默认页大小
      MAX_PAGE_SIZE: 100      // 最大页大小
    },

    // 请求限制
    REQUEST_LIMITS: {
      MAX_SQL_LENGTH: 50000,      // 最大SQL长度
      MAX_BATCH_SIZE: 50,         // 最大批量大小
      MAX_INPUT_LENGTH: 1000,     // 最大输入长度（日志显示）
      MAX_BODY_PREVIEW: 100       // 最大请求体预览长度
    },

    // 响应配置
    RESPONSE: {
      DEFAULT_CONFIDENCE: 0.85,  // 默认置信度
      TIMEOUT_OFFSET: 100        // 超时偏移（毫秒）
    }
  },

  // ==================== 日志和监控配置 ====================
  LOGGING: {
    // 文件配置
    FILES: {
      MAX_SIZE: 10485760,        // 10MB
      MAX_FILES: 10,            // 最大文件数
      RETENTION_HOURS: 48        // 保留时间（小时）
    },

    // 缓冲区配置
    BUFFER: {
      MAX_SIZE: 1000,           // 最大缓冲区大小
      TRIM_SIZE: 500,           // 修剪大小
      AGGREGATION_INTERVAL: 300000, // 聚合间隔 (5分钟)
      MIN_AGGREGATION_LOGS: 10  // 最小聚合日志数
    },

    // 性能监控
    PERFORMANCE: {
      COLLECTION_INTERVAL: 30000,  // 收集间隔 (30秒)
      MAX_METRICS: 100,           // 最大指标数
      SAMPLE_SIZE: 10             // 样本大小
    }
  },

  // ==================== 网络和服务器配置 ====================
  NETWORK: {
    // 端口配置
    PORTS: {
      DEFAULT_API: 3000,      // 默认API端口
      HEALTH_CHECK: 8080     // 健康检查端口
    },

    // 连接配置
    CONNECTION: {
      MAX_ATTEMPTS: 50,       // 最大尝试次数
      TIMEOUT: 30000,         // 超时时间 (30秒)
      RETRY_DELAY: 1000       // 重试延迟 (毫秒)
    }
  },

  // ==================== 数据库识别配置 ====================
  DATABASE: {
    // 置信度配置
    CONFIDENCE: {
      BASE: 0.4,              // 基础置信度
      MULTIPLIER: 0.15,       // 倍数
      MAX: 0.9               // 最大置信度
    },

    // 上下文加分
    CONTEXT_BONUS: 10
  },

  // ==================== 安全配置 ====================
  SECURITY: {
    // 限流配置
    RATE_LIMITING: {
      DEFAULT_WINDOW: 900000,   // 默认窗口 (15分钟)
      DEFAULT_MAX: 100,         // 默认最大请求数
      ANALYSIS_WINDOW: 600000,  // 分析窗口 (10分钟)
      ANALYSIS_MAX: 20,         // 分析最大请求数
      ADMIN_WINDOW: 300000,     // 管理窗口 (5分钟)
      ADMIN_MAX: 200            // 管理最大请求数
    },

    // CORS配置
    CORS: {
      MAX_AGE: 600  // 最大缓存时间（秒）
    }
  },

  // ==================== 规则学习配置 ====================
  RULE_LEARNING: {
    // 默认配置
    DEFAULTS: {
      MIN_CONFIDENCE: 0.7,     // 最小置信度
      MIN_BATCH_SIZE: 5,       // 最小批处理大小
      AUTO_APPROVE_THRESHOLD: 80  // 自动批准阈值 (百分比)
    },

    // 质量权重
    QUALITY_WEIGHTS: {
      CLARITY: 0.95,     // 清晰度权重
      CONSISTENCY: 0.9   // 一致性权重
    }
  }
};

/**
 * 配置验证函数
 */
export function validateConfig(): void {
  const requiredPaths = [
    'SCORING.QUALITY_THRESHOLDS',
    'PERFORMANCE.BATCH.DEFAULT_SIZE',
    'API.REQUEST_LIMITS.MAX_SQL_LENGTH',
    'LOGGING.FILES.MAX_SIZE'
  ];

  for (const path of requiredPaths) {
    const value = getNestedValue(APP_CONFIG, path);
    if (value === undefined || value === null) {
      throw new Error(`配置项缺失: ${path}`);
    }
  }
}

/**
 * 获取嵌套配置值
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * 获取配置值的安全包装器
 */
export function getConfig(path: string, defaultValue?: any): any {
  try {
    const value = getNestedValue(APP_CONFIG, path);
    return value !== undefined ? value : defaultValue;
  } catch (error) {
    console.warn(`配置获取失败: ${path}, 使用默认值:`, defaultValue);
    return defaultValue;
  }
}

export default APP_CONFIG;