/**
 * 服务接口定义
 * 老王我搞个正经的类型定义，不再用any了！
 */

/**
 * SQL分析器接口
 */
export interface ISQLAnalyzer {
  analyzeSQL(sql: string, options?: any): Promise<any>;
  analyzePerformance?(sql: string): Promise<any>;
  analyzeSecurity?(sql: string): Promise<any>;
  analyzeStandards?(sql: string): Promise<any>;
}

/**
 * 文件分析服务接口
 */
export interface IFileAnalyzerService {
  analyzeFile(filePath: string, options?: any): Promise<any>;
  analyzeDirectory(dirPath: string, options?: any): Promise<any>;
}

/**
 * 历史服务接口
 */
export interface IHistoryService {
  saveAnalysis(analysis: any): Promise<string>;
  getAllHistory(options?: any): Promise<any[]>;
  getHistoryById(id: string): Promise<any>;
  searchHistory(query: string, options?: any): Promise<any[]>;
  getHistoryStats(): Promise<any>;
  deleteHistory(id: string): Promise<boolean>;
  clearHistory(): Promise<boolean>;
  addAnalysis?(analysis: any): Promise<string>;
}

/**
 * 知识库服务接口
 */
export interface IKnowledgeService {
  searchKnowledge(query: string, k?: number): Promise<any[]>;
  learnDocuments(options?: any): Promise<any>;
  getKnowledgeStatus(): Promise<any>;
  resetKnowledge(): Promise<any>;
}

/**
 * 结果格式化器接口
 */
export interface IResultFormatter {
  displaySummary(result: any): void;
  displayIssues(issues: any[]): void;
  displayRecommendations(recommendations: any[]): void;
  displaySummaryInfo(analysis: any): void;
  displaySQLFix(sqlFix: any): void;
  displayCompletionInfo(startTime: number): void;
}