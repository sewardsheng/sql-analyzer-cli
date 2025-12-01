/**
 * RuleGenerator - SQL规则生成器
 * 基于分析结果生成高质量的SQL审核规则
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getLLMService } from '../../core/llm-service.js';
import { buildPrompt } from '../../utils/format/prompt-loader.js';
import { checkRuleDuplicate } from './rule-duplicate-detector.js';
import { llmJsonParser } from '../../core/llm-json-parser.js';
import { info, error, warn } from '../../utils/logger.js';
import { LogCategory } from '../../utils/logger.js';

/**
 * 规则测试用例接口
 */
interface RuleTestCase {
  sql: string;
  analysisResult: any;
  databaseType: string;
  timestamp: string;
  context: {
    performance: any;
    security: any;
    standards: any;
  };
}

/**
 * 生成指标
 */
interface GenerationMetrics {
  totalGenerated: number;
  successful: number;
  failed: number;
  generationTime: number;
  averageConfidence: number;
  categories: Record<string, number>;
}

/**
 * 基础规则接口
 */
interface BaseRule {
  id: string;
  title: string;
  description: string;
  category: 'performance' | 'security' | 'standards' | 'best_practices';
  severity: 'low' | 'medium' | 'high' | 'critical';
  sqlPattern: string;
  examples: {
    bad: string[];
    good: string[];
  };
  explanation: string;
  recommendations: string[];
  applicableDatabases: string[];
  confidence: number;
  metadata: {
    generatedAt: string;
    sourceAnalysis: string;
    testCases: string[];
  };
}

/**
 * 测试驱动的规则生成器
 */
export class RuleGenerator {
  private llmService: any;
  private metrics: GenerationMetrics;
  private outputDir: string;

  constructor(llmService: any, outputDir: string = 'rules/learning-rules/manual_review') {
    this.llmService = llmService;
    this.metrics = {
      totalGenerated: 0,
      successful: 0,
      failed: 0,
      generationTime: 0,
      averageConfidence: 0,
      categories: {}
    };
    // 直接使用输出目录，不再创建年月子目录
    this.outputDir = outputDir;
  }

  /**
   * 从分析结果生成规则
   */
  async generateRules(testCase: RuleTestCase): Promise<BaseRule[]> {
    const startTime = Date.now();

    try {
      info(LogCategory.RULE_LEARNING, '开始生成规则', {
        sql: testCase.sql.substring(0, 100),
        databaseType: testCase.databaseType
      });

      // 调试信息：打印分析结果结构
      console.log('=== 调试：分析结果结构 ===');
      console.log('testCase.analysisResult keys:', Object.keys(testCase.analysisResult));
      if (testCase.analysisResult.performance) {
        console.log('performance keys:', Object.keys(testCase.analysisResult.performance));
      }
      if (testCase.analysisResult.security) {
        console.log('security keys:', Object.keys(testCase.analysisResult.security));
      }
      if (testCase.analysisResult.standards) {
        console.log('standards keys:', Object.keys(testCase.analysisResult.standards));
      }

      // 1. 分析测试用例，识别可学习的模式
      const learningPatterns = await this.analyzeTestPatterns(testCase);

      console.log('=== 调试：学习模式数量 ===');
      console.log('learningPatterns length:', learningPatterns.length);
      if (learningPatterns.length > 0) {
        console.log('first pattern:', learningPatterns[0]);
      }

      if (learningPatterns.length === 0) {
        info(LogCategory.RULE_LEARNING, '未发现可学习的模式，跳过规则生成');
        return [];
      }

      // 2. 为每个模式生成规则
      const generatedRules: BaseRule[] = [];

      for (const pattern of learningPatterns) {
        try {
          const rule = await this.generateRuleForPattern(testCase, pattern);
          if (rule) {
            await this.validateAndSaveRule(rule, testCase);
            generatedRules.push(rule);
            this.metrics.successful++;
          }
        } catch (error) {
          // 如果是重复规则错误，记录但不计入失败
          if (error.message && error.message.includes('规则重复')) {
            warn(LogCategory.RULE_LEARNING, '跳过重复规则', {
              pattern: pattern.type,
              reason: error.message
            });
            // 不增加failed计数，这是预期的行为
          } else {
            error(LogCategory.RULE_LEARNING, '规则生成失败', error, {
              pattern: pattern.type,
              sql: testCase.sql.substring(0, 50)
            });
            this.metrics.failed++;
          }
        }
      }

      // 3. 更新生成指标
      this.updateMetrics(startTime, generatedRules);

      info(LogCategory.RULE_LEARNING, '规则生成完成', {
        total: generatedRules.length,
        successful: generatedRules.length,
        failed: this.metrics.failed,
        generationTime: Date.now() - startTime
      });

      return generatedRules;

    } catch (error) {
      error(LogCategory.RULE_LEARNING, '规则生成过程失败', error);
      this.metrics.failed++;
      return [];
    }
  }

