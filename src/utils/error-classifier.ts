/**
 * 错误分类器
 * 老王我把错误处理搞得明明白白的！不同错误类型做精确处理
 */

// 错误类型枚举
export enum ErrorType {
  // 系统错误
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  MEMORY_ERROR = 'MEMORY_ERROR',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',

  // 业务错误
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BUSINESS_LOGIC_ERROR = 'BUSINESS_LOGIC_ERROR',
  DATA_NOT_FOUND = 'DATA_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  // 外部服务错误
  LLM_SERVICE_ERROR = 'LLM_SERVICE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  API_ERROR = 'API_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',

  // 配置错误
  CONFIG_ERROR = 'CONFIG_ERROR',
  DEPENDENCY_ERROR = 'DEPENDENCY_ERROR'
}

// 错误严重级别
export enum ErrorSeverity {
  LOW = 'LOW',         // 低级别，不影响核心功能
  MEDIUM = 'MEDIUM',   // 中级别，影响部分功能
  HIGH = 'HIGH',       // 高级别，影响主要功能
  CRITICAL = 'CRITICAL' // 严重级别，系统无法正常工作
}

// 错误处理策略
export enum ErrorHandlingStrategy {
  IGNORE = 'IGNORE',           // 忽略错误
  LOG_ONLY = 'LOG_ONLY',       // 仅记录日志
  RETRY = 'RETRY',             // 重试
  FALLBACK = 'FALLBACK',       // 使用降级方案
  FAIL_FAST = 'FAIL_FAST',     // 快速失败
  USER_INTERVENTION = 'USER_INTERVENTION' // 需要用户干预
}

// 错误分类结果接口
export interface ErrorClassification {
  type: ErrorType;
  severity: ErrorSeverity;
  strategy: ErrorHandlingStrategy;
  retryable: boolean;
  userMessage: string;
  technicalMessage: string;
  suggestedActions: string[];
  metadata?: Record<string, any>;
}

/**
 * 错误分类器类
 */
export class ErrorClassifier {
  private static instance: ErrorClassifier;
  private errorPatterns: Map<RegExp, ErrorClassification> = new Map();

  private constructor() {
    this.initializePatterns();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): ErrorClassifier {
    if (!ErrorClassifier.instance) {
      ErrorClassifier.instance = new ErrorClassifier();
    }
    return ErrorClassifier.instance;
  }

