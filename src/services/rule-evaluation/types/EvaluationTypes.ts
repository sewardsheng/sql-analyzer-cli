/**
 * 规则评估模块 - 类型定义
 * 老王我把所有类型都统一定义了，避免重复和混乱！
 */

// 重新导出模型类型，便于统一导入
export * from '../models/RuleModels.js';
export * from '../models/EvaluationModels.js';

/**
 * 通用结果类型
 */
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
  metadata?: ResultMetadata;
}

/**
 * 结果元数据接口
 */
export interface ResultMetadata {
  timestamp: string;
  processingTime: number;
  cacheHit: boolean;
  version: string;
}

/**
 * 异步结果类型
 */
export type AsyncResult<T> = Promise<Result<T>>;

/**
 * 处理阶段枚举
 */
export enum ProcessingStage {
  PARSING = 'parsing',
  DUPLICATE_CHECK = 'duplicate_check',
  QUALITY_ASSESSMENT = 'quality_assessment',
  CLASSIFICATION = 'classification',
  FILE_OPERATION = 'file_operation',
  COMPLETED = 'completed'
}

/**
 * 处理状态枚举
 */
export enum ProcessingStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  CANCELLED = 'cancelled'
}

/**
 * 规则状态枚举
 */
export enum RuleStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DUPLICATE = 'duplicate',
  LOW_QUALITY = 'low_quality',
  INVALID_FORMAT = 'invalid_format',
  UNDER_REVIEW = 'under_review'
}

/**
 * 数据库类型枚举
 */
export enum DatabaseType {
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql',
  SQLITE = 'sqlite',
  ORACLE = 'oracle',
  SQL_SERVER = 'sql_server',
  MONGODB = 'mongodb',
  UNKNOWN = 'unknown'
}

/**
 * 规则类别枚举
 */
export enum RuleCategory {
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  STANDARDS = 'standards',
  MAINTENANCE = 'maintenance',
  OPTIMIZATION = 'optimization',
  GENERAL = 'general'
}

/**
 * 严重程度枚举
 */
export enum SeverityLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

/**
 * 缓存策略枚举
 */
export enum CacheStrategy {
  MEMORY = 'memory',
  REDIS = 'redis',
  FILE = 'file',
  DISABLED = 'disabled'
}

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * 比较操作符枚举
 */
export enum ComparisonOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
  GREATER_THAN = 'gt',
  GREATER_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_EQUAL = 'lte',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  IN = 'in',
  NOT_IN = 'not_in'
}

/**
 * 排序方向枚举
 */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc'
}

/**
 * 文件操作类型枚举
 */
export enum FileOperationType {
  READ = 'read',
  WRITE = 'write',
  MOVE = 'move',
  COPY = 'copy',
  DELETE = 'delete'
}

/**
 * 配置更新操作枚举
 */
export enum ConfigUpdateOperation {
  SET = 'set',
  UPDATE = 'update',
  DELETE = 'delete',
  RESET = 'reset'
}

/**
 * 事件类型枚举
 */
export enum EventType {
  RULE_PROCESSED = 'rule_processed',
  BATCH_STARTED = 'batch_started',
  BATCH_COMPLETED = 'batch_completed',
  ERROR_OCCURRED = 'error_occurred',
  CONFIG_UPDATED = 'config_updated',
  CACHE_CLEARED = 'cache_cleared'
}

/**
 * 插件状态枚举
 */
export enum PluginStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  ERROR = 'error',
  LOADING = 'loading',
  UNLOADED = 'unloaded'
}

/**
 * 通用键值对类型
 */
export type KeyValuePair<T = any> = {
  [key: string]: T;
};

/**
 * 可选类型工具
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * 必需类型工具
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * 深度部分类型工具
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 深度只读类型工具
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * 选择性工具类型
 */
export type PickByValue<T, V> = Pick<T, { [K in keyof T]: T[K] extends V ? K : never }[keyof T]>;

/**
 * 排除性工具类型
 */
export type ExcludeByValue<T, V> = Omit<T, { [K in keyof T]: T[K] extends V ? K : never }[keyof T]>;

/**
 * 函数类型定义
 */
