/**
 * 子代理协调器
 * 负责协调各个子代理的工作，整合分析结果
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { readConfig } from '../../utils/config.js';
import { createSqlParserAndDialectNormalizerTool } from './subagents/sqlParserAndDialectNormalizer.js';
import { createPerformanceAnalyzerTool } from './subagents/performanceAnalyzer.js';
import { createSecurityAuditorTool } from './subagents/securityAuditor.js';
import { createCodingStandardsCheckerTool } from './subagents/codingStandardsChecker.js';
import { createSqlOptimizerAndSuggesterTool } from './subagents/sqlOptimizerAndSuggester.js';
import { createIntelligentRuleLearnerTool } from './subagents/intelligentRuleLearner.js';

/**
 * 子代理协调器
 */
class SubagentsCoordinator {
  constructor(config = {}) {
    this.config = config;
    this.llm = null;
    this.initialized = false;
    this.tools = {};
  }

  /**
   * 初始化协调器和所有子代理
   */
  async initialize() {
    if (this.initialized) return;
    
    const envConfig = await readConfig();
    this.llm = new ChatOpenAI({
      modelName: this.config.model || envConfig.model,
      temperature: 0.1,
      maxTokens: 4000,
      configuration: {
        apiKey: this.config.apiKey || envConfig.apiKey,
        baseURL: this.config.baseURL || envConfig.baseURL
      }
    });
    
    // 初始化所有子代理工具
    this.tools = {
      sqlParser: createSqlParserAndDialectNormalizerTool(this.config),
      performanceAnalyzer: createPerformanceAnalyzerTool(this.config),
      securityAuditor: createSecurityAuditorTool(this.config),
      standardsChecker: createCodingStandardsCheckerTool(this.config),
      optimizer: createSqlOptimizerAndSuggesterTool(this.config),
      ruleLearner: createIntelligentRuleLearnerTool(this.config)
    };
    
    this.initialized = true;
  }