  /**
   * 初始化错误模式匹配
   */
  private initializePatterns(): void {
    // 系统错误模式 - 内存错误
    this.addPattern(/^OutOfMemoryError|Heap out of memory|Cannot allocate memory|JavaScript heap out of memory/i, {
      type: ErrorType.MEMORY_ERROR,
      severity: ErrorSeverity.HIGH,
      strategy: ErrorHandlingStrategy.FAIL_FAST,
      retryable: false,
      userMessage: '系统内存不足，请稍后重试或联系管理员',
      technicalMessage: '内存溢出错误',
      suggestedActions: ['重启应用', '增加系统内存', '优化内存使用']
    });

    // 系统错误模式 - 内存不足相关
    this.addPattern(/Allocation failed|Maximum call stack size exceeded|RangeError: Maximum call stack size exceeded/i, {
      type: ErrorType.MEMORY_ERROR,
      severity: ErrorSeverity.HIGH,
      strategy: ErrorHandlingStrategy.FAIL_FAST,
      retryable: false,
      userMessage: '系统内存不足，请稍后重试或联系管理员',
      technicalMessage: '内存分配失败',
      suggestedActions: ['重启应用', '增加系统内存', '优化内存使用']
    });

    this.addPattern(/EACCES|EPERM|permission denied/i, {
      type: ErrorType.PERMISSION_DENIED,
      severity: ErrorSeverity.MEDIUM,
      strategy: ErrorHandlingStrategy.USER_INTERVENTION,
      retryable: false,
      userMessage: '权限不足，请检查文件访问权限',
      technicalMessage: '文件系统权限错误',
      suggestedActions: ['检查文件权限', '以管理员身份运行', '检查目录所有权']
    });

    this.addPattern(/ENOENT|no such file or directory/i, {
      type: ErrorType.FILE_SYSTEM_ERROR,
      severity: ErrorSeverity.MEDIUM,
      strategy: ErrorHandlingStrategy.USER_INTERVENTION,
      retryable: false,
      userMessage: '找不到指定文件，请检查文件路径',
      technicalMessage: '文件不存在错误',
      suggestedActions: ['检查文件路径', '创建缺失的文件', '验证文件名']
    });

    // 文件系统相关错误模式
    this.addPattern(/ENOTDIR|ENAMETOOLONG|ENFILE|EMFILE/i, {
      type: ErrorType.FILE_SYSTEM_ERROR,
      severity: ErrorSeverity.MEDIUM,
      strategy: ErrorHandlingStrategy.USER_INTERVENTION,
      retryable: false,
      userMessage: '文件系统操作失败，请检查文件路径和权限',
      technicalMessage: '文件系统错误',
      suggestedActions: ['检查文件路径', '验证文件权限', '检查磁盘空间']
    });

    this.addPattern(/EBUSY|EAGAIN|EWOULDBLOCK/i, {
      type: ErrorType.FILE_SYSTEM_ERROR,
      severity: ErrorSeverity.MEDIUM,
      strategy: ErrorHandlingStrategy.RETRY,
      retryable: true,
      userMessage: '文件系统繁忙，请稍后重试',
      technicalMessage: '文件系统暂时不可用',
      suggestedActions: ['等待后重试', '检查文件占用状态', '重启相关服务']
    });

    // 网络错误模式
    this.addPattern(/ECONNREFUSED|connection refused/i, {
      type: ErrorType.NETWORK_ERROR,
      severity: ErrorSeverity.HIGH,
      strategy: ErrorHandlingStrategy.RETRY,
      retryable: true,
      userMessage: '网络连接失败，请检查网络连接',
      technicalMessage: '连接被拒绝',
      suggestedActions: ['检查网络连接', '验证服务状态', '检查防火墙设置']
    });

    this.addPattern(/ETIMEDOUT|timeout/i, {
      type: ErrorType.NETWORK_ERROR,
      severity: ErrorSeverity.MEDIUM,
      strategy: ErrorHandlingStrategy.RETRY,
      retryable: true,
      userMessage: '请求超时，请稍后重试',
      technicalMessage: '网络超时',
      suggestedActions: ['检查网络速度', '增加超时时间', '重试请求']
    });

    // 网络和API错误模式
    this.addPattern(/HTTPError|FetchError|NetworkError|request.*timeout|request.*failed/i, {
      type: ErrorType.NETWORK_ERROR,
      severity: ErrorSeverity.HIGH,
      strategy: ErrorHandlingStrategy.RETRY,
      retryable: true,
      userMessage: '网络请求失败',
      technicalMessage: 'API调用错误',
      suggestedActions: ['检查网络连接', '重试请求', '检查API状态']
    });

    // LLM服务错误模式 - 具体模式放在前面
    this.addPattern(/API.*key.*invalid|please check your.*API.*key|OpenAI.*API.*key|401.*Unauthorized.*Invalid authentication|APIError.*exceeded.*quota/i, {
      type: ErrorType.LLM_SERVICE_ERROR,
      severity: ErrorSeverity.HIGH,
      strategy: ErrorHandlingStrategy.USER_INTERVENTION,
      retryable: false,
      userMessage: 'API密钥无效，请检查配置',
      technicalMessage: 'LLM服务认证失败',
      suggestedActions: ['检查API密钥', '验证服务配置', '联系服务提供商']
    });

    this.addPattern(/quota.*exceeded|exceeded.*quota|insufficient quota/i, {
      type: ErrorType.LLM_SERVICE_ERROR,
      severity: ErrorSeverity.HIGH,
      strategy: ErrorHandlingStrategy.USER_INTERVENTION,
      retryable: false,
      userMessage: '服务配额已用完，请检查账户余额',
      technicalMessage: 'LLM服务配额超限',
      suggestedActions: ['检查账户余额', '升级服务计划', '等待配额重置']
    });

    this.addPattern(/rate.*limit|429|too many requests|RateLimitError/i, {
      type: ErrorType.RATE_LIMIT_ERROR,
      severity: ErrorSeverity.MEDIUM,
      strategy: ErrorHandlingStrategy.RETRY,
      retryable: true,
      userMessage: '请求过于频繁，请稍后重试',
      technicalMessage: 'API调用频率限制',
      suggestedActions: ['降低请求频率', '实现请求队列', '升级服务计划']
    });

    // 配置错误模式
    this.addPattern(/ConfigError|configuration.*error|Missing required configuration|Configuration file not found|Invalid configuration format/i, {
      type: ErrorType.CONFIG_ERROR,
      severity: ErrorSeverity.HIGH,
      strategy: ErrorHandlingStrategy.FAIL_FAST,
      retryable: false,
      userMessage: '配置错误，请检查系统配置',
      technicalMessage: '配置文件错误',
      suggestedActions: ['检查配置文件', '验证配置格式', '重置为默认配置']
    });

    // 验证错误模式
    this.addPattern(/validation.*failed|invalid.*input/i, {
      type: ErrorType.VALIDATION_ERROR,
      severity: ErrorSeverity.LOW,
      strategy: ErrorHandlingStrategy.FAIL_FAST,
      retryable: false,
      userMessage: '输入数据格式错误，请检查输入',
      technicalMessage: '数据验证失败',
      suggestedActions: ['检查输入格式', '验证必填字段', '参考API文档']
    });

    // 数据库错误模式
    this.addPattern(/database.*connection|connection.*pool/i, {
      type: ErrorType.DATABASE_ERROR,
      severity: ErrorSeverity.HIGH,
      strategy: ErrorHandlingStrategy.RETRY,
      retryable: true,
      userMessage: '数据库连接失败，请稍后重试',
      technicalMessage: '数据库连接错误',
      suggestedActions: ['检查数据库状态', '验证连接配置', '检查连接池设置']
    });

    // JSON解析错误模式
    this.addPattern(/JSON.*parse|Unexpected token/i, {
      type: ErrorType.VALIDATION_ERROR,
      severity: ErrorSeverity.LOW,
      strategy: ErrorHandlingStrategy.LOG_ONLY,
      retryable: false,
      userMessage: '数据格式错误',
      technicalMessage: 'JSON解析失败',
      suggestedActions: ['检查JSON格式', '验证数据结构', '使用JSON验证器']
    });

    // 验证错误模式
    this.addPattern(/ValidationError|validation.*failed|invalid input|Schema validation|required field missing/i, {
      type: ErrorType.VALIDATION_ERROR,
      severity: ErrorSeverity.LOW,
      strategy: ErrorHandlingStrategy.FAIL_FAST,
      retryable: false,
      userMessage: '输入数据验证失败，请检查输入格式',
      technicalMessage: '数据验证错误',
      suggestedActions: ['检查输入格式', '验证必填字段', '参考API文档']
    });

    // 依赖错误模式 - 必须放在数据未找到模式之前，因为包含"not found"
    this.addPattern(/ModuleNotFoundError|Cannot find module|DependencyError|Required service.*not available|ImportError|Failed to import dependency/i, {
      type: ErrorType.DEPENDENCY_ERROR,
      severity: ErrorSeverity.HIGH,
      strategy: ErrorHandlingStrategy.FAIL_FAST,
      retryable: false,
      userMessage: '系统依赖错误，请联系技术支持',
      technicalMessage: '模块依赖问题',
      suggestedActions: ['检查依赖包', '重新安装依赖', '验证模块版本']
    });

    // 数据未找到错误模式
    this.addPattern(/NotFoundError|Resource not found|404.*not found|No record found|DataError/i, {
      type: ErrorType.DATA_NOT_FOUND,
      severity: ErrorSeverity.LOW,
      strategy: ErrorHandlingStrategy.LOG_ONLY,
      retryable: false,
      userMessage: '请求的数据未找到',
      technicalMessage: '资源不存在',
      suggestedActions: ['检查资源ID', '验证资源是否存在', '查看相关数据']
    });

    // 权限错误模式 (扩展) - 更精确的权限错误
    this.addPattern(/PermissionDenied|Access denied|403.*Forbidden|Insufficient permissions/i, {
      type: ErrorType.PERMISSION_DENIED,
      severity: ErrorSeverity.MEDIUM,
      strategy: ErrorHandlingStrategy.FAIL_FAST,
      retryable: false,
      userMessage: '访问权限不足',
      technicalMessage: '权限验证失败',
      suggestedActions: ['检查用户权限', '联系管理员', '验证访问令牌']
    });

    // API错误模式 - 排除更具体的错误类型
    this.addPattern(/402|405|500|502|503|API.*error|service.*unavailable|HTTPError.*Internal Server Error/i, {
      type: ErrorType.API_ERROR,
      severity: ErrorSeverity.HIGH,
      strategy: ErrorHandlingStrategy.RETRY,
      retryable: true,
      userMessage: '外部API服务错误',
      technicalMessage: 'API调用失败',
      suggestedActions: ['检查API状态', '重试请求', '联系服务提供商']
    });

    
    // 业务逻辑错误模式 - 更精确的模式
    this.addPattern(/^business.*logic.*error|^workflow.*error|^process.*failed/i, {
      type: ErrorType.BUSINESS_LOGIC_ERROR,
      severity: ErrorSeverity.MEDIUM,
      strategy: ErrorHandlingStrategy.LOG_ONLY,
      retryable: false,
      userMessage: '业务流程处理失败',
      technicalMessage: '业务逻辑错误',
      suggestedActions: ['检查业务规则', '验证输入参数', '查看业务日志']
    });
  }

