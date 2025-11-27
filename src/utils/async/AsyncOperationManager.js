/**
 * 异步操作管理器
 * 提供异步操作的统一管理、错误处理、重试机制和超时控制
 */

import { globalErrorHandler } from '../error/ErrorHandler.js';
import { globalLogger, LogCategory, timer } from '../logging/EnhancedLogger.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const os = require('os');

/**
 * 操作状态枚举
 */
export const OperationStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  TIMEOUT: 'timeout'
};

/**
 * 优先级枚举
 */
export const Priority = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
  CRITICAL: 3
};

/**
 * 异步操作类
 */
export class AsyncOperation {
  constructor(id, fn, options = {}) {
    this.id = id;
    this.fn = fn;
    this.options = {
      timeout: 30000, // 30秒默认超时
      maxRetries: 3,
      retryDelay: 1000,
      priority: Priority.NORMAL,
      metadata: {},
      ...options
    };
    
    this.status = OperationStatus.PENDING;
    this.createdAt = new Date();
    this.startedAt = null;
    this.completedAt = null;
    this.result = null;
    this.error = null;
    this.retryCount = 0;
    this.abortController = new AbortController();
  }

  /**
   * 执行操作
   * @returns {Promise<*>} 执行结果
   */
  async execute() {
    if (this.status !== OperationStatus.PENDING) {
      throw new Error(`操作状态不正确: ${this.status}`);
    }

    this.status = OperationStatus.RUNNING;
    this.startedAt = new Date();

    const endTimer = timer(`operation-${this.id}`);
    
    try {
      globalLogger.info(LogCategory.SYSTEM, `开始执行异步操作`, {
        operationId: this.id,
        timeout: this.options.timeout,
        maxRetries: this.options.maxRetries,
        priority: this.options.priority
      });

      // 设置超时
      const timeoutPromise = this.createTimeoutPromise();
      
      // 执行操作
      const operationPromise = this.executeWithRetry();
      
      // 等待完成或超时
      this.result = await Promise.race([operationPromise, timeoutPromise]);
      
      this.status = OperationStatus.COMPLETED;
      this.completedAt = new Date();
      
      const duration = endTimer();
      
      globalLogger.info(LogCategory.SYSTEM, `异步操作执行成功`, {
        operationId: this.id,
        duration,
        retryCount: this.retryCount
      });
      
      return this.result;
      
    } catch (error) {
      this.error = error;
      this.status = this.error.name === 'AbortError' ? OperationStatus.CANCELLED : 
                   this.error.message.includes('timeout') ? OperationStatus.TIMEOUT : 
                   OperationStatus.FAILED;
      this.completedAt = new Date();
      
      const duration = endTimer();
      
      globalLogger.error(LogCategory.SYSTEM, `异步操作执行失败`, error, {
        operationId: this.id,
        duration,
        retryCount: this.retryCount,
        status: this.status
      });
      
      throw error;
    }
  }

  /**
   * 带重试的执行
   * @returns {Promise<*>} 执行结果
   */
  async executeWithRetry() {
    let lastError = null;
    
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        this.retryCount = attempt;
        
        if (attempt > 0) {
          const delay = this.options.retryDelay * Math.pow(2, attempt - 1);
          globalLogger.info(LogCategory.SYSTEM, `重试异步操作`, {
            operationId: this.id,
            attempt,
            delay
          });
          
          await this.sleep(delay);
        }
        
        return await this.fn(this.abortController.signal);
        
      } catch (error) {
        lastError = error;
        
        // 如果是取消错误，直接抛出
        if (error.name === 'AbortError') {
          throw error;
        }
        
        // 如果是最后一次尝试，抛出错误
        if (attempt === this.options.maxRetries) {
          throw error;
        }
        
        globalLogger.warn(LogCategory.SYSTEM, `异步操作执行失败，准备重试`, {
          operationId: this.id,
          attempt,
          error: error.message
        });
      }
    }
    
    throw lastError;
  }

  /**
   * 创建超时Promise
   * @returns {Promise<*>} 超时Promise
   */
  createTimeoutPromise() {
    return new Promise((_, reject) => {
      setTimeout(() => {
        this.abortController.abort();
        reject(new Error(`操作超时: ${this.options.timeout}ms`));
      }, this.options.timeout);
    });
  }

  /**
   * 取消操作
   */
  cancel() {
    if (this.status === OperationStatus.COMPLETED || 
        this.status === OperationStatus.FAILED || 
        this.status === OperationStatus.CANCELLED) {
      return;
    }
    
    this.abortController.abort();
    this.status = OperationStatus.CANCELLED;
    this.completedAt = new Date();
    
    globalLogger.info(LogCategory.SYSTEM, `异步操作已取消`, {
      operationId: this.id
    });
  }

  /**
   * 获取执行时间
   * @returns {number} 执行时间（毫秒）
   */
  getDuration() {
    if (!this.startedAt) return 0;
    const endTime = this.completedAt || new Date();
    return endTime - this.startedAt;
  }

  /**
   * 睡眠函数
   * @param {number} ms - 毫秒数
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 异步操作管理器类
 */