  /**
   * 分析测试用例中的学习模式
   */
  private async analyzeTestPatterns(testCase: RuleTestCase): Promise<Array<{
    type: string;
    severity: string;
    description: string;
    category: string;
    sqlLocation: string;
  }>> {
    const patterns: Array<{
      type: string;
      severity: string;
      description: string;
      category: string;
      sqlLocation: string;
    }> = [];

    console.log('=== 调试：analyzeTestPatterns 开始 ===');
    console.log('testCase.analysisResult 类型:', typeof testCase.analysisResult);
    console.log('testCase.analysisResult 是否为数组:', Array.isArray(testCase.analysisResult));

    // 使用现有的LLM JSON解析器提取问题
    try {
      // 使用ES模块导入
      const { llmJsonParser } = await import('../../core/llm-json-parser.js');

      console.log('=== 调试：开始解析 analysisResult ===');

      // 如果 analysisResult 是数组，取第一个元素
      let analysisData = testCase.analysisResult;
      if (Array.isArray(analysisData) && analysisData.length > 0) {
        analysisData = analysisData[0];
        console.log('检测到数组格式，取第一个元素');
      }

      console.log('analysisData keys:', Object.keys(analysisData || {}));

      // 从各个维度中提取问题
      ['performance', 'security', 'standards'].forEach(dimension => {
        console.log(`=== 调试：处理 ${dimension} 维度 ===`);

        let dimensionData = analysisData[dimension];
        console.log(`${dimension} 原始数据类型:`, typeof dimensionData);

        if (!dimensionData) {
          console.log(`${dimension} 维度数据为空，跳过`);
          return;
        }

        // 尝试从 rawResponse 中解析JSON
        if (dimensionData.rawResponse) {
          console.log(`尝试从 ${dimension}.rawResponse 解析JSON`);
          console.log(`${dimension}.rawResponse 长度:`, dimensionData.rawResponse.length);
          console.log(`${dimension}.rawResponse 开头:`, dimensionData.rawResponse.substring(0, 200));

          let extractedData = null;
          try {
            extractedData = llmJsonParser.extractJsonFromMarkdown(dimensionData.rawResponse);
            console.log(`${dimension}.rawResponse 解析结果:`, extractedData ? '成功' : '失败');
          } catch (parseError) {
            console.error(`${dimension}.rawResponse 解析异常:`, parseError.message);
          }

          if (extractedData) {
            console.log(`${dimension} 解析出的键:`, Object.keys(extractedData));
            console.log(`${dimension} 是否有issues:`, !!extractedData.issues, Array.isArray(extractedData.issues) ? extractedData.issues.length : 'not array');
          } else {
            // 尝试直接解析原始字符串为JSON
            try {
              extractedData = JSON.parse(dimensionData.rawResponse);
              console.log(`${dimension}.rawResponse 直接JSON解析成功`);
              console.log(`${dimension} 直接解析出的键:`, Object.keys(extractedData || {}));
              console.log(`${dimension} 直接解析是否有issues:`, !!(extractedData && extractedData.issues), Array.isArray(extractedData?.issues) ? extractedData.issues.length : 'not array');
            } catch (directParseError) {
              console.error(`${dimension}.rawResponse 直接JSON解析也失败:`, directParseError.message);
            }
          }

          if (extractedData && extractedData.issues && Array.isArray(extractedData.issues)) {
            console.log(`${dimension} 从 rawResponse 中提取到 ${extractedData.issues.length} 个问题`);
            for (const issue of extractedData.issues) {
              patterns.push({
                type: issue.title || issue.type || `${dimension}_issue`,
                severity: issue.severity || 'medium',
                description: issue.description || issue.summary || '',
                category: dimension,
                sqlLocation: issue.location || ''
              });
            }
          } else {
            console.log(`${dimension}.rawResponse 中未找到有效的 issues 数组`);
            // 添加调试信息
            if (extractedData) {
              console.log(`${dimension} 提取到的数据结构:`, JSON.stringify(extractedData, null, 2).substring(0, 500));
            }
          }
        }

        // 如果 rawResponse 没找到，尝试从 summary 中解析
        else if (dimensionData.summary && typeof dimensionData.summary === 'string') {
          console.log(`尝试从 ${dimension}.summary 解析JSON`);
          const extractedData = llmJsonParser.extractJsonFromMarkdown(dimensionData.summary);
          console.log(`${dimension}.summary 解析结果:`, extractedData ? '成功' : '失败');

          if (extractedData && extractedData.issues && Array.isArray(extractedData.issues)) {
            console.log(`${dimension} 从 summary 中提取到 ${extractedData.issues.length} 个问题`);
            for (const issue of extractedData.issues) {
              patterns.push({
                type: issue.title || issue.type || `${dimension}_issue`,
                severity: issue.severity || 'medium',
                description: issue.description || issue.summary || '',
                category: dimension,
                sqlLocation: issue.location || ''
              });
            }
          } else {
            console.log(`${dimension}.summary 中未找到有效的 issues 数组`);
          }
        }

        // 如果维度数据直接包含 issues，直接使用
        else if (dimensionData.issues && Array.isArray(dimensionData.issues)) {
          console.log(`${dimension} 直接包含 ${dimensionData.issues.length} 个问题`);
          for (const issue of dimensionData.issues) {
            patterns.push({
              type: issue.title || issue.type || `${dimension}_issue`,
              severity: issue.severity || 'medium',
              description: issue.description || issue.summary || '',
              category: dimension,
              sqlLocation: issue.location || ''
            });
          }
        }

        // 如果维度数据本身是字符串，尝试直接解析
        else if (typeof dimensionData === 'string') {
          console.log(`${dimension} 是字符串，尝试直接解析JSON`);
          try {
            const parsedData = JSON.parse(dimensionData);
            console.log(`${dimension} 字符串解析结果:`, parsedData ? '成功' : '失败');

            if (parsedData.issues && Array.isArray(parsedData.issues)) {
              console.log(`${dimension} 从字符串解析到 ${parsedData.issues.length} 个问题`);
              for (const issue of parsedData.issues) {
                patterns.push({
                  type: issue.title || issue.type || `${dimension}_issue`,
                  severity: issue.severity || 'medium',
                  description: issue.description || issue.summary || '',
                  category: dimension,
                  sqlLocation: issue.location || ''
                });
              }
            }
          } catch (e) {
            console.warn(`${dimension} 字符串JSON解析失败:`, e.message);
          }
        }
      });

    } catch (e) {
      console.error('LLM JSON解析器导入或使用失败:', e.message);
    }

    console.log('=== 调试：analyzeTestPatterns 结束 ===');
    console.log('最终提取的 patterns 数量:', patterns.length);

    return patterns;
  }