  /**
   * 协调执行完整的SQL分析流程
   * @param {Object} input - 输入参数
   * @param {string} input.sqlQuery - SQL查询语句
   * @param {string} [input.databaseType] - 数据库类型（可选，如果不提供将自动检测）
   * @param {Object} input.options - 分析选项
   * @returns {Promise<Object>} 综合分析结果
   */
  async coordinateAnalysis(input) {
    await this.initialize();
    
    const { sqlQuery, databaseType: providedDatabaseType, options = {} } = input;
    
    // 如果没有提供数据库类型，则自动检测
    let databaseType = providedDatabaseType;
    if (!databaseType) {
      console.log("正在自动检测数据库类型...");
      const detectResult = await this.tools.sqlParser.func({
        sqlQuery,
        detectDialect: true
      });
      
      if (detectResult.success && detectResult.data.detectedDatabaseType) {
        databaseType = detectResult.data.detectedDatabaseType;
        console.log(`检测到数据库类型: ${databaseType} (置信度: ${detectResult.data.confidence})`);
      } else {
        console.warn("无法自动检测数据库类型，将使用通用分析");
        databaseType = 'generic';
      }
    }
    
    // 步骤1: SQL解析和方言标准化
    console.log("步骤1: SQL解析和方言标准化...");
    const parseResult = await this.tools.sqlParser.func({
      sqlQuery,
      databaseType
    });
    
    if (!parseResult.success) {
      return {
        success: false,
        error: `SQL解析失败: ${parseResult.error}`
      };
    }
    
    const parsedSQL = parseResult.data.normalizedSql;
    const dialectInfo = parseResult.data.dialectInfo;
    
    // 步骤2: 并行执行性能分析、安全审计和编码规范检查
    console.log("步骤2: 并行执行性能分析、安全审计和编码规范检查...");
    const analysisPromises = [];
    
    // 性能分析
    if (options.performance !== false) {
      analysisPromises.push(
        this.tools.performanceAnalyzer.func({
          sqlQuery: parsedSQL,
          databaseType,
          dialectInfo
        }).then(result => ({ type: 'performance', result }))
      );
    }
    
    // 安全审计
    if (options.security !== false) {
      analysisPromises.push(
        this.tools.securityAuditor.func({
          sqlQuery: parsedSQL,
          databaseType,
          dialectInfo
        }).then(result => ({ type: 'security', result }))
      );
    }
    
    // 编码规范检查
    if (options.standards !== false) {
      analysisPromises.push(
        this.tools.standardsChecker.func({
          sqlQuery: parsedSQL,
          databaseType,
          dialectInfo
        }).then(result => ({ type: 'standards', result }))
      );
    }
    
    // 等待所有分析完成
    const analysisResults = await Promise.all(analysisPromises);
    
    // 整合分析结果
    const integratedResults = {
      parseResult,
      performanceAnalysis: null,
      securityAudit: null,
      standardsCheck: null
    };
    
    analysisResults.forEach(({ type, result }) => {
      if (type === 'performance') {
        integratedResults.performanceAnalysis = result;
      } else if (type === 'security') {
        integratedResults.securityAudit = result;
      } else if (type === 'standards') {
        integratedResults.standardsCheck = result;
      }
    });
    
    // 步骤3: 生成优化建议
    console.log("步骤3: 生成优化建议...");
    const optimizationResult = await this.tools.optimizer.func({
      sqlQuery: parsedSQL,
      databaseType,
      dialectInfo,
      performanceAnalysis: integratedResults.performanceAnalysis,
      securityAudit: integratedResults.securityAudit,
      standardsCheck: integratedResults.standardsCheck
    });
    
    integratedResults.optimizationSuggestions = optimizationResult;
    
    // 步骤4: 从分析结果中学习并生成规则（可选）
    if (options.learn !== false) {
      console.log("步骤4: 从分析结果中学习并生成规则...");
      await this.tools.ruleLearner.func({
        sqlQuery: parsedSQL,
        databaseType,
        analysisResults: integratedResults
      });
    }
    
    // 步骤5: 生成综合分析报告
    console.log("步骤5: 生成综合分析报告...");
    const report = await this.generateComprehensiveReport({
      sqlQuery,
      databaseType,
      integratedResults
    });
    
    return {
      success: true,
      data: {
        originalQuery: sqlQuery,
        normalizedQuery: parsedSQL,
        databaseType,
        dialectInfo,
        analysisResults: integratedResults,
        report,
        // 添加各个子代理的详细结果，以便在UI中显示
        detailedResults: {
          performanceAnalysis: integratedResults.performanceAnalysis,
          securityAudit: integratedResults.securityAudit,
          standardsCheck: integratedResults.standardsCheck,
          optimizationSuggestions: integratedResults.optimizationSuggestions,
          parseResult: integratedResults.parseResult
        }
      }
    };
  }

