/**
 * 规则重复检测服务
 * 用于检测新生成的规则是否与现有规则重复
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseRule } from './types';

/**
 * 规则信息接口
 */
export interface RuleInfo {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  sqlPattern?: string;
  filePath: string;
}

/**
 * 重复检测结果
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  similarity: number;
  matchedRules: RuleInfo[];
  duplicateType: 'exact' | 'high_similarity' | 'none';
}

/**
 * 规则重复检测器
 */
export class RuleDuplicateDetector {
  private rulesDir: string;
  private existingRules: Map<string, RuleInfo[]> = new Map(); // 按类别分组的规则

  constructor(rulesDir: string = 'rules/learning-rules') {
    this.rulesDir = rulesDir;
  }

  /**
   * 加载现有规则
   */
  async loadExistingRules(): Promise<void> {
    console.log(`=== 调试：开始加载现有规则从 ${this.rulesDir} ===`);

    try {
      const subdirs = await fs.readdir(this.rulesDir, { withFileTypes: true });

      for (const subdir of subdirs) {
        if (subdir.isDirectory()) {
          const subdirPath = path.join(this.rulesDir, subdir.name);
          await this.loadRulesFromDirectory(subdirPath);
        }
      }

      console.log(`=== 调试：加载完成，总共加载了 ${this.getTotalRulesCount()} 个规则 ===`);
    } catch (error) {
      console.warn('加载现有规则失败:', error.message);
    }
  }

