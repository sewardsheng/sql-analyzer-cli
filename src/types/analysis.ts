/**
 * 分析相关类型定义
 * 统一管理系统中的所有分析类型和数据库类型
 */

/**
 * 分析输入类型枚举
 */
export enum AnalysisType {
  SQL_STATEMENT = 'sql_statement',      // 直接输入SQL语句
  FILE_ANALYSIS = 'file_analysis',      // 单个文件分析
  DIRECTORY_ANALYSIS = 'directory_analysis', // 目录分析
  BATCH_ANALYSIS = 'batch_analysis'     // 批量分析
}

/**
 * 数据库类型枚举
 */
export enum DatabaseType {
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql',
  SQLSERVER = 'sqlserver',
  SQLITE = 'sqlite',
  ORACLE = 'oracle',
  MONGODB = 'mongodb',
  UNKNOWN = 'unknown'
}

/**
 * 分析结果状态枚举
 */
export enum AnalysisStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PARTIAL = 'partial'
}

/**
 * 类型标签映射 - 用于界面显示
 */
export const ANALYSIS_TYPE_LABELS: Record<string, string> = {
  [AnalysisType.SQL_STATEMENT]: 'SQL语句',
  [AnalysisType.FILE_ANALYSIS]: '文件分析',
  [AnalysisType.DIRECTORY_ANALYSIS]: '目录分析',
  [AnalysisType.BATCH_ANALYSIS]: '批量分析',
  'sql': 'SQL语句',        // 兼容旧数据
  'file': '文件分析',      // 兼容旧数据
  'directory': '目录分析', // 兼容旧数据
  'analysis': '分析'       // 兼容旧数据
};

/**
 * 数据库类型标签映射
 */
export const DATABASE_TYPE_LABELS: Record<string, string> = {
  [DatabaseType.MYSQL]: 'MySQL',
  [DatabaseType.POSTGRESQL]: 'PostgreSQL',
  [DatabaseType.SQLSERVER]: 'SQL Server',
  [DatabaseType.SQLITE]: 'SQLite',
  [DatabaseType.ORACLE]: 'Oracle',
  [DatabaseType.MONGODB]: 'MongoDB',
  [DatabaseType.UNKNOWN]: '未知'
};

/**
 * 兼容旧数据的类型映射
 */
export const LEGACY_TYPE_MAPPING: Record<string, AnalysisType> = {
  'sql': AnalysisType.SQL_STATEMENT,
  'file': AnalysisType.FILE_ANALYSIS,
  'directory': AnalysisType.DIRECTORY_ANALYSIS,
  'analysis': AnalysisType.SQL_STATEMENT // 默认映射到SQL语句
};

/**
 * 搜索关键词到类型的映射
 */
export const SEARCH_KEYWORD_MAPPING: Record<string, string[]> = {
  'SQL语句': [AnalysisType.SQL_STATEMENT, 'sql'],
  '文件分析': [AnalysisType.FILE_ANALYSIS, 'file'],
  '目录分析': [AnalysisType.DIRECTORY_ANALYSIS, 'directory'],
  '批量分析': [AnalysisType.BATCH_ANALYSIS, 'batch'],
  'sql': [AnalysisType.SQL_STATEMENT, 'sql'],
  'file': [AnalysisType.FILE_ANALYSIS, 'file'],
  'directory': [AnalysisType.DIRECTORY_ANALYSIS, 'directory']
};

/**
 * 获取分析类型的显示标签
 */
export function getAnalysisTypeLabel(type: string): string {
  return ANALYSIS_TYPE_LABELS[type] || type;
}

/**
 * 获取数据库类型的显示标签
 */
export function getDatabaseTypeLabel(type: string): string {
  return DATABASE_TYPE_LABELS[type] || type;
}

/**
 * 标准化分析类型（兼容旧数据）
 */
export function normalizeAnalysisType(type: string): AnalysisType {
  return LEGACY_TYPE_MAPPING[type] || type as AnalysisType;
}

/**
 * 根据搜索关键词匹配分析类型
 */
export function matchAnalysisTypeByKeyword(keyword: string): string[] {
  const normalizedKeyword = keyword.toLowerCase().trim();

  // 直接匹配
  if (SEARCH_KEYWORD_MAPPING[normalizedKeyword]) {
    return SEARCH_KEYWORD_MAPPING[normalizedKeyword];
  }

  // 模糊匹配
  const matches: string[] = [];
  Object.keys(SEARCH_KEYWORD_MAPPING).forEach(key => {
    if (key.includes(normalizedKeyword) || normalizedKeyword.includes(key.toLowerCase())) {
      matches.push(...SEARCH_KEYWORD_MAPPING[key]);
    }
  });

  return [...new Set(matches)]; // 去重
}

/**
 * 验证分析类型是否有效
 */
export function isValidAnalysisType(type: string): boolean {
  return Object.values(AnalysisType).includes(type as AnalysisType) ||
         Object.keys(LEGACY_TYPE_MAPPING).includes(type);
}

/**
 * 验证数据库类型是否有效
 */
export function isValidDatabaseType(type: string): boolean {
  return Object.values(DatabaseType).includes(type as DatabaseType);
}