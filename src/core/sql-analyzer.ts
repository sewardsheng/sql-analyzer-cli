/**
* SQL分析器主控制器
* 架构模块，直接控制分析流程
*/

import { DatabaseIdentifier } from './identification/index.js';
import { PerformanceTool } from './tools/performance-tool.js';
import { SecurityTool } from './tools/security-tool.js';
import { StandardsTool } from './tools/standards-tool.js';
import { LlmJsonParser } from './llm-json-parser.js';
import { LLMService } from './llm-service.js';
import { config } from '../config/index.js';

// 分析选项接口
interface AnalyzerOptions {
  performance?: boolean;
  security?: boolean;
  standards?: boolean;
  [key: string]: any;
}

// 工具接口
interface Tool {
  execute(context: any): Promise<any>;
}

/**
* SQL分析器主控制器
* 负责整体分析流程的协调和控制
*/
class SQLAnalyzer {
private config: any;
private llmService: any;
private parser: any;
private databaseIdentifier: any;
private tools: {
performance: any;
security: any;
standards: any;
};

constructor(config = {}) {
this.config = config;

// 初始化核心服务
this.llmService = new LLMService(config);
this.parser = new LlmJsonParser();
this.databaseIdentifier = new DatabaseIdentifier(config);

// 初始化分析工具
this.tools = {
performance: new PerformanceTool(this.llmService),
security: new SecurityTool(this.llmService),
standards: new StandardsTool(this.llmService)
};
}

/**
* 分析SQL语句
* @param {string} sql - SQL语句
* @param {Object} options - 分析选项
* @returns {Promise<Object>} 分析结果
*/
async analyze(sql, options = {}) {
const startTime = Date.now();

try {
// 1. 验证输入
if (!sql || typeof sql !== 'string') {
throw new Error('SQL语句不能为空且必须是字符串');
}

const trimmedSql = sql.trim();
if (!trimmedSql) {
throw new Error('SQL语句不能为空');
}

// 2. 识别数据库类型
const dbResult = await this.databaseIdentifier.identify(trimmedSql);
const databaseType = dbResult.type || 'unknown';

// 3. 获取启用的工具
const enabledTools = this.getEnabledTools(options);

if (Object.keys(enabledTools).length === 0) {
throw new Error('至少需要启用一个分析维度');
}

// 4. 并行执行分析
const analysisContext = {
sql: trimmedSql,
databaseType,
options
};

const results = await this.executeTools(enabledTools, analysisContext);

// 5. 构建响应
const duration = Date.now() - startTime;

return {
success: true,
data: results,
metadata: {
databaseType,
timestamp: new Date().toISOString(),
duration,
tools: Object.keys(enabledTools),
llmCalls: this.countLLMCalls(results)
}
};

} catch (error) {
const duration = Date.now() - startTime;

return {
success: false,
error: error.message,
data: null,
metadata: {
timestamp: new Date().toISOString(),
duration,
error: error.message
}
};
}
}

/**
* 获取启用的分析工具
* @param {Object} options - 分析选项
* @returns {Object} 启用的工具映射
*/
getEnabledTools(options: AnalyzerOptions = {}) {
const enabled: { [key: string]: any } = {};

// 默认启用所有维度
const defaults = {
performance: true,
security: true,
standards: true
};

// 合并用户选项
const finalOptions = { ...defaults, ...options };

if (finalOptions.performance !== false) {
enabled.performance = this.tools.performance;
}

if (finalOptions.security !== false) {
enabled.security = this.tools.security;
}

if (finalOptions.standards !== false) {
enabled.standards = this.tools.standards;
}

return enabled;
}

/**
* 并行执行分析工具
* @param {Object} tools - 工具映射
* @param {Object} context - 分析上下文
* @returns {Promise<Object>} 分析结果
*/
async executeTools(tools: { [key: string]: Tool }, context: any) {
const startTime = Date.now();

// 创建真正的并行执行Promise数组
const promises = Object.entries(tools).map(async ([name, tool]) => {
const toolStartTime = Date.now();

try {
// 设置60秒超时，防止单个工具阻塞
const timeoutPromise = new Promise((_, reject) =>
setTimeout(() => reject(new Error(`${name} 分析超时`)), 60000)
);

// 并行执行工具，带超时控制
const result = await Promise.race([
tool.execute(context),
timeoutPromise
]);

const toolDuration = Date.now() - toolStartTime;

// 解析LLM响应
const parsedResult = this.parser.parse(result.rawContent, name);

return [name, {
success: true,
data: parsedResult.success ? parsedResult.data : result.rawContent,
rawContent: result.rawContent,
strategy: parsedResult.strategy,
metadata: {
duration: result.duration || toolDuration,
confidence: parsedResult.data?.confidence || 0.5,
parallelTime: toolDuration
}
}];
} catch (error) {
const toolDuration = Date.now() - toolStartTime;

return [name, {
success: false,
error: error.message,
data: this.parser.getFallback(name),
strategy: 'error_fallback',
metadata: {
duration: toolDuration,
parallelTime: toolDuration
}
}];
}
});

// 等待所有并行任务完成
const results = await Promise.all(promises);

return Object.fromEntries(results);
}

/**
* 统计LLM调用次数
* @param {Object} results - 分析结果
* @returns {number} LLM调用次数
*/
countLLMCalls(results: { [key: string]: any }) {
return Object.values(results).filter(result => result.success).length;
}

/**
* 批量分析SQL语句
* @param {Array<string>} sqlList - SQL语句列表
* @param {Object} options - 分析选项
* @returns {Promise<Array>} 分析结果数组
*/
async analyzeBatch(sqlList, options = {}) {
if (!Array.isArray(sqlList)) {
throw new Error('批量分析需要传入SQL数组');
}

const results = [];

// 串行处理以确保资源控制
for (let i = 0; i < sqlList.length; i++) {
const sql = sqlList[i];

try {
const result = await this.analyze(sql, options);
results.push({
index: i,
sql,
...result
});
} catch (error) {
results.push({
index: i,
sql,
success: false,
error: error.message
});
}
}

return results;
}

/**
* 获取分析器状态
* @returns {Object} 状态信息
*/
getStatus() {
return {
analyzer: 'ready',
tools: {
performance: !!this.tools.performance,
security: !!this.tools.security,
standards: !!this.tools.standards
},
services: {
llm: !!this.llmService,
parser: !!this.parser,
databaseIdentifier: !!this.databaseIdentifier
},
timestamp: new Date().toISOString()
};
}
}

// 创建全局实例
const sqlAnalyzer = new SQLAnalyzer();

// 导出类和实例
export { SQLAnalyzer, sqlAnalyzer };
export default sqlAnalyzer;