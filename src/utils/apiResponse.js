/**
 * API响应格式标准化工具
 * 统一API响应格式，提供一致的接口体验
 */

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