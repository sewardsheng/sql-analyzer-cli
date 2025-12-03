/**
 * 日志脱敏器
 * 老王我把敏感信息都搞定了！防止API密钥、密码等泄露到日志中
 */

// 敏感信息类型
export enum SensitiveDataType {
  API_KEY = 'API_KEY',
  PASSWORD = 'PASSWORD',
  TOKEN = 'TOKEN',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  IP_ADDRESS = 'IP_ADDRESS',
  CREDIT_CARD = 'CREDIT_CARD',
  SQL_INJECTION = 'SQL_INJECTION',
  PERSONAL_INFO = 'PERSONAL_INFO',
  DATABASE_URL = 'DATABASE_URL'
}

// 脱敏配置接口
export interface SanitizationConfig {
  enabled: boolean;
  preserveLength: boolean;
  maskChar: string;
  visibleChars: number;
  customPatterns?: Map<RegExp, string>;
}

/**
 * 日志脱敏器类
 */
export class LogSanitizer {
  private static instance: LogSanitizer;
  private config: SanitizationConfig;
  private patterns: Map<SensitiveDataType, RegExp[]> = new Map();

  private constructor() {
    this.config = {
      enabled: true,
      preserveLength: true,
      maskChar: '*',
      visibleChars: 4,
      customPatterns: new Map()
    };

    this.initializePatterns();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): LogSanitizer {
    if (!LogSanitizer.instance) {
      LogSanitizer.instance = new LogSanitizer();
    }
    return LogSanitizer.instance;
  }

  /**
   * 初始化敏感信息模式
   */
  private initializePatterns(): void {
    // API密钥模式
    this.patterns.set(SensitiveDataType.API_KEY, [
      /api[_-]?key["\s:]+["']?([a-zA-Z0-9_-]{6,})/gi,
      /apikey["\s:]+["']?([a-zA-Z0-9_-]{6,})/gi,
      /\bsk-[a-zA-Z0-9_-]{8,}/gi,  // 降低到8个字符以上，涵盖测试用例
      /Bearer\s+([a-zA-Z0-9._-]+)/gi,
      /Authorization["\s:]+["']?([a-zA-Z0-9._-]{20,})/gi
    ]);

    // 密码模式
    this.patterns.set(SensitiveDataType.PASSWORD, [
      /password["\s:]+["']?([^"'\s]{6,})/gi,
      /pwd["\s:]+["']?([^"'\s]{6,})/gi,
      /pass["\s:]+["']?([^"'\s]{6,})/gi,
      /secret["\s:]+["']?([^"'\s]{8,})/gi
    ]);

    // Token模式
    this.patterns.set(SensitiveDataType.TOKEN, [
      /token["\s:]+["']?([a-zA-Z0-9._-]{16,})/gi,
      /jwt["\s:]+["']?([a-zA-Z0-9._-]{20,})/gi,
      /access[_-]?token["\s:]+["']?([a-zA-Z0-9._-]{16,})/gi,
      /refresh[_-]?token["\s:]+["']?([a-zA-Z0-9._-]{16,})/gi
    ]);

    // 邮箱模式
    this.patterns.set(SensitiveDataType.EMAIL, [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi
    ]);

    // 手机号模式
    this.patterns.set(SensitiveDataType.PHONE, [
      /\b1[3-9]\d{9}\b/g,  // 中国手机号
      /\+?\d{1,3}[-.\s]?\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g // 国际格式
    ]);

    // IP地址模式
    this.patterns.set(SensitiveDataType.IP_ADDRESS, [
      /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g // IPv4
    ]);

    // 信用卡模式
    this.patterns.set(SensitiveDataType.CREDIT_CARD, [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g // 信用卡号
    ]);

    // 数据库连接URL模式
    this.patterns.set(SensitiveDataType.DATABASE_URL, [
      /mysql:\/\/[^@\s]+:[^@\s]+@[^\/\s]+/gi,
      /postgresql:\/\/[^@\s]+:[^@\s]+@[^\/\s]+/gi,
      /mongodb:\/\/[^@\s]+:[^@\s]+@[^\/\s]+/gi,
      /redis:\/\/[^@:]+:[^@\s]+@[^\/\s]+/gi
    ]);

    // SQL注入尝试模式
    this.patterns.set(SensitiveDataType.SQL_INJECTION, [
      /(\b(union|select|insert|update|delete|drop|exec|script)\b)/gi,
      /(\/\*.*\*\/|--.*$)/gm,
      /('|(\\')|('')|(%27)|(%5C%27))/gi
    ]);

    // 个人信息模式（身份证、银行卡等）
    this.patterns.set(SensitiveDataType.PERSONAL_INFO, [
      /\b\d{17}[\dXx]\b/g,  // 中国身份证
      /\b\d{16,19}\b/g     // 可能的银行卡号
    ]);
  }

  /**
   * 脱敏字符串
   */
  sanitize(input: string, level: 'low' | 'medium' | 'high' = 'medium'): string {
    if (!this.config.enabled || !input) {
      return input || '';
    }

    let sanitized = input;

    // 根据级别决定脱敏强度
    const typesToProcess = this.getTypesByLevel(level);

    for (const dataType of typesToProcess) {
      const patterns = this.patterns.get(dataType) || [];

      for (const pattern of patterns) {
        sanitized = sanitized.replace(pattern, (match, ...args) => {
          return this.maskSensitiveData(match, dataType, args);
        });
      }
    }

    // 处理自定义模式
    if (this.config.customPatterns) {
      for (const [pattern, replacement] of this.config.customPatterns.entries()) {
        sanitized = sanitized.replace(pattern, replacement);
      }
    }

    return sanitized;
  }

  /**
   * 脱敏对象
   */
  sanitizeObject(obj: any, level: 'low' | 'medium' | 'high' = 'medium'): any {
    if (!this.config.enabled || !obj) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitize(obj, level);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, level));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};

