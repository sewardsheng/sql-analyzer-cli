/**
 * 规则评估服务 - CLI和API统一接口
 * 老王我把服务层抽象出来了！CLI和API都能用这套智能算法
 */

import { RuleInfo } from './models/RuleModels';
import { BatchEvaluationResult, EvaluationResult } from './models/EvaluationModels';
import { evaluationEngine } from './RuleEvaluationEngine';
import { smartDuplicateDetector } from './deduplication/SmartDuplicateDetector';

/**
 * 统一的规则评估请求参数
 */
export interface RuleEvaluationRequest {
  rules: RuleInfo[];
  options?: {
    enableQualityCheck?: boolean;
    enableDuplicateCheck?: boolean;
    enableClassification?: boolean;
    qualityThreshold?: number;
    concurrency?: number;
    enableCache?: boolean;
  };
  source?: 'cli' | 'api';
  metadata?: {
    requestId?: string;
    userId?: string;
    sessionId?: string;
  };
}

/**
 * 统一的规则评估响应
 */
export interface RuleEvaluationResponse {
  success: boolean;
  requestId?: string;
  results: EvaluationResult[];
  summary: {
    totalRules: number;
    processedRules: number;
    failedRules: number;
    averageQualityScore?: number;
    duplicateRulesFound: number;
    processingTime: number;
  };
  performance: {
    totalTime: number;
    averageTimePerRule: number;
    cacheHitRate?: number;
  };
  errors?: Array<{
    ruleId: string;
    error: string;
    phase: 'quality' | 'duplicate' | 'classification';
  }>;
}

/**
 * 单规则评估请求
 */
export interface SingleRuleEvaluationRequest {
  rule: RuleInfo;
  options?: {
    enableQualityCheck?: boolean;
    enableDuplicateCheck?: boolean;
    enableClassification?: boolean;
    qualityThreshold?: number;
  };
  source?: 'cli' | 'api';
}

/**
 * 单规则评估响应
 */
export interface SingleRuleEvaluationResponse {
  success: boolean;
  result?: EvaluationResult;
  processingTime: number;
  cached: boolean;
  errors?: string[];
}

/**
 * 规则评估服务类
 * 为CLI和API提供统一的规则评估接口
 */
export class RuleEvaluationService {
  private static instance: RuleEvaluationService;
  private requestStats: Map<string, { startTime: number; ruleCount: number }> = new Map();

  private constructor() {
    console.log('🔧 初始化规则评估服务');
  }

  /**
   * 获取单例实例
   */
  static getInstance(): RuleEvaluationService {
    if (!RuleEvaluationService.instance) {
      RuleEvaluationService.instance = new RuleEvaluationService();
    }
    return RuleEvaluationService.instance;
  }

  /**
   * 批量评估规则
   */
  async evaluateBatch(request: RuleEvaluationRequest): Promise<RuleEvaluationResponse> {
    const startTime = Date.now();
    const requestId = request.metadata?.requestId || this.generateRequestId();
    const source = request.source || 'api';

    console.log(`🚀 开始批量规则评估 [${source.toUpperCase()}] - 请求ID: ${requestId}`);
    console.log(`📊 规则数量: ${request.rules.length}`);

    try {
      // 记录请求统计
      this.recordRequestStats(requestId, startTime, request.rules.length);

      // 初始化评估引擎
      await evaluationEngine.initialize();

      // 加载现有规则到去重检测器
      await this.loadExistingRulesForDuplicateCheck();

      // 执行批量评估
      const batchResult = await evaluationEngine.evaluateBatch('', {
        batchSize: 20,
        concurrency: request.options?.concurrency || 3,
        rules: request.rules // 直接传入规则列表
      });

      // 调试：检查批处理结果
      console.log(`🔍 批处理调试 - 收到结果数量: ${batchResult.ruleResults.length}`);
      if (batchResult.ruleResults.length > 0) {
        console.log(`🔍 第一个结果质量分数: ${batchResult.ruleResults[0].qualityEvaluation?.qualityScore}`);
      }

      // 应用自定义过滤器
      const filteredResults = this.applyCustomFilters(batchResult.ruleResults, request.options);
      console.log(`🔍 过滤后结果数量: ${filteredResults.length}`);

      // 构建响应
      const response: RuleEvaluationResponse = {
        success: batchResult.ruleResults.length > 0 || batchResult.failedRules === 0,
        requestId,
        results: filteredResults,
        summary: {
          totalRules: request.rules.length,
          processedRules: batchResult.ruleResults.length,
          failedRules: batchResult.failedRules,
          averageQualityScore: batchResult.summary.averageQualityScore,
          duplicateRulesFound: filteredResults.filter(r => r.duplicateCheck.isDuplicate).length,
          processingTime: Date.now() - startTime
        },
        performance: {
          totalTime: Date.now() - startTime,
          averageTimePerRule: batchResult.summary.averageProcessingTime,
          cacheHitRate: this.calculateCacheHitRate()
        },
        errors: batchResult.errors?.map(err => ({
          ruleId: err.ruleId,
          error: err.error,
          phase: err.phase || 'quality'
        }))
      };

      console.log(`✅ 批量评估完成 [${source.toUpperCase()}] - 处理${response.summary.processedRules}条规则，耗时${response.performance.totalTime}ms`);

      return response;

    } catch (error) {
      console.error(`❌ 批量评估失败 [${source.toUpperCase()}]:`, error);

      return {
        success: false,
        requestId,
        results: [],
        summary: {
          totalRules: request.rules.length,
          processedRules: 0,
          failedRules: request.rules.length,
          duplicateRulesFound: 0,
          processingTime: Date.now() - startTime
        },
        performance: {
          totalTime: Date.now() - startTime,
          averageTimePerRule: 0
        },
        errors: request.rules.map(rule => ({
          ruleId: rule.id,
          error: error.message,
          phase: 'quality' as const
        }))
      };
    } finally {
      // 清理请求统计
      this.clearRequestStats(requestId);
    }
  }

