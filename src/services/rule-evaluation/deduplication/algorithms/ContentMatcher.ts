/**
 * 内容特征匹配器
 * 老王我把内容匹配做得非常深入！基于文本分析算法的相似度检测！
 */

import { BaseRule, RuleInfo } from '../../models/RuleModels.js';
import { DuplicateMatch } from '../../models/EvaluationModels.js';
import { IMatcher } from '../SmartDuplicateDetector.js';

/**
 * 文本特征向量
 */
interface TextFeatures {
  tfidf: { [word: string]: number };     // TF-IDF向量
  bigrams: string[];                     // 二元语法
  trigrams: string[];                    // 三元语法
  keywords: string[];                   // 关键词
  entities: string[];                   // 命名实体
  sentiment: number;                    // 情感分数
  readability: number;                 // 可读性分数
  complexity: number;                  // 复杂度分数
}

/**
 * 内容特征匹配器类
 * 使用高级文本分析技术检测内容相似性
 */
export class ContentMatcher implements IMatcher {
  name = 'content';
  weight: number;
  private thresholds: any;
  private stopWords: Set<string>;
  private keywordDict: Map<string, number>;

  constructor(weight: number, thresholds: any) {
    this.weight = weight;
    this.thresholds = thresholds;
    this.initializeStopWords();
    this.initializeKeywordDict();
  }

  /**
   * 是否启用
   */
  isEnabled(): boolean {
    return this.weight > 0;
  }