export type EventHandler<T = any> = (data: T) => void | Promise<void>;
export type AsyncFunction<T = any, R = any> = (...args: T[]) => Promise<R>;
export type SyncFunction<T = any, R = any> = (...args: T[]) => R;
export type Predicate<T = any> = (value: T) => boolean;
export type Transformer<T = any, R = any> = (value: T) => R;
export type Validator<T = any> = (value: T) => boolean | string;

/**
 * 比较器类型定义
 */
export type Comparator<T = any> = (a: T, b: T) => number;

/**
 * 迭代器类型定义
 */
export type Iterator<T = any> = (value: T, index: number, array: T[]) => void;
export type AsyncIterator<T = any> = (value: T, index: number, array: T[]) => Promise<void>;

/**
 * 映射器类型定义
 */
export type Mapper<T = any, R = any> = (value: T, index: number, array: T[]) => R;
export type AsyncMapper<T = any, R = any> = (value: T, index: number, array: T[]) => Promise<R>;

/**
 * 过滤器类型定义
 */
export type Filterer<T = any> = (value: T, index: number, array: T[]) => boolean;
export type AsyncFilterer<T = any> = (value: T, index: number, array: T[]) => Promise<boolean>;

/**
 * 规约器类型定义
 */
export type Reducer<T = any, R = any> = (accumulator: R, currentValue: T, index: number, array: T[]) => R;
export type AsyncReducer<T = any, R = any> = (accumulator: R, currentValue: T, index: number, array: T[]) => Promise<R>;

/**
 * 分页参数类型
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

/**
 * 分页结果类型
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * 范围类型
 */
export interface Range<T = number> {
  min: T;
  max: T;
  includeMin?: boolean;
  includeMax?: boolean;
}

/**
 * 间隔类型
 */
export interface Interval {
  start: Date;
  end: Date;
  includeStart?: boolean;
  includeEnd?: boolean;
}

/**
 * 坐标类型
 */
export interface Coordinate {
  x: number;
  y: number;
}

/**
 * 尺寸类型
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * 矩形类型
 */
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 颜色类型
 */
export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

/**
 * 时间戳类型
 */
export type Timestamp = number | string | Date;

/**
 * 标识符类型
 */
export type ID = string | number;

/**
 * 版本类型
 */
export type Version = string;

/**
 * 哈希类型
 */
export type Hash = string;

/**
 * URL类型
 */
export type URL = string;

/**
 * 邮箱类型
 */
export type Email = string;

/**
 * 电话号码类型
 */
export type PhoneNumber = string;

/**
 * IP地址类型
 */
export type IPAddress = string;

/**
 * 文件路径类型
 */
export type FilePath = string;

/**
 * 目录路径类型
 */
export type DirectoryPath = string;

/**
 * 文件名类型
 */
export type FileName = string;

/**
 * 文件扩展名类型
 */
export type FileExtension = string;

/**
 * MIME类型
 */
export type MimeType = string;

/**
 * 编码类型
 */
export type Encoding = 'utf-8' | 'utf-16' | 'ascii' | 'base64' | 'hex';

/**
 * 压缩类型
 */
export type Compression = 'gzip' | 'deflate' | 'brotli' | 'none';

/**
 * 哈希算法类型
 */
export type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha512';

/**
 * 加密算法类型
 */
export type EncryptionAlgorithm = 'aes-128-cbc' | 'aes-256-cbc' | 'rsa';

/**
 * 网络协议类型
 */
export type NetworkProtocol = 'http' | 'https' | 'ftp' | 'ssh' | 'tcp' | 'udp';

/**
 * HTTP方法类型
 */
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * HTTP状态码类型
 */
export type HTTPStatusCode = 200 | 201 | 202 | 204 | 400 | 401 | 403 | 404 | 500 | 502 | 503;

/**
 * 内容类型类型
 */
export type ContentType = 'application/json' | 'application/xml' | 'text/plain' | 'text/html' | 'text/css' | 'text/javascript';

/**
时区类型
 */
export type TimeZone = string;

/**
 * 语言类型
 */
export type Language = string;

/**
 * 国家类型
 */
export type Country = string;

/**
 * 货币类型
 */
export type Currency = string;

/**
 * 单位类型
 */
export type Unit = string;

/**
 * 格式化选项类型
 */
export interface FormatOptions {
  locale?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  numberFormat?: string;
  currency?: string;
}