  /**
   * 添加错误模式
   */
  private addPattern(pattern: RegExp, classification: ErrorClassification): void {
    this.errorPatterns.set(pattern, classification);
  }

  /**
   * 分类错误
   */
  classifyError(error: Error | string, context?: any): ErrorClassification {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    // 尝试匹配已知模式
    for (const [pattern, classification] of this.errorPatterns.entries()) {
      if (pattern.test(errorMessage)) {
        return {
          ...classification,
          metadata: {
            ...classification.metadata,
            originalMessage: errorMessage,
            stack: errorStack,
            context,
            pattern: pattern.source
          }
        };
      }
    }

    // 未知错误的默认分类
    return this.classifyUnknownError(error, context);
  }

  /**
   * 分类未知错误
   */
  private classifyUnknownError(error: Error | string, context?: any): ErrorClassification {
    const errorMessage = error instanceof Error ? error.message : (error || 'Unknown error');
    const errorStack = error instanceof Error ? error.stack : undefined;

    // 处理空错误消息的情况
    if (!errorMessage || errorMessage.trim() === '') {
      return {
        type: ErrorType.SYSTEM_ERROR,
        severity: ErrorSeverity.MEDIUM,
        strategy: ErrorHandlingStrategy.LOG_ONLY,
        retryable: false,
        userMessage: '未知错误',
        technicalMessage: '错误消息为空',
        suggestedActions: ['查看详细日志', '联系技术支持'],
        metadata: { originalMessage: errorMessage, stack: errorStack, context }
      };
    }

    // 根据错误消息内容进行启发式分类
    if (errorMessage.includes('SQL') || errorMessage.includes('database')) {
      return {
        type: ErrorType.DATABASE_ERROR,
        severity: ErrorSeverity.MEDIUM,
        strategy: ErrorHandlingStrategy.LOG_ONLY,
        retryable: true,
        userMessage: '数据库操作失败',
        technicalMessage: errorMessage,
        suggestedActions: ['检查SQL语法', '验证数据库连接', '查看日志详情'],
        metadata: { originalMessage: errorMessage, stack: errorStack, context }
      };
    }

    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('axios')) {
      return {
        type: ErrorType.NETWORK_ERROR,
        severity: ErrorSeverity.MEDIUM,
        strategy: ErrorHandlingStrategy.RETRY,
        retryable: true,
        userMessage: '网络通信失败',
        technicalMessage: errorMessage,
        suggestedActions: ['检查网络连接', '重试操作', '联系技术支持'],
        metadata: { originalMessage: errorMessage, stack: errorStack, context }
      };
    }

