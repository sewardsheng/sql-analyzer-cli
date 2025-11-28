/**
 * 增强的日志系统
 * 提供结构化日志、性能监控、日志聚合和分析功能
 */

import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const os = require('os');

/**
 * 日志级别枚举
 */
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
} as const;

export type LogLevelType = typeof LogLevel[keyof typeof LogLevel];

/**
 * 日志类别枚举
 */
export const LogCategory = {
  SYSTEM: 'system',
  API: 'api',
  DATABASE: 'database',
  LLM: 'llm',
  RULE_LEARNING: 'rule_learning',
  PERFORMANCE: 'performance',
  SECURITY: 'security',
  BUSINESS: 'business',
  NETWORK: 'network',
  FILE_SYSTEM: 'file_system',
  HISTORY: 'history'
} as const;

export type LogCategoryType = typeof LogCategory[keyof typeof LogCategory];

/**
 * 日志选项接口
 */
export interface LoggerOptions {
  level?: LogLevelType;
  enableConsole?: boolean;
  enableFile?: boolean;
  enablePerformance?: boolean;
  enableAggregation?: boolean;
  logDir?: string;
  maxFileSize?: number;
  maxFiles?: number;
  aggregationInterval?: number;
  minAggregationLogs?: number;
}

/**
 * 元数据接口
 */
export interface LogMetadata {
  [key: string]: any;
  error?: {
    name?: string;
    message?: string;
    code?: string;
    stack?: string;
  };
  threadId?: string;
  type?: string;
  requestId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: string;
  userAgent?: string;
  ip?: string;
  contentLength?: string;
  operation?: string;
  args?: number;
  success?: boolean;
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  levelValue: number;
  category: LogCategoryType;
  message: string;
  metadata: LogMetadata;
  process: {
    pid: number;
    uptime: number;
    memory: NodeJS.MemoryUsage;
    cpu: NodeJS.CpuUsage;
  };
  hostname: string;
  thread: string;
}

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  timestamp: string;
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
  uptime: number;
  loadAvg: number[];
  freeMemory: number;
  totalMemory: number;
}

/**
 * 聚合数据接口
 */
export interface AggregationData {
  count: number;
  firstOccurrence: string;
  lastOccurrence: string;
  samples: Array<{
    timestamp: string;
    message: string;
    metadata: LogMetadata;
  }>;
}

/**
 * 搜索条件接口
 */
export interface SearchCriteria {
  category?: LogCategoryType;
  level?: string;
  message?: string;
  startTime?: string;
  endTime?: string;
  metadata?: Partial<LogMetadata>;
}

/**
 * 聚合报告接口
 */
export interface AggregationReport {
  timestamp: string;
  interval: number;
  summary: Record<string, Record<string, number>>;
  details: Record<string, AggregationData>;
  createdAt?: string;
  lastUpdated?: string;
}

/**
 * 日志装饰器选项接口
 */
export interface WithLoggingOptions {
  category?: LogCategoryType;
  operation?: string;
}

/**
 * 增强的日志记录器类
 */
export class EnhancedLogger {
  private options: Required<LoggerOptions>;
  private logBuffer: LogEntry[];
  private performanceMetrics: Map<string, PerformanceMetrics>;
  private aggregationData: Map<string, AggregationData>;
  private aggregationIntervalId?: NodeJS.Timeout;
  private performanceIntervalId?: NodeJS.Timeout;
  private cleanupIntervalId?: NodeJS.Timeout;

  constructor(options: LoggerOptions = {}) {
    this.options = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: true,
      enablePerformance: true,
      enableAggregation: true,
      logDir: './logs',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      aggregationInterval: 300000, // 5分钟
      minAggregationLogs: 10,
      ...options
    };

    // 日志缓冲区
    this.logBuffer = [];
    this.performanceMetrics = new Map();
    this.aggregationData = new Map();

