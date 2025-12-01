/**
 * 质量评估引擎
 * 老王我把质量评估做得非常全面！多维度分析规则质量，LLM辅助评估！
 */

import { RuleFileContent, BaseRule } from '../models/RuleModels.js';
import { QualityEvaluationResult, QualityDimension } from '../models/EvaluationModels.js';
import { getQualityAssessmentConfig } from '../config/EvaluationConfig.js';
import { callLLM } from '../utils/llm-utils.js';
import {
  isValidSQLPattern,
  usesCorrectTechnicalTerms,
  isAppropriateSeverity,
  isValidCategory,
  hasVagueLanguage,
  hasTechnicalErrors,
  addressesCommonProblem,
  hasPracticalScenarios,
  isActionable,
  isTooTheoretical,
  lacksPracticalValue,
  hasClearProblemDescription,
  hasCompleteSolution,
  mentionsImpact,
  considersEdgeCases,
  hasMissingInformation,
  isIncomplete,
  isDatabaseAgnostic,
  hasBroadApplicability,
  isEnvironmentIndependent,
  isScalable,
  isTooSpecific,
  dependsOnSpecificTools,
  hasInternalConsistency,
  usesConsistentTerminology,
  alignsWithStandards,
  followsFormatStandards,
  hasContradictions,
  hasInconsistentTerminology,
  identifyStrengths,
  identifyIssues,
  generateSuggestions
} from './QualityAnalysisHelpers.js';

/**
 * 质量评估指标接口
 */
export interface QualityMetrics {
  accuracy: number;          // 准确性 (0-100)
  practicality: number;      // 实用性 (0-100)
  completeness: number;      // 完整性 (0-100)
  generality: number;        // 通用性 (0-100)
  consistency: number;       // 一致性 (0-100)
  overall: number;           // 综合分数 (0-100)
}

/**
 * 质量分析结果
 */
export interface QualityAnalysis {
  metrics: QualityMetrics;
  strengths: string[];       // 优势
  issues: string[];          // 问题
  suggestions: string[];     // 改进建议
  qualityLevel: 'excellent' | 'good' | 'acceptable' | 'poor';
  shouldKeep: boolean;       // 是否建议保留
  confidence: number;        // 评估置信度
  evaluationTime: number;    // 评估耗时
}

/**
 * 质量评估器类
 * 使用多维度分析和LLM辅助评估规则质量
 */
export class QualityAssessmentEngine {
  private config = getQualityAssessmentConfig();
  private cache: Map<string, QualityAnalysis> = new Map();

  constructor() {
    console.log('🔧 质量评估引擎初始化完成');
  }

  /**
   * 评估规则质量
   */
  async assessQuality(ruleContent: RuleFileContent): Promise<QualityEvaluationResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(ruleContent);

    // 检查缓存
    if (this.cache.has(cacheKey)) {
      console.debug(`🎯 质量评估缓存命中: ${ruleContent.rule.title}`);
      return this.convertToEvaluationResult(this.cache.get(cacheKey)!);
    }

    console.debug(`🔍 开始质量评估: ${ruleContent.rule.title}`);

