/**
 * 统一响应处理工具
 * 整合API响应格式化和业务场景特定的响应处理
 */

import { 
  ApiError, 
  ErrorTypes, 
  isApiError, 
  getErrorStatusCode,
  fromError as convertToApiError 
} from './api-error.js';

// ============================================================================
// 基础响应构建器 (来自原 apiResponse.js)
// ============================================================================

/**
 * 创建成功响应
 * @param {*} data - 响应数据
 * @param {string} message - 响应消息
 * @param {Object} meta - 额外的元数据
 * @returns {Object} 标准化的成功响应
 */
export function successResponse(data = null, message = '操作成功', meta = {}) {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    ...meta
  };
}

/**
 * 创建错误响应
 * @param {Error|string} error - 错误信息
 * @param {number} code - HTTP状态码
 * @param {Object} meta - 额外的元数据
 * @returns {Object} 标准化的错误响应
 */
export function errorResponse(error, code = 500, meta = {}) {
  const errorMessage = error instanceof Error ? error.message : error;
  
  return {
    success: false,
    error: errorMessage,
    code,
    timestamp: new Date().toISOString(),
    ...meta
  };
}

/**
 * 创建分页响应
 * @param {Array} items - 数据项列表
 * @param {Object} pagination - 分页信息
 * @param {string} message - 响应消息
 * @returns {Object} 标准化的分页响应
 */
export function paginatedResponse(items, pagination, message = '获取数据成功') {
  return successResponse(
    items,
    message,
    {
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total || items.length,
        totalPages: Math.ceil((pagination.total || items.length) / (pagination.limit || 10)),
        hasNext: pagination.hasNext || false,
        hasPrev: pagination.hasPrev || false,
        ...pagination
      }
    }
  );
}

/**
 * 创建批量操作响应
 * @param {Array} results - 批量操作结果
 * @param {Object} summary - 操作摘要
 * @param {string} message - 响应消息
 * @returns {Object} 标准化的批量操作响应
 */
export function batchResponse(results, summary, message = '批量操作完成') {
  return successResponse(
    results,
    message,
    {
      summary: {
        total: summary.total || results.length,
        succeeded: summary.succeeded || 0,
        failed: summary.failed || 0,
        successRate: summary.total ? ((summary.succeeded || 0) / summary.total * 100).toFixed(2) + '%' : '0%',
        ...summary
      }
    }
  );
}

/**
 * 创建验证错误响应
 * @param {Array|Object} errors - 验证错误信息
 * @param {string} message - 响应消息
 * @returns {Object} 标准化的验证错误响应
 */
export function validationErrorResponse(errors, message = '请求参数验证失败') {
  return errorResponse(
    message,
    400,
    {
      errors: Array.isArray(errors) ? errors : [errors],
      type: 'validation_error'
    }
  );
}

/**
 * 创建未找到响应
 * @param {string} resource - 资源名称
 * @param {string} identifier - 资源标识符
 * @returns {Object} 标准化的未找到响应
 */
export function notFoundResponse(resource = '资源', identifier = '') {
  const message = identifier ? `${resource} '${identifier}' 未找到` : `${resource}未找到`;
  return errorResponse(message, 404, { type: 'not_found', resource, identifier });
}

/**
 * 创建未授权响应
 * @param {string} message - 响应消息
 * @returns {Object} 标准化的未授权响应
 */
export function unauthorizedResponse(message = '未授权访问') {
  return errorResponse(message, 401, { type: 'unauthorized' });
}

/**
 * 创建禁止访问响应
 * @param {string} message - 响应消息
 * @returns {Object} 标准化的禁止访问响应
 */
export function forbiddenResponse(message = '禁止访问') {
  return errorResponse(message, 403, { type: 'forbidden' });
}

/**
 * 创建服务不可用响应
 * @param {string} message - 响应消息
 * @returns {Object} 标准化的服务不可用响应
 */
export function serviceUnavailableResponse(message = '服务暂时不可用') {
  return errorResponse(message, 503, { type: 'service_unavailable' });
}

/**
 * 创建健康检查响应
 * @param {Object} healthInfo - 健康信息
 * @returns {Object} 标准化的健康检查响应
 */
