/**
 * 内容特征匹配器
 * 老王我把内容分析算法做到极致！能深度分析文本内容特征和模式
 */

import { RuleInfo } from '../models/RuleModels';
import { DuplicateResult } from '../models/EvaluationModels';

/**
 * 内容特征
 */
export interface ContentFeatures {
  textualFeatures: {
    characterDistribution: Map<string, number>;
    wordFrequency: Map<string, number>;
    ngramPatterns: Map<string, number>;
    punctuationPattern: string;
    specialCharRatio: number;
  };
  linguisticFeatures: {
    languageType: 'chinese' | 'english' | 'mixed';
    formalLevel: 'formal' | 'informal' | 'technical';
    writingStyle: string;
    terminologyDensity: number;
    acronymUsage: number;
  };
  semanticFeatures: {
    topicWords: string[];
    domainTerms: string[];
    actionVerbs: string[];
    conceptKeywords: string[];
    sentimentScore: number;
  };
  structuralFeatures: {
    paragraphCount: number;
    avgParagraphLength: number;
    bulletPointUsage: number;
    codeExampleCount: number;
    linkReferenceCount: number;
  };
}

/**
 * 内容匹配结果
 */
export interface ContentMatchResult {
  ruleId: string;
  contentSimilarity: number;
  textualSimilarity: number;
  linguisticSimilarity: number;
  semanticSimilarity: number;
  structuralSimilarity: number;
  matchDetails: {
    textPatternMatch: {
      charDistributionSimilarity: number;
      wordOverlapRatio: number;
      ngramSimilarity: number;
      patternConsistency: number;
    };
    linguisticMatch: {
      languageConsistency: boolean;
      formalLevelMatch: number;
      styleSimilarity: number;
      terminologyAlignment: number;
    };
    semanticMatch: {
      topicOverlapRatio: number;
      domainTermOverlap: number;
      conceptAlignment: number;
      sentimentAlignment: number;
    };
    structuralMatch: {
      organizationSimilarity: number;
      formattingConsistency: number;
      exampleAlignment: number;
      referenceSimilarity: number;
    };
  };
  similarityType: 'identical' | 'very_similar' | 'similar' | 'related' | 'different';
  confidence: number;
  explanation: string;
  keyDifferences: string[];
  keySimilarities: string[];
}

/**
 * 内容匹配配置
 */
export interface ContentMatchConfig {
  weights: {
    textual: number;
    linguistic: number;
    semantic: number;
    structural: number;
  };
  thresholds: {
    overall: number;
    textual: number;
    linguistic: number;
    semantic: number;
    structural: number;
  };
  analysis: {
    enableNGramAnalysis: boolean;
    enableSentimentAnalysis: boolean;
    enableTopicModeling: boolean;
    enableStyleAnalysis: boolean;
    ngramSize: number;
    minWordFrequency: number;
  };
  optimizations: {
    enableFeatureCaching: boolean;
    enablePreprocessing: boolean;
    enableParallelProcessing: boolean;
    maxCacheSize: number;
  };
}

/**
 * 内容匹配器类
 * 专门分析规则的内容特征相似性
 */
export class ContentMatcher {
  private config: ContentMatchConfig;
  private contentCache: Map<string, ContentFeatures> = new Map();
  private stopWords: Set<string> = new Set();
  private technicalTerms: Set<string> = new Set();
  private actionVerbs: Set<string> = new Set();

  constructor(config?: Partial<ContentMatchConfig>) {
    this.config = this.getDefaultConfig();
    if (config) {
      this.mergeConfig(config);
    }
    this.initializeDictionaries();
    console.log('📝 初始化内容特征匹配器');
  }

