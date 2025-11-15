import AnalyzeService from './analyzeService.js';

/**
 * 分析SQL语句的简化函数接口
 * @param {Object} options - 分析选项
 * @returns {Promise<Object>} 分析结果
 */
async function analyzeSql(options) {
  const analyzeService = new AnalyzeService();
  return await analyzeService.analyzeSql(options);
}

export {
  analyzeSql,
  AnalyzeService
};