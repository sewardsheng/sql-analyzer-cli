import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * 日志配置
 */
const LOG_CONFIG = {
  // 日志目录
  dir: path.join(process.cwd(), 'logs'),
  // 单个日志文件最大大小 (10MB)
  maxFileSize: 10 * 1024 * 1024,
  // 日志文件保留天数 (30天)
  retentionDays: 30,
  // 日志文件命名前缀
  prefix: 'sql-analyzer-api',
  // 日志文件扩展名
  extension: '.log'
};

/**
 * 日志级别
 */
export const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

/**
 * 当前日志级别（可通过环境变量设置）
 */
const CURRENT_LOG_LEVEL = process.env.LOG_LEVEL || LOG_LEVELS.INFO;

/**
 * 请求ID生成器
 */
let requestIdCounter = 0;

/**
 * 生成唯一的请求ID
 * @returns {string} 请求ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${++requestIdCounter}`;
}

/**
 * 获取当前日志文件路径
 * @returns {string} 日志文件路径
 */
function getCurrentLogFilePath() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD格式
  return path.join(LOG_CONFIG.dir, `${LOG_CONFIG.prefix}-${today}${LOG_CONFIG.extension}`);
}

/**
 * 确保日志目录存在
 */
async function ensureLogDir() {
  try {
    await fs.access(LOG_CONFIG.dir);
  } catch (error) {
    await fs.mkdir(LOG_CONFIG.dir, { recursive: true });
  }
}

/**
 * 获取文件大小
 * @param {string} filePath - 文件路径
 * @returns {number} 文件大小（字节）
 */
async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * 清理过期的日志文件
 */
async function cleanOldLogFiles() {
  try {
    const files = await fs.readdir(LOG_CONFIG.dir);
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - LOG_CONFIG.retentionDays * 24 * 60 * 60 * 1000);
    
    for (const file of files) {
      if (file.startsWith(LOG_CONFIG.prefix) && file.endsWith(LOG_CONFIG.extension)) {
        const filePath = path.join(LOG_CONFIG.dir, file);
        try {
          const stats = await fs.stat(filePath);
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            console.log(`已删除过期日志文件: ${path.basename(filePath)}`);
          }
        } catch (error) {
          // 忽略单个文件删除错误
        }
      }
    }
  } catch (error) {
    console.error('警告: 清理过期日志文件失败:', error.message);
  }
}

/**
 * 检查并处理日志文件分片
 * @param {string} logFilePath - 日志文件路径
 */
async function handleLogRotation(logFilePath) {
  const fileSize = await getFileSize(logFilePath);
  
  // 如果文件大小超过限制，进行分片
  if (fileSize >= LOG_CONFIG.maxFileSize) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedPath = path.join(
        LOG_CONFIG.dir,
        `${LOG_CONFIG.prefix}-${timestamp}${LOG_CONFIG.extension}`
      );
      
      await fs.rename(logFilePath, rotatedPath);
      console.log(`日志文件已分片: ${path.basename(rotatedPath)}`);
    } catch (error) {
     console.error('警告: 日志文件分片失败:', error.message);
    }
  }
}

/**
 * 格式化日志消息
 * @param {string} level - 日志级别
 * @param {string} message - 消息
 * @param {Object} metadata - 元数据
 * @returns {string} 格式化的日志行
 */
function formatLogMessage(level, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...metadata
  };
  
  return JSON.stringify(logEntry);
}

/**
 * 写入日志
 * @param {string} level - 日志级别
 * @param {string} message - 消息
 * @param {Object} metadata - 元数据
 */
async function writeLog(level, message, metadata = {}) {
  await ensureLogDir();
  
  // 定期清理过期日志文件
  if (Math.random() < 0.01) { // 1%的概率执行清理，避免频繁检查
    await cleanOldLogFiles();
  }
  
  const logFilePath = getCurrentLogFilePath();
  
  // 检查并处理日志文件分片
  await handleLogRotation(logFilePath);
  
  const logLine = formatLogMessage(level, message, metadata) + '\n';
  
  try {
    await fs.appendFile(logFilePath, logLine);
  } catch (logError) {
    // 如果写入日志失败，输出到控制台但不中断程序
    console.error('警告: 无法写入日志文件:', logError.message);
  }
}

/**
 * 检查是否应该记录该级别的日志
 * @param {string} level - 日志级别
 * @returns {boolean} 是否应该记录
 */
function shouldLog(level) {
  const levels = [LOG_LEVELS.ERROR, LOG_LEVELS.WARN, LOG_LEVELS.INFO, LOG_LEVELS.DEBUG];
  const currentIndex = levels.indexOf(CURRENT_LOG_LEVEL);
  const messageIndex = levels.indexOf(level);
  
  return messageIndex <= currentIndex;
}

/**
 * 记录信息日志
 * @param {string} message - 消息
 * @param {Object} metadata - 元数据
 */
export async function logInfo(message, metadata = {}) {
  if (shouldLog(LOG_LEVELS.INFO)) {
    await writeLog(LOG_LEVELS.INFO, message, metadata);
  }
}

/**
 * 记录警告日志
 * @param {string} message - 消息
 * @param {Object} metadata - 元数据
 */
export async function logWarning(message, metadata = {}) {
  if (shouldLog(LOG_LEVELS.WARN)) {
    await writeLog(LOG_LEVELS.WARN, message, metadata);
  }
}

/**
 * 记录错误日志
 * @param {string} message - 消息
 * @param {Error} error - 错误对象
 * @param {Object} metadata - 元数据
 */
