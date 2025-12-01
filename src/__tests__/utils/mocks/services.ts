/**
 * 服务Mock对象
 * 老王我专门搞的Mock服务，用于测试这些SB组件
 */

import { vi } from 'vitest';

/**
 * Mock SQL分析器
 */
export const mockSQLAnalyzer = {
  analyzeSQL: vi.fn().mockResolvedValue({
    success: true,
    parsedContent: {
      summary: 'Mock分析完成',
      allIssues: [],
      allRecommendations: [],
      sqlFixData: null,
      learning: null
    }
  }),
  analyzePerformance: vi.fn().mockResolvedValue({
    issues: [],
    score: 85
  }),
  analyzeSecurity: vi.fn().mockResolvedValue({
    vulnerabilities: [],
    score: 90
  })
};

/**
 * Mock文件分析服务
 */
export const mockFileAnalyzerService = {
  analyzeDirectory: vi.fn().mockResolvedValue({
    success: true,
    directory: '/test',
    fileCount: 5,
    results: [],
    stats: {
      successfulFiles: 5,
      failedFiles: 0,
      totalStatements: 10,
      totalIssues: 0,
      averageScore: 85
    }
  }),
  analyzeFile: vi.fn().mockResolvedValue({
    success: true,
    fileInfo: {
      fileName: 'test.sql',
      filePath: '/test.sql'
    },
    results: []
  })
};

/**
 * Mock历史服务
 */
export const mockHistoryService = {
  saveAnalysis: vi.fn().mockResolvedValue(undefined),
  getAnalysisHistory: vi.fn().mockResolvedValue([]),
  getAnalysisById: vi.fn().mockResolvedValue(null),
  deleteAnalysis: vi.fn().mockResolvedValue(true),
  clearHistory: vi.fn().mockResolvedValue(true),
  getStats: vi.fn().mockResolvedValue({
    totalAnalyses: 0,
    avgScore: 0,
    totalIssues: 0
  })
};

/**
 * Mock知识库服务
 */
export const mockKnowledgeService = {
  search: vi.fn().mockResolvedValue([]),
  add: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined)
};

/**
 * Mock结果格式化器
 */
export const mockResultFormatter = {
  displaySummary: vi.fn(),
  displayIssues: vi.fn(),
  displayRecommendations: vi.fn(),
  displaySummaryInfo: vi.fn(),
  displaySQLFix: vi.fn(),
  displayCompletionInfo: vi.fn()
};

/**
 * Mock CLI工具
 */
export const mockCliTools = {
  log: {
    analysis: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  },
  colors: {
    cyan: vi.fn((text) => text),
    green: vi.fn((text) => text),
    yellow: vi.fn((text) => text),
    red: vi.fn((text) => text),
    blue: vi.fn((text) => text),
    purple: vi.fn((text) => text),
    magenta: vi.fn((text) => text),
    gray: vi.fn((text) => text)
  }
};