export class AsyncOperationManager {
  constructor(options = {}) {
    this.options = {
      maxConcurrent: 10,
      defaultTimeout: 30000,
      defaultMaxRetries: 3,
      enableQueue: true,
      enablePriority: true,
      ...options
    };
    
    this.operations = new Map();
    this.queue = [];
    this.running = new Set();
    this.completed = new Set();
    this.failed = new Set();
    this.operationCounter = 0;
    
    // 统计信息
    this.stats = {
      total: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      timeout: 0
    };
    
    // 启动队列处理
    if (this.options.enableQueue) {
      this.startQueueProcessor();
    }
  }

  /**
   * 提交异步操作
   * @param {Function} fn - 操作函数
   * @param {Object} options - 操作选项
   * @returns {Promise<*>} 操作结果
   */
  async submit(fn, options = {}) {
    const operationId = this.generateOperationId();
    const operation = new AsyncOperation(operationId, fn, {
      timeout: this.options.defaultTimeout,
      maxRetries: this.options.defaultMaxRetries,
      ...options
    });
    
    this.operations.set(operationId, operation);
    this.stats.total++;
    
    globalLogger.info(LogCategory.SYSTEM, `提交异步操作`, {
      operationId,
      priority: operation.options.priority,
      queueSize: this.queue.length,
      runningCount: this.running.size
    });
    
    if (this.options.enableQueue) {
      // 添加到队列
      this.addToQueue(operation);
      
      // 等待完成
      return new Promise((resolve, reject) => {
        operation.resolve = resolve;
        operation.reject = reject;
      });
    } else {
      // 直接执行
      try {
        const result = await operation.execute();
        this.handleOperationSuccess(operation, result);
        return result;
      } catch (error) {
        this.handleOperationFailure(operation, error);
        throw error;
      }
    }
  }

  /**
   * 添加到队列
   * @param {AsyncOperation} operation - 操作对象
   */
  addToQueue(operation) {
    if (this.options.enablePriority) {
      // 按优先级插入
      let insertIndex = this.queue.length;
      for (let i = 0; i < this.queue.length; i++) {
        if (this.queue[i].options.priority < operation.options.priority) {
          insertIndex = i;
          break;
        }
      }
      this.queue.splice(insertIndex, 0, operation);
    } else {
      this.queue.push(operation);
    }
  }

  /**
   * 启动队列处理器
   */
  startQueueProcessor() {
    setInterval(() => {
      this.processQueue();
    }, 100); // 每100ms处理一次队列
  }

  /**
   * 处理队列
   */
  async processQueue() {
    while (this.running.size < this.options.maxConcurrent && this.queue.length > 0) {
      const operation = this.queue.shift();
      this.running.add(operation);
      
      // 异步执行操作
      this.executeOperation(operation).catch(error => {
        globalLogger.error(LogCategory.SYSTEM, `队列操作执行失败`, error, {
          operationId: operation.id
        });
      });
    }
  }

  /**
   * 执行操作
   * @param {AsyncOperation} operation - 操作对象
   */
  async executeOperation(operation) {
    try {
      const result = await operation.execute();
      this.handleOperationSuccess(operation, result);
    } catch (error) {
      this.handleOperationFailure(operation, error);
    } finally {
      this.running.delete(operation);
    }
  }

  /**
   * 处理操作成功
   * @param {AsyncOperation} operation - 操作对象
   * @param {*} result - 操作结果
   */
  handleOperationSuccess(operation, result) {
    this.completed.add(operation);
    this.stats.completed++;
    
    if (operation.resolve) {
      operation.resolve(result);
    }
    
    globalLogger.info(LogCategory.SYSTEM, `异步操作成功完成`, {
      operationId: operation.id,
      duration: operation.getDuration(),
      retryCount: operation.retryCount
    });
  }

  /**
   * 处理操作失败
   * @param {AsyncOperation} operation - 操作对象
   * @param {Error} error - 错误对象
   */
  handleOperationFailure(operation, error) {
    this.failed.add(operation);
    
    if (operation.status === OperationStatus.CANCELLED) {
      this.stats.cancelled++;
    } else if (operation.status === OperationStatus.TIMEOUT) {
      this.stats.timeout++;
    } else {
      this.stats.failed++;
    }
    
    if (operation.reject) {
      operation.reject(error);
    }
    
    globalLogger.error(LogCategory.SYSTEM, `异步操作执行失败`, error, {
      operationId: operation.id,
      status: operation.status,
      duration: operation.getDuration(),
      retryCount: operation.retryCount
    });
  }

  /**
   * 取消操作
   * @param {string} operationId - 操作ID
   * @returns {boolean} 是否成功取消
   */
  cancel(operationId) {
    const operation = this.operations.get(operationId);
    if (!operation) {
      return false;
    }
    
    // 如果在队列中，从队列中移除
    const queueIndex = this.queue.findIndex(op => op.id === operationId);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
      operation.cancel();
      return true;
    }
    
    // 如果正在运行，取消操作
    if (this.running.has(operation)) {
      operation.cancel();
      return true;
    }
    
