/**
 * Logger工具类型定义
 */

/**
 * 记录错误日志
 * @param message 错误信息
 * @param error 错误对象
 */
export declare function logError(message: string, error: Error): void;

/**
 * 记录信息日志
 * @param message 信息内容
 * @param data 附加数据
 */
export declare function logInfo(message: string, data?: any): void;

/**
 * 记录调试日志
 * @param message 调试信息
 * @param data 附加数据
 */
export declare function logDebug(message: string, data?: any): void;

/**
 * 记录警告日志
 * @param message 警告信息
 * @param data 附加数据
 */
export declare function logWarn(message: string, data?: any): void;