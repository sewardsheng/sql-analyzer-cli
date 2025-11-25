/**
 * 优化的响应处理工具
 * 专注于新架构的简洁响应格式
 */

import {
  ApiError,
  isApiError,
  fromError as convertToApiError
} from './api-error.js';

/**
 * 创建标准响应
 * @param {boolean} success - 是否成功
 * @param {*} data - 响应数据
 * @param {string} message - 响应消息
 * @param {Object} meta - 额外元数据
 * @returns {Object} 标准响应
 */
export function createResponse(success, data = null, message = '', meta = {}) {
  const response = {
    success,
    timestamp: new Date().toISOString(),
    ...meta
  };
  
  if (success && data !== null) {
    response.data = data;
  }
  
  if (message) {
    response.message = message;
  }
  
  return response;
}

/**
 * 创建成功响应
 * @param {*} data - 响应数据
 * @param {string} message - 响应消息
 * @param {Object} meta - 额外元数据
 * @returns {Object} 成功响应
 */
export function successResponse(data = null, message = '操作成功', meta = {}) {
  return createResponse(true, data, message, meta);
}

/**
 * 创建错误响应
 * @param {string} message - 错误消息
 * @param {number} statusCode - HTTP状态码
 * @param {Object} meta - 额外元数据
 * @returns {Object} 错误响应
 */
export function errorResponse(message = '操作失败', statusCode = 500, meta = {}) {
  return createResponse(false, null, message, { statusCode, ...meta });
}

/**
 * 格式化分析结果响应 - 优化版本
 * @param {Object} result - 分析结果
 * @returns {Object} 格式化的分析结果响应
 */
export function formatAnalysisResult(result) {
  if (!result?.success) {
    return errorResponse(result?.error || '分析失败', 400);
  }
  
  const { data } = result;
  const { report } = data;
  
  // 新架构响应数据结构
  const responseData = {
    sql: data.originalQuery || data.sql,
    databaseType: data.databaseType,
    analysisResults: {
      performance: extractAnalysisData({ success: true, data: data.performance }),
      security: extractAnalysisData({ success: true, data: data.security }),
      standards: extractAnalysisData({ success: true, data: data.standards })
    },
    report: {
      overallScore: report?.overallAssessment?.score || data.overallScore || 0,
      riskLevel: calculateRiskLevel(result),
      securityVeto: report?.securityVeto || data.securityVeto || false,
      optimization: {
        suggestions: data.optimization?.suggestions || [],
        optimizedSql: report?.optimizedSql?.optimizedSql || data.optimization?.optimizedSql || null
      },
      recommendations: report?.overallAssessment?.recommendations || data.recommendations || []
    }
  };
  
  return successResponse(responseData, '分析完成');
}

/**
 * 提取分析数据 - 简化版本
 * @param {Object} analysis - 分析结果
 * @returns {Object} 提取的数据
 */
function extractAnalysisData(analysis) {
  if (!analysis?.success) return { score: 0 };
  
  const data = analysis.data || {};
  return {
    score: data.score || 0,
    level: data.complexityLevel || data.threatLevel || data.qualityLevel || '未知',
    issues: data.bottlenecks || data.vulnerabilities || data.violations || []
  };
}

/**
 * 计算风险等级 - 优化版本
 * @param {Object} result - 分析结果
 * @returns {string} 风险等级
 */
function calculateRiskLevel(result) {
  if (!result?.success || !result.data) return 'low';
  
  const data = result.data;
  const report = data.report;
  
  // 安全一票否决检查
  if (report?.securityVeto || data.securityVeto) return 'critical';
  
  // 提取评分
  const scores = [];
  if (data.security?.score !== undefined) {
    scores.push(data.security.score);
  }
  if (data.performance?.score !== undefined) {
    scores.push(data.performance.score);
  }
  if (data.standards?.score !== undefined) {
    scores.push(data.standards.score);
  }
  
  if (scores.length === 0) return 'low';
  
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  
  // 简化的风险等级计算
  if (averageScore >= 85) return 'low';
  if (averageScore >= 70) return 'medium';
  if (averageScore >= 50) return 'high';
  return 'critical';
}

/**
 * 格式化批量分析结果 - 优化版本
 * @param {Array} results - 批量分析结果
 * @returns {Object} 格式化的批量分析结果响应
 */
