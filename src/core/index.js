/**
 * 核心模块统一导出文件 - 重组后的新架构版本
 * 提供清晰的模块化导出，支持按需导入和统一导入
 */

// 首先导入所有模块，然后重新导出
import {
  AnalysisEngine,
  getAnalysisEngine,
  analysisEngine,
  Context
} from './engine/index.js';

import {
  BaseAnalyzer,
  UnifiedAnalyzer
} from './analyzers/index.js';

import {
  DatabaseIdentifier
} from './identification/index.js';

import {
  initializeVectorStore,
  loadDocumentsFromRulesDirectory,
  retrieveDocuments,
  resetVectorStore,
  isVectorStoreInitialized,
  loadVectorStoreFromDisk,
  saveVectorStore,
  isVectorStorePersisted,
  similaritySearch,
  createRetrieveTool,
  retrieveKnowledge
} from './knowledge/index.js';

import {
  ReportIntegrator
} from './reporting/index.js';

import analysisEngineDefault from './engine/index.js';

// ============================================================================
// 重新导出所有模块
// ============================================================================

// 引擎模块 - 核心业务流程控制
export {
  AnalysisEngine,
  getAnalysisEngine,
  analysisEngine,
  Context
};

// 分析器模块 - SQL分析能力
export {
  BaseAnalyzer,
  UnifiedAnalyzer
};

// 识别模块 - 数据库类型识别
export {
  DatabaseIdentifier
};

// 知识库模块 - 知识管理和检索
export {
  initializeVectorStore,
  loadDocumentsFromRulesDirectory,
  retrieveDocuments,
  resetVectorStore,
  isVectorStoreInitialized,
  loadVectorStoreFromDisk,
  saveVectorStore,
  isVectorStorePersisted,
  similaritySearch,
  createRetrieveTool,
  retrieveKnowledge
};

// 报告模块 - 结果整合和输出
export {
  ReportIntegrator
};

// 默认导出 - 分析引擎实例
export { analysisEngineDefault as default };

// ============================================================================
// 便捷导出 - 常用组合
// ============================================================================

// 导出核心组件组合
export const CoreComponents = {
  Engine: AnalysisEngine,
  Context,
  UnifiedAnalyzer,
  DatabaseIdentifier,
  ReportIntegrator
};

// 导出知识库功能组合
export const KnowledgeComponents = {
  VectorStore: {
    initialize: initializeVectorStore,
    load: loadDocumentsFromRulesDirectory,
    retrieve: retrieveDocuments,
    reset: resetVectorStore,
    isInitialized: isVectorStoreInitialized,
    loadFromDisk: loadVectorStoreFromDisk,
    save: saveVectorStore,
    isPersisted: isVectorStorePersisted,
    similaritySearch
  },
  KnowledgeBase: {
    createTool: createRetrieveTool,
    retrieve: retrieveKnowledge
  }
};