/**
 * 增强型SQL分析器
 * 集成智能上下文管理系统，告别SB的原始分析模式
 */

// @ts-ignore
import { createTool, ToolFactory, sortToolsByPriority } from './tools/index.js';
// @ts-ignore
import { createContextManager, createSmartPromptBuilder } from './context/index.js';
// @ts-ignore
import { getLLMService } from './llm-service.js';
// @ts-ignore
import { retrieveKnowledge } from './knowledge/knowledge-base.js';
import { logError } from '../utils/logger.js';
// @ts-ignore
import { config } from '../config/index.js';
import type {
  AnalysisContext,
  AnalysisType,
  AnalysisOptions,
  ToolExecutionResult,
  ParsedAnalysisContent,
  AnalyzerStats
} from '../types/index.js';

/**
 * 分析器选项接口
 */
interface AnalyzerOptions {
  enableCaching?: boolean;
  enableKnowledgeBase?: boolean;
  maxConcurrency?: number;
}

/**
 * 分析器统计接口
 */
interface InternalStats {
  totalAnalyses: number;
  successfulAnalyses: number;
  totalDuration: number;
  cacheHits: number;
  errors: number;
}

/**
 * 分析结果接口
 */
interface AnalysisResult {
  success: boolean;
  summary?: string;
  issues: any[];
  recommendations: any[];
  performance: any;
  security: any;
  standards: any;
  tools: any[];
  overallScore: number;
  confidence: number;
  metadata: {
    sql: string;
    databaseType: string;
    analysisTypes: AnalysisType[];
    error?: {
      message: string;
      stack: string;
    };
    timestamp: string;
  };
  error?: string;
}

/**
 * 合并结果参数接口
 */
interface MergeResultParams {
  sql: string;
  databaseType: string;
  analysisTypes: AnalysisType[];
  options: AnalysisOptions;
  duration: number;
}

/**
 * 增强型SQL分析器类
 */
export class EnhancedSQLAnalyzer {
  private options: Required<AnalyzerOptions>;
  private llmService: any;
  private knowledgeBase: any;
  private toolFactory: ToolFactory;
  private contextManager: any;
  private promptBuilder: any;
  private stats: InternalStats;

  constructor(options: AnalyzerOptions = {}) {
    this.options = {
      enableCaching: true,
      enableKnowledgeBase: true,
      maxConcurrency: 3,
      ...options
    } as Required<AnalyzerOptions>;

    // 初始化核心服务
    this.llmService = getLLMService();
    this.knowledgeBase = null;

    // 初始化工具工厂
    this.toolFactory = new ToolFactory(
      this.llmService,
      null, // 延迟初始化知识库
      {
        enableCaching: this.options.enableCaching
      }
    );

    // 初始化上下文管理器
    this.contextManager = createContextManager(this.llmService, this.knowledgeBase);
    this.promptBuilder = createSmartPromptBuilder();

    // 分析统计
    this.stats = {
      totalAnalyses: 0,
      successfulAnalyses: 0,
      totalDuration: 0,
      cacheHits: 0,
      errors: 0
    };

    // 异步初始化知识库
    this.initKnowledgeBase();
  }

  /**
   * 初始化知识库
   */
  private async initKnowledgeBase(): Promise<void> {
    try {
      if (this.options.enableKnowledgeBase && config.get('knowledge.enabled')) {
        // 这里应该初始化知识库实例
        // this.knowledgeBase = await createKnowledgeBase();
      }
    } catch (error) {
      logError('知识库初始化失败', error as Error);
    }
  }

  /**
   * 分析单条SQL（增强版）
   * @param sql SQL语句
   * @param options 分析选项
   * @returns 分析结果
   */
  async analyzeSQL(sql: string, options: AnalysisOptions = {}): Promise<AnalysisResult> {
    const startTime = Date.now();
    this.stats.totalAnalyses++;

    try {
      // 验证输入
      if (!sql || typeof sql !== 'string') {
        throw new Error('无效的SQL语句');
      }

      // 解析分析选项
      const analysisTypes = this.parseAnalysisTypes(options);
      const databaseType = options.databaseType || 'auto-detected';

      // 根据优先级排序分析类型
      const sortedTypes = sortToolsByPriority(analysisTypes);

      // 并行执行分析
      const analysisResults = await this.executeParallelAnalysis(
        sql,
        databaseType,
        sortedTypes,
        options
      );

      // 合并分析结果
      const mergedResult = this.mergeAnalysisResults(analysisResults, {
        sql,
        databaseType,
        analysisTypes: sortedTypes,
        options,
        duration: Date.now() - startTime
      });

      this.stats.successfulAnalyses++;
      this.stats.totalDuration += Date.now() - startTime;

      return mergedResult;

    } catch (error) {
      this.stats.errors++;
      return this.handleAnalysisError(error as Error, sql, options);
    }
  }

