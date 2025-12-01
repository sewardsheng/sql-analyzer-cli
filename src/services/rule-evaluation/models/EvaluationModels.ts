/**
 * 评估结果数据模型
 * 老王重构：统一评估、去重、分类的所有结果结构
 */

import { RuleInfo } from './RuleModels';

/**
 * 去重检测结果
 */
export interface DuplicateResult {
  /** 是否重复 */
  isDuplicate: boolean;

  /** 相似度分数 0-1 */
  similarity: number;

  /** 重复类型 */
  duplicateType: 'exact' | 'semantic' | 'structural' | 'none';

  /** 去重原因 */
  reason: string;

  /** 置信度 */
  confidence: number;

  /** 匹配到的规则列表 */
  matchedRules: RuleInfo[];

  /** 匹配详情 */
  matchDetails: {
    exactMatch?: {
      title: boolean;
      description: boolean;
      sqlPattern: boolean;
    };
    semanticMatch?: {
      conceptSimilarity: number;
      keywordOverlap: number;
    };
    structuralMatch?: {
      categoryMatch: boolean;
      severityMatch: boolean;
    };
    contentMatch?: {
      exampleSimilarity: number;
      patternSimilarity: number;
    };
  };
}

/**
 * 质量评估结果
 */
export interface QualityResult {
  /** 质量评分 0-100 */
  qualityScore: number;

  /** 各维度评分 */
  dimensionScores: {
    /** 准确性 25% */
    accuracy: number;
    /** 实用性 25% */
    practicality: number;
    /** 完整性 20% */
    completeness: number;
    /** 通用性 15% */
    generality: number;
    /** 一致性 15% */
    consistency: number;
  };

  /** 是否建议保留 */
  shouldKeep: boolean;

  /** 质量等级 */
  qualityLevel: 'excellent' | 'good' | 'fair' | 'poor';

  /** 优势列表 */
  strengths: string[];

  /** 问题列表 */
  issues: string[];

  /** 改进建议 */
  suggestions: string[];

  /** 重复风险评估 */
  duplicateRisk: 'low' | 'medium' | 'high';

  /** 评估摘要 */
  evaluationSummary: string;

  /** 详细分析 */
  detailedAnalysis: {
    accuracy: {
      technicalCorrectness: number;
      exampleAccuracy: number;
      descriptionAccuracy: number;
    };
    practicality: {
      realWorldValue: number;
      solutionFeasibility: number;
      implementationCost: number;
    };
    completeness: {
      requiredElements: number;
      explanationDepth: number;
      exampleCoverage: number;
    };
    generality: {
      scopeBreadth: number;
      scenarioFlexibility: number;
      technologyAgnostic: number;
    };
    consistency: {
      formatCompliance: number;
      terminologyConsistency: number;
      structuralAlignment: number;
    };
  };
}

/**
 * 分类结果
 */
export interface ClassificationResult {
  /** 目标路径 */
  targetPath: string;

  /** 分类类别 */
  category: 'approved' | 'duplicate' | 'low_quality' | 'invalid_format';

  /** 分类原因 */
  reason: string;

  /** 置信度 */
  confidence: number;

  /** 是否需要人工复核 */
  requiresManualReview: boolean;

  /** 分类详情 */
  classificationDetails: {
    triggeredRules: string[];
    scoreBreakdown: {
      qualityScore: number;
      duplicateScore: number;
      formatScore: number;
      completenessScore: number;
    };
    decisionPath: string[];
    riskFactors: string[];
  };
}

/**
 * 完整评估结果
 */
export interface EvaluationResult {
  /** 规则信息 */
  rule: RuleInfo;

  /** 评估ID */
  evaluationId: string;

  /** 评估时间 */
  evaluationTime: Date;

  /** 去重检测结果 */
  duplicateCheck: DuplicateResult;

  /** 质量评估结果 */
  qualityEvaluation: QualityResult;

  /** 分类结果 */
  classification: ClassificationResult;

  /** 总体评估状态 */
  overallStatus: 'approved' | 'rejected' | 'needs_review';

  /** 处理动作 */
  recommendedAction: {
    action: 'move_to_approved' | 'move_to_issues' | 'manual_review' | 'discard';
    targetDirectory: string;
    priority: 'high' | 'medium' | 'low';
    estimatedEffort: number; // 分钟
  };

  /** 性能指标 */
  performanceMetrics: {
    processingTime: number; // 毫秒
    duplicateCheckTime: number;
    qualityEvaluationTime: number;
    classificationTime: number;
    totalTime: number;
  };

  /** 错误和警告 */
  errors: EvaluationError[];
  warnings: EvaluationWarning[];

  /** 评估元数据 */
  evaluationMetadata: {
    engineVersion: string;
    algorithmVersion: string;
    cacheHits: number;
    cacheMisses: number;
    apiCallCount: number;
  };
}

