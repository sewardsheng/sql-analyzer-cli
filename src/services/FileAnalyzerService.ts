/**
 * SQL文件分析服务
 * 老王我TM要把这个做得专业点！
 */

import fs from 'fs/promises';
import { resolve, join, dirname, extname, basename, isAbsolute } from 'pathe';
import { createSQLAnalyzer } from '../core/SQLAnalyzer.js';
import { logError } from '../utils/logger.js';

// 分析选项接口
interface FileAnalysisOptions {
  batchSize?: number;
  recursive?: boolean;
  [key: string]: any;
}

/**
 * SQL文件分析服务类
 * 专门处理SQL文件的分析、批量处理和结果管理
 */
export class FileAnalyzerService {
  private options: {
    analysisTypes: string[];
    batchSize: number;
    maxFileSize: number;
    enableCache: boolean;
    enableKnowledgeBase: boolean;
  };

  private analyzer: any;
  private supportedExtensions: string[];

  constructor(options = {}) {
    this.options = {
      // 默认分析配置
      analysisTypes: ['performance', 'security', 'standards'],
      batchSize: 10,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      enableCache: true,
      enableKnowledgeBase: true,
      ...options
    };

    // 初始化SQL分析器
    this.analyzer = createSQLAnalyzer({
      enableCaching: this.options.enableCache,
      enableKnowledgeBase: this.options.enableKnowledgeBase,
      maxConcurrency: 3
    });

    // 支持的文件扩展名
    this.supportedExtensions = ['.sql', '.SQL'];
  }