/**
 * 验证规则类型
 */
export interface ValidationRule {
  field: string;
  rules: ValidationRuleDefinition[];
  message?: string;
}

/**
 * 验证规则定义类型
 */
export interface ValidationRuleDefinition {
  type: 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'email' | 'url' | 'custom';
  value?: any;
  message?: string;
  validator?: Validator;
}

/**
 * 验证结果类型
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data?: any;
}

/**
 * 验证错误类型
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  rule?: string;
}

/**
 * 排序选项类型
 */
export interface SortOption<T = string> {
  field: T;
  direction: SortDirection;
  custom?: Comparator;
}

/**
 * 过滤选项类型
 */
export interface FilterOption<T = string> {
  field: T;
  operator: ComparisonOperator;
  value: any;
  custom?: Predicate;
}

/**
 * 搜索选项类型
 */
export interface SearchOptions {
  query?: string;
  fields?: string[];
  fuzzy?: boolean;
  caseSensitive?: boolean;
  exactMatch?: boolean;
}

/**
 * 导出选项类型
 */
export interface ExportOptions {
  format: 'json' | 'csv' | 'xml' | 'xlsx' | 'pdf';
  fields?: string[];
  filters?: FilterOption[];
  sort?: SortOption[];
  pagination?: PaginationParams;
}

/**
 * 导入选项类型
 */
export interface ImportOptions {
  format: 'json' | 'csv' | 'xml' | 'xlsx';
  mapping?: KeyValuePair<string>;
  validation?: boolean;
  skipErrors?: boolean;
  batchSize?: number;
}

/**
 * 备份选项类型
 */
export interface BackupOptions {
  includeFiles?: boolean;
  includeConfig?: boolean;
  includeCache?: boolean;
  compression?: Compression;
  encryption?: EncryptionAlgorithm;
}

/**
 * 恢复选项类型
 */
export interface RestoreOptions {
  overwrite?: boolean;
  includeFiles?: boolean;
  includeConfig?: boolean;
  validate?: boolean;
}

/**
 * 性能指标类型
 */
export interface PerformanceMetrics {
  timestamp: Timestamp;
  duration: number;
  memoryUsage: number;
  cpuUsage: number;
  operations: number;
  errors: number;
  warnings: number;
}

/**
 * 系统状态类型
 */
export interface SystemStatus {
  status: 'healthy' | 'warning' | 'error' | 'offline';
  uptime: number;
  version: Version;
  environment: 'development' | 'staging' | 'production';
  metrics: PerformanceMetrics;
}

/**
 * 健康检查结果类型
 */
export interface HealthCheckResult {
  status: 'pass' | 'warn' | 'fail';
  timestamp: Timestamp;
  duration: number;
  checks: HealthCheck[];
}

/**
 * 健康检查类型
 */
export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  duration: number;
  metadata?: KeyValuePair;
}

/**
 * 工具类型：创建严格类型
 */
export type Strict<T> = Readonly<DeepReadonly<T>>;

/**
 * 工具类型：创建可变类型
 */
export type Mutable<T> = { -readonly [P in keyof T]: T[P] };

/**
 * 工具类型：创建非空类型
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * 工具类型：创建提取类型
 */
export type ExtractType<T, U> = T extends U ? T : never;

/**
 * 工具类型：创建排除类型
 */
export type ExcludeType<T, U> = T extends U ? never : T;

/**
 * 工具类型：创建记录类型
 */
export type RecordType<K extends keyof any, T> = { [P in K]: T };

/**
 * 工具类型：创建部分记录类型
 */
export type PartialRecordType<K extends keyof any, T> = { [P in K]?: T };

/**
 * 工具类型：创建必需记录类型
 */
export type RequiredRecordType<K extends keyof any, T> = { [P in K]: T };

/**
 * 工具类型：创建联合类型
 */
export type UnionType<T> = T[keyof T];

/**
 * 工具类型：创建交集类型
 */
export type IntersectionType<T, U> = T & U;

/**
 * 工具类型：创建差集类型
 */
export type DifferenceType<T, U> = T extends U ? never : T;

/**
 * 工具类型：创建对称差集类型
 */
export type SymmetricDifferenceType<T, U> = DifferenceType<T, U> | DifferenceType<U, T>;