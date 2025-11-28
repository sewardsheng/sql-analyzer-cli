/**
 * SQL分析器类型定义
 * 老王我把类型都给你定义好了！
 */

// ============================================================================
// 基础类型定义
// ============================================================================

/**
 * 分析类型枚举
 */
export type AnalysisType = 'performance' | 'security' | 'standards';

/**
 * 严重程度类型
 */
export type Severity = 'critical' | 'high' | 'medium' | 'low';

/**
 * 优先级类型
 */
export type Priority = 'high' | 'medium' | 'low';

/**
 * 数据库类型
 */
export type DatabaseType = 'mysql' | 'postgresql' | 'oracle' | 'sqlserver' | 'auto-detected';

// ============================================================================
// 分析结果类型
// ============================================================================

/**
 * 基础问题接口
 */
export interface Issue {
  type: AnalysisType;
  severity?: Severity;
  score?: number;
  title?: string;
  description: string;
  location?: string;
  impact?: string;
  statementIndex?: number;
}

/**
 * 基础建议接口
 */
export interface Recommendation {
  type: AnalysisType;
  priority?: Priority;
  title?: string;
  description: string;
  implementation?: string;
  benefit?: string;
  statementIndex?: number;
}

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  estimatedImprovement?: string;
  optimizationType?: string;
}

/**
 * 安全评估接口
 */
export interface SecurityAssessment {
  riskLevel?: string;
  vulnerabilityType?: string;
}

/**
 * 解析的分析内容接口
 */
export interface ParsedAnalysisContent {
  summary: string;
  overallScore?: number;
  confidence?: number;
  issues: Issue[];
  recommendations: Recommendation[];
  performanceMetrics?: PerformanceMetrics;
  securityAssessment?: SecurityAssessment;
  rawResponse?: string;
}

// ============================================================================
// 分析上下文类型
// ============================================================================

/**
 * 分析选项接口
 */
export interface AnalysisOptions {
  performance?: boolean;
  security?: boolean;
  standards?: boolean;
  databaseType?: DatabaseType;
  temperature?: number;
  maxTokens?: number;
  enableKnowledgeBase?: boolean;
  analysisTypes?: AnalysisType[];
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  historyLimit?: number;
  cacheKey?: string;
}

/**
 * 核心上下文接口
 */
export interface CoreContext {
  sql: string;
  databaseType: DatabaseType;
  analysisTypes: AnalysisType[];
  timestamp: string;
  options: AnalysisOptions;
}

/**
 * 模板上下文接口
 */
export interface TemplateContext {
  [key: string]: {
    systemPrompt: string;
    userPrompt: string;
  };
}

/**
 * 知识库上下文接口
 */
export interface KnowledgeContext {
  query: string;
  documents: Array<{
    title?: string;
    content?: string;
    relevanceScore?: number;
  }>;
  totalCount: number;
}

/**
 * 数据库特定上下文接口
 */
export interface DatabaseContext {
  dialect: string;
  version?: string;
  optimization: string[];
  antiPatterns: string[];
}

/**
 * 上下文元数据接口
 */
export interface ContextMetadata {
  buildTime: number;
  tokenCount: number;
  priority: number;
  complexity: 'low' | 'medium' | 'high';
  cached?: boolean;
  optimized?: boolean;
  optimizedAt?: number;
}

/**
 * 完整分析上下文接口
 */
export interface AnalysisContext {
  core: CoreContext;
  templates: TemplateContext;
  knowledge: KnowledgeContext | null;
  database: DatabaseContext;
  history: any[];
  metadata: ContextMetadata;
}

// ============================================================================
// 分析结果类型
// ============================================================================

/**
 * 工具执行结果接口
 */
export interface ToolExecutionResult {
  success: boolean;
  tool: string;
  analysisType: AnalysisType;
  rawContent: string;
  parsedContent: ParsedAnalysisContent;
  duration: number;
  usage: any;
  context: {
    databaseType?: DatabaseType;
    sqlLength: number;
    complexity?: string;
  };
  enhancedContext?: {
    metadata: ContextMetadata;
    cacheStats: any;
  };
  timestamp: string;
}

/**
 * 文件分析结果接口
 */