  /**
   * 分析单个SQL文件
   * @param {string} filePath - 文件路径
   * @param {Object} options - 分析选项
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeFile(filePath, options = {}) {
    try {
      // 验证文件存在性
      await this.validateFile(filePath);

      // 读取文件内容
      const fileContent = await fs.readFile(filePath, 'utf8');

      // 提取SQL语句
      const sqlStatements = this.extractSQLStatements(fileContent);

      if (sqlStatements.length === 0) {
        throw new Error('文件中没有找到有效的SQL语句');
      }

      // 合并分析选项
      const analysisOptions = {
        ...this.options,
        ...options,
        filePath,
        fileName: basename(filePath),
        fileSize: fileContent.length
      };

      // 执行批量分析
      const results = await this.analyzer.analyzeBatch(sqlStatements, analysisOptions);

      // 格式化文件级结果
      return this.formatFileResults(results, {
        filePath,
        fileName: basename(filePath),
        totalStatements: sqlStatements.length,
        successfulAnalyses: results.filter(r => r.success).length
      });

    } catch (error) {
      logError('文件分析失败', error);
      return {
        success: false,
        error: error.message,
        filePath,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 批量分析多个SQL文件
   * @param {Array<string>} filePaths - 文件路径数组
   * @param {Object} options - 分析选项
   * @returns {Promise<Array>} 分析结果数组
   */
  async analyzeFiles(filePaths: string[], options: FileAnalysisOptions = {}) {
    const results = [];
    const batchSize = options.batchSize || this.options.batchSize;

    // 分批处理文件
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      const batchPromises = batch.map(filePath => this.analyzeFile(filePath, options));

      try {
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              success: false,
              error: result.reason.message,
              filePath: batch[index]
            });
          }
        });
      } catch (error) {
        logError('批量文件分析失败', error);
        // 继续处理下一批
      }
    }

    return results;
  }

  /**
   * 分析目录中的所有SQL文件
   * @param {string} dirPath - 目录路径
   * @param {Object} options - 分析选项
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeDirectory(dirPath: string, options: FileAnalysisOptions = {}) {
    try {
      // 查找所有SQL文件
      const sqlFiles = await this.findSQLFiles(dirPath, options.recursive !== false);

      if (sqlFiles.length === 0) {
        return {
          success: true,
          message: '目录中没有找到SQL文件',
          directory: dirPath,
          fileCount: 0,
          results: []
        };
      }

      // 批量分析文件
      const results = await this.analyzeFiles(sqlFiles, options);

      // 生成目录级统计
      const stats = this.generateDirectoryStats(results);

      return {
        success: true,
        directory: dirPath,
        fileCount: sqlFiles.length,
        results,
        stats,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logError('目录分析失败', error);
      return {
        success: false,
        error: error.message,
        directory: dirPath
      };
    }
  }

  /**
   * 查找目录中的SQL文件
   * @param {string} dirPath - 目录路径
   * @param {boolean} recursive - 是否递归查找
   * @returns {Promise<Array<string>>} SQL文件路径数组
   */
  async findSQLFiles(dirPath, recursive = true) {
    const sqlFiles = [];
    const supportedExtensions = this.supportedExtensions; // 保存this引用

    const scanDirectory = async (currentPath: string) => {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(currentPath, entry.name);

          if (entry.isDirectory() && recursive) {
            // 跳过特定目录
            if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
              await scanDirectory(fullPath);
            }
          } else if (entry.isFile()) {
            // 检查文件扩展名
            const ext = extname(entry.name);
            if (supportedExtensions.includes(ext)) {
              sqlFiles.push(fullPath);
            }
          }
        }
      } catch (error) {
        logError(`扫描目录失败: ${currentPath}`, error);
      }
    };

    await scanDirectory(dirPath);
    return sqlFiles;
  }

  /**
   * 验证文件
   * @param {string} filePath - 文件路径
   * @returns {Promise<void>}
   */
  async validateFile(filePath) {
    try {
      const stats = await fs.stat(filePath);

      if (!stats.isFile()) {
        throw new Error('路径不是文件');
      }

      if (stats.size > this.options.maxFileSize) {
        throw new Error(`文件过大，最大支持 ${this.options.maxFileSize / 1024 / 1024}MB`);
      }

      const ext = extname(filePath).toLowerCase();
      if (!this.supportedExtensions.includes(ext)) {
        throw new Error(`不支持的文件类型: ${ext}`);
      }

    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('文件不存在');
      }
      throw error;
    }
  }

  /**
   * 从文件内容中提取SQL语句
   * @param {string} content - 文件内容
   * @returns {Array<string>} SQL语句数组
   */
  extractSQLStatements(content) {
    const statements = [];

    // 基础SQL语句提取逻辑
    const sqlPatterns = [
      // SELECT语句
      /select\s+.*?from\s+.*?(?:\s*;|$)/gis,
      // INSERT语句
      /insert\s+into\s+.*?(?:\s*;|$)/gis,
      // UPDATE语句
      /update\s+.*?set\s+.*?(?:\s*;|$)/gis,
      // DELETE语句
      /delete\s+from\s+.*?(?:\s*;|$)/gis,
      // CREATE语句
      /create\s+(?:table|index|view|procedure|function)\s+.*?(?:\s*;|$)/gis,
      // DROP语句
      /drop\s+(?:table|index|view|procedure|function)\s+.*?(?:\s*;|$)/gis,
      // ALTER语句
      /alter\s+table\s+.*?(?:\s*;|$)/gis
    ];

    // 提取匹配的SQL语句
    for (const pattern of sqlPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        statements.push(...matches.map(sql => sql.trim()));
      }
    }

    // 去重和清理
    const cleanedStatements = statements
      .filter(sql => sql.length > 10) // 过滤太短的语句
      .map(sql => {
        // 移除多余的空白字符
        return sql.replace(/\s+/g, ' ').trim();
      })
      .filter((sql, index, arr) => arr.indexOf(sql) === index); // 去重

    return cleanedStatements;
  }

  /**
   * 格式化文件级分析结果
   * @param {Array} results - 单个SQL的分析结果
   * @param {Object} fileInfo - 文件信息
   * @returns {Object} 格式化后的结果
   */
  formatFileResults(results, fileInfo) {
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    // 合并所有成功的结果
    const mergedAnalysis = this.mergeFileAnalyses(successfulResults);

    return {
      success: true,
      fileInfo,
      analysis: mergedAnalysis,
      statementResults: results,
      stats: {
        totalStatements: fileInfo.totalStatements,
        successfulAnalyses: fileInfo.successfulAnalyses,
        failedAnalyses: failedResults.length,
        overallScore: mergedAnalysis.overallScore || 0
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 合并文件中所有SQL的分析结果
   * @param {Array} results - 成功的分析结果
   * @returns {Object} 合并后的分析结果
   */
  mergeFileAnalyses(results) {
    if (results.length === 0) {
      return {
        summary: '没有成功的分析结果',
        issues: [],
        recommendations: [],
        overallScore: 0
      };
    }

    const merged = {
      summary: '',
      issues: [],
      recommendations: [],
      performance: {},
      security: {},
      standards: {},
      overallScore: 0,
      confidence: 0
    };

    let totalScore = 0;
    let totalConfidence = 0;
    let validResults = 0;

    results.forEach(result => {
      if (result.parsedContent) {
        const content = result.parsedContent;

        // 合并问题
        if (Array.isArray(content.issues)) {
          merged.issues.push(...content.issues.map(issue => ({
            ...issue,
            statementIndex: result.statementIndex || 0
          })));
        }

        // 合并建议
        if (Array.isArray(content.recommendations)) {
          merged.recommendations.push(...content.recommendations.map(rec => ({
            ...rec,
            statementIndex: result.statementIndex || 0
          })));
        }

        // 累积分数
        if (typeof content.overallScore === 'number') {
          totalScore += content.overallScore;
        }
        if (typeof content.confidence === 'number') {
          totalConfidence += content.confidence;
        }

        validResults++;
      }
    });

    // 计算平均分数
    if (validResults > 0) {
      merged.overallScore = Math.round(totalScore / validResults);
      merged.confidence = Math.round((totalConfidence / validResults) * 100) / 100;
    }

    // 生成文件级总结
    merged.summary = this.generateFileSummary(merged, results.length);

    return merged;
  }

  /**
   * 生成文件级分析总结
   * @param {Object} merged - 合并结果
   * @param {number} statementCount - SQL语句数量
   * @returns {string} 总结文本
   */
  generateFileSummary(merged, statementCount) {
    const parts = [];

    parts.push(`文件分析完成，共分析了${statementCount}条SQL语句。`);

    // 问题统计
    const issueCount = merged.issues.length;
    const criticalIssues = merged.issues.filter(issue =>
      issue.severity === 'critical' || issue.severity === 'high'
    ).length;

    if (issueCount > 0) {
      parts.push(`发现${issueCount}个问题，其中${criticalIssues}个需要优先处理。`);
    } else {
      parts.push('未发现明显问题。');
    }

    // 建议统计
    if (merged.recommendations.length > 0) {
      parts.push(`提供了${merged.recommendations.length}条优化建议。`);
    }

    // 总体评分
    if (merged.overallScore > 0) {
      let scoreLevel = '良好';
      if (merged.overallScore >= 90) scoreLevel = '优秀';
      else if (merged.overallScore >= 80) scoreLevel = '良好';
      else if (merged.overallScore >= 60) scoreLevel = '一般';
      else scoreLevel = '需要改进';

      parts.push(`文件总体评分：${merged.overallScore}分（${scoreLevel}）`);
    }

    return parts.join(' ');
  }

  /**
   * 生成目录级统计
   * @param {Array} results - 文件分析结果数组
   * @returns {Object} 统计信息
   */
  generateDirectoryStats(results) {
    const successfulFiles = results.filter(r => r.success);
    const failedFiles = results.filter(r => !r.success);

    let totalStatements = 0;
    let totalIssues = 0;
    let totalRecommendations = 0;
    let totalScore = 0;
    let validScores = 0;

    successfulFiles.forEach(fileResult => {
      if (fileResult.stats) {
        totalStatements += fileResult.stats.totalStatements || 0;
      }
      if (fileResult.analysis) {
        totalIssues += (fileResult.analysis.issues || []).length;
        totalRecommendations += (fileResult.analysis.recommendations || []).length;
        if (fileResult.analysis.overallScore > 0) {
          totalScore += fileResult.analysis.overallScore;
          validScores++;
        }
      }
    });

    return {
      totalFiles: results.length,
      successfulFiles: successfulFiles.length,
      failedFiles: failedFiles.length,
      totalStatements,
      totalIssues,
      totalRecommendations,
      averageScore: validScores > 0 ? Math.round(totalScore / validScores) : 0
    };
  }

  /**
   * 获取分析器统计信息
   * @returns {Object} 统计信息
   */
  getAnalyzerStats() {
    return this.analyzer.getStats();
  }

  /**
   * 重置分析器统计
   */
  resetStats() {
    this.analyzer.resetStats();
  }

  /**
   * 清理缓存
   */
  cleanup() {
    this.analyzer.cleanup();
  }
}

/**
 * 创建文件分析服务实例
 * @param {Object} options - 配置选项
 * @returns {FileAnalyzerService} 文件分析服务实例
 */
export function createFileAnalyzerService(options = {}) {
  return new FileAnalyzerService(options);
}

export default FileAnalyzerService;