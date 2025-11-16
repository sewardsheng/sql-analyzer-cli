/**
 * SQL分析协调器
 * 负责协调各个分析器的工作，整合分析结果
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { readConfig } from '../services/config/index.js';
import { createSqlParserAndDialectNormalizerTool } from './analyzers/sqlParserAndDialectNormalizer.js';
import { createPerformanceAnalyzerTool } from './analyzers/performanceAnalyzer.js';
import { createSecurityAuditorTool } from './analyzers/securityAuditor.js';
import { createCodingStandardsCheckerTool } from './analyzers/codingStandardsChecker.js';
import { createSqlOptimizerAndSuggesterTool } from './analyzers/sqlOptimizerAndSuggester.js';
import { createIntelligentRuleLearnerTool } from './analyzers/intelligentRuleLearner.js';
import crypto from 'crypto';

/**
 * SQL分析协调器
 */
class SqlAnalysisCoordinator {
  constructor(config = {}) {
    this.config = config;
    this.llm = null;
    this.initialized = false;
    this.tools = {};
    this.cache = new Map(); // SQL分析结果内存缓存
    this.cacheEnabled = config.enableCache !== false; // 默认启用缓存
    this.cacheMaxSize = config.cacheMaxSize || 100; // 最大缓存100个结果
  }

