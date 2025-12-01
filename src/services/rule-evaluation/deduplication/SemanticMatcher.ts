/**
 * 语义匹配器
 * 老王我把NLP技术整合进来了！能理解规则的语义含义，精准识别重复概念
 */

import { RuleInfo } from '../models/RuleModels';
import { DuplicateResult } from '../models/EvaluationModels';

/**
 * 语义匹配结果
 */
export interface SemanticMatchResult {
  ruleId: string;
  semanticSimilarity: number;
  conceptOverlap: number;
  keywordSimilarity: number;
  topicSimilarity: number;
  contextualSimilarity: number;
  matchDetails: {
    sharedConcepts: string[];
    sharedKeywords: string[];
    topicMatch: boolean;
    intentSimilarity: number;
    domainSimilarity: number;
  };
  confidence: number;
  explanation: string;
}

/**
 * 关键词提取结果
 */
export interface KeywordExtraction {
  concepts: string[];      // 概念词
  keywords: string[];      // 关键词
  technicalTerms: string[]; // 技术术语
  actions: string[];       // 动作词
  objects: string[];       // 对象词
  domains: string[];       // 领域词
  sentiment: string;       // 情感倾向
}

/**
 * 语义匹配配置
 */
export interface SemanticMatchConfig {
  weights: {
    concepts: number;
    keywords: number;
    topics: number;
    context: number;
    technicalTerms: number;
  };
  thresholds: {
    overall: number;
    conceptOverlap: number;
    keywordSimilarity: number;
    minSharedConcepts: number;
  };
  nlpSettings: {
    enableWordEmbedding: boolean;
    enableTopicModeling: boolean;
    enableIntentAnalysis: boolean;
    language: 'zh' | 'en' | 'mixed';
  };
  optimizations: {
    enableConceptCaching: boolean;
    enableKeywordPreprocessing: boolean;
    maxCacheSize: number;
  };
}

/**
 * 语义匹配器类
 * 基于NLP技术的智能语义相似度分析
 */
export class SemanticMatcher {
  private config: SemanticMatchConfig;
  private conceptCache: Map<string, KeywordExtraction> = new Map();
  private keywordCache: Map<string, string[]> = new Map();
  private domainDictionary: Map<string, string[]> = new Map();
  private conceptEmbeddings: Map<string, number[]> = new Map();

  constructor(config?: Partial<SemanticMatchConfig>) {
    this.config = this.getDefaultConfig();
    if (config) {
      this.mergeConfig(config);
    }
    this.initializeDomainDictionary();
    console.log('🧠 初始化语义匹配器');
  }

  /**
   * 执行语义匹配
   */
  async matchSemantic(rule: RuleInfo, candidateRules: RuleInfo[]): Promise<SemanticMatchResult[]> {
    const startTime = Date.now();

    try {
      // 1. 提取源规则的语义特征
      const sourceSemantic = await this.extractSemanticFeatures(rule);

      // 2. 检查缓存
      const cacheKey = this.generateSemanticCacheKey(rule);
      const cached = this.getCachedSemanticResult(cacheKey);
      if (cached && this.config.optimizations.enableConceptCaching) {
        return cached.filter(result =>
          candidateRules.some(candidate => candidate.id === result.ruleId)
        );
      }

      // 3. 批量处理候选规则
      const matchPromises = candidateRules.map(candidate =>
        this.calculateSemanticSimilarity(sourceSemantic, candidate)
      );

      const results = await Promise.all(matchPromises);

      // 4. 应用阈值过滤
      const filteredResults = results.filter(result =>
        result.semanticSimilarity >= this.config.thresholds.overall &&
        result.conceptOverlap >= this.config.thresholds.conceptOverlap &&
        result.matchDetails.sharedConcepts.length >= this.config.thresholds.minSharedConcepts
      );

      // 5. 按语义相似度排序
      const sortedResults = filteredResults.sort((a, b) => b.semanticSimilarity - a.semanticSimilarity);

      // 6. 缓存结果
      if (this.config.optimizations.enableConceptCaching) {
        this.setCachedSemanticResult(cacheKey, sortedResults);
      }

      const processingTime = Date.now() - startTime;
      console.debug(`🧠 语义匹配完成: ${rule.title} - 找到${sortedResults.length}个语义匹配 (${processingTime}ms)`);

      return sortedResults;

    } catch (error) {
      console.error('❌ 语义匹配失败:', error);
      return [];
    }
  }

