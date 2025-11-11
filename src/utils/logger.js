const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const chalk = require('chalk').default; // CommonJS环境中使用.default访问ES模块的默认导出

/**
 * 日志目录和文件路径
 */
const LOG_DIR = path.join(os.homedir(), '.sql-analyzer', 'logs');
const LOG_FILE = path.join(LOG_DIR, `sql-analyzer-${new Date().toISOString().split('T')[0]}.log`);

/**
 * 确保日志目录存在
 */
async function ensureLogDir() {
  try {
    await fs.access(LOG_DIR);
  } catch (error) {
    await fs.mkdir(LOG_DIR, { recursive: true });
  }
}

/**
 * 写入日志
 */
async function writeLog(level, message, error = null) {
  await ensureLogDir();
  
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
    await fs.appendFile(LOG_FILE, logLine);
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

module.exports = {
  logInfo,
  logWarning,
  logError,
  handleError,
  setupGlobalErrorHandlers,
  SqlAnalyzerError,
  createError,
  LOG_FILE
};