  /**
   * 生成缓存键（使用SQL和选项的哈希值）
   * @param {string} sqlQuery - SQL查询
   * @param {string} databaseType - 数据库类型
   * @param {Object} options - 分析选项
   * @returns {string} 缓存键
   */
  generateCacheKey(sqlQuery, databaseType, options) {
    const optionsStr = JSON.stringify({
      performance: options.performance !== false,
      security: options.security !== false,
      standards: options.standards !== false,
      learn: options.learn !== false
    });
    const content = `${databaseType}:${sqlQuery.trim()}:${optionsStr}`;
    // 使用哈希来生成更短的键
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * 获取内存缓存结果
   * @param {string} key - 缓存键
   * @returns {Object|null} 缓存的分析结果
   */
  getCachedResult(key) {
    if (!this.cacheEnabled) return null;
    return this.cache.get(key) || null;
  }

  /**
   * 设置内存缓存结果
   * @param {string} key - 缓存键
   * @param {Object} result - 分析结果
   */
  setCachedResult(key, result) {
    if (!this.cacheEnabled) return;
    
    // 如果缓存已满，删除最早的条目
    if (this.cache.size >= this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 初始化协调器和所有分析器
   */
  async initialize() {
    if (this.initialized) return;
    
    const envConfig = await readConfig();
    this.llm = new ChatOpenAI({
      modelName: this.config.model || envConfig.model,
      temperature: 0.1,
      maxTokens: 99999,
      configuration: {
        apiKey: this.config.apiKey || envConfig.apiKey,
        baseURL: this.config.baseURL || envConfig.baseURL
      }
    });
    
    // 初始化所有分析器工具
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
    // 记录分析开始时间
    const analysisStartTime = Date.now();
    
    await this.initialize();
    
    const { sqlQuery, databaseType: providedDatabaseType, options = {} } = input;
    
    // 检查内存缓存
    const cacheKey = this.generateCacheKey(
      sqlQuery,
      providedDatabaseType || 'auto',
      options
    );
    const cachedResult = this.getCachedResult(cacheKey);
    
    if (cachedResult) {
      console.log("✨ 使用内存缓存的分析结果");
      console.log(`   缓存时间: ${new Date(cachedResult.timestamp).toLocaleString('zh-CN')}`);
      console.log('='.repeat(60));
      
      // 打印缓存结果摘要
      if (cachedResult.result.data && cachedResult.result.data.analysisResults) {
        this.printAnalysisSummary(cachedResult.result.data.analysisResults);
      }
      
      // 计算并显示分析用时（缓存情况）
      const analysisEndTime = Date.now();
      const analysisDuration = (analysisEndTime - analysisStartTime) / 1000; // 转换为秒
      console.log(`⏱️  本次分析用时: ${analysisDuration.toFixed(2)} 秒（使用缓存）\n`);
      console.log('='.repeat(60));
      
      return cachedResult.result;
    }
    
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
    
    console.log("🚀 开始并行执行SQL分析流程...\n");
    console.log('='.repeat(60));
    
    // 优化策略：将步骤1和步骤2-4合并并行执行
    // 步骤1: SQL解析（必须先完成）
    console.log("📋 步骤1: SQL解析和方言标准化...");
    const parseResult = await this.tools.sqlParser.func({
      sqlQuery,
      databaseType
    });
    
    if (!parseResult.success) {
      console.warn("⚠️  SQL解析部分失败，但将继续使用原始SQL进行分析");
      console.warn(`   错误信息: ${parseResult.error}`);
    }
    
    // 使用原始SQL，不再标准化
    const parsedSQL = sqlQuery;
    const dialectInfo = parseResult.data || {};
    const parsedStructure = parseResult.data?.parsedStructure || null;
    
    console.log("✅ SQL解析完成");
    if (parseResult.success) {
      console.log(`   解析状态: ${parseResult.data.parseStatus || 'success'}`);
      if (parseResult.data.suspiciousPatterns?.length > 0) {
        console.log(`   ⚠️  检测到可疑模式: ${parseResult.data.suspiciousPatterns.slice(0, 2).join(', ')}`);
      }
      if (parseResult.data.parseWarnings?.length > 0) {
        console.log(`   警告: ${parseResult.data.parseWarnings.join(', ')}`);
      }
    }
    console.log();
    
    // 步骤2-4: 并行执行所有分析任务
    console.log("⚡ 步骤2-4: 并行执行分析任务...");
    const parallelTasks = [];
    
    // 性能分析
    if (options.performance !== false) {
      parallelTasks.push(
        this.tools.performanceAnalyzer.func({
          sqlQuery: parsedSQL,
          databaseType,
          parsedStructure
        }).then(result => ({ type: 'performance', result }))
        .catch(error => ({ type: 'performance', result: { success: false, error: error.message } }))
      );
    }
    
    // 安全审计
    if (options.security !== false) {
      parallelTasks.push(
        this.tools.securityAuditor.func({
          sqlQuery: parsedSQL,
          databaseType,
          parsedStructure
        }).then(result => ({ type: 'security', result }))
        .catch(error => ({ type: 'security', result: { success: false, error: error.message } }))
      );
    }
    
    // 编码规范检查
    if (options.standards !== false) {
      parallelTasks.push(
        this.tools.standardsChecker.func({
          sqlQuery: parsedSQL,
          databaseType,
          parsedStructure
        }).then(result => ({ type: 'standards', result }))
        .catch(error => ({ type: 'standards', result: { success: false, error: error.message } }))
      );
    }
    
    // 优化建议生成（依赖于上面的分析结果，但可以并行开始）
    const optimizerPromise = Promise.all(parallelTasks).then(async (results) => {
      const tempResults = {
        performanceAnalysis: null,
        securityAudit: null,
        standardsCheck: null
      };
      
      results.forEach(({ type, result }) => {
        if (type === 'performance') tempResults.performanceAnalysis = result;
        else if (type === 'security') tempResults.securityAudit = result;
        else if (type === 'standards') tempResults.standardsCheck = result;
      });
      
      return this.tools.optimizer.func({
        sqlQuery: parsedSQL,
        databaseType,
        parsedStructure,
        performanceAnalysis: tempResults.performanceAnalysis,
        securityAudit: tempResults.securityAudit,
        standardsCheck: tempResults.standardsCheck
      }).catch(error => ({ success: false, error: error.message }));
    });
    
    parallelTasks.push(
      optimizerPromise.then(result => ({ type: 'optimizer', result }))
    );
    
    // 规则学习（可选，可以并行执行）
    if (options.learn !== false) {
      const learnerPromise = Promise.all(parallelTasks.slice(0, -1)).then(async (results) => {
        const tempResults = {
          parseResult,
          performanceAnalysis: null,
          securityAudit: null,
          standardsCheck: null
        };
        
        results.forEach(({ type, result }) => {
          if (type === 'performance') tempResults.performanceAnalysis = result;
          else if (type === 'security') tempResults.securityAudit = result;
          else if (type === 'standards') tempResults.standardsCheck = result;
        });
        
        return this.tools.ruleLearner.func({
          sqlQuery: parsedSQL,
          databaseType,
          analysisResults: tempResults
        }).catch(error => ({ success: false, error: error.message }));
      });
      
      parallelTasks.push(
        learnerPromise.then(result => ({ type: 'learner', result }))
      );
    }
    
    // 等待所有并行任务完成
    const allResults = await Promise.all(parallelTasks);
    
    // 整合所有结果
    const integratedResults = {
      parseResult,
      performanceAnalysis: null,
      securityAudit: null,
      standardsCheck: null,
      optimizationSuggestions: null,
      ruleLearning: null
    };
    
    allResults.forEach(({ type, result }) => {
      if (type === 'performance') integratedResults.performanceAnalysis = result;
      else if (type === 'security') integratedResults.securityAudit = result;
      else if (type === 'standards') integratedResults.standardsCheck = result;
      else if (type === 'optimizer') integratedResults.optimizationSuggestions = result;
      else if (type === 'learner') integratedResults.ruleLearning = result;
    });
    
    console.log("✅ 所有分析任务完成\n");
    
    // 输出分析结果摘要
    this.printAnalysisSummary(integratedResults);
    
    // 步骤5: 生成简化的综合报告（不使用LLM）
    // console.log("📊 生成综合分析报告...");
    const report = this.generateSimplifiedReport({
      sqlQuery,
      parsedSQL,
      databaseType,
      integratedResults
    });
    
    console.log("✅ 报告生成完成\n");
    
    // 计算并显示分析用时
    const analysisEndTime = Date.now();
    const analysisDuration = (analysisEndTime - analysisStartTime) / 1000; // 转换为秒
    console.log(`⏱️  本次分析用时: ${analysisDuration.toFixed(2)} 秒\n`);
    
    console.log('='.repeat(60));
    
    // 构建结果对象
    const result = {
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
    
    // 设置缓存
    this.setCachedResult(cacheKey, result);
    
    return result;
  }

  /**
   * 打印分析结果摘要
   * @param {Object} integratedResults - 整合的分析结果
   */
  printAnalysisSummary(integratedResults) {
    console.log("📋 分析结果摘要:");
    console.log('='.repeat(60));
    
    // 性能分析结果
    if (integratedResults.performanceAnalysis?.success) {
      const perf = integratedResults.performanceAnalysis.data;
      console.log("\n📊 性能分析:");
      console.log(`   评分: ${perf.performanceScore || '未知'}`);
      console.log(`   复杂度: ${perf.complexityLevel || '未知'}`);
      if (perf.bottlenecks?.length > 0) {
        console.log(`   主要瓶颈: ${perf.bottlenecks.slice(0, 2).map(b => b.description).join(', ')}`);
      }
    }
    
    // 安全审计结果
    if (integratedResults.securityAudit?.success) {
      const sec = integratedResults.securityAudit.data;
      console.log("\n🔒 安全审计:");
      console.log(`   评分: ${sec.securityScore || '未知'}`);
      console.log(`   风险等级: ${sec.riskLevel || '未知'}`);
      if (sec.vulnerabilities?.length > 0) {
        console.log(`   主要漏洞: ${sec.vulnerabilities.slice(0, 2).map(v => v.description).join(', ')}`);
      }
    }
    
    // 编码规范检查结果
    if (integratedResults.standardsCheck?.success) {
      const std = integratedResults.standardsCheck.data;
      console.log("\n📝 编码规范:");
      console.log(`   评分: ${std.standardsScore || '未知'}`);
      console.log(`   合规等级: ${std.complianceLevel || '未知'}`);
      if (std.violations?.length > 0) {
        console.log(`   主要违规: ${std.violations.slice(0, 2).map(v => v.description).join(', ')}`);
      }
    }
    
    // 优化建议结果
    if (integratedResults.optimizationSuggestions?.success) {
      const opt = integratedResults.optimizationSuggestions.data;
      console.log("\n💡 优化建议:");
      console.log(`   优化潜力: ${opt.optimizationPotential || '未知'}`);
      if (opt.optimizationSuggestions?.length > 0) {
        console.log("   关键建议:");
        opt.optimizationSuggestions.slice(0, 3).forEach((suggestion, index) => {
          console.log(`   ${index + 1}. ${suggestion.description}`);
        });
      }
    }
    
    // 规则学习结果
    if (integratedResults.ruleLearning) {
      console.log("\n🎓 规则学习:");
      if (integratedResults.ruleLearning.success) {
        console.log(`   状态: 成功`);
        if (integratedResults.ruleLearning.data?.savedPath) {
          console.log(`   保存路径: ${integratedResults.ruleLearning.data.savedPath}`);
        }
        if (integratedResults.ruleLearning.data?.mdFilePath) {
          console.log(`   Markdown规则已保存到: ${integratedResults.ruleLearning.data.mdFilePath}`);
        }
      } else {
        console.log(`   状态: 失败 - ${integratedResults.ruleLearning.error}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
  }

  /**
   * 生成简化的综合报告（不使用LLM）
   * @param {Object} input - 输入参数
   * @returns {Object} 综合报告
   */
  generateSimplifiedReport(input) {
    const { sqlQuery, parsedSQL, databaseType, integratedResults } = input;
    
    // 安全审计一票否决机制
    let securityVeto = false;
    let securityScore = null;
    let securityRiskLevel = null;
    
    if (integratedResults.securityAudit?.success) {
      securityScore = integratedResults.securityAudit.data.securityScore;
      securityRiskLevel = integratedResults.securityAudit.data.riskLevel;
      
      // 定义安全一票否决的条件：
      // 1. 安全评分低于40分
      // 2. 风险等级为"高"或"严重"
      if (typeof securityScore === 'number' && securityScore < 40) {
        securityVeto = true;
      }
      if (securityRiskLevel && ['高', '严重', 'high', 'critical'].includes(securityRiskLevel.toLowerCase())) {
        securityVeto = true;
      }
    }
    
    // 计算总体评分
    let overallScore = 0;
    
    if (securityVeto) {
      // 安全审计一票否决：无论其他指标多好，总分不超过30分
      overallScore = Math.min(30, securityScore || 0);
    } else {
      // 正常评分：计算各项指标的平均值
      const scores = [];
      if (integratedResults.performanceAnalysis?.success) {
        const score = integratedResults.performanceAnalysis.data.performanceScore;
        if (typeof score === 'number') scores.push(score);
      }
      if (securityScore !== null && typeof securityScore === 'number') {
        scores.push(securityScore);
      }
      if (integratedResults.standardsCheck?.success) {
        const score = integratedResults.standardsCheck.data.standardsScore;
        if (typeof score === 'number') scores.push(score);
      }
      
      overallScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
    }
    
    // 收集所有建议
    const recommendations = [];
    
    if (integratedResults.performanceAnalysis?.success) {
      const bottlenecks = integratedResults.performanceAnalysis.data.bottlenecks || [];
      bottlenecks.forEach(b => {
        if (b.recommendations) {
          recommendations.push(...b.recommendations.map(r => `[性能] ${r}`));
        }
      });
    }
    
    if (integratedResults.securityAudit?.success) {
      const vulnerabilities = integratedResults.securityAudit.data.vulnerabilities || [];
      vulnerabilities.forEach(v => {
        if (v.recommendations) {
          recommendations.push(...v.recommendations.map(r => `[安全] ${r}`));
        }
      });
    }
    
    if (integratedResults.standardsCheck?.success) {
      const violations = integratedResults.standardsCheck.data.violations || [];
      violations.forEach(v => {
        if (v.recommendations) {
          recommendations.push(...v.recommendations.map(r => `[规范] ${r}`));
        }
      });
    }
    
    if (integratedResults.optimizationSuggestions?.success) {
      const suggestions = integratedResults.optimizationSuggestions.data.optimizationSuggestions || [];
      suggestions.forEach(s => {
        recommendations.push(`[优化] ${s.description}`);
      });
    }
    
    // 生成摘要信息
    let summary = `SQL分析完成，总体评分: ${overallScore}/100`;
    if (securityVeto) {
      summary += ` ⚠️ 安全审计未通过（一票否决）`;
    }
    
    return {
      summary,
      securityVeto,  // 添加安全一票否决标志
      queryOverview: {
        originalQuery: sqlQuery,
        normalizedQuery: parsedSQL,
        databaseType: databaseType,
        complexity: integratedResults.performanceAnalysis?.data?.complexityLevel || '未知'
      },
      performanceAnalysis: integratedResults.performanceAnalysis?.success ? {
        score: integratedResults.performanceAnalysis.data.performanceScore,
        bottlenecks: integratedResults.performanceAnalysis.data.bottlenecks?.map(b => b.description) || [],
        optimizationPotential: integratedResults.optimizationSuggestions?.data?.optimizationPotential || '未知'
      } : null,
      securityAudit: integratedResults.securityAudit?.success ? {
        score: integratedResults.securityAudit.data.securityScore,
        riskLevel: integratedResults.securityAudit.data.riskLevel,
        vulnerabilities: integratedResults.securityAudit.data.vulnerabilities?.map(v => v.description) || []
      } : null,
      standardsCheck: integratedResults.standardsCheck?.success ? {
        score: integratedResults.standardsCheck.data.standardsScore,
        complianceLevel: integratedResults.standardsCheck.data.complianceLevel,
        violations: integratedResults.standardsCheck.data.violations?.map(v => v.description) || []
      } : null,
      optimizationSuggestions: integratedResults.optimizationSuggestions?.success ? {
        priority: integratedResults.optimizationSuggestions.data.optimizationPotential,
        suggestions: integratedResults.optimizationSuggestions.data.optimizationSuggestions || []
      } : null,
      overallAssessment: {
        score: overallScore,
        recommendations: recommendations.slice(0, 10) // 最多返回10条建议
      }
    };
  }
}

/**
 * 创建SQL分析协调器实例
 * @param {Object} config - 配置参数
 * @returns {SqlAnalysisCoordinator} 协调器实例
 */
export function createCoordinator(config = {}) {
  return new SqlAnalysisCoordinator(config);
}

// 保持向后兼容
export function createSubagentsCoordinator(config = {}) {
  return createCoordinator(config);
}

export default SqlAnalysisCoordinator;