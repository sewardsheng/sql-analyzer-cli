/**
* 规范检查工具（重构版）
* 专门检查SQL语句的编码规范和最佳实践
* 重构：集成智能上下文管理，告别SB的字符串拼接
*/

import { BaseTool } from './base-tool.js';

/**
* 规范检查工具类
*/
class StandardsTool extends BaseTool {
constructor(llmService, knowledgeBase = null) {
super(llmService, knowledgeBase);
this.name = 'StandardsTool';
}

/**
* 获取分析类型
* @returns {string} 分析类型
*/
getAnalysisType() {
return 'standards';
}

/**
* 获取工具特定选项
* @returns {Object} 工具选项
*/
getToolSpecificOptions() {
return {
focusAreas: ['coding_standards', 'naming_conventions', 'formatting'],
strictMode: true,
includeBestPractices: true,
styleGuides: ['google_sql', 'company_standards']
};
}

/**
* 获取温度参数
* @returns {number} 温度值
*/
getTemperature() {
return 0.0; // 规范检查需要最严格的精确性
}

/**
* 获取最大token数
* @returns {number} 最大token数
*/
getMaxTokens() {
return 2000; // 规范检查的标准输出
}

/**
* 获取工具描述
* @returns {string} 描述
*/
getDescription() {
return 'SQL规范检查工具，严格检查编码规范、命名约定和最佳实践';
}
}

export { StandardsTool };