export function healthResponse(healthInfo = {}) {
  return successResponse(
    null,
    '服务健康',
    {
      status: 'healthy',
      service: 'sql-analyzer-api',
      version: '1.0.0',
      uptime: process.uptime(),
      ...healthInfo
    }
  );
}

// ============================================================================
// 业务特定格式化器 (来自原 apiResponseFormatter.js)
// ============================================================================

/**
 * 统一响应格式 (兼容原 formatResponse)
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
 * 格式化成功响应 (兼容原 formatSuccessResponse)
 * @param {*} data - 响应数据
 * @param {string} message - 响应消息
 * @returns {Object} 格式化的成功响应
 */
export function formatSuccessResponse(data = null, message = '') {
  return formatResponse(true, data, message);
}

/**
 * 格式化错误响应 (兼容原 formatErrorResponse)
 * @param {string} message - 错误消息
 * @param {*} error - 错误详情
 * @returns {Object} 格式化的错误响应
 */
export function formatErrorResponse(message, error = null) {
  return formatResponse(false, null, message, error);
}

/**
 * 格式化分析结果响应
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

// ============================================================================
// 新增：统一错误处理响应格式化器
// ============================================================================

/**
 * 格式化API错误响应
 * @param {Error} error - 错误对象
 * @param {boolean} includeStack - 是否包含堆栈信息
 * @returns {Object} 格式化的错误响应
 */
export function formatApiErrorResponse(error, includeStack = false) {
  let apiError = error;
  
  // 如果不是ApiError实例，转换为ApiError
  if (!isApiError(error)) {
    apiError = convertToApiError(error);
  }
  
  const response = {
    success: false,
    error: apiError.getUserMessage(),
    type: apiError.type,
    code: apiError.code,
    timestamp: apiError.timestamp,
    statusCode: apiError.statusCode
  };
  
  // 添加错误详情
  if (apiError.details) {
    response.details = apiError.details;
  }
  
  // 在开发环境中添加调试信息
  if (includeStack && process.env.NODE_ENV === 'development') {
    response.originalError = apiError.message;
    response.stack = apiError.stack;
  }
  
  return response;
}

/**
 * 创建Hono错误响应
 * @param {Error} error - 错误对象
 * @param {Object} context - Hono上下文
 * @returns {Response} Hono响应对象
 */
export function createHonoErrorResponse(error, context) {
  const apiError = isApiError(error) ? error : convertToApiError(error);
  const includeStack = process.env.NODE_ENV === 'development';
  const errorResponse = formatApiErrorResponse(apiError, includeStack);
  
  // 调试日志：记录错误信息
  console.log('[DEBUG] createHonoErrorResponse called with:', {
    errorMessage: apiError.message,
    errorType: apiError.type,
    statusCode: apiError.statusCode,
    contextType: typeof context,
    hasJson: typeof context.json,
    hasHeader: typeof context.header
  });
  
  try {
    // 使用 Hono 的正确 API 设置响应头
    context.header('Content-Type', 'application/json');
    context.header('X-Error-Type', apiError.type);
    context.header('X-Error-Code', apiError.code || 'UNKNOWN');
    
    // 在开发环境中添加调试头
    if (includeStack) {
      context.header('X-Debug-Mode', 'true');
    }
    
    return context.json(errorResponse, apiError.statusCode);
  } catch (headerError) {
    console.log('[DEBUG] Header setting error:', headerError);
    // 如果设置头失败，至少返回 JSON 响应
    return context.json(errorResponse, apiError.statusCode);
  }
}

// ============================================================================
// 向后兼容性导出 (保持原有API)
// ============================================================================

// 为了向后兼容，重新导出原有的函数名
export {
  successResponse as createSuccessResponse,
  errorResponse as createErrorResponse,
  paginatedResponse as createPaginatedResponse,
  batchResponse as createBatchResponse,
  validationErrorResponse as createValidationErrorResponse,
  notFoundResponse as createNotFoundResponse,
  unauthorizedResponse as createUnauthorizedResponse,
  forbiddenResponse as createForbiddenResponse,
  serviceUnavailableResponse as createServiceUnavailableResponse,
  healthResponse as createHealthResponse
};