  /**
   * 为特定模式生成规则
   */
  private async generateRuleForPattern(testCase: RuleTestCase, pattern: any): Promise<BaseRule | null> {
    try {
      // 构建规则生成提示词
      const prompt = this.buildRuleGenerationPrompt(testCase, pattern);

      console.log(`=== 调试：为模式 "${pattern.type}" 生成规则 ===`);
      console.log('LLM服务类型:', typeof this.llmService);
      console.log('LLM服务方法:', this.llmService ? Object.keys(this.llmService) : 'null');
      console.log('call方法存在:', this.llmService && typeof this.llmService.call === 'function');

      // 调用LLM生成规则
      let response = null;
      try {
        console.log('准备调用LLM服务...');
        const llmResult = await this.llmService.call(prompt);
        console.log('LLM调用成功:', llmResult.success);
        console.log('LLM响应长度:', llmResult.content ? llmResult.content.length : 0);

        if (llmResult.success && llmResult.content) {
          response = llmResult.content;
        } else {
          throw new Error(llmResult.error || 'LLM调用失败，未返回内容');
        }
      } catch (llmError) {
        console.error('LLM服务调用失败:', llmError.message);
        console.error('LLM错误类型:', typeof llmError);
        console.error('LLM错误详情:', llmError);
        throw llmError;
      }

      // 解析响应 - 使用更安全的方式
      let ruleData = null;
      try {
        console.log('开始解析LLM响应...');
        console.log('LLM响应开头:', response.substring(0, 500));
        console.log('LLM响应长度:', response.length);

        // 先尝试直接JSON解析
        try {
          ruleData = JSON.parse(response);
          console.log('直接JSON解析成功');
        } catch (directParseError) {
          console.log('直接JSON解析失败，尝试提取JSON:', directParseError.message);

          // 如果直接解析失败，尝试从markdown中提取
          const jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
          if (jsonMatch) {
            console.log('找到markdown JSON块，长度:', jsonMatch[1].length);
            console.log('JSON块开头:', jsonMatch[1].substring(0, 200));
            ruleData = JSON.parse(jsonMatch[1]);
            console.log('Markdown JSON提取成功');
          } else {
            // 尝试匹配任何JSON对象
            const simpleJsonMatch = response.match(/\{[\s\S]*\}/);
            if (simpleJsonMatch) {
              console.log('找到简单JSON块，长度:', simpleJsonMatch[0].length);
              ruleData = JSON.parse(simpleJsonMatch[0]);
              console.log('简单JSON匹配成功');
            }
          }
        }

        if (!ruleData) {
          console.warn('所有JSON解析方法都失败了');
          return null;
        }

        console.log('最终解析的数据类型:', typeof ruleData);
        console.log('解析的数据键:', Object.keys(ruleData || {}));

      } catch (parseError) {
        console.error('规则数据解析失败:', parseError.message);
        console.error('错误堆栈:', parseError.stack);
        return null;
      }

      if (!ruleData || !ruleData.rules || !Array.isArray(ruleData.rules)) {
        warn(LogCategory.RULE_LEARNING, 'LLM响应格式不正确', {
          response: response.substring(0, 200)
        });
        return null;
      }

      // 取第一个规则（通常LLM会生成一个主要规则）
      const rawRule = ruleData.rules[0];

      // 转换为标准规则格式
      return this.convertToStandardRule(rawRule, testCase, pattern);

    } catch (error) {
      error(LogCategory.RULE_LEARNING, '规则生成失败', error);
      return null;
    }
  }

