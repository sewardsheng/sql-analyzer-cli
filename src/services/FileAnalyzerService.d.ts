/**
 * FileAnalyzerService类型声明
 */

export declare class FileAnalyzerService {
  analyzeFile(filePath: string, options?: any): Promise<any>;
  analyzeDirectory(dirPath: string, options?: any): Promise<any>;
  getAnalyzerStats(): any;
}