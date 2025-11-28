/**
 * LLM服务相关类型定义
 * 老王我把LLM的类型都给你定义好了！
 */

import type { AnalysisOptions, LLMCallOptions, LLMCallResult } from './index.js';

// ============================================================================
// LLM服务接口
// ============================================================================

/**
 * LLM服务接口
 */
export interface ILLMService {
  /**
   * 调用LLM API
   * @param prompt 提示词
   * @param options 调用选项
   * @returns LLM响应结果
   */
  call(prompt: string, options?: LLMCallOptions): Promise<LLMCallResult>;

  /**
   * 并行调用多个LLM请求
   * @param requests 请求数组
   * @param globalOptions 全局选项
   * @returns 响应数组
   */
  callParallel(
    requests: Array<{ prompt: string; options?: LLMCallOptions }>,
    globalOptions?: LLMCallOptions
  ): Promise<LLMCallResult[]>;

  /**
   * 测试LLM连接
   * @returns 测试结果
   */
  testConnection(): Promise<{
    success: boolean;
    message: string;
    duration?: number;
    model?: string;
    error?: string;
  }>;

  /**
   * 获取服务状态
   * @returns 状态信息
   */
  getStatus(): {
    service: string;
    model: string;
    baseUrl: string;
    hasApiKey: boolean;
    timestamp: string;
  };

  /**
   * 更新配置
   * @param newConfig 新配置
   */
  updateConfig(newConfig: Partial<LLMConfig>): void;
}

/**
 * LLM配置接口
 */
export interface LLMConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  headers?: Record<string, string>;
  timeout?: number;
  maxRetries?: number;
}

// ============================================================================
// LLM调用选项
// ============================================================================

/**
 * 基础LLM选项接口
 */
export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

/**
 * 扩展的LLM调用选项
 */
export interface ExtendedLLMOptions extends LLMOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
  timeout?: number;
  systemPrompt?: string;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * 并行调用选项
 */
export interface ParallelCallOptions {
  maxConcurrency?: number;
  timeout?: number;
  stopOnError?: boolean;
}

// ============================================================================
// LLM响应结果
// ============================================================================

/**
 * LLM使用统计
 */
export interface LLMUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  model?: string;
}

/**
 * 扩展的LLM调用结果
 */
export interface ExtendedLLMResult extends LLMCallResult {
  usage: LLMUsage;
  finishReason?: string;
  cached?: boolean;
  latency?: number;
  model: string;
  timestamp: string;
  requestParams?: any;
  responseHeaders?: Record<string, string>;
}

// ============================================================================
// LLM工具接口
// ============================================================================

/**
 * LLM工具工厂接口
 */
export interface ILLMToolFactory {
  /**
   * 创建LLM服务实例
   * @param config 配置选项
   * @returns LLM服务实例
   */
  createService(config: LLMConfig): ILLMService;
}

/**
 * LLM工具参数
 */
export interface LLMToolParams {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
  systemPrompt?: string;
}

// ============================================================================
// 信号量接口
// ============================================================================

/**
 * 信号量接口
 */
export interface ISemaphore {
  /**
   * 获取信号量
   * @returns Promise<void>
   */
  acquire(): Promise<void>;

  /**
   * 释放信号量
   */
  release(): void;

  /**
   * 获取当前可用数量
   * @returns 可用数量
   */
  available(): number;

  /**
   * 获取当前使用数量
   * @returns 使用数量
   */
  inUse(): number;

  /**
   * 获取最大数量
   * @returns 最大数量
   */
  getMax(): number;
}

// ============================================================================
// 错误类型
// ============================================================================

/**
 * LLM错误类型
 */
export class LLMError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly retryable: boolean;

  constructor(
    message: string,
    code: string = 'LLM_ERROR',
    statusCode?: number,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'LLMError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

/**
 * API限制错误
 */
export class RateLimitError extends LLMError {
  constructor(message: string, retryAfter?: number) {
    super(message, 'RATE_LIMIT', 429, true);
  }
}

/**
 * 配置错误
 */
export class ConfigError extends LLMError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR', 400, false);
  }
}

/**
 * 网络错误
 */
export class NetworkError extends LLMError {
  constructor(message: string, statusCode?: number) {
    super(message, 'NETWORK_ERROR', statusCode, true);
  }
}

/**
 * 解析错误
 */
export class ParseError extends LLMError {
  constructor(message: string) {
    super(message, 'PARSE_ERROR', 500, false);
  }
}

// ============================================================================
// 工具函数类型
// ============================================================================

/**
 * 请求参数构建器类型
 */
export type RequestBuilder = (prompt: string, options: LLMCallOptions) => any;

/**
 * 响应解析器类型
 */
export type ResponseParser = (response: any) => LLMCallResult;

/**
 * 重试策略类型
 */
export type RetryStrategy = (error: Error, attempt: number) => boolean;

/**
 * 超时配置类型
 */
export type TimeoutConfig = {
  connect?: number;
  read?: number;
  write?: number;
  signal?: AbortSignal;
};

// ============================================================================
// 配置验证类型
// ============================================================================

/**
 * LLM配置验证器接口
 */
export interface ILLMConfigValidator {
  /**
   * 验证配置
   * @param config 配置对象
   * @returns 验证结果
   */
  validate(config: LLMConfig): {
    valid: boolean;
    errors: string[];
  };

  /**
   * 验证必需字段
   * @param config 配置对象
   * @returns 是否有效
   */
  validateRequired(config: LLMConfig): boolean;

  /**
   * 验证模型
   * @param model 模型名称
   * @returns 是否支持
   */
  validateModel(model: string): boolean;

  /**
   * 验证URL
   * @param url URL地址
   * @returns 是否有效
   */
  validateUrl(url: string): boolean;
}

// ============================================================================
// 导出所有类型
// ============================================================================

export * from './index.js';