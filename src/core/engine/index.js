/**
 * 引擎模块导出文件
 * 包含分析引擎和全局上下文管理
 */

// 导出分析引擎
export { AnalysisEngine, getAnalysisEngine, analysisEngine } from './analysis-engine.js';

// 导出全局上下文（重命名为更简洁的 Context）
import GlobalContext from './context.js';
export { GlobalContext as Context };

// 默认导出分析引擎实例
export { default } from './analysis-engine.js';