    try {
      // 1. 基础质量分析
      const basicAnalysis = this.performBasicQualityAnalysis(ruleContent);

      // 2. 深度质量分析（如果启用LLM）
      let deepAnalysis: Partial<QualityAnalysis> = {};
      if (this.config.llm.model) {
        deepAnalysis = await this.performLLMAnalysis(ruleContent);
      }

      // 3. 综合分析结果
      const finalAnalysis = this.combineAnalyses(basicAnalysis, deepAnalysis);
      finalAnalysis.evaluationTime = Date.now() - startTime;

      // 缓存结果
      this.cache.set(cacheKey, finalAnalysis);
      this.limitCacheSize();

      console.debug(`✅ 质量评估完成: ${finalAnalysis.metrics.overall.toFixed(1)}分 (${finalAnalysis.evaluationTime}ms)`);

      return this.convertToEvaluationResult(finalAnalysis);

    } catch (error) {
      console.warn(`质量评估失败: ${error.message}`);

      // 返回保守的评估结果
      return this.createFallbackResult(ruleContent, Date.now() - startTime);
    }
  }

  /**
   * 执行基础质量分析
   */
  private performBasicQualityAnalysis(ruleContent: RuleFileContent): QualityAnalysis {
    const rule = ruleContent.rule;
    const metrics: QualityMetrics = {
      accuracy: this.assessAccuracy(ruleContent),
      practicality: this.assessPracticality(ruleContent),
      completeness: this.assessCompleteness(ruleContent),
      generality: this.assessGenerality(ruleContent),
      consistency: this.assessConsistency(ruleContent),
      overall: 0
    };

    // 计算综合分数
    metrics.overall = this.calculateOverallScore(metrics);

    // 生成分析结果
    const analysis: QualityAnalysis = {
      metrics,
      strengths: identifyStrengths(ruleContent, metrics),
      issues: identifyIssues(ruleContent, metrics),
      suggestions: generateSuggestions(ruleContent, metrics),
      qualityLevel: this.determineQualityLevel(metrics.overall),
      shouldKeep: metrics.overall >= this.config.thresholds.keep,
      confidence: this.calculateConfidence(metrics),
      evaluationTime: 0 // 将在上级方法中设置
    };

    return analysis;
  }

  /**
   * 评估准确性
   */
  private assessAccuracy(ruleContent: RuleFileContent): number {
    let score = 50; // 基础分数

    const { rule, analysisContext } = ruleContent;

    // 1. 标题描述清晰度 (+15)
    if (rule.title && rule.title.length >= 10 && rule.title.length <= 100) {
      score += 15;
    }

    // 2. 描述详细程度 (+20)
    if (rule.description && rule.description.length >= 50) {
      score += 20;
    }

    // 3. SQL模式准确性 (+15)
    if (rule.sqlPattern && isValidSQLPattern(rule.sqlPattern)) {
      score += 15;
    }

    // 4. 技术术语正确性 (+10)
    if (usesCorrectTechnicalTerms(ruleContent)) {
      score += 10;
    }

    // 5. 严重程度合理性 (+10)
    if (isAppropriateSeverity(rule)) {
      score += 10;
    }

    // 6. 类别分类准确性 (+10)
    if (isValidCategory(rule.category)) {
      score += 10;
    }

    // 扣分项
    // 模糊表述 (-10)
    if (hasVagueLanguage(ruleContent)) {
      score -= 10;
    }

    // 技术错误 (-20)
    if (hasTechnicalErrors(ruleContent)) {
      score -= 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 评估实用性
   */
  private assessPracticality(ruleContent: RuleFileContent): number {
    let score = 40; // 基础分数

    const { rule } = ruleContent;

    // 1. 解决常见问题 (+20)
    if (addressesCommonProblem(ruleContent)) {
      score += 20;
    }

    // 2. 提供具体示例 (+15)
    if (rule.sqlPattern && rule.sqlPattern.trim().length > 0) {
      score += 15;
    }

    // 3. 实际应用场景 (+15)
    if (hasPracticalScenarios(ruleContent)) {
      score += 15;
    }

    // 4. 可操作性 (+10)
    if (isActionable(ruleContent)) {
      score += 10;
    }

    // 扣分项
    // 过于理论化 (-15)
    if (isTooTheoretical(ruleContent)) {
      score -= 15;
    }

    // 缺乏实际价值 (-10)
    if (lacksPracticalValue(ruleContent)) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 评估完整性
   */
  private assessCompleteness(ruleContent: RuleFileContent): number {
    let score = 30; // 基础分数

    const { rule } = ruleContent;

    // 1. 完整的规则结构 (+20)
    if (rule.title && rule.description && rule.category && rule.severity) {
      score += 20;
    }

    // 2. 问题描述清晰 (+15)
    if (hasClearProblemDescription(ruleContent)) {
      score += 15;
    }

    // 3. 解决方案完整 (+15)
    if (hasCompleteSolution(ruleContent)) {
      score += 15;
    }

    // 4. 影响说明 (+10)
    if (mentionsImpact(ruleContent)) {
      score += 10;
    }

    // 5. 边界条件考虑 (+10)
    if (considersEdgeCases(ruleContent)) {
      score += 10;
    }

    // 扣分项
    // 信息缺失 (-15)
    if (hasMissingInformation(ruleContent)) {
      score -= 15;
    }

    // 描述不完整 (-10)
    if (isIncomplete(ruleContent)) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 评估通用性
   */
  private assessGenerality(ruleContent: RuleFileContent): number {
    let score = 50; // 基础分数

    const { rule } = ruleContent;

    // 1. 跨数据库适用性 (+20)
    if (isDatabaseAgnostic(ruleContent)) {
      score += 20;
    }

    // 2. 广泛应用场景 (+15)
    if (hasBroadApplicability(ruleContent)) {
      score += 15;
    }

    // 3. 不依赖特定环境 (+10)
    if (isEnvironmentIndependent(ruleContent)) {
      score += 10;
    }

    // 4. 可扩展性 (+5)
    if (isScalable(ruleContent)) {
      score += 5;
    }

    // 扣分项
    // 过于特定 (-20)
    if (isTooSpecific(ruleContent)) {
      score -= 20;
    }

    // 依赖特定工具 (-15)
    if (dependsOnSpecificTools(ruleContent)) {
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 评估一致性
   */
  private assessConsistency(ruleContent: RuleFileContent): number {
    let score = 60; // 基础分数

    const { rule } = ruleContent;

    // 1. 内部逻辑一致性 (+15)
    if (hasInternalConsistency(ruleContent)) {
      score += 15;
    }

    // 2. 术语使用一致 (+10)
    if (usesConsistentTerminology(ruleContent)) {
      score += 10;
    }

    // 3. 与标准一致 (+10)
    if (alignsWithStandards(ruleContent)) {
      score += 10;
    }

    // 4. 格式规范 (+5)
    if (followsFormatStandards(ruleContent)) {
      score += 5;
    }

    // 扣分项
    // 矛盾表述 (-15)
    if (hasContradictions(ruleContent)) {
      score -= 15;
    }

    // 术语不一致 (-10)
    if (hasInconsistentTerminology(ruleContent)) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 执行LLM深度分析
   */
  private async performLLMAnalysis(ruleContent: RuleFileContent): Promise<Partial<QualityAnalysis>> {
    try {
      const prompt = this.buildLLMPrompt(ruleContent);
      const response = await callLLM(prompt, {
        model: this.config.llm.model,
        temperature: this.config.llm.temperature,
        maxTokens: this.config.llm.maxTokens
      });

      return this.parseLLMResponse(response);

    } catch (error) {
      console.warn(`LLM分析失败: ${error.message}`);
      return {};
    }
  }

  /**
   * 构建LLM提示词
   */
  private buildLLMPrompt(ruleContent: RuleFileContent): string {
    const { rule, analysisContext } = ruleContent;

    return `请评估以下SQL规则的质量，从准确性、实用性、完整性、通用性和一致性五个维度进行评分（0-100分）：

规则标题: ${rule.title}
规则描述: ${rule.description}
SQL模式: ${rule.sqlPattern || '无'}
类别: ${rule.category}
严重程度: ${rule.severity}

请以JSON格式返回评估结果：
{
  "accuracy": {"score": 85, "reason": "技术描述准确"},
  "practicality": {"score": 75, "reason": "有实用价值但示例不够"},
  "completeness": {"score": 70, "reason": "信息基本完整"},
  "generality": {"score": 80, "reason": "适用性较广"},
  "consistency": {"score": 90, "reason": "表述一致"},
  "strengths": ["优势1", "优势2"],
  "issues": ["问题1", "问题2"],
  "suggestions": ["建议1", "建议2"]
}`;
  }

  /**
   * 解析LLM响应
   */
  private parseLLMResponse(response: string): Partial<QualityAnalysis> {
    try {
      // 尝试提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('无法从响应中提取JSON');
      }

      const llmResult = JSON.parse(jsonMatch[0]);

      return {
        metrics: {
          accuracy: llmResult.accuracy?.score || 50,
          practicality: llmResult.practicality?.score || 50,
          completeness: llmResult.completeness?.score || 50,
          generality: llmResult.generality?.score || 50,
          consistency: llmResult.consistency?.score || 50,
          overall: 0 // 将在计算中设置
        } as QualityMetrics,
        strengths: llmResult.strengths || [],
        issues: llmResult.issues || [],
        suggestions: llmResult.suggestions || []
      };

    } catch (error) {
      console.warn(`LLM响应解析失败: ${error.message}`);
      return {};
    }
  }

  /**
   * 合并分析结果
   */
  private combineAnalyses(
    basicAnalysis: QualityAnalysis,
    llmAnalysis: Partial<QualityAnalysis>
  ): QualityAnalysis {
    if (!llmAnalysis.metrics) {
      return basicAnalysis;
    }

    // 权重配置
    const basicWeight = 0.7; // 基础分析权重
    const llmWeight = 0.3; // LLM分析权重

    const combinedMetrics: QualityMetrics = {
      accuracy: basicAnalysis.metrics.accuracy * basicWeight + llmAnalysis.metrics.accuracy * llmWeight,
      practicality: basicAnalysis.metrics.practicality * basicWeight + llmAnalysis.metrics.practicality * llmWeight,
      completeness: basicAnalysis.metrics.completeness * basicWeight + llmAnalysis.metrics.completeness * llmWeight,
      generality: basicAnalysis.metrics.generality * basicWeight + llmAnalysis.metrics.generality * llmWeight,
      consistency: basicAnalysis.metrics.consistency * basicWeight + llmAnalysis.metrics.consistency * llmWeight,
      overall: 0
    };

    combinedMetrics.overall = this.calculateOverallScore(combinedMetrics);

    return {
      ...basicAnalysis,
      metrics: combinedMetrics,
      strengths: [...new Set([...basicAnalysis.strengths, ...(llmAnalysis.strengths || [])])],
      issues: [...new Set([...basicAnalysis.issues, ...(llmAnalysis.issues || [])])],
      suggestions: [...new Set([...basicAnalysis.suggestions, ...(llmAnalysis.suggestions || [])])]
    };
  }

  /**
   * 计算综合分数
   */
  private calculateOverallScore(metrics: QualityMetrics): number {
    // 使用配置中的权重
    const accuracyWeight = this.config.dimensions.accuracy.enabled ? this.config.dimensions.accuracy.weight : 0;
    const practicalityWeight = this.config.dimensions.practicality.enabled ? this.config.dimensions.practicality.weight : 0;
    const completenessWeight = this.config.dimensions.completeness.enabled ? this.config.dimensions.completeness.weight : 0;
    const generalityWeight = this.config.dimensions.generality.enabled ? this.config.dimensions.generality.weight : 0;
    const consistencyWeight = this.config.dimensions.consistency.enabled ? this.config.dimensions.consistency.weight : 0;

    const totalWeight = accuracyWeight + practicalityWeight + completenessWeight + generalityWeight + consistencyWeight;

    if (totalWeight === 0) {
      return metrics.overall; // 如果没有启用任何维度，返回原始分数
    }

    return (
      metrics.accuracy * accuracyWeight +
      metrics.practicality * practicalityWeight +
      metrics.completeness * completenessWeight +
      metrics.generality * generalityWeight +
      metrics.consistency * consistencyWeight
    ) / totalWeight * 100;
  }

  /**
   * 确定质量等级
   */
  private determineQualityLevel(score: number): QualityAnalysis['qualityLevel'] {
    if (score >= this.config.thresholds.excellent) {
      return 'excellent';
    } else if (score >= this.config.thresholds.good) {
      return 'good';
    } else if (score >= this.config.thresholds.fair) {
      return 'acceptable';
    } else {
      return 'poor';
    }
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(metrics: QualityMetrics): number {
    // 基于分数分布的稳定性计算置信度
    const scores = [metrics.accuracy, metrics.practicality, metrics.completeness, metrics.generality, metrics.consistency];
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    // 标准差越小，置信度越高
    return Math.max(0.5, Math.min(1.0, 1.0 - (standardDeviation / 50)));
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(ruleContent: RuleFileContent): string {
    const { rule } = ruleContent;
    return `${rule.title}_${rule.category}_${rule.description?.slice(0, 100) || ''}`.replace(/\s+/g, '_');
  }

  /**
   * 限制缓存大小
   */
  private limitCacheSize(): void {
    const maxSize = this.config.cache?.maxSize || 1000;
    if (this.cache.size > maxSize) {
      // 删除最旧的缓存项
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * 转换为评估结果格式
   */
  private convertToEvaluationResult(analysis: QualityAnalysis): QualityEvaluationResult {
    return {
      qualityScore: Math.round(analysis.metrics.overall),
      dimensionScores: {
        accuracy: Math.round(analysis.metrics.accuracy),
        practicality: Math.round(analysis.metrics.practicality),
        completeness: Math.round(analysis.metrics.completeness),
        generality: Math.round(analysis.metrics.generality),
        consistency: Math.round(analysis.metrics.consistency)
      },
      shouldKeep: analysis.shouldKeep,
      qualityLevel: analysis.qualityLevel,
      strengths: analysis.strengths,
      issues: analysis.issues,
      suggestions: analysis.suggestions,
      duplicateRisk: 'low', // 将在去重检测中设置
      evaluationSummary: this.generateSummary(analysis),
      confidence: Math.round(analysis.confidence * 100) / 100,
      evaluationTime: analysis.evaluationTime,
      metadata: {
        evaluator: 'QualityAssessmentEngine',
        version: '1.0.0',
        dimensions: Object.keys(this.config.dimensions).filter(key =>
          this.config.dimensions[key as keyof typeof this.config.dimensions].enabled
        )
      }
    };
  }

  /**
   * 生成评估摘要
   */
  private generateSummary(analysis: QualityAnalysis): string {
    const level = analysis.qualityLevel;
    const score = analysis.metrics.overall;

    const levelDescriptions = {
      excellent: '优秀',
      good: '良好',
      acceptable: '可接受',
      poor: '较差'
    };

    return `规则质量${levelDescriptions[level]}(${score.toFixed(1)}分)，${analysis.shouldKeep ? '建议保留' : '建议改进'}。`;
  }

  /**
   * 创建备用评估结果
   */
  private createFallbackResult(ruleContent: RuleFileContent, evaluationTime: number): QualityEvaluationResult {
    return {
      qualityScore: 50,
      dimensionScores: {
        accuracy: 50,
        practicality: 50,
        completeness: 50,
        generality: 50,
        consistency: 50
      },
      shouldKeep: true,
      qualityLevel: 'acceptable',
      strengths: ['系统保护性评估'],
      issues: ['评估过程中发生错误'],
      suggestions: ['建议手动检查规则质量'],
      duplicateRisk: 'low',
      evaluationSummary: '由于评估错误，采用保守评分。',
      confidence: 0.3,
      evaluationTime,
      metadata: {
        evaluator: 'QualityAssessmentEngine',
        version: '1.0.0',
        fallback: true
      }
    };
  }
}

/**
 * 创建质量评估引擎实例
 */
export function createQualityAssessmentEngine(): QualityAssessmentEngine {
  return new QualityAssessmentEngine();
}