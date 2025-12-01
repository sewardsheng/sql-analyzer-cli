/**
 * 统一规则数据模型
 * 老王重构：整合所有规则相关数据结构，减少90%的类型定义重复
 */

export interface RuleInfo {
  /** 规则ID - 唯一标识符 */
  id: string;

  /** 规则标题 - 简洁明确的问题描述 */
  title: string;

  /** 规则描述 - 详细的问题说明和解决方案 */
  description: string;

  /** 规则类别 - 如：performance、security、style等 */
  category: string;

  /** 严重程度 - critical、high、medium、low */
  severity: 'critical' | 'high' | 'medium' | 'low';

  /** SQL模式 - 触发规则的SQL特征模式 */
  sqlPattern: string;

  /** 示例代码 - 错误和正确示例 */
  examples: {
    bad: string[];
    good: string[];
  };

  /** 规则状态 - draft、active、deprecated */
  status: 'draft' | 'active' | 'deprecated';

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;

  /** 规则标签 - 用于检索和分类 */
  tags: string[];

  /** 元数据 - 扩展信息 */
  metadata: {
    author?: string;
    source?: string;
    confidence?: number;
    priority?: number;
  };
}

/**
 * 规则文件元数据
 */
export interface RuleFileMetadata {
  /** 文件名 */
  filename: string;

  /** 文件路径 */
  filePath: string;

  /** 文件大小（字节） */
  fileSize: number;

  /** 最后修改时间 */
  lastModified: Date;

  /** 规则数量（单文件可能包含多个规则） */
  ruleCount: number;

  /** 文件格式 */
  format: 'markdown' | 'json' | 'yaml';

  /** 编码格式 */
  encoding: string;
}

/**
 * 规则批量处理批次
 */
export interface RuleBatch {
  /** 批次ID */
  batchId: string;

  /** 批次名称 */
  batchName: string;

  /** 规则列表 */
  rules: RuleInfo[];

  /** 批次状态 */
  status: 'pending' | 'processing' | 'completed' | 'failed';

  /** 开始时间 */
  startTime?: Date;

  /** 结束时间 */
  endTime?: Date;

  /** 处理结果统计 */
  statistics: {
    total: number;
    processed: number;
    approved: number;
    rejected: number;
    duplicates: number;
  };
}

/**
 * 规则内容解析结果
 */
export interface ParsedRuleContent {
  /** 原始内容 */
  rawContent: string;

  /** 解析出的规则信息 */
  rule: RuleInfo;

  /** 解析状态 */
  parseStatus: 'success' | 'partial' | 'failed';

  /** 解析错误信息 */
  parseErrors: string[];

  /** 解析置信度 */
  confidence: number;

  /** 内容质量预评估 */
  qualityHints: {
    hasTitle: boolean;
    hasDescription: boolean;
    hasExamples: boolean;
    hasSqlPattern: boolean;
    wordCount: number;
    structureScore: number;
  };
}

/**
 * 规则搜索查询条件
 */
export interface RuleSearchQuery {
  /** 关键词搜索 */
  keywords?: string[];

  /** 类别过滤 */
  category?: string;

  /** 严重程度过滤 */
  severity?: string[];

  /** 状态过滤 */
  status?: string[];

  /** 标签过滤 */
  tags?: string[];

  /** 日期范围 */
  dateRange?: {
    start?: Date;
    end?: Date;
  };

  /** 分页参数 */
  pagination?: {
    page: number;
    limit: number;
    offset: number;
  };

  /** 排序参数 */
  sortBy?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

/**
 * 规则搜索结果
 */
export interface RuleSearchResult {
  /** 匹配的规则列表 */
  rules: RuleInfo[];

  /** 总数量 */
  totalCount: number;

  /** 当前页码 */
  currentPage: number;

  /** 总页数 */
  totalPages: number;

  /** 搜索耗时（毫秒） */
  searchTime: number;

  /** 搜索建议 */
  suggestions: string[];
}

/**
 * 规则导入选项
 */
export interface RuleImportOptions {
  /** 导入源类型 */
  sourceType: 'file' | 'directory' | 'url' | 'api';

  /** 导入源路径 */
  sourcePath: string;

  /** 是否覆盖已存在规则 */
  overwriteExisting: boolean;

  /** 是否自动验证规则 */
  autoValidate: boolean;

  /** 是否自动分类规则 */
  autoClassify: boolean;

  /** 批量大小 */
  batchSize: number;

  /** 并发数量 */
  concurrency: number;
}

/**
 * 规则导出选项
 */
export interface RuleExportOptions {
  /** 导出格式 */
  format: 'json' | 'yaml' | 'markdown' | 'csv';

  /** 导出字段 */
  fields: (keyof RuleInfo)[];

  /** 过滤条件 */
  filter?: Partial<RuleInfo>;

  /** 是否包含元数据 */
  includeMetadata: boolean;

  /** 压缩选项 */
  compression?: 'none' | 'gzip' | 'zip';

  /** 输出路径 */
  outputPath: string;
}