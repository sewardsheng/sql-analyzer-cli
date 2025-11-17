/**
 * 数据库类型管理配置
 * 统一管理所有支持的数据库类型和标签
 */

/**
 * 支持的数据库类型常量
 */
export const SUPPORTED_DATABASES = {
  MYSQL: 'mysql',
  POSTGRESQL: 'postgresql',
  ORACLE: 'oracle',
  SQLSERVER: 'sqlserver',
  SQLITE: 'sqlite',
  CLICKHOUSE: 'clickhouse',
  GENERIC: 'generic'
};

/**
 * 数据库类型显示标签映射
 */
export const DATABASE_LABELS = {
  [SUPPORTED_DATABASES.MYSQL]: 'MySQL',
  [SUPPORTED_DATABASES.POSTGRESQL]: 'PostgreSQL',
  [SUPPORTED_DATABASES.ORACLE]: 'Oracle',
  [SUPPORTED_DATABASES.SQLSERVER]: 'SQL Server',
  [SUPPORTED_DATABASES.SQLITE]: 'SQLite',
  [SUPPORTED_DATABASES.CLICKHOUSE]: 'ClickHouse',
  [SUPPORTED_DATABASES.GENERIC]: '通用'
};

/**
 * 所有支持的数据库类型数组
 */
export const SUPPORTED_DATABASE_TYPES = Object.values(SUPPORTED_DATABASES);

/**
 * 检查数据库类型是否受支持
 * @param {string} dbType - 数据库类型
 * @returns {boolean} 是否支持
 */
export function isSupportedDatabase(dbType) {
  return SUPPORTED_DATABASE_TYPES.includes(dbType);
}

/**
 * 获取数据库类型的显示标签
 * @param {string} dbType - 数据库类型
 * @returns {string} 显示标签
 */
export function getDatabaseLabel(dbType) {
  return DATABASE_LABELS[dbType] || dbType || '未知';
}

/**
 * 获取所有数据库类型的选项列表（用于下拉选择等）
 * @returns {Array<{value: string, label: string}>} 选项列表
 */
export function getDatabaseOptions() {
  return SUPPORTED_DATABASE_TYPES.map(type => ({
    value: type,
    label: DATABASE_LABELS[type]
  }));
}

/**
 * 验证数据库类型，如果不支持则返回默认值
 * @param {string} dbType - 数据库类型
 * @param {string} defaultType - 默认数据库类型
 * @returns {string} 验证后的数据库类型
 */
export function validateDatabaseType(dbType, defaultType = SUPPORTED_DATABASES.GENERIC) {
  return isSupportedDatabase(dbType) ? dbType : defaultType;
}