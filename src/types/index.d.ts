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
  | 'sqlite';

// 分析器类型定义
export type AnalyzerType = 
  | 'performance' 
  | 'security' 
  | 'coding-standards' 
  | 'intelligent-rule-learner';

// 性能分析结果接口
export interface PerformanceAnalysisResult {
  score: number;
  confidence: number;
  executionPlan: {
    estimatedCost: number;
    estimatedRows: number;
    operations: Array<{
      type: string;
      description: string;
      cost: number;
      rows: number;
      optimizationNotes: string;
    }>;
  };
  issues: Array<{
    type: "扫描与索引瓶颈" | "连接操作与中间结果瓶颈" | "查询逻辑与计算瓶颈" | "资源使用与并发瓶颈";
    severity: "严重" | "高" | "中" | "低";
    confidence: number;
    description: string;
    location: string;
    rootCause: string;
    performanceImpact: string;
    evidence: string;
  }>;
  optimizations: Array<{
    issueId: string;
    approach: "主要" | "次要" | "替代";
    suggestion: string;
    sql_rewrite: string;
    explanation: string;
    expectedImprovement: string;
    implementationComplexity: "低" | "中" | "高";
    tradeoffs: string;
    prerequisites: string;
  }>;
  metrics: {
    estimatedExecutionTime: string;
    ioOperations: number;
    memoryUsage: string;
    cpuComplexity: "低" | "中" | "高";
    parallelismPotential: "低" | "中" | "高";
  };
  recommendations: Array<{
    category: "Index" | "Schema" | "Query" | "Configuration";
    priority: "严重" | "高" | "中" | "低";
    description: string;
    implementation: string;
    impact: string;
  }>;
}

// 编码规范检查结果接口
export interface CodingStandardsCheckResult {
  score: number;
  confidence: number;
  qualityLevel: "优秀" | "良好" | "一般" | "较差" | "严重";
  standardsCompliance: {
    overallCompliance: number;
    namingCompliance: number;
    formattingCompliance: number;
    structuralCompliance: number;
    documentationCompliance: number;
  };
  complexityMetrics: {
    cyclomaticComplexity: number;
    nestingDepth: number;
    queryLength: number;
    joinCount: number;
    subqueryCount: number;
    complexityLevel: "Low" | "Medium" | "High" | "VeryHigh";
  };
  violations: Array<{
    id: string;
    category: "命名约定" | "格式化" | "结构" | "文档" | "性能" | "安全";
    subcategory: string;
    severity: "严重" | "主要" | "次要" | "信息";
    confidence: number;
    rule: string;
    description: string;
    location: {
      line: number;
      column: number;
      snippet: string;
    };
    impact: {
      readability: "无" | "低" | "中" | "高";
      maintainability: "无" | "低" | "中" | "高";
      performance: "无" | "低" | "中" | "高";
      security: "无" | "低" | "中" | "高";
    };
    standardsReference: string;
    evidence: string;
    suggestedFix: string;
  }>;
  fixed_sql: string;
  fixSummary: {
    totalChanges: number;
    criticalFixes: number;
    majorFixes: number;
    minorFixes: number;
    categoriesFixed: string[];
  };
  recommendations: Array<{
    category: "命名" | "格式化" | "结构" | "文档" | "性能" | "最佳实践";
    priority: "严重" | "高" | "中" | "低";
    title: string;
    description: string;
    implementation: {
      steps: string[];
      examples: string[];
      tools: string[];
    };
    benefits: {
      readability: string;
      maintainability: string;
      performance: string;
      teamProductivity: string;
    };
    effort: "低" | "中" | "高";
    impact: "低" | "中" | "高";
  }>;
  qualityMetrics: {
    readabilityScore: number;
    maintainabilityIndex: number;
    documentationCoverage: number;
    standardsAdherence: number;
    codeComplexity: "低" | "中" | "高" | "非常高";
    technicalDebt: "低" | "中" | "高" | "严重";
  };
  bestPractices: Array<{
    practice: string;
    category: "通用" | string | "企业" | "行业";
    currentStatus: "合规" | "部分合规" | "不合规";
    improvementNeeded: string;
    implementation: string;
  }>;
}