  /**
   * 提取语义特征
   */
  private async extractSemanticFeatures(rule: RuleInfo): Promise<KeywordExtraction> {
    const cacheKey = `semantic_${rule.id}`;

    if (this.conceptCache.has(cacheKey)) {
      return this.conceptCache.get(cacheKey)!;
    }

    const text = `${rule.title} ${rule.description}`;

    // 提取各种语义特征
    const concepts = this.extractConcepts(text);
    const keywords = this.extractKeywords(text);
    const technicalTerms = this.extractTechnicalTerms(text);
    const actions = this.extractActions(text);
    const objects = this.extractObjects(text);
    const domains = this.extractDomains(text);
    const sentiment = this.analyzeSentiment(text);

    const features: KeywordExtraction = {
      concepts,
      keywords,
      technicalTerms,
      actions,
      objects,
      domains,
      sentiment
    };

    // 缓存结果
    if (this.config.optimizations.enableConceptCaching) {
      this.conceptCache.set(cacheKey, features);
    }

    return features;
  }

  /**
   * 计算语义相似度
   */
  private async calculateSemanticSimilarity(
    sourceSemantic: KeywordExtraction,
    candidateRule: RuleInfo
  ): Promise<SemanticMatchResult> {
    // 提取候选规则的语义特征
    const candidateSemantic = await this.extractSemanticFeatures(candidateRule);

    // 计算各维度相似度
    const conceptOverlap = this.calculateConceptOverlap(sourceSemantic.concepts, candidateSemantic.concepts);
    const keywordSimilarity = this.calculateKeywordSimilarity(sourceSemantic.keywords, candidateSemantic.keywords);
    const topicSimilarity = this.calculateTopicSimilarity(sourceSemantic.domains, candidateSemantic.domains);
    const contextualSimilarity = this.calculateContextualSimilarity(sourceSemantic, candidateSemantic);

    // 计算技术术语相似度
    const technicalSimilarity = this.calculateTechnicalSimilarity(
      sourceSemantic.technicalTerms,
      candidateSemantic.technicalTerms
    );

    // 计算综合语义相似度
    const semanticSimilarity =
      conceptOverlap * this.config.weights.concepts +
      keywordSimilarity * this.config.weights.keywords +
      topicSimilarity * this.config.weights.topics +
      contextualSimilarity * this.config.weights.context +
      technicalSimilarity * this.config.weights.technicalTerms;

    // 找出共享的概念和关键词
    const sharedConcepts = this.findSharedConcepts(sourceSemantic.concepts, candidateSemantic.concepts);
    const sharedKeywords = this.findSharedKeywords(sourceSemantic.keywords, candidateSemantic.keywords);

    // 分析意图相似度
    const intentSimilarity = this.calculateIntentSimilarity(sourceSemantic.actions, candidateSemantic.actions);

    // 分析领域相似度
    const domainSimilarity = this.calculateDomainSimilarity(sourceSemantic.domains, candidateSemantic.domains);

    // 计算置信度
    const confidence = this.calculateSemanticConfidence(
      semanticSimilarity,
      sharedConcepts.length,
      sharedKeywords.length
    );

    // 生成解释
    const explanation = this.generateSemanticExplanation(
      semanticSimilarity,
      sharedConcepts,
      sharedKeywords,
      intentSimilarity
    );

    return {
      ruleId: candidateRule.id,
      semanticSimilarity: Math.min(semanticSimilarity, 1.0),
      conceptOverlap,
      keywordSimilarity,
      topicSimilarity,
      contextualSimilarity,
      matchDetails: {
        sharedConcepts,
        sharedKeywords,
        topicMatch: topicSimilarity >= 0.6,
        intentSimilarity,
        domainSimilarity
      },
      confidence,
      explanation
    };
  }