export interface FileAnalysisResult {
  success: boolean;
  fileInfo: {
    filePath: string;
    fileName: string;
  };
  analysis: {
    summary: string;
    issues: Issue[];
    recommendations: Recommendation[];
    performance?: PerformanceMetrics;
    security?: SecurityAssessment;
    overallScore: number;
    confidence: number;
  };
  statementResults: ToolExecutionResult[];
  stats: {
    totalStatements: number;
    successfulAnalyses: number;
    failedAnalyses: number;
    overallScore: number;
  };
  timestamp: string;
}

/**
 * 目录分析结果接口
 */
export interface DirectoryAnalysisResult {
  success: boolean;
  directory: string;
  fileCount: number;
  results: FileAnalysisResult[];
  stats: {
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
    totalStatements: number;
    totalIssues: number;
    totalRecommendations: number;
    averageScore: number;
  };
  timestamp: string;
}

/**
 * 错误结果接口
 */
export interface ErrorResult {
  success: false;
  error: string;
  filePath?: string;
  fileName?: string;
  sql?: string;
  statementIndex?: number;
  timestamp: string;
}

// ============================================================================
// 分析器配置类型
// ============================================================================

/**
 * 分析器配置接口
 */
export interface AnalyzerConfig {
  enableCaching?: boolean;
  enableKnowledgeBase?: boolean;
  maxConcurrency?: number;
  batchSize?: number;
  maxFileSize?: number;
}

/**
 * 文件分析服务配置接口
 */
export interface FileAnalyzerConfig extends AnalyzerConfig {
  supportedExtensions?: string[];
  recursive?: boolean;
}

// ============================================================================
// LLM服务类型
// ============================================================================

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
}

/**
 * LLM调用选项接口
 */
export interface LLMCallOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
  timeout?: number;
}

/**
 * LLM调用结果接口
 */
export interface LLMCallResult {
  success: boolean;
  content: string;
  rawContent: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  duration: number;
  model: string;
  timestamp: string;
  error?: string;
}

// ============================================================================
// 工具配置类型
// ============================================================================

/**
 * 工具配置映射接口
 */
export interface ToolConfig {
  performance: {
    temperature: number;
    maxTokens: number;
    priority: number;
  };
  security: {
    temperature: number;
    maxTokens: number;
    priority: number;
  };
  standards: {
    temperature: number;
    maxTokens: number;
    priority: number;
  };
}

/**
 * 统计信息接口
 */
export interface AnalyzerStats {
  totalAnalyses: number;
  successfulAnalyses: number;
  totalDuration: number;
  cacheHits: number;
  errors: number;
  averageDuration: number;
  successRate: string;
  cacheHitRate: string;
  toolStats: {
    size: number;
    supportedTypes: number;
  };
}

// ============================================================================
// CLI相关类型
// ============================================================================

/**
 * CLI命令类型
 */
export type CLICommand =
  | 'analyze'
  | 'a'
  | 'directory'
  | 'dir'
  | 'd'
  | 'stats'
  | 's'
  | 'help'
  | 'h'
  | 'version'
  | 'v';

/**
 * CLI选项接口
 */
export interface CLIOptions {
  analysisTypes?: AnalysisType[];
  databaseType?: DatabaseType;
  batchSize?: number;
  recursive?: boolean;
  enableCache?: boolean;
  outputFormat?: 'json' | 'text';
  outputFile?: string;
  performance?: boolean;
  security?: boolean;
  standards?: boolean;
}

// ============================================================================
// 工厂函数类型
// ============================================================================

/**
 * 分析器工厂函数类型
 */
export type AnalyzerFactory = (options?: AnalyzerConfig) => any;

/**
 * 文件分析服务工厂函数类型
 */
export type FileAnalyzerFactory = (options?: FileAnalyzerConfig) => any;

/**
 * 上下文管理器工厂函数类型
 */
export type ContextManagerFactory = (llmService: any, knowledgeBase?: any) => any;

/**
 * 提示词构建器工厂函数类型
 */
export type PromptBuilderFactory = (options?: any) => any;

// ============================================================================
// 导出类型联合
// ============================================================================

export type AnalysisResult =
  | ToolExecutionResult
  | FileAnalysisResult
  | DirectoryAnalysisResult
  | ErrorResult;

export type ResultWithSuccess<T = any> =
  | { success: true; data: T }
  | { success: false; error: string; data?: null };