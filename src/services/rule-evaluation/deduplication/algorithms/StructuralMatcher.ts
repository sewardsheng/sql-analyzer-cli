/**
 * 结构匹配器
 * 老王我把结构匹配做得非常细致！类别的严重程度都有精准匹配！
 */

import { BaseRule, RuleInfo } from '../../models/RuleModels.js';
import { DuplicateMatch } from '../../models/EvaluationModels.js';
import { IMatcher } from '../SmartDuplicateDetector.js';

/**
 * 规则结构特征接口
 */
interface RuleStructuralFeatures {
  category: string;                // 规则类别
  severity: string;                // 严重程度
  hasSqlPattern: boolean;         // 是否有SQL模式
  titleLength: number;             // 标题长度
  descriptionLength: number;       // 描述长度
  wordCount: number;               // 词汇数量
  keyPhrases: string[];            // 关键短语
  technicalTerms: string[];        // 技术术语
  actionWords: string[];           // 动作词汇
  databaseTypes: string[];         // 数据库类型
  hasExamples: boolean;           // 是否有示例
  riskLevel: string;              // 风险级别
}

/**
 * 结构匹配器类
 * 检测规则结构和属性的相似性
 */
export class StructuralMatcher implements IMatcher {
  name = 'structural';
  weight: number;
  private thresholds: any;

  constructor(weight: number, thresholds: any) {
    this.weight = weight;
    this.thresholds = thresholds;
  }

  /**
   * 是否启用
   */
  isEnabled(): boolean {
    return this.weight > 0;
  }

