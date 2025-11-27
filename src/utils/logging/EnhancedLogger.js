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
};

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
  FILE_SYSTEM: 'file_system'
};

/**
 * 增强的日志记录器类
 */
export class EnhancedLogger {
  constructor(options = {}) {
    this.options = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: true,
      enablePerformance: true,
      enableAggregation: true,
      logDir: './logs',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      aggregationInterval: 60000, // 1分钟
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
  async initialize() {
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
      
      this.info('EnhancedLogger', '日志系统初始化完成', {
        options: this.options,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('日志系统初始化失败:', error);
    }
  }

  /**
   * 记录调试日志
   * @param {string} category - 日志类别
   * @param {string} message - 日志消息
   * @param {Object} metadata - 元数据
   */
  debug(category, message, metadata = {}) {
    this.log(LogLevel.DEBUG, category, message, metadata);
  }

  /**
   * 记录信息日志
   * @param {string} category - 日志类别
   * @param {string} message - 日志消息
   * @param {Object} metadata - 元数据
   */
  info(category, message, metadata = {}) {
    this.log(LogLevel.INFO, category, message, metadata);
  }

  /**
   * 记录警告日志
   * @param {string} category - 日志类别
   * @param {string} message - 日志消息
   * @param {Object} metadata - 元数据
   */
  warn(category, message, metadata = {}) {
    this.log(LogLevel.WARN, category, message, metadata);
  }

  /**
   * 记录错误日志
   * @param {string} category - 日志类别
   * @param {string} message - 日志消息
   * @param {Error} error - 错误对象
   * @param {Object} metadata - 元数据
   */
  error(category, message, error = null, metadata = {}) {
    const errorMetadata = {
      ...metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      } : null
    };
    
    this.log(LogLevel.ERROR, category, message, errorMetadata);
  }

  /**
   * 记录致命错误日志
   * @param {string} category - 日志类别
   * @param {string} message - 日志消息
   * @param {Error} error - 错误对象
   * @param {Object} metadata - 元数据
   */
  fatal(category, message, error = null, metadata = {}) {
    const errorMetadata = {
      ...metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      } : null
    };
    
    this.log(LogLevel.FATAL, category, message, errorMetadata);
  }

