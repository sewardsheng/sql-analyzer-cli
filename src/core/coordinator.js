/**
 * SQL分析协调器
 * 负责协调各个分析器的工作，整合分析结果
 */

import { ChatOpenAI } from '@langchain/openai';
import chalk from 'chalk';
import { createPerformanceAnalyzerTool } from './analyzers/performanceAnalyzer.js';
import { createSecurityAuditorTool } from './analyzers/securityAuditor.js';
import { createCodingStandardsCheckerTool } from './analyzers/codingStandardsChecker.js';
import { createSqlOptimizerAndSuggesterTool } from './analyzers/sqlOptimizerAndSuggester.js';
import { createIntelligentRuleLearnerTool } from './analyzers/intelligentRuleLearner.js';
import { createQuickAnalyzerTool } from './analyzers/quickAnalyzer.js';
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
    this.reportGenerator = new ReportGenerator();
  }



  /**
   * 初始化协调器和所有分析器
   */
  async initialize() {
    if (this.initialized) return;
    
    // 配置应该由服务层传入，这里不再读取配置文件
    if (!this.config.apiKey || !this.config.baseURL || !this.config.model) {
      throw new Error('协调器初始化失败：缺少必要的配置参数 (apiKey, baseURL, model)');
    }
    
    this.llm = new ChatOpenAI({
      modelName: this.config.model,
      temperature: 0.1,
      maxTokens: 99999,
      configuration: {
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL
      }
    });
    
    // 初始化所有分析器工具
    this.tools = {
      performanceAnalyzer: createPerformanceAnalyzerTool(this.config),
      securityAuditor: createSecurityAuditorTool(this.config),
      standardsChecker: createCodingStandardsCheckerTool(this.config),
      optimizer: createSqlOptimizerAndSuggesterTool(this.config),
      ruleLearner: createIntelligentRuleLearnerTool(this.config),
      quickAnalyzer: createQuickAnalyzerTool(this.config)
    };
    
    this.initialized = true;
  }

  /**
   * 快速分析SQL查询
   * @param {Object} input - 输入参数
   * @param {string} input.sqlQuery - SQL查询语句
   * @param {Object} input.options - 分析选项
   * @returns {Promise<Object>} 快速分析结果
   */
  async quickAnalysis(input) {
    // 记录分析开始时间
    const analysisStartTime = Date.now();
    
    await this.initialize();
    
    const { sqlQuery, options = {} } = input;
    
    // Headless 或 quiet 模式下不输出进度信息
    const isQuiet = options.headless || options.quiet;
    
    if (!isQuiet) {
      console.log(`\n⚡ 快速分析模式启动...\n`);
      console.log('='.repeat(60));
    }
    
    try {
      // 执行快速分析
      if (!isQuiet) {
        console.log("🔍 执行快速基础分析...");
      }
      
      const quickResult = await this.tools.quickAnalyzer.func({
        sqlQuery,
        options: {
          headless: this.config.headless
        }
      });
      
      if (!quickResult.success) {
        throw new Error(quickResult.error);
      }
      
      if (!isQuiet) {
        console.log("\n✅ 快速分析完成\n");
        
        // 计算并显示分析用时
        const analysisEndTime = Date.now();
        const analysisDuration = (analysisEndTime - analysisStartTime) / 1000;
        console.log(`⏱️  快速分析用时: ${analysisDuration.toFixed(2)} 秒\n`);
        console.log('='.repeat(60));
      }
      
      // 构建快速分析结果对象
      const result = {
        success: true,
        databaseType: quickResult.databaseType || 'unknown',
        data: {
          originalQuery: sqlQuery,
          normalizedQuery: sqlQuery,
          analysisResults: {
            quickAnalysis: quickResult
          },
          report: {
            summary: `SQL快速分析完成，快速评分: ${quickResult.quickScore || '未知'}/100`,
            quickAnalysis: quickResult
          },
          detailedResults: {
            quickAnalysis: quickResult
          }
        }
      };
      
      return result;
    } catch (error) {
      console.error(chalk.red(`快速分析失败: ${error.message}`));
      throw error;
    }
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
    
    const { sqlQuery, options = {} } = input;
    
    // 数据库类型将由分析器通过大模型识别
    let databaseType = 'unknown'; // 初始值，将由分析器更新
    
    console.log(`\n🔍 数据库类型将由大模型识别...\n`);
    
    console.log("\n🚀 开始并行执行分析流程...\n");
    console.log('='.repeat(60));
    
    const parallelTasks = [];
    
    // 步骤1-3: 三大核心分析（并行执行）
    console.log("⚡ 步骤1-3: 性能/安全/规范分析（并行）");
    
    // 性能分析
    if (options.performance !== false) {
      parallelTasks.push(
        this.tools.performanceAnalyzer.func({
          sqlQuery
        }).then(result => ({ type: 'performance', result }))
        .catch(error => ({ type: 'performance', result: { success: false, error: error.message } }))
      );
    }
    
    // 安全审计
    if (options.security !== false) {
      parallelTasks.push(
        this.tools.securityAuditor.func({
          sqlQuery
        }).then(result => ({ type: 'security', result }))
        .catch(error => ({ type: 'security', result: { success: false, error: error.message } }))
      );
    }
    
    // 编码规范检查
    if (options.standards !== false) {
      parallelTasks.push(
        this.tools.standardsChecker.func({
          sqlQuery
        }).then(result => ({ type: 'standards', result }))
        .catch(error => ({ type: 'standards', result: { success: false, error: error.message } }))
      );
    }
    
    // 等待所有并行任务完成
    console.log("\n⏳ 等待所有分析任务完成...\n");
    const initialResults = await Promise.all(parallelTasks);
    
    // 从性能分析结果中提取数据库类型
    const performanceResult = initialResults.find(r => r.type === 'performance');
    if (performanceResult && performanceResult.result.databaseType) {
      databaseType = performanceResult.result.databaseType;
      console.log(`\n🔍 识别到数据库类型: ${databaseType}\n`);
    }
    
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
    
    // 优化建议生成（此时已有数据库类型）
    additionalTasks.push(
      this.tools.optimizer.func({
        sqlQuery,
        databaseType,
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
      databaseType: databaseType, // 添加数据库类型到顶层
      data: {
        originalQuery: sqlQuery,
        normalizedQuery: sqlQuery,
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
    
    return result;
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

export default SqlAnalysisCoordinator;