export function formatBatchAnalysisResults(results) {
  if (!Array.isArray(results)) {
    return errorResponse('无效的批量分析结果', 400);
  }
  
  const formattedResults = results.map(result => formatAnalysisResult(result));
  const successCount = formattedResults.filter(r => r.success).length;
  
  return successResponse({
    results: formattedResults,
    summary: {
      total: results.length,
      success: successCount,
      failed: results.length - successCount
    }
  }, `批量分析完成，成功: ${successCount}, 失败: ${results.length - successCount}`);
}

/**
 * 格式化历史记录响应 - 优化版本
 * @param {Array} historyItems - 历史记录列表
 * @param {Object} pagination - 分页信息
 * @returns {Object} 格式化的历史记录响应
 */
export function formatHistoryResponse(historyItems, pagination = null) {
  return successResponse({
    items: historyItems,
    pagination
  }, '获取历史记录成功');
}

/**
 * 格式化状态响应 - 通用版本
 * @param {Object} status - 状态信息
 * @param {string} type - 状态类型
 * @returns {Object} 格式化的状态响应
 */
export function formatStatusResponse(status, type = '状态') {
  return successResponse(status, `获取${type}成功`);
}

// ============================================================================
// 统一错误处理响应格式化器 - 优化版本
// ============================================================================

/**
 * 格式化API错误响应 - 优化版本
 * @param {Error} error - 错误对象
 * @returns {Object} 格式化的错误响应
 */
export function formatApiErrorResponse(error) {
  const apiError = isApiError(error) ? error : convertToApiError(error);
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const response = {
    success: false,
    error: apiError.getUserMessage(),
    type: apiError.type,
    statusCode: apiError.statusCode,
    timestamp: apiError.timestamp
  };
  
  // 添加错误详情（如果有）
  if (apiError.details) {
    response.details = apiError.details;
  }
  
  // 开发环境添加调试信息
  if (isDevelopment) {
    response.debug = {
      originalError: apiError.message,
      stack: apiError.stack
    };
  }
  
  return response;
}

/**
 * 创建Hono错误响应 - 优化版本
 * @param {Error} error - 错误对象
 * @param {Object} context - Hono上下文
 * @returns {Response} Hono响应对象
 */
export function createHonoErrorResponse(error, context) {
  const apiError = isApiError(error) ? error : convertToApiError(error);
  const errorResponse = formatApiErrorResponse(apiError);
  
  try {
    // 设置响应头
    context.header('Content-Type', 'application/json');
    context.header('X-Error-Type', apiError.type);
    
    return context.json(errorResponse, apiError.statusCode);
  } catch (headerError) {
    // 降级处理：只返回JSON响应
    return context.json(errorResponse, apiError.statusCode);
  }
}

/**
 * 创建分页响应 - 优化版本
 * @param {Array} items - 数据项列表
 * @param {Object} pagination - 分页信息
 * @param {string} message - 响应消息
 * @returns {Object} 分页响应
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
        totalPages: Math.ceil((pagination.total || items.length) / (pagination.limit || 10))
      }
    }
  );
}

/**
 * 创建健康检查响应 - 优化版本
 * @param {Object} healthInfo - 健康信息
 * @returns {Object} 健康检查响应
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
// 向后兼容导出 - 简单包装新函数
// ============================================================================

/**
 * 向后兼容的成功响应格式化函数
 * @param {*} data - 响应数据
 * @param {string|Object} message - 响应消息或元数据
 * @param {Object} meta - 额外元数据
 * @returns {Object} 成功响应
 */
export function formatSuccessResponse(data, message = '', meta = {}) {
  // 如果第二个参数是对象，则作为meta处理
  if (typeof message === 'object' && message !== null) {
    meta = message;
    message = '';
  }
  return successResponse(data, message, meta);
}

/**
 * 向后兼容的错误响应格式化函数
 * @param {string} message - 错误消息
 * @param {number|Object} statusCodeOrError - 状态码或错误对象
 * @param {Object} error - 错误详情
 * @returns {Object} 错误响应
 */
export function formatErrorResponse(message, statusCodeOrError = 500, error = {}) {
  let statusCode = 500;
  let details = {};
  
  // 处理不同的参数组合
  if (typeof statusCodeOrError === 'number') {
    statusCode = statusCodeOrError;
    details = error;
  } else if (typeof statusCodeOrError === 'object' && statusCodeOrError !== null) {
    details = statusCodeOrError;
  }
  
  return errorResponse(message, statusCode, details);
}
