/**
 * 显示服务
 * 负责处理分析结果的显示，区分API和CLI/Menu两种模式
 */

import { llmJsonParser } from '../core/llm-json-parser.js';

/**
 * 显示模式枚举
 */
export enum DisplayMode {
  API = 'api',       // API模式：输出纯JSON
  CLI = 'cli',       // CLI模式：友好格式化输出
  MENU = 'menu'      // Menu模式：交互式界面输出
}

/**
 * 提取后的分析数据结构
 */
export interface ExtractedAnalysisData {
  summary: string;
  performance: {
    issues: any[];
    recommendations: any[];
    score: number;
  };
  security: {
    issues: any[];
    recommendations: any[];
    score: number;
  };
  standards: {
    issues: any[];
    recommendations: any[];
    score: number;
  };
  sqlFix?: any;
  totalIssues: number;
  totalRecommendations: number;
}

/**
 * 显示服务类
 */
export class DisplayService {

  /**
   * 从原始分析结果中提取结构化数据
   * @param analysisResult 原始分析结果
   * @returns 提取后的结构化数据
   */
  extractAnalysisData(analysisResult: any): ExtractedAnalysisData {
    // 使用llmJsonParser提取维度分析结果
    const dimensionAnalysis = llmJsonParser.extractDimensionAnalysis(analysisResult);

    // 提取各维度的问题和建议
    const allIssues = dimensionAnalysis.allIssues || [];
    const allRecommendations = dimensionAnalysis.allRecommendations || [];

    const performanceIssues = allIssues.filter(issue => issue.dimension === 'performance' || issue.type === 'performance');
    const securityIssues = allIssues.filter(issue => issue.dimension === 'security' || issue.type === 'security');
    const standardsIssues = allIssues.filter(issue => issue.dimension === 'standards' || issue.type === 'standards');

    const performanceRecommendations = allRecommendations.filter(rec => rec.dimension === 'performance' || rec.type === 'performance');
    const securityRecommendations = allRecommendations.filter(rec => rec.dimension === 'security' || rec.type === 'security');
    const standardsRecommendations = allRecommendations.filter(rec => rec.dimension === 'standards' || rec.type === 'standards');

    return {
      summary: dimensionAnalysis.summary || '分析完成',
      performance: {
        issues: performanceIssues,
        recommendations: performanceRecommendations,
        score: this.calculateScore(performanceIssues)
      },
      security: {
        issues: securityIssues,
        recommendations: securityRecommendations,
        score: this.calculateScore(securityIssues)
      },
      standards: {
        issues: standardsIssues,
        recommendations: standardsRecommendations,
        score: this.calculateScore(standardsIssues)
      },
      sqlFix: dimensionAnalysis.sqlFixData,
      totalIssues: allIssues.length,
      totalRecommendations: allRecommendations.length
    };
  }

  /**
   * 根据显示模式处理分析结果
   * @param analysisResult 原始分析结果
   * @param mode 显示模式
   * @param colors CLI颜色工具（CLI/Menu模式使用）
   * @returns 处理后的结果
   */
  displayAnalysis(analysisResult: any, mode: DisplayMode, colors?: any): any {
    const extractedData = this.extractAnalysisData(analysisResult);

    switch (mode) {
      case DisplayMode.API:
        return this.formatForAPI(analysisResult, extractedData);

      case DisplayMode.CLI:
        return this.formatForCLI(extractedData, colors);

      case DisplayMode.MENU:
        return this.formatForMenu(extractedData, colors);

      default:
        return extractedData;
    }
  }