    // 初始化
    this.initialize();
  }

  /**
   * 初始化日志系统
   */
  private async initialize(): Promise<void> {
    try {
      // 确保日志目录存在
      if (this.options.enableFile) {
        await fs.mkdir(this.options.logDir, { recursive: true });
      }

      // 启动日志聚合
      if (this.options.enableAggregation) {
        this.startAggregation();
      }

      // 启动性能监控
      if (this.options.enablePerformance) {
        this.startPerformanceMonitoring();
      }

      this.info(LogCategory.SYSTEM, '日志系统初始化完成');
    } catch (error) {
      console.error('日志系统初始化失败:', error);
    }
  }

  /**
   * 记录调试日志
   * @param category - 日志类别
   * @param message - 日志消息
   * @param metadata - 元数据
   */
  debug(category: string | LogCategoryType, message: string, metadata: LogMetadata = {}): void {
    // 确保类别是有效的日志类别
    const validCategory = this.validateCategory(category);
    this.log(LogLevel.DEBUG, validCategory, message, metadata);
  }

  /**
   * 记录信息日志
   * @param category - 日志类别
   * @param message - 日志消息
   * @param metadata - 元数据
   */
  info(category: string | LogCategoryType, message: string, metadata: LogMetadata = {}): void {
    // 确保类别是有效的日志类别
    const validCategory = this.validateCategory(category);
    this.log(LogLevel.INFO, validCategory, message, metadata);
  }

  /**
   * 记录警告日志
   * @param category - 日志类别
   * @param message - 日志消息
   * @param metadata - 元数据
   */
  warn(category: string | LogCategoryType, message: string, metadata: LogMetadata = {}): void {
    // 确保类别是有效的日志类别
    const validCategory = this.validateCategory(category);
    this.log(LogLevel.WARN, validCategory, message, metadata);
  }

  /**
   * 记录错误日志
   * @param category - 日志类别
   * @param message - 日志消息
   * @param error - 错误对象
   * @param metadata - 元数据
   */
  error(category: string | LogCategoryType, message: string, error: Error | null = null, metadata: LogMetadata = {}): void {
    // 确保类别是有效的日志类别
    const validCategory = this.validateCategory(category);
    const errorMetadata: LogMetadata = {
      ...metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        code: (error as any).code,
        stack: error.stack
      } : null
    };

    this.log(LogLevel.ERROR, validCategory, message, errorMetadata);
  }

  /**
   * 记录致命错误日志
   * @param category - 日志类别
   * @param message - 日志消息
   * @param error - 错误对象
   * @param metadata - 元数据
   */
  fatal(category: string | LogCategoryType, message: string, error: Error | null = null, metadata: LogMetadata = {}): void {
    // 确保类别是有效的日志类别
    const validCategory = this.validateCategory(category);
    const errorMetadata: LogMetadata = {
      ...metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        code: (error as any).code,
        stack: error.stack
      } : null
    };

    this.log(LogLevel.FATAL, validCategory, message, errorMetadata);
  }

  /**
   * 核心日志记录方法
   * @param level - 日志级别
   * @param category - 日志类别
   * @param message - 日志消息
   * @param metadata - 元数据
   */
  private async log(level: LogLevelType, category: LogCategoryType, message: string, metadata: LogMetadata = {}): Promise<void> {
    if (level < this.options.level) {
      return;
    }

    const logEntry = this.createLogEntry(level, category, message, metadata);

    // 控制台输出
    if (this.options.enableConsole) {
      this.outputToConsole(logEntry);
    }

    // 文件输出
    if (this.options.enableFile) {
      await this.outputToFile(logEntry);
    }

    // 添加到缓冲区用于聚合
    if (this.options.enableAggregation) {
      this.addToBuffer(logEntry);
    }

    // 更新聚合数据
    if (this.options.enableAggregation) {
      this.updateAggregationData(logEntry);
    }
  }

  /**
   * 创建日志条目
   * @param level - 日志级别
   * @param category - 日志类别
   * @param message - 日志消息
   * @param metadata - 元数据
   * @returns {LogEntry} 日志条目
   */
  private createLogEntry(level: LogLevelType, category: LogCategoryType, message: string, metadata: LogMetadata): LogEntry {
    const timestamp = new Date().toISOString();
    const logId = this.generateLogId(timestamp, category, message);

    return {
      id: logId,
      timestamp,
      level: this.getLevelName(level),
      levelValue: level,
      category,
      message,
      metadata,
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },
      hostname: require('os').hostname(),
      thread: metadata.threadId || 'main'
    };
  }

  /**
   * 输出到控制台
   * @param logEntry - 日志条目
   */
  private outputToConsole(logEntry: LogEntry): void {
    const { level, category, message, timestamp } = logEntry;
    const colorCode = this.getColorCode(logEntry.levelValue);
    const resetCode = '\x1b[0m';

    const formattedMessage = `${colorCode}[${timestamp}] ${level} [${category}] ${message}${resetCode}`;

    console.log(formattedMessage);
  }

  /**
   * 输出到文件
   * @param logEntry - 日志条目
   */
  private async outputToFile(logEntry: LogEntry): Promise<void> {
    try {
      // 创建一个安全的副本，避免循环引用
      const safeLogEntry = {
        id: logEntry.id,
        timestamp: logEntry.timestamp,
        level: logEntry.level,
        levelValue: logEntry.levelValue,
        category: logEntry.category,
        message: logEntry.message,
        // 只包含基本的元数据，避免可能的循环引用
        metadata: logEntry.error ? {
          name: logEntry.metadata?.error?.name,
          message: logEntry.metadata?.error?.message,
          code: logEntry.metadata?.error?.code
        } : null
      };

      const logLine = JSON.stringify(safeLogEntry) + '\n';
      const logFile = this.getLogFileName(logEntry.category, logEntry.level);
      const logPath = path.join(this.options.logDir, logFile);

      // 检查文件大小，如果超过限制则轮转
      await this.rotateLogFileIfNeeded(logPath);

      await fs.appendFile(logPath, logLine);
    } catch (error) {
      console.error('写入日志文件失败:', error);
    }
  }

  /**
   * 获取日志文件名
   * @param category - 日志类别
   * @param level - 日志级别
   * @returns {string} 文件名
   */
  private getLogFileName(category: LogCategoryType, level: string): string {
    const date = new Date().toISOString().split('T')[0];
    return `${category}-${level.toLowerCase()}-${date}.log`;
  }

  /**
   * 获取聚合日志文件名
   * @returns {string} 聚合日志文件名
   */
  private getAggregationLogFileName(): string {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const hour = now.getHours().toString().padStart(2, '0');

    // 每小时生成一个聚合文件，而不是每次都生成新文件
    return `aggregation-${date}-${hour}.json`;
  }

  /**
   * 轮转日志文件
   * @param logPath - 日志文件路径
   */
  private async rotateLogFileIfNeeded(logPath: string): Promise<void> {
    try {
      const stats = await fs.stat(logPath);

      if (stats.size >= this.options.maxFileSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedPath = logPath.replace('.log', `-${timestamp}.log`);

        await fs.rename(logPath, rotatedPath);

        // 清理旧文件
        await this.cleanOldLogFiles(logPath);
      }
    } catch (error) {
      // 文件不存在，忽略错误
    }
  }

  /**
   * 清理旧日志文件
   * @param logPath - 日志文件路径
   */
  private async cleanOldLogFiles(logPath: string): Promise<void> {
    try {
      const dir = path.dirname(logPath);
      const baseName = path.basename(logPath, '.log');
      const files = await fs.readdir(dir);

      const logFiles = files
        .filter(file => file.startsWith(baseName))
        .map(async (file) => {
          const filePath = path.join(dir, file);
          const stats = await fs.stat(filePath);
          return {
            name: file,
            path: filePath,
            mtime: stats.mtime
          };
        });

      // 等待所有文件状态获取完成
      const resolvedFiles = await Promise.all(logFiles);

      // 按修改时间排序
      resolvedFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // 删除超出限制的文件
      if (resolvedFiles.length > this.options.maxFiles) {
        const filesToDelete = resolvedFiles.slice(this.options.maxFiles);

        for (const file of filesToDelete) {
          try {
            await fs.unlink(file.path);
          } catch (error) {
            console.error('删除旧日志文件失败:', error);
          }
        }
      }
    } catch (error) {
      console.error('清理旧日志文件失败:', error);
    }
  }

  /**
   * 清理旧的聚合日志文件
   */
  private async cleanOldAggregationFiles(): Promise<void> {
    try {
      const dir = this.options.logDir;
      const files = await fs.readdir(dir);

      // 查找所有聚合文件
      const aggregationFiles = files
        .filter(file => file.startsWith('aggregation-') && file.endsWith('.json'))
        .map(async (file) => {
          const filePath = path.join(dir, file);
          const stats = await fs.stat(filePath);
          return {
            name: file,
            path: filePath,
            mtime: stats.mtime
          };
        });

      // 等待所有文件状态获取完成
      const resolvedFiles = await Promise.all(aggregationFiles);

      // 按修改时间排序
      resolvedFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // 保留最近24小时的文件，最多保留48个文件
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const maxFiles = 48; // 48小时，每小时一个文件

      const filesToDelete = resolvedFiles.filter((file, index) => {
        return index >= maxFiles || file.mtime < dayAgo;
      });

      for (const file of filesToDelete) {
        try {
          await fs.unlink(file.path);
        } catch (error) {
          console.error('删除旧聚合日志文件失败:', error);
        }
      }
    } catch (error) {
      console.error('清理旧聚合日志文件失败:', error);
    }
  }

  /**
   * 添加到缓冲区
   * @param logEntry - 日志条目
   */
  private addToBuffer(logEntry: LogEntry): void {
    this.logBuffer.push(logEntry);

    // 保持缓冲区大小在合理范围内
    if (this.logBuffer.length > 1000) {
      this.logBuffer = this.logBuffer.slice(-500);
    }
  }

  /**
   * 更新聚合数据
   * @param logEntry - 日志条目
   */
  private updateAggregationData(logEntry: LogEntry): void {
    const key = `${logEntry.category}_${logEntry.level}`;
    const current = this.aggregationData.get(key) || {
      count: 0,
      firstOccurrence: logEntry.timestamp,
      lastOccurrence: logEntry.timestamp,
      samples: []
    };

    current.count++;
    current.lastOccurrence = logEntry.timestamp;

    // 保存样本（最多保存10个）
    if (current.samples.length < 10) {
      current.samples.push({
        timestamp: logEntry.timestamp,
        message: logEntry.message,
        metadata: logEntry.metadata
      });
    }

    this.aggregationData.set(key, current);
  }

  /**
   * 启动日志聚合
   */
  private startAggregation(): void {
    this.aggregationIntervalId = setInterval(() => {
      this.performAggregation();
    }, this.options.aggregationInterval);

    // 每天清理一次旧的聚合文件
    this.cleanupIntervalId = setInterval(() => {
      this.cleanOldAggregationFiles();
    }, 24 * 60 * 60 * 1000); // 24小时
  }

  /**
   * 执行日志聚合
   */
  private async performAggregation(): Promise<void> {
    try {
      // 检查是否有足够的日志需要聚合
      if (this.logBuffer.length < this.options.minAggregationLogs) {
        return; // 如果日志量不足，跳过本次聚合
      }

      const aggregation = this.generateAggregationReport();

      if (Object.keys(aggregation.summary).length > 0) {
        await this.saveAggregationReport(aggregation);
      }
    } catch (error) {
      console.error('日志聚合失败:', error);
    }
  }

  /**
   * 生成聚合报告
   * @returns {AggregationReport} 聚合报告
   */
  private generateAggregationReport(): AggregationReport {
    const report: AggregationReport = {
      timestamp: new Date().toISOString(),
      interval: this.options.aggregationInterval,
      summary: {},
      details: {}
    };

    for (const [key, data] of this.aggregationData.entries()) {
      const [category, level] = key.split('_');

      if (!report.summary[category]) {
        report.summary[category] = {};
      }

      report.summary[category][level] = data.count;
      report.details[key] = data;
    }

    return report;
  }

  /**
   * 保存聚合报告
   * @param report - 聚合报告
   */
  private async saveAggregationReport(report: AggregationReport): Promise<void> {
    try {
      // 检查是否有实际的日志数据
      const hasLogData = Object.keys(report.summary).length > 0 &&
        Object.values(report.summary).some(levelCounts =>
          Object.values(levelCounts).some(count => count > 0)
        );

      if (!hasLogData) {
        return; // 没有实际日志数据，不生成文件
      }

      // 使用新的文件名策略，每小时一个文件
      const reportFileName = this.getAggregationLogFileName();
      const reportPath = path.join(this.options.logDir, reportFileName);

      // 检查文件是否已存在
      try {
        const fileExists = await fs.access(reportPath).then(() => true).catch(() => false);

        if (fileExists) {
          // 文件存在，读取现有内容并合并
          const existingData = await fs.readFile(reportPath, 'utf8');
          const existingReport = JSON.parse(existingData) as AggregationReport;

          // 合并聚合数据
          if (existingReport.details && report.details) {
            // 合并详细信息
            Object.keys(report.details).forEach(key => {
              if (existingReport.details[key]) {
                existingReport.details[key].count += report.details[key].count;
                existingReport.details[key].lastOccurrence = report.details[key].lastOccurrence;
                // 合并样本数据
                const existingSamples = existingReport.details[key].samples || [];
                const newSamples = report.details[key].samples || [];
                existingReport.details[key].samples = [...existingSamples, ...newSamples].slice(-10);
              } else {
                existingReport.details[key] = report.details[key];
              }
            });
          }

          // 更新摘要
          if (existingReport.summary && report.summary) {
            Object.keys(report.summary).forEach(category => {
              if (!existingReport.summary[category]) {
                existingReport.summary[category] = {};
              }
              Object.keys(report.summary[category]).forEach(level => {
                existingReport.summary[category][level] =
                  (existingReport.summary[category][level] || 0) + report.summary[category][level];
              });
            });
          }

          // 更新时间戳
          existingReport.lastUpdated = new Date().toISOString();

          // 写回文件
          await fs.writeFile(reportPath, JSON.stringify(existingReport, null, 2));
        } else {
          // 文件不存在，创建新文件
          report.createdAt = new Date().toISOString();
          await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        }
      } catch (error) {
        // 如果读取或合并失败，创建新文件
        report.createdAt = new Date().toISOString();
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      }

      // 清理聚合数据
      this.aggregationData.clear();
    } catch (error) {
      console.error('保存聚合报告失败:', error);
    }
  }

  /**
   * 启动性能监控
   */
  private startPerformanceMonitoring(): void {
    this.performanceIntervalId = setInterval(() => {
      this.collectPerformanceMetrics();
    }, 30000); // 每30秒收集一次
  }

  /**
   * 收集性能指标
   */
  private collectPerformanceMetrics(): void {
    const metrics: PerformanceMetrics = {
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      loadAvg: require('os').loadavg(),
      freeMemory: require('os').freemem(),
      totalMemory: require('os').totalmem()
    };

    this.performanceMetrics.set(metrics.timestamp, metrics);

    // 保持最近100个指标
    if (this.performanceMetrics.size > 100) {
      const oldestKey = this.performanceMetrics.keys().next().value;
      this.performanceMetrics.delete(oldestKey);
    }
  }

  /**
   * 记录性能指标
   * @param operation - 操作名称
   * @param duration - 持续时间（毫秒）
   * @param metadata - 元数据
   */
  recordPerformance(operation: string, duration: number, metadata: LogMetadata = {}): void {
    this.info(LogCategory.PERFORMANCE, `性能指标: ${operation}`, {
      operation,
      duration,
      ...metadata
    });
  }

  /**
   * 创建性能计时器
   * @param operation - 操作名称
   * @returns {Function} 计时器函数
   */
  createTimer(operation: string): (metadata?: LogMetadata) => number {
    const startTime = Date.now();

    return (metadata: LogMetadata = {}): number => {
      const duration = Date.now() - startTime;
      this.recordPerformance(operation, duration, metadata);
      return duration;
    };
  }

  /**
   * 获取性能指标
   * @returns {Array} 性能指标数组
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values());
  }

  /**
   * 获取最近的日志
   * @param limit - 限制数量
   * @param category - 类别过滤
   * @param level - 级别过滤
   * @returns {Array} 日志数组
   */
  getRecentLogs(limit: number = 100, category: LogCategoryType | null = null, level: string | null = null): LogEntry[] {
    let logs = [...this.logBuffer];

    if (category) {
      logs = logs.filter(log => log.category === category);
    }

    if (level) {
      logs = logs.filter(log => log.level === level);
    }

    return logs.slice(-limit);
  }

  /**
   * 搜索日志
   * @param criteria - 搜索条件
   * @returns {Array} 匹配的日志
   */
  searchLogs(criteria: SearchCriteria): LogEntry[] {
    const { category, level, message, startTime, endTime, metadata } = criteria;

    return this.logBuffer.filter(log => {
      if (category && log.category !== category) return false;
      if (level && log.level !== level) return false;
      if (message && !log.message.includes(message)) return false;
      if (startTime && new Date(log.timestamp) < new Date(startTime)) return false;
      if (endTime && new Date(log.timestamp) > new Date(endTime)) return false;

      if (metadata) {
        for (const [key, value] of Object.entries(metadata)) {
          if (log.metadata[key] !== value) return false;
        }
      }

      return true;
    });
  }

  /**
   * 生成日志ID
   * @param timestamp - 时间戳
   * @param category - 类别
   * @param message - 消息
   * @returns {string} 日志ID
   */
  private generateLogId(timestamp: string, category: LogCategoryType, message: string): string {
    const hash = createHash('md5');
    hash.update(timestamp + category + message);
    return hash.digest('hex').substr(0, 8);
  }

  /**
   * 获取级别名称
   * @param level - 级别值
   * @returns {string} 级别名称
   */
  private getLevelName(level: LogLevelType): string {
    const names = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
    return names[level] || 'UNKNOWN';
  }

  /**
   * 获取颜色代码
   * @param level - 级别值
   * @returns {string} 颜色代码
   */
  private getColorCode(level: LogLevelType): string {
    const colors: Record<number, string> = {
      0: '\x1b[36m', // DEBUG - 青色
      1: '\x1b[32m', // INFO - 绿色
      2: '\x1b[33m', // WARN - 黄色
      3: '\x1b[31m', // ERROR - 红色
      4: '\x1b[35m'  // FATAL - 紫色
    };
    return colors[level] || '\x1b[0m';
  }

  /**
   * 设置日志级别
   * @param level - 日志级别
   */
  setLevel(level: LogLevelType): void {
    this.options.level = level;
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    // 清理定时器
    if (this.aggregationIntervalId) {
      clearInterval(this.aggregationIntervalId);
    }
    if (this.performanceIntervalId) {
      clearInterval(this.performanceIntervalId);
    }
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }

    this.logBuffer = [];
    this.performanceMetrics.clear();
    this.aggregationData.clear();

    await this.log(LogLevel.INFO, LogCategory.SYSTEM, 'EnhancedLogger 已清理', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 验证日志类别
   * @param category - 日志类别
   * @returns {LogCategoryType} 有效的日志类别
   */
  private validateCategory(category: string | LogCategoryType): LogCategoryType {
    // 如果类别是预定义的有效类别，直接返回
    if (Object.values(LogCategory).includes(category as LogCategoryType)) {
      return category as LogCategoryType;
    }

    // 如果类别是系统预定义的，映射到system类别
    const systemCategories = ['EnhancedLogger', 'system', 'global'];
    if (systemCategories.includes(category)) {
      return LogCategory.SYSTEM;
    }

    // 对于其他情况，检查是否包含已知的关键字
    const categoryMapping: Record<string, LogCategoryType> = {
      'api': LogCategory.API,
      'database': LogCategory.DATABASE,
      'db': LogCategory.DATABASE,
      'sql': LogCategory.DATABASE,
      'llm': LogCategory.LLM,
      'ai': LogCategory.LLM,
      'rule': LogCategory.RULE_LEARNING,
      'learning': LogCategory.RULE_LEARNING,
      'performance': LogCategory.PERFORMANCE,
      'perf': LogCategory.PERFORMANCE,
      'security': LogCategory.SECURITY,
      'auth': LogCategory.SECURITY,
      'business': LogCategory.BUSINESS,
      'network': LogCategory.NETWORK,
      'file': LogCategory.FILE_SYSTEM,
      'fs': LogCategory.FILE_SYSTEM
    };

    // 检查类别是否包含关键字
    for (const [key, mappedCategory] of Object.entries(categoryMapping)) {
      if (category.toLowerCase().includes(key)) {
        return mappedCategory;
      }
    }

    // 默认映射到系统类别
    console.warn(`未知日志类别: ${category}，映射到 system 类别`);
    return LogCategory.SYSTEM;
  }
}

