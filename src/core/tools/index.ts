/**
* 分析工具模块（重构版）
* 导出各种分析工具，集成智能上下文管理
* 重构：告别SB的工具创建模式，支持知识库集成和智能配置
*/

import { BaseTool } from './base-tool.js';
import { PerformanceTool } from './performance-tool.js';
import { SecurityTool } from './security-tool.js';
import { StandardsTool } from './standards-tool.js';

// 导出工具类
export { BaseTool, PerformanceTool, SecurityTool, StandardsTool };

/**
* 工具配置映射
*/
const TOOL_CONFIG = {
performance: {
class: PerformanceTool,
temperature: 0.2,
maxTokens: 2500,
priority: 1
},
security: {
class: SecurityTool,
temperature: 0.1,
maxTokens: 3000,
priority: 2
},
standards: {
class: StandardsTool,
temperature: 0.0,
maxTokens: 2000,
priority: 3
}
};

/**
* 创建分析工具实例（增强版）
* @param {string} type - 工具类型
* @param {Object} llmService - LLM服务
* @param {Object} options - 创建选项
* @param {Object} knowledgeBase - 知识库实例（可选）
* @returns {BaseTool} 工具实例
*/
export function createTool(type, llmService, options: {
temperature?: number;
maxTokens?: number;
} = {}, knowledgeBase = null) {
const toolType = type.toLowerCase();
const config = TOOL_CONFIG[toolType];

if (!config) {
throw new Error(`未知的工具类型: ${type}。支持的类型: ${Object.keys(TOOL_CONFIG).join(', ')}`);
}

// 创建工具实例
const tool = new config.class(llmService, knowledgeBase);

// 应用自定义配置
if (options.temperature !== undefined) {
// 子类会覆盖这个方法
tool.getTemperature = () => options.temperature;
}

if (options.maxTokens !== undefined) {
tool.getMaxTokens = () => options.maxTokens;
}

return tool;
}

/**
* 创建所有分析工具
* @param {Object} llmService - LLM服务
* @param {Object} options - 创建选项
* @param {Object} knowledgeBase - 知识库实例（可选）
* @returns {Object} 工具映射
*/
export function createAllTools(llmService: any, options: any = {}, knowledgeBase: any = null) {
const tools = {};

Object.entries(TOOL_CONFIG).forEach(([type, config]) => {
tools[type] = createTool(type, llmService, {
...options,
temperature: options.temperature || config.temperature,
maxTokens: options.maxTokens || config.maxTokens
}, knowledgeBase);
});

return tools;
}

/**
* 根据优先级排序工具类型
* @param {Array<string>} toolTypes - 工具类型数组
* @returns {Array<string>} 排序后的工具类型
*/
export function sortToolsByPriority(toolTypes) {
return toolTypes
.map(type => ({
type,
priority: TOOL_CONFIG[type.toLowerCase()]?.priority || 999
}))
.sort((a, b) => a.priority - b.priority)
.map(item => item.type);
}

/**
* 获取工具配置
* @param {string} type - 工具类型
* @returns {Object|null} 工具配置
*/
export function getToolConfig(type) {
return TOOL_CONFIG[type.toLowerCase()] || null;
}

/**
* 获取所有支持的工具类型
* @returns {Array<string>} 工具类型数组
*/
export function getSupportedToolTypes() {
return Object.keys(TOOL_CONFIG);
}

/**
* 验证工具类型
* @param {string} type - 工具类型
* @returns {boolean} 是否有效
*/
export function isValidToolType(type) {
return TOOL_CONFIG.hasOwnProperty(type.toLowerCase());
}

/**
* 工具工厂类（更高级的工具管理）
*/
export class ToolFactory {
  private llmService: any;
  private knowledgeBase: any;
  private defaultOptions: any;
  private toolCache: Map<string, any>;

  constructor(llmService: any, knowledgeBase: any = null, defaultOptions: any = {}) {
    this.llmService = llmService;
    this.knowledgeBase = knowledgeBase;
    this.defaultOptions = defaultOptions;
    this.toolCache = new Map();
  }

/**
* 获取工具实例（支持缓存）
* @param {string} type - 工具类型
* @param {Object} options - 创建选项
* @returns {BaseTool} 工具实例
*/
getTool(type, options = {}) {
const cacheKey = `${type}:${JSON.stringify(options)}`;

if (this.toolCache.has(cacheKey)) {
return this.toolCache.get(cacheKey);
}

const tool = createTool(
type,
this.llmService,
{ ...this.defaultOptions, ...options },
this.knowledgeBase
);

this.toolCache.set(cacheKey, tool);
return tool;
}

/**
* 获取所有工具
* @param {Object} options - 创建选项
* @returns {Object} 工具映射
*/
getAllTools(options = {}) {
return createAllTools(
this.llmService,
{ ...this.defaultOptions, ...options },
this.knowledgeBase
);
}

/**
* 清理缓存
*/
clearCache() {
this.toolCache.clear();
}

/**
* 获取缓存统计
* @returns {Object} 缓存统计
*/
getCacheStats() {
return {
size: this.toolCache.size,
supportedTypes: getSupportedToolTypes().length
};
}
}