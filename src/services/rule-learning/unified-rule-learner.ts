/**
 * 统一的规则学习器
 * 用于API、CLI、Menu三个界面的规则生成
 * 统一使用 generateRulesFromAnalysis 逻辑
 */

import { generateRulesFromAnalysis } from './rule-generator.js';
import { LogCategory, warn, error } from '../../utils/logger.js';
import { llmJsonParser } from '../../core/llm-json-parser.js';

/**
 * 规则学习结果接口
 */
export interface RuleLearningResult {
  success: boolean;
  generated: number;
  rules: any[];
  duration: number;
  error?: string;
}

/**
 * 统一规则学习器类
 */
export class UnifiedRuleLearner {
  private static instance: UnifiedRuleLearner;

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): UnifiedRuleLearner {
    if (!UnifiedRuleLearner.instance) {
      UnifiedRuleLearner.instance = new UnifiedRuleLearner();
    }
    return UnifiedRuleLearner.instance;
  }

  /**
   * 从单个分析结果生成规则
   * @param sql SQL语句
   * @param analysisResult 分析结果
   * @param databaseType 数据库类型
   * @param outputDir 输出目录
   * @returns 规则学习结果
   */
  async learnFromAnalysis(
    sql: string,
    analysisResult: any,
    databaseType: string = 'unknown',
    outputDir: string = 'rules/learning-rules/generated'
  ): Promise<RuleLearningResult> {
    const startTime = Date.now();

    try {
      // 统一数据结构调整 - 兼容不同的分析结果格式
      const adjustedAnalysisResult = this.adjustAnalysisResultStructure(analysisResult);

      
      // 执行规则生成
      const rules = await generateRulesFromAnalysis(
        sql,
        adjustedAnalysisResult,
        databaseType,
        outputDir
      );

      const duration = Date.now() - startTime;

      return {
        success: true,
        generated: rules.length,
        rules: rules,
        duration: duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;

      warn(LogCategory.RULE_LEARNING, `规则学习失败: ${error.message}`, {
        sql: sql.substring(0, 50),
        error: error.stack,
        duration
      });

      return {
        success: false,
        generated: 0,
        rules: [],
        duration: duration,
        error: error.message
      };
    }
  }

  /**
   * 从多个分析结果批量生成规则
   * @param analyses 分析结果数组
   * @param outputDir 输出目录
   * @returns 规则学习结果
   */
  async learnFromMultipleAnalyses(
    analyses: Array<{
      sql: string;
      analysisResult: any;
      databaseType?: string;
    }>,
    outputDir: string = 'rules/learning-rules/generated'
  ): Promise<RuleLearningResult> {
    const startTime = Date.now();
    const allRules: any[] = [];

    try {
      for (const analysis of analyses) {
        const result = await this.learnFromAnalysis(
          analysis.sql,
          analysis.analysisResult,
          analysis.databaseType || 'unknown',
          outputDir
        );

        if (result.success && result.rules.length > 0) {
          allRules.push(...result.rules);
        }
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        generated: allRules.length,
        rules: allRules,
        duration: duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;

      return {
        success: false,
        generated: 0,
        rules: [],
        duration: duration,
        error: error.message
      };
    }
  }

  /**
   * 从字符串中提取JSON内容 - 使用统一的llmJsonParser
   * @param content 可能包含JSON的字符串
   * @returns 提取的JSON对象，失败返回null
   */
  private extractJsonFromString(content: string): any {
    try {
      // 首先尝试直接解析JSON
      return JSON.parse(content);
    } catch (error) {
      // 使用统一的llmJsonParser提取markdown JSON
      return llmJsonParser.extractJsonFromMarkdown(content);
    }
  }

  /**
   * 处理可能包含JSON的字符串字段
   * @param value 可能是字符串的对象
   * @returns 处理后的对象
   */
  private processField(value: any): any {
    if (typeof value === 'string') {
      return this.extractJsonFromString(value) || value;
    }
    return value || {};
  }

  /**
   * 调整分析结果结构，兼容不同的数据格式
   * @param analysisResult 原始分析结果
   * @returns 调整后的分析结果
   */
  private adjustAnalysisResultStructure(analysisResult: any): any {
    // 情况1: result.data.performance.data 格式 (CLI输出格式)
    if (analysisResult.data && typeof analysisResult.data === 'object') {
      return {
        performance: this.processField(analysisResult.data.performance?.rawResponse ||
                     analysisResult.data.performance?.data ||
                     analysisResult.data.performance || {}),
        security: this.processField(analysisResult.data.security?.rawResponse ||
                   analysisResult.data.security?.data ||
                   analysisResult.data.security || {}),
        standards: this.processField(analysisResult.data.standards?.rawResponse ||
                    analysisResult.data.standards?.data ||
                    analysisResult.data.standards || {})
      };
    }

    // 情况2: 直接的 performance/security/standards 格式
    if (analysisResult.performance || analysisResult.security || analysisResult.standards) {
      return {
        performance: this.processField(analysisResult.performance?.rawResponse ||
                     analysisResult.performance || {}),
        security: this.processField(analysisResult.security?.rawResponse ||
                   analysisResult.security || {}),
        standards: this.processField(analysisResult.standards?.rawResponse ||
                    analysisResult.standards || {})
      };
    }

    // 情况3: 兜底返回空对象
    return {
      performance: {},
      security: {},
      standards: {}
    };
  }

  /**
   * 打印学习结果到控制台（用于CLI和Menu）
   * @param result 学习结果
   * @param colors CLI颜色工具（可选）
   */
  printResult(result: RuleLearningResult, colors?: any): void {
    if (!colors) {
      // 简单的颜色工具
      colors = {
        blue: (text: string) => text,
        green: (text: string) => text,
        yellow: (text: string) => text,
        red: (text: string) => text,
        magenta: (text: string) => text,
        cyan: (text: string) => text,
        gray: (text: string) => text
      };
    }

    console.log(colors.blue('✅ 规则学习执行完成'));

    
    if (result.success && result.rules.length > 0) {
      console.log(colors.green(`\n✅ 规则生成完成!`));
      console.log(`   生成规则: ${result.rules.length} 条`);

      console.log(`\n${colors.cyan('🆕 本次分析生成的规则:')}`);
      result.rules.forEach((rule: any, index: number) => {
        console.log(`   ${index + 1}. ${colors.yellow(rule.title || rule.id || '未知规则')} (${colors.gray((rule.confidence * 100).toFixed(1) + '%')})`);
      });
    } else {
      console.log(colors.yellow(`\n⚠️ 本次未生成新规则`));
      if (result.error) {
        console.log(`   错误原因: ${result.error}`);
      } else {
        console.log(`   可能原因：分析结果中无问题或质量评估未通过`);
      }
    }
  }
}

/**
 * 获取统一规则学习器实例
 */
export function getUnifiedRuleLearner(): UnifiedRuleLearner {
  return UnifiedRuleLearner.getInstance();
}

/**
 * 便捷函数：从单个分析结果学习规则
 */
export async function learnRulesFromAnalysis(
  sql: string,
  analysisResult: any,
  databaseType?: string,
  outputDir?: string
): Promise<RuleLearningResult> {
  const learner = getUnifiedRuleLearner();
  return await learner.learnFromAnalysis(sql, analysisResult, databaseType, outputDir);
}

/**
 * 便捷函数：从多个分析结果学习规则
 */
export async function learnRulesFromMultipleAnalyses(
  analyses: Array<{
    sql: string;
    analysisResult: any;
    databaseType?: string;
  }>,
  outputDir?: string
): Promise<RuleLearningResult> {
  const learner = getUnifiedRuleLearner();
  return await learner.learnFromMultipleAnalyses(analyses, outputDir);
}