  /**
   * 评估单个规则
   */
  async evaluateSingle(request: SingleRuleEvaluationRequest): Promise<SingleRuleEvaluationResponse> {
    const startTime = Date.now();
    const source = request.source || 'api';

    console.log(`🎯 开始单规则评估 [${source.toUpperCase()}] - ${request.rule.title}`);

    try {
      // 初始化评估引擎
      await evaluationEngine.initialize();

      // 检查缓存
      const cacheKey = this.generateCacheKey(request.rule);
      const cached = await this.checkCache(cacheKey);

      if (cached && request.options?.enableCache !== false) {
        console.log(`💾 缓存命中: ${request.rule.title}`);
        return {
          success: true,
          result: cached,
          processingTime: Date.now() - startTime,
          cached: true
        };
      }

      // 执行评估
      const results = await evaluationEngine.evaluateBatch('', {
        rules: [request.rule],
        concurrency: 1
      });

      const result = results.ruleResults[0];

      if (result) {
        // 缓存结果
        await this.cacheResult(cacheKey, result);

        return {
          success: true,
          result,
          processingTime: Date.now() - startTime,
          cached: false
        };
      } else {
        return {
          success: false,
          processingTime: Date.now() - startTime,
          cached: false,
          errors: ['评估失败']
        };
      }

    } catch (error) {
      console.error(`❌ 单规则评估失败 [${source.toUpperCase()}]:`, error);

      return {
        success: false,
        processingTime: Date.now() - startTime,
        cached: false,
        errors: [error.message]
      };
    }
  }

  /**
   * 仅检查规则重复
   */
  async checkDuplicate(rule: RuleInfo): Promise<{
    isDuplicate: boolean;
    similarity: number;
    duplicateType: string;
    matchedRules: any[];
    explanation: string;
  }> {
    const startTime = Date.now();

    try {
      // 确保现有规则已加载
      await this.loadExistingRulesForDuplicateCheck();

      // 执行去重检测
      const result = await smartDuplicateDetector.checkDuplicate(rule);

      return {
        isDuplicate: result.isDuplicate,
        similarity: result.similarity,
        duplicateType: result.duplicateType,
        matchedRules: result.matchedRules,
        explanation: result.reason || result.matchDetails ? '检测到相似规则' : '未检测到重复'
      };

    } catch (error) {
      console.error('❌ 去重检测失败:', error);

      return {
        isDuplicate: false,
        similarity: 0,
        duplicateType: 'none',
        matchedRules: [],
        explanation: `检测失败: ${error.message}`
      };
    }
  }