  /**
   * 批量分析SQL语句
   * @param sqlStatements SQL语句数组
   * @param options 分析选项
   * @returns 批量分析结果
   */
  async analyzeBatch(sqlStatements: string[], options: AnalysisOptions = {}): Promise<AnalysisResult[]> {
    if (!Array.isArray(sqlStatements)) {
      throw new Error('SQL语句必须是数组');
    }

    // 使用信号量控制并发
    const semaphore = new Array(this.options.maxConcurrency).fill(null);
    const results: AnalysisResult[] = [];

    for (let i = 0; i < sqlStatements.length; i++) {
      // 等待有空闲槽位
      await this.waitForSlot(semaphore, i);

      // 开始分析
      const slotIndex = i % this.options.maxConcurrency;
      semaphore[slotIndex] = this.analyzeSQL(sqlStatements[i], options)
        .then(result => {
          results[i] = result;
          semaphore[slotIndex] = null;
        })
        .catch(error => {
          results[i] = this.handleAnalysisError(error, sqlStatements[i], options);
          semaphore[slotIndex] = null;
        });
    }

    // 等待所有分析完成
    await Promise.all(semaphore.filter(Boolean));

    return results;
  }

  /**
   * 等待空闲槽位
   * @param semaphore 信号量数组
   * @param index 当前索引
   */
  private async waitForSlot(semaphore: (Promise<void> | null)[], index: number): Promise<void> {
    const slotIndex = index % this.options.maxConcurrency;
    if (semaphore[slotIndex]) {
      await semaphore[slotIndex];
    }
  }

  /**
   * 解析分析类型
   * @param options 分析选项
   * @returns 分析类型数组
   */
  private parseAnalysisTypes(options: AnalysisOptions): AnalysisType[] {
    const types: AnalysisType[] = [];

    // 从选项中提取分析类型
    if (options.performance !== false) types.push('performance');
    if (options.security !== false) types.push('security');
    if (options.standards !== false) types.push('standards');

    // 如果指定了特定的分析类型，使用指定类型
    if (options.analysisTypes && options.analysisTypes.length > 0) {
      return options.analysisTypes;
    }

    // 默认返回所有类型
    return types.length > 0 ? types : ['performance', 'security', 'standards'];
  }

  /**
   * 并行执行分析
   * @param sql SQL语句
   * @param databaseType 数据库类型
   * @param analysisTypes 分析类型数组
   * @param options 分析选项
   * @returns 分析结果数组
   */
  private async executeParallelAnalysis(
    sql: string,
    databaseType: string,
    analysisTypes: AnalysisType[],
    options: AnalysisOptions
  ): Promise<ToolExecutionResult[]> {
    // 构建分析上下文
    const context = await this.contextManager.buildAnalysisContext({
      sql,
      databaseType,
      analysisTypes,
      options
    });

    // 创建分析工具
    const tools = analysisTypes.map(type =>
      createTool(type, this.llmService, {
        enableCaching: this.options.enableCaching,
        knowledgeBase: this.knowledgeBase
      })
    );

    // 并行执行所有工具
    const promises = tools.map(async (tool, index) => {
      try {
        const result = await tool.execute({
          sql,
          databaseType,
          options
        });

        if (result.success) {
          this.stats.cacheHits++;
        }

        return result;
      } catch (error) {
        logError(`工具执行失败: ${analysisTypes[index]}`, error as Error);
        return {
          success: false,
          tool: analysisTypes[index],
          analysisType: analysisTypes[index],
          rawContent: '',
          parsedContent: {
            summary: '分析失败',
            issues: [],
            recommendations: []
          },
          error: (error as Error).message,
          duration: 0,
          usage: {},
          context: { databaseType, sqlLength: sql.length },
          timestamp: new Date().toISOString()
        } as ToolExecutionResult;
      }
    });

    return Promise.all(promises);
  }

