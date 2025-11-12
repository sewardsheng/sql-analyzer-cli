import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import chalk from 'chalk'; // ES模块直接导入

/**
 * 日志配置
 */
const LOG_CONFIG = {
  // 日志目录
  dir: path.join(os.homedir(), '.sql-analyzer', 'logs'),
  // 单个日志文件最大大小 (3MB)
  maxFileSize: 3 * 1024 * 1024,
  // 日志文件保留天数 (15天)
  retentionDays: 15,
  // 日志文件命名前缀
  prefix: 'sql-analyzer',
  // 日志文件扩展名
  extension: '.log'
};

/**
 * 获取当前日志文件路径
 * @returns {string} 日志文件路径
 */
function getCurrentLogFilePath() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD格式
  return path.join(LOG_CONFIG.dir, `${LOG_CONFIG.prefix}-${today}${LOG_CONFIG.extension}`);
}

/**
 * 生成日志文件名（包含分片序号和随机值）
 */
function generateLogFileName(index = 0) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  
  // 生成随机字符串（8位随机字符）
  const randomStr = Math.random().toString(36).substring(2, 10);
  
  // 基础文件名格式：sql-analyzer-YYYY-MM-DD-HH-MM-SS-{随机值}-{序号}.log
  const baseName = `sql-analyzer-${dateStr}-${timeStr}-${randomStr}`;
  const suffix = index > 0 ? `-${index}` : '';
  
  return `${baseName}${suffix}.log`;
}

/**
 * 获取日志文件分片路径
 * @param {string} baseFilePath - 基础日志文件路径
 * @param {number} index - 分片序号
 * @returns {string} 分片文件路径
 */
function getLogFilePathWithIndex(baseFilePath, index) {
  const parsedPath = path.parse(baseFilePath);
  const logFileName = generateLogFileName(index);
  return path.join(parsedPath.dir, logFileName);
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
 * 获取所有日志文件列表
 * @returns {Promise<string[]>} 日志文件路径数组
 */
async function getLogFiles() {
  try {
    await ensureLogDir();
    const files = await fs.readdir(LOG_CONFIG.dir);
    // 匹配基础文件名和分片文件名（如 sql-analyzer-2024-01-01.log, sql-analyzer-2024-01-01-1-abc123.log）
      const logFileRegex = new RegExp(`^${LOG_CONFIG.prefix}-\\d{4}-\\d{2}-\\d{2}(?:-\\d+-[a-f0-9]{6,8})?${LOG_CONFIG.extension}$`);
    return files
      .filter(file => logFileRegex.test(file))
      .map(file => path.join(LOG_CONFIG.dir, file));
  } catch (error) {
    console.error('获取日志文件列表失败:', error);
    return [];
  }
}

/**
 * 清理过期的日志文件
 */
async function cleanOldLogFiles() {
  try {
    const files = await getLogFiles();
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - LOG_CONFIG.retentionDays * 24 * 60 * 60 * 1000);
    
    for (const filePath of files) {
      try {
        const stats = await fs.stat(filePath);
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          console.log(chalk.gray(`已删除过期日志文件: ${path.basename(filePath)}`));
        }
      } catch (error) {
        // 忽略单个文件删除错误
      }
    }
  } catch (error) {
    console.error(chalk.yellow('警告: 清理过期日志文件失败:'), error.message);
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
    let index = 1;
    let rotatedPath;
    
    // 找到下一个可用的分片索引
    do {
      rotatedPath = getLogFilePathWithIndex(logFilePath, index);
      index++;
    } while (await getFileSize(rotatedPath) > 0);
    
    // 重命名当前日志文件为分片文件
    try {
      await fs.rename(logFilePath, rotatedPath);
      console.log(chalk.gray(`日志文件已分片: ${path.basename(rotatedPath)}`));
    } catch (error) {
      console.error(chalk.yellow('警告: 日志文件分片失败:'), error.message);
    }
  }
}

/**
 * 写入日志
 */
async function writeLog(level, message, error = null) {
  await ensureLogDir();
  
  // 定期清理过期日志文件（每次写入时检查，但限制频率）
  if (Math.random() < 0.01) { // 1%的概率执行清理，避免频繁检查
    await cleanOldLogFiles();
  }
  
  const logFilePath = getCurrentLogFilePath();
  
  // 检查并处理日志文件分片
  await handleLogRotation(logFilePath);
  
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    error: error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : null
  };
  
  const logLine = JSON.stringify(logEntry) + '\n';
  
  try {
    await fs.appendFile(logFilePath, logLine);
  } catch (logError) {
    // 如果写入日志失败，输出到控制台但不中断程序
    console.error(chalk.yellow('警告: 无法写入日志文件:'), logError.message);
  }
}