export async function logError(message, error = null, metadata = {}) {
  if (shouldLog(LOG_LEVELS.ERROR)) {
    const errorMetadata = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : null;
    
    await writeLog(LOG_LEVELS.ERROR, message, {
      ...metadata,
      error: errorMetadata
    });
  }
}

/**
 * 记录调试日志
 * @param {string} message - 消息
 * @param {Object} metadata - 元数据
 */
export async function logDebug(message, metadata = {}) {
  if (shouldLog(LOG_LEVELS.DEBUG)) {
    await writeLog(LOG_LEVELS.DEBUG, message, metadata);
  }
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
    await logError(message, null, metadata);
  } else if (res.status >= 300) {
    await logWarning(message, metadata);
  } else {
    await logInfo(message, metadata);
  }
}

/**
 * 记录API错误日志
 * @param {Error} error - 错误对象
 * @param {Object} req - 请求对象
 * @param {Object} metadata - 额外元数据
 */
async function logApiError(error, req = null, metadata = {}) {
  const requestId = req?.id || generateRequestId();
  
  const errorMetadata = {
    type: 'api_error',
    requestId,
    name: error.name,
    message: error.message,
    stack: error.stack,
    method: req?.method,
    url: req?.url,
    userAgent: req?.get?.('user-agent'),
    ip: req?.ip || req?.connection?.remoteAddress,
    ...metadata
  };
  
  await logError(`API错误: ${error.message}`, error, errorMetadata);
}

/**
 * 处理并记录错误
 * @param {Error} error - 错误对象
 * @param {string} context - 上下文
 * @param {Object} metadata - 额外元数据
 */
export async function handleError(error, context = '', metadata = {}) {
  const errorMessage = context ? `${context}: ${error.message}` : error.message;
  
  // 记录错误日志
  await logError(errorMessage, error, { context, ...metadata });
  
  // 根据错误类型显示不同的用户友好消息
  if (error.name === 'FetchError' || error.code === 'ENOTFOUND') {
    console.error('❌ 网络错误: 无法连接到API服务器');
    console.error('请检查网络连接和API基础URL配置');
  } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
    console.error('❌ 认证错误: API密钥无效');
    console.error('请检查API密钥配置');
  } else if (error.message.includes('429') || error.message.includes('rate limit')) {
    console.error('❌ 请求频率限制: API调用过于频繁');
    console.error('请稍后重试');
  } else if (error.message.includes('model') || error.message.includes('not found')) {
    console.error('❌ 模型错误: 指定的模型不存在或不可用');
    console.error('请检查模型名称配置');
  } else if (error.code === 'ENOENT') {
    console.error('❌ 文件不存在: ', error.path);
  } else if (error.code === 'EACCES') {
    console.error('❌ 权限错误: 没有足够的权限访问文件或目录');
  } else {
    console.error('❌ 发生错误:', errorMessage);
  }
  
  // 在开发模式下显示完整错误堆栈
  if (process.env.NODE_ENV === 'development') {
    console.error(error.stack);
  }
}

/**
 * 全局错误处理
 */
function setupGlobalErrorHandlers() {
  // 捕获未处理的Promise拒绝
  process.on('unhandledRejection', async (reason, promise) => {
    await logError('未处理的Promise拒绝', new Error(reason), { type: 'unhandled_rejection' });
    console.error('❌ 发生未处理的错误:', reason);
    process.exit(1);
  });
  
  // 捕获未捕获的异常
  process.on('uncaughtException', async (error) => {
    await logError('未捕获的异常', error, { type: 'uncaught_exception' });
    console.error('❌ 发生未捕获的异常:', error.message);
    process.exit(1);
  });
}

/**
 * 创建自定义错误类
 */
export class SqlAnalyzerError extends Error {
  constructor(message, code = 'GENERAL_ERROR', details = null) {
    super(message);
    this.name = 'SqlAnalyzerError';
    this.code = code;
    this.details = details;
  }
}

/**
 * 创建特定类型的错误
 * @param {string} type - 错误类型
 * @param {string} message - 消息
 * @param {Object} details - 详细信息
 */
export function createError(type, message, details = null) {
  const errorCode = {
    'CONFIG': 'CONFIG_ERROR',
    'API': 'API_ERROR',
    'NETWORK': 'NETWORK_ERROR',
    'FILE': 'FILE_ERROR',
    'VALIDATION': 'VALIDATION_ERROR',
    'AUTHENTICATION': 'AUTHENTICATION_ERROR',
    'AUTHORIZATION': 'AUTHORIZATION_ERROR'
  }[type] || 'GENERAL_ERROR';
  
  return new SqlAnalyzerError(message, errorCode, details);
}

/**
 * 手动清理日志文件
 */
async function cleanLogs() {
  await cleanOldLogFiles();
  console.log('✅ 日志清理完成');
}

/**
 * 获取日志文件列表
 * @returns {Promise<string[]>} 日志文件路径数组
 */
async function getLogFiles() {
  try {
    await ensureLogDir();
    const files = await fs.readdir(LOG_CONFIG.dir);
    return files
      .filter(file => file.startsWith(LOG_CONFIG.prefix) && file.endsWith(LOG_CONFIG.extension))
      .map(file => path.join(LOG_CONFIG.dir, file));
  } catch (error) {
    console.error('获取日志文件列表失败:', error);
    return [];
  }
}

// 初始化全局错误处理
setupGlobalErrorHandlers();

// 导出函数
export {
  generateRequestId,
  logApiError,
  setupGlobalErrorHandlers,
  cleanLogs,
  getLogFiles
};