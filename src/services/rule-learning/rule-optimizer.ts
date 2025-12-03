/**
 * 规则学习优化器
 * 老王我把性能监控和阈值调整合并了！减少冗余，提高效率！
 */

// 性能监控相关接口
interface SessionLog {
  sessionId: string;
  startTime: number;
  endTime?: number;
  processingTime?: number;
  duration?: number;
  status: 'running' | 'success' | 'failed' | 'completed';
  llmCalls?: number | any[];
  id?: string;
  context?: {
    databaseType: any;
    sqlLength: any;
    patternCount: unknown;
  };
  llmCallDetails?: any[];
  cacheHit?: boolean;
  rulesGenerated?: number;
  error?: string;
}

interface LLMMetrics {
  promptLength?: number;
  responseLength?: number;
  duration?: number;
}

interface PerformanceMetrics {
  totalLearningSessions: number;
  successfulSessions: number;
  failedSessions: number;
  averageProcessingTime: number;
  llmCallCounts: {
    total: number;
    byType: {
      ruleGeneration: number;
      qualityEvaluation: number;
      deepLearning: number;
    };
  };
  cacheStats: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  ruleGenerationStats: {
    totalRulesGenerated: number;
    averageRulesPerSession: number;
    qualityDistribution: {
      excellent: number;
      good: number;
      average: number;
      poor: number;
    };
  };
}

// 阈值调整相关接口
interface ThresholdAdjustmentConfig {
  enabled: boolean;
  windowSize: number;
  targetAutoApproveRate: number;
  minThreshold: number;
  maxThreshold: number;
  adjustmentStep: number;
  qualityWeight: number;
  approvalRateWeight: number;
}

interface ThresholdAdjustmentResult {
  originalThreshold: number;
  newThreshold: number;
  adjustmentReason: string;
  confidence: number;
  shouldApply: boolean;
}

/**
 * 规则学习优化器类
 * 合并性能监控和智能阈值调整功能
 */
export class RuleLearningOptimizer {
  private metrics: PerformanceMetrics;
  private sessionLogs: SessionLog[];
  private startTime: number;
  private qualityHistory: any[];
  private adjustmentHistory: any[];
  private config: ThresholdAdjustmentConfig;

  constructor() {
    // 初始化性能指标
    this.metrics = {
      totalLearningSessions: 0,
      successfulSessions: 0,
      failedSessions: 0,
      averageProcessingTime: 0,
      llmCallCounts: {
        total: 0,
        byType: {
          ruleGeneration: 0,
          qualityEvaluation: 0,
          deepLearning: 0
        }
      },
      cacheStats: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      ruleGenerationStats: {
        totalRulesGenerated: 0,
        averageRulesPerSession: 0,
        qualityDistribution: {
          excellent: 0,
          good: 0,
          average: 0,
          poor: 0
        }
      }
    };

    // 初始化会话日志
    this.sessionLogs = [];
    this.startTime = Date.now();

    // 初始化阈值调整相关
    this.qualityHistory = [];
    this.adjustmentHistory = [];
    this.config = {
      enabled: true,
      windowSize: 20, // 考虑最近20条规则的质量
      targetAutoApproveRate: 0.3, // 目标自动审批率30%
      minThreshold: 0.6,
      maxThreshold: 0.85,
      adjustmentStep: 0.05,
      qualityWeight: 0.7,
      approvalRateWeight: 0.3
    };
  }

  // ==================== 性能监控功能 ====================

  /**
   * 记录学习会话开始
   * @param context 学习上下文
   * @returns 会话ID
   */
  startLearningSession(context: any): string {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const session: SessionLog = {
      sessionId: sessionId,
      id: sessionId,
      startTime: Date.now(),
      status: 'running' as const,
      context: {
        databaseType: context.databaseType,
        sqlLength: context.sql?.length || 0,
        patternCount: this.countPatterns(context.patterns)
      },
      llmCallDetails: [],
      cacheHit: false,
      rulesGenerated: 0
    };

    this.sessionLogs.push(session);
    this.metrics.totalLearningSessions++;

    return sessionId;
  }

