/**
* API响应格式化工具
* 统一API响应格式，减少代码重复
*/

/**
* 格式化成功响应
* @param {*} data - 响应数据
* @param {string} message - 响应消息
* @returns {Object} 格式化的响应对象
*/
export function formatSuccessResponse(data, message = 'Success') {
return {
success: true,
data,
message,
timestamp: new Date().toISOString()
};
}

/**
* 格式化错误响应
* @param {Error|string} error - 错误对象或错误消息
* @param {string} message - 响应消息
* @returns {Object} 格式化的响应对象
*/
export function formatErrorResponse(error, message = 'Error') {
return {
success: false,
error: error.message || error,
message,
timestamp: new Date().toISOString()
};
}

/**
* 格式化分页响应
* @param {Array} items - 数据项列表
* @param {number} total - 总数
* @param {number} page - 当前页码
* @param {number} pageSize - 每页大小
* @param {string} message - 响应消息
* @returns {Object} 格式化的分页响应对象
*/
export function formatPaginatedResponse(items, total, page = 1, pageSize = 10, message = 'Success') {
return {
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
}