    // 默认为系统错误
    return {
      type: ErrorType.SYSTEM_ERROR,
      severity: ErrorSeverity.MEDIUM,
      strategy: ErrorHandlingStrategy.LOG_ONLY,
      retryable: false,
      userMessage: '系统内部错误',
      technicalMessage: errorMessage,
      suggestedActions: ['查看详细日志', '联系技术支持', '重启应用'],
      metadata: { originalMessage: errorMessage, stack: errorStack, context }
    };
  }

  /**
   * 获取错误处理建议
   */
  getHandlingAdvice(classification: ErrorClassification): {
    shouldRetry: boolean;
    retryDelay?: number;
    fallbackAvailable: boolean;
    escalationNeeded: boolean;
  } {
    return {
      shouldRetry: classification.retryable,
      retryDelay: this.calculateRetryDelay(classification),
      fallbackAvailable: classification.strategy === ErrorHandlingStrategy.FALLBACK,
      escalationNeeded: classification.severity === ErrorSeverity.CRITICAL ||
                       classification.severity === ErrorSeverity.HIGH
    };
  }

  /**
   * 计算重试延迟
   */
  private calculateRetryDelay(classification: ErrorClassification): number | undefined {
    if (!classification.retryable) {
      return undefined;
    }

    switch (classification.type) {
      case ErrorType.NETWORK_ERROR:
        return 5000; // 5秒
      case ErrorType.LLM_SERVICE_ERROR:
        return 10000; // 10秒
      case ErrorType.RATE_LIMIT_ERROR:
        return 60000; // 1分钟
      default:
        return 3000; // 3秒
    }
  }

  /**
   * 格式化用户友好的错误消息
   */
  formatUserMessage(classification: ErrorClassification, includeSuggestions: boolean = true): string {
    let message = classification.userMessage;

    if (includeSuggestions && classification.suggestedActions.length > 0) {
      message += '\n\n建议操作：\n' +
                classification.suggestedActions
                  .map((action, index) => `${index + 1}. ${action}`)
                  .join('\n');
    }

    return message;
  }
}

// 导出单例实例
export const errorClassifier = ErrorClassifier.getInstance();

/**
 * 便捷函数：分类错误
 */
export function classifyError(error: Error | string, context?: any): ErrorClassification {
  return errorClassifier.classifyError(error, context);
}

/**
 * 便捷函数：获取错误处理建议
 */
export function getErrorAdvice(error: Error | string, context?: any) {
  const classification = classifyError(error, context);
  return {
    classification,
    advice: errorClassifier.getHandlingAdvice(classification),
    userMessage: errorClassifier.formatUserMessage(classification)
  };
}

export default errorClassifier;