      for (const [key, value] of Object.entries(obj)) {
        // 跳过已知的安全字段
        if (this.isSafeField(key)) {
          sanitized[key] = value;
        } else if (typeof value === 'string' && this.isSensitiveField(key)) {
          // 对已知敏感字段的字符串值进行强制脱敏
          sanitized[key] = this.maskSensitiveValue(key, value);
        } else {
          sanitized[key] = this.sanitizeObject(value, level);
        }
      }

      return sanitized;
    }

    return obj;
  }

  /**
   * 掩码敏感数据
   */
  private maskSensitiveData(match: string, dataType: SensitiveDataType, groups: string[]): string {
    if (!this.config.preserveLength) {
      return this.config.maskChar.repeat(match.length);
    }

    switch (dataType) {
      case SensitiveDataType.EMAIL:
        const emailMatch = match.match(/^([^@]+)@(.+)$/);
        if (emailMatch) {
          const username = emailMatch[1];
          const domain = emailMatch[2];
          const visibleChars = Math.min(this.config.visibleChars, username.length - 2);
          const maskedUsername = username.substring(0, visibleChars) +
                              this.config.maskChar.repeat(username.length - visibleChars);
          return `${maskedUsername}@${domain}`;
        }
        break;

      case SensitiveDataType.PHONE:
        if (match.length >= 7) {
          const visibleChars = Math.min(3, match.length - 4);
          return match.substring(0, visibleChars) +
                 this.config.maskChar.repeat(match.length - visibleChars);
        }
        break;

      case SensitiveDataType.API_KEY:
      case SensitiveDataType.TOKEN:
      case SensitiveDataType.PASSWORD:
        // 特殊处理sk-类型的API密钥
        if (match.startsWith('sk-')) {
          const visibleChars = Math.min(this.config.visibleChars + 3, match.length - 4); // +3 for "sk-"
          if (visibleChars > 3) {
            return match.substring(0, visibleChars) +
                   this.config.maskChar.repeat(match.length - visibleChars);
          }
        }

        // 特殊处理带字段名的敏感信息（password, apikey等）
        if (groups.length > 0) {
          // 对于有捕获组的模式（如 password, apikey等），保留字段名部分
          const fieldValue = groups[0];
          if (fieldValue && fieldValue.length > 0) {
            const fieldVisibleChars = Math.min(this.config.visibleChars, fieldValue.length - 2);
            if (fieldVisibleChars > 0) {
              const maskedValue = fieldValue.substring(0, fieldVisibleChars) +
                                this.config.maskChar.repeat(fieldValue.length - fieldVisibleChars);
              return match.replace(fieldValue, maskedValue);
            }
          }
        }

        // 特殊处理Bearer Token - 保留Bearer前缀
        if (dataType === SensitiveDataType.API_KEY &&
            (match.includes('Bearer') || match.includes('Authorization'))) {
          if (groups.length > 0) {
            const token = groups[0];
            const tokenVisibleChars = Math.min(this.config.visibleChars, token.length - 4);
            if (tokenVisibleChars > 0) {
              const maskedToken = token.substring(0, tokenVisibleChars) +
                                 this.config.maskChar.repeat(token.length - tokenVisibleChars);
              // 根据原始模式返回
              if (match.includes('Bearer')) {
                return `Bearer ${maskedToken}`;
              } else if (match.includes('Authorization')) {
                return `Authorization: ${maskedToken}`;
              }
            }
          } else {
            // 如果没有捕获组，直接处理整个匹配
            const tokens = match.split(/\s+/);
            if (tokens.length >= 2 && (tokens[0] === 'Bearer' || tokens[0] === 'Authorization:')) {
              const token = tokens[1];
              const tokenVisibleChars = Math.min(this.config.visibleChars, token.length - 4);
              if (tokenVisibleChars > 0) {
                const maskedToken = token.substring(0, tokenVisibleChars) +
                                   this.config.maskChar.repeat(token.length - tokenVisibleChars);
                return `${tokens[0]} ${maskedToken}`;
              }
            }
          }
        }

        // 标准API密钥处理
        const keyVisibleChars = Math.min(this.config.visibleChars, match.length - 4);
        if (keyVisibleChars > 0) {
          return match.substring(0, keyVisibleChars) +
                 this.config.maskChar.repeat(match.length - keyVisibleChars);
        }
        break;

      case SensitiveDataType.DATABASE_URL:
        // 掩码数据库URL中的密码部分
        return match.replace(/(:\/\/[^:]+:)[^@]+(@)/, (match, prefix, suffix) => {
          return prefix + this.config.maskChar.repeat(8) + suffix;
        });

      case SensitiveDataType.IP_ADDRESS:
        // 对IP地址进行部分掩码
        const ipParts = match.split('.');
        if (ipParts.length === 4) {
          return `${ipParts[0]}.${ipParts[1]}.${this.config.maskChar.repeat(ipParts[2].length)}.${ipParts[3]}`;
        }
        break;

      default:
        // 默认保留前后各n个字符
        if (match.length > this.config.visibleChars * 2) {
          const start = match.substring(0, this.config.visibleChars);
          const end = match.substring(match.length - this.config.visibleChars);
          const middle = this.config.maskChar.repeat(match.length - this.config.visibleChars * 2);
          return start + middle + end;
        }
        break;
    }

    // 默认完全掩码
    return this.config.maskChar.repeat(match.length);
  }

  /**
   * 根据脱敏级别获取要处理的数据类型
   */
  private getTypesByLevel(level: 'low' | 'medium' | 'high'): SensitiveDataType[] {
    switch (level) {
      case 'low':
        return [
          SensitiveDataType.API_KEY,
          SensitiveDataType.PASSWORD,
          SensitiveDataType.TOKEN,
          SensitiveDataType.DATABASE_URL
        ];

      case 'medium':
        return [
          SensitiveDataType.API_KEY,
          SensitiveDataType.PASSWORD,
          SensitiveDataType.TOKEN,
          SensitiveDataType.DATABASE_URL,
          SensitiveDataType.EMAIL,
          SensitiveDataType.PHONE,
          SensitiveDataType.CREDIT_CARD
        ];

      case 'high':
        return Array.from(this.patterns.keys());

      default:
        return Array.from(this.patterns.keys());
    }
  }

  /**
   * 检查字段是否安全（不需要脱敏）
   */
  private isSafeField(key: string): boolean {
    const safeFields = [
      'id', 'timestamp', 'date', 'time', 'status', 'count', 'total',
      'success', 'error', 'message', 'level', 'category', 'duration',
      'version', 'environment', 'service', 'module', 'function'
    ];

    return safeFields.includes(key.toLowerCase()) ||
           key.toLowerCase().includes('stat') ||
           key.toLowerCase().includes('metric') ||
           key.toLowerCase().includes('config');
  }

  /**
   * 检查字段是否包含敏感信息
   */
  private isSensitiveField(key: string): boolean {
    const sensitiveFields = [
      'password', 'pwd', 'pass', 'secret', 'token', 'apikey', 'apiKey',
      'api_key', 'email', 'phone', 'creditcard', 'ssn', 'userid', 'username'
    ];

    return sensitiveFields.includes(key.toLowerCase()) ||
           key.toLowerCase().includes('password') ||
           key.toLowerCase().includes('secret') ||
           key.toLowerCase().includes('token') ||
           key.toLowerCase().includes('key') ||
           key.toLowerCase().includes('email');
  }

  /**
   * 对敏感字段的值进行脱敏
   */
  private maskSensitiveValue(fieldName: string, value: string): string {
    const lowerFieldName = fieldName.toLowerCase();

    // 根据字段类型选择不同的脱敏策略
    if (lowerFieldName.includes('password') || lowerFieldName.includes('pwd') || lowerFieldName.includes('pass') || lowerFieldName.includes('secret')) {
      // 密码完全掩码
      return this.config.maskChar.repeat(value.length);
    }

    if (lowerFieldName.includes('email')) {
      // 邮箱脱敏：user@example.com -> us****@example.com
      const emailMatch = value.match(/^([^@]+)@(.+)$/);
      if (emailMatch) {
        const username = emailMatch[1];
        const domain = emailMatch[2];
        const visibleChars = Math.min(2, username.length - 2);
        const maskedUsername = username.substring(0, visibleChars) +
                            this.config.maskChar.repeat(username.length - visibleChars);
        return `${maskedUsername}@${domain}`;
      }
    }

    if (lowerFieldName.includes('key') || lowerFieldName.includes('token')) {
      // API密钥/Token脱敏：保留前几个字符
      const visibleChars = Math.min(4, value.length - 2);
      if (visibleChars > 0) {
        return value.substring(0, visibleChars) +
               this.config.maskChar.repeat(value.length - visibleChars);
      }
    }

    // 默认部分脱敏
    if (value.length > 6) {
      const visibleChars = 3;
      return value.substring(0, visibleChars) +
             this.config.maskChar.repeat(value.length - visibleChars);
    }

    return this.config.maskChar.repeat(value.length);
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<SanitizationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 添加自定义脱敏模式
   */
  addCustomPattern(pattern: RegExp, replacement: string): void {
    if (!this.config.customPatterns) {
      this.config.customPatterns = new Map();
    }
    this.config.customPatterns.set(pattern, replacement);
  }

  /**
   * 移除自定义脱敏模式
   */
  removeCustomPattern(pattern: RegExp): void {
    this.config.customPatterns?.delete(pattern);
  }

  /**
   * 检测敏感信息（不进行脱敏，仅检测）
   */
  detectSensitiveData(input: string): {
    found: boolean;
    types: SensitiveDataType[];
    matches: Array<{ type: SensitiveDataType; match: string; position: number }>;
  } {
    const matches: Array<{ type: SensitiveDataType; match: string; position: number }> = [];
    const foundTypes = new Set<SensitiveDataType>();

    for (const [dataType, patterns] of this.patterns.entries()) {
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(input)) !== null) {
          matches.push({
            type: dataType,
            match: match[0],
            position: match.index
          });
          foundTypes.add(dataType);
        }
      }
    }

    return {
      found: matches.length > 0,
      types: Array.from(foundTypes),
      matches
    };
  }

  /**
   * 生成脱敏报告
   */
  generateSanitizationReport(input: string): {
    originalLength: number;
    sanitizedLength: number;
    sensitiveDataCount: number;
    dataTypesFound: SensitiveDataType[];
    sanitizedSample: string;
  } {
    const detection = this.detectSensitiveData(input);
    const sanitized = this.sanitize(input, 'medium');

    return {
      originalLength: input.length,
      sanitizedLength: sanitized.length,
      sensitiveDataCount: detection.matches.length,
      dataTypesFound: detection.types,
      sanitizedSample: sanitized.substring(0, 200) + (sanitized.length > 200 ? '...' : '')
    };
  }

  /**
   * 获取当前配置
   */
  getConfig(): SanitizationConfig {
    return { ...this.config };
  }

  /**
   * 启用/禁用脱敏
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * 获取支持的敏感数据类型
   */
  getSupportedTypes(): SensitiveDataType[] {
    return Array.from(this.patterns.keys());
  }
}

// 导出单例实例
export const logSanitizer = LogSanitizer.getInstance();

/**
 * 便捷函数：脱敏字符串
 */
export function sanitizeLog(input: string, level?: 'low' | 'medium' | 'high'): string {
  return logSanitizer.sanitize(input, level);
}

/**
 * 便捷函数：脱敏对象
 */
export function sanitizeLogObject(obj: any, level?: 'low' | 'medium' | 'high'): any {
  return logSanitizer.sanitizeObject(obj, level);
}

/**
 * 便捷函数：检测敏感数据
 */
export function detectSensitiveData(input: string) {
  return logSanitizer.detectSensitiveData(input);
}

export default logSanitizer;