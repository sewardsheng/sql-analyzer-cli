/**
* 历史服务模块
* 提供SQL分析历史记录的存储、查询和管理功能
*/

import { getHistoryService } from './history-service-impl.js';
import { HistoryService } from './history-service-impl.js';

// 直接导出实现
export { getHistoryService, HistoryService };
export default getHistoryService;