  /**
   * 记录LLM调用
   * @param sessionId 会话ID
   * @param callType 调用类型
   * @param details 详细信息
   */
  recordLLMCall(sessionId: string, callType: string, details: LLMMetrics = {}): void {
    const session = this.sessionLogs.find(s => s.id === sessionId || s.sessionId === sessionId);
    if (!session || !session.llmCallDetails) return;

    const callInfo = {
      type: callType,
      timestamp: Date.now(),
      promptLength: details.promptLength || 0,
      responseLength: details.responseLength || 0,
      duration: details.duration || 0
    };

    session.llmCallDetails.push(callInfo);
    if (typeof session.llmCalls === 'number') {
      session.llmCalls++;
    } else {
      session.llmCalls = 1;
    }
    this.metrics.llmCallCounts.total++;
    this.metrics.llmCallCounts.byType[callType] =
      (this.metrics.llmCallCounts.byType[callType] || 0) + 1;
  }

  /**
   * 记录缓存命中
   * @param sessionId 会话ID
   * @param hit 是否命中
   */
  recordCacheHit(sessionId: string, hit: boolean): void {
    const session = this.sessionLogs.find(s => s.id === sessionId);
    if (!session) return;

    session.cacheHit = hit;

    if (hit) {
      this.metrics.cacheStats.hits++;
    } else {
      this.metrics.cacheStats.misses++;
    }

    // 更新命中率
    const total = this.metrics.cacheStats.hits + this.metrics.cacheStats.misses;
    this.metrics.cacheStats.hitRate = total > 0 ?
      Number((this.metrics.cacheStats.hits / total * 100).toFixed(2)) : 0;
  }

  /**
   * 记录规则生成结果
   * @param sessionId 会话ID
   * @param rules 生成的规则
   */
  recordRuleGeneration(sessionId: string, rules: any[]): void {
    const session = this.sessionLogs.find(s => s.id === sessionId);
    if (!session) return;

    session.rulesGenerated = rules.length;
    session.endTime = Date.now();
    session.processingTime = session.endTime - session.startTime;

    this.metrics.ruleGenerationStats.totalRulesGenerated += rules.length;

    // 更新质量分布
    rules.forEach(rule => {
      const score = rule.evaluation?.qualityScore || 0;
      if (score >= 90) this.metrics.ruleGenerationStats.qualityDistribution.excellent++;
      else if (score >= 80) this.metrics.ruleGenerationStats.qualityDistribution.good++;
      else if (score >= 70) this.metrics.ruleGenerationStats.qualityDistribution.average++;
      else this.metrics.ruleGenerationStats.qualityDistribution.poor++;

      // 记录质量历史用于阈值调整
      this.qualityHistory.push({
        score,
        timestamp: Date.now(),
        sessionId: sessionId,
        approved: rule.approved || false
      });

      // 保持质量历史在窗口大小内
      if (this.qualityHistory.length > this.config.windowSize) {
        this.qualityHistory.shift();
      }
    });

    // 更新平均规则数
    this.metrics.ruleGenerationStats.averageRulesPerSession =
      this.metrics.ruleGenerationStats.totalRulesGenerated / this.metrics.totalLearningSessions;
  }

  /**
   * 记录会话完成
   * @param sessionId 会话ID
   * @param success 是否成功
   * @param error 错误信息（可选）
   */
  endLearningSession(sessionId: string, success: boolean, error: string | null = null): void {
    const session = this.sessionLogs.find(s => s.id === sessionId);
    if (!session) return;

    session.status = success ? 'completed' : 'failed';
    session.error = error;
    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;

    if (success) {
      this.metrics.successfulSessions++;
    } else {
      this.metrics.failedSessions++;
    }

    // 更新平均处理时间
    this.updateAverageProcessingTime();
  }

  // ==================== 阈值调整功能 ====================

