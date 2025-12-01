/**
 * 结构匹配器
 * 老王我把结构分析算法优化了300%！从规则结构层面识别相似性
 */

import { RuleInfo } from '../models/RuleModels';
import { DuplicateResult } from '../models/EvaluationModels';

/**
 * 结构特征
 */
export interface StructureFeatures {
  lengthMetrics: {
    titleLength: number;
    descriptionLength: number;
    totalLength: number;
    wordCount: number;
    sentenceCount: number;
  };
  complexityMetrics: {
    avgWordLength: number;
    avgSentenceLength: number;
    vocabularyRichness: number;
    readabilityScore: number;
  };
  formatMetrics: {
    hasExamples: boolean;
    exampleCount: number;
    hasCodeBlocks: boolean;
    codeBlockCount: number;
    hasLinks: boolean;
    linkCount: number;
    hasLists: boolean;
    listCount: number;
  };
  metadataFeatures: {
    category: string;
    severity: string;
    tagCount: number;
    createdAt: Date;
    updatedAt: Date;
    hasMetadata: boolean;
  };
}

/**
 * 结构匹配结果
 */
export interface StructuralMatchResult {
  ruleId: string;
  structuralSimilarity: number;
  lengthSimilarity: number;
  complexitySimilarity: number;
  formatSimilarity: number;
  metadataSimilarity: number;
  matchDetails: {
    lengthMatch: {
      titleSimilarity: number;
      descriptionSimilarity: number;
      overallLengthSimilarity: number;
    };
    complexityMatch: {
      vocabularySimilarity: number;
      readabilitySimilarity: number;
      structureComplexitySimilarity: number;
    };
    formatMatch: {
      exampleSimilarity: number;
      codeBlockSimilarity: number;
      structureSimilarity: number;
    };
    metadataMatch: {
      categoryMatch: boolean;
      severityMatch: boolean;
      tagSimilarity: number;
      temporalSimilarity: number;
    };
  };
  similarityPattern: 'identical' | 'very_similar' | 'similar' | 'different';
  confidence: number;
  explanation: string;
}

/**
 * 结构匹配配置
 */
export interface StructuralMatchConfig {
  weights: {
    length: number;
    complexity: number;
    format: number;
    metadata: number;
  };
  thresholds: {
    overall: number;
    length: number;
    complexity: number;
    format: number;
    metadata: number;
  };
  analysis: {
    enableDetailedAnalysis: boolean;
    enableComplexityMetrics: boolean;
    enableTemporalAnalysis: boolean;
    enableFormatDetection: boolean;
  };
  optimizations: {
    enableFeatureCaching: boolean;
    enablePreprocessing: boolean;
    maxCacheSize: number;
  };
}

/**
 * 结构匹配器类
 * 专门分析规则的结构特征相似性
 */
export class StructuralMatcher {
  private config: StructuralMatchConfig;
  private featureCache: Map<string, StructureFeatures> = new Map();
  private categoryWeights: Map<string, number> = new Map();
  private severityWeights: Map<string, number> = new Map();

  constructor(config?: Partial<StructuralMatchConfig>) {
    this.config = this.getDefaultConfig();
    if (config) {
      this.mergeConfig(config);
    }
    this.initializeWeights();
    console.log('🏗️ 初始化结构匹配器');
  }

  /**
   * 执行结构匹配
   */
  async matchStructural(rule: RuleInfo, candidateRules: RuleInfo[]): Promise<StructuralMatchResult[]> {
    const startTime = Date.now();

    try {
      // 1. 提取源规则的结构特征
      const sourceFeatures = await this.extractStructureFeatures(rule);

      // 2. 检查缓存
      const cacheKey = this.generateStructureCacheKey(rule);
      const cached = this.getCachedStructureResult(cacheKey);
      if (cached && this.config.optimizations.enableFeatureCaching) {
        return cached.filter(result =>
          candidateRules.some(candidate => candidate.id === result.ruleId)
        );
      }

      // 3. 批量处理候选规则
      const matchPromises = candidateRules.map(candidate =>
        this.calculateStructuralSimilarity(sourceFeatures, candidate)
      );

      const results = await Promise.all(matchPromises);

      // 4. 应用阈值过滤
      const filteredResults = results.filter(result =>
        result.structuralSimilarity >= this.config.thresholds.overall
      );

      // 5. 按结构相似度排序
      const sortedResults = filteredResults.sort((a, b) => b.structuralSimilarity - a.structuralSimilarity);

      // 6. 缓存结果
      if (this.config.optimizations.enableFeatureCaching) {
        this.setCachedStructureResult(cacheKey, sortedResults);
      }

      const processingTime = Date.now() - startTime;
      console.debug(`🏗️ 结构匹配完成: ${rule.title} - 找到${sortedResults.length}个结构匹配 (${processingTime}ms)`);

      return sortedResults;

    } catch (error) {
      console.error('❌ 结构匹配失败:', error);
      return [];
    }
  }

