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