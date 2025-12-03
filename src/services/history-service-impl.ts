import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  AnalysisType,
  DatabaseType,
  normalizeAnalysisType,
  getAnalysisTypeLabel,
  getDatabaseTypeLabel,
  isValidAnalysisType,
  isValidDatabaseType,
  matchAnalysisTypeByKeyword
} from '../types/analysis.js';

// 定义接口
interface HistoryRecord {
  id: string;
  timestamp: string;
  databaseType: string;
  type: string;
  sql: string;
  sqlPreview?: string;
  result: any;
  metadata?: any;
}

interface GetAllHistoryOptions {
  limit?: number;
  offset?: number;
}

interface SearchOptions {
  sql?: string;
  databaseType?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

interface StatisticsData {
  total: number;
  byType: Record<string, number>;
  byDatabase: Record<string, number>;
  byMonth: Record<string, number>;
}

/**
* 历史服务实现类
* 使用 history/ 目录按年月组织文件
*/
export class HistoryService {
  private initialized: boolean;
  private historyDir: string;

  constructor() {
    this.initialized = false;
    this.historyDir = path.join(process.cwd(), 'history');
  }

/**
* 初始化历史服务
*/
async initialize(): Promise<void> {
if (this.initialized) return;

try {
// 确保历史目录存在
await fs.mkdir(this.historyDir, { recursive: true });
this.initialized = true;
} catch (error) {
console.error('初始化历史服务失败:', error);
throw error;
}
}

/**
* 获取所有历史记录
*/
async getAllHistory(options: GetAllHistoryOptions = {}): Promise<HistoryRecord[]> {
await this.initialize();
const { limit = 100, offset = 0 } = options;

try {
const allRecords = await this.loadAllHistoryRecords();

// 按时间戳倒序排列
allRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

// 应用分页
return allRecords.slice(offset, offset + limit);
} catch (error) {
console.error('获取历史记录失败:', error);
return [];
}
}

/**
* 根据ID获取历史记录
*/
async getHistoryById(id: string): Promise<HistoryRecord | null> {
await this.initialize();

try {
const allRecords = await this.loadAllHistoryRecords();
return allRecords.find(record => record.id === id) || null;
} catch (error) {
console.error('获取历史记录失败:', error);
return null;
}
}

/**
* 保存分析结果
*/
async saveAnalysis(analysisResult: any): Promise<string> {
await this.initialize();

try {
const now = new Date();
const yearMonth = now.toISOString().slice(0, 7); // YYYY-MM
const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5); // YYYY-MM-DDTHH-MM-SS
const uniqueId = uuidv4().slice(0, 8);
const filename = `${timestamp}_${uniqueId}.json`;

const yearMonthDir = path.join(this.historyDir, yearMonth);
await fs.mkdir(yearMonthDir, { recursive: true });

// 标准化处理类型
const analysisType = this.normalizeAndValidateType(analysisResult.type);
const databaseType = this.normalizeAndValidateDatabaseType(analysisResult.databaseType);

const historyRecord = {
id: `${timestamp}_${uniqueId}`,
timestamp: now.toISOString(),
sql: analysisResult.sql,
sqlPreview: analysisResult.sqlPreview || analysisResult.sql,
databaseType: databaseType,
type: analysisType,
result: analysisResult.result,
metadata: {
version: '2.0', // 标记为新版本，支持标准化类型
source: 'sql-analyzer-cli',
originalType: analysisResult.type, // 保留原始类型用于兼容
originalDatabaseType: analysisResult.databaseType,
...analysisResult.metadata
}
};

const filePath = path.join(yearMonthDir, filename);
await fs.writeFile(filePath, JSON.stringify(historyRecord, null, 2), 'utf8');

return historyRecord.id;
} catch (error) {
console.error('保存分析结果失败:', error);
throw error;
}
}

/**
* 删除历史记录
*/
async deleteHistory(id) {
await this.initialize();

try {
const allRecords = await this.loadAllHistoryRecords();
const recordToDelete = allRecords.find(record => record.id === id);

if (!recordToDelete) {
return false;
}

// 从文件名推断文件路径
const yearMonth = recordToDelete.timestamp.slice(0, 7);
const filename = `${id}.json`;
const filePath = path.join(this.historyDir, yearMonth, filename);

try {
await fs.unlink(filePath);
return true;
} catch (error) {
console.error('删除历史记录文件失败:', error);
return false;
}
} catch (error) {
console.error('删除历史记录失败:', error);
return false;
}
}

/**
* 清空所有历史记录
*/
async clearHistory() {
await this.initialize();

try {
const yearMonthDirs = await fs.readdir(this.historyDir);

for (const dir of yearMonthDirs) {
const dirPath = path.join(this.historyDir, dir);
const stat = await fs.stat(dirPath);

if (stat.isDirectory()) {
await fs.rm(dirPath, { recursive: true, force: true });
}
}

return true;
} catch (error) {
console.error('清空历史记录失败:', error);
return false;
}
}

/**
* 获取历史记录统计信息
*/
async getHistoryStats() {
await this.initialize();

try {
const allRecords = await this.loadAllHistoryRecords();


if (allRecords.length === 0) {
return {
total: 0,
databaseTypes: {},
types: {},
dateRange: null,
averageDuration: 0
};
}

const databaseTypes = {};
const types = {};
let totalDuration = 0;
let durationCount = 0;

const timestamps = allRecords.map(record => new Date(record.timestamp).getTime());
const minDate = new Date(Math.min(...timestamps));
const maxDate = new Date(Math.max(...timestamps));

allRecords.forEach(record => {
// 统计数据库类型
const dbType = record.databaseType || 'unknown';
databaseTypes[dbType] = (databaseTypes[dbType] || 0) + 1;

// 统计分析类型
const type = record.type || 'unknown';
types[type] = (types[type] || 0) + 1;

// 统计持续时间
if (record.result?.metadata?.duration) {
totalDuration += record.result.metadata.duration;
durationCount++;
}
});

return {
total: allRecords.length,
databaseTypes,
types,
dateRange: {
start: minDate.toISOString(),
end: maxDate.toISOString()
},
averageDuration: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0
};
} catch (error) {
console.error('获取历史统计失败:', error);
return {
total: 0,
databaseTypes: {},
types: {},
dateRange: null,
averageDuration: 0
};
}
}

/**
* 搜索历史记录（支持SQL内容和类型过滤）
*/
async searchHistory(query: string, options: SearchOptions = {}) {
await this.initialize();
const { limit = 50, offset = 0, databaseType, type } = options;

try {
const allRecords = await this.loadAllHistoryRecords();
const lowerQuery = query.toLowerCase();

const filteredRecords = allRecords.filter(record => {
  // SQL内容搜索
  let matchesQuery = true;
  if (query.trim()) {
    matchesQuery = record.sql.toLowerCase().includes(lowerQuery) ||
                  record.sqlPreview?.toLowerCase().includes(lowerQuery);
  }

  // 数据库类型过滤
  let matchesDatabaseType = true;
  if (databaseType && databaseType.trim()) {
    const dbTypes = this.expandDatabaseTypeKeywords(databaseType.toLowerCase().trim());
    matchesDatabaseType = dbTypes.includes(record.databaseType?.toLowerCase() || '');
  }

  // 分析类型过滤
  let matchesAnalysisType = true;
  if (type && type.trim()) {
    const analysisTypes = this.expandAnalysisTypeKeywords(type.toLowerCase().trim());
    matchesAnalysisType = analysisTypes.includes(record.type?.toLowerCase() || '');
  }

  return matchesQuery && matchesDatabaseType && matchesAnalysisType;
});

// 按时间戳倒序排列
filteredRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

// 应用分页
return filteredRecords.slice(offset, offset + limit);
} catch (error) {
console.error('搜索历史记录失败:', error);
return [];
}
}

/**
* 扩展数据库类型关键词（支持同义词搜索）
*/
private expandDatabaseTypeKeywords(keyword: string): string[] {
const dbTypeMap: Record<string, string[]> = {
  'mysql': ['mysql', 'mariadb', 'maria'],
  'postgresql': ['postgresql', 'postgres', 'pgsql'],
  'postgres': ['postgresql', 'postgres', 'pgsql'],
  'pgsql': ['postgresql', 'postgres', 'pgsql'],
  'sqlserver': ['sqlserver', 'sql_server', 'mssql', 'ms sql'],
  'sql_server': ['sqlserver', 'sql_server', 'mssql', 'ms sql'],
  'mssql': ['sqlserver', 'sql_server', 'mssql', 'ms sql'],
  'sqlite': ['sqlite', 'sqlite3'],
  'sqlite3': ['sqlite', 'sqlite3'],
  'oracle': ['oracle', 'oracledb'],
  'mongodb': ['mongodb', 'mongo'],
  'mongo': ['mongodb', 'mongo'],
  'unknown': ['unknown', '']
};

return dbTypeMap[keyword] || [keyword];
}

/**
* 扩展分析类型关键词（支持同义词搜索）
*/
private expandAnalysisTypeKeywords(keyword: string): string[] {
const typeMap: Record<string, string[]> = {
  'sql': ['sql', 'sql_statement', 'analysis'],
  'sql_statement': ['sql', 'sql_statement', 'analysis'],
  'sql语句': ['sql', 'sql_statement', 'analysis'],
  'file': ['file', 'file_analysis'],
  'file_analysis': ['file', 'file_analysis'],
  '文件分析': ['file', 'file_analysis'],
  'directory': ['directory', 'directory_analysis'],
  'directory_analysis': ['directory', 'directory_analysis'],
  '目录分析': ['directory', 'directory_analysis'],
  'batch': ['batch', 'batch_analysis'],
  'batch_analysis': ['batch', 'batch_analysis'],
  '批量分析': ['batch', 'batch_analysis']
};

return typeMap[keyword] || matchAnalysisTypeByKeyword(keyword);
}

/**
* 导出历史记录
*/
async exportHistory(format = 'json') {
await this.initialize();

try {
const allRecords = await this.loadAllHistoryRecords();

if (format === 'json') {
return {
exportedAt: new Date().toISOString(),
totalRecords: allRecords.length,
records: allRecords
};
} else if (format === 'csv') {
// 简化的CSV导出
const headers = ['id', 'timestamp', 'sql', 'databaseType', 'type'];
const csvRows = [headers.join(',')];

allRecords.forEach(record => {
const row = [
record.id,
record.timestamp,
`"${record.sql.replace(/"/g, '""')}"`, // 转义CSV中的引号
record.databaseType || '',
record.type || ''
];
csvRows.push(row.join(','));
});

return csvRows.join('\n');
}

throw new Error(`不支持的导出格式: ${format}`);
} catch (error) {
console.error('导出历史记录失败:', error);
throw error;
}
}

/**
* 标准化和验证分析类型
*/
private normalizeAndValidateType(type?: string): AnalysisType {
if (!type) {
return AnalysisType.SQL_STATEMENT; // 默认值
}

// 如果已经是标准类型，直接返回
if (isValidAnalysisType(type)) {
return normalizeAnalysisType(type);
}

// 尝试映射旧类型
const normalized = normalizeAnalysisType(type);
if (isValidAnalysisType(normalized)) {
return normalized;
}

// 无法识别的类型，返回默认值
console.warn(`未知的分析类型: ${type}，使用默认值: ${AnalysisType.SQL_STATEMENT}`);
return AnalysisType.SQL_STATEMENT;
}

/**
* 标准化和验证数据库类型
*/
private normalizeAndValidateDatabaseType(dbType?: string): DatabaseType {
if (!dbType) {
return DatabaseType.UNKNOWN; // 默认值
}

const lowerType = dbType.toLowerCase();

// 如果已经是标准类型，直接返回
if (isValidDatabaseType(lowerType)) {
return lowerType as DatabaseType;
}

// 尝试匹配常见变体
switch (lowerType) {
case 'mysql':
case 'mariadb':
case 'maria':
return DatabaseType.MYSQL;
case 'postgresql':
case 'postgres':
case 'pgsql':
case 'postgres_db':
return DatabaseType.POSTGRESQL;
case 'sqlserver':
case 'sql_server':
case 'mssql':
case 'ms sql':
return DatabaseType.SQLSERVER;
case 'sqlite':
case 'sqlite3':
case 'sqlite_db':
return DatabaseType.SQLITE;
case 'oracle':
case 'oracle_db':
case 'oracledb':
return DatabaseType.ORACLE;
case 'mongodb':
case 'mongo':
case 'mongo_db':
return DatabaseType.MONGODB;
default:
console.warn(`未知的数据库类型: ${dbType}，标记为未知`);
return DatabaseType.UNKNOWN;
}
}

/**
* 加载所有历史记录
*/
async loadAllHistoryRecords(): Promise<HistoryRecord[]> {
await this.initialize();

try {
const yearMonthDirs = await fs.readdir(this.historyDir);
const allRecords = [];

for (const dir of yearMonthDirs) {
const dirPath = path.join(this.historyDir, dir);
const stat = await fs.stat(dirPath);

if (stat.isDirectory()) {
try {
const files = await fs.readdir(dirPath);

for (const file of files) {
if (file.endsWith('.json')) {
try {
const filePath = path.join(dirPath, file);
const content = await fs.readFile(filePath, 'utf8');
const record = JSON.parse(content);
allRecords.push(record);
} catch (error) {
console.warn(`读取历史记录文件失败 ${file}:`, error.message);
}
}
}
} catch (error) {
console.warn(`读取历史目录失败 ${dir}:`, error.message);
}
}
}

return allRecords;
} catch (error) {
console.error('加载历史记录失败:', error);
return [];
}
}
}

/**
* 获取历史服务实例
*/
export function getHistoryService() {
return new HistoryService();
}