  /**
   * API模式格式化：输出纯JSON
   */
  private formatForAPI(originalResult: any, extractedData: ExtractedAnalysisData): any {
    // API返回完整的原始数据加上提取后的结构化数据
    return {
      success: true,
      ...originalResult,
      extracted: extractedData,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * CLI模式格式化：友好命令行输出
   */
  private formatForCLI(data: ExtractedAnalysisData, colors: any): void {
    if (!colors) {
      colors = {
        cyan: (text: string) => text,
        green: (text: string) => text,
        yellow: (text: string) => text,
        red: (text: string) => text,
        blue: (text: string) => text,
        magenta: (text: string) => text,
        gray: (text: string) => text
      };
    }

    console.log(colors.cyan('\n📊 SQL分析结果'));
    console.log(colors.gray('='.repeat(50)));

    // 总体概览
    console.log(`\n${colors.blue('📋 分析概览:')}`);
    console.log(`   总结: ${data.summary}`);
    console.log(`   总问题数: ${colors.red(data.totalIssues.toString())}`);
    console.log(`   总建议数: ${colors.yellow(data.totalRecommendations.toString())}`);

    // 性能分析
    console.log(`\n${colors.cyan('⚡ 性能分析:')}`);
    console.log(`   问题数量: ${colors.red(data.performance.issues.length.toString())}`);
    console.log(`   建议数量: ${colors.yellow(data.performance.recommendations.length.toString())}`);

    if (data.performance.issues.length > 0) {
      console.log(`\n${colors.red('🚨 性能问题:')}`);
      data.performance.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${colors.yellow(issue.title || '未知问题')}`);
        console.log(`      ${colors.gray(issue.description || '无描述')}`);
      });
    }

    // 安全分析
    console.log(`\n${colors.cyan('🔒 安全分析:')}`);
    console.log(`   问题数量: ${colors.red(data.security.issues.length.toString())}`);
    console.log(`   建议数量: ${colors.yellow(data.security.recommendations.length.toString())}`);

    if (data.security.issues.length > 0) {
      console.log(`\n${colors.red('🚨 安全问题:')}`);
      data.security.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${colors.yellow(issue.title || '未知问题')}`);
        console.log(`      ${colors.gray(issue.description || '无描述')}`);
      });
    }

    // 规范分析
    console.log(`\n${colors.cyan('📝 规范分析:')}`);
    console.log(`   问题数量: ${colors.red(data.standards.issues.length.toString())}`);
    console.log(`   建议数量: ${colors.yellow(data.standards.recommendations.length.toString())}`);

    if (data.standards.issues.length > 0) {
      console.log(`\n${colors.red('🚨 规范问题:')}`);
      data.standards.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${colors.yellow(issue.title || '未知问题')}`);
        console.log(`      ${colors.gray(issue.description || '无描述')}`);
      });
    }

    // SQL修复建议
    if (data.sqlFix && data.sqlFix.fixedSql) {
      console.log(`\n${colors.green('🔧 SQL修复建议:')}`);
      console.log(`${colors.gray('优化后的SQL:')}`);
      console.log(data.sqlFix.fixedSql);
    }
  }

  /**
   * Menu模式格式化：交互式界面输出
   */
  private formatForMenu(data: ExtractedAnalysisData, colors: any): any {
    // Menu模式返回结构化数据，由menu.ts负责具体显示
    return {
      overview: {
        summary: data.summary,
        totalIssues: data.totalIssues,
        totalRecommendations: data.totalRecommendations
      },
      dimensions: {
        performance: {
          issues: data.performance.issues,
          recommendations: data.performance.recommendations,
          score: data.performance.score
        },
        security: {
          issues: data.security.issues,
          recommendations: data.security.recommendations,
          score: data.security.score
        },
        standards: {
          issues: data.standards.issues,
          recommendations: data.standards.recommendations,
          score: data.standards.score
        }
      },
      sqlFix: data.sqlFix
    };
  }

  /**
   * 计算维度评分（简单算法，可以根据需要优化）
   */
  private calculateScore(issues: any[]): number {
    if (issues.length === 0) return 100;

    let totalDeduction = 0;
    issues.forEach(issue => {
      const severity = issue.severity || 'medium';
      switch (severity.toLowerCase()) {
        case 'high':
          totalDeduction += 20;
          break;
        case 'medium':
          totalDeduction += 10;
          break;
        case 'low':
          totalDeduction += 5;
          break;
        default:
          totalDeduction += 10;
      }
    });

    return Math.max(0, 100 - totalDeduction);
  }
}

/**
 * 全局显示服务实例
 */
let displayServiceInstance: DisplayService | null = null;

/**
 * 获取显示服务实例
 */
export function getDisplayService(): DisplayService {
  if (!displayServiceInstance) {
    displayServiceInstance = new DisplayService();
  }
  return displayServiceInstance;
}

/**
 * 便捷函数：分析并显示结果
 */
export function analyzeAndDisplay(analysisResult: any, mode: DisplayMode, colors?: any): any {
  const service = getDisplayService();
  return service.displayAnalysis(analysisResult, mode, colors);
}