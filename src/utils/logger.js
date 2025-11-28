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
      
      this.info(LogCategory.SYSTEM, '日志系统初始化完成');
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
    // 确保类别是有效的日志类别
    const validCategory = this.validateCategory(category);
    this.log(LogLevel.DEBUG, validCategory, message, metadata);
  }

  /**
   * 记录信息日志
   * @param {string} category - 日志类别
   * @param {string} message - 日志消息
   * @param {Object} metadata - 元数据
   */
  info(category, message, metadata = {}) {
    // 确保类别是有效的日志类别
    const validCategory = this.validateCategory(category);
    this.log(LogLevel.INFO, validCategory, message, metadata);
  }

  /**
   * 记录警告日志
   * @param {string} category - 日志类别
   * @param {string} message - 日志消息
   * @param {Object} metadata - 元数据
   */
  warn(category, message, metadata = {}) {
    // 确保类别是有效的日志类别
    const validCategory = this.validateCategory(category);
    this.log(LogLevel.WARN, validCategory, message, metadata);
  }

  /**
   * 记录错误日志
   * @param {string} category - 日志类别
   * @param {string} message - 日志消息
   * @param {Error} error - 错误对象
   * @param {Object} metadata - 元数据
   */
  error(category, message, error = null, metadata = {}) {
    // 确保类别是有效的日志类别
    const validCategory = this.validateCategory(category);
    const errorMetadata = {
      ...metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      } : null
    };
    
    this.log(LogLevel.ERROR, validCategory, message, errorMetadata);
  }

  /**
   * 记录致命错误日志
   * @param {string} category - 日志类别
   * @param {string} message - 日志消息
   * @param {Error} error - 错误对象
   * @param {Object} metadata - 元数据
   */
  fatal(category, message, error = null, metadata = {}) {
    // 确保类别是有效的日志类别
    const validCategory = this.validateCategory(category);
    const errorMetadata = {
      ...metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      } : null
    };
    
    this.log(LogLevel.FATAL, validCategory, message, errorMetadata);
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
      try {
        // 创建一个安全的元数据副本，只包含基本属性
        const safeMetadata = {};
        for (const [key, value] of Object.entries(metadata)) {
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            safeMetadata[key] = value;
          }
        }
        console.log('  Metadata:', JSON.stringify(safeMetadata, null, 2));
      } catch (error) {
        console.log('  Metadata: [无法序列化，可能包含循环引用]');
      }
    }
  }

  /**
   * 输出到文件
   * @param {Object} logEntry - 日志条目
   */
  async outputToFile(logEntry) {
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
   * @param {string} category - 日志类别
   * @param {string} level - 日志级别
   * @returns {string} 文件名
   */
  getLogFileName(category, level) {
    const date = new Date().toISOString().split('T')[0];
    return `${category}-${level.toLowerCase()}-${date}.log`;
  }

  /**
   * 获取聚合日志文件名
   * @returns {string} 聚合日志文件名
   */
  getAggregationLogFileName() {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const hour = now.getHours().toString().padStart(2, '0');
    
    // 每小时生成一个聚合文件，而不是每次都生成新文件
    return `aggregation-${date}-${hour}.json`;
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
      
      // 等待所有文件状态获取完成
      const resolvedFiles = await Promise.all(logFiles);
      
      // 按修改时间排序
      resolvedFiles.sort((a, b) => b.mtime - a.mtime);
      
      // 删除超出限制的文件
      if (resolvedFiles.length > this.options.maxFiles) {
        const filesToDelete = resolvedFiles.slice(this.options.maxFiles);
        
        for (const file of filesToDelete) {
          try {
            await fs.unlink(file.path);
            console.log(`已删除旧日志文件: ${file.name}`);
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
  async cleanOldAggregationFiles() {
    try {
      const dir = this.options.logDir;
      const files = await fs.readdir(dir);
      
      // 查找所有聚合文件
      const aggregationFiles = files
        .filter(file => file.startsWith('aggregation-') && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(dir, file),
          mtime: fs.stat(path.join(dir, file)).then(stats => stats.mtime)
        }));
      
      // 等待所有文件状态获取完成
      const resolvedFiles = await Promise.all(aggregationFiles);
      
      // 按修改时间排序
      resolvedFiles.sort((a, b) => b.mtime - a.mtime);
      
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
          console.log(`已删除旧聚合日志文件: ${file.name}`);
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
    
    // 每天清理一次旧的聚合文件
    setInterval(() => {
      this.cleanOldAggregationFiles();
    }, 24 * 60 * 60 * 1000); // 24小时
  }

  /**
   * 执行日志聚合
   */
  async performAggregation() {
    try {
      // 检查是否有足够的日志需要聚合
      if (this.options.minAggregationLogs && this.logBuffer.length < this.options.minAggregationLogs) {
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
          const existingReport = JSON.parse(existingData);
          
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
    
    this.log(LogLevel.INFO, LogCategory.SYSTEM, 'EnhancedLogger 已清理', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 验证日志类别
   * @param {string} category - 日志类别
   * @returns {string} 有效的日志类别
   */
  validateCategory(category) {
    // 如果类别是预定义的有效类别，直接返回
    if (Object.values(LogCategory).includes(category)) {
      return category;
    }
    
    // 如果类别是系统预定义的，映射到system类别
    const systemCategories = ['EnhancedLogger', 'system', 'global'];
    if (systemCategories.includes(category)) {
      return LogCategory.SYSTEM;
    }
    
    // 对于其他情况，检查是否包含已知的关键字
    const categoryMapping = {
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
export const debug = (category, message, metadata) => globalLogger.debug(category, message, metadata);
export const info = (category, message, metadata) => globalLogger.info(category, message, metadata);
export const warn = (category, message, metadata) => globalLogger.warn(category, message, metadata);
export const error = (category, message, error, metadata) => globalLogger.error(category, message, error, metadata);
export const fatal = (category, message, error, metadata) => globalLogger.fatal(category, message, error, metadata);

// 为了向后兼容，提供 logError 别名
export const logError = (category, message, error, metadata) => globalLogger.error(category, message, error, metadata);

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

/**
 * 记录API错误日志
 * @param {string} method - HTTP方法
 * @param {string} url - URL路径
 * @param {Error} error - 错误对象
 * @param {Object} metadata - 额外元数据
 */
export async function logApiError(method, url, errorObj, metadata = {}) {
  const requestId = metadata.requestId || generateRequestId();
  
  const errorMetadata = {
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
export function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 记录API请求日志
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {number} startTime - 开始时间
 * @param {number} endTime - 结束时间
 */
export async function logApiRequest(req, res, startTime, endTime) {
  const duration = endTime - startTime;
  const requestId = req.id || generateRequestId();
  
  const metadata = {
    type: 'api_request',
    requestId,
    method: req?.method || 'unknown',
    url: req?.url || 'unknown',
    statusCode: res.status,
    duration: `${duration}ms`,
    userAgent: req?.header?.('user-agent') || 'unknown',
    ip: req?.header?.('x-forwarded-for') || req?.header?.('x-real-ip') || 'unknown',
    contentLength: res.headers?.get('content-length') || '0'
  };
  
  const message = `${req.method} ${req.url} ${res.status} - ${duration}ms`;
  
  if (res.status >= 400) {
    await error(LogCategory.API, message, null, metadata);
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
export function setupGlobalErrorHandlers() {
  // 捕获未处理的Promise拒绝
  process.on('unhandledRejection', (reason, promise) => {
    error(LogCategory.SYSTEM, '未处理的Promise拒绝', reason instanceof Error ? reason : new Error(String(reason)), {
      promise: promise.toString(),
      timestamp: new Date().toISOString()
    });
  });

  // 捕获未捕获的异常
  process.on('uncaughtException', (error) => {
    error(LogCategory.SYSTEM, '未捕获的异常', error, {
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
  process.on('warning', (warning) => {
    warn(LogCategory.SYSTEM, 'Node.js警告', {
      name: warning.name,
      message: warning.message,
      stack: warning.stack,
      timestamp: new Date().toISOString()
    });
  });

  info(LogCategory.SYSTEM, '全局错误处理已设置');
}