// 创建全局日志记录器实例
export const globalLogger = new EnhancedLogger({
  level: LogLevel.INFO,
  enableConsole: true,
  enableFile: true,
  enablePerformance: true,
  enableAggregation: true, // 保留聚合功能但调整频率
  logDir: './logs',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 10,
  aggregationInterval: 300000, // 改为5分钟，减少文件生成频率
  minAggregationLogs: 10 // 只有当有足够日志时才生成聚合文件
});

/**
 * 便捷的日志记录函数
 */
export const debug = (category: string | LogCategoryType, message: string, metadata?: LogMetadata) =>
  globalLogger.debug(category, message, metadata);

export const info = (category: string | LogCategoryType, message: string, metadata?: LogMetadata) =>
  globalLogger.info(category, message, metadata);

export const warn = (category: string | LogCategoryType, message: string, metadata?: LogMetadata) =>
  globalLogger.warn(category, message, metadata);

export const error = (category: string | LogCategoryType, message: string, err?: Error, metadata?: LogMetadata) =>
  globalLogger.error(category, message, err, metadata);

export const fatal = (category: string | LogCategoryType, message: string, err?: Error, metadata?: LogMetadata) =>
  globalLogger.fatal(category, message, err, metadata);

// 为了向后兼容，提供 logError 别名
export const logError = (category: string | LogCategoryType, message: string, err?: Error, metadata?: LogMetadata) =>
  globalLogger.error(category, message, err, metadata);

