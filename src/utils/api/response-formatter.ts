/**
 * API响应格式化工具
 * 统一API响应格式，减少代码重复
 */

/**
 * 基础响应接口
 */
export interface BaseResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

/**
 * 成功响应接口
 */
export interface SuccessResponse<T = any> extends BaseResponse {
  success: true;
  data: T;
}

/**
 * 错误响应接口
 */
export interface ErrorResponse extends BaseResponse {
  success: false;
  error: string;
}

/**
 * 分页信息接口
 */
export interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 分页响应接口
 */
export interface PaginatedResponse<T = any> extends SuccessResponse<T[]> {
  pagination: PaginationInfo;
}

/**
 * 格式化成功响应
 * @param data - 响应数据
 * @param messageOrMetadata - 响应消息或元数据
 * @param metadata - 可选的元数据
 * @returns {Object} 格式化的响应对象
 */
export function formatSuccessResponse<T = any>(
  data: T,
  messageOrMetadata?: string | Record<string, any>,
  metadata?: Record<string, any>
): SuccessResponse<T> & { metadata?: Record<string, any> } {
  let message = 'Success';
  let meta: Record<string, any> | undefined;

  if (typeof messageOrMetadata === 'string') {
    message = messageOrMetadata;
    meta = metadata;
  } else {
    meta = messageOrMetadata;
  }

  const response: SuccessResponse<T> & { metadata?: Record<string, any> } = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };

  if (meta) {
    response.metadata = meta;
  }

  return response;
}

/**
 * 格式化错误响应
 * @param error - 错误对象或错误消息
 * @param messageOrMetadata - 响应消息或元数据
 * @param metadata - 可选的元数据
 * @returns {Object} 格式化的响应对象
 */
export function formatErrorResponse(
  error: Error | string,
  messageOrMetadata?: string | Record<string, any>,
  metadata?: Record<string, any>
): ErrorResponse & { metadata?: Record<string, any> } {
  let message = 'Error';
  let meta: Record<string, any> | undefined;

  if (typeof messageOrMetadata === 'string') {
    message = messageOrMetadata;
    meta = metadata;
  } else {
    meta = messageOrMetadata;
  }

  const response: ErrorResponse & { metadata?: Record<string, any> } = {
    success: false,
    error: error instanceof Error ? error.message : error,
    message,
    timestamp: new Date().toISOString()
  };

  if (meta) {
    response.metadata = meta;
  }

  return response;
}

/**
 * 格式化分页响应
 * @param items - 数据项列表
 * @param total - 总数
 * @param page - 当前页码
 * @param pageSize - 每页大小
 * @param message - 响应消息
 * @param metadata - 可选的元数据
 * @returns {Object} 格式化的分页响应对象
 */
export function formatPaginatedResponse<T = any>(
  items: T[],
  total: number,
  page: number = 1,
  pageSize: number = 10,
  message: string = 'Success',
  metadata?: Record<string, any>
): PaginatedResponse<T> & { metadata?: Record<string, any> } {
  const response: PaginatedResponse<T> & { metadata?: Record<string, any> } = {
    success: true,
    data: items,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    },
    message,
    timestamp: new Date().toISOString()
  };

  if (metadata) {
    response.metadata = metadata;
  }

  return response;
}

/**
 * 创建分页信息对象
 * @param total - 总数
 * @param page - 当前页码
 * @param pageSize - 每页大小
 * @returns {PaginationInfo} 分页信息对象
 */
export function createPaginationInfo(
  total: number,
  page: number = 1,
  pageSize: number = 10
): PaginationInfo {
  return {
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
}