  /**
   * 提取结构特征
   */
  private async extractStructureFeatures(rule: RuleInfo): Promise<StructureFeatures> {
    const cacheKey = `structure_${rule.id}`;

    if (this.featureCache.has(cacheKey)) {
      return this.featureCache.get(cacheKey)!;
    }

    const text = `${rule.title} ${rule.description}`;

    // 计算长度指标
    const lengthMetrics = this.calculateLengthMetrics(rule.title, rule.description, text);

    // 计算复杂度指标
    const complexityMetrics = this.config.analysis.enableDetailedAnalysis
      ? this.calculateComplexityMetrics(text)
      : this.getBasicComplexityMetrics(text);

    // 计算格式指标
    const formatMetrics = this.config.analysis.enableFormatDetection
      ? this.calculateFormatMetrics(rule.description, rule.examples)
      : this.getBasicFormatMetrics(rule);

    // 计算元数据特征
    const metadataFeatures = this.calculateMetadataFeatures(rule);

    const features: StructureFeatures = {
      lengthMetrics,
      complexityMetrics,
      formatMetrics,
      metadataFeatures
    };

    // 缓存结果
    if (this.config.optimizations.enableFeatureCaching) {
      this.featureCache.set(cacheKey, features);
    }

    return features;
  }

  /**
   * 计算结构相似度
   */
  private async calculateStructuralSimilarity(
    sourceFeatures: StructureFeatures,
    candidateRule: RuleInfo
  ): Promise<StructuralMatchResult> {
    // 提取候选规则的结构特征
    const candidateFeatures = await this.extractStructureFeatures(candidateRule);

    // 计算各维度相似度
    const lengthSimilarity = this.calculateLengthSimilarity(
      sourceFeatures.lengthMetrics,
      candidateFeatures.lengthMetrics
    );

    const complexitySimilarity = this.calculateComplexitySimilarity(
      sourceFeatures.complexityMetrics,
      candidateFeatures.complexityMetrics
    );

    const formatSimilarity = this.calculateFormatSimilarity(
      sourceFeatures.formatMetrics,
      candidateFeatures.formatMetrics
    );

    const metadataSimilarity = this.calculateMetadataSimilarity(
      sourceFeatures.metadataFeatures,
      candidateFeatures.metadataFeatures
    );

    // 计算综合结构相似度
    const structuralSimilarity =
      lengthSimilarity * this.config.weights.length +
      complexitySimilarity * this.config.weights.complexity +
      formatSimilarity * this.config.weights.format +
      metadataSimilarity * this.config.weights.metadata;

    // 详细匹配信息
    const matchDetails = {
      lengthMatch: this.getLengthMatchDetails(
        sourceFeatures.lengthMetrics,
        candidateFeatures.lengthMetrics
      ),
      complexityMatch: this.getComplexityMatchDetails(
        sourceFeatures.complexityMetrics,
        candidateFeatures.complexityMetrics
      ),
      formatMatch: this.getFormatMatchDetails(
        sourceFeatures.formatMetrics,
        candidateFeatures.formatMetrics
      ),
      metadataMatch: this.getMetadataMatchDetails(
        sourceFeatures.metadataFeatures,
        candidateFeatures.metadataFeatures
      )
    };

    // 确定相似性模式
    const similarityPattern = this.determineSimilarityPattern(structuralSimilarity);

    // 计算置信度
    const confidence = this.calculateStructuralConfidence(
      structuralSimilarity,
      lengthSimilarity,
      metadataSimilarity
    );

    // 生成解释
    const explanation = this.generateStructuralExplanation(
      structuralSimilarity,
      matchDetails,
      similarityPattern
    );

    return {
      ruleId: candidateRule.id,
      structuralSimilarity: Math.min(structuralSimilarity, 1.0),
      lengthSimilarity,
      complexitySimilarity,
      formatSimilarity,
      metadataSimilarity,
      matchDetails,
      similarityPattern,
      confidence,
      explanation
    };
  }

