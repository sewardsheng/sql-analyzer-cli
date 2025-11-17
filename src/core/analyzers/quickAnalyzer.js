/**
 * 快速分析子代理
 * 负责对SQL查询进行快速基础分析，只检查最常见和最重要的问题
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { buildPrompt } from '../../utils/promptLoader.js';
import BaseAnalyzer from './BaseAnalyzer.js';
import JSONCleaner from '../../utils/jsonCleaner.js';

/**
 * 快速分析子代理
 */
class QuickAnalyzer extends BaseAnalyzer {

  /**
   * 快速分析SQL
   * @param {Object} input - 输入参数
   * @param {string} input.sqlQuery - SQL查询语句
   * @returns {Promise<Object>} 快速分析结果
   */
  async quickAnalyze(input) {
    await this.initialize();
    
    const { sqlQuery, options = {} } = input;
    
    // 使用快速分析提示词模板
    const { systemPrompt } = await buildPrompt(
      'quick-analyzer.md',
      {},
      {
        category: 'analyzers',
        section: '快速分析'
      }
    );

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`请快速分析以下SQL查询：

SQL查询:
${sqlQuery}`)
    ];

    try {
      const result = await this.invokeLLMAndParse(messages);
      
      // 应用企业级评分逻辑
      const enhancedResult = this.applyEnterpriseScoring(result, options);
      
      // 使用基类的 formatResponse 方法
      return this.formatResponse(enhancedResult);
    } catch (error) {
      return this.handleError('SQL快速分析', error);
    }
  }

  /**
   * 应用企业级评分逻辑
   * @param {Object} result - 原始分析结果
   * @param {Object} options - 分析选项
   * @returns {Object} 增强后的分析结果
   */
  applyEnterpriseScoring(result, options) {
    const quickData = result.data || result;
    
    // 获取CI/CD配置
    const cicdConfig = options.cicd || {
      quickModeWeights: { security: 0.50, performance: 0.30, standards: 0.20 },
      scoreThreshold: 70,
      blockOnCritical: true
    };
    
    // 计算加权评分
    const weightedScore = this.calculateWeightedScore(quickData, cicdConfig.quickModeWeights);
    
    // 检查关键问题
    const criticalIssues = this.checkCriticalIssues(quickData);
    
    // 应用一票否决机制
    const finalScore = this.applyVetoMechanism(weightedScore, criticalIssues, cicdConfig);
    
    // 生成CI/CD友好的结果
    return {
      ...result,
      data: {
        ...quickData,
        quickScore: finalScore,
        weightedScore,
        criticalIssues,
        cicdMetadata: {
          scoreThreshold: cicdConfig.scoreThreshold,
          passed: finalScore >= cicdConfig.scoreThreshold && !criticalIssues.hasBlocking,
          hasBlocking: criticalIssues.hasBlocking,
          checkTime: new Date().toISOString(),
          analyzerVersion: '1.0.0'
        }
      }
    };
  }

  /**
   * 计算加权评分
   * @param {Object} quickData - 快速分析数据
   * @param {Object} weights - 权重配置
   * @returns {number} 加权评分
   */
  calculateWeightedScore(quickData, weights) {
    let totalScore = 0;
    let totalWeight = 0;
    
    // 基础评分
    const baseScore = quickData.quickScore || 0;
    
    // 根据问题类型调整评分
    if (quickData.criticalIssues && quickData.criticalIssues.length > 0) {
      quickData.criticalIssues.forEach(issue => {
        const severity = issue.severity?.toLowerCase();
        const type = issue.type?.toLowerCase();
        
        let deduction = 0;
        if (severity === '高' || severity === 'high') {
          if (type?.includes('安全') || type?.includes('security')) {
            deduction = 15 * weights.security;
          } else if (type?.includes('性能') || type?.includes('performance')) {
            deduction = 12 * weights.performance;
          } else {
            deduction = 8 * weights.standards;
          }
        } else if (severity === '中' || severity === 'medium') {
          deduction = 5;
        } else if (severity === '低' || severity === 'low') {
          deduction = 2;
        }
        
        totalScore -= deduction;
      });
    }
    
    return Math.max(0, Math.min(100, baseScore + totalScore));
  }

  /**
   * 检查关键问题
   * @param {Object} quickData - 快速分析数据
   * @returns {Object} 关键问题信息
   */
  checkCriticalIssues(quickData) {
    const criticalIssues = {
      hasBlocking: false,
      sqlInjection: false,
      fullTableScan: false,
      syntaxError: false,
      issues: []
    };
    
    if (quickData.criticalIssues) {
      quickData.criticalIssues.forEach(issue => {
        const type = issue.type?.toLowerCase();
        const description = issue.description?.toLowerCase();
        
        // 检查SQL注入
        if (type?.includes('安全') || description?.includes('sql注入') || description?.includes('sql injection')) {
          criticalIssues.sqlInjection = true;
          criticalIssues.hasBlocking = true;
        }
        
        // 检查全表扫描
        if (type?.includes('性能') && (description?.includes('全表扫描') || description?.includes('full table scan'))) {
          criticalIssues.fullTableScan = true;
        }
        
        // 检查语法错误
        if (type?.includes('语法') || type?.includes('syntax')) {
          criticalIssues.syntaxError = true;
          criticalIssues.hasBlocking = true;
        }
        
        criticalIssues.issues.push(issue);
      });
    }
    
    return criticalIssues;
  }

  /**
   * 应用一票否决机制
   * @param {number} score - 基础评分
   * @param {Object} criticalIssues - 关键问题信息
   * @param {Object} cicdConfig - CI/CD配置
   * @returns {number} 最终评分
   */
  applyVetoMechanism(score, criticalIssues, cicdConfig) {
    if (!cicdConfig.blockOnCritical) {
      return score;
    }
    
    // SQL注入和语法错误立即阻止
    if (criticalIssues.sqlInjection || criticalIssues.syntaxError) {
      return Math.min(score, 20); // 强制降低到20分以下
    }
    
    // 全表扫描严重扣分
    if (criticalIssues.fullTableScan) {
      return Math.min(score, 40); // 强制降低到40分以下
    }
    
    return score;
  }
}

/**
 * 创建快速分析工具
 * @param {Object} config - 配置参数
 * @returns {Object} 工具对象
 */
export function createQuickAnalyzerTool(config = {}) {
  const agent = new QuickAnalyzer(config);
  
  return {
    name: "quick_analyzer",
    description: "快速分析SQL查询的基础问题，不进行深度分析",
    parameters: {
      type: "object",
      properties: {
        sqlQuery: {
          type: "string",
          description: "要快速分析的SQL查询语句"
        }
      },
      required: ["sqlQuery"]
    },
    func: async (input) => {
      return await agent.quickAnalyze(input);
    }
  };
}

export default QuickAnalyzer;