import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

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

const historyRecord = {
id: `${timestamp}_${uniqueId}`,
timestamp: now.toISOString(),
sql: analysisResult.sql,
sqlPreview: analysisResult.sqlPreview || analysisResult.sql,
databaseType: analysisResult.databaseType || 'unknown',
type: analysisResult.type || 'analysis',
result: analysisResult.result,
metadata: {
version: '1.0',
source: 'sql-analyzer-cli',
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
* 搜索历史记录
*/
async searchHistory(query: string, options: SearchOptions = {}) {
await this.initialize();
const { limit = 50, offset = 0 } = options;

try {
const allRecords = await this.loadAllHistoryRecords();
const lowerQuery = query.toLowerCase();

const filteredRecords = allRecords.filter(record => {
return record.sql.toLowerCase().includes(lowerQuery) ||
record.sqlPreview?.toLowerCase().includes(lowerQuery) ||
record.databaseType?.toLowerCase().includes(lowerQuery) ||
record.type?.toLowerCase().includes(lowerQuery);
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