  /**
   * 核心日志记录方法
   * @param {number} level - 日志级别
   * @param {string} category - 日志类别
   * @param {string} message - 日志消息
   * @param {Object} metadata - 元数据
   */
  async log(level, category, message, metadata = {}) {
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
   * @param {number} level - 日志级别
   * @param {string} category - 日志类别
   * @param {string} message - 日志消息
   * @param {Object} metadata - 元数据
   * @returns {Object} 日志条目
   */
  createLogEntry(level, category, message, metadata) {
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
   * @param {Object} logEntry - 日志条目
   */
  outputToConsole(logEntry) {
    const { level, category, message, timestamp, metadata } = logEntry;
    const colorCode = this.getColorCode(logEntry.levelValue);
    const resetCode = '\x1b[0m';
    
    const formattedMessage = `${colorCode}[${timestamp}] ${level} [${category}] ${message}${resetCode}`;
    
    console.log(formattedMessage);
    
    // 如果有元数据，也输出
    if (Object.keys(metadata).length > 0) {
      console.log('  Metadata:', JSON.stringify(metadata, null, 2));
    }
  }

  /**
   * 输出到文件
   * @param {Object} logEntry - 日志条目
   */
  async outputToFile(logEntry) {
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
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
   * @param {string} category - 日志类别
   * @param {string} level - 日志级别
   * @returns {string} 文件名
   */
  getLogFileName(category, level) {
    const date = new Date().toISOString().split('T')[0];
    return `${category}-${level.toLowerCase()}-${date}.log`;
  }

  /**
   * 轮转日志文件
   * @param {string} logPath - 日志文件路径
   */
  async rotateLogFileIfNeeded(logPath) {
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
   * @param {string} logPath - 日志文件路径
   */
  async cleanOldLogFiles(logPath) {
    try {
      const dir = path.dirname(logPath);
      const baseName = path.basename(logPath, '.log');
      const files = await fs.readdir(dir);
      
      const logFiles = files
        .filter(file => file.startsWith(baseName))
        .map(file => ({
          name: file,
          path: path.join(dir, file),
          mtime: fs.stat(path.join(dir, file)).then(stats => stats.mtime)
        }));
      
      // 按修改时间排序
      logFiles.sort((a, b) => b.mtime - a.mtime);
      
      // 删除超出限制的文件
      if (logFiles.length > this.options.maxFiles) {
        const filesToDelete = logFiles.slice(this.options.maxFiles);
        
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
   * 添加到缓冲区
   * @param {Object} logEntry - 日志条目
   */
  addToBuffer(logEntry) {
    this.logBuffer.push(logEntry);
    
    // 保持缓冲区大小在合理范围内
    if (this.logBuffer.length > 1000) {
      this.logBuffer = this.logBuffer.slice(-500);
    }
  }

  /**
   * 更新聚合数据
   * @param {Object} logEntry - 日志条目
   */
  updateAggregationData(logEntry) {
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
  startAggregation() {
    setInterval(() => {
      this.performAggregation();
    }, this.options.aggregationInterval);
  }

  /**
   * 执行日志聚合
   */
  async performAggregation() {
    try {
      const aggregation = this.generateAggregationReport();
      
      if (Object.keys(aggregation).length > 0) {
        await this.saveAggregationReport(aggregation);
      }
    } catch (error) {
      console.error('日志聚合失败:', error);
    }
  }

  /**
   * 生成聚合报告
   * @returns {Object} 聚合报告
   */
  generateAggregationReport() {
    const report = {
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
   * @param {Object} report - 聚合报告
   */
  async saveAggregationReport(report) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = path.join(this.options.logDir, `aggregation-${timestamp}.json`);
      
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      // 清理聚合数据
      this.aggregationData.clear();
    } catch (error) {
      console.error('保存聚合报告失败:', error);
    }
  }

  /**
   * 启动性能监控
   */
  startPerformanceMonitoring() {
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 30000); // 每30秒收集一次
  }

  /**
   * 收集性能指标
   */
  collectPerformanceMetrics() {
    const metrics = {
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
   * @param {string} operation - 操作名称
   * @param {number} duration - 持续时间（毫秒）
   * @param {Object} metadata - 元数据
   */
  recordPerformance(operation, duration, metadata = {}) {
    this.info(LogCategory.PERFORMANCE, `性能指标: ${operation}`, {
      operation,
      duration,
      ...metadata
    });
  }

  /**
   * 创建性能计时器
   * @param {string} operation - 操作名称
   * @returns {Function} 计时器函数
   */
  createTimer(operation) {
    const startTime = Date.now();
    
    return (metadata = {}) => {
      const duration = Date.now() - startTime;
      this.recordPerformance(operation, duration, metadata);
      return duration;
    };
  }

  /**
   * 获取性能指标
   * @returns {Array} 性能指标数组
   */
  getPerformanceMetrics() {
    return Array.from(this.performanceMetrics.values());
  }

  /**
   * 获取最近的日志
   * @param {number} limit - 限制数量
   * @param {string} category - 类别过滤
   * @param {string} level - 级别过滤
   * @returns {Array} 日志数组
   */
  getRecentLogs(limit = 100, category = null, level = null) {
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
   * @param {Object} criteria - 搜索条件
   * @returns {Array} 匹配的日志
   */
  searchLogs(criteria) {
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
   * @param {string} timestamp - 时间戳
   * @param {string} category - 类别
   * @param {string} message - 消息
   * @returns {string} 日志ID
   */
  generateLogId(timestamp, category, message) {
    const hash = createHash('md5');
    hash.update(timestamp + category + message);
    return hash.digest('hex').substr(0, 8);
  }

  /**
   * 获取级别名称
   * @param {number} level - 级别值
   * @returns {string} 级别名称
   */
  getLevelName(level) {
    const names = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
    return names[level] || 'UNKNOWN';
  }

  /**
   * 获取颜色代码
   * @param {number} level - 级别值
   * @returns {string} 颜色代码
   */
  getColorCode(level) {
    const colors = {
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
   * @param {number} level - 日志级别
   */
  setLevel(level) {
    this.options.level = level;
  }

  /**
   * 清理资源
   */
  async cleanup() {
    this.logBuffer = [];
    this.performanceMetrics.clear();
    this.aggregationData.clear();
    
    this.info(LogCategory.SYSTEM, 'EnhancedLogger 已清理', {
      timestamp: new Date().toISOString()
    });
  }
}

// 创建全局日志记录器实例
export const globalLogger = new EnhancedLogger();

/**
 * 便捷的日志记录函数
 */
export const debug = (category, message, metadata) => globalLogger.debug(category, message, metadata);
export const info = (category, message, metadata) => globalLogger.info(category, message, metadata);
export const warn = (category, message, metadata) => globalLogger.warn(category, message, metadata);
export const error = (category, message, error, metadata) => globalLogger.error(category, message, error, metadata);
export const fatal = (category, message, error, metadata) => globalLogger.fatal(category, message, error, metadata);

/**
 * 性能计时器
 * @param {string} operation - 操作名称
 * @returns {Function} 计时器函数
 */
export const timer = (operation) => globalLogger.createTimer(operation);

/**
 * 日志装饰器
 * @param {Object} options - 装饰器选项
 * @returns {Function} 装饰器函数
 */
export function withLogging(options = {}) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    const category = options.category || LogCategory.BUSINESS;
    const operation = options.operation || `${target.constructor.name}.${propertyKey}`;
    
    descriptor.value = async function(...args) {
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
        error(category, `操作失败: ${operation}`, error, {
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