  /**
   * 提取概念词
   */
  private extractConcepts(text: string): string[] {
    const concepts: string[] = [];

    // SQL相关概念词库
    const sqlConcepts = [
      'select', 'insert', 'update', 'delete', 'create', 'drop', 'alter',
      'index', 'table', 'view', 'procedure', 'function', 'trigger',
      'join', 'union', 'group', 'order', 'having', 'where',
      'performance', 'optimization', 'security', 'normalization',
      'transaction', 'lock', 'deadlock', 'backup', 'restore'
    ];

    // 中文概念词库
    const chineseConcepts = [
      '查询', '插入', '更新', '删除', '创建', '修改', '索引',
      '表', '视图', '存储过程', '函数', '触发器', '连接',
      '性能', '优化', '安全', '规范化', '事务', '锁',
      '死锁', '备份', '恢复', '数据库', 'SQL'
    ];

    const allConcepts = [...sqlConcepts, ...chineseConcepts];
    const normalizedText = text.toLowerCase();

    allConcepts.forEach(concept => {
      if (normalizedText.includes(concept.toLowerCase())) {
        concepts.push(concept);
      }
    });

    // 去重并返回
    return [...new Set(concepts)];
  }

  /**
   * 提取关键词
   */
  private extractKeywords(text: string): string[] {
    // 简化的关键词提取算法
    const words = text
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);

