/**
 * API响应格式化工具
 * 统一API和CLI的响应格式，确保一致性
 */

/**
 * 统一响应格式
 * @param {boolean} success - 操作是否成功
 * @param {*} data - 响应数据
 * @param {string} message - 响应消息
 * @param {*} error - 错误信息
 * @returns {Object} 格式化的响应对象
 */
export function formatResponse(success, data = null, message = '', error = null) {
  const response = {
    success,
    timestamp: new Date().toISOString()
  };
  
  if (success) {
    if (data !== null) response.data = data;
    if (message) response.message = message;
  } else {
    if (error) response.error = error;
    if (message) response.message = message;
  }
  
  return response;
}

/**
 * 格式化成功响应
 * @param {*} data - 响应数据
 * @param {string} message - 响应消息
 * @returns {Object} 格式化的成功响应
 */
export function formatSuccessResponse(data = null, message = '') {
  return formatResponse(true, data, message);
}

/**
 * 格式化错误响应
 * @param {string} message - 错误消息
 * @param {*} error - 错误详情
 * @returns {Object} 格式化的错误响应
 */
export function formatErrorResponse(message, error = null) {
  return formatResponse(false, null, message, error);
}

/**
 * 格化分析结果响应
 * @param {Object} result - 分析结果
 * @returns {Object} 格式化的分析结果响应
 */
export function formatAnalysisResult(result) {
  if (!result || !result.success) {
    return formatErrorResponse(
      result?.error || '分析失败',
      result
    );
  }
  
  // 提取关键信息用于API响应
  const { data } = result;
  const { report, analysisResults } = data;
  
  // 构建简化的响应数据
  const responseData = {
    sql: data.originalQuery,
    databaseType: data.databaseType,
    overallScore: report?.overallAssessment?.score || 0,
    securityVeto: report?.securityVeto || false,
    riskLevel: calculateRiskLevel(result),
    performance: {
      score: analysisResults?.performanceAnalysis?.data?.performanceScore || 0,
      complexityLevel: analysisResults?.performanceAnalysis?.data?.complexityLevel || '未知',
      bottlenecks: analysisResults?.performanceAnalysis?.data?.bottlenecks || []
    },
    security: {
      score: analysisResults?.securityAudit?.data?.securityScore || 0,
      riskLevel: analysisResults?.securityAudit?.data?.riskLevel || '未知',
      vulnerabilities: analysisResults?.securityAudit?.data?.vulnerabilities || []
    },
    standards: {
      score: analysisResults?.standardsCheck?.data?.standardsScore || 0,
      complianceLevel: analysisResults?.standardsCheck?.data?.complianceLevel || '未知',
      violations: analysisResults?.standardsCheck?.data?.violations || []
    },
    optimization: {
      potential: analysisResults?.optimizationSuggestions?.data?.optimizationPotential || '未知',
      suggestions: analysisResults?.optimizationSuggestions?.data?.optimizationSuggestions || [],
      optimizedSql: report?.optimizedSql?.optimizedSql || null,
      changes: report?.optimizedSql?.changes || []
    },
    recommendations: report?.overallAssessment?.recommendations || [],
    detailedResults: data.detailedResults
  };
  
  return formatSuccessResponse(responseData, '分析完成');
}

/**
 * 计算风险等级
 * @param {Object} result - 分析结果
 * @returns {string} 风险等级
 */
function calculateRiskLevel(result) {
  if (!result.success || !result.data) return 'low';
  
  const { analysisResults, report } = result.data;
  
  // 优先检查安全一票否决
  if (report?.securityVeto) {
    return 'critical';
  }
  
  // 收集所有有效的评分
  const scores = {
    security: null,
    performance: null,
    standards: null
  };
  
  // 提取安全评分
  if (analysisResults?.securityAudit?.success &&
      typeof analysisResults.securityAudit.data?.securityScore === 'number') {
    scores.security = analysisResults.securityAudit.data.securityScore;
  }
  
  // 提取性能评分
  if (analysisResults?.performanceAnalysis?.success &&
      typeof analysisResults.performanceAnalysis.data?.performanceScore === 'number') {
    scores.performance = analysisResults.performanceAnalysis.data.performanceScore;
  }
  
  // 提取规范评分
  if (analysisResults?.standardsCheck?.success &&
      typeof analysisResults.standardsCheck.data?.standardsScore === 'number') {
    scores.standards = analysisResults.standardsCheck.data.standardsScore;
  }
  
  // 检查是否有致命的安全漏洞
  const hasCriticalVulnerability = analysisResults?.securityAudit?.success &&
    analysisResults.securityAudit.data?.vulnerabilities?.some(v =>
      v.severity === 'critical' || v.severity === '严重'
    );
  
  if (hasCriticalVulnerability) {
    return 'critical';
  }
  
  // 计算有效评分的数量和平均分
  const validScores = Object.values(scores).filter(s => s !== null);
  
  if (validScores.length === 0) {
    // 如果没有任何评分数据，默认为低风险
    return 'low';
  }
  
  const averageScore = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  
  // 根据平均分确定基础风险等级
  let baseRisk;
  if (averageScore >= 85) baseRisk = 'low';
  else if (averageScore >= 70) baseRisk = 'medium';
  else if (averageScore >= 50) baseRisk = 'high';
  else baseRisk = 'critical';
  
  // 如果安全评分特别低，提升风险等级
  if (scores.security !== null && scores.security < 40) {
    if (baseRisk === 'low') baseRisk = 'medium';
    else if (baseRisk === 'medium') baseRisk = 'high';
    else if (baseRisk === 'high') baseRisk = 'critical';
  }
  
  // 如果性能评分特别低，也要考虑提升风险
  if (scores.performance !== null && scores.performance < 30) {
    if (baseRisk === 'low') baseRisk = 'medium';
  }
  
  return baseRisk;
}

/**
 * 格式化批量分析结果响应
 * @param {Array} results - 批量分析结果
 * @returns {Object} 格式化的批量分析结果响应
 */
export function formatBatchAnalysisResults(results) {
  if (!Array.isArray(results)) {
    return formatErrorResponse('无效的批量分析结果');
  }
  
  const formattedResults = results.map(result => formatAnalysisResult(result));
  const summary = {
    total: results.length,
    success: formattedResults.filter(r => r.success).length,
    failed: formattedResults.filter(r => !r.success).length
  };
  
  return formatSuccessResponse({
    results: formattedResults,
    summary
  }, `批量分析完成，成功: ${summary.success}, 失败: ${summary.failed}`);
}

/**
 * 格式化历史记录响应
 * @param {Array} historyItems - 历史记录列表
 * @param {Object} pagination - 分页信息
 * @returns {Object} 格式化的历史记录响应
 */
export function formatHistoryResponse(historyItems, pagination = null) {
  return formatSuccessResponse({
    items: historyItems,
    pagination
  }, '获取历史记录成功');
}

/**
 * 格式化知识库状态响应
 * @param {Object} status - 知识库状态
 * @returns {Object} 格式化的知识库状态响应
 */
export function formatKnowledgeStatusResponse(status) {
  return formatSuccessResponse(status, '获取知识库状态成功');
}

/**
 * 格式化配置响应
 * @param {Object} config - 配置信息
 * @returns {Object} 格式化的配置响应
 */
export function formatConfigResponse(config) {
  return formatSuccessResponse(config, '获取配置成功');
}

/**
 * 格式化系统状态响应
 * @param {Object} status - 系统状态
 * @returns {Object} 格式化的系统状态响应
 */
export function formatSystemStatusResponse(status) {
  return formatSuccessResponse(status, '获取系统状态成功');
}