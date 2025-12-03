/**
 * analyze命令模块
 * 老王我把analyze命令独立出来了！
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, extname } from 'path';
import { llmJsonParser } from '../../core/llm-json-parser.js';
import { cli as cliTools } from '../../utils/cli/index.js';
import { ResultFormatter, resultFormatter } from '../../utils/formatter.js';
import { ServiceContainer } from '../../services/factories/ServiceContainer.js';
import { ISQLAnalyzer, IFileAnalyzerService, IHistoryService } from '../../services/interfaces/ServiceInterfaces.js';
import { DatabaseIdentifier } from '../../core/identification/index.js';
import { DisplayService, DisplayMode, getDisplayService } from '../../services/display-service.js';

/**
 * 分析命令类 - 重构版
 * 使用ServiceContainer统一管理服务，消除重复代码
 */
export class AnalyzeCommand {
  private serviceContainer: ServiceContainer;
  private analyzer: ISQLAnalyzer;
  private fileAnalyzer: IFileAnalyzerService;
  private dbIdentifier: DatabaseIdentifier;

  constructor(serviceContainer?: ServiceContainer) {
    // 使用依赖注入，方便测试
    this.serviceContainer = serviceContainer || ServiceContainer.getInstance();

    // 从服务容器获取所有服务（同步服务）
    this.analyzer = this.serviceContainer.getSQLAnalyzer();
    this.fileAnalyzer = this.serviceContainer.getFileAnalyzerService();

    // 初始化数据库识别器
    this.dbIdentifier = new DatabaseIdentifier();
  }

  /**
   * 获取历史服务（直接从ServiceContainer获取，它会处理复用）
   */
  private async getHistoryService(): Promise<IHistoryService> {
    return await this.serviceContainer.getHistoryService();
  }

