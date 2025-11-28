/**
* 核心模块统一导出（重构版）
* 优化上下文信息管理，提升LLM调用效率
*/

// 导出增强型分析器
export {
EnhancedSQLAnalyzer,
createEnhancedSQLAnalyzer
} from './EnhancedSQLAnalyzer.js';

// 导出原有分析器（兼容性）
export { SQLAnalyzer, sqlAnalyzer } from './sql-analyzer.js';
export { LlmJsonParser, llmJsonParser } from './llm-json-parser.js';
export { LLMService, llmService } from './llm-service.js';

// 导出上下文管理模块
export {
ContextManager,
createContextManager,
SmartPromptBuilder,
createSmartPromptBuilder,
PromptComponents
} from './context/index.js';

// 导出分析工具模块
export * from './tools/index.js';

// 导出知识库模块
export {
createRetrieveTool,
retrieveKnowledge
} from './knowledge/index.js';

// 导出数据库识别
export { DatabaseIdentifier } from './identification/db-identifier.js';

// 默认导出增强型分析器
export { default } from './EnhancedSQLAnalyzer.js';