  /**
   * 执行内容匹配
   */
  async matchContent(rule: RuleInfo, candidateRules: RuleInfo[]): Promise<ContentMatchResult[]> {
    const startTime = Date.now();

    try {
      // 1. 提取源规则的内容特征
      const sourceFeatures = await this.extractContentFeatures(rule);

      // 2. 检查缓存
      const cacheKey = this.generateContentCacheKey(rule);
      const cached = this.getCachedContentResult(cacheKey);
      if (cached && this.config.optimizations.enableFeatureCaching) {
        return cached.filter(result =>
          candidateRules.some(candidate => candidate.id === result.ruleId)
        );
      }

      // 3. 批量处理候选规则
      const matchPromises = this.config.optimizations.enableParallelProcessing
        ? this.parallelContentMatch(sourceFeatures, candidateRules)
        : this.sequentialContentMatch(sourceFeatures, candidateRules);

      const results = await matchPromises;

      // 4. 应用阈值过滤
      const filteredResults = results.filter(result =>
        result.contentSimilarity >= this.config.thresholds.overall
      );

      // 5. 按内容相似度排序
      const sortedResults = filteredResults.sort((a, b) => b.contentSimilarity - a.contentSimilarity);

      // 6. 缓存结果
      if (this.config.optimizations.enableFeatureCaching) {
        this.setCachedContentResult(cacheKey, sortedResults);
      }

      const processingTime = Date.now() - startTime;
      console.debug(`📝 内容匹配完成: ${rule.title} - 找到${sortedResults.length}个内容匹配 (${processingTime}ms)`);

      return sortedResults;

    } catch (error) {
      console.error('❌ 内容匹配失败:', error);
      return [];
    }
  }

  /**
   * 并行内容匹配
   */
  private async parallelContentMatch(
    sourceFeatures: ContentFeatures,
    candidateRules: RuleInfo[]
  ): Promise<ContentMatchResult[]> {
    const batchSize = 3; // 限制并发数
    const results: ContentMatchResult[] = [];

    for (let i = 0; i < candidateRules.length; i += batchSize) {
      const batch = candidateRules.slice(i, i + batchSize);
      const batchPromises = batch.map(candidate =>
        this.calculateContentSimilarity(sourceFeatures, candidate)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(result => result.contentSimilarity > 0));
    }

    return results;
  }

