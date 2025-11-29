/**
 * 全局类型声明
 * 解决迁移过程中的类型兼容性问题
 */

declare global {
  // Bun types
  var Bun: any;

  // 扩展Console类型以支持颜色输出
  interface Console {
    logWithColor?: (message: string, color: string) => void;
  }

  // 扩展Error类型以支持自定义属性
  interface Error {
    code?: string | number;
    details?: any;
  }

  // LLM响应类型
  interface LLMResponse {
    success: boolean;
    data: any;
    rawContent: string;
    duration?: number;
    confidence?: number;
    strategy?: string;
  }

  // 分析结果类型
  interface AnalysisResult {
    success: boolean;
    data: any;
    error?: string;
    metadata?: {
      duration?: number;
      confidence?: number;
      databaseType?: string;
      timestamp?: string;
      tools?: string[];
      llmCalls?: number;
      responseTime?: number;
      [key: string]: any;
    };
    sql?: string;
  }

  // 工具执行结果类型
  interface ToolResult {
    success: boolean;
    data: any;
    rawContent: string;
    strategy: string;
    metadata: {
      duration: number;
      confidence: number;
      parallelTime: number;
    };
  }

  // 简化的日志条目类型
  interface LogEntry {
    timestamp: string;
    level: string | number;
    category: string;
    message: string;
    data?: any;
    [key: string]: any;
  }

  // 配置管理器类型
  interface SimpleConfigManagerType {
    config: any;
    get(path: string, defaultValue?: any): any;
    set(path: string, value: any): void;
    getAll(): any;
    getModule(module: string, defaultValue?: any): any;
    getServerConfig(): any;
    getLlmConfig(): any;
    getRuleLearningConfig(): any;
    getKnowledgeConfig(): any;
    deepMerge(target: any, source: any): any;
    validate(): void;
  }
}

export {};