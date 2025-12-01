/**
 * LLM工具类
 * 老王重构：简化LLM调用接口，统一错误处理和性能监控
 */

import { getLLMService } from '../../../core/llm-service';
import { RuleInfo } from '../models/RuleModels';
import { QualityResult, DuplicateResult } from '../models/EvaluationModels';
import * as fs from 'fs';
import { llmJsonParser } from '../../../core/llm-json-parser';

/**
 * LLM工具类
 * 为规则评估引擎提供统一的LLM调用接口
 */
export class LLMUtils {
  private static instance: LLMUtils;
  private llmService: any;
  private cache: Map<string, { result: any; timestamp: number }>;
  private cacheTimeout = 30 * 60 * 1000; // 30分钟缓存

  private constructor() {
    this.llmService = getLLMService();
    this.cache = new Map();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): LLMUtils {
    if (!LLMUtils.instance) {
      LLMUtils.instance = new LLMUtils();
    }
    return LLMUtils.instance;
  }

  /**
   * 评估规则质量（5维度评估）
   */
  async evaluateRuleQuality(rule: RuleInfo): Promise<QualityResult> {
    const cacheKey = `quality_${rule.id}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const prompt = this.buildQualityEvaluationPrompt(rule);
      const response = await this.llmService.call(prompt, {
        temperature: 0.3,
        maxTokens: 2000
      });

      if (!response.success) {
        throw new Error(`LLM调用失败: ${response.error}`);
      }

      const qualityResult = this.parseQualityResponse(response.content, rule);

      // 缓存结果
      this.setCachedResult(cacheKey, qualityResult);

      return qualityResult;
    } catch (error) {
      console.error('质量评估失败:', error);

      // 返回默认质量评估结果
      return this.getDefaultQualityResult(rule, error.message);
    }
  }

  /**
   * 检测规则重复
   */
  async checkRuleDuplicate(rule: RuleInfo, existingRules: RuleInfo[]): Promise<DuplicateResult> {
    const cacheKey = `duplicate_${rule.id}_${existingRules.length}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const prompt = this.buildDuplicateDetectionPrompt(rule, existingRules);
      const response = await this.llmService.call(prompt, {
        temperature: 0.2,
        maxTokens: 1500
      });

      if (!response.success) {
        throw new Error(`LLM调用失败: ${response.error}`);
      }

      const duplicateResult = this.parseDuplicateResponse(response.content, rule, existingRules);

      // 缓存结果
      this.setCachedResult(cacheKey, duplicateResult);

      return duplicateResult;
    } catch (error) {
      console.error('重复检测失败:', error);

      // 返回默认重复检测结果
      return this.getDefaultDuplicateResult(rule, error.message);
    }
  }

  /**
   * 批量质量评估
   */
  async evaluateBatchQuality(rules: RuleInfo[]): Promise<QualityResult[]> {
    const requests = rules.map(rule => ({
      prompt: this.buildQualityEvaluationPrompt(rule),
      options: { temperature: 0.3, maxTokens: 2000 }
    }));

    try {
      const responses = await this.llmService.callParallel(requests, {
        maxConcurrency: 3,
        timeout: 60000
      });

      return responses.map((response, index) => {
        if (response.success) {
          try {
            return this.parseQualityResponse(response.content, rules[index]);
          } catch (parseError) {
            console.error(`规则 ${rules[index].id} 质量评估解析失败:`, parseError);
            return this.getDefaultQualityResult(rules[index], parseError.message);
          }
        } else {
          console.error(`规则 ${rules[index].id} 质量评估失败:`, response.error);
          return this.getDefaultQualityResult(rules[index], response.error);
        }
      });
    } catch (error) {
      console.error('批量质量评估失败:', error);

      // 返回默认结果
      return rules.map(rule => this.getDefaultQualityResult(rule, error.message));
    }
  }

  /**
   * 构建质量评估提示词
   */
  private buildQualityEvaluationPrompt(rule: RuleInfo): string {
    // 获取规则文件内容
    const ruleContent = rule.metadata?.filePath
      ? this.loadRuleFileContent(rule.metadata.filePath)
      : this.generateRuleContentText(rule);

    return `您是一个专业的SQL规则质量评估专家，专门评估生成的SQL审核规则的质量和实用性。

## 任务目标
基于提供的规则文件内容，对生成的SQL规则进行全面的质量评估，包括准确性、完整性、实用性、通用性和一致性等维度。

## 规则文件内容
文件路径: ${rule.metadata?.filePath || 'generated-rule.md'}
\`\`\`
${ruleContent}
\`\`\`

## 评估维度

### 1. 准确性 (Accuracy) - 权重: 25%
- 规则描述是否准确反映了SQL问题
- 触发条件是否正确且可检测
- 示例代码是否准确展示问题和解决方案
- 技术细节是否正确无误

### 2. 完整性 (Completeness) - 权重: 20%
- 规则结构是否完整（标题、描述、触发条件、示例等）
- 是否提供了充分的上下文信息
- 建议是否具体且可操作
- 是否涵盖了问题的重要方面

### 3. 实用性 (Practicality) - 权重: 20%
- 规则是否具有实际应用价值
- 建议是否易于实施
- 是否考虑了实际开发环境
- 是否提供了明确的改进指导

### 4. 通用性 (Generality) - 权重: 20%
- 规则是否适用于多种场景
- 是否具有足够的抽象层次
- 是否过于具体或过于宽泛
- 是否能适应不同的数据库类型

### 5. 一致性 (Consistency) - 权重: 15%
- 与现有规则体系是否一致
- 术语使用是否统一
- 格式是否符合标准
- 严重程度评估是否合理

## 评分标准
- **90-100分**: 优秀 - 规则质量极高，可直接使用
- **70-89分**: 良好 - 规则质量较好，稍作调整后可使用
- **50-69分**: 一般 - 规则有一定价值，但需要较大改进
- **0-49分**: 较差 - 规则质量不足，不建议使用

## 输出格式
请严格按照以下JSON格式输出评估结果：

\`\`\`json
{
  "qualityScore": 85,
  "qualityLevel": "good",
  "shouldKeep": true,
  "dimensionScores": {
    "accuracy": 80,
    "completeness": 85,
    "practicality": 90,
    "generality": 85,
    "consistency": 85
  },
  "strengths": [
    "问题描述准确清晰",
    "示例代码具有代表性",
    "建议具体可操作"
  ],
  "issues": [
    "触发条件可以更精确",
    "可以增加更多边界情况说明"
  ],
  "recommendations": [
    "完善触发条件的描述",
    "增加更多实际应用场景的示例"
  ],
  "evaluationSummary": "规则整体质量良好，具有较高的实用价值，建议在完善触发条件后投入使用"
}
\`\`\`

现在请对提供的规则文件进行全面评估，并返回JSON格式的评估结果。`;
  }

  /**
   * 加载规则文件内容
   */
  private loadRuleFileContent(filePath: string): string {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.warn(`无法读取规则文件 ${filePath}:`, error.message);
      return '# 规则文件读取失败\n\n无法读取规则文件内容，请基于规则信息进行评估。';
    }
  }

  /**
   * 生成规则内容文本
   */
  private generateRuleContentText(rule: RuleInfo): string {
    let content = `# ${rule.title}\n\n`;
    content += `## 规则描述\n${rule.description}\n\n`;

    if (rule.sqlPattern) {
      content += `## SQL模式\n\`\`\`sql\n${rule.sqlPattern}\n\`\`\`\n\n`;
    }

    if (rule.examples && (rule.examples.bad?.length || rule.examples.good?.length)) {
      if (rule.examples.bad?.length) {
        content += `## 坏示例\n`;
        rule.examples.bad.forEach((example, index) => {
          content += `\`\`\`sql\n${example}\n\`\`\`\n\n`;
        });
      }

      if (rule.examples.good?.length) {
        content += `## 好示例\n`;
        rule.examples.good.forEach((example, index) => {
          content += `\`\`\`sql\n${example}\n\`\`\`\n\n`;
        });
      }
    }

    content += `## 规则属性\n`;
    content += `- 类别: ${rule.category}\n`;
    content += `- 严重程度: ${rule.severity}\n`;
    content += `- 标签: ${rule.tags.join(', ')}\n`;

    return content;
  }

  /**
   * 构建重复检测提示词
   */
  private buildDuplicateDetectionPrompt(rule: RuleInfo, existingRules: RuleInfo[]): string {
    const existingRulesText = existingRules.slice(0, 5).map(r =>
      `标题：${r.title}\n描述：${r.description.substring(0, 200)}...`
    ).join('\n\n---\n\n');

    return `请检测以下规则是否与现有规则重复：

新规则：
标题：${rule.title}
描述：${rule.description}
类别：${rule.category}

现有规则（前5条）：
${existingRulesText}

请按照以下JSON格式返回检测结果：
{
  "isDuplicate": false,
  "similarity": 0.15,
  "duplicateType": "none",
  "reason": "未检测到重复，主题和解决方案都有明显差异",
  "confidence": 0.9,
  "matchedRules": [],
  "matchDetails": {
    "exactMatch": {
      "title": false,
      "description": false,
      "sqlPattern": false
    },
    "semanticMatch": {
      "conceptSimilarity": 0.1,
      "keywordOverlap": 0.2
    },
    "structuralMatch": {
      "categoryMatch": false,
      "severityMatch": true
    }
  }
}

重复类型：
- exact: 精确重复（标题、描述高度相似）
- semantic: 语义重复（解决的问题相同）
- structural: 结构重复（类别、严重程度相似）
- none: 不重复

相似度分数：0-1，1表示完全重复`;
  }

  /**
   * 解析质量评估响应
   */
  private parseQualityResponse(content: string, rule: RuleInfo): QualityResult {
    try {
      // 使用专业的JSON解析器处理LLM响应
      const parseResult = llmJsonParser.parse(content, 'generic');

      if (!parseResult.success) {
        console.warn(`规则 ${rule.id} JSON解析失败，使用默认值:`, parseResult.error);
        return this.getDefaultQualityResult(rule, parseResult.error);
      }

      const parsed = parseResult.data;

      // 验证必要字段
      if (typeof parsed.qualityScore !== 'number') {
        throw new Error('质量评分缺失或格式错误');
      }

      // 填充默认值
      return {
        qualityScore: Math.min(100, Math.max(0, parsed.qualityScore)),
        dimensionScores: {
          accuracy: parsed.dimensionScores?.accuracy || 75,
          practicality: parsed.dimensionScores?.practicality || 75,
          completeness: parsed.dimensionScores?.completeness || 75,
          generality: parsed.dimensionScores?.generality || 75,
          consistency: parsed.dimensionScores?.consistency || 75
        },
        shouldKeep: parsed.shouldKeep ?? true,
        qualityLevel: this.getQualityLevel(parsed.qualityScore),
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        duplicateRisk: parsed.duplicateRisk || 'medium',
        evaluationSummary: parsed.evaluationSummary || `质量评分：${parsed.qualityScore}`,
        detailedAnalysis: {
          accuracy: {
            technicalCorrectness: parsed.dimensionScores?.accuracy || 75,
            exampleAccuracy: 75,
            descriptionAccuracy: 80
          },
          practicality: {
            realWorldValue: parsed.dimensionScores?.practicality || 75,
            solutionFeasibility: 80,
            implementationCost: 70
          },
          completeness: {
            requiredElements: parsed.dimensionScores?.completeness || 75,
            explanationDepth: 75,
            exampleCoverage: 70
          },
          generality: {
            scopeBreadth: parsed.dimensionScores?.generality || 75,
            scenarioFlexibility: 75,
            technologyAgnostic: 80
          },
          consistency: {
            formatCompliance: parsed.dimensionScores?.consistency || 75,
            terminologyConsistency: 80,
            structuralAlignment: 75
          }
        }
      };
    } catch (error) {
      console.error('解析质量评估响应失败:', error);
      throw new Error(`解析质量评估响应失败: ${error.message}`);
    }
  }

  /**
   * 解析重复检测响应
   */
  private parseDuplicateResponse(content: string, rule: RuleInfo, existingRules: RuleInfo[]): DuplicateResult {
    try {
      // 使用专业的JSON解析器处理LLM响应
      const parseResult = llmJsonParser.parse(content, 'generic');

      if (!parseResult.success) {
        console.warn(`规则 ${rule.id} 重复检测JSON解析失败，使用默认值:`, parseResult.error);
        return this.getDefaultDuplicateResult(rule, parseResult.error);
      }

      const parsed = parseResult.data;

      return {
        isDuplicate: Boolean(parsed.isDuplicate),
        similarity: Math.min(1, Math.max(0, parsed.similarity || 0)),
        duplicateType: parsed.duplicateType || 'none',
        reason: parsed.reason || '未检测到重复',
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        matchedRules: parsed.matchedRules || [],
        matchDetails: parsed.matchDetails || {}
      };
    } catch (error) {
      console.error('解析重复检测响应失败:', error);
      throw new Error(`解析重复检测响应失败: ${error.message}`);
    }
  }

  /**
   * 获取质量等级
   */
  private getQualityLevel(score: number): QualityResult['qualityLevel'] {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
  }

  /**
   * 获取默认质量评估结果
   */
  private getDefaultQualityResult(rule: RuleInfo, errorMessage: string): QualityResult {
    return {
      qualityScore: 50,
      dimensionScores: {
        accuracy: 50,
        practicality: 50,
        completeness: 50,
        generality: 50,
        consistency: 50
      },
      shouldKeep: false,
      qualityLevel: 'fair',
      strengths: [],
      issues: [`评估失败: ${errorMessage}`],
      suggestions: ['请检查规则格式', '稍后重试评估'],
      duplicateRisk: 'medium',
      evaluationSummary: `评估失败，使用默认评分`,
      detailedAnalysis: {
        accuracy: { technicalCorrectness: 50, exampleAccuracy: 50, descriptionAccuracy: 50 },
        practicality: { realWorldValue: 50, solutionFeasibility: 50, implementationCost: 50 },
        completeness: { requiredElements: 50, explanationDepth: 50, exampleCoverage: 50 },
        generality: { scopeBreadth: 50, scenarioFlexibility: 50, technologyAgnostic: 50 },
        consistency: { formatCompliance: 50, terminologyConsistency: 50, structuralAlignment: 50 }
      }
    };
  }

  /**
   * 获取默认重复检测结果
   */
  private getDefaultDuplicateResult(rule: RuleInfo, errorMessage: string): DuplicateResult {
    return {
      isDuplicate: false,
      similarity: 0,
      duplicateType: 'none',
      reason: `检测失败: ${errorMessage}，默认为不重复`,
      confidence: 0.3,
      matchedRules: [],
      matchDetails: {}
    };
  }

  /**
   * 获取缓存结果
   */
  private getCachedResult(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }

    if (cached) {
      this.cache.delete(key);
    }

    return null;
  }

  /**
   * 设置缓存结果
   */
  private setCachedResult(key: string, result: any): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * 清理过期缓存
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 测试LLM连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.llmService.testConnection();
      return result.success;
    } catch (error) {
      console.error('LLM连接测试失败:', error);
      return false;
    }
  }

  /**
   * 获取LLM服务状态
   */
  getServiceStatus(): any {
    return this.llmService.getStatus();
  }
}

/**
 * 导出LLM工具类实例
 */
export const llmUtils = LLMUtils.getInstance();