  /**
   * 执行结构匹配
   */
  async match(newRule: BaseRule, existingRules: RuleInfo[]): Promise<DuplicateMatch[]> {
    const newFeatures = this.extractStructuralFeatures(newRule);
    const matches: DuplicateMatch[] = [];

    for (const existingRule of existingRules) {
      const existingFeatures = this.extractStructuralFeaturesFromInfo(existingRule);
      const similarity = this.calculateStructuralSimilarity(newFeatures, existingFeatures);

      if (similarity >= this.thresholds.structural) {
        matches.push({
          ruleId: existingRule.id,
          title: existingRule.title,
          category: existingRule.category,
          similarity,
          matchType: 'structural',
          filePath: existingRule.metadata?.filePath || 'N/A'
        });
      }
    }

    // 按相似度排序并返回
    return matches.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * 提取规则结构特征
   */
  private extractStructuralFeatures(rule: BaseRule): RuleStructuralFeatures {
    return {
      category: rule.category || 'unknown',
      severity: rule.severity || 'medium',
      hasSqlPattern: !!rule.sqlPattern,
      titleLength: rule.title ? rule.title.length : 0,
      descriptionLength: rule.description ? rule.description.length : 0,
      wordCount: this.countWords(rule.description || ''),
      keyPhrases: this.extractKeyPhrases(rule.description || ''),
      technicalTerms: this.extractTechnicalTerms(rule.description || ''),
      actionWords: this.extractActionWords(rule.title || ''),
      databaseTypes: this.extractDatabaseTypes(rule.description || ''),
      hasExamples: false, // BaseRule没有示例信息，需要FullRule
      riskLevel: this.determineRiskLevel(rule.severity || 'medium')
    };
  }

  /**
   * 从规则信息提取结构特征
   */
  private extractStructuralFeaturesFromInfo(ruleInfo: RuleInfo): RuleStructuralFeatures {
    return {
      category: ruleInfo.category || 'unknown',
      severity: ruleInfo.severity || 'medium',
      hasSqlPattern: !!ruleInfo.sqlPattern,
      titleLength: ruleInfo.title ? ruleInfo.title.length : 0,
      descriptionLength: ruleInfo.description ? ruleInfo.description.length : 0,
      wordCount: this.countWords(ruleInfo.description || ''),
      keyPhrases: this.extractKeyPhrases(ruleInfo.description || ''),
      technicalTerms: this.extractTechnicalTerms(ruleInfo.description || ''),
      actionWords: this.extractActionWords(ruleInfo.title || ''),
      databaseTypes: this.extractDatabaseTypes(ruleInfo.description || ''),
      hasExamples: false, // RuleInfo没有示例信息
      riskLevel: this.determineRiskLevel(ruleInfo.severity || 'medium')
    };
  }

  /**
   * 计算结构相似度
   */
  private calculateStructuralSimilarity(features1: RuleStructuralFeatures, features2: RuleStructuralFeatures): number {
    let totalScore = 0;
    let totalWeight = 0;

    // 1. 类别匹配 (权重: 0.25)
    const categoryScore = features1.category === features2.category ? 1.0 : 0.0;
    totalScore += categoryScore * 0.25;
    totalWeight += 0.25;

    // 2. 严重程度匹配 (权重: 0.20)
    const severityScore = this.calculateSeveritySimilarity(features1.severity, features2.severity);
    totalScore += severityScore * 0.20;
    totalWeight += 0.20;

    // 3. 结构相似性 (标题长度、描述长度) (权重: 0.15)
    const structureScore = this.calculateStructureSimilarity(features1, features2);
    totalScore += structureScore * 0.15;
    totalWeight += 0.15;

    // 4. 内容特征相似性 (关键词、技术术语) (权重: 0.25)
    const contentScore = this.calculateContentSimilarity(features1, features2);
    totalScore += contentScore * 0.25;
    totalWeight += 0.25;

    // 5. 风险级别相似性 (权重: 0.15)
    const riskScore = features1.riskLevel === features2.riskLevel ? 1.0 : 0.5;
    totalScore += riskScore * 0.15;
    totalWeight += 0.15;

    return totalWeight > 0 ? totalScore / totalWeight : 0.0;
  }

  /**
   * 计算严重程度相似度
   */
  private calculateSeveritySimilarity(severity1: string, severity2: string): number {
    if (severity1 === severity2) {
      return 1.0;
    }

    const severityLevels = ['info', 'low', 'medium', 'high', 'critical'];
    const index1 = severityLevels.indexOf(severity1);
    const index2 = severityLevels.indexOf(severity2);

    if (index1 === -1 || index2 === -1) {
      return 0;
    }

    // 计算级别距离，距离越近相似度越高
    const distance = Math.abs(index1 - index2);
    const maxDistance = severityLevels.length - 1;

    return 1.0 - (distance / maxDistance);
  }

  /**
   * 计算结构相似性
   */
  private calculateStructureSimilarity(features1: RuleStructuralFeatures, features2: RuleStructuralFeatures): number {
    let score = 0;

    // SQL模式匹配
    if (features1.hasSqlPattern === features2.hasSqlPattern) {
      score += 0.3;
    }

    // 标题长度相似性
    const lengthDiff = Math.abs(features1.titleLength - features2.titleLength);
    const maxLength = Math.max(features1.titleLength, features2.titleLength);
    if (maxLength > 0) {
      score += 0.3 * (1.0 - lengthDiff / maxLength);
    }

    // 描述长度相似性
    const descLengthDiff = Math.abs(features1.descriptionLength - features2.descriptionLength);
    const maxDescLength = Math.max(features1.descriptionLength, features2.descriptionLength);
    if (maxDescLength > 0) {
      score += 0.2 * (1.0 - descLengthDiff / maxDescLength);
    }

    // 词汇数量相似性
    const wordCountDiff = Math.abs(features1.wordCount - features2.wordCount);
    const maxWordCount = Math.max(features1.wordCount, features2.wordCount);
    if (maxWordCount > 0) {
      score += 0.2 * (1.0 - wordCountDiff / maxWordCount);
    }

    return Math.min(score, 1.0);
  }

  /**
   * 计算内容特征相似性
   */
  private calculateContentSimilarity(features1: RuleStructuralFeatures, features2: RuleStructuralFeatures): number {
    let score = 0;
    let totalScore = 0;

    // 关键短语相似性
    const phraseSimilarity = this.calculateArraySimilarity(features1.keyPhrases, features2.keyPhrases);
    score += phraseSimilarity * 0.3;
    totalScore += 0.3;

    // 技术术语相似性
    const termSimilarity = this.calculateArraySimilarity(features1.technicalTerms, features2.technicalTerms);
    score += termSimilarity * 0.4;
    totalScore += 0.4;

    // 动作词汇相似性
    const actionSimilarity = this.calculateArraySimilarity(features1.actionWords, features2.actionWords);
    score += actionSimilarity * 0.2;
    totalScore += 0.2;

    // 数据库类型相似性
    const dbSimilarity = this.calculateArraySimilarity(features1.databaseTypes, features2.databaseTypes);
    score += dbSimilarity * 0.1;
    totalScore += 0.1;

    return totalScore > 0 ? score / totalScore : 0.0;
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

    const set1 = new Set(array1.map(item => item.toLowerCase()));
    const set2 = new Set(array2.map(item => item.toLowerCase()));

    const intersection = new Set([...set1].filter(item => set2.has(item)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? intersection.size / union.size : 0.0;
  }

  /**
   * 统计词汇数量
   */
  private countWords(text: string): number {
    if (!text || text.trim().length === 0) {
      return 0;
    }

    return text
      .split(/\s+/)
      .filter(word => word.length > 0)
      .length;
  }

  /**
   * 提取关键短语
   */
  private extractKeyPhrases(text: string): string[] {
    if (!text) return [];

    const phrases = [];
    const normalizedText = text.toLowerCase();

    // 常见的SQL关键短语
    const commonPhrases = [
      'sql注入', 'sql injection', '性能优化', 'performance optimization',
      '索引优化', 'index optimization', '查询优化', 'query optimization',
      '数据完整性', 'data integrity', '安全漏洞', 'security vulnerability',
      '最佳实践', 'best practice', '规范', 'standard', 'guideline'
    ];

    commonPhrases.forEach(phrase => {
      if (normalizedText.includes(phrase)) {
        phrases.push(phrase);
      }
    });

    // 提取引用的SQL模式
    const sqlPatternMatches = text.match(/`([^`]+)`/g);
    if (sqlPatternMatches) {
      phrases.push(...sqlPatternMatches.map(match => match.slice(1, -1)));
    }

    // 提取引号中的内容
    const quotedMatches = text.match(/"([^"]+)"/g);
    if (quotedMatches) {
      phrases.push(...quotedMatches.map(match => match.slice(1, -1)));
    }

    return phrases;
  }

  /**
   * 提取技术术语
   */
  private extractTechnicalTerms(text: string): string[] {
    if (!text) return [];

    const terms = [];
    const normalizedText = text.toLowerCase();

    // SQL技术术语
    const sqlTerms = [
      'select', 'insert', 'update', 'delete', 'create', 'drop', 'alter',
      'index', 'table', 'view', 'procedure', 'function', 'trigger',
      'join', 'left join', 'right join', 'inner join', 'outer join',
      'where', 'group by', 'order by', 'having', 'union',
      'primary key', 'foreign key', 'unique', 'not null',
      'transaction', 'commit', 'rollback', 'lock',
      'database', 'schema', 'query', 'statement', 'clause'
    ];

    sqlTerms.forEach(term => {
      if (normalizedText.includes(term)) {
        terms.push(term);
      }
    });

    // 数据库特定术语
    const dbTerms = [
      'mysql', 'postgresql', 'postgresql', 'sqlite', 'oracle', 'sql server',
      'mongodb', 'redis', 'cassandra', 'elasticsearch'
    ];

    dbTerms.forEach(term => {
      if (normalizedText.includes(term)) {
        terms.push(term);
      }
    });

    return terms;
  }

  /**
   * 提取动作词汇
   */
  private extractActionWords(title: string): string[] {
    if (!title) return [];

    const actionWords = [];
    const normalizedTitle = title.toLowerCase();

    // 常见的动作词汇
    const commonActions = [
      '避免', '防止', '禁止', '使用', '推荐', '建议', '应该', '必须',
      '不要', '确保', '检查', '验证', '优化', '改进', '修复',
      'avoid', 'prevent', 'forbid', 'use', 'recommend', 'suggest', 'should', 'must',
      'do not', 'ensure', 'check', 'verify', 'optimize', 'improve', 'fix'
    ];

    commonActions.forEach(action => {
      if (normalizedTitle.includes(action)) {
        actionWords.push(action);
      }
    });

    return actionWords;
  }

  /**
   * 提取数据库类型
   */
  private extractDatabaseTypes(text: string): string[] {
    if (!text) return [];

    const dbTypes = [];
    const normalizedText = text.toLowerCase();

    // 数据库类型映射
    const dbTypeMap = {
      'mysql': ['mysql'],
      'postgresql': ['postgresql', 'postgres'],
      'oracle': ['oracle'],
      'sql server': ['sql server', 'mssql'],
      'sqlite': ['sqlite'],
      'mongodb': ['mongodb', 'mongo'],
      'redis': ['redis'],
      'cassandra': ['cassandra'],
      'elasticsearch': ['elasticsearch', 'elastic']
    };

    Object.entries(dbTypeMap).forEach(([dbName, aliases]) => {
      if (aliases.some(alias => normalizedText.includes(alias))) {
        dbTypes.push(dbName);
      }
    });

    return dbTypes;
  }

  /**
   * 确定风险级别
   */
  private determineRiskLevel(severity: string): string {
    const severityMap: { [key: string]: string } = {
      'critical': 'high',
      'high': 'high',
      'medium': 'medium',
      'low': 'low',
      'info': 'low'
    };

    return severityMap[severity.toLowerCase()] || 'medium';
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
    // 结构匹配的时间复杂度是 O(n)，空间复杂度是 O(1)
    const estimatedTime = ruleCount * 0.05; // 每个规则约0.05ms

    return {
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(1)',
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

    if (!this.thresholds || typeof this.thresholds.structural !== 'number') {
      errors.push('缺少结构匹配阈值配置');
    }

    if (this.thresholds.structural < 0 || this.thresholds.structural > 1) {
      errors.push('结构匹配阈值必须在0-1之间');
    }

    if (this.thresholds.structural < 0.5) {
      console.warn('结构匹配阈值过低，可能产生误匹配');
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
      complexity: this.calculateComplexity(1000) // 假设1000个规则
    };
  }
}