    // 过滤停用词
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      '是', '的', '了', '在', '有', '和', '与', '或', '但是', '然而', '因为', '所以', '如果'
    ]);

    const keywords = words.filter(word => !stopWords.has(word));

    // 统计词频并返回高频词
    const wordFreq = new Map<string, number>();
    keywords.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word);
  }

  /**
   * 提取技术术语
   */
  private extractTechnicalTerms(text: string): string[] {
    const technicalTerms: string[] = [];

    // SQL技术术语
    const sqlTerms = [
      'primary key', 'foreign key', 'constraint', 'cascade', 'null', 'not null',
      'unique', 'auto_increment', 'timestamp', 'datetime', 'varchar', 'int',
      'decimal', 'float', 'boolean', 'enum', 'json', 'xml', 'blob', 'text'
    ];

    const normalizedText = text.toLowerCase();

    sqlTerms.forEach(term => {
      if (normalizedText.includes(term.toLowerCase())) {
        technicalTerms.push(term);
      }
    });

    return technicalTerms;
  }

  /**
   * 提取动作词
   */
  private extractActions(text: string): string[] {
    const actionWords = [
      '检查', '验证', '测试', '分析', '优化', '改进', '修复', '解决',
      'check', 'verify', 'test', 'analyze', 'optimize', 'improve', 'fix', 'solve',
      '避免', '防止', '禁止', '限制', '要求', '建议', '推荐'
    ];

    const normalizedText = text.toLowerCase();
    const found: string[] = [];

    actionWords.forEach(action => {
      if (normalizedText.includes(action.toLowerCase())) {
        found.push(action);
      }
    });

    return found;
  }

  /**
   * 提取对象词
   */
  private extractObjects(text: string): string[] {
    const objectWords = [
      '数据', '表', '字段', '索引', '查询', '语句', '性能', '安全',
      'data', 'table', 'column', 'index', 'query', 'statement', 'performance', 'security',
      '用户', '权限', '角色', '连接', '事务', '锁'
    ];

    const normalizedText = text.toLowerCase();
    const found: string[] = [];

    objectWords.forEach(obj => {
      if (normalizedText.includes(obj.toLowerCase())) {
        found.push(obj);
      }
    });

    return found;
  }

  /**
   * 提取领域词
   */
  private extractDomains(text: string): string[] {
    const domains: string[] = [];

    // 检测不同领域
    if (/性能|优化|索引|查询计划|执行计划|performance|optimization|index/i.test(text)) {
      domains.push('performance');
    }

    if (/安全|权限|认证|授权|加密|security|permission|auth/i.test(text)) {
      domains.push('security');
    }

    if (/备份|恢复|容灾|高可用|backup|recovery|ha|availability/i.test(text)) {
      domains.push('reliability');
    }

    if (/设计|范式|规范化|结构|design|normalization|structure/i.test(text)) {
      domains.push('design');
    }

    return domains;
  }

  /**
   * 分析情感倾向
   */
  private analyzeSentiment(text: string): string {
    const positiveWords = ['优化', '改进', '提升', '推荐', '最佳', 'optimize', 'improve', 'enhance', 'best'];
    const negativeWords = ['避免', '禁止', '错误', '问题', '风险', 'avoid', 'prevent', 'error', 'issue', 'risk'];

    const normalizedText = text.toLowerCase();

    const positiveCount = positiveWords.filter(word => normalizedText.includes(word.toLowerCase())).length;
    const negativeCount = negativeWords.filter(word => normalizedText.includes(word.toLowerCase())).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * 计算概念重叠度
   */
  private calculateConceptOverlap(concepts1: string[], concepts2: string[]): number {
    if (concepts1.length === 0 || concepts2.length === 0) return 0;

    const set1 = new Set(concepts1);
    const set2 = new Set(concepts2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * 计算关键词相似度
   */
  private calculateKeywordSimilarity(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 || keywords2.length === 0) return 0;

    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));

    // 使用Jaccard相似度
    return intersection.size / Math.max(set1.size, set2.size);
  }

  /**
   * 计算主题相似度
   */
  private calculateTopicSimilarity(domains1: string[], domains2: string[]): number {
    if (domains1.length === 0 || domains2.length === 0) return 0.2; // 默认值

    const set1 = new Set(domains1);
    const set2 = new Set(domains2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));

    return intersection.size > 0 ? 1.0 : 0.3; // 有相同领域返回1.0，否则返回0.3
  }

  /**
   * 计算上下文相似度
   */
  private calculateContextualSimilarity(semantic1: KeywordExtraction, semantic2: KeywordExtraction): number {
    let similarity = 0;
    let factors = 0;

    // 情感倾向相似度
    if (semantic1.sentiment === semantic2.sentiment) {
      similarity += 0.3;
    }
    factors++;

    // 动作词相似度
    const actionSimilarity = this.calculateKeywordSimilarity(semantic1.actions, semantic2.actions);
    similarity += actionSimilarity * 0.3;
    factors++;

    // 对象词相似度
    const objectSimilarity = this.calculateKeywordSimilarity(semantic1.objects, semantic2.objects);
    similarity += objectSimilarity * 0.4;
    factors++;

    return similarity;
  }

  /**
   * 计算技术相似度
   */
  private calculateTechnicalSimilarity(tech1: string[], tech2: string[]): number {
    if (tech1.length === 0 || tech2.length === 0) return 0;

    const set1 = new Set(tech1);
    const set2 = new Set(tech2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));

    return intersection.size / Math.max(set1.size, set2.size);
  }

  /**
   * 查找共享概念
   */
  private findSharedConcepts(concepts1: string[], concepts2: string[]): string[] {
    const set1 = new Set(concepts1);
    const set2 = new Set(concepts2);
    return [...new Set([...set1].filter(x => set2.has(x)))];
  }

  /**
   * 查找共享关键词
   */
  private findSharedKeywords(keywords1: string[], keywords2: string[]): string[] {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    return [...new Set([...set1].filter(x => set2.has(x)))];
  }

  /**
   * 计算意图相似度
   */
  private calculateIntentSimilarity(actions1: string[], actions2: string[]): number {
    if (actions1.length === 0 || actions2.length === 0) return 0.5;

    const set1 = new Set(actions1);
    const set2 = new Set(actions2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));

    return intersection.size / Math.max(set1.size, set2.size);
  }

  /**
   * 计算领域相似度
   */
  private calculateDomainSimilarity(domains1: string[], domains2: string[]): number {
    return this.calculateTopicSimilarity(domains1, domains2);
  }

  /**
   * 计算语义置信度
   */
  private calculateSemanticConfidence(
    semanticSimilarity: number,
    sharedConceptsCount: number,
    sharedKeywordsCount: number
  ): number {
    let confidence = semanticSimilarity;

    // 概念数量加成
    if (sharedConceptsCount >= 2) {
      confidence += 0.1;
    }

    // 关键词数量加成
    if (sharedKeywordsCount >= 3) {
      confidence += 0.05;
    }

    return Math.min(confidence, 0.95);
  }

  /**
   * 生成语义解释
   */
  private generateSemanticExplanation(
    semanticSimilarity: number,
    sharedConcepts: string[],
    sharedKeywords: string[],
    intentSimilarity: number
  ): string {
    let explanation = '';

    if (semanticSimilarity >= 0.8) {
      explanation += '语义高度相似';
    } else if (semanticSimilarity >= 0.6) {
      explanation += '语义较为相似';
    } else {
      explanation += '语义有一定相似性';
    }

    if (sharedConcepts.length > 0) {
      explanation += `，共享概念：${sharedConcepts.slice(0, 3).join('、')}`;
    }

    if (sharedKeywords.length > 2) {
      explanation += `，关键词匹配度${(intentSimilarity * 100).toFixed(0)}%`;
    }

    return explanation;
  }

  /**
   * 初始化领域词典
   */
  private initializeDomainDictionary(): void {
    // 性能优化领域
    this.domainDictionary.set('performance', [
      'index', 'query', 'optimization', 'performance', 'slow', 'fast', 'efficient'
    ]);

    // 安全领域
    this.domainDictionary.set('security', [
      'security', 'permission', 'auth', 'encrypt', 'protect', 'vulnerable', 'safe'
    ]);

    // 设计领域
    this.domainDictionary.set('design', [
      'design', 'structure', 'normalization', 'schema', 'architecture', 'pattern'
    ]);

    // 可靠性领域
    this.domainDictionary.set('reliability', [
      'backup', 'recovery', 'ha', 'availability', 'redundancy', 'failover'
    ]);
  }

  /**
   * 生成语义缓存键
   */
  private generateSemanticCacheKey(rule: RuleInfo): string {
    return `semantic_${rule.id}_${rule.title}_${rule.category}`;
  }

  /**
   * 获取缓存的语义结果
   */
  private getCachedSemanticResult(key: string): SemanticMatchResult[] | null {
    // 简化实现，实际应该有完整的缓存机制
    return null;
  }

  /**
   * 设置缓存的语义结果
   */
  private setCachedSemanticResult(key: string, result: SemanticMatchResult[]): void {
    // 简化实现，实际应该有完整的缓存机制
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): SemanticMatchConfig {
    return {
      weights: {
        concepts: 0.3,
        keywords: 0.25,
        topics: 0.2,
        context: 0.15,
        technicalTerms: 0.1
      },
      thresholds: {
        overall: 0.6,
        conceptOverlap: 0.4,
        keywordSimilarity: 0.3,
        minSharedConcepts: 1
      },
      nlpSettings: {
        enableWordEmbedding: false, // 简化版本暂时禁用
        enableTopicModeling: true,
        enableIntentAnalysis: true,
        language: 'mixed'
      },
      optimizations: {
        enableConceptCaching: true,
        enableKeywordPreprocessing: true,
        maxCacheSize: 300
      }
    };
  }

  /**
   * 合并配置
   */
  private mergeConfig(userConfig: Partial<SemanticMatchConfig>): void {
    if (userConfig.weights) {
      this.config.weights = { ...this.config.weights, ...userConfig.weights };
    }
    if (userConfig.thresholds) {
      this.config.thresholds = { ...this.config.thresholds, ...userConfig.thresholds };
    }
    if (userConfig.nlpSettings) {
      this.config.nlpSettings = { ...this.config.nlpSettings, ...userConfig.nlpSettings };
    }
    if (userConfig.optimizations) {
      this.config.optimizations = { ...this.config.optimizations, ...userConfig.optimizations };
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<SemanticMatchConfig>): void {
    this.mergeConfig(newConfig);
    console.log('🔧 语义匹配器配置已更新');
  }

  /**
   * 获取当前配置
   */
  getConfig(): SemanticMatchConfig {
    return { ...this.config };
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.conceptCache.clear();
    this.keywordCache.clear();
    console.log('🧹 语义匹配器缓存已清理');
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    conceptCacheSize: number;
    keywordCacheSize: number;
    domainDictionarySize: number;
    config: SemanticMatchConfig;
  } {
    return {
      conceptCacheSize: this.conceptCache.size,
      keywordCacheSize: this.keywordCache.size,
      domainDictionarySize: this.domainDictionary.size,
      config: this.config
    };
  }
}

/**
 * 导出语义匹配器实例
 */
export const semanticMatcher = new SemanticMatcher();