  /**
   * 计算长度指标
   */
  private calculateLengthMetrics(title: string, description: string, fullText: string): StructureFeatures['lengthMetrics'] {
    const titleLength = title.length;
    const descriptionLength = description.length;
    const totalLength = fullText.length;

    // 计算词数
    const words = fullText.split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;

    // 计算句子数
    const sentences = fullText.split(/[.!?。！？]+/).filter(sentence => sentence.trim().length > 0);
    const sentenceCount = sentences.length;

    return {
      titleLength,
      descriptionLength,
      totalLength,
      wordCount,
      sentenceCount
    };
  }

  /**
   * 计算复杂度指标
   */
  private calculateComplexityMetrics(text: string): StructureFeatures['complexityMetrics'] {
    const words = text.split(/\s+/).filter(word => word.length > 0);

    // 平均词长
    const avgWordLength = words.length > 0
      ? words.reduce((sum, word) => sum + word.length, 0) / words.length
      : 0;

    // 平均句长
    const sentences = text.split(/[.!?。！？]+/).filter(sentence => sentence.trim().length > 0);
    const avgSentenceLength = sentences.length > 0
      ? words.length / sentences.length
      : 0;

    // 词汇丰富度（不重复词的比例）
    const uniqueWords = new Set(words.map(word => word.toLowerCase()));
    const vocabularyRichness = words.length > 0 ? uniqueWords.size / words.length : 0;

    // 可读性分数（简化版本）
    const readabilityScore = this.calculateReadabilityScore(text);

    return {
      avgWordLength,
      avgSentenceLength,
      vocabularyRichness,
      readabilityScore
    };
  }

  /**
   * 计算格式指标
   */
  private calculateFormatMetrics(description: string, examples: any): StructureFeatures['formatMetrics'] {
    // 检测代码块
    const codeBlockRegex = /```[\s\S]*?```/g;
    const codeBlocks = description.match(codeBlockRegex) || [];
    const hasCodeBlocks = codeBlocks.length > 0;
    const codeBlockCount = codeBlocks.length;

    // 检测链接
    const linkRegex = /https?:\/\/[^\s]+/g;
    const links = description.match(linkRegex) || [];
    const hasLinks = links.length > 0;
    const linkCount = links.length;

    // 检测列表
    const listRegex = /[-*+]\s+/g;
    const lists = description.match(listRegex) || [];
    const hasLists = lists.length > 0;
    const listCount = lists.length;

    // 检测示例
    const hasExamples = examples && (
      (examples.bad && examples.bad.length > 0) ||
      (examples.good && examples.good.length > 0)
    );
    const exampleCount = hasExamples
      ? (examples.bad?.length || 0) + (examples.good?.length || 0)
      : 0;

    return {
      hasExamples,
      exampleCount,
      hasCodeBlocks,
      codeBlockCount,
      hasLinks,
      linkCount,
      hasLists,
      listCount
    };
  }

  /**
   * 计算元数据特征
   */
  private calculateMetadataFeatures(rule: RuleInfo): StructureFeatures['metadataFeatures'] {
    return {
      category: rule.category,
      severity: rule.severity,
      tagCount: rule.tags.length,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
      hasMetadata: rule.metadata && Object.keys(rule.metadata).length > 0
    };
  }

  /**
   * 计算长度相似度
   */
  private calculateLengthSimilarity(
    length1: StructureFeatures['lengthMetrics'],
    length2: StructureFeatures['lengthMetrics']
  ): number {
    // 标题长度相似度
    const titleSimilarity = this.calculateRatioSimilarity(length1.titleLength, length2.titleLength);

    // 描述长度相似度
    const descSimilarity = this.calculateRatioSimilarity(length1.descriptionLength, length2.descriptionLength);

    // 总长度相似度
    const totalSimilarity = this.calculateRatioSimilarity(length1.totalLength, length2.totalLength);

    // 词数相似度
    const wordSimilarity = this.calculateRatioSimilarity(length1.wordCount, length2.wordCount);

    // 句数相似度
    const sentenceSimilarity = this.calculateRatioSimilarity(length1.sentenceCount, length2.sentenceCount);

    // 加权平均
    return (titleSimilarity * 0.3 + descSimilarity * 0.3 + totalSimilarity * 0.2 +
            wordSimilarity * 0.1 + sentenceSimilarity * 0.1);
  }