  /**
   * 智能调整审批阈值
   * @param currentThreshold 当前阈值
   * @returns 调整结果
   */
  adjustThreshold(currentThreshold: number): ThresholdAdjustmentResult {
    if (!this.config.enabled || this.qualityHistory.length < 5) {
      return {
        originalThreshold: currentThreshold,
        newThreshold: currentThreshold,
        adjustmentReason: '数据不足，跳过调整',
        confidence: 0.3,
        shouldApply: false
      };
    }

    const recentQuality = this.calculateRecentAverageQuality();
    const autoApproveRate = this.calculateAutoApproveRate();

    let adjustmentReason = '';
    let newThreshold = currentThreshold;
    let shouldApply = false;

    // 根据质量得分调整
    if (recentQuality > 85 && autoApproveRate < this.config.targetAutoApproveRate) {
      newThreshold = Math.max(
        currentThreshold - this.config.adjustmentStep,
        this.config.minThreshold
      );
      adjustmentReason = `质量良好(${recentQuality.toFixed(1)})，降低阈值以提高审批率`;
      shouldApply = true;
    } else if (recentQuality < 75 || autoApproveRate > this.config.targetAutoApproveRate + 0.2) {
      newThreshold = Math.min(
        currentThreshold + this.config.adjustmentStep,
        this.config.maxThreshold
      );
      adjustmentReason = `质量偏低(${recentQuality.toFixed(1)})或审批率过高，提高阈值`;
      shouldApply = true;
    } else {
      adjustmentReason = '质量和审批率都在合理范围内，保持当前阈值';
    }

    const result: ThresholdAdjustmentResult = {
      originalThreshold: currentThreshold,
      newThreshold,
      adjustmentReason,
      confidence: this.calculateAdjustmentConfidence(recentQuality, autoApproveRate),
      shouldApply
    };

    // 记录调整历史
    if (shouldApply) {
      this.adjustmentHistory.push({
        timestamp: Date.now(),
        ...result,
        context: {
          recentQuality,
          autoApproveRate,
          windowSize: this.qualityHistory.length
        }
      });
    }

    return result;
  }

  /**
   * 计算最近平均质量得分
   * @returns 平均质量得分
   */
  private calculateRecentAverageQuality(): number {
    if (this.qualityHistory.length === 0) return 0;

    const recent = this.qualityHistory.slice(-this.config.windowSize);
    const totalScore = recent.reduce((sum, item) => sum + item.score, 0);
    return totalScore / recent.length;
  }

  /**
   * 计算自动审批率
   * @returns 自动审批率
   */
  private calculateAutoApproveRate(): number {
    if (this.qualityHistory.length === 0) return 0;

    const recent = this.qualityHistory.slice(-this.config.windowSize);
    const approvedCount = recent.filter(item => item.approved).length;
    return approvedCount / recent.length;
  }

  /**
   * 计算调整置信度
   * @param quality 质量得分
   * @param approvalRate 审批率
   * @returns 置信度
   */
  private calculateAdjustmentConfidence(quality: number, approvalRate: number): number {
    // 数据量越多，置信度越高
    const dataConfidence = Math.min(this.qualityHistory.length / this.config.windowSize, 1.0);

    // 质量和审批率与目标的偏差越大，调整的必要性越强
    const qualityDeviation = Math.abs(quality - 80); // 80是理想质量
    const approvalDeviation = Math.abs(approvalRate - this.config.targetAutoApproveRate);
    const necessityConfidence = Math.min((qualityDeviation + approvalDeviation * 100) / 50, 1.0);

    return Math.round((dataConfidence * 0.6 + necessityConfidence * 0.4) * 100) / 100;
  }

  // ==================== 通用辅助功能 ====================

  /**
   * 更新平均处理时间
   */
  private updateAverageProcessingTime(): void {
    const completedSessions = this.sessionLogs.filter(s => s.status === 'completed');
    if (completedSessions.length === 0) return;

    const totalTime = completedSessions.reduce((sum, session) =>
      sum + (session.duration || 0), 0);

    this.metrics.averageProcessingTime = Math.round(totalTime / completedSessions.length);
  }

  /**
   * 计算模式数量
   * @param patterns 模式对象
   * @returns 模式总数
   */
  private countPatterns(patterns: any): number {
    if (!patterns) return 0;
    let total = 0;
    for (const patternList of Object.values(patterns)) {
      if (Array.isArray(patternList)) {
        total += patternList.length;
      }
    }
    return total;
  }

