/**
 * 分析工具相关类型定义
 * 老王我把工具的类型都给你定义好了！
 */

import type { AnalysisType, AnalysisOptions, LLMCallOptions, LLMCallResult } from './index.js';

// ============================================================================
// 基础工具接口
// ============================================================================

/**
 * 基础分析工具接口
 */
export interface IBaseTool {
  /**
   * 工具名称
   */
  readonly name: string;

  /**
   * 执行分析
   * @param context 分析上下文
   * @returns 分析结果
   */
  execute(context: ToolContext): Promise<ToolExecutionResult>;

  /**
   * 验证上下文
   * @param context 分析上下文
   * @returns 是否有效
   */
  validateContext(context: ToolContext): boolean;

  /**
   * 获取工具信息
   * @returns 工具信息
   */
  getInfo(): ToolInfo;

  /**
   * 获取工具描述
   * @returns 描述
   */
  getDescription(): string;

  /**
   * 处理错误
   * @param error 错误对象
   * @param context 上下文
   * @returns 错误结果
   */
  handleError(error: Error, context: ToolContext): ToolExecutionResult;

  /**
   * 格式化分析结果
   * @param llmResult LLM结果
   * @param context 增强上下文
   * @returns 格式化结果
   */
  formatResult(llmResult: LLMCallResult, context: AnalysisContext): ToolExecutionResult;

  /**
   * 获取分析类型
   * @returns 分析类型
   */
  getAnalysisType(): AnalysisType;

  /**
   * 获取工具特定选项
   * @returns 工具选项
   */
  getToolSpecificOptions(): Record<string, any>;

  /**
   * 获取温度参数
   * @returns 温度值
   */
  getTemperature(): number;

  /**
   * 获取最大token数
   * @returns 最大token数
   */
  getMaxTokens(): number;

  /**
   * 获取工具统计信息
   * @returns 统计信息
   */
  getStats(): ToolStats;

  /**
   * 重置统计信息
   */
  resetStats(): void;

  /**
   * 清理缓存
   */
  cleanup(): void;
}

// ============================================================================
// 上下文类型
// ============================================================================

/**
 * 基础分析上下文接口
 */
export interface ToolContext {
  sql: string;
  databaseType?: string;
  options?: AnalysisOptions;
}

/**
 * 增强分析上下文接口
 */
export interface AnalysisContext extends ToolContext {
  core: {
    sql: string;
    databaseType: string;
    analysisTypes: AnalysisType[];
    timestamp: string;
    options: AnalysisOptions;
  };
  templates?: Record<string, any>;
  knowledge?: any;
  database?: any;
  history?: any[];
  metadata?: {
    buildTime: number;
    tokenCount: number;
    priority: number;
    complexity: 'low' | 'medium' | 'high';
    cached?: boolean;
    optimized?: boolean;
    optimizedAt?: number;
  };
}

// ============================================================================
// 结果类型
// ============================================================================

/**
 * 工具执行结果接口
 */
export interface ToolExecutionResult {
  success: boolean;
  tool: string;
  analysisType: AnalysisType;
  rawContent: string;
  parsedContent?: ParsedToolContent;
  duration?: number;
  usage?: LLMUsage;
  context?: {
    databaseType?: string;
    sqlLength: number;
    complexity?: string;
  };
  enhancedContext?: {
    metadata?: any;
    cacheStats?: any;
  };
  timestamp?: string;
  error?: string;
  errorType?: string;
}

/**
 * 解析的工具内容接口
 */
export interface ParsedToolContent {
  summary: string;
  overallScore?: number;
  confidence?: number;
  issues?: ToolIssue[];
  recommendations?: ToolRecommendation[];
  performanceMetrics?: ToolPerformanceMetrics;
  securityAssessment?: ToolSecurityAssessment;
  rawResponse?: string;
}

/**
 * 工具问题接口
 */
export interface ToolIssue {
  type: AnalysisType;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  score?: number;
  title?: string;
  description: string;
  location?: string;
  impact?: string;
  statementIndex?: number;
  source?: string;
}

/**
 * 工具建议接口
 */
export interface ToolRecommendation {
  type: AnalysisType;
  priority?: 'high' | 'medium' | 'low';
  title?: string;
  description: string;
  implementation?: string;
  benefit?: string;
  statementIndex?: number;
  source?: string;
}

/**
 * 工具性能指标接口
 */