  /**
   * 构建规则生成提示词
   */
  private buildRuleGenerationPrompt(testCase: RuleTestCase, pattern: any): string {
    return `作为一个世界级的机器学习专家和数据库架构师，请基于以下SQL分析结果生成一个高质量的智能规则。

## 分析上下文
### SQL查询
\`\`\`sql
${testCase.sql}
\`\`\`

### 数据库类型
${testCase.databaseType}

### 问题模式
- **类型**: ${pattern.type}
- **严重程度**: ${pattern.severity}
- **描述**: ${pattern.description}
- **位置**: ${pattern.sqlLocation}

## 分析结果数据

### 性能分析结果
${JSON.stringify(testCase.context.performance, null, 2)}

### 安全分析结果
${JSON.stringify(testCase.context.security, null, 2)}

### 标准分析结果
${JSON.stringify(testCase.context.standards, null, 2)}

## 学习要求

按照深度学习思维模式进行规则生成：

### 1. 数据理解阶段
深入理解分析结果的语义和上下文，识别关键问题模式。

### 2. 模式抽象阶段
从具体实例中抽象出通用规则，确保规则的泛化能力。

### 3. 规则质量要求
- **准确性**: 规则描述必须准确反映实际问题
- **实用性**: 建议必须具体可行，有实际操作价值
- **可检测性**: 触发条件必须可以程序化检测
- **可维护性**: 规则要清晰易懂，便于后续维护

## 输出要求

请生成JSON格式的规则，包含以下结构：
{
  "rules": [{
    "title": "规则标题（简洁明确，≤30字）",
    "description": "详细描述（50-100字）",
    "category": "${pattern.category || 'performance'}",
    "severity": "${pattern.severity || 'medium'}",
    "sqlPattern": "匹配的SQL模式或正则表达式",
    "badExamples": ["${testCase.sql}"],
    "goodExamples": ["改进后的SQL示例"],
    "explanation": "详细的技术解释",
    "recommendations": ["具体可操作的修复建议1", "具体可操作的修复建议2"],
    "applicableDatabases": ["${testCase.databaseType}", "mysql", "postgresql", "sqlite"],
    "confidence": 0.85
  }]
}

## 质量标准
- 规则标题：简洁明确，便于理解
- 严重程度：根据问题实际影响确定（critical=安全风险，high=性能瓶颈，medium=规范问题，low=代码风格）
- 置信度：基于分析结果的确定性设定（0.5-0.95）
- 示例代码：真实有效，能清晰说明问题和解决方案
- 建议：技术可行，有明确的实施路径`;
  }