/**
 * 性能计时器
 * @param operation - 操作名称
 * @returns {Function} 计时器函数
 */
export const timer = (operation: string): ((metadata?: LogMetadata) => number) =>
  globalLogger.createTimer(operation);

/**
 * 日志装饰器
 * @param options - 装饰器选项
 * @returns {Function} 装饰器函数
 */
export function withLogging(options: WithLoggingOptions = {}) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const category = options.category || LogCategory.BUSINESS;
    const operation = options.operation || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function(...args: any[]) {
      const endTimer = timer(operation);

      try {
        const result = await originalMethod.apply(this, args);

        info(category, `操作完成: ${operation}`, {
          args: args.length,
          duration: endTimer(),
          success: true
        });

        return result;
      } catch (error) {
        error(category, `操作失败: ${operation}`, error as Error, {
          args: args.length,
          duration: endTimer(),
          success: false
        });

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * 记录API错误日志
 * @param method - HTTP方法
 * @param url - URL路径
 * @param errorObj - 错误对象
 * @param metadata - 额外元数据
 */
export async function logApiError(
  method: string,
  url: string,
  errorObj: Error,
  metadata: LogMetadata = {}
): Promise<void> {
  const requestId = metadata.requestId || generateRequestId();

  const errorMetadata: LogMetadata = {
    type: 'api_error',
    requestId,
    method,
    url,
    name: errorObj.name,
    message: errorObj.message,
    stack: errorObj.stack,
    ...metadata
  };

  await error(LogCategory.API, `API错误: ${method} ${url} - ${errorObj.message}`, errorObj, errorMetadata);
}

/**
 * 生成请求ID
 * @returns {string} 请求ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 记录API请求日志
 * @param req - 请求对象
 * @param res - 响应对象
 * @param startTime - 开始时间
 * @param endTime - 结束时间
 */
export async function logApiRequest(
  req: any,
  res: any,
  startTime: number,
  endTime: number
): Promise<void> {
  const duration = endTime - startTime;
  const requestId = req.id || generateRequestId();

  const metadata: LogMetadata = {
    type: 'api_request',
    requestId,
    method: req?.method || 'unknown',
    url: req?.url || 'unknown',
    statusCode: res.status,
    duration: `${duration}ms`,
    userAgent: (req?.raw?.headers?.['user-agent'] || req?.ip || 'unknown'),
    ip: (req?.raw?.headers?.['x-forwarded-for'] || req?.raw?.headers?.['x-real-ip'] || req?.ip || 'unknown'),
    contentLength: res.headers?.get('content-length') || '0'
  };

  const message = `${req.method} ${req.url} ${res.status} - ${duration}ms`;

  if (res.status >= 400) {
    await error(LogCategory.API, message, undefined, metadata);
  } else if (res.status >= 300) {
    await warn(LogCategory.API, message, metadata);
  } else {
    await info(LogCategory.API, message, metadata);
  }
}

/**
 * 设置全局错误处理
 * 捕获未处理的异常和Promise拒绝
 */
export function setupGlobalErrorHandlers(): void {
  // 捕获未处理的Promise拒绝
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    error(LogCategory.SYSTEM, '未处理的Promise拒绝',
      reason instanceof Error ? reason : new Error(String(reason)), {
      promise: promise.toString(),
      timestamp: new Date().toISOString()
    });
  });

  // 捕获未捕获的异常
  process.on('uncaughtException', (error: Error) => {
    console.error('未捕获的异常详情:', error);
    console.error('错误堆栈:', error.stack);
    logError(LogCategory.SYSTEM, '未捕获的异常', error, {
      timestamp: new Date().toISOString(),
      pid: process.pid,
      uptime: process.uptime()
    });

    // 给日志系统一些时间来写入日志
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  // 监听内存警告
  process.on('warning', (warning: Error) => {
    warn(LogCategory.SYSTEM, 'Node.js警告', {
      name: warning.name,
      message: warning.message,
      stack: warning.stack,
      timestamp: new Date().toISOString()
    });
  });

  info(LogCategory.SYSTEM, '全局错误处理已设置');
}