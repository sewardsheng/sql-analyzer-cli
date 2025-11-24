/**
 * SQL分析服务
 * 提供SQL分析功能的业务编排层
 */

import { createCoordinator } from '../../core/coordinator.js';
import { getConfigManager } from '../config/index.js';
import { getHistoryService } from '../history/historyService.js';

/**
 * SQL分析服务类
 */
class AnalysisService {
  constructor() {
    this.coordinator = null;
    this.historyService = getHistoryService();
    this.configManager = getConfigManager();
  }

  /**
   * 获取或创建协调器实例
   * @returns {Promise<Object>} 协调器实例
   */
  async getCoordinator() {
    if (!this.coordinator) {
      const config = await this.configManager.getConfig();
      this.coordinator = createCoordinator(config);
    }
    return this.coordinator;
  }

  /**
   * 执行核心分析
   * @param {string} sqlQuery - SQL查询
   * @param {Object} analysisOptions - 分析选项
   * @returns {Promise<Object>} 分析结果
   */
  async executeCoreAnalysis(sqlQuery, analysisOptions) {
    const coordinator = await this.getCoordinator();
    
    // 检查是否为快速模式
    if (analysisOptions.quick) {
      const result = await coordinator.quickAnalysis({
        sqlQuery,
        options: analysisOptions
      });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result;
    } else {
      const result = await coordinator.coordinateAnalysis({
        sqlQuery,
        options: analysisOptions
      });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result;
    }
  }

  /**
   * 保存分析历史
   * @param {string} sqlQuery - SQL查询
   * @param {Object} result - 分析结果
   * @param {string} inputType - 输入类型
   * @returns {Promise<string|null>} 历史记录ID
   */
  async saveAnalysisHistory(sqlQuery, result, inputType) {
    try {
      const historyId = await this.historyService.saveAnalysis({
        sql: sqlQuery,
        result: result,
        type: inputType
      });
      return historyId;
    } catch (historyError) {
      console.warn(`警告: 保存历史记录失败: ${historyError.message}`);
      return null;
    }
  }

  /**
   * 分析SQL语句（主要业务流程）
   * @param {Object} options - 分析选项
   * @param {string} [options.sql] - 要分析的SQL语句
   * @param {boolean} [options.learn] - 是否启用学习功能
   * @param {boolean} [options.performance] - 是否启用性能分析
   * @param {boolean} [options.security] - 是否启用安全审计
   * @param {boolean} [options.standards] - 是否启用编码规范检查
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeSql(options) {
    try {
      const { sql, ...analysisOptions } = options;
      
      if (!sql || typeof sql !== 'string') {
        throw new Error('必须提供有效的SQL语句');
      }
      
      const sqlQuery = sql.trim();
      if (!sqlQuery) {
        throw new Error('SQL语句不能为空');
      }
      
      // 执行核心分析
      const result = await this.executeCoreAnalysis(sqlQuery, analysisOptions);
      
      return result;
    } catch (error) {
      console.error(`分析失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 批量分析SQL语句
   * @param {Array<string>} sqlQueries - SQL查询数组
   * @param {Object} options - 分析选项
   * @returns {Promise<Array>} 分析结果数组
   */
  async analyzeBatch(sqlQueries, options = {}) {
    const results = [];
    
    for (let i = 0; i < sqlQueries.length; i++) {
      const sqlQuery = sqlQueries[i];
      
      try {
        const result = await this.analyzeSql({ sql: sqlQuery, ...options });
        results.push({ index: i, success: true, result });
      } catch (error) {
        results.push({ index: i, success: false, error: error.message });
      }
    }
    
    return results;
  }
}

// 创建服务实例
const analysisService = new AnalysisService();

// ============================================================================
// 导出服务实例
// ============================================================================

/**
 * 获取分析服务实例
 * @returns {AnalysisService} 分析服务实例
 */
export function getAnalysisService() {
  return analysisService;
}

// 导出服务类和实例
export { AnalysisService, analysisService };

// 默认导出服务实例
export default analysisService;