  /**
   * 转换为标准规则格式
   */
  private convertToStandardRule(rawRule: any, testCase: RuleTestCase, pattern: any): BaseRule {
    return {
      id: uuidv4(),
      title: rawRule.title || pattern.type,
      description: rawRule.description || pattern.description,
      category: rawRule.category || pattern.category,
      severity: rawRule.severity || pattern.severity,
      sqlPattern: rawRule.sqlPattern || testCase.sql,
      examples: {
        bad: rawRule.badExamples || [testCase.sql],
        good: rawRule.goodExamples || []
      },
      explanation: rawRule.explanation || pattern.description,
      recommendations: rawRule.recommendations || [],
      applicableDatabases: rawRule.applicableDatabases || [testCase.databaseType],
      confidence: Math.max(0.5, Math.min(0.95, rawRule.confidence || 0.7)),
      metadata: {
        generatedAt: new Date().toISOString(),
        sourceAnalysis: `SQL分析: ${testCase.sql.substring(0, 100)}`,
        testCases: [testCase.sql]
      }
    };
  }

  /**
   * 验证并保存规则
   */
  private async validateAndSaveRule(rule: BaseRule, testCase: RuleTestCase): Promise<void> {
    // 基础验证
    this.validateRule(rule);

    // 重复检测
    const duplicateResult = await checkRuleDuplicate(rule, 'rules/learning-rules');

    if (duplicateResult.isDuplicate) {
      warn(LogCategory.RULE_LEARNING, '检测到重复规则，跳过保存', {
        ruleTitle: rule.title,
        duplicateType: duplicateResult.duplicateType,
        similarity: duplicateResult.similarity,
        matchedRules: duplicateResult.matchedRules.map(r => r.title)
      });

      // 如果是高相似度重复，记录详细信息
      if (duplicateResult.duplicateType === 'high_similarity') {
        info(LogCategory.RULE_LEARNING, '高相似度规则详情', {
          newRule: rule.title,
          similarRules: duplicateResult.matchedRules.map(r => ({
            title: r.title,
            filePath: r.filePath,
            similarity: duplicateResult.similarity
          }))
        });
      }

      throw new Error(`规则重复 (${duplicateResult.duplicateType}): ${rule.title}`);
    }

    // 如果有中等相似度规则，发出警告但继续保存
    if (duplicateResult.similarity > 0.6 && duplicateResult.similarity < 0.8) {
      warn(LogCategory.RULE_LEARNING, '发现相似规则，但继续保存', {
        ruleTitle: rule.title,
        similarity: duplicateResult.similarity,
        similarRules: duplicateResult.matchedRules.slice(0, 3).map(r => r.title)
      });
    }

    // 生成文件名
    const fileName = this.generateRuleFileName(rule);
    const filePath = path.join(this.outputDir, fileName);

    // 确保目录存在
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // 生成Markdown内容
    const markdownContent = this.generateRuleMarkdown(rule, testCase);

    // 保存到文件
    await fs.writeFile(filePath, markdownContent, 'utf-8');

    info(LogCategory.RULE_LEARNING, '规则已保存', {
      ruleId: rule.id,
      fileName,
      category: rule.category,
      confidence: rule.confidence
    });
  }