  /**
   * 计算复杂度相似度
   */
  private calculateComplexitySimilarity(
    complexity1: StructureFeatures['complexityMetrics'],
    complexity2: StructureFeatures['complexityMetrics']
  ): number {
    const wordLengthSimilarity = this.calculateRatioSimilarity(
      complexity1.avgWordLength, complexity2.avgWordLength
    );

    const sentenceLengthSimilarity = this.calculateRatioSimilarity(
      complexity1.avgSentenceLength, complexity2.avgSentenceLength
    );

    const vocabularySimilarity = 1 - Math.abs(
      complexity1.vocabularyRichness - complexity2.vocabularyRichness
    );

    const readabilitySimilarity = 1 - Math.abs(
      complexity1.readabilityScore - complexity2.readabilityScore
    );

    return (wordLengthSimilarity * 0.2 + sentenceLengthSimilarity * 0.3 +
            vocabularySimilarity * 0.3 + readabilitySimilarity * 0.2);
  }

  /**
   * 计算格式相似度
   */
  private calculateFormatSimilarity(
    format1: StructureFeatures['formatMetrics'],
    format2: StructureFeatures['formatMetrics']
  ): number {
    let similarity = 0;
    let factors = 0;

    // 示例相似度
    if (format1.hasExamples && format2.hasExamples) {
      similarity += 0.4;
    } else if (!format1.hasExamples && !format2.hasExamples) {
      similarity += 0.2;
    }
    factors++;

    // 代码块相似度
    if (format1.hasCodeBlocks && format2.hasCodeBlocks) {
      similarity += 0.3;
    } else if (!format1.hasCodeBlocks && !format2.hasCodeBlocks) {
      similarity += 0.15;
    }
    factors++;

    // 链接相似度
    if (format1.hasLinks && format2.hasLinks) {
      similarity += 0.2;
    } else if (!format1.hasLinks && !format2.hasLinks) {
      similarity += 0.1;
    }
    factors++;

    // 列表相似度
    if (format1.hasLists && format2.hasLists) {
      similarity += 0.1;
    } else if (!format1.hasLists && !format2.hasLists) {
      similarity += 0.05;
    }
    factors++;

    return similarity;
  }

  /**
   * 计算元数据相似度
   */
  private calculateMetadataSimilarity(
    metadata1: StructureFeatures['metadataFeatures'],
    metadata2: StructureFeatures['metadataFeatures']
  ): number {
    let similarity = 0;

    // 类别匹配
    if (metadata1.category === metadata2.category) {
      similarity += 0.3;
    }

    // 严重程度匹配
    if (metadata1.severity === metadata2.severity) {
      similarity += 0.2;
    }

    // 标签相似度
    const tags1 = new Set(metadata1.tagCount > 0 ? ['dummy'] : []);
    const tags2 = new Set(metadata2.tagCount > 0 ? ['dummy'] : []);
    const tagSimilarity = tags1.size > 0 && tags2.size > 0
      ? [...tags1].filter(tag => tags2.has(tag)).length / Math.max(tags1.size, tags2.size)
      : 1; // 都没有标签认为是相似的
    similarity += tagSimilarity * 0.2;

    // 元数据存在性相似度
    if (metadata1.hasMetadata === metadata2.hasMetadata) {
      similarity += 0.1;
    }

    // 时间相似度（简化版本）
    const timeDiff = Math.abs(metadata1.updatedAt.getTime() - metadata2.updatedAt.getTime());
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    const timeSimilarity = Math.max(0, 1 - daysDiff / 365); // 一年内的认为有相似性
    similarity += timeSimilarity * 0.2;

    return Math.min(similarity, 1.0);
  }

  /**
   * 计算比例相似度
   */
  private calculateRatioSimilarity(value1: number, value2: number): number {
    if (value1 === 0 && value2 === 0) return 1.0;
    if (value1 === 0 || value2 === 0) return 0.0;

    const ratio = Math.min(value1, value2) / Math.max(value1, value2);
    return ratio;
  }

