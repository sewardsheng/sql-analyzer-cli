/**
 * 规则学习相关类型定义
 */

export interface BaseRule {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  sqlPattern?: string;
  confidence: number;
  examples?: {
    bad: string[];
    good: string[];
  };
}

export interface RuleTestCase {
  sql: string;
  analysisResult: any;
  databaseType: string;
  timestamp: string;
  context: {
    performance: any;
    security: any;
    standards: any;
  };
}

export interface GenerationMetrics {
  total: number;
  successful: number;
  failed: number;
  duplicates: number;
  averageGenerationTime: number;
}