  /**
   * 合并分析结果
   * @param results 分析结果数组
   * @param params 合并参数
   * @returns 合并后的结果
   */
  private mergeAnalysisResults(
    results: ToolExecutionResult[],
    params: MergeResultParams
  ): AnalysisResult {
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    // 如果所有工具都失败了
    if (successfulResults.length === 0) {
      return {
        success: false,
        error: '所有分析工具都执行失败',
        summary: '分析过程中发生错误',
        issues: [],
        recommendations: [],
        performance: {},
        security: {},
        standards: {},
        tools: results,
        overallScore: 0,
        confidence: 0,
        metadata: {
          sql: params.sql.substring(0, 100) + (params.sql.length > 100 ? '...' : ''),
          databaseType: params.databaseType,
          analysisTypes: params.analysisTypes,
          timestamp: new Date().toISOString()
        }
      };
    }

    // 合并问题
    const allIssues = successfulResults.flatMap(r =>
      r.parsedContent?.issues || []
    );

    // 合并建议
    const allRecommendations = successfulResults.flatMap(r =>
      r.parsedContent?.recommendations || []
    );

    // 计算整体评分
    const scores = successfulResults
      .map(r => r.parsedContent?.overallScore)
      .filter((score): score is number => score !== undefined);

    const overallScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    // 计算置信度
    const confidenceScores = successfulResults
      .map(r => r.parsedContent?.confidence)
      .filter((score): score is number => score !== undefined);

    const confidence = confidenceScores.length > 0
      ? Math.round((confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length) * 100)
      : 0;

    // 提取特定类型的指标
    const performanceResult = successfulResults.find(r => r.analysisType === 'performance');
    const securityResult = successfulResults.find(r => r.analysisType === 'security');
    const standardsResult = successfulResults.find(r => r.analysisType === 'standards');

    // 生成总结
    const summary = this.generateSummary(allIssues, allRecommendations, params.analysisTypes);

    return {
      success: true,
      summary,
      issues: allIssues,
      recommendations: allRecommendations,
      performance: performanceResult?.parsedContent?.performanceMetrics || {},
      security: securityResult?.parsedContent?.securityAssessment || {},
      standards: standardsResult?.parsedContent || {},
      tools: results,
      overallScore,
      confidence,
      metadata: {
        sql: params.sql.substring(0, 100) + (params.sql.length > 100 ? '...' : ''),
        databaseType: params.databaseType,
        analysisTypes: params.analysisTypes,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * 生成分析总结
   * @param issues 问题列表
   * @param recommendations 建议列表
   * @param analysisTypes 分析类型
   * @returns 总结文本
   */
  private generateSummary(
    issues: any[],
    recommendations: any[],
    analysisTypes: AnalysisType[]
  ): string {
    const criticalIssues = issues.filter(i => i.severity === 'critical' || i.severity === 'high').length;
    const totalIssues = issues.length;
    const totalRecommendations = recommendations.length;

    let summary = `SQL分析完成。发现 ${totalIssues} 个问题，提供 ${totalRecommendations} 条建议。`;

    if (criticalIssues > 0) {
      summary += `其中 ${criticalIssues} 个为高优先级问题需要立即处理。`;
    }

    const analysisText = analysisTypes.join('、');
    summary += `本次分析涵盖：${analysisText}。`;

    return summary;
  }

  /**
   * 处理分析错误
   * @param error 错误对象
   * @param sql SQL语句
   * @param options 分析选项
   * @returns 错误结果
   */
  private handleAnalysisError(error: Error, sql: string, options: AnalysisOptions): AnalysisResult {
    logError('SQL分析失败', error);

    return {
      success: false,
      error: error.message,
      summary: '分析过程中发生错误',
      issues: [],
      recommendations: [],
      performance: {},
      security: {},
      standards: {},
      tools: [],
      overallScore: 0,
      confidence: 0,
      metadata: {
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        databaseType: options.databaseType || 'unknown',
        analysisTypes: this.parseAnalysisTypes(options),
        error: {
          message: error.message,
          stack: error.stack || ''
        },
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * 获取分析统计信息
   * @returns 统计信息
   */
  getStats(): AnalyzerStats {
    return {
      ...this.stats,
      averageDuration: this.stats.totalAnalyses > 0 ?
        Math.round(this.stats.totalDuration / this.stats.totalAnalyses) : 0,
      successRate: this.stats.totalAnalyses > 0 ?
        (this.stats.successfulAnalyses / this.stats.totalAnalyses * 100).toFixed(2) + '%' : '0%',
      cacheHitRate: this.stats.totalAnalyses > 0 ?
        (this.stats.cacheHits / this.stats.totalAnalyses * 100).toFixed(2) + '%' : '0%',
      toolStats: {
        size: 3, // 性能、安全、规范三个工具
        supportedTypes: 3
      }
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalAnalyses: 0,
      successfulAnalyses: 0,
      totalDuration: 0,
      cacheHits: 0,
      errors: 0
    };
  }

  /**
   * 更新配置
   * @param newOptions 新选项
   */
  updateOptions(newOptions: AnalyzerOptions): void {
    this.options = { ...this.options, ...newOptions } as Required<AnalyzerOptions>;

    // 重新初始化相关组件
    if (newOptions.enableCaching !== undefined) {
      this.toolFactory.updateConfig({ enableCaching: newOptions.enableCaching });
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    // 清理工具工厂缓存
    this.toolFactory?.clearCache();

    // 清理上下文管理器缓存
    this.contextManager?.clearCache();

    // 清理提示词构建器缓存
    this.promptBuilder?.clearCache();
  }
}

/**
 * 创建增强型SQL分析器实例
 * @param options 分析器选项
 * @returns 分析器实例
 */
export function createEnhancedSQLAnalyzer(options: AnalyzerOptions = {}): EnhancedSQLAnalyzer {
  return new EnhancedSQLAnalyzer(options);
}

export default EnhancedSQLAnalyzer;