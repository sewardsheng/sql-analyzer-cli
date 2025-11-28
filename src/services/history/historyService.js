/**
* 历史记录业务服务
* 提供纯粹的历史记录业务逻辑，不包含UI展示
*/

import BaseHistoryService from './BaseHistoryService.js';

/**
* 历史记录业务服务类
*/
class HistoryBusinessService {
constructor() {
this.historyService = new BaseHistoryService();
}

/**
* 获取所有历史记录
* @returns {Promise<Array>} 历史记录列表
*/
async getAllHistory() {
return await this.historyService.getAllHistory();
}

/**
* 根据ID获取历史记录
* @param {string} id - 历史记录ID
* @returns {Promise<Object|null>} 历史记录对象
*/
async getHistoryById(id) {
return await this.historyService.getHistoryById(id);
}

/**
* 删除历史记录
* @param {string} id - 历史记录ID
* @returns {Promise<boolean>} 是否删除成功
*/
async deleteHistory(id) {
return await this.historyService.deleteHistory(id);
}

/**
* 清空所有历史记录
* @returns {Promise<boolean>} 是否清空成功
*/
async clearAllHistory() {
return await this.historyService.clearAllHistory();
}

/**
* 获取历史记录统计信息
* @returns {Promise<Object>} 统计信息
*/
async getHistoryStats() {
return await this.historyService.getHistoryStats();
}

/**
* 保存分析结果到历史记录
* @param {Object} data - 分析数据
* @returns {Promise<string>} 历史记录ID
*/
async saveAnalysis(data) {
return await this.historyService.saveAnalysis(data);
}

/**
* 搜索历史记录
* @param {Object} criteria - 搜索条件
* @returns {Promise<Array>} 匹配的历史记录
*/
async searchHistory(criteria) {
const allHistory = await this.getAllHistory();

return allHistory.filter(record => {
// 按SQL内容搜索
if (criteria.sql && !record.sql.toLowerCase().includes(criteria.sql.toLowerCase())) {
return false;
}

// 按数据库类型搜索
if (criteria.databaseType && record.databaseType !== criteria.databaseType) {
return false;
}

// 按分析类型搜索
if (criteria.type && record.type !== criteria.type) {
return false;
}

// 按日期范围搜索
if (criteria.dateFrom) {
const recordDate = new Date(record.timestamp);
const fromDate = new Date(criteria.dateFrom);
if (recordDate < fromDate) return false;
}

if (criteria.dateTo) {
const recordDate = new Date(record.timestamp);
const toDate = new Date(criteria.dateTo);
if (recordDate > toDate) return false;
}

return true;
});
}

/**
* 获取分页历史记录
* @param {number} page - 页码
* @param {number} limit - 每页数量
* @param {Object} filters - 过滤条件
* @returns {Promise<Object>} 分页结果
*/
async getPaginatedHistory(page = 1, limit = 10, filters = {}) {
const allHistory = filters ? await this.searchHistory(filters) : await this.getAllHistory();
const total = allHistory.length;
const startIndex = (page - 1) * limit;
const endIndex = startIndex + limit;
const items = allHistory.slice(startIndex, endIndex);

return {
items,
pagination: {
page,
limit,
total,
totalPages: Math.ceil(total / limit),
hasNext: endIndex < total,
hasPrev: page > 1
}
};
}

/**
* 批量删除历史记录
* @param {Array<string>} ids - 历史记录ID数组
* @returns {Promise<Object>} 删除结果
*/
async batchDeleteHistory(ids) {
const results = {
total: ids.length,
succeeded: 0,
failed: 0,
errors: []
};

for (const id of ids) {
try {
const success = await this.deleteHistory(id);
if (success) {
results.succeeded++;
} else {
results.failed++;
results.errors.push({ id, error: '记录不存在' });
}
} catch (error) {
results.failed++;
results.errors.push({ id, error: error.message });
}
}

return results;
}

/**
* 导出历史记录
* @param {Object} options - 导出选项
* @returns {Promise<Object>} 导出数据
*/
async exportHistory(options = {}) {
const { format = 'json', filters = {} } = options;
const history = filters ? await this.searchHistory(filters) : await this.getAllHistory();

if (format === 'json') {
return {
exportTime: new Date().toISOString(),
total: history.length,
records: history
};
} else if (format === 'csv') {
// 简单的CSV格式
const headers = ['ID', '时间', '数据库类型', '分析类型', 'SQL预览'];
const rows = history.map(record => [
record.id,
new Date(record.timestamp).toISOString(),
record.databaseType,
record.type,
record.sqlPreview
]);

return {
exportTime: new Date().toISOString(),
total: history.length,
headers,
rows
};
}

throw new Error(`不支持的导出格式: ${format}`);
}

/**
* 获取统计信息（为规则学习系统提供）
* @returns {Promise<Object>} 统计信息
*/
async getStatistics() {
return await this.getHistoryStats();
}

/**
* 获取学习历史（为规则学习系统提供）
* @param {Object} filters - 过滤条件
* @param {Object} options - 查询选项
* @returns {Promise<Object>} 学习历史
*/
async getLearningHistory(filters = {}, options = {}) {
const { page = 1, limit = 20, sortBy = 'timestamp', sortOrder = 'desc' } = options;

// 获取所有历史记录
let allHistory = await this.getAllHistory();

// 应用过滤条件
if (filters.category) {
allHistory = allHistory.filter(record =>
record.result?.data?.[filters.category] ||
record.result?.issues?.some(issue => issue.category === filters.category)
);
}

if (filters.status) {
allHistory = allHistory.filter(record =>
record.metadata?.learningStatus === filters.status
);
}

if (filters.startDate) {
const startDate = new Date(filters.startDate);
allHistory = allHistory.filter(record =>
new Date(record.timestamp) >= startDate
);
}

if (filters.endDate) {
const endDate = new Date(filters.endDate);
allHistory = allHistory.filter(record =>
new Date(record.timestamp) <= endDate
);
}

// 排序
allHistory.sort((a, b) => {
const aValue = a[sortBy];
const bValue = b[sortBy];
const order = sortOrder === 'desc' ? -1 : 1;

if (aValue < bValue) return -1 * order;
if (aValue > bValue) return 1 * order;
return 0;
});

// 分页
const total = allHistory.length;
const startIndex = (page - 1) * limit;
const endIndex = startIndex + limit;
const items = allHistory.slice(startIndex, endIndex);

return {
items,
pagination: {
page,
limit,
total,
totalPages: Math.ceil(total / limit),
hasNext: endIndex < total,
hasPrev: page > 1
}
};
}

/**
* 获取生成的规则（为规则学习系统提供）
* @param {Object} filters - 过滤条件
* @param {Object} options - 查询选项
* @returns {Promise<Object>} 生成的规则
*/
async getGeneratedRules(filters = {}, options = {}) {
// 这里应该从规则存储中获取，暂时返回模拟数据
const { page = 1, limit = 20 } = options;

const mockRules = [
{
id: 'rule-1',
title: '避免使用SELECT *进行主键查询',
category: 'performance',
severity: 'medium',
status: 'approved',
quality: 85,
timestamp: new Date().toISOString()
},
{
id: 'rule-2',
title: '主键查询必须使用参数化查询',
category: 'security',
severity: 'high',
status: 'pending',
quality: 75,
timestamp: new Date().toISOString()
}
];

// 应用过滤条件
let filteredRules = mockRules;

if (filters.category) {
filteredRules = filteredRules.filter(rule => rule.category === filters.category);
}

if (filters.status) {
filteredRules = filteredRules.filter(rule => rule.status === filters.status);
}

if (filters.minQuality) {
filteredRules = filteredRules.filter(rule => rule.quality >= filters.minQuality);
}

if (filters.maxQuality) {
filteredRules = filteredRules.filter(rule => rule.quality <= filters.maxQuality);
}

// 分页
const total = filteredRules.length;
const startIndex = (page - 1) * limit;
const endIndex = startIndex + limit;
const items = filteredRules.slice(startIndex, endIndex);

return {
items,
pagination: {
page,
limit,
total,
totalPages: Math.ceil(total / limit),
hasNext: endIndex < total,
hasPrev: page > 1
}
};
}

/**
* 根据ID获取规则（为规则学习系统提供）
* @param {string} ruleId - 规则ID
* @returns {Promise<Object|null>} 规则对象
*/
async getRuleById(ruleId) {
const rules = await this.getGeneratedRules();
return rules.items.find(rule => rule.id === ruleId) || null;
}

/**
* 审批规则（为规则学习系统提供）
* @param {string} ruleId - 规则ID
* @param {boolean} approved - 是否审批通过
* @param {string} reason - 审批原因
* @returns {Promise<Object|null>} 更新后的规则
*/
async approveRule(ruleId, approved, reason) {
// 这里应该更新规则存储，暂时返回模拟数据
const rule = await this.getRuleById(ruleId);
if (rule) {
rule.status = approved ? 'approved' : 'rejected';
rule.approvalReason = reason;
rule.approvedAt = new Date().toISOString();
return rule;
}
return null;
}

/**
* 删除规则（为规则学习系统提供）
* @param {string} ruleId - 规则ID
* @returns {Promise<boolean>} 是否删除成功
*/
async deleteRule(ruleId) {
// 这里应该从规则存储中删除，暂时返回模拟结果
const rule = await this.getRuleById(ruleId);
return rule !== null;
}

/**
* 获取学习统计信息（为规则学习系统提供）
* @param {string} period - 统计周期
* @returns {Promise<Object>} 学习统计信息
*/
async getLearningStatistics(period = '30d') {
const stats = await this.getStatistics();
const rules = await this.getGeneratedRules();

return {
period,
history: {
total: stats.total,
byType: stats.byType,
byDatabase: stats.byDatabase,
byMonth: stats.byMonth
},
rules: {
total: rules.pagination.total,
approved: rules.items.filter(r => r.status === 'approved').length,
pending: rules.items.filter(r => r.status === 'pending').length,
rejected: rules.items.filter(r => r.status === 'rejected').length,
byCategory: {
performance: rules.items.filter(r => r.category === 'performance').length,
security: rules.items.filter(r => r.category === 'security').length,
standards: rules.items.filter(r => r.category === 'standards').length
}
},
learning: {
enabled: true,
lastLearning: new Date().toISOString(),
averageQuality: rules.items.reduce((sum, r) => sum + (r.quality || 0), 0) / rules.items.length || 0
}
};
}

/**
* 清理学习数据（为规则学习系统提供）
* @param {Object} options - 清理选项
* @returns {Promise<Object>} 清理结果
*/
async cleanupLearningData(options = {}) {
const { olderThan, status, keepApproved = true } = options;

// 这里应该执行实际的清理操作，暂时返回模拟结果
return {
deletedRecords: 0,
deletedRules: 0,
freedSpace: '0MB',
cleanupTime: new Date().toISOString()
};
}
}

// 创建服务实例
const historyBusinessService = new HistoryBusinessService();

// ============================================================================
// 导出服务实例
// ============================================================================

/**
* 获取历史记录业务服务实例
* @returns {HistoryBusinessService} 历史记录业务服务实例
*/
export function getHistoryService() {
return historyBusinessService;
}

// 导出服务类和实例
export { HistoryBusinessService, historyBusinessService };

// 默认导出服务实例
export default historyBusinessService;