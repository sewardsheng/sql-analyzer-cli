/**
 * 分析工具相关类型定义
 * 老王我把过度工程化的接口都清理了，只保留实际使用的核心类型！
 */

import type { AnalysisType, AnalysisOptions } from './index.js';

// ============================================================================
// 核心上下文类型
// ============================================================================

/**
 * 增强分析上下文接口 - 被ContextManager和其他模块广泛使用
 */
export interface AnalysisContext {
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
// 核心结果类型
// ============================================================================

/**
 * 工具执行结果接口 - 分析结果的标准格式
 */
export interface ToolExecutionResult {
  success: boolean;
  tool: string;
  analysisType: AnalysisType;
  rawContent: string;
  parsedContent?: any; // 简化为通用类型，避免过度定义
  duration?: number;
  usage?: any; // 简化，避免与LLMUsage重复
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

// ============================================================================
// 核心配置类型
// ============================================================================

/**
 * 工具配置接口 - 基础配置结构
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

// ============================================================================
// 导出所有类型
// ============================================================================

export * from './index.js';