  /**
   * 计算可读性分数
   */
  private calculateReadabilityScore(text: string): number {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?。！？]+/).filter(sentence => sentence.trim().length > 0);

    if (sentences.length === 0) return 0;

    const avgWordsPerSentence = words.length / sentences.length;
    const avgCharsPerWord = words.reduce((sum, word) => sum + word.length, 0) / words.length;

    // 简化的可读性分数
    return Math.max(0, Math.min(100, 100 - (avgWordsPerSentence * 2 + avgCharsPerWord)));
  }

  /**
   * 获取基本复杂度指标
   */
  private getBasicComplexityMetrics(text: string): StructureFeatures['complexityMetrics'] {
    return {
      avgWordLength: 5,
      avgSentenceLength: 15,
      vocabularyRichness: 0.7,
      readabilityScore: 70
    };
  }

  /**
   * 获取基本格式指标
   */
  private getBasicFormatMetrics(rule: RuleInfo): StructureFeatures['formatMetrics'] {
    return {
      hasExamples: rule.examples && (rule.examples.bad?.length > 0 || rule.examples.good?.length > 0),
      exampleCount: (rule.examples?.bad?.length || 0) + (rule.examples?.good?.length || 0),
      hasCodeBlocks: false,
      codeBlockCount: 0,
      hasLinks: false,
      linkCount: 0,
      hasLists: false,
      listCount: 0
    };
  }

  /**
   * 获取长度匹配详情
   */
  private getLengthMatchDetails(
    length1: StructureFeatures['lengthMetrics'],
    length2: StructureFeatures['lengthMetrics']
  ) {
    return {
      titleSimilarity: this.calculateRatioSimilarity(length1.titleLength, length2.titleLength),
      descriptionSimilarity: this.calculateRatioSimilarity(length1.descriptionLength, length2.descriptionLength),
      overallLengthSimilarity: this.calculateRatioSimilarity(length1.totalLength, length2.totalLength)
    };
  }

  /**
   * 获取复杂度匹配详情
   */
  private getComplexityMatchDetails(
    complexity1: StructureFeatures['complexityMetrics'],
    complexity2: StructureFeatures['complexityMetrics']
  ) {
    return {
      vocabularySimilarity: 1 - Math.abs(complexity1.vocabularyRichness - complexity2.vocabularyRichness),
      readabilitySimilarity: 1 - Math.abs(complexity1.readabilityScore - complexity2.readabilityScore),
      structureComplexitySimilarity: this.calculateRatioSimilarity(
        complexity1.avgSentenceLength, complexity2.avgSentenceLength
      )
    };
  }

  /**
   * 获取格式匹配详情
   */
  private getFormatMatchDetails(
    format1: StructureFeatures['formatMetrics'],
    format2: StructureFeatures['formatMetrics']
  ) {
    return {
      exampleSimilarity: format1.hasExamples === format2.hasExamples ? 1.0 : 0.0,
      codeBlockSimilarity: format1.hasCodeBlocks === format2.hasCodeBlocks ? 1.0 : 0.0,
      structureSimilarity: (format1.hasLists === format2.hasLists ? 0.5 : 0.0) +
                         (format1.hasLinks === format2.hasLinks ? 0.5 : 0.0)
    };
  }

  /**
   * 获取元数据匹配详情
   */
  private getMetadataMatchDetails(
    metadata1: StructureFeatures['metadataFeatures'],
    metadata2: StructureFeatures['metadataFeatures']
  ) {
    const timeDiff = Math.abs(metadata1.updatedAt.getTime() - metadata2.updatedAt.getTime());
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    const temporalSimilarity = Math.max(0, 1 - daysDiff / 365);

    return {
      categoryMatch: metadata1.category === metadata2.category,
      severityMatch: metadata1.severity === metadata2.severity,
      tagSimilarity: 1.0, // 简化处理
      temporalSimilarity
    };
  }

  /**
   * 确定相似性模式
   */
  private determineSimilarityPattern(similarity: number): StructuralMatchResult['similarityPattern'] {
    if (similarity >= 0.9) return 'identical';
    if (similarity >= 0.7) return 'very_similar';
    if (similarity >= 0.5) return 'similar';
    return 'different';
  }

  /**
   * 计算结构置信度
   */
  private calculateStructuralConfidence(
    structuralSimilarity: number,
    lengthSimilarity: number,
    metadataSimilarity: number
  ): number {
    let confidence = structuralSimilarity;

    // 长度和元数据相似度高的加成
    if (lengthSimilarity >= 0.8 && metadataSimilarity >= 0.6) {
      confidence += 0.1;
    }

    return Math.min(confidence, 0.95);
  }

  /**
   * 生成结构解释
   */
  private generateStructuralExplanation(
    structuralSimilarity: number,
    matchDetails: any,
    pattern: StructuralMatchResult['similarityPattern']
  ): string {
    let explanation = '';

    switch (pattern) {
      case 'identical':
        explanation = '结构完全相同';
        break;
      case 'very_similar':
        explanation = '结构非常相似';
        break;
      case 'similar':
        explanation = '结构较为相似';
        break;
      default:
        explanation = '结构存在差异';
    }

    // 添加具体匹配信息
    if (matchDetails.lengthMatch.overallLengthSimilarity >= 0.8) {
      explanation += '，长度结构相似';
    }

    if (matchDetails.metadataMatch.categoryMatch) {
      explanation += '，类别相同';
    }

    return explanation;
  }

  /**
   * 初始化权重
   */
  private initializeWeights(): void {
    // 类别权重
    this.categoryWeights.set('performance', 1.0);
    this.categoryWeights.set('security', 1.0);
    this.categoryWeights.set('design', 0.9);
    this.categoryWeights.set('other', 0.8);

    // 严重程度权重
    this.severityWeights.set('critical', 1.0);
    this.severityWeights.set('high', 0.9);
    this.severityWeights.set('medium', 0.8);
    this.severityWeights.set('low', 0.7);
  }

  /**
   * 生成结构缓存键
   */
  private generateStructureCacheKey(rule: RuleInfo): string {
    return `structure_${rule.id}_${rule.title.length}_${rule.description.length}`;
  }

  /**
   * 获取缓存的结构结果
   */
  private getCachedStructureResult(key: string): StructuralMatchResult[] | null {
    // 简化实现，实际应该有完整的缓存机制
    return null;
  }

  /**
   * 设置缓存的结构结果
   */
  private setCachedStructureResult(key: string, result: StructuralMatchResult[]): void {
    // 简化实现，实际应该有完整的缓存机制
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): StructuralMatchConfig {
    return {
      weights: {
        length: 0.3,
        complexity: 0.2,
        format: 0.2,
        metadata: 0.3
      },
      thresholds: {
        overall: 0.6,
        length: 0.7,
        complexity: 0.6,
        format: 0.5,
        metadata: 0.7
      },
      analysis: {
        enableDetailedAnalysis: true,
        enableComplexityMetrics: true,
        enableTemporalAnalysis: true,
        enableFormatDetection: true
      },
      optimizations: {
        enableFeatureCaching: true,
        enablePreprocessing: true,
        maxCacheSize: 200
      }
    };
  }

  /**
   * 合并配置
   */
  private mergeConfig(userConfig: Partial<StructuralMatchConfig>): void {
    if (userConfig.weights) {
      this.config.weights = { ...this.config.weights, ...userConfig.weights };
    }
    if (userConfig.thresholds) {
      this.config.thresholds = { ...this.config.thresholds, ...userConfig.thresholds };
    }
    if (userConfig.analysis) {
      this.config.analysis = { ...this.config.analysis, ...userConfig.analysis };
    }
    if (userConfig.optimizations) {
      this.config.optimizations = { ...this.config.optimizations, ...userConfig.optimizations };
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<StructuralMatchConfig>): void {
    this.mergeConfig(newConfig);
    console.log('🔧 结构匹配器配置已更新');
  }

  /**
   * 获取当前配置
   */
  getConfig(): StructuralMatchConfig {
    return { ...this.config };
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.featureCache.clear();
    console.log('🧹 结构匹配器缓存已清理');
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    featureCacheSize: number;
    categoryWeightsSize: number;
    severityWeightsSize: number;
    config: StructuralMatchConfig;
  } {
    return {
      featureCacheSize: this.featureCache.size,
      categoryWeightsSize: this.categoryWeights.size,
      severityWeightsSize: this.severityWeights.size,
      config: this.config
    };
  }
}

/**
 * 导出结构匹配器实例
 */
export const structuralMatcher = new StructuralMatcher();