  /**
   * 验证规则基础字段
   */
  private validateRule(rule: BaseRule): void {
    const requiredFields = ['title', 'description', 'category', 'severity'];

    for (const field of requiredFields) {
      if (!rule[field]) {
        throw new Error(`规则缺少必需字段: ${field}`);
      }
    }

    if (!rule.examples.bad || rule.examples.bad.length === 0) {
      throw new Error('规则必须包含错误示例');
    }

    if (rule.confidence < 0.5 || rule.confidence > 0.95) {
      throw new Error(`规则置信度必须在0.5-0.95之间: ${rule.confidence}`);
    }
  }

  /**
   * 生成规则文件名
   */
  private generateRuleFileName(rule: BaseRule): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safeTitle = rule.title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return `${timestamp}-${safeTitle}-${rule.id.substring(0, 8)}.md`;
  }

  /**
   * 生成规则Markdown内容
   */
  private generateRuleMarkdown(rule: BaseRule, testCase: RuleTestCase): string {
    return `# ${rule.title}

**生成时间**: ${new Date().toISOString()}
**规则类别**: ${rule.category}
**规则类型**: ${rule.category}
**严重程度**: ${rule.severity}
**置信度**: ${rule.confidence}

## 规则描述

${rule.description}

## 触发条件

${rule.sqlPattern}

## 示例代码

### ❌ 错误示例

\`\`\`sql
${rule.examples.bad.join('\n')}
\`\`\`

### ✅ 正确示例

\`\`\`sql
${rule.examples.good.join('\n')}
\`\`\`

## 优化建议

${rule.recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

## 详细解释

${rule.explanation}

## 质量评估

- **质量分数**: ${Math.round(rule.confidence * 100)}
- **质量等级**: ${this.getQualityLevel(rule.confidence)}
- **是否建议保留**: 是

## 适用数据库

${rule.applicableDatabases.join(', ')}

## 原始分析上下文

**SQL查询**: \`\`\`${testCase.sql}\`\`\`
**数据库类型**: ${testCase.databaseType}
**生成时间**: ${testCase.timestamp}

---

*此规则由测试驱动规则生成器生成*
`;
  }

  /**
   * 获取质量等级
   */
  private getQualityLevel(confidence: number): string {
    if (confidence >= 0.9) return '优秀';
    if (confidence >= 0.8) return '良好';
    if (confidence >= 0.7) return '一般';
    if (confidence >= 0.6) return '较差';
    return '很差';
  }

  /**
   * 更新生成指标
   */
  private updateMetrics(startTime: number, rules: BaseRule[]): void {
    this.metrics.totalGenerated += rules.length;
    this.metrics.generationTime = Date.now() - startTime;

    if (rules.length > 0) {
      const totalConfidence = rules.reduce((sum, rule) => sum + rule.confidence, 0);
      this.metrics.averageConfidence = totalConfidence / rules.length;
    }

    // 统计分类
    for (const rule of rules) {
      this.metrics.categories[rule.category] = (this.metrics.categories[rule.category] || 0) + 1;
    }
  }

  /**
   * 获取生成指标
   */
  getMetrics(): GenerationMetrics {
    return { ...this.metrics };
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.metrics = {
      totalGenerated: 0,
      successful: 0,
      failed: 0,
      generationTime: 0,
      averageConfidence: 0,
      categories: {}
    };
  }
}

