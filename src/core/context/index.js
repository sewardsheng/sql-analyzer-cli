/**
* 上下文管理模块统一导出
* 优化上下文信息管理，提升LLM调用效率
*/

export { ContextManager, createContextManager } from './ContextManager.js';
export { SmartPromptBuilder, createSmartPromptBuilder, PromptComponents } from './SmartPromptBuilder.js';

// 默认导出
export { default as contextManagerFactory } from './ContextManager.js';
export { default as promptBuilderFactory } from './SmartPromptBuilder.js';