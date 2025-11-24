/**
 * SQL分析器项目类型定义
 * 提供TypeScript类型支持
 */

// 数据库类型定义
export type DatabaseType = 
  | 'mysql' 
  | 'postgresql' 
  | 'oracle' 
  | 'sqlserver' 
  | 'sqlite' 
  | 'clickhouse';

// 分析器类型定义
export type AnalyzerType = 
  | 'performance' 
  | 'security' 
  | 'coding-standards' 
  | 'quick' 
  | 'intelligent-rule-learner';

// 分析结果接口
export interface AnalysisResult {
  id: string;
  sql: string;
  databaseType: DatabaseType;
  analyzerType: AnalyzerType;
  result: any;
  timestamp: Date;
  duration: number;
}

// API响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
}

// 配置接口
export interface ServerConfig {
  port: number;
  host: string;
  cors: boolean;
  corsOrigin: string;
  nodeEnv: string;
  logLevel: string;
}

// 分析器配置接口
export interface AnalyzerConfig {
  enabled: boolean;
  options: Record<string, any>;
}

// 知识库接口
export interface KnowledgeItem {
  id: string;
  type: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// 健康检查接口
export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  services: Record<string, {
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    responseTime?: number;
  }>;
}