  /**
   * 执行内容特征匹配
   */
  async match(newRule: BaseRule, existingRules: RuleInfo[]): Promise<DuplicateMatch[]> {
    const newFeatures = await this.extractTextFeatures(newRule.description || '');
    const matches: DuplicateMatch[] = [];

    for (const existingRule of existingRules) {
      const existingFeatures = await this.extractTextFeatures(existingRule.description || '');
      const similarity = this.calculateContentSimilarity(newFeatures, existingFeatures);

      if (similarity >= this.thresholds.warning) {
        matches.push({
          ruleId: existingRule.id,
          title: existingRule.title,
          category: existingRule.category,
          similarity,
          matchType: 'content',
          filePath: existingRule.metadata?.filePath || 'N/A'
        });
      }
    }

    // 按相似度排序并返回
    return matches.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * 提取文本特征
   */
  private async extractTextFeatures(text: string): Promise<TextFeatures> {
    if (!text || text.trim().length === 0) {
      return this.createEmptyFeatures();
    }

    const normalizedText = this.normalizeText(text);

    return {
      tfidf: this.calculateTFIDF(normalizedText),
      bigrams: this.extractNGrams(normalizedText, 2),
      trigrams: this.extractNGrams(normalizedText, 3),
      keywords: this.extractKeywords(normalizedText),
      entities: this.extractEntities(normalizedText),
      sentiment: this.calculateSentiment(normalizedText),
      readability: this.calculateReadability(normalizedText),
      complexity: this.calculateComplexity(normalizedText)
    };
  }

  /**
   * 创建空特征
   */
  private createEmptyFeatures(): TextFeatures {
    return {
      tfidf: {},
      bigrams: [],
      trigrams: [],
      keywords: [],
      entities: [],
      sentiment: 0,
      readability: 0,
      complexity: 0
    };
  }

  /**
   * 标准化文本
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5\s]/g, ' ') // 只保留中英文和空格
      .replace(/\s+/g, ' ') // 合并多个空格
      .trim();
  }

  /**
   * 计算TF-IDF向量
   */
  private calculateTFIDF(text: string): { [word: string]: number } {
    const words = this.tokenize(text);
    const tfidf: { [word: string]: number } = {};

    // 计算词频
    const wordCount: { [word: string]: number } = {};
    for (const word of words) {
      if (!this.stopWords.has(word) && word.length > 1) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    }

    // 计算TF-IDF
    const totalWords = Object.values(wordCount).reduce((sum, count) => sum + count, 0);
    for (const [word, count] of Object.entries(wordCount)) {
      const tf = count / totalWords;
      const idf = this.calculateIDF(word);
      tfidf[word] = tf * idf;
    }

    return tfidf;
  }

  /**
   * 提取N-gram
   */
  private extractNGrams(text: string, n: number): string[] {
    const words = this.tokenize(text);
    const ngrams: string[] = [];

    for (let i = 0; i <= words.length - n; i++) {
      const ngram = words.slice(i, i + n).join('_');
      ngrams.push(ngram);
    }

    return ngrams;
  }

  /**
   * 提取关键词
   */
  private extractKeywords(text: string): string[] {
    const words = this.tokenize(text);
    const keywords: string[] = [];

    for (const word of words) {
      // 跳过停用词和短词
      if (!this.stopWords.has(word) && word.length >= 2) {
        // 检查是否在关键词词典中
        if (this.keywordDict.has(word)) {
          keywords.push(word);
        }
        // 或者是技术术语
        else if (this.isTechnicalTerm(word)) {
          keywords.push(word);
        }
      }
    }

    // 返回去重后的关键词
    return [...new Set(keywords)];
  }

  /**
   * 提取命名实体
   */
  private extractEntities(text: string): string[] {
    const entities: string[] = [];

    // SQL相关实体
    const sqlEntities = [
      'select', 'insert', 'update', 'delete', 'create', 'drop', 'alter',
      'mysql', 'postgresql', 'oracle', 'sql server', 'mongodb', 'redis',
      'table', 'index', 'view', 'procedure', 'function', 'trigger',
      'join', 'where', 'group by', 'order by', 'having', 'union',
      'primary key', 'foreign key', 'unique key', 'not null'
    ];

    const normalizedText = text.toLowerCase();
    sqlEntities.forEach(entity => {
      if (normalizedText.includes(entity)) {
        entities.push(entity);
      }
    });

    // 提取数字模式
    const numberPatterns = text.match(/\b\d+\b/g);
    if (numberPatterns) {
      entities.push(...numberPatterns);
    }

    // 提取引用的内容
    const quotedContent = text.match(/`([^`]+)`/g);
    if (quotedContent) {
      entities.push(...quotedContent);
    }

    return [...new Set(entities)];
  }

  /**
   * 计算情感分数
   */
  private calculateSentiment(text: string): number {
    const positiveWords = ['好', '优秀', '推荐', '建议', '优化', '改进', '提升', '增强', 'best', 'good', 'excellent', 'recommend', 'improve', 'enhance'];
    const negativeWords = ['错误', '问题', '风险', '危险', '避免', '禁止', '防止', '错误', 'bad', 'error', 'issue', 'risk', 'danger', 'avoid', 'prevent'];

    const words = this.tokenize(text);
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (positiveWords.includes(word)) {
        positiveCount++;
      } else if (negativeWords.includes(word)) {
        negativeCount++;
      }
    }

    const totalSentimentWords = positiveCount + negativeCount;
    if (totalSentimentWords === 0) {
      return 0; // 中性
    }

    return (positiveCount - negativeCount) / totalSentimentWords;
  }

  /**
   * 计算可读性分数
   */
  private calculateReadability(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = this.tokenize(text);

    if (sentences.length === 0 || words.length === 0) {
      return 0;
    }

    // 简化的可读性计算
    const avgWordsPerSentence = words.length / sentences.length;
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;

    // 可读性分数 (0-1，越高越易读)
    const readabilityScore = Math.max(0, Math.min(1,
      1.0 - (avgWordsPerSentence / 50) - (avgWordLength / 10)
    ));

    return readabilityScore;
  }

  /**
   * 计算复杂度分数
   */
  private calculateComplexity(text: string): number {
    const words = this.tokenize(text);
    const uniqueWords = new Set(words);

    // 词汇丰富度
    const lexicalDiversity = words.length > 0 ? uniqueWords.size / words.length : 0;

    // 平均句子长度
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;

    // 复杂度分数 (0-1，越高越复杂)
    const complexityScore = (lexicalDiversity * 0.5) + (Math.min(avgSentenceLength / 30, 1) * 0.5);

    return Math.min(complexityScore, 1.0);
  }

  /**
   * 计算内容相似度
   */
  private calculateContentSimilarity(features1: TextFeatures, features2: TextFeatures): number {
    let totalScore = 0;
    let totalWeight = 0;

    // 1. TF-IDF相似度 (权重: 0.4)
    const tfidfSimilarity = this.calculateTFIDFSimilarity(features1.tfidf, features2.tfidf);
    totalScore += tfidfSimilarity * 0.4;
    totalWeight += 0.4;

    // 2. N-gram相似度 (权重: 0.3)
    const bigramSimilarity = this.calculateNGramSimilarity(features1.bigrams, features2.bigrams);
    const trigramSimilarity = this.calculateNGramSimilarity(features1.trigrams, features2.trigrams);
    const ngramSimilarity = (bigramSimilarity + trigramSimilarity) / 2;
    totalScore += ngramSimilarity * 0.3;
    totalWeight += 0.3;

    // 3. 关键词相似度 (权重: 0.2)
    const keywordSimilarity = this.calculateArraySimilarity(features1.keywords, features2.keywords);
    totalScore += keywordSimilarity * 0.2;
    totalWeight += 0.2;

    // 4. 实体相似度 (权重: 0.1)
    const entitySimilarity = this.calculateArraySimilarity(features1.entities, features2.entities);
    totalScore += entitySimilarity * 0.1;
    totalWeight += 0.1;

    return totalWeight > 0 ? totalScore / totalWeight : 0.0;
  }

  /**
   * 计算TF-IDF相似度
   */
  private calculateTFIDFSimilarity(tfidf1: { [word: string]: number }, tfidf2: { [word: string]: number }): number {
    const words1 = Object.keys(tfidf1);
    const words2 = Object.keys(tfidf2);

    if (words1.length === 0 && words2.length === 0) {
      return 1.0;
    }
    if (words1.length === 0 || words2.length === 0) {
      return 0.0;
    }

    // 计算余弦相似度
    const dotProduct = this.calculateDotProduct(tfidf1, tfidf2);
    const magnitude1 = this.calculateMagnitude(tfidf1);
    const magnitude2 = this.calculateMagnitude(tfidf2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0.0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * 计算N-gram相似度
   */
  private calculateNGramSimilarity(ngrams1: string[], ngrams2: string[]): number {
    if (ngrams1.length === 0 && ngrams2.length === 0) {
      return 1.0;
    }
    if (ngrams1.length === 0 || ngrams2.length === 0) {
      return 0.0;
    }

    const set1 = new Set(ngrams1);
    const set2 = new Set(ngrams2);
    const intersection = new Set([...set1].filter(item => set2.has(item)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? intersection.size / union.size : 0.0;
  }

  /**
   * 计算数组相似度
   */
  private calculateArraySimilarity(array1: string[], array2: string[]): number {
    if (array1.length === 0 && array2.length === 0) {
      return 1.0;
    }
    if (array1.length === 0 || array2.length === 0) {
      return 0.0;
    }

    const set1 = new Set(array1);
    const set2 = new Set(array2);
    const intersection = new Set([...set1].filter(item => set2.has(item)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? intersection.size / union.size : 0.0;
  }

  /**
   * 计算点积
   */
  private calculateDotProduct(vector1: { [word: string]: number }, vector2: { [word: string]: number }): number {
    const commonWords = Object.keys(vector1).filter(word => vector2.hasOwnProperty(word));
    return commonWords.reduce((sum, word) => sum + vector1[word] * vector2[word], 0);
  }

  /**
   * 计算向量大小
   */
  private calculateMagnitude(vector: { [word: string]: number }): number {
    const sumSquares = Object.values(vector).reduce((sum, value) => sum + value * value, 0);
    return Math.sqrt(sumSquares);
  }

  /**
   * 分词
   */
  private tokenize(text: string): string[] {
    return text
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  /**
   * 判断是否为技术术语
   */
  private isTechnicalTerm(word: string): boolean {
    // SQL关键字
    const sqlKeywords = ['select', 'insert', 'update', 'delete', 'create', 'drop', 'alter'];
    // 编程概念
    const programmingConcepts = ['function', 'method', 'class', 'object', 'variable', 'parameter'];
    // 技术概念
    const technicalConcepts = ['database', 'query', 'index', 'table', 'schema', 'constraint'];

    const allTechnicalWords = [...sqlKeywords, ...programmingConcepts, ...technicalConcepts];
    return allTechnicalWords.includes(word.toLowerCase());
  }

  /**
   * 初始化停用词
   */
  private initializeStopWords(): void {
    this.stopWords = new Set([
      // 中文停用词
      '的', '了', '在', '是', '有', '和', '与', '或', '但', '这', '那', '些',
      '一个', '一种', '一些', '可以', '应该', '需要', '能够', '进行', '执行',
      '使用', '利用', '通过', '根据', '基于', '为了', '关于', '对于',
      // 英文停用词
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'could',
      // 通用停用词
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'them', 'us',
      'this', 'that', 'these', 'those', 'what', 'which', 'who', 'when', 'where', 'why', 'how'
    ]);
  }

  /**
   * 初始化关键词词典
   */
  private initializeKeywordDict(): void {
    // SQL相关关键词
    this.keywordDict = new Map([
      ['sql', 3],
      ['query', 2],
      ['index', 2],
      ['table', 2],
      ['database', 3],
      ['performance', 2],
      ['security', 3],
      ['optimization', 2],
      ['mysql', 2],
      ['postgresql', 3],
      ['oracle', 2],
      ['join', 2],
      ['where', 1],
      ['select', 1]
    ]);
  }

  /**
   * 计算IDF
   */
  private calculateIDF(word: string): number {
    // 简化的IDF计算，实际应用中应该基于文档频率
    if (this.keywordDict.has(word)) {
      return 1.0; // 常见词汇
    }
    return 2.0; // 罕见词汇
  }

  /**
   * 获取匹配统计
   */
  getMatchStats(): {
    name: string;
    weight: number;
    thresholds: any;
    enabled: boolean;
  } {
    return {
      name: this.name,
      weight: this.weight,
      thresholds: this.thresholds,
      enabled: this.isEnabled()
    };
  }

  /**
   * 计算匹配复杂度
   */
  calculateComplexity(ruleCount: number): {
    timeComplexity: string;
    spaceComplexity: string;
    estimatedTime: number;
  } {
    // 内容匹配的时间复杂度是 O(n)，但由于需要计算文本特征，单次处理时间较长
    const estimatedTime = ruleCount * 0.2; // 每个规则约0.2ms

    return {
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(m)', // m为词汇表大小
      estimatedTime: Math.round(estimatedTime * 10) / 10
    };
  }

  /**
   * 验证配置
   */
  validateConfig(): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (this.weight < 0 || this.weight > 1) {
      errors.push('权重必须在0-1之间');
    }

    if (!this.thresholds || typeof this.thresholds.warning !== 'number') {
      errors.push('缺少内容特征匹配阈值配置');
    }

    if (this.thresholds.warning < 0 || this.thresholds.warning > 1) {
      errors.push('内容特征匹配阈值必须在0-1之间');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 调试信息
   */
  getDebugInfo(): any {
    return {
      name: this.name,
      weight: this.weight,
      thresholds: this.thresholds,
      enabled: this.isEnabled(),
      validation: this.validateConfig(),
      complexity: this.calculateComplexity(1000), // 假设1000个规则
      stopWordsCount: this.stopWords.size,
      keywordDictSize: this.keywordDict.size
    };
  }
}