  /**
   * 处理分析命令
   */
  async execute(options: any): Promise<void> {
    const { sql, file, directory } = options;

    try {
      // 目录分析
      if (directory) {
        await this.executeDirectoryAnalysis(directory, options);
        return;
      }

      // 获取SQL内容
      let sqlContent = '';
      let inputPath = '';

      if (sql) {
        sqlContent = sql;
        inputPath = 'SQL语句';
      } else if (file) {
        inputPath = resolve(file);
        if (!existsSync(inputPath)) {
          throw new Error(`文件不存在: ${inputPath}`);
        }
        sqlContent = readFileSync(inputPath, 'utf-8');
      } else {
        throw new Error('请提供 --sql、--file 或 --directory 选项');
      }

      // 确定输入类型
      const inputType = sql ? 'sql' : 'file';

      // 自动识别数据库类型
      let databaseType = 'unknown';
      if (options.database) {
        databaseType = options.database;
      } else {
        const identificationResult = this.dbIdentifier.identify(sqlContent);
        databaseType = identificationResult.type || 'unknown';

        // 调试输出数据库识别结果
        if (options.debug) {
          console.log(cliTools.colors.magenta(`\n🔍 数据库识别结果:`));
          console.log(JSON.stringify(identificationResult, null, 2));
        }
      }

      cliTools.log.analysis(`正在分析SQL语句: ${sqlContent.substring(0, 100)}${sqlContent.length > 100 ? '...' : ''}`);
      cliTools.log.info(`检测到数据库类型: ${databaseType}`);
      const startTime = Date.now();

      // 使用AI智能分析模式
      cliTools.log.info('使用AI智能分析模式...');

      // 分析选项
      const analysisOptions = this.processOptions(options);
      // 将识别的数据库类型传递给分析器
      analysisOptions.databaseType = databaseType;

      try {
        // 使用analyzeSQL方法分析SQL内容
        const analysisResult = await this.analyzer.analyzeSQL(sqlContent, analysisOptions);

        // 使用新的显示服务处理分析结果
        const displayService = getDisplayService();

        // CLI模式下友好显示分析结果
        displayService.displayAnalysis(analysisResult, DisplayMode.CLI, cliTools.colors);

        // 构建兼容规则学习器的数据结构
        const extractedData = displayService.extractAnalysisData(analysisResult);
        const result = {
          fileInfo: {
            fileName: inputType === 'file' ?
              (inputPath.split('\\').pop() || inputPath.split('/').pop() || 'unknown') :
              'SQL语句',
            filePath: inputPath
          },
          stats: {
            totalStatements: 1,
            successfulAnalyses: analysisResult.success ? 1 : 0,
            overallScore: 75
          },
          analysis: {
            summary: extractedData.summary,
            issues: {
              performance: extractedData.performance.issues,
              security: extractedData.security.issues,
              standards: extractedData.standards.issues
            },
            recommendations: {
              performance: extractedData.performance.recommendations,
              security: extractedData.security.recommendations,
              standards: extractedData.standards.recommendations
            },
            sqlFix: extractedData.sqlFix,
            learning: null
          },
          // 为规则学习器提供兼容的数据结构
          data: {
            performance: {
              metadata: { confidence: 0.85 },
              data: {
                issues: extractedData.performance.issues
              }
            },
            security: {
              metadata: { confidence: 0.85 },
              data: {
                vulnerabilities: extractedData.security.issues
              }
            },
            standards: {
              metadata: { confidence: 0.85 },
              data: {
                violations: extractedData.standards.issues
              }
            }
          },
          rawResult: analysisResult
        };

        // 显示完成时间
        console.log(`\n${cliTools.colors.blue('💡 完成时间:')} ${new Date().toLocaleString()}`);

        // 保存分析结果到历史记录
        try {
          const historyService = await this.getHistoryService();
          await historyService.saveAnalysis({
            id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            databaseType: databaseType, // 使用识别的数据库类型
            type: inputType,
            sql: sqlContent, // 添加原始SQL字段
            input: {
              content: sqlContent.length > 500 ? sqlContent.substring(0, 500) + '...' : sqlContent,
              path: inputPath,
              name: inputType === 'file' ?
                (inputPath.split('\\').pop() || inputPath.split('/').pop() || 'unknown') :
                'SQL语句'
            },
            result: {
              success: true, // 添加成功标志
              summary: result.analysis.summary,
              issues: result.analysis.issues,
              recommendations: result.analysis.recommendations,
              confidence: 0.85, // 使用默认置信度
              sqlFix: result.analysis.sqlFix
            },
            metadata: {
              processingTime: Date.now() - startTime,
              analyzer: 'enhanced',
              version: '1.0.0'
            }
          });
          cliTools.log.success('✅ 分析结果已保存到历史记录');
        } catch (historyError: any) {
          cliTools.log.warn(`⚠️  历史记录保存失败: ${historyError.message}`);
        }

        // 触发规则学习（在保存历史记录后执行）
        console.log(`\n${cliTools.colors.blue('🔄 正在进行规则学习...')}`);
        try {
          await this.asyncTriggerRuleLearning(sqlContent, inputType, inputPath, result);
        } catch (error: any) {
          console.log(`${cliTools.colors.yellow('⚠️ 规则学习出错:')} ${error.message}`);
        }

      } catch (error: any) {
        cliTools.log.error(`分析失败: ${error.message}`);
        throw error;
      }

    } catch (error: any) {
      cliTools.log.error(`文件分析失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 处理命令选项，转换为分析器需要的格式
   */
  private processOptions(commanderOptions: any): any {
    const options: any = {};

    // 默认启用的分析选项
    options.enableLearning = true; // 总是启用规则学习
    options.enablePerformance = true;
    options.enableSecurity = true;
    options.enableStandards = true;

    // 分析类型处理
    if (commanderOptions.types) {
      options.analysisTypes = commanderOptions.types;
    }

    // 数据库类型
    if (commanderOptions.database) {
      options.databaseType = commanderOptions.database;
    }

    // 批量大小
    if (commanderOptions.batchSize) {
      options.batchSize = parseInt(commanderOptions.batchSize);
    }

    // 递归选项
    if (commanderOptions.recursive) {
      options.recursive = true;
    }

    // 缓存选项处理
    if (commanderOptions.cache === false) {
      options.enableCaching = false;
    }

    // JSON输出
    if (commanderOptions.json) {
      options.outputFormat = 'json';
    }

    // 输出文件
    if (commanderOptions.output) {
      options.outputFile = commanderOptions.output;
    }

    // 性能分析
    if (commanderOptions.performance) {
      options.analysisTypes = options.analysisTypes || [];
      if (!options.analysisTypes.includes('performance')) {
        options.analysisTypes.push('performance');
      }
    }

    // 安全分析
    if (commanderOptions.security) {
      options.analysisTypes = options.analysisTypes || [];
      if (!options.analysisTypes.includes('security')) {
        options.analysisTypes.push('security');
      }
    }

    // 规范分析
    if (commanderOptions.standards) {
      options.analysisTypes = options.analysisTypes || [];
      if (!options.analysisTypes.includes('standards')) {
        options.analysisTypes.push('standards');
      }
    }

    return options;
  }

  /**
   * 执行目录分析
   */
  private async executeDirectoryAnalysis(dirPath: string, options: any): Promise<void> {
    cliTools.log.analysis(`正在分析目录: ${cliTools.colors.cyan(dirPath)}`);
    const startTime = Date.now();

    try {
      const analysisOptions = this.processOptions(options);
      analysisOptions.recursive = options.recursive || false;
      analysisOptions.batchSize = options.batchSize || 10;

      const result = await this.fileAnalyzer.analyzeDirectory(dirPath, analysisOptions);

      // 显示目录分析结果
      this.displayDirectoryResults(result);

      const duration = Date.now() - startTime;
      console.log(cliTools.colors.green(`✅ 目录分析完成，耗时: ${duration}ms`));
      console.log(cliTools.colors.blue(`💡 完成时间: ${new Date().toLocaleString()}`));

    } catch (error: any) {
      cliTools.log.error(`目录分析失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 显示目录分析结果
   */
  private displayDirectoryResults(result: any): void {
    console.log(cliTools.colors.cyan('\n📂 目录扫描结果'));
    console.log(cliTools.colors.gray('=================================================='));

    if (!result.success) {
      console.log(cliTools.colors.red(`❌ ${result.error || '分析失败'}`));
      return;
    }

    // 显示基本统计
    console.log(`目录: ${cliTools.colors.cyan(result.directory)}`);
    console.log(`文件数量: ${cliTools.colors.yellow(result.fileCount.toString())}`);

    // 显示分析统计
    if (result.stats) {
      const stats = result.stats;
      console.log(`成功文件: ${cliTools.colors.green((stats.successfulFiles || 0).toString())}`);
      console.log(`失败文件: ${cliTools.colors.red((stats.failedFiles || 0).toString())}`);
      console.log(`总SQL语句: ${cliTools.colors.yellow((stats.totalStatements || 0).toString())}`);
      console.log(`总问题数: ${cliTools.colors.yellow((stats.totalIssues || 0).toString())}`);

      if (stats.averageScore > 0) {
        let scoreColor = cliTools.colors.green;
        if (stats.averageScore < 60) scoreColor = cliTools.colors.red;
        else if (stats.averageScore < 80) scoreColor = cliTools.colors.yellow;
        console.log(`平均评分: ${scoreColor(stats.averageScore + '分')}`);
      }
    }

    // 显示文件详情
    if (result.results && result.results.length > 0) {
      console.log(cliTools.colors.cyan('\n📄 文件详情:'));

      result.results.forEach((file: any, index: number) => {
        console.log(`\n${cliTools.colors.yellow(`${index + 1}. ${file.fileInfo?.fileName || 'Unknown'}`)}`);

        if (file.stats) {
          console.log(`  SQL语句数: ${cliTools.colors.yellow((file.stats.totalStatements || 0).toString())}`);
          console.log(`  成功分析: ${cliTools.colors.green((file.stats.successfulAnalyses || 0).toString())}`);
          console.log(`  失败分析: ${cliTools.colors.red((file.stats.failedAnalyses || 0).toString())}`);

          if (file.stats.overallScore > 0) {
            let scoreColor = cliTools.colors.green;
            if (file.stats.overallScore < 60) scoreColor = cliTools.colors.red;
            else if (file.stats.overallScore < 80) scoreColor = cliTools.colors.yellow;

            console.log(`  总体评分: ${scoreColor(file.stats.overallScore + '分')}`);
          }
        }

        // 显示主要问题
        if (file.analysis && file.analysis.issues && file.analysis.issues.length > 0) {
          console.log(`  问题数量: ${cliTools.colors.red(file.analysis.issues.length.toString())}`);
        }

        // 显示错误信息
        if (!file.success && file.error) {
          console.log(`  错误: ${cliTools.colors.red(file.error)}`);
        }
      });
    }

    // 显示总体统计
    if (result.stats) {
      console.log(cliTools.colors.cyan('\n🚨 问题统计:'));
      const stats = result.stats;

      let performanceIssues = 0;
      let securityIssues = 0;
      let standardsIssues = 0;

      // 统计各类问题数量
      result.results?.forEach((file: any) => {
        if (file.analysis?.issues) {
          file.analysis.issues.forEach((issue: any) => {
            const dimension = issue.dimension || 'unknown';
            if (dimension === 'performance') performanceIssues++;
            else if (dimension === 'security') securityIssues++;
            else if (dimension === 'standards') standardsIssues++;
          });
        }
      });

      console.log(`${cliTools.colors.yellow('性能问题:')} ${cliTools.colors.yellow(performanceIssues.toString())}`);
      console.log(`${cliTools.colors.red('安全问题:')} ${cliTools.colors.yellow(securityIssues.toString())}`);
      console.log(`${cliTools.colors.blue('规范问题:')} ${cliTools.colors.yellow(standardsIssues.toString())}`);
    }
  }

  /**
   * 按维度分组问题
   */
  private groupIssuesByDimension(issues: any[]): any {
    if (!issues || !Array.isArray(issues)) {
      return {
        performance: [],
        security: [],
        standards: []
      };
    }

    const grouped = {
      performance: [],
      security: [],
      standards: []
    };

    issues.forEach(issue => {
      const dimension = issue.dimension || 'unknown';
      if (grouped[dimension]) {
        grouped[dimension].push(issue);
      }
    });

    return grouped;
  }

  /**
   * 按维度分组建议
   */
  private groupRecommendationsByDimension(recommendations: any[]): any {
    if (!recommendations || !Array.isArray(recommendations)) {
      return {
        performance: [],
        security: [],
        standards: []
      };
    }

    const grouped = {
      performance: [],
      security: [],
      standards: []
    };

    recommendations.forEach(rec => {
      const dimension = rec.dimension || 'unknown';
      if (grouped[dimension]) {
        grouped[dimension].push(rec);
      }
    });

    return grouped;
  }

  /**
   * 触发规则学习
   * @param sqlContent SQL内容
   * @param inputType 输入类型
   * @param inputPath 输入路径
   * @param result 完整的分析结果（包含规则学习需要的data结构）
   */
  private async asyncTriggerRuleLearning(sqlContent: string, inputType: string, inputPath: string, result: any): Promise<void> {
    try {
      console.log(cliTools.colors.blue('📥 开始导入规则学习模块...'));

      
      console.log(cliTools.colors.blue('🔧 初始化服务...'));

      console.log(cliTools.colors.blue('🚀 开始执行规则学习...'));

  
      // 使用统一规则学习器
      const { getUnifiedRuleLearner } = await import('../../services/rule-learning/unified-rule-learner.js');
      const learner = getUnifiedRuleLearner();

      const learningResult = await learner.learnFromAnalysis(
        sqlContent,
        result,
        'unknown', // 数据库类型，可以后续优化
        'rules/learning-rules/generated'
      );

      // 显示学习结果
      learner.printResult(learningResult, cliTools.colors);

    } catch (error) {
      console.log(`${cliTools.colors.red('❌ 规则学习失败:')} ${error.message}`);
    }
  }
}