// 安全审计结果接口
export interface SecurityAuditResult {
  score: number;
  confidence: number;
  threatLevel: "严重" | "高" | "中" | "低";
  attackSurface: {
    totalVectors: number;
    highRiskVectors: number;
    exploitableVectors: number;
  };
  vulnerabilities: Array<{
    id: string;
    type: "SQL注入" | "权限提升" | "数据泄露" | "身份验证绕过" | "配置问题";
    subtype: string;
    severity: "严重" | "高" | "中" | "低";
    confidence: number;
    cwe_id: string;
    cvss_score: number;
    mitre_tactic: string;
    mitre_technique: string;
    description: string;
    location: string;
    attackVector: string;
    exploitationScenario: string;
    impact: {
      confidentiality: "无" | "低" | "高" | "完全";
      integrity: "无" | "低" | "高" | "完全";
      availability: "无" | "低" | "高" | "完全";
      compliance: string[];
    };
    evidence: string;
    conditions: string;
  }>;
  recommendations: Array<{
    vulnerabilityId: string;
    priority: "严重" | "高" | "中" | "低";
    category: "立即修复" | "短期" | "长期" | "配置";
    action: string;
    description: string;
    implementation: {
      codeExample: string;
      configuration: string;
      prerequisites: string;
    };
    validation: {
      testMethod: string;
      expectedResult: string;
    };
    alternatives: string[];
    tradeoffs: string;
  }>;
  securityMetrics: {
    totalVulnerabilities: number;
    criticalVulnerabilities: number;
    highRiskVulnerabilities: number;
    exploitableVulnerabilities: number;
    complianceViolations: number;
    securityPosture: "优秀" | "良好" | "一般" | "较差" | "严重";
  };
  complianceAssessment: {
    gdpr: string[];
    hipaa: string[];
    pciDss: string[];
    sox: string[];
  };
  bestPractices: Array<{
    category: "输入验证" | "身份验证" | "授权" | "加密" | "日志记录";
    practice: string;
    implementation: string;
    relevance: string;
  }>;
}

// 智能规则学习结果接口
export interface IntelligentRuleLearnerResult {
  score: number;
  confidence: number;
  learningEffectiveness: "优秀" | "良好" | "一般" | "较差";
  knowledgeSynthesis: {
    patternsIdentified: number;
    rulesGenerated: number;
    rulesValidated: number;
    knowledgeGaps: string[];
    learningConfidence: number;
  };
  patternAnalysis: Array<{
    patternId: string;
    category: "性能" | "安全" | "标准" | "架构" | "集成";
    subcategory: string;
    frequency: "高" | "中" | "低";
    confidence: number;
    description: string;
    context: string;
    examples: string[];
    impact: {
      severity: "严重" | "高" | "中" | "低";
      scope: "局部" | "全局" | "系统性";
      measurableImpact: string;
    };
    relationships: string[];
    evolution: string;
  }>;
  new_rules: Array<{
    id: string;
    category: "性能" | "安全" | "标准" | "架构" | "集成";
    subcategory: string;
    priority: "严重" | "高" | "中" | "低";
    confidence: number;
    pattern_regex: string;
    description: string;
    rationale: string;
    conditions: {
      prerequisites: string[];
      exceptions: string[];
      dependencies: string[];
    };
    validation: {
      method: string;
      accuracy: number;
      falsePositiveRate: number;
      falseNegativeRate: number;
      testCases: string[];
    };
    implementation: {
      complexity: "低" | "中" | "高";
      effort: "低" | "中" | "高";
      resources: string[];
      timeline: string;
    };
    impact: {
      expectedBenefit: string;
      measurableOutcomes: string[];
      roi: string;
    };
    examples: {
      positive: string[];
      negative: string[];
    };
  }>;
  knowledgeGaps: Array<{
    gapId: string;
    category: "性能" | "安全" | "标准" | "架构" | "集成";
    description: string;
    impact: string;
    fillingStrategy: string;
    priority: "严重" | "高" | "中" | "低";
    estimatedEffort: string;
  }>;
  learningMetrics: {
    totalPatternsAnalyzed: number;
    newPatternsDiscovered: number;
    rulesGenerated: number;
    rulesAccepted: number;
    rulesRejected: number;
    averageConfidence: number;
    learningEfficiency: number;
    knowledgeBaseGrowth: {
      previousSize: number;
      newSize: number;
      growthRate: number;
    };
  };
  recommendations: Array<{
    category: "知识获取" | "规则验证" | "系统改进" | "流程优化";
    priority: "严重" | "高" | "中" | "低";
    title: string;
    description: string;
    implementation: {
      steps: string[];
      resources: string[];
      timeline: string;
      successMetrics: string[];
    };
    expectedOutcome: string;
    dependencies: string[];
  }>;
  continuousImprovement: {
    feedbackMechanisms: string[];
    monitoringStrategies: string[];
    updateProtocols: string[];
    qualityAssurance: string[];
    knowledgeMaintenance: string[];
  };
}

// 分析结果接口
export interface AnalysisResult {
  id: string;
  sql: string;
  databaseType: DatabaseType;
  analyzerType: AnalyzerType;
  result: PerformanceAnalysisResult | SecurityAuditResult | CodingStandardsCheckResult | IntelligentRuleLearnerResult;
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