/**
 * 记录信息日志
 */
async function logInfo(message) {
  await writeLog('INFO', message);
}

/**
 * 记录警告日志
 */
async function logWarning(message) {
  await writeLog('WARNING', message);
}

/**
 * 记录错误日志
 */
async function logError(message, error = null) {
  await writeLog('ERROR', message, error);
}

/**
 * 记录调试日志
 */
async function logDebug(message) {
  await writeLog('DEBUG', message);
}

/**
 * 处理并记录错误
 */
async function handleError(error, context = '') {
  const errorMessage = context ? `${context}: ${error.message}` : error.message;
  
  // 记录错误日志
  await logError(errorMessage, error);
  
  // 根据错误类型显示不同的用户友好消息
  if (error.name === 'FetchError' || error.code === 'ENOTFOUND') {
    console.error(chalk.red('❌ 网络错误: 无法连接到API服务器'));
    console.error(chalk.gray('请检查网络连接和API基础URL配置'));
  } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
    console.error(chalk.red('❌ 认证错误: API密钥无效'));
    console.error(chalk.gray('请检查API密钥配置'));
  } else if (error.message.includes('429') || error.message.includes('rate limit')) {
    console.error(chalk.red('❌ 请求频率限制: API调用过于频繁'));
    console.error(chalk.gray('请稍后重试'));
  } else if (error.message.includes('model') || error.message.includes('not found')) {
    console.error(chalk.red('❌ 模型错误: 指定的模型不存在或不可用'));
    console.error(chalk.gray('请检查模型名称配置'));
  } else if (error.code === 'ENOENT') {
    console.error(chalk.red('❌ 文件不存在: ', error.path));
  } else if (error.code === 'EACCES') {
    console.error(chalk.red('❌ 权限错误: 没有足够的权限访问文件或目录'));
  } else {
    console.error(chalk.red('❌ 发生错误:'), errorMessage);
  }
  
  // 在开发模式下显示完整错误堆栈
  if (process.env.NODE_ENV === 'development') {
    console.error(chalk.gray(error.stack));
  }
}

/**
 * 全局错误处理
 */
function setupGlobalErrorHandlers() {
  // 捕获未处理的Promise拒绝
  process.on('unhandledRejection', async (reason, promise) => {
    await logError('未处理的Promise拒绝', new Error(reason));
    console.error(chalk.red('❌ 发生未处理的错误:'), reason);
    process.exit(1);
  });
  
  // 捕获未捕获的异常
  process.on('uncaughtException', async (error) => {
    await logError('未捕获的异常', error);
    console.error(chalk.red('❌ 发生未捕获的异常:'), error.message);
    process.exit(1);
  });
}

/**
 * 处理未捕获的异常
 */
async function handleUncaughtException(error) {
  await logError('未捕获的异常', error);
  console.error(chalk.red('❌ 发生未捕获的异常:'), error.message);
  process.exit(1);
}

/**
 * 处理未处理的Promise拒绝
 */
async function handleUnhandledRejection(reason, promise) {
  await logError('未处理的Promise拒绝', new Error(reason));
  console.error(chalk.red('❌ 发生未处理的错误:'), reason);
  process.exit(1);
}

/**
 * 创建自定义错误类
 */
class SqlAnalyzerError extends Error {
  constructor(message, code = 'GENERAL_ERROR', details = null) {
    super(message);
    this.name = 'SqlAnalyzerError';
    this.code = code;
    this.details = details;
  }
}

/**
 * 创建特定类型的错误
 */
function createError(type, message, details = null) {
  const errorCode = {
    'CONFIG': 'CONFIG_ERROR',
    'API': 'API_ERROR',
    'NETWORK': 'NETWORK_ERROR',
    'FILE': 'FILE_ERROR',
    'VALIDATION': 'VALIDATION_ERROR'
  }[type] || 'GENERAL_ERROR';
  
  return new SqlAnalyzerError(message, errorCode, details);
}

/**
 * 手动清理日志文件
 */
async function cleanLogs() {
  await cleanOldLogFiles();
  console.log(chalk.green('✅ 日志清理完成'));
}

// 导出函数
export {
  logInfo,
  logWarning,
  logError,
  logDebug,
  handleError,
  setupGlobalErrorHandlers,
  handleUncaughtException,
  handleUnhandledRejection,
  SqlAnalyzerError,
  createError,
  ensureLogDir,
  cleanLogs,
  getLogFiles,
  LOG_CONFIG,
  getCurrentLogFilePath
};