/**
 * 批量评估结果
 */
export interface BatchEvaluationResult {
  /** 批次ID */
  batchId: string;

  /** 批次信息 */
  batchInfo: {
    totalRules: number;
    processedRules: number;
    failedRules: number;
    skippedRules: number;
    startTime: Date;
    endTime?: Date;
    duration?: number; // 秒
  };

  /** 单个规则评估结果 */
  ruleResults: EvaluationResult[];

  /** 统计摘要 */
  summary: {
    approved: number;
    rejected: number;
    needsReview: number;
    duplicates: number;
    averageQualityScore: number;
    averageProcessingTime: number;
    totalApiCalls: number;
  };

  /** 分类统计 */
  classificationStats: {
    approved: number;
    duplicates: number;
    low_quality: number;
    invalid_format: number;
  };

  /** 错误汇总 */
  errorSummary: {
    totalErrors: number;
    errorTypes: { [type: string]: number };
    criticalErrors: number;
  };

  /** 性能统计 */
  performanceStats: {
    totalTime: number;
    averageTimePerRule: number;
    fastestRule: number;
    slowestRule: number;
    memoryUsage: number; // MB
  };
}

/**
 * 评估错误
 */
export interface EvaluationError {
  /** 错误ID */
  id: string;

  /** 错误类型 */
  type: 'parsing' | 'duplicate_detection' | 'quality_evaluation' | 'classification' | 'file_operation';

  /** 错误级别 */
  severity: 'critical' | 'error' | 'warning';

  /** 错误消息 */
  message: string;

  /** 详细描述 */
  details: string;

  /** 错误发生时间 */
  timestamp: Date;

  /** 相关规则ID */
  ruleId?: string;

  /** 堆栈信息 */
  stack?: string;

  /** 恢复建议 */
  recoverySuggestions: string[];
}

/**
 * 评估警告
 */
export interface EvaluationWarning {
  /** 警告ID */
  id: string;

  /** 警告类型 */
  type: 'low_confidence' | 'borderline_score' | 'missing_info' | 'inconsistent_data';

  /** 警告消息 */
  message: string;

  /** 详细描述 */
  details: string;

  /** 警告发生时间 */
  timestamp: Date;

  /** 相关规则ID */
  ruleId?: string;

  /** 建议操作 */
  recommendations: string[];
}

/**
 * 评估配置
 */
export interface EvaluationConfig {
  /** 去重配置 */
  duplicateDetection: {
    /** 是否启用去重检测 */
    enabled: boolean;

    /** 去重阈值 */
    thresholds: {
      exact: number;
      semantic: number;
      structural: number;
      warning: number;
    };

    /** 权重配置 */
    weights: {
      exact: number;
      semantic: number;
      structural: number;
      content: number;
    };
  };

  /** 质量评估配置 */
  qualityAssessment: {
    /** 是否启用质量评估 */
    enabled: boolean;

    /** 各维度权重 */
    dimensionWeights: {
      accuracy: number;
      practicality: number;
      completeness: number;
      generality: number;
      consistency: number;
    };

    /** 评分阈值 */
    thresholds: {
      excellent: number;
      good: number;
      fair: number;
      minimum: number;
    };
  };

  /** 分类配置 */
  classification: {
    /** 是否启用自动分类 */
    enabled: boolean;

    /** 分类阈值 */
    thresholds: {
      minQualityScore: number;
      maxDuplicateRisk: string;
      minCompletenessScore: number;
    };

    /** 人工复核触发条件 */
    manualReviewTriggers: {
      lowConfidence: boolean;
      borderlineScores: boolean;
      conflictingResults: boolean;
    };
  };

  /** 性能配置 */
  performance: {
    /** 批量大小 */
    batchSize: number;

    /** 并发数量 */
    concurrency: number;

    /** 缓存TTL（秒） */
    cacheTtl: number;

    /** 超时设置 */
    timeouts: {
      duplicateDetection: number;
      qualityEvaluation: number;
      classification: number;
      total: number;
    };
  };
}

/**
 * 评估进度信息
 */
export interface EvaluationProgress {
  /** 当前阶段 */
  currentPhase: 'initialization' | 'parsing' | 'duplicate_detection' | 'quality_evaluation' | 'classification' | 'completion';

  /** 总进度 0-100 */
  totalProgress: number;

  /** 当前阶段进度 0-100 */
  phaseProgress: number;

  /** 已处理规则数 */
  processedRules: number;

  /** 总规则数 */
  totalRules: number;

  /** 当前处理的规则ID */
  currentRuleId?: string;

  /** 预计剩余时间（秒） */
  estimatedTimeRemaining?: number;

  /** 处理速度（规则/秒） */
  processingSpeed?: number;

  /** 阶段详情 */
  phaseDetails: {
    phaseName: string;
    description: string;
    startTime: Date;
    estimatedDuration?: number;
  }[];
}