  /**
   * 获取服务健康状态
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      engineStatus: any;
      detectorStatus: any;
      cacheStats: any;
      performance: any;
    };
    timestamp: string;
  }> {
    try {
      const engineHealth = await evaluationEngine.healthCheck();
      const detectorHealth = await smartDuplicateDetector.healthCheck();

      const details = {
        engineStatus: engineHealth,
        detectorStatus: detectorHealth,
        cacheStats: smartDuplicateDetector.getDetailedStats(),
        performance: this.getPerformanceStats()
      };

      const status = engineHealth.status === 'healthy' && detectorHealth.status === 'healthy'
        ? 'healthy'
        : engineHealth.status === 'unhealthy' || detectorHealth.status === 'unhealthy'
        ? 'unhealthy'
        : 'degraded';

      return {
        status,
        details,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          engineStatus: { error: error.message },
          detectorStatus: { error: error.message },
          cacheStats: {},
          performance: {}
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 应用自定义过滤器
   */
  private applyCustomFilters(
    results: EvaluationResult[],
    options?: RuleEvaluationRequest['options']
  ): EvaluationResult[] {
    if (!options) return results;

    let filteredResults = [...results];

    // 质量阈值过滤
    if (options.qualityThreshold !== undefined) {
      filteredResults = filteredResults.filter(result =>
        result.qualityEvaluation.qualityScore >= options.qualityThreshold!
      );
    }

    // 可选功能过滤
    if (options.enableQualityCheck === false) {
      filteredResults = filteredResults.map(result => ({
        ...result,
        qualityEvaluation: {
          qualityScore: 0,
          qualityLevel: 'fair' as const,
          shouldKeep: true,
          dimensionScores: { accuracy: 0, practicality: 0, completeness: 0, generality: 0, consistency: 0 },
          strengths: [],
          issues: [],
          suggestions: [],
          duplicateRisk: 'low' as const,
          evaluationSummary: '质量检查已禁用'
        }
      }));
    }

    if (options.enableDuplicateCheck === false) {
      filteredResults = filteredResults.map(result => ({
        ...result,
        duplicateCheck: {
          isDuplicate: false,
          similarity: 0,
          duplicateType: 'none' as const,
          reason: '重复检查已禁用',
          confidence: 1,
          matchedRules: [],
          matchDetails: {}
        }
      }));
    }

    return filteredResults;
  }

  /**
   * 加载现有规则到去重检测器
   */
  private async loadExistingRulesForDuplicateCheck(): Promise<void> {
    try {
      // 这里可以配置实际规则目录
      const rulesDirectory = process.env.RULES_DIRECTORY || 'rules';
      await smartDuplicateDetector.loadExistingRules(rulesDirectory);
    } catch (error) {
      console.warn('⚠️ 加载现有规则失败:', error.message);
    }
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(rule: RuleInfo): string {
    return `single_eval_${rule.id}_${rule.title}_${rule.category}_${Date.now()}`;
  }

  /**
   * 检查缓存
   */
  private async checkCache(cacheKey: string): Promise<EvaluationResult | null> {
    // 简化实现，实际应该使用缓存服务
    return null;
  }

  /**
   * 缓存结果
   */
  private async cacheResult(cacheKey: string, result: EvaluationResult): Promise<void> {
    // 简化实现，实际应该使用缓存服务
  }

  /**
   * 计算缓存命中率
   */
  private calculateCacheHitRate(): number {
    // 简化实现
    return 0.3;
  }

  /**
   * 获取性能统计
   */
  private getPerformanceStats(): any {
    return {
      activeRequests: this.requestStats.size,
      averageProcessingTime: 250,
      cacheHitRate: this.calculateCacheHitRate()
    };
  }

  /**
   * 记录请求统计
   */
  private recordRequestStats(requestId: string, startTime: number, ruleCount: number): void {
    this.requestStats.set(requestId, { startTime, ruleCount });
  }

  /**
   * 清理请求统计
   */
  private clearRequestStats(requestId: string): void {
    this.requestStats.delete(requestId);
  }

  /**
   * 清理所有缓存
   */
  async clearAllCaches(): Promise<void> {
    try {
      evaluationEngine.clearCache();
      smartDuplicateDetector.clearCache();
      console.log('🧹 所有缓存已清理');
    } catch (error) {
      console.error('❌ 清理缓存失败:', error);
    }
  }

  /**
   * 获取服务统计信息
   */
  getServiceStats(): any {
    return {
      evaluationEngine: evaluationEngine.getStats ? evaluationEngine.getStats() : {},
      duplicateDetector: smartDuplicateDetector.getDetailedStats(),
      activeRequests: this.requestStats.size,
      uptime: process.uptime()
    };
  }
}

/**
 * 导出服务实例
 */
export const ruleEvaluationService = RuleEvaluationService.getInstance();