/**
 * 创建测试驱动规则生成器实例
 */
export function createRuleGenerator(outputDir?: string): RuleGenerator {
  const llmService = getLLMService();
  return new RuleGenerator(llmService, outputDir);
}

/**
 * 从SQL分析结果生成规则的便捷函数
 */
export async function generateRulesFromAnalysis(
  sql: string,
  analysisResult: any,
  databaseType: string,
  outputDir?: string
): Promise<BaseRule[]> {
  const generator = createRuleGenerator(outputDir);

  const testCase: RuleTestCase = {
    sql,
    analysisResult,
    databaseType,
    timestamp: new Date().toISOString(),
    context: {
      performance: analysisResult.performance || {},
      security: analysisResult.security || {},
      standards: analysisResult.standards || {}
    }
  };

  return await generator.generateRules(testCase);
}

/**
 * 批量处理多个SQL分析结果
 */
export async function batchGenerateRules(
  testCases: RuleTestCase[],
  outputDir?: string
): Promise<BaseRule[]> {
  const generator = createRuleGenerator(outputDir);
  const allRules: BaseRule[] = [];

  for (const testCase of testCases) {
    try {
      const rules = await generator.generateRules(testCase);
      allRules.push(...rules);
    } catch (error) {
      console.error(`批量生成规则失败: ${testCase.sql.substring(0, 50)}...`, error);
    }
  }

  return allRules;
}

/**
 * 从历史记录批量生成规则
 */
export async function generateRulesFromHistory(
  historyService: any,
  options: {
    maxRules?: number;
    minConfidence?: number;
  } = {}
): Promise<{
  length: number;
  processedRecords: number;
  rules: BaseRule[];
}> {
  try {
    const { maxRules = 10, minConfidence = 0.7 } = options;

    // 获取历史记录
    const historyRecords = await historyService.getAllHistory({ limit: maxRules * 2 });

    if (!historyRecords || historyRecords.length === 0) {
      return {
        length: 0,
        processedRecords: 0,
        rules: []
      };
    }

    // 过滤高质量记录
    const qualityRecords = historyRecords.filter(record => {
      const avgConfidence = calculateAverageConfidence(record.result);
      return avgConfidence >= minConfidence;
    });

    if (qualityRecords.length === 0) {
      return {
        length: 0,
        processedRecords: 0,
        rules: []
      };
    }

    // 转换为测试用例
    const testCases: RuleTestCase[] = qualityRecords.map(record => ({
      sql: record.sql,
      analysisResult: record.result,
      databaseType: record.databaseType || 'unknown',
      timestamp: record.timestamp,
      context: {
        performance: record.result?.performance || {},
        security: record.result?.security || {},
        standards: record.result?.standards || {}
      }
    }));

    // 批量生成规则
    const rules = await batchGenerateRules(testCases, 'rules/learning-rules/manual_review');

    return {
      length: rules.length,
      processedRecords: qualityRecords.length,
      rules: rules
    };

  } catch (error) {
    console.error('从历史记录生成规则失败:', error);
    return {
      length: 0,
      processedRecords: 0,
      rules: []
    };
  }
}

/**
 * 计算平均置信度
 */
function calculateAverageConfidence(analysisResult: any): number {
  try {
    let totalConfidence = 0;
    let count = 0;

    const dimensions = ['performance', 'security', 'standards'];
    dimensions.forEach(dim => {
      if (analysisResult[dim]?.metadata?.confidence) {
        totalConfidence += analysisResult[dim].metadata.confidence;
        count++;
      }
    });

    return count > 0 ? totalConfidence / count : 0;
  } catch (error) {
    return 0;
  }
}