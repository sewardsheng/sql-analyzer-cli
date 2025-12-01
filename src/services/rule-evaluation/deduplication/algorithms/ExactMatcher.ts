/**
 * 精确匹配器
 * 老王我把精确匹配做得滴水不漏！各种形式的完全匹配都覆盖了！
 */

import { BaseRule, RuleInfo } from '../../models/RuleModels.js';
import { DuplicateMatch } from '../../models/EvaluationModels.js';
import { IMatcher } from '../SmartDuplicateDetector.js';

/**
 * 精确匹配器类
 * 检测完全相同或几乎相同的规则
 */
export class ExactMatcher implements IMatcher {
  name = 'exact';
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
   * 执行精确匹配
   */
  async match(newRule: BaseRule, existingRules: RuleInfo[]): Promise<DuplicateMatch[]> {
    const matches: DuplicateMatch[] = [];

    for (const existingRule of existingRules) {
      const similarity = this.calculateExactSimilarity(newRule, existingRule);

      if (similarity >= this.thresholds.exact) {
        matches.push({
          ruleId: existingRule.id,
          title: existingRule.title,
          category: existingRule.category,
          similarity,
          matchType: 'title',
          filePath: existingRule.metadata?.filePath || 'N/A'
        });
      }
    }

    // 去重（避免同一个规则被多次匹配）
    const uniqueMatches = this.deduplicateMatches(matches);

    return uniqueMatches.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * 计算精确相似度
   */
  private calculateExactSimilarity(newRule: BaseRule, existingRule: RuleInfo): number {
    let totalScore = 0;
    let totalWeight = 0;

    // 1. 标题完全匹配 (权重: 0.4)
    const titleSimilarity = this.calculateTitleSimilarity(newRule.title, existingRule.title);
    totalScore += titleSimilarity * 0.4;
    totalWeight += 0.4;

    // 2. ID完全匹配 (权重: 0.3) - 如果有ID的话
    if (newRule.id && existingRule.id) {
      const idSimilarity = newRule.id === existingRule.id ? 1.0 : 0.0;
      totalScore += idSimilarity * 0.3;
      totalWeight += 0.3;
    }

    // 3. SQL模式完全匹配 (权重: 0.2)
    if (newRule.sqlPattern && existingRule.sqlPattern) {
      const patternSimilarity = newRule.sqlPattern === existingRule.sqlPattern ? 1.0 : 0.0;
      totalScore += patternSimilarity * 0.2;
      totalWeight += 0.2;
    }

    // 4. 严重程度匹配 (权重: 0.1)
    const severitySimilarity = newRule.severity === existingRule.severity ? 1.0 : 0.0;
    totalScore += severitySimilarity * 0.1;
    totalWeight += 0.1;

    return totalWeight > 0 ? totalScore / totalWeight : 0.0;
  }

  /**
   * 计算标题相似度
   */
  private calculateTitleSimilarity(title1: string, title2: string): number {
    const normalizedTitle1 = this.normalizeText(title1);
    const normalizedTitle2 = this.normalizeText(title2);

    // 完全相同
    if (normalizedTitle1 === normalizedTitle2) {
      return 1.0;
    }

    // 忽略标点符号的差异
    const title1NoPunct = normalizedTitle1.replace(/[^\w\u4e00-\u9fa5\s]/g, '');
    const title2NoPunct = normalizedTitle2.replace(/[^\w\u4e00-\u9fa5\s]/g, '');

    if (title1NoPunct === title2NoPunct) {
      return 0.98; // 几乎完全相同
    }

    // 包含关系
    if (title1NoPunct.includes(title2NoPunct) || title2NoPunct.includes(title1NoPunct)) {
      return 0.95; // 一个包含另一个
    }

    // 词组匹配
    const words1 = this.extractWords(normalizedTitle1);
    const words2 = this.extractWords(normalizedTitle2);

    if (words1.length === 0 && words2.length === 0) {
      return 0;
    }

    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;

    const wordSimilarity = totalWords > 0 ? commonWords.length / totalWords : 0;

    // 如果词相似度很高，认为是精确匹配
    return wordSimilarity >= 0.9 ? wordSimilarity : 0;
  }

  /**
   * 标准化文本
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')  // 合并多个空格
      .replace(/[^\w\u4e00-\u9fa5\s]/g, ''); // 移除非中英文和空格的字符
  }

  /**
   * 提取关键词
   */
  private extractWords(text: string): string[] {
    return text
      .split(/\s+/)
      .filter(word => word.length > 1) // 过滤单字符
      .filter(word => !this.isStopWord(word)); // 过滤停用词
  }

  /**
   * 检查是否为停用词
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      '的', '了', '是', '在', '有', '会', '可以', '应该', '需要',
      '进行', '执行', '检测', '规则', 'sql', '查询', '分析', '优化',
      '使用', '避免', '禁止', '防止', '检查', '处理', '操作', '方法',
      'the', 'a', 'an', 'and', 'or', 'in', 'on', 'for', 'with', 'to',
      'sql', 'rule', 'check', 'avoid', 'prevent', 'use', 'method'
    ]);

    return stopWords.has(word.toLowerCase());
  }

  /**
   * 去重匹配结果
   */
  private deduplicateMatches(matches: DuplicateMatch[]): DuplicateMatch[] {
    const seen = new Set<string>();
    const uniqueMatches: DuplicateMatch[] = [];

    for (const match of matches) {
      const key = `${match.ruleId}-${match.title}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueMatches.push(match);
      }
    }

    return uniqueMatches;
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
    // 精确匹配的时间复杂度是 O(n)，空间复杂度是 O(1)
    const estimatedTime = ruleCount * 0.1; // 每个规则约0.1ms

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

    if (!this.thresholds || typeof this.thresholds.exact !== 'number') {
      errors.push('缺少精确匹配阈值配置');
    }

    if (this.thresholds.exact < 0 || this.thresholds.exact > 1) {
      errors.push('精确匹配阈值必须在0-1之间');
    }

    if (this.thresholds.exact < 0.8) {
      console.warn('精确匹配阈值过低，可能产生误匹配');
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