  /**
   * 生成综合分析报告
   * @param {Object} input - 输入参数
   * @param {string} input.sqlQuery - 原始SQL查询
   * @param {string} input.databaseType - 数据库类型
   * @param {Object} input.integratedResults - 整合的分析结果
   * @returns {Promise<Object>} 综合报告
   */
  async generateComprehensiveReport(input) {
    const { sqlQuery, databaseType, integratedResults } = input;
    
    const systemPrompt = `你是一个SQL分析报告专家，能够将各个子代理的分析结果整合为一份全面、易懂的分析报告。

你的任务是分析给定的SQL查询和各个子代理的分析结果，生成一份综合性的分析报告。

报告应包含以下部分：
1. 查询概述
2. 方言分析
3. 性能分析摘要
4. 安全审计摘要
5. 编码规范检查摘要
6. 优化建议摘要
7. 总体评估和建议

请使用以下JSON格式返回报告：
{
  "summary": "总体摘要",
  "queryOverview": {
    "originalQuery": "原始查询",
    "normalizedQuery": "标准化查询",
    "databaseType": "数据库类型",
    "complexity": "复杂度评估"
  },
  "dialectAnalysis": {
    "dialect": "检测到的方言",
    "compatibilityIssues": "兼容性问题",
    "recommendations": "方言相关建议"
  },
  "performanceAnalysis": {
    "score": "性能评分",
    "bottlenecks": "主要瓶颈",
    "optimizationPotential": "优化潜力"
  },
  "securityAudit": {
    "score": "安全评分",
    "riskLevel": "风险等级",
    "vulnerabilities": "主要漏洞"
  },
  "standardsCheck": {
    "score": "规范评分",
    "complianceLevel": "合规等级",
    "violations": "主要违规"
  },
  "optimizationSuggestions": {
    "priority": "优先级",
    "suggestions": "优化建议列表"
  },
  "overallAssessment": {
    "score": "总体评分",
    "recommendations": "总体建议"
  }
}`;

    // 构建分析结果信息
    let analysisInfo = "";
    
    if (integratedResults.performanceAnalysis && integratedResults.performanceAnalysis.success) {
      const perf = integratedResults.performanceAnalysis.data;
      analysisInfo += `
性能分析结果：
- 性能评分: ${perf.performanceScore}
- 复杂度: ${perf.complexityLevel}
- 瓶颈数量: ${perf.bottlenecks?.length || 0}
- 主要瓶颈: ${perf.bottlenecks?.slice(0, 3).map(b => b.description).join(', ') || '无'}
`;
    }
    
    if (integratedResults.securityAudit && integratedResults.securityAudit.success) {
      const sec = integratedResults.securityAudit.data;
      analysisInfo += `
安全审计结果：
- 安全评分: ${sec.securityScore}
- 风险等级: ${sec.riskLevel}
- 漏洞数量: ${sec.vulnerabilities?.length || 0}
- 主要漏洞: ${sec.vulnerabilities?.slice(0, 3).map(v => v.description).join(', ') || '无'}
`;
    }
    
    if (integratedResults.standardsCheck && integratedResults.standardsCheck.success) {
      const std = integratedResults.standardsCheck.data;
      analysisInfo += `
编码规范检查结果：
- 规范评分: ${std.standardsScore}
- 合规等级: ${std.complianceLevel}
- 违规数量: ${std.violations?.length || 0}
- 主要违规: ${std.violations?.slice(0, 3).map(v => v.description).join(', ') || '无'}
`;
    }
    
    if (integratedResults.optimizationSuggestions && integratedResults.optimizationSuggestions.success) {
      const opt = integratedResults.optimizationSuggestions.data;
      analysisInfo += `
优化建议：
- 优化潜力: ${opt.optimizationPotential}
- 优化建议数量: ${opt.suggestions?.length || 0}
- 主要建议: ${opt.suggestions?.slice(0, 3).map(s => s.description).join(', ') || '无'}
`;
    }

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`请为以下${databaseType || '未知'}数据库的SQL查询生成综合分析报告：

原始查询:
${sqlQuery}

标准化查询:
${integratedResults.parseResult?.data?.normalizedSql || '未知'}

${analysisInfo}`)
    ];

    try {
      const response = await this.llm.invoke(messages);
      let content = response.content;
      
      // 处理可能的代码块包装
      if (content.includes('```')) {
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          content = codeBlockMatch[1];
        }
      }
      
      const report = JSON.parse(content);
      
      return report;
    } catch (error) {
      console.error("生成综合报告失败:", error);
      return {
        summary: "生成综合报告失败",
        error: error.message
      };
    }
  }
}

/**
 * 创建子代理协调器实例
 * @param {Object} config - 配置参数
 * @returns {SubagentsCoordinator} 协调器实例
 */
export function createSubagentsCoordinator(config = {}) {
  return new SubagentsCoordinator(config);
}

export default SubagentsCoordinator;