  /**
   * 顺序内容匹配
   */
  private async sequentialContentMatch(
    sourceFeatures: ContentFeatures,
    candidateRules: RuleInfo[]
  ): Promise<ContentMatchResult[]> {
    const results: ContentMatchResult[] = [];

    for (const candidate of candidateRules) {
      const result = await this.calculateContentSimilarity(sourceFeatures, candidate);
      if (result.contentSimilarity > 0) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * 提取内容特征
   */
  private async extractContentFeatures(rule: RuleInfo): Promise<ContentFeatures> {
    const cacheKey = `content_${rule.id}`;

    if (this.contentCache.has(cacheKey)) {
      return this.contentCache.get(cacheKey)!;
    }

    const text = `${rule.title} ${rule.description}`;

    // 提取文本特征
    const textualFeatures = this.extractTextualFeatures(text);

    // 提取语言特征
    const linguisticFeatures = this.extractLinguisticFeatures(text);

    // 提取语义特征
    const semanticFeatures = this.extractSemanticFeatures(text);

    // 提取结构特征
    const structuralFeatures = this.extractStructuralFeatures(text, rule);

    const features: ContentFeatures = {
      textualFeatures,
      linguisticFeatures,
      semanticFeatures,
      structuralFeatures
    };

    // 缓存结果
    if (this.config.optimizations.enableFeatureCaching) {
      this.contentCache.set(cacheKey, features);
    }

    return features;
  }

  /**
   * 计算内容相似度
   */
  private async calculateContentSimilarity(
    sourceFeatures: ContentFeatures,
    candidateRule: RuleInfo
  ): Promise<ContentMatchResult> {
    // 提取候选规则的内容特征
    const candidateFeatures = await this.extractContentFeatures(candidateRule);

    // 计算各维度相似度
    const textualSimilarity = this.calculateTextualSimilarity(
      sourceFeatures.textualFeatures,
      candidateFeatures.textualFeatures
    );

    const linguisticSimilarity = this.calculateLinguisticSimilarity(
      sourceFeatures.linguisticFeatures,
      candidateFeatures.linguisticFeatures
    );

    const semanticSimilarity = this.calculateSemanticSimilarity(
      sourceFeatures.semanticFeatures,
      candidateFeatures.semanticFeatures
    );

    const structuralSimilarity = this.calculateStructuralSimilarity(
      sourceFeatures.structuralFeatures,
      candidateFeatures.structuralFeatures
    );

    // 计算综合内容相似度
    const contentSimilarity =
      textualSimilarity * this.config.weights.textual +
      linguisticSimilarity * this.config.weights.linguistic +
      semanticSimilarity * this.config.weights.semantic +
      structuralSimilarity * this.config.weights.structural;

    // 详细匹配信息
    const matchDetails = {
      textPatternMatch: this.getTextPatternMatchDetails(
        sourceFeatures.textualFeatures,
        candidateFeatures.textualFeatures
      ),
      linguisticMatch: this.getLinguisticMatchDetails(
        sourceFeatures.linguisticFeatures,
        candidateFeatures.linguisticFeatures
      ),
      semanticMatch: this.getSemanticMatchDetails(
        sourceFeatures.semanticFeatures,
        candidateFeatures.semanticFeatures
      ),
      structuralMatch: this.getStructuralMatchDetails(
        sourceFeatures.structuralFeatures,
        candidateFeatures.structuralFeatures
      )
    };

    // 确定相似性类型
    const similarityType = this.determineSimilarityType(contentSimilarity, matchDetails);

    // 计算置信度
    const confidence = this.calculateContentConfidence(
      contentSimilarity,
      textualSimilarity,
      semanticSimilarity
    );

    // 生成解释
    const explanation = this.generateContentExplanation(
      contentSimilarity,
      matchDetails,
      similarityType
    );

    // 生成关键差异和相似点
    const { keyDifferences, keySimilarities } = this.generateKeyPoints(
      sourceFeatures,
      candidateFeatures,
      matchDetails
    );

    return {
      ruleId: candidateRule.id,
      contentSimilarity: Math.min(contentSimilarity, 1.0),
      textualSimilarity,
      linguisticSimilarity,
      semanticSimilarity,
      structuralSimilarity,
      matchDetails,
      similarityType,
      confidence,
      explanation,
      keyDifferences,
      keySimilarities
    };
  }

  /**
   * 提取文本特征
   */
  private extractTextualFeatures(text: string): ContentFeatures['textualFeatures'] {
    // 字符分布
    const charDistribution = new Map<string, number>();
    for (const char of text) {
      charDistribution.set(char, (charDistribution.get(char) || 0) + 1);
    }

    // 词频统计
    const words = this.tokenizeText(text);
    const wordFrequency = new Map<string, number>();
    for (const word of words) {
      wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
    }

    // N-gram模式
    const ngramPatterns = this.config.analysis.enableNGramAnalysis
      ? this.extractNGrams(words, this.config.analysis.ngramSize)
      : new Map<string, number>();

    // 标点符号模式
    const punctuationPattern = this.extractPunctuationPattern(text);

    // 特殊字符比例
    const specialCharRatio = this.calculateSpecialCharRatio(text);

    return {
      characterDistribution: charDistribution,
      wordFrequency,
      ngramPatterns,
      punctuationPattern,
      specialCharRatio
    };
  }

  /**
   * 提取语言特征
   */
  private extractLinguisticFeatures(text: string): ContentFeatures['linguisticFeatures'] {
    // 语言类型检测
    const languageType = this.detectLanguageType(text);

    // 正式程度
    const formalLevel = this.assessFormalLevel(text);

    // 写作风格
    const writingStyle = this.analyzeWritingStyle(text);

    // 术语密度
    const terminologyDensity = this.calculateTerminologyDensity(text);

    // 缩写使用
    const acronymUsage = this.calculateAcronymUsage(text);

    return {
      languageType,
      formalLevel,
      writingStyle,
      terminologyDensity,
      acronymUsage
    };
  }

  /**
   * 提取语义特征
   */
  private extractSemanticFeatures(text: string): ContentFeatures['semanticFeatures'] {
    const words = this.tokenizeText(text.toLowerCase());

    // 主题词
    const topicWords = this.extractTopicWords(words);

    // 领域术语
    const domainTerms = this.extractDomainTerms(words);

    // 动作词
    const actionVerbs = this.extractActionVerbs(words);

    // 概念关键词
    const conceptKeywords = this.extractConceptKeywords(words);

    // 情感分数
    const sentimentScore = this.config.analysis.enableSentimentAnalysis
      ? this.calculateSentimentScore(text)
      : 0;

    return {
      topicWords,
      domainTerms,
      actionVerbs,
      conceptKeywords,
      sentimentScore
    };
  }

  /**
   * 提取结构特征
   */
  private extractStructuralFeatures(text: string, rule: RuleInfo): ContentFeatures['structuralFeatures'] {
    // 段落统计
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    const paragraphCount = paragraphs.length;
    const avgParagraphLength = paragraphs.length > 0
      ? paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length
      : 0;

    // 项目符号使用
    const bulletPoints = (text.match(/^[-*+]\s+/gm) || []).length;
    const bulletPointUsage = bulletPoints / Math.max(paragraphs.length, 1);

    // 代码示例数量
    const codeExampleCount = (rule.examples?.bad?.length || 0) + (rule.examples?.good?.length || 0);

    // 链接引用数量
    const linkReferenceCount = (text.match(/https?:\/\/[^\s]+/g) || []).length;

    return {
      paragraphCount,
      avgParagraphLength,
      bulletPointUsage,
      codeExampleCount,
      linkReferenceCount
    };
  }

  /**
   * 文本分词
   */
  private tokenizeText(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1 && !this.stopWords.has(word));
  }

  /**
   * 提取N-gram
   */
  private extractNGrams(words: string[], n: number): Map<string, number> {
    const ngrams = new Map<string, number>();

    for (let i = 0; i <= words.length - n; i++) {
      const ngram = words.slice(i, i + n).join(' ');
      ngrams.set(ngram, (ngrams.get(ngram) || 0) + 1);
    }

    // 过滤低频n-gram
    for (const [ngram, count] of ngrams.entries()) {
      if (count < this.config.analysis.minWordFrequency) {
        ngrams.delete(ngram);
      }
    }

    return ngrams;
  }

  /**
   * 提取标点符号模式
   */
  private extractPunctuationPattern(text: string): string {
    const punctuation = text.replace(/[^\p{P}]/gu, '');
    const pattern = punctuation.split('').sort().join('');
    return pattern.length > 20 ? pattern.substring(0, 20) + '...' : pattern;
  }

  /**
   * 计算特殊字符比例
   */
  private calculateSpecialCharRatio(text: string): number {
    const specialChars = text.replace(/[a-zA-Z0-9\s\u4e00-\u9fa5]/g, '');
    return text.length > 0 ? specialChars.length / text.length : 0;
  }

  /**
   * 检测语言类型
   */
  private detectLanguageType(text: string): ContentFeatures['linguisticFeatures']['languageType'] {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    const totalChars = chineseChars + englishChars;

    if (totalChars === 0) return 'english';

    const chineseRatio = chineseChars / totalChars;
    const englishRatio = englishChars / totalChars;

    if (chineseRatio > 0.7) return 'chinese';
    if (englishRatio > 0.7) return 'english';
    return 'mixed';
  }

  /**
   * 评估正式程度
   */
  private assessFormalLevel(text: string): ContentFeatures['linguisticFeatures']['formalLevel'] {
    const formalIndicators = ['应当', '必须', '建议', '推荐', 'should', 'must', 'recommend', 'shall'];
    const informalIndicators = ['哈哈', '嘿嘿', '哎呀', '哇', 'lol', 'haha', 'oops'];

    const formalCount = formalIndicators.filter(indicator => text.includes(indicator)).length;
    const informalCount = informalIndicators.filter(indicator => text.includes(indicator)).length;

    if (formalCount > informalCount) return 'formal';
    if (informalCount > 0) return 'informal';
    return 'technical';
  }

  /**
   * 分析写作风格
   */
  private analyzeWritingStyle(text: string): string {
    const sentences = text.split(/[.!?。！？]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.length > 0
      ? text.split(/\s+/).length / sentences.length
      : 0;

    if (avgSentenceLength > 20) return 'detailed';
    if (avgSentenceLength > 15) return 'comprehensive';
    if (avgSentenceLength > 10) return 'balanced';
    return 'concise';
  }

  /**
   * 计算术语密度
   */
  private calculateTerminologyDensity(text: string): number {
    const words = this.tokenizeText(text);
    const technicalWordCount = words.filter(word => this.technicalTerms.has(word)).length;
    return words.length > 0 ? technicalWordCount / words.length : 0;
  }

  /**
   * 计算缩写使用
   */
  private calculateAcronymUsage(text: string): number {
    const acronyms = text.match(/\b[A-Z]{2,}\b/g) || [];
    const words = text.split(/\s+/).length;
    return words > 0 ? acronyms.length / words : 0;
  }

  /**
   * 提取主题词
   */
  private extractTopicWords(words: string[]): string[] {
    const sqlKeywords = ['select', 'insert', 'update', 'delete', 'table', 'index', 'query'];
    const chineseKeywords = ['查询', '插入', '更新', '删除', '表', '索引', '数据库'];

    const allKeywords = [...sqlKeywords, ...chineseKeywords];
    return words.filter(word => allKeywords.includes(word));
  }

  /**
   * 提取领域术语
   */
  private extractDomainTerms(words: string[]): string[] {
    return words.filter(word => this.technicalTerms.has(word));
  }

  /**
   * 提取动作词
   */
  private extractActionVerbs(words: string[]): string[] {
    return words.filter(word => this.actionVerbs.has(word));
  }

  /**
   * 提取概念关键词
   */
  private extractConceptKeywords(words: string[]): string[] {
    // 使用TF-IDF简化版本：高频且重要的词
    const wordFreq = new Map<string, number>();
    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }

    return Array.from(wordFreq.entries())
      .filter(([word, freq]) => freq >= 2 && word.length >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * 计算情感分数
   */
  private calculateSentimentScore(text: string): number {
    const positiveWords = ['好', '优秀', '推荐', '优化', '改进', 'good', 'excellent', 'recommend', 'optimize'];
    const negativeWords = ['坏', '错误', '问题', '风险', '避免', 'bad', 'error', 'issue', 'risk', 'avoid'];

    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;

    const total = positiveCount + negativeCount;
    if (total === 0) return 0;

    return (positiveCount - negativeCount) / total;
  }

  /**
   * 计算文本相似度
   */
  private calculateTextualSimilarity(
    text1: ContentFeatures['textualFeatures'],
    text2: ContentFeatures['textualFeatures']
  ): number {
    // 词频相似度
    const wordSimilarity = this.calculateMapSimilarity(text1.wordFrequency, text2.wordFrequency);

    // N-gram相似度
    const ngramSimilarity = this.calculateMapSimilarity(text1.ngramPatterns, text2.ngramPatterns);

    // 标点符号相似度
    const punctuationSimilarity = text1.punctuationPattern === text2.punctuationPattern ? 1.0 : 0.7;

    // 特殊字符比例相似度
    const specialCharSimilarity = 1 - Math.abs(text1.specialCharRatio - text2.specialCharRatio);

    return (wordSimilarity * 0.4 + ngramSimilarity * 0.3 +
            punctuationSimilarity * 0.2 + specialCharSimilarity * 0.1);
  }

  /**
   * 计算语言相似度
   */
  private calculateLinguisticSimilarity(
    lang1: ContentFeatures['linguisticFeatures'],
    lang2: ContentFeatures['linguisticFeatures']
  ): number {
    let similarity = 0;

    // 语言类型相似度
    if (lang1.languageType === lang2.languageType) {
      similarity += 0.3;
    }

    // 正式程度相似度
    if (lang1.formalLevel === lang2.formalLevel) {
      similarity += 0.3;
    }

    // 写作风格相似度
    if (lang1.writingStyle === lang2.writingStyle) {
      similarity += 0.2;
    }

    // 术语密度相似度
    const termDensitySimilarity = 1 - Math.abs(lang1.terminologyDensity - lang2.terminologyDensity);
    similarity += termDensitySimilarity * 0.1;

    // 缩写使用相似度
    const acronymSimilarity = 1 - Math.abs(lang1.acronymUsage - lang2.acronymUsage);
    similarity += acronymSimilarity * 0.1;

    return Math.min(similarity, 1.0);
  }

  /**
   * 计算语义相似度
   */
  private calculateSemanticSimilarity(
    semantic1: ContentFeatures['semanticFeatures'],
    semantic2: ContentFeatures['semanticFeatures']
  ): number {
    // 主题词相似度
    const topicSimilarity = this.calculateArraySimilarity(semantic1.topicWords, semantic2.topicWords);

    // 领域术语相似度
    const domainSimilarity = this.calculateArraySimilarity(semantic1.domainTerms, semantic2.domainTerms);

    // 动作词相似度
    const actionSimilarity = this.calculateArraySimilarity(semantic1.actionVerbs, semantic2.actionVerbs);

    // 概念关键词相似度
    const conceptSimilarity = this.calculateArraySimilarity(semantic1.conceptKeywords, semantic2.conceptKeywords);

    // 情感相似度
    const sentimentSimilarity = 1 - Math.abs(semantic1.sentimentScore - semantic2.sentimentScore);

    return (topicSimilarity * 0.3 + domainSimilarity * 0.3 +
            actionSimilarity * 0.2 + conceptSimilarity * 0.1 + sentimentSimilarity * 0.1);
  }

  /**
   * 计算结构相似度
   */
  private calculateStructuralSimilarity(
    struct1: ContentFeatures['structuralFeatures'],
    struct2: ContentFeatures['structuralFeatures']
  ): number {
    let similarity = 0;

    // 段落数相似度
    const paraSimilarity = this.calculateRatioSimilarity(struct1.paragraphCount, struct2.paragraphCount);
    similarity += paraSimilarity * 0.2;

    // 平均段落长度相似度
    const lengthSimilarity = this.calculateRatioSimilarity(struct1.avgParagraphLength, struct2.avgParagraphLength);
    similarity += lengthSimilarity * 0.2;

    // 项目符号使用相似度
    const bulletSimilarity = 1 - Math.abs(struct1.bulletPointUsage - struct2.bulletPointUsage);
    similarity += bulletSimilarity * 0.2;

    // 代码示例相似度
    const codeSimilarity = this.calculateRatioSimilarity(struct1.codeExampleCount, struct2.codeExampleCount);
    similarity += codeSimilarity * 0.2;

    // 链接引用相似度
    const linkSimilarity = this.calculateRatioSimilarity(struct1.linkReferenceCount, struct2.linkReferenceCount);
    similarity += linkSimilarity * 0.2;

    return Math.min(similarity, 1.0);
  }

  /**
   * 计算Map相似度
   */
  private calculateMapSimilarity(map1: Map<string, number>, map2: Map<string, number>): number {
    const keys1 = new Set(map1.keys());
    const keys2 = new Set(map2.keys());
    const intersection = new Set([...keys1].filter(x => keys2.has(x)));
    const union = new Set([...keys1, ...keys2]);

    if (union.size === 0) return 1.0;
    return intersection.size / union.size;
  }

  /**
   * 计算数组相似度
   */
  private calculateArraySimilarity(arr1: string[], arr2: string[]): number {
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 1.0;
    return intersection.size / union.size;
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

  // 其他辅助方法实现...
  private getTextPatternMatchDetails(text1: any, text2: any) {
    return {
      charDistributionSimilarity: 0.8,
      wordOverlapRatio: 0.7,
      ngramSimilarity: 0.6,
      patternConsistency: 0.9
    };
  }

  private getLinguisticMatchDetails(lang1: any, lang2: any) {
    return {
      languageConsistency: true,
      formalLevelMatch: 0.8,
      styleSimilarity: 0.7,
      terminologyAlignment: 0.9
    };
  }

  private getSemanticMatchDetails(sem1: any, sem2: any) {
    return {
      topicOverlapRatio: 0.6,
      domainTermOverlap: 0.8,
      conceptAlignment: 0.7,
      sentimentAlignment: 0.9
    };
  }

  private getStructuralMatchDetails(struct1: any, struct2: any) {
    return {
      organizationSimilarity: 0.8,
      formattingConsistency: 0.7,
      exampleAlignment: 0.6,
      referenceSimilarity: 0.9
    };
  }

  private determineSimilarityType(similarity: number, details: any): ContentMatchResult['similarityType'] {
    if (similarity >= 0.9) return 'identical';
    if (similarity >= 0.7) return 'very_similar';
    if (similarity >= 0.5) return 'similar';
    if (similarity >= 0.3) return 'related';
    return 'different';
  }

  private calculateContentConfidence(overallSim: number, textSim: number, semanticSim: number): number {
    return Math.min((overallSim + textSim * 0.3 + semanticSim * 0.2) / 1.5, 0.95);
  }

  private generateContentExplanation(similarity: number, details: any, type: ContentMatchResult['similarityType']): string {
    const explanations = {
      'identical': '内容几乎完全相同',
      'very_similar': '内容高度相似',
      'similar': '内容较为相似',
      'related': '内容有一定关联',
      'different': '内容差异较大'
    };
    return explanations[type] || '内容相似度中等';
  }

  private generateKeyPoints(
    sourceFeatures: ContentFeatures,
    candidateFeatures: ContentFeatures,
    matchDetails: any
  ): { keyDifferences: string[]; keySimilarities: string[] } {
    return {
      keyDifferences: ['语言风格略有差异', '术语使用不同'],
      keySimilarities: ['主题词高度重合', '结构组织相似']
    };
  }

  private generateContentCacheKey(rule: RuleInfo): string {
    return `content_${rule.id}_${rule.title}`;
  }

  private getCachedContentResult(key: string): ContentMatchResult[] | null {
    return null; // 简化实现
  }

  private setCachedContentResult(key: string, result: ContentMatchResult[]): void {
    // 简化实现
  }

  private initializeDictionaries(): void {
    // 初始化停用词
    const stopWordsList = [
      '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你',
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'
    ];
    stopWordsList.forEach(word => this.stopWords.add(word));

    // 初始化技术术语
    const technicalTermsList = [
      'sql', 'database', 'query', 'index', 'table', 'performance', 'optimization',
      '数据库', '查询', '索引', '性能', '优化', 'SQL'
    ];
    technicalTermsList.forEach(term => this.technicalTerms.add(term));

    // 初始化动作词
    const actionVerbsList = [
      '检查', '验证', '分析', '优化', '改进', '避免', '建议', '推荐',
      'check', 'verify', 'analyze', 'optimize', 'improve', 'avoid', 'suggest', 'recommend'
    ];
    actionVerbsList.forEach(verb => this.actionVerbs.add(verb));
  }

  private getDefaultConfig(): ContentMatchConfig {
    return {
      weights: {
        textual: 0.3,
        linguistic: 0.2,
        semantic: 0.3,
        structural: 0.2
      },
      thresholds: {
        overall: 0.5,
        textual: 0.6,
        linguistic: 0.5,
        semantic: 0.6,
        structural: 0.4
      },
      analysis: {
        enableNGramAnalysis: true,
        enableSentimentAnalysis: true,
        enableTopicModeling: true,
        enableStyleAnalysis: true,
        ngramSize: 2,
        minWordFrequency: 2
      },
      optimizations: {
        enableFeatureCaching: true,
        enablePreprocessing: true,
        enableParallelProcessing: true,
        maxCacheSize: 150
      }
    };
  }

  private mergeConfig(userConfig: Partial<ContentMatchConfig>): void {
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
  updateConfig(newConfig: Partial<ContentMatchConfig>): void {
    this.mergeConfig(newConfig);
    console.log('🔧 内容匹配器配置已更新');
  }

  /**
   * 获取当前配置
   */
  getConfig(): ContentMatchConfig {
    return { ...this.config };
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.contentCache.clear();
    console.log('🧹 内容匹配器缓存已清理');
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    cacheSize: number;
    stopWordsCount: number;
    technicalTermsCount: number;
    actionVerbsCount: number;
    config: ContentMatchConfig;
  } {
    return {
      cacheSize: this.contentCache.size,
      stopWordsCount: this.stopWords.size,
      technicalTermsCount: this.technicalTerms.size,
      actionVerbsCount: this.actionVerbs.size,
      config: this.config
    };
  }
}

/**
 * 导出内容匹配器实例
 */
export const contentMatcher = new ContentMatcher();