  /**
   * 从指定目录加载规则
   */
  private async loadRulesFromDirectory(dirPath: string): Promise<void> {
    try {
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        if (file.endsWith('.md')) {
          const filePath = path.join(dirPath, file);
          await this.loadRuleFromFile(filePath);
        }
      }
    } catch (error) {
      // 忽略目录访问错误
    }
  }

  /**
   * 从文件加载单个规则
   */
  private async loadRuleFromFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const ruleInfo = this.parseRuleFile(content, filePath);

      if (ruleInfo) {
        const category = ruleInfo.category || 'unknown';

        if (!this.existingRules.has(category)) {
          this.existingRules.set(category, []);
        }

        this.existingRules.get(category)!.push(ruleInfo);
        console.log(`=== 调试：加载规则 [${category}] ${ruleInfo.title} ===`);
      }
    } catch (error) {
      console.warn(`解析规则文件失败 ${filePath}:`, error.message);
    }
  }

  /**
   * 解析规则文件内容
   */
  private parseRuleFile(content: string, filePath: string): RuleInfo | null {
    try {
      // 提取标题
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : '';

      // 提取规则类别
      const categoryMatch = content.match(/\*\*规则类别\*\*:\s*(.+)$/m);
      const category = categoryMatch ? categoryMatch[1].trim() : '';

      // 提取严重程度
      const severityMatch = content.match(/\*\*严重程度\*\*:\s*(.+)$/m);
      const severity = severityMatch ? severityMatch[1].trim() : '';

      // 提取规则描述
      const descriptionMatch = content.match(/##\s*规则描述\s*\n\n(.+?)(?=\n##|\n---|\n\*\*)/s);
      const description = descriptionMatch ? descriptionMatch[1].trim() : '';

      // 提取SQL模式（如果存在）
      const sqlPatternMatch = content.match(/\*\*SQL模式\*\*:\s*(.+)$/m);
      const sqlPattern = sqlPatternMatch ? sqlPatternMatch[1].trim() : undefined;

      // 提取规则ID
      const idMatch = content.match(/\*\*规则ID\*\*:\s*(.+)$/m);
      const id = idMatch ? idMatch[1].trim() : this.generateRuleId(title, category);

      if (!title) {
        console.warn(`规则文件缺少标题: ${filePath}`);
        return null;
      }

      return {
        id,
        title,
        description,
        category,
        severity,
        sqlPattern,
        filePath
      };
    } catch (error) {
      console.warn(`解析规则内容失败 ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * 生成规则ID
   */
  private generateRuleId(title: string, category: string): string {
    const normalized = title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return `${category}-${normalized}`;
  }

  /**
   * 检查规则是否重复
   */
  async checkDuplicate(newRule: BaseRule): Promise<DuplicateCheckResult> {
    console.log(`=== 调试：开始检查规则重复性: ${newRule.title} ===`);

    const newRuleInfo: RuleInfo = {
      id: newRule.id,
      title: newRule.title,
      description: newRule.description,
      category: newRule.category,
      severity: newRule.severity,
      sqlPattern: newRule.sqlPattern,
      filePath: ''
    };

    // 1. 检查完全相同的规则
    const exactDuplicate = this.findExactDuplicate(newRuleInfo);
    if (exactDuplicate) {
      console.log(`=== 调试：发现完全重复的规则: ${exactDuplicate.title} ===`);
      return {
        isDuplicate: true,
        similarity: 1.0,
        matchedRules: [exactDuplicate],
        duplicateType: 'exact'
      };
    }

    // 2. 检查高相似度规则
    const similarRules = this.findSimilarRules(newRuleInfo, 0.8);
    if (similarRules.length > 0) {
      console.log(`=== 调试：发现 ${similarRules.length} 个高相似度规则 ===`);
      return {
        isDuplicate: true,
        similarity: Math.max(...similarRules.map(r => this.calculateSimilarity(newRuleInfo, r))),
        matchedRules: similarRules,
        duplicateType: 'high_similarity'
      };
    }

    // 3. 检查中等相似度规则（用于警告）
    const mediumSimilarRules = this.findSimilarRules(newRuleInfo, 0.6);
    if (mediumSimilarRules.length > 0) {
      console.log(`=== 调试：发现 ${mediumSimilarRules.length} 个中等相似度规则（仅警告） ===`);
      return {
        isDuplicate: false,
        similarity: Math.max(...mediumSimilarRules.map(r => this.calculateSimilarity(newRuleInfo, r))),
        matchedRules: mediumSimilarRules,
        duplicateType: 'none'
      };
    }

    console.log(`=== 调试：未发现重复规则 ===`);
    return {
      isDuplicate: false,
      similarity: 0,
      matchedRules: [],
      duplicateType: 'none'
    };
  }

  /**
   * 查找完全相同的规则
   */
  private findExactDuplicate(newRule: RuleInfo): RuleInfo | null {
    const categoryRules = this.existingRules.get(newRule.category) || [];

    return categoryRules.find(existing =>
      existing.title.toLowerCase().trim() === newRule.title.toLowerCase().trim() ||
      (existing.description && newRule.description &&
       existing.description.toLowerCase().trim() === newRule.description.toLowerCase().trim())
    ) || null;
  }

  /**
   * 查找相似规则
   */
  private findSimilarRules(newRule: RuleInfo, threshold: number): RuleInfo[] {
    const categoryRules = this.existingRules.get(newRule.category) || [];
    const similarRules: RuleInfo[] = [];

    for (const existing of categoryRules) {
      const similarity = this.calculateSimilarity(newRule, existing);
      if (similarity >= threshold) {
        similarRules.push(existing);
      }
    }

    return similarRules.sort((a, b) =>
      this.calculateSimilarity(newRule, b) - this.calculateSimilarity(newRule, a)
    );
  }

  /**
   * 计算两个规则的相似度
   */
  private calculateSimilarity(rule1: RuleInfo, rule2: RuleInfo): number {
    let totalScore = 0;
    let totalWeight = 0;

    // 标题相似度（权重：0.4）
    const titleSimilarity = this.calculateTextSimilarity(rule1.title, rule2.title);
    totalScore += titleSimilarity * 0.4;
    totalWeight += 0.4;

    // 描述相似度（权重：0.3）
    if (rule1.description && rule2.description) {
      const descSimilarity = this.calculateTextSimilarity(rule1.description, rule2.description);
      totalScore += descSimilarity * 0.3;
      totalWeight += 0.3;
    }

    // SQL模式相似度（权重：0.2）
    if (rule1.sqlPattern && rule2.sqlPattern) {
      const patternSimilarity = rule1.sqlPattern === rule2.sqlPattern ? 1 : 0;
      totalScore += patternSimilarity * 0.2;
      totalWeight += 0.2;
    }

    // 严重程度相似度（权重：0.1）
    const severitySimilarity = rule1.severity === rule2.severity ? 1 : 0;
    totalScore += severitySimilarity * 0.1;
    totalWeight += 0.1;

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * 计算文本相似度（简化版）
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const cleanText1 = text1.toLowerCase().trim();
    const cleanText2 = text2.toLowerCase().trim();

    if (cleanText1 === cleanText2) {
      return 1;
    }

    // 简单的包含关系检查
    if (cleanText1.includes(cleanText2) || cleanText2.includes(cleanText1)) {
      return 0.8;
    }

    // 关键词重叠度
    const words1 = this.extractKeywords(cleanText1);
    const words2 = this.extractKeywords(cleanText2);

    if (words1.length === 0 && words2.length === 0) {
      return 0;
    }

    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];

    return union.length > 0 ? intersection.length / union.length : 0;
  }

  /**
   * 提取关键词
   */
  private extractKeywords(text: string): string[] {
    // 简单的关键词提取：移除停用词，提取有意义的词汇
    const stopWords = new Set(['的', '了', '和', '是', '在', '有', '会', '可以', '应该', '需要', '进行', '执行', '检测', '规则', 'sql']);

    return text
      .replace(/[^\w\u4e00-\u9fa5\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1 && !stopWords.has(word))
      .slice(0, 10); // 限制关键词数量
  }

  /**
   * 获取规则总数
   */
  private getTotalRulesCount(): number {
    let total = 0;
    for (const rules of this.existingRules.values()) {
      total += rules.length;
    }
    return total;
  }

  /**
   * 获取现有规则统计
   */
  getRulesStats(): { [category: string]: number } {
    const stats: { [category: string]: number } = {};

    for (const [category, rules] of this.existingRules.entries()) {
      stats[category] = rules.length;
    }

    return stats;
  }

  /**
   * 清空缓存的规则
   */
  clearCache(): void {
    this.existingRules.clear();
    console.log('=== 调试：规则缓存已清空 ===');
  }
}

/**
 * 全局重复检测器实例
 */
let globalDetector: RuleDuplicateDetector | null = null;

/**
 * 获取全局重复检测器
 */
export function getRuleDuplicateDetector(rulesDir?: string): RuleDuplicateDetector {
  if (!globalDetector) {
    globalDetector = new RuleDuplicateDetector(rulesDir);
  }
  return globalDetector;
}

/**
 * 便捷函数：检查规则重复
 */
export async function checkRuleDuplicate(
  rule: BaseRule,
  rulesDir?: string
): Promise<DuplicateCheckResult> {
  const detector = getRuleDuplicateDetector(rulesDir);

  // 如果是第一次使用，加载现有规则
  if (detector.getRulesStats && Object.keys(detector.getRulesStats()).length === 0) {
    await detector.loadExistingRules();
  }

  return await detector.checkDuplicate(rule);
}