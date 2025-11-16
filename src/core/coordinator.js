/**
 * SQL分析协调器
 * 负责协调各个分析器的工作，整合分析结果
 */

import { ChatOpenAI } from '@langchain/openai';
import { readConfig } from '../services/config/index.js';
import { createPerformanceAnalyzerTool } from './analyzers/performanceAnalyzer.js';
import { createSecurityAuditorTool } from './analyzers/securityAuditor.js';
import { createCodingStandardsCheckerTool } from './analyzers/codingStandardsChecker.js';
import { createSqlOptimizerAndSuggesterTool } from './analyzers/sqlOptimizerAndSuggester.js';
import { createIntelligentRuleLearnerTool } from './analyzers/intelligentRuleLearner.js';
import CacheManager from './cache.js';
import ReportGenerator from './reporter.js';

/**
 * SQL分析协调器
 */
class SqlAnalysisCoordinator {
  constructor(config = {}) {
    this.config = config;
    this.llm = null;
    this.initialized = false;
    this.tools = {};
    this.cacheManager = new CacheManager(config);
    this.reportGenerator = new ReportGenerator();
  }

  /**
   * 基于规则快速检测数据库方言
   * @param {string} sqlQuery - SQL查询语句
   * @returns {string} 检测到的数据库类型
   */
  detectDatabaseType(sqlQuery) {
    const dialectFeatures = {
      mysql: [
        /LIMIT\s+\d+/i,
        /AUTO_INCREMENT/i,
        /`[^`]+`/,
        /UNSIGNED/i,
        /CHARSET\s*=/i,
        /ENGINE\s*=/i
      ],
      postgresql: [
        /ILIKE/i,
        /SERIAL/i,
        /\$\$/,
        /RETURNING/i,
        /::/,
        /ARRAY\[/i
      ],
      sqlserver: [
        /TOP\s+\d+/i,
        /IDENTITY/i,
        /\[[^\]]+\]/,
        /GETDATE\(\)/i,
        /LEN\(/i,
        /NVARCHAR/i
      ],
      oracle: [
        /ROWNUM/i,
        /SEQUENCE/i,
        /DUAL/i,
        /SYSDATE/i,
        /NVL\(/i,
        /VARCHAR2/i
      ]
    };
    
    const scores = {};
    for (const [dialect, patterns] of Object.entries(dialectFeatures)) {
      scores[dialect] = patterns.filter(pattern => pattern.test(sqlQuery)).length;
    }
    
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore >= 2) {
      const detected = Object.entries(scores)
        .filter(([_, score]) => score === maxScore)
        .map(([dialect, _]) => dialect);
      
      return detected[0];
    }
    
    return 'generic';
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
    const cacheKey = this.cacheManager.generateKey(
      sqlQuery,
      providedDatabaseType || 'auto',
      options
    );
    const cachedResult = this.cacheManager.get(cacheKey);
    
    if (cachedResult) {
      console.log("✨ 使用内存缓存的分析结果");
      console.log(`   缓存时间: ${new Date(cachedResult.timestamp).toLocaleString('zh-CN')}`);
      console.log('='.repeat(60));
      
      // 打印缓存结果摘要
      if (cachedResult.result.data && cachedResult.result.data.analysisResults) {
        this.reportGenerator.printSummary(cachedResult.result.data.analysisResults);
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
      console.log("⚡ 正在快速检测数据库类型...");
      databaseType = this.detectDatabaseType(sqlQuery);
      console.log(`✅ 检测到数据库类型: ${databaseType}`);
    } else {
      console.log(`📌 使用指定的数据库类型: ${databaseType}`);
    }
    
    console.log("\n🚀 开始并行执行分析流程...\n");
    console.log('='.repeat(60));
    
    const parallelTasks = [];
    
    // 步骤1-3: 三大核心分析（并行执行）
    console.log("⚡ 步骤1-3: 性能/安全/规范分析（并行）");
    
    // 性能分析
    if (options.performance !== false) {
      parallelTasks.push(
        this.tools.performanceAnalyzer.func({
          sqlQuery,
          databaseType,
          parsedStructure: null
        }).then(result => ({ type: 'performance', result }))
        .catch(error => ({ type: 'performance', result: { success: false, error: error.message } }))
      );
    }
    
    // 安全审计
    if (options.security !== false) {
      parallelTasks.push(
        this.tools.securityAuditor.func({
          sqlQuery,
          databaseType,
          parsedStructure: null
        }).then(result => ({ type: 'security', result }))
        .catch(error => ({ type: 'security', result: { success: false, error: error.message } }))
      );
    }
    
    // 编码规范检查
    if (options.standards !== false) {
      parallelTasks.push(
        this.tools.standardsChecker.func({
          sqlQuery,
          databaseType,
          parsedStructure: null
        }).then(result => ({ type: 'standards', result }))
        .catch(error => ({ type: 'standards', result: { success: false, error: error.message } }))
      );
    }
    
    // 等待所有并行任务完成
    console.log("\n⏳ 等待所有分析任务完成...\n");
    const initialResults = await Promise.all(parallelTasks);
    
    // 继续执行优化建议和规则学习（这些依赖前面的分析结果）
    console.log("\n💡 步骤4: 生成优化建议...");
    const additionalTasks = [];
    
    // 整合前面的分析结果
    const tempResults = {
      performanceAnalysis: null,
      securityAudit: null,
      standardsCheck: null
    };
    
    initialResults.forEach(({ type, result }) => {
      if (type === 'performance') tempResults.performanceAnalysis = result;
      else if (type === 'security') tempResults.securityAudit = result;
      else if (type === 'standards') tempResults.standardsCheck = result;
    });
    
    // 优化建议生成
    additionalTasks.push(
      this.tools.optimizer.func({
        sqlQuery,
        databaseType,
        parsedStructure: null,
        performanceAnalysis: tempResults.performanceAnalysis,
        securityAudit: tempResults.securityAudit,
        standardsCheck: tempResults.standardsCheck
      }).then(result => ({ type: 'optimizer', result }))
      .catch(error => ({ type: 'optimizer', result: { success: false, error: error.message } }))
    );
    
    // 规则学习（可选）
    if (options.learn !== false) {
      console.log("🎓 步骤5: 规则学习...");
      additionalTasks.push(
        this.tools.ruleLearner.func({
          sqlQuery,
          databaseType,
          analysisResults: tempResults
        }).then(result => ({ type: 'learner', result }))
        .catch(error => ({ type: 'learner', result: { success: false, error: error.message } }))
      );
    }
    
    // 等待优化建议和规则学习完成
    const additionalResults = await Promise.all(additionalTasks);
    
    // 合并所有结果
    const allResults = [...initialResults, ...additionalResults];
    
    // 整合所有结果
    const integratedResults = {
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
    
    console.log("\n✅ 所有分析任务完成\n");
    
    // 输出分析结果摘要
    this.reportGenerator.printSummary(integratedResults);
    
    // 生成简化的综合报告（不使用LLM）
    const report = this.reportGenerator.generateReport({
      sqlQuery,
      parsedSQL: sqlQuery,
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
        normalizedQuery: sqlQuery,
        databaseType,
        analysisResults: integratedResults,
        report,
        // 添加各个子代理的详细结果，以便在UI中显示
        detailedResults: {
          performanceAnalysis: integratedResults.performanceAnalysis,
          securityAudit: integratedResults.securityAudit,
          standardsCheck: integratedResults.standardsCheck,
          optimizationSuggestions: integratedResults.optimizationSuggestions
        }
      }
    };
    
    // 设置缓存
    this.cacheManager.set(cacheKey, result);
    
    return result;
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cacheManager.clear();
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