export interface ToolPerformanceMetrics {
  estimatedImprovement?: string;
  optimizationType?: string;
  queryComplexity?: string;
  indexUsage?: string;
  executionPlan?: string;
}

/**
 * 工具安全评估接口
 */
export interface ToolSecurityAssessment {
  riskLevel?: 'critical' | 'high' | 'medium' | 'low';
  vulnerabilityType?: string;
  complianceFrameworks?: string[];
}

/**
 * LLM使用统计接口
 */
export interface LLMUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

/**
 * 工具信息接口
 */
export interface ToolInfo {
  name: string;
  version: string;
  description: string;
  timestamp: string;
}

/**
 * 工具统计接口
 */
export interface ToolStats {
  executionCount: number;
  totalDuration: number;
  cacheHits: number;
  errors: number;
  averageDuration: number;
  errorRate: string;
  cacheHitRate: string;
}

// ============================================================================
// 工具配置类型
// ============================================================================

/**
 * 工具配置映射接口
 */
export interface ToolConfigMap {
  [toolName: string]: ToolConfig;
}

/**
 * 工具配置接口
 */
export interface ToolConfig {
  temperature: number;
  maxTokens: number;
  priority: number;
  analysisDepth?: 'quick' | 'standard' | 'deep';
  focusAreas?: string[];
  constraints?: string[];
  includeMetrics?: boolean;
}

/**
 * 性能工具特定配置
 */
export interface PerformanceToolConfig extends ToolConfig {
  analysisDepth: 'quick' | 'standard' | 'deep';
  includeMetrics: boolean;
  focusAreas?: ['query_efficiency', 'index_usage', 'resource_consumption'];
}

/**
 * 安全工具特定配置
 */
export interface SecurityToolConfig extends ToolConfig {
  securityLevel: 'basic' | 'standard' | 'comprehensive';
  includeThreatModeling?: boolean;
  complianceFrameworks?: string[];
  focusAreas?: ['sql_injection', 'privilege_escalation', 'data_exposure'];
}

/**
 * 规范工具特定配置
 */
export interface StandardsToolConfig extends ToolConfig {
  strictMode: boolean;
  includeBestPractices?: boolean;
  styleGuides?: string[];
  focusAreas?: ['coding_standards', 'naming_conventions', 'formatting'];
}

// ============================================================================
// 工厂接口
// ============================================================================

/**
 * 工具创建选项接口
 */
export interface ToolCreationOptions {
  temperature?: number;
  maxTokens?: number;
  enableCaching?: boolean;
  knowledgeBase?: any;
  llmService?: any;
}

/**
 * 工具工厂接口
 */
export interface IToolFactory {
  /**
   * 创建工具实例
   * @param type 工具类型
   * @param llmService LLM服务
   * @param options 创建选项
   * @param knowledgeBase 知识库实例
   * @returns 工具实例
   */
  createTool(
    type: string,
    llmService: any,
    options?: ToolCreationOptions,
    knowledgeBase?: any
  ): IBaseTool;

  /**
   * 获取工具实例（支持缓存）
   * @param type 工具类型
   * @param options 创建选项
   * @returns 工具实例
   */
  getTool(type: string, options?: ToolCreationOptions): IBaseTool;

  /**
   * 获取所有工具
   * @param options 创建选项
   * @returns 工具映射
   */
  getAllTools(options?: ToolCreationOptions): Record<string, IBaseTool>;

  /**
   * 清理缓存
   */
  clearCache(): void;

  /**
   * 获取缓存统计
   * @returns 缓存统计
   */
  getCacheStats(): {
    size: number;
    supportedTypes: number;
  };
}

// ============================================================================
// 验证接口
// ============================================================================

/**
 * 工具验证器接口
 */
export interface IToolValidator {
  /**
   * 验证工具类型
   * @param type 工具类型
   * @returns 是否有效
   */
  validateToolType(type: string): boolean;

  /**
   * 验证工具配置
   * @param config 配置对象
   * @returns 验证结果
   */
  validateConfig(config: ToolConfig): {
    valid: boolean;
    errors: string[];
  };

  /**
   * 验证分析上下文
   * @param context 分析上下文
   * @returns 验证结果
   */
  validateContext(context: ToolContext): {
    valid: boolean;
    errors: string[];
  };
}

// ============================================================================
// 导出所有类型
// ============================================================================

export * from './index.js';