    return false;
  }

  /**
   * 取消所有操作
   */
  cancelAll() {
    // 取消队列中的操作
    for (const operation of this.queue) {
      operation.cancel();
    }
    this.queue = [];
    
    // 取消正在运行的操作
    for (const operation of this.running) {
      operation.cancel();
    }
    
    globalLogger.info(LogCategory.SYSTEM, `已取消所有异步操作`, {
      queueCount: this.queue.length,
      runningCount: this.running.size
    });
  }

  /**
   * 获取操作状态
   * @param {string} operationId - 操作ID
   * @returns {Object|null} 操作状态
   */
  getOperationStatus(operationId) {
    const operation = this.operations.get(operationId);
    if (!operation) {
      return null;
    }
    
    return {
      id: operation.id,
      status: operation.status,
      createdAt: operation.createdAt,
      startedAt: operation.startedAt,
      completedAt: operation.completedAt,
      duration: operation.getDuration(),
      retryCount: operation.retryCount,
      priority: operation.options.priority
    };
  }

  /**
   * 获取所有操作状态
   * @returns {Array} 操作状态列表
   */
  getAllOperations() {
    return Array.from(this.operations.values()).map(operation => ({
      id: operation.id,
      status: operation.status,
      createdAt: operation.createdAt,
      startedAt: operation.startedAt,
      completedAt: operation.completedAt,
      duration: operation.getDuration(),
      retryCount: operation.retryCount,
      priority: operation.options.priority
    }));
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      queue: this.queue.length,
      running: this.running.size,
      completed: this.completed.size,
      failed: this.failed.size,
      successRate: this.stats.total > 0 ? (this.stats.completed / this.stats.total * 100).toFixed(2) + '%' : '0%'
    };
  }

  /**
   * 清理已完成的操作
   * @param {number} maxAge - 最大保留时间（毫秒）
   */
  cleanup(maxAge = 3600000) { // 默认1小时
    const now = new Date();
    const toRemove = [];
    
    for (const operation of this.completed) {
      if (now - operation.completedAt > maxAge) {
        toRemove.push(operation.id);
      }
    }
    
    for (const operation of this.failed) {
      if (now - operation.completedAt > maxAge) {
        toRemove.push(operation.id);
      }
    }
    
    for (const id of toRemove) {
      this.operations.delete(id);
      this.completed.delete(id);
      this.failed.delete(id);
    }
    
    if (toRemove.length > 0) {
      globalLogger.info(LogCategory.SYSTEM, `清理已完成的异步操作`, {
        removedCount: toRemove.length,
        remainingTotal: this.operations.size
      });
    }
  }

  /**
   * 生成操作ID
   * @returns {string} 操作ID
   */
  generateOperationId() {
    return `op_${Date.now()}_${++this.operationCounter}`;
  }

  /**
   * 等待所有操作完成
   * @param {number} timeout - 超时时间（毫秒）
   * @returns {Promise<void>}
   */
  async waitForAll(timeout = 60000) {
    const startTime = Date.now();
    
    while ((this.queue.length > 0 || this.running.size > 0) && 
           (Date.now() - startTime) < timeout) {
      await this.sleep(100);
    }
    
    if (this.queue.length > 0 || this.running.size > 0) {
      throw new Error(`等待所有操作完成超时: ${timeout}ms`);
    }
  }

  /**
   * 睡眠函数
   * @param {number} ms - 毫秒数
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 创建全局异步操作管理器实例
export const globalAsyncManager = new AsyncOperationManager();

/**
 * 便捷的异步操作函数
 * @param {Function} fn - 操作函数
 * @param {Object} options - 操作选项
 * @returns {Promise<*>} 操作结果
 */
export async function asyncOperation(fn, options = {}) {
  return await globalAsyncManager.submit(fn, options);
}

/**
 * 创建带超时的Promise
 * @param {Function} fn - 函数
 * @param {number} timeout - 超时时间
 * @returns {Promise<*>} Promise结果
 */
export function withTimeout(fn, timeout) {
  return asyncOperation(signal => fn(signal), { timeout });
}

/**
 * 创建带重试的Promise
 * @param {Function} fn - 函数
 * @param {number} maxRetries - 最大重试次数
 * @param {number} retryDelay - 重试延迟
 * @returns {Promise<*>} Promise结果
 */
export function withRetry(fn, maxRetries = 3, retryDelay = 1000) {
  return asyncOperation(signal => fn(signal), { maxRetries, retryDelay });
}

/**
 * 批量执行异步操作
 * @param {Array<Function>} functions - 函数数组
 * @param {Object} options - 执行选项
 * @returns {Promise<Array>} 结果数组
 */
export async function batchExecute(functions, options = {}) {
  const { maxConcurrent = 5, timeout = 30000 } = options;
  
  const results = [];
  const batches = [];
  
  // 分批
  for (let i = 0; i < functions.length; i += maxConcurrent) {
    batches.push(functions.slice(i, i + maxConcurrent));
  }
  
  // 执行每批
  for (const batch of batches) {
    const batchPromises = batch.map(fn => 
      asyncOperation(signal => fn(signal), { timeout })
    );
    
    const batchResults = await Promise.allSettled(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}