  /**
   * 获取综合优化报告
   * @returns 综合报告
   */
  getOptimizationReport() {
    const now = Date.now();
    const uptime = now - this.startTime;

    return {
      performance: {
        summary: {
          uptime: this.formatDuration(uptime),
          totalSessions: this.metrics.totalLearningSessions,
          successRate: this.calculateSuccessRate(),
          averageProcessingTime: this.formatDuration(this.metrics.averageProcessingTime),
          averageRulesPerSession: this.metrics.ruleGenerationStats.averageRulesPerSession.toFixed(2)
        },
        llmUsage: {
          totalCalls: this.metrics.llmCallCounts.total,
          byType: { ...this.metrics.llmCallCounts.byType },
          averageCallsPerSession: this.metrics.llmCallCounts.total / Math.max(this.metrics.totalLearningSessions, 1)
        },
        cachePerformance: {
          hitRate: this.metrics.cacheStats.hitRate,
          hits: this.metrics.cacheStats.hits,
          misses: this.metrics.cacheStats.misses
        },
        ruleQuality: {
          totalGenerated: this.metrics.ruleGenerationStats.totalRulesGenerated,
          qualityDistribution: { ...this.metrics.ruleGenerationStats.qualityDistribution }
        }
      },
      thresholdAdjustment: {
        enabled: this.config.enabled,
        currentWindow: this.qualityHistory.length,
        averageQuality: this.calculateRecentAverageQuality().toFixed(2),
        autoApproveRate: (this.calculateAutoApproveRate() * 100).toFixed(1) + '%',
        adjustmentHistory: this.adjustmentHistory.slice(-5), // 最近5次调整
        recommendations: this.generateRecommendations()
      },
      recentSessions: this.getRecentSessions(5)
    };
  }

  /**
   * 生成优化建议
   * @returns 建议列表
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const avgQuality = this.calculateRecentAverageQuality();
    const approveRate = this.calculateAutoApproveRate();

    if (avgQuality < 75) {
      recommendations.push('质量得分偏低，建议提高学习样本质量或调整提示词');
    }

    if (approveRate < this.config.targetAutoApproveRate - 0.1) {
      recommendations.push('自动审批率偏低，建议适当降低审批阈值');
    }

    if (approveRate > this.config.targetAutoApproveRate + 0.1) {
      recommendations.push('自动审批率偏高，建议提高审批阈值确保规则质量');
    }

    if (this.metrics.cacheStats.hitRate < 30) {
      recommendations.push('缓存命中率偏低，建议优化缓存策略');
    }

    if (this.metrics.averageProcessingTime > 10000) {
      recommendations.push('平均处理时间较长，建议优化LLM调用或增加并发处理');
    }

    return recommendations;
  }

  /**
   * 计算成功率
   * @returns 成功率百分比
   */
  private calculateSuccessRate(): string {
    if (this.metrics.totalLearningSessions === 0) return '0%';
    return ((this.metrics.successfulSessions / this.metrics.totalLearningSessions) * 100).toFixed(2) + '%';
  }

  /**
   * 获取最近会话
   * @param count 会话数量
   * @returns 最近会话列表
   */
  private getRecentSessions(count: number) {
    return this.sessionLogs
      .slice(-count)
      .reverse()
      .map(session => ({
        id: session.id,
        status: session.status,
        duration: this.formatDuration(session.duration || 0),
        rulesGenerated: session.rulesGenerated,
        cacheHit: session.cacheHit,
        llmCalls: Array.isArray(session.llmCalls) ? session.llmCalls.length : (typeof session.llmCalls === 'number' ? session.llmCalls : 0),
        databaseType: session.context.databaseType,
        error: session.error
      }));
  }

  /**
   * 格式化持续时间
   * @param ms 毫秒数
   * @returns 格式化时间
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  /**
   * 配置更新
   * @param newConfig 新配置
   */
  updateConfig(newConfig: Partial<ThresholdAdjustmentConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 重置所有统计
   */
  reset(): void {
    // 重置性能指标
    this.metrics = {
      totalLearningSessions: 0,
      successfulSessions: 0,
      failedSessions: 0,
      averageProcessingTime: 0,
      llmCallCounts: {
        total: 0,
        byType: {
          ruleGeneration: 0,
          qualityEvaluation: 0,
          deepLearning: 0
        }
      },
      cacheStats: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      ruleGenerationStats: {
        totalRulesGenerated: 0,
        averageRulesPerSession: 0,
        qualityDistribution: {
          excellent: 0,
          good: 0,
          average: 0,
          poor: 0
        }
      }
    };

    // 重置历史数据
    this.sessionLogs = [];
    this.qualityHistory = [];
    this.adjustmentHistory = [];
    this.startTime = Date.now();
  }
}

// 创建全局实例
let optimizerInstance = null;

/**
 * 获取规则学习优化器实例
 * @returns 规则学习优化器实例
 */
export function getRuleLearningOptimizer() {
  if (!optimizerInstance) {
    optimizerInstance = new RuleLearningOptimizer();
  }
  return optimizerInstance;
}

// 为了向后兼容，导出旧名称
export const getPerformanceMonitor = getRuleLearningOptimizer;

export default RuleLearningOptimizer;