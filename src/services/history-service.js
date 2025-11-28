/**
* 历史服务模块
* 提供SQL分析历史记录的存储、查询和管理功能
*/

import { getHistoryService as getHistoryServiceImpl } from './history-service-impl.js';

/**
* 获取历史服务实例
* @returns {HistoryService} 历史服务实例
*/
export function getHistoryService() {
return getHistoryServiceImpl();
}

// 默认导出
export default getHistoryService;