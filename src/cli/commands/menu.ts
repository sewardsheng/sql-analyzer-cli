/**
 * menu命令模块 - 交互式菜单
 * 提供用户友好的交互式菜单界面
 */

import readline from 'readline';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { updateEnvFile } from '../../utils/env-helper.js';
import { resolve } from 'path';
import { cli as cliTools } from '../../utils/cli/index.js';
import HealthService from '../../services/health-service.js';
import { getGlobalLogger } from '../../utils/logger.js';
import { config } from '../../config/index.js';
import { ResultFormatter } from '../../utils/formatter.js';
import { ServiceContainer } from '../../services/factories/ServiceContainer.js';
import { DisplayService, DisplayMode, getDisplayService } from '../../services/display-service.js';
import {
  AnalysisType,
  DatabaseType,
  getAnalysisTypeLabel,
  getDatabaseTypeLabel
} from '../../types/analysis.js';

/**
 * 交互式菜单命令类 - 重构版
 * 使用ServiceContainer统一管理服务，消除重复代码
 */
export class MenuCommand {
  private rl: readline.Interface;
  private serviceContainer: ServiceContainer;
  private healthService: HealthService;
  private analyzer: any;
  private fileAnalyzer: any;
  private knowledgeService: any;
  private resultFormatter: ResultFormatter;
  private historyService: any;

  constructor(serviceContainer?: ServiceContainer) {
    // 使用依赖注入，方便测试
    this.serviceContainer = serviceContainer || ServiceContainer.getInstance();
    this.healthService = new HealthService();

    // 从服务容器获取所有服务（同步服务）
    this.analyzer = this.serviceContainer.getSQLAnalyzer();
    this.fileAnalyzer = this.serviceContainer.getFileAnalyzerService();
    this.knowledgeService = this.serviceContainer.getKnowledgeService();
    this.resultFormatter = this.serviceContainer.getResultFormatter();

    // 异步初始化历史服务
    this.initializeHistoryService();
  }

  /**
   * 异步初始化历史服务
   */
  private async initializeHistoryService(): Promise<void> {
    try {
      this.historyService = await this.serviceContainer.getHistoryService();
    } catch (error: any) {
      console.warn(`历史服务初始化失败: ${error.message}`);
      this.historyService = null;
    }
  }

  /**
   * 获取历史服务
   */
  private async getHistoryService(): Promise<any> {
    if (!this.historyService) {
      this.historyService = await this.serviceContainer.getHistoryService();
    }
    return this.historyService;
  }

  /**
   * 初始化readline接口
   */
  private initReadline() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * 处理menu命令
   */
  async execute(): Promise<void> {
    // 初始化readline接口
    this.initReadline();

    cliTools.log.info('🚀 启动SQL分析器交互式菜单...');

    try {
      await this.showMainMenu();
    } catch (error: any) {
      cliTools.log.error(`菜单执行错误: ${error.message}`);
      throw error;
    } finally {
      this.rl.close();
    }
  }

  /**
   * 显示主菜单
   */
  private async showMainMenu(): Promise<void> {
    while (true) {
      this.clearScreen();
      this.showHeader();

      console.log(cliTools.colors.cyan('\n📋 SQL分析器 - 主菜单'));
      console.log(cliTools.colors.gray('═'.repeat(50)));

      const options = [
        { id: '1', name: '🔍 SQL分析', description: '分析SQL语句、文件或目录' },
        { id: '2', name: '🏥 系统状态', description: '查看系统健康状态和统计信息' },
        { id: '3', name: '📚 历史记录', description: '管理分析历史记录' },
        { id: '4', name: '🧠 知识库管理', description: '管理SQL知识和规则审批' },
        { id: '5', name: '⚙️  配置管理', description: '查看和修改系统配置' },
        { id: '6', name: '❓ 帮助', description: '使用帮助和文档' },
        { id: '0', name: '🚪 退出', description: '退出程序' }
      ];

      options.forEach(option => {
        console.log(`  ${cliTools.colors.yellow(option.id.padEnd(2))} ${option.name} ${cliTools.colors.gray(`- ${option.description}`)}`);
      });

      console.log(cliTools.colors.gray('═'.repeat(50)));

      const choice = await this.askQuestion('\n请选择操作 (输入数字): ');

      switch (choice.trim()) {
        case '1':
          await this.showAnalysisMenu();
          break;
        case '2':
          await this.showSystemMenu();
          break;
        case '3':
          await this.showHistoryMenu();
          break;
        case '4':
          await this.showKnowledgeMenu();
          break;
        case '5':
          await this.showConfigMenu();
          break;
        case '6':
          await this.showHelpMenu();
          break;
        case '0':
          await this.exit();
          return;
        default:
          cliTools.log.error('❌ 无效选择，请输入正确的数字');
          await this.askQuestion('按回车键继续...');
      }
    }
  }

  /**
   * 显示SQL分析菜单
   */
  private async showAnalysisMenu(): Promise<void> {
    while (true) {
      this.clearScreen();
      this.showHeader();

      console.log(cliTools.colors.cyan('\n🔍 SQL分析'));
      console.log(cliTools.colors.gray('═'.repeat(50)));

      const options = [
        { id: '1', name: '输入SQL语句', description: '直接输入SQL语句进行分析' },
        { id: '2', name: '选择SQL文件', description: '选择本地SQL文件进行分析' },
        { id: '3', name: '分析目录', description: '分析指定目录下的所有SQL文件' },
        { id: '4', name: '批量分析', description: '批量处理多个SQL文件' },
        { id: '0', name: '返回主菜单', description: '返回主菜单' }
      ];

      options.forEach(option => {
        console.log(`  ${cliTools.colors.yellow(option.id.padEnd(2))} ${option.name} ${cliTools.colors.gray(`- ${option.description}`)}`);
      });

      const choice = await this.askQuestion('\n请选择分析方式: ');

      switch (choice.trim()) {
        case '1':
          await this.analyzeInputSQL();
          break;
        case '2':
          await this.analyzeFile();
          break;
        case '3':
          await this.analyzeDirectory();
          break;
        case '4':
          await this.batchAnalysis();
          break;
        case '0':
          return;
        default:
          cliTools.log.error('❌ 无效选择');
          await this.askQuestion('按回车键继续...');
      }
    }
  }

  /**
   * 输入SQL语句进行分析
   */
  private async analyzeInputSQL(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n📝 输入SQL语句进行分析'));
    console.log(cliTools.colors.gray('提示: 输入完成后按回车键，输入 "exit" 取消'));
    console.log(cliTools.colors.gray('─'.repeat(50)));

    const sql = await this.askQuestion('请输入SQL语句: ');

    if (sql.trim().toLowerCase() === 'exit') {
      cliTools.log.info('已取消分析');
      return;
    }

    if (!sql.trim()) {
      cliTools.log.error('❌ SQL语句不能为空');
      await this.askQuestion('按回车键继续...');
      return;
    }

    try {
      cliTools.log.info('🔄 正在分析SQL语句...');
      const startTime = Date.now();

      // 调用真正的分析器
      const analysisOptions = {
        enablePerformance: true,
        enableSecurity: true,
        enableStandards: true,
        verbose: false
      };

      const analysisResult = await this.analyzer.analyzeSQL(sql, analysisOptions);
      const duration = Date.now() - startTime;

      console.log(cliTools.colors.green(`\n✅ 分析完成，耗时: ${duration}ms`));

      // 显示分析结果
      await this.displayAnalysisResult(analysisResult, sql);

      // 保存分析结果到历史记录
      try {
        await this.saveAnalysisToHistory(sql, analysisResult, duration);
        cliTools.log.success('✅ 分析结果已保存到历史记录');
      } catch (historyError: any) {
        cliTools.log.warn(`⚠️  历史记录保存失败: ${historyError.message}`);
      }

      // 触发规则学习 - 后台异步执行，不阻塞用户
      console.log(`\n${cliTools.colors.gray('🔄 后台正在进行规则学习...')}`);
      this.asyncTriggerRuleLearningFromResult(sql, analysisResult).catch(error => {
        // 静默处理规则学习错误，不打扰用户体验
      });

      // 等待用户查看完分析结果
      await this.askQuestion('\n按回车键继续...');

    } catch (error: any) {
      cliTools.log.error(`❌ 分析失败: ${error.message}`);
      await this.askQuestion('\n按回车键继续...');
    }
  }

  /**
   * 显示分析结果
   */
  private async displayAnalysisResult(result: any, sql: string): Promise<void> {
    // 使用统一的显示服务处理分析结果
    const displayService = getDisplayService();

    // Menu模式下，显示友好的分析结果
    displayService.displayAnalysis(result, DisplayMode.CLI, cliTools.colors);

    // 不需要额外显示SQL对比，DisplayService已经包含了SQL修复建议
  }

  
  /**
   * 显示问题和建议
   */
  private displayIssuesAndRecommendations(result: any): void {
    const allIssues = [];
    const allRecommendations = [];

    // 收集所有问题和建议
    ['performance', 'security', 'standards'].forEach(type => {
      const dimensionData = result[type];
      if (dimensionData?.issues && Array.isArray(dimensionData.issues)) {
        allIssues.push(...dimensionData.issues.map(issue => ({ ...issue, dimension: type })));
      }
      if (dimensionData?.recommendations && Array.isArray(dimensionData.recommendations)) {
        allRecommendations.push(...dimensionData.recommendations.map(rec => ({ ...rec, dimension: type })));
      }
    });

    // 显示问题
    if (allIssues.length > 0) {
      console.log(`\n${cliTools.colors.cyan('⚠️  发现的问题 (${allIssues.length}):')}`);
      allIssues.slice(0, 5).forEach((issue: any, index: number) => {
        const dimensionName = this.getDimensionDisplayName(issue.dimension);
        const dimensionColor = this.getDimensionColor(issue.dimension);
        const severityColor = this.getSeverityColor(issue.severity);

        console.log(`  ${index + 1}. [${dimensionName}][${severityColor(issue.severity?.toUpperCase() || 'MEDIUM')}] ${issue.title}`);
        console.log(`     ${cliTools.colors.gray(issue.description)}`);
      });

      if (allIssues.length > 5) {
        console.log(`     ... 还有 ${allIssues.length - 5} 个问题未显示`);
      }
    } else {
      console.log(`\n${cliTools.colors.green('🎉 太棒了！没有发现任何问题！')}`);
    }

    // 显示建议
    if (allRecommendations.length > 0) {
      console.log(`\n${cliTools.colors.blue('💡 建议 (${allRecommendations.length}):')}`);
      allRecommendations.slice(0, 3).forEach((rec: any, index: number) => {
        const dimensionName = this.getDimensionDisplayName(rec.dimension);
        const dimensionColor = this.getDimensionColor(rec.dimension);
        const priorityColor = rec.priority === 'HIGH' ? cliTools.colors.red : cliTools.colors.yellow;

        console.log(`  ${index + 1}. [${dimensionName}][${priorityColor(rec.priority || 'MEDIUM')}] ${rec.title}`);
        console.log(`     ${cliTools.colors.gray(rec.description)}`);
      });

      if (allRecommendations.length > 3) {
        console.log(`     ... 还有 ${allRecommendations.length - 3} 个建议未显示`);
      }
    }
  }

  private getDimensionDisplayName(dimension: string): string {
    const nameMap: Record<string, string> = {
      'performance': '性能',
      'security': '安全',
      'standards': '规范'
    };
    return nameMap[dimension] || dimension;
  }

  private getDimensionColor(dimension: string): any {
    const colorMap: Record<string, any> = {
      'performance': cliTools.colors.yellow,
      'security': cliTools.colors.red,
      'standards': cliTools.colors.blue
    };
    return colorMap[dimension] || cliTools.colors.gray;
  }

  private getSeverityColor(severity: string): any {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return cliTools.colors.red;
      case 'HIGH': return cliTools.colors.red;
      case 'MEDIUM': return cliTools.colors.yellow;
      case 'LOW': return cliTools.colors.blue;
      default: return cliTools.colors.gray;
    }
  }

  /**
   * 处理分析失败的情况
   */
  private async handleAnalysisError(result: any, sql: string): Promise<void> {
    console.log(cliTools.colors.red('❌ 分析失败'));
    if (result.error) {
      console.log(`错误信息: ${result.error}`);
    }
    await this.askQuestion('\n按回车键继续...');
  }

  /**
   * 获取分数颜色
   */
  private getScoreColor(score: number): string {
    if (score >= 80) return cliTools.colors.green(score.toString());
    if (score >= 60) return cliTools.colors.yellow(score.toString());
    return cliTools.colors.red(score.toString());
  }

  /**
   * 选择文件进行分析
   */
  private async analyzeFile(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n📁 选择SQL文件进行分析'));
    console.log(cliTools.colors.gray('─'.repeat(50)));

    const filePath = await this.askQuestion('请输入SQL文件路径: ');

    if (!filePath.trim()) {
      cliTools.log.error('❌ 文件路径不能为空');
      await this.askQuestion('按回车键继续...');
      return;
    }

    const resolvedPath = resolve(filePath.trim());

    if (!existsSync(resolvedPath)) {
      cliTools.log.error(`❌ 文件不存在: ${resolvedPath}`);
      await this.askQuestion('按回车键继续...');
      return;
    }

    try {
      cliTools.log.info(`🔄 正在分析文件: ${resolvedPath}`);
      const startTime = Date.now();

      // 调用文件分析服务
      const analysisOptions = {
        enablePerformance: true,
        enableSecurity: true,
        enableStandards: true,
        enableLearning: true, // 启用规则学习
        verbose: false
      };

      const analysisResult = await this.fileAnalyzer.analyzeFile(resolvedPath, analysisOptions);
      const duration = Date.now() - startTime;

      console.log(cliTools.colors.green(`\n✅ 文件分析完成，耗时: ${duration}ms`));

      // 保存历史记录
      try {
        // 分析文件中的SQL语句，确定主要数据库类型
        let detectedDatabaseType = DatabaseType.UNKNOWN;
        if (analysisResult.analyses && Array.isArray(analysisResult.analyses)) {
          const dbTypeCounts: Record<string, number> = {};

          analysisResult.analyses.forEach((sqlAnalysis: any) => {
            const dbType = sqlAnalysis.databaseType || DatabaseType.UNKNOWN;
            dbTypeCounts[dbType] = (dbTypeCounts[dbType] || 0) + 1;
          });

          // 选择出现频率最高的数据库类型
          const maxCount = Math.max(...Object.values(dbTypeCounts));
          const mostFrequentTypes = Object.entries(dbTypeCounts)
            .filter(([_, count]) => count === maxCount)
            .map(([type, _]) => type);

          if (mostFrequentTypes.length > 0) {
            detectedDatabaseType = mostFrequentTypes[0] as DatabaseType;
          }
        }

        const historyService = await this.getHistoryService();
        await historyService.addAnalysis({
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          databaseType: detectedDatabaseType,
          type: AnalysisType.FILE_ANALYSIS,
          filePath: resolvedPath,
          result: analysisResult,
          metadata: {
            version: '2.0.0',
            source: 'menu',
            inputMethod: 'file_analysis'
          }
        });
        console.log(cliTools.colors.green('✅ 分析结果已保存到历史记录'));
      } catch (historyError: any) {
        console.log(cliTools.colors.yellow(`⚠️ 历史记录保存失败: ${historyError.message}`));
      }

      // 触发规则学习 - 基于当前分析结果
      console.log(`\n${cliTools.colors.blue('🔄 正在进行规则学习...')}`);
      this.asyncTriggerRuleLearningFromFile(analysisResult, resolvedPath).catch(error => {
        console.log(`${cliTools.colors.yellow('⚠️ 规则学习出错:')} ${error.message}`);
      });

      // 显示分析结果
      if (analysisResult.summary) {
        console.log(`\n${cliTools.colors.cyan('📊 文件分析概览:')}`);
        console.log(`文件路径: ${cliTools.colors.blue(resolvedPath)}`);
        console.log(`SQL语句数: ${cliTools.colors.yellow(analysisResult.summary.totalStatements?.toString() || '0')}`);
        console.log(`成功分析: ${cliTools.colors.green(analysisResult.summary.successful?.toString() || '0')}`);
        console.log(`总体评分: ${this.getScoreColor(analysisResult.summary.overallScore || 0)}(analysisResult.summary.overallScore || 0)分`);
      }

      // 显示详细分析结果
      if (analysisResult.analyses && analysisResult.analyses.length > 0) {
        console.log(`\n${cliTools.colors.cyan('📋 详细分析结果:')}`);
        analysisResult.analyses.forEach((analysis, index: number) => {
          console.log(`\n${cliTools.colors.yellow(`SQL语句 ${index + 1}:`)}`);
          console.log(`查询: ${cliTools.colors.gray(analysis.sql?.substring(0, 100) + (analysis.sql?.length > 100 ? '...' : '') || 'N/A')}`);

          if (analysis.performance) {
            console.log(`${cliTools.colors.blue('性能分析:')}`);
            console.log(`  复杂度: ${cliTools.colors.yellow(analysis.performance.complexity || 'N/A')}`);
            console.log(`  执行时间: ${cliTools.colors.yellow(analysis.performance.estimatedTime + 'ms' || 'N/A')}`);
          }

          if (analysis.security) {
            console.log(`${cliTools.colors.red('安全分析:')}`);
            analysis.security.vulnerabilities?.forEach((vuln: any) => {
              console.log(`  ❌ ${cliTools.colors.red(vuln.type)}: ${cliTools.colors.gray(vuln.description)}`);
            });
          }

          if (analysis.standards) {
            console.log(`${cliTools.colors.green('规范检查:')}`);
            analysis.standards.issues?.forEach((issue: any) => {
              console.log(`  ⚠️ ${cliTools.colors.yellow(issue.type)}: ${cliTools.colors.gray(issue.description)}`);
            });
          }

          if (analysis.learning) {
            console.log(`${cliTools.colors.magenta('规则学习:')}`);
            analysis.learning.suggestions?.forEach((suggestion: any) => {
              console.log(`  💡 ${cliTools.colors.cyan(suggestion.type)}: ${cliTools.colors.gray(suggestion.description)}`);
            });
            if (analysis.learning.newRules && analysis.learning.newRules.length > 0) {
              console.log(`  🆕 新生成规则: ${cliTools.colors.green(analysis.learning.newRules.length + '个')}`);
              analysis.learning.newRules.forEach((rule: any) => {
                console.log(`     - ${cliTools.colors.cyan(rule.name)} (${cliTools.colors.gray(rule.confidence + ' 置信度')})`);
              });
            }
          }
        });
      } else {
        console.log(cliTools.colors.red('\n⚠️ 没有详细分析结果数据'));
      }

      // 显示规则学习状态
      if (analysisResult.learning) {
        console.log(`\n${cliTools.colors.magenta('🧠 规则学习状态:')}`);
        console.log(`已处理模式: ${analysisResult.learning.patternsProcessed || 0}`);
        console.log(`新规则生成: ${analysisResult.learning.newRulesGenerated || 0}`);
        console.log(`学习建议: ${analysisResult.learning.suggestions?.length || 0}`);
      } else {
        console.log(`\n${cliTools.colors.yellow('⚠️ 规则学习未启用')}`);
      }

      await this.askQuestion('\n按回车键继续...');

    } catch (error: any) {
      cliTools.log.error(`❌ 文件分析失败: ${error.message}`);
      await this.askQuestion('\n按回车键继续...');
    }
  }

  /**
   * 分析目录
   */
  private async analyzeDirectory(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n📂 分析目录下的SQL文件'));
    console.log(cliTools.colors.gray('─'.repeat(50)));

    const dirPath = await this.askQuestion('请输入目录路径: ');
    const recursive = await this.askQuestion('是否递归分析子目录? (y/N): ');

    if (!dirPath.trim()) {
      cliTools.log.error('❌ 目录路径不能为空');
      await this.askQuestion('按回车键继续...');
      return;
    }

    const resolvedPath = resolve(dirPath.trim());

    if (!existsSync(resolvedPath)) {
      cliTools.log.error(`❌ 目录不存在: ${resolvedPath}`);
      await this.askQuestion('按回车键继续...');
      return;
    }

    try {
      cliTools.log.info(`🔄 正在分析目录: ${resolvedPath}`);
      if (recursive.toLowerCase().startsWith('y')) {
        cliTools.log.info('📁 递归分析子目录');
      }

      const startTime = Date.now();

      // 调用目录分析服务
      const analysisOptions = {
        recursive: recursive.toLowerCase().startsWith('y'),
        enablePerformance: true,
        enableSecurity: true,
        enableStandards: true,
        verbose: false,
        batchSize: 10
      };

      const analysisResult = await this.fileAnalyzer.analyzeDirectory(resolvedPath, analysisOptions);
      const duration = Date.now() - startTime;

      console.log(cliTools.colors.green(`\n✅ 目录分析完成，耗时: ${duration}ms`));

      // 保存分析结果到历史记录
      try {
        await this.saveDirectoryAnalysisToHistory(resolvedPath, analysisResult, duration, recursive.toLowerCase().startsWith('y'));
        cliTools.log.success('✅ 分析结果已保存到历史记录');
      } catch (historyError: any) {
        cliTools.log.warn(`⚠️  历史记录保存失败: ${historyError.message}`);
      }

      // 触发规则学习 - 基于当前分析结果
      console.log(`\n${cliTools.colors.blue('🔄 正在进行规则学习...')}`);
      this.asyncTriggerRuleLearningFromDirectory(analysisResult, resolvedPath).catch(error => {
        console.log(`${cliTools.colors.yellow('⚠️ 规则学习出错:')} ${error.message}`);
      });

      // 显示分析结果
      if (analysisResult.summary) {
        console.log(`\n${cliTools.colors.cyan('📊 目录分析概览:')}`);
        console.log(`目录路径: ${cliTools.colors.blue(resolvedPath)}`);
        console.log(`扫描文件数: ${cliTools.colors.yellow(analysisResult.summary.totalFiles?.toString() || '0')}`);
        console.log(`SQL文件数: ${cliTools.colors.yellow(analysisResult.summary.sqlFiles?.toString() || '0')}`);
        console.log(`总SQL语句数: ${cliTools.colors.yellow(analysisResult.summary.totalStatements?.toString() || '0')}`);
        console.log(`成功分析: ${cliTools.colors.green(analysisResult.summary.successful?.toString() || '0')}`);
        console.log(`失败数量: ${cliTools.colors.red(analysisResult.summary.failed?.toString() || '0')}`);

        if (analysisResult.summary.overallScore !== undefined) {
          console.log(`总体评分: ${this.getScoreColor(analysisResult.summary.overallScore)}(analysisResult.summary.overallScore)分`);
        }

        if (analysisResult.summary.duration) {
          console.log(`平均耗时: ${cliTools.colors.blue((analysisResult.summary.duration / 1000).toFixed(2))}秒`);
        }
      }

      await this.askQuestion('\n按回车键继续...');

    } catch (error: any) {
      cliTools.log.error(`❌ 目录分析失败: ${error.message}`);
      await this.askQuestion('\n按回车键继续...');
    }
  }

  /**
   * 批量分析
   */
  private async batchAnalysis(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n🔄 批量SQL分析'));
    console.log(cliTools.colors.gray('─'.repeat(50)));

    cliTools.log.info('批量分析功能开发中...');
    await this.askQuestion('\n按回车键继续...');
  }

  /**
   * 显示系统状态菜单
   */
  private async showSystemMenu(): Promise<void> {
    while (true) {
      this.clearScreen();
      this.showHeader();

      console.log(cliTools.colors.cyan('\n🏥 系统状态'));
      console.log(cliTools.colors.gray('═'.repeat(50)));

      const options = [
        { id: '1', name: '健康检查', description: '检查系统健康状态' },
        { id: '2', name: '统计信息', description: '查看分析器统计信息' },
        { id: '3', name: '系统信息', description: '查看详细系统信息' },
        { id: '4', name: '性能监控', description: '查看系统性能指标' },
        { id: '0', name: '返回主菜单', description: '返回主菜单' }
      ];

      options.forEach(option => {
        console.log(`  ${cliTools.colors.yellow(option.id.padEnd(2))} ${option.name} ${cliTools.colors.gray(`- ${option.description}`)}`);
      });

      const choice = await this.askQuestion('\n请选择操作: ');

      switch (choice.trim()) {
        case '1':
          await this.showHealthCheck();
          break;
        case '2':
          await this.showStatistics();
          break;
        case '3':
          await this.showSystemInfo();
          break;
        case '4':
          await this.showPerformanceMetrics();
          break;
        case '0':
          return;
        default:
          cliTools.log.error('❌ 无效选择');
          await this.askQuestion('按回车键继续...');
      }
    }
  }

  /**
   * 显示健康检查
   */
  private async showHealthCheck(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n🔍 系统健康检查'));
    console.log(cliTools.colors.gray('─'.repeat(50)));

    try {
      cliTools.log.info('🔄 正在进行健康检查...');
      const healthReport = await this.healthService.performAllChecks();

      const reportAny = healthReport as any;
      const statusColor = reportAny.healthy ? cliTools.colors.green : cliTools.colors.red;
      const statusText = reportAny.healthy ? '健康' : '不健康';

      console.log(`\n总体状态: ${statusColor(statusText)}`);
      console.log(`检查时间: ${cliTools.colors.blue(new Date().toLocaleString())}`);

      if (reportAny.score !== undefined) {
        let scoreColor = cliTools.colors.green;
        if (reportAny.score < 60) scoreColor = cliTools.colors.red;
        else if (reportAny.score < 80) scoreColor = cliTools.colors.yellow;
        console.log(`健康评分: ${scoreColor(reportAny.score + '分')}`);
      }

      // 显示详细检查结果
      if (reportAny.checks && reportAny.checks.length > 0) {
        console.log(cliTools.colors.cyan('\n📋 详细检查结果:'));
        reportAny.checks.forEach((check: any, index: number) => {
          const statusColor = check.status === 'pass' ? cliTools.colors.green :
                            check.status === 'warning' ? cliTools.colors.yellow :
                            cliTools.colors.red;
          const statusIcon = check.status === 'pass' ? '✅' :
                            check.status === 'warning' ? '⚠️' : '❌';

          console.log(`\n${cliTools.colors.yellow(`${index + 1}. ${check.name}`)}`);
          console.log(`  状态: ${statusColor(`${statusIcon} ${check.status.toUpperCase()}`)}`);
          console.log(`  描述: ${cliTools.colors.gray(check.description)}`);

          if (check.status !== 'pass') {
            console.log(`  问题: ${cliTools.colors.red(check.error || '检查失败')}`);
          }
        });
      }

    } catch (error: any) {
      cliTools.log.error(`❌ 健康检查失败: ${error.message}`);
    }

    await this.askQuestion('\n按回车键继续...');
  }

  /**
   * 显示统计信息
   */
  private async showStatistics(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n📊 分析器统计信息'));
    console.log(cliTools.colors.gray('─'.repeat(50)));

    try {
      // 获取分析器统计信息
      const analyzerStats = this.analyzer.getStatistics();
      const fileAnalyzerStats = this.fileAnalyzer.getStatistics();

      console.log(`\n${cliTools.colors.yellow('📈 SQL分析器统计:')}`);

      if (analyzerStats) {
        console.log(`总分析次数: ${cliTools.colors.yellow(analyzerStats.totalAnalyses?.toString() || '0')}`);
        console.log(`成功分析: ${cliTools.colors.green(analyzerStats.successfulAnalyses?.toString() || '0')}`);
        console.log(`失败次数: ${cliTools.colors.red(analyzerStats.failedAnalyses?.toString() || '0')}`);
        console.log(`平均耗时: ${cliTools.colors.blue(((analyzerStats.averageDuration || 0) / 1000).toFixed(2))}秒`);

        if (analyzerStats.totalAnalyses > 0) {
          const successRate = ((analyzerStats.successfulAnalyses || 0) / analyzerStats.totalAnalyses * 100).toFixed(1);
          console.log(`成功率: ${cliTools.colors.green(successRate + '%')}`);
        }

        if (analyzerStats.cacheStats) {
          const hitRate = ((analyzerStats.cacheStats.hits || 0) / (analyzerStats.cacheStats.total || 1) * 100).toFixed(1);
          console.log(`缓存命中率: ${cliTools.colors.blue(hitRate + '%')}`);
          console.log(`缓存大小: ${cliTools.colors.cyan(analyzerStats.cacheStats.size?.toString() || '0')}`);
        }
      } else {
        console.log(cliTools.colors.yellow('分析器统计信息暂不可用'));
      }

      console.log(`\n${cliTools.colors.yellow('📁 文件分析器统计:')}`);

      if (fileAnalyzerStats) {
        console.log(`处理文件数: ${cliTools.colors.yellow(fileAnalyzerStats.totalFiles?.toString() || '0')}`);
        console.log(`处理SQL语句: ${cliTools.colors.yellow(fileAnalyzerStats.totalStatements?.toString() || '0')}`);
        console.log(`总耗时: ${cliTools.colors.blue(((fileAnalyzerStats.totalDuration || 0) / 1000).toFixed(2))}秒`);

        if (fileAnalyzerStats.successful && fileAnalyzerStats.totalFiles > 0) {
          const fileSuccessRate = (fileAnalyzerStats.successful / fileAnalyzerStats.totalFiles * 100).toFixed(1);
          console.log(`文件成功率: ${cliTools.colors.green(fileSuccessRate + '%')}`);
        }
      } else {
        console.log(cliTools.colors.yellow('文件分析器统计信息暂不可用'));
      }

    } catch (error: any) {
      cliTools.log.error(`❌ 获取统计信息失败: ${error.message}`);
    }

    await this.askQuestion('\n按回车键继续...');
  }

  /**
   * 显示系统信息
   */
  private async showSystemInfo(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n💻 系统信息'));
    console.log(cliTools.colors.gray('─'.repeat(50)));

    try {
      const os = await import('os');

      console.log(`\n${cliTools.colors.yellow('系统信息:')}`);
      console.log(`  平台: ${cliTools.colors.cyan(os.type())}`);
      console.log(`  架构: ${cliTools.colors.cyan(os.arch())}`);
      console.log(`  版本: ${cliTools.colors.cyan(os.release())}`);
      console.log(`  主机名: ${cliTools.colors.cyan(os.hostname())}`);

      console.log(`\n${cliTools.colors.yellow('内存信息:')}`);
      const totalMem = Math.round(os.totalmem() / 1024 / 1024 / 1024);
      const freeMem = Math.round(os.freemem() / 1024 / 1024 / 1024);
      const usedMem = totalMem - freeMem;
      console.log(`  总内存: ${cliTools.colors.cyan(totalMem + ' GB')}`);
      console.log(`  已用内存: ${cliTools.colors.yellow(usedMem + ' GB')}`);
      console.log(`  可用内存: ${cliTools.colors.green(freeMem + ' GB')}`);

      console.log(`\n${cliTools.colors.yellow('CPU信息:')}`);
      console.log(`  CPU型号: ${cliTools.colors.cyan(os.cpus()[0].model)}`);
      console.log(`  CPU核心: ${cliTools.colors.cyan(os.cpus().length.toString())}`);

    } catch (error: any) {
      cliTools.log.error(`❌ 获取系统信息失败: ${error.message}`);
    }

    await this.askQuestion('\n按回车键继续...');
  }

  /**
   * 显示性能指标
   */
  private async showPerformanceMetrics(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n📈 性能监控'));
    console.log(cliTools.colors.gray('─'.repeat(50)));

    cliTools.log.info('性能监控功能开发中...');
    await this.askQuestion('\n按回车键继续...');
  }

  /**
   * 显示历史记录菜单
   */
  private async showHistoryMenu(): Promise<void> {
    while (true) {
      this.clearScreen();
      this.showHeader();

      console.log(cliTools.colors.cyan('\n📚 历史记录管理'));
      console.log(cliTools.colors.gray('═'.repeat(50)));

      const options = [
        { id: '1', name: '查看历史记录', description: '查看所有SQL分析历史记录' },
        { id: '2', name: '搜索历史记录', description: '按条件搜索历史记录' },
        { id: '3', name: '查看统计信息', description: '查看历史记录统计信息' },
        { id: '4', name: '清空历史记录', description: '删除所有历史记录' },
        { id: '0', name: '返回主菜单', description: '返回主菜单' }
      ];

      options.forEach(option => {
        console.log(`  ${cliTools.colors.yellow(option.id.padEnd(2))} ${option.name} ${cliTools.colors.gray(`- ${option.description}`)}`);
      });

      console.log(cliTools.colors.gray('═'.repeat(50)));

      const choice = await this.askQuestion('\n请选择操作 (输入数字): ');

      switch (choice.trim()) {
        case '1':
          await this.viewHistoryRecords();
          break;
        case '2':
          await this.searchHistoryRecords();
          break;
        case '3':
          await this.viewHistoryStatistics();
          break;
        case '4':
          await this.clearHistoryRecords();
          break;
        case '0':
          return;
        default:
          cliTools.log.error('❌ 无效选择，请输入正确的数字');
          await this.askQuestion('按回车键继续...');
      }
    }
  }

  /**
   * 查看历史记录（增强版）
   */
  private async viewHistoryRecords(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n📜 查看历史记录'));
    console.log(cliTools.colors.gray('─'.repeat(50)));

    try {
      cliTools.log.info('🔄 正在加载历史记录...');

      // 获取历史记录
      const historyService = await this.getHistoryService();
      const records = await historyService.getAllHistory({ limit: 20 });

      if (records.length === 0) {
        console.log(cliTools.colors.yellow('\n📭 暂无历史记录'));
        console.log(cliTools.colors.gray('\n💡 提示: 开始分析SQL语句后，这里将显示分析历史'));
      } else {
        console.log(`\n${cliTools.colors.green(`📋 最近的 ${records.length} 条历史记录:`)}`);
        console.log(cliTools.colors.gray('═'.repeat(80)));

        // 统计信息
        const dbTypeStats: Record<string, number> = {};
        const analysisTypeStats: Record<string, number> = {};

        records.forEach((record: any) => {
          const dbType = record.databaseType || DatabaseType.UNKNOWN;
          const analysisType = record.type || 'unknown';
          dbTypeStats[dbType] = (dbTypeStats[dbType] || 0) + 1;
          analysisTypeStats[analysisType] = (analysisTypeStats[analysisType] || 0) + 1;
        });

        records.forEach((record: any, index: number) => {
          // 使用友好的类型标签显示
          const dbTypeLabel = getDatabaseTypeLabel(record.databaseType);
          const analysisTypeLabel = getAnalysisTypeLabel(record.type);

          // 时间格式化
          const date = new Date(record.timestamp);
          const timeStr = date.toLocaleString('zh-CN');

          console.log(`${cliTools.colors.blue(`[${index + 1}]`)} ${cliTools.colors.gray(timeStr)}`);
          console.log(`  ID: ${cliTools.colors.cyan(record.id)}`);
          console.log(`  数据库类型: ${cliTools.colors.yellow(dbTypeLabel)}`);
          console.log(`  分析类型: ${cliTools.colors.green(analysisTypeLabel)}`);

          // 显示输入方式（如果有）
          if (record.metadata?.inputMethod) {
            const inputMethodMap: Record<string, string> = {
              'direct_input': '直接输入',
              'file_analysis': '文件分析',
              'directory_analysis': '目录分析'
            };
            const inputMethodLabel = inputMethodMap[record.metadata.inputMethod] || record.metadata.inputMethod;
            console.log(`  输入方式: ${cliTools.colors.blue(inputMethodLabel)}`);
          }

          // 显示SQL预览
          const sqlPreview = record.sqlPreview || record.sql || '';
          if (sqlPreview) {
            const preview = sqlPreview.length > 80 ? sqlPreview.substring(0, 80) + '...' : sqlPreview;
            console.log(`  SQL预览: ${cliTools.colors.gray(preview)}`);
          }

          // 显示处理时间（如果有）
          if (record.metadata?.processingTime) {
            const processingTime = record.metadata.processingTime;
            console.log(`  处理时间: ${cliTools.colors.magenta(`${processingTime}ms`)}`);
          }

          console.log(cliTools.colors.gray('─'.repeat(80)));
        });

        // 显示统计摘要
        console.log(`\n${cliTools.colors.blue('📊 统计摘要:')}`);

        // 数据库类型统计
        console.log(`${cliTools.colors.yellow('数据库类型:')}`);
        Object.entries(dbTypeStats).forEach(([dbType, count]) => {
          const label = getDatabaseTypeLabel(dbType);
          const percentage = ((count / records.length) * 100).toFixed(1);
          console.log(`  ${label}: ${count} 次 (${percentage}%)`);
        });

        // 分析类型统计
        console.log(`\n${cliTools.colors.yellow('分析类型:')}`);
        Object.entries(analysisTypeStats).forEach(([analysisType, count]) => {
          const label = getAnalysisTypeLabel(analysisType);
          const percentage = ((count / records.length) * 100).toFixed(1);
          console.log(`  ${label}: ${count} 次 (${percentage}%)`);
        });

        console.log(`\n${cliTools.colors.gray(`总计: ${records.length} 条记录`)}`);
      }

      await this.askQuestion('\n按回车键继续...');

    } catch (error: any) {
      cliTools.log.error(`❌ 查看历史记录失败: ${error.message}`);
      await this.askQuestion('\n按回车键继续...');
    }
  }

  /**
   * 搜索历史记录（增强版）
   */
  private async searchHistoryRecords(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n🔍 搜索历史记录'));
    console.log(cliTools.colors.gray('─'.repeat(50)));

    try {
      // 显示搜索提示
      console.log(cliTools.colors.yellow('\n💡 搜索提示:'));
      console.log('  • SQL内容: 在SQL语句中搜索关键词');
      console.log('  • 数据库类型: mysql, postgresql, sqlserver, sqlite, oracle等');
      console.log('  • 分析类型: sql语句, 文件分析, 目录分析, 批量分析');
      console.log('  • 支持同义词: 如"postgres"可以匹配"postgresql"');
      console.log('');

      const searchTerm = await this.askQuestion('📝 SQL内容关键词 (留空不限制): ');
      const dbType = await this.askQuestion('🗄️  数据库类型 (留空不限制): ');
      const sqlType = await this.askQuestion('📋 分析类型 (留空不限制): ');

      // 构建搜索条件
      const searchOptions: any = {
        limit: 20
      };

      if (searchTerm.trim()) {
        searchOptions.sql = searchTerm.trim();
      }

      if (dbType.trim()) {
        searchOptions.databaseType = dbType.trim();
      }

      if (sqlType.trim()) {
        searchOptions.type = sqlType.trim();
      }

      console.log('');
      cliTools.log.info('🔄 正在搜索历史记录...');

      const historyService = await this.getHistoryService();
      const records = await historyService.searchHistory(searchOptions.sql || '', searchOptions);

      if (records.length === 0) {
        console.log(cliTools.colors.yellow('\n📭 未找到匹配的历史记录'));
        console.log(cliTools.colors.gray('\n💡 建议:'));
        console.log('  • 尝试使用更简单的关键词');
        console.log('  • 检查拼写是否正确');
        console.log('  • 尝试使用数据库类型的别称 (如: pg, postgres)');
        console.log('  • 减少搜索条件，只使用一个条件进行搜索');
      } else {
        console.log(`\n${cliTools.colors.green(`📋 找到 ${records.length} 条匹配记录:`)}`);
        console.log(cliTools.colors.gray('═'.repeat(80)));

        records.forEach((record: any, index: number) => {
          // 使用友好的类型标签显示
          const dbTypeLabel = getDatabaseTypeLabel(record.databaseType);
          const analysisTypeLabel = getAnalysisTypeLabel(record.type);

          console.log(`${cliTools.colors.blue(`[${index + 1}]`)} ${cliTools.colors.gray(record.timestamp)}`);
          console.log(`  ID: ${cliTools.colors.cyan(record.id)}`);
          console.log(`  数据库类型: ${cliTools.colors.yellow(dbTypeLabel)}`);
          console.log(`  分析类型: ${cliTools.colors.green(analysisTypeLabel)}`);

          // 显示输入方式（如果有）
          if (record.metadata?.inputMethod) {
            const inputMethodMap: Record<string, string> = {
              'direct_input': '直接输入',
              'file_analysis': '文件分析',
              'directory_analysis': '目录分析'
            };
            const inputMethodLabel = inputMethodMap[record.metadata.inputMethod] || record.metadata.inputMethod;
            console.log(`  输入方式: ${cliTools.colors.blue(inputMethodLabel)}`);
          }

          // 显示SQL预览
          const sqlPreview = record.sqlPreview || record.sql || '';
          if (sqlPreview) {
            const preview = sqlPreview.length > 100 ? sqlPreview.substring(0, 100) + '...' : sqlPreview;
            console.log(`  SQL预览: ${cliTools.colors.gray(preview)}`);
          }

          console.log(cliTools.colors.gray('─'.repeat(80)));
        });

        // 显示搜索统计
        console.log(`\n${cliTools.colors.blue('📊 搜索统计:')}`);
        console.log(`  匹配记录: ${records.length} 条`);
        console.log(`  搜索条件: SQL="${searchTerm || '无'}" 数据库="${dbType || '无'}" 类型="${sqlType || '无'}"`);
      }

      await this.askQuestion('\n按回车键继续...');

    } catch (error: any) {
      cliTools.log.error(`❌ 搜索历史记录失败: ${error.message}`);
      await this.askQuestion('\n按回车键继续...');
    }
  }

  /**
   * 查看历史统计信息（增强版）
   */
  private async viewHistoryStatistics(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n📊 历史记录统计'));
    console.log(cliTools.colors.gray('─'.repeat(50)));

    try {
      cliTools.log.info('🔄 正在统计历史记录...');

      const historyService = await this.getHistoryService();
      const statistics = await historyService.getHistoryStats();

      console.log(`\n${cliTools.colors.green('📈 历史记录统计信息:')}`);
      console.log(`总分析次数: ${cliTools.colors.yellow(statistics.total?.toString() || '0')}`);

      // 按分析类型统计（使用友好标签）
      if (statistics.byType) {
        console.log(`\n${cliTools.colors.cyan('📋 按分析类型统计:')}`);
        const totalByType = Object.values(statistics.byType).reduce((sum: number, count: any) => sum + count, 0);

        Object.entries(statistics.byType)
          .sort(([_, a], [__, b]) => Number(b) - Number(a)) // 按数量降序排列
          .forEach(([type, count]: [string, any]) => {
            const typeLabel = getAnalysisTypeLabel(type);
            const countNum = Number(count);
            const percentage = totalByType > 0 ? ((countNum / totalByType) * 100).toFixed(1) : '0.0';
            console.log(`  ${typeLabel}: ${cliTools.colors.yellow(count.toString())} 次 (${cliTools.colors.gray(percentage + '%')})`);
          });
      }

      // 按数据库类型统计（使用友好标签）
      if (statistics.byDatabase) {
        console.log(`\n${cliTools.colors.cyan('🗄️  按数据库类型统计:')}`);
        const totalByDb = Object.values(statistics.byDatabase).reduce((sum: number, count: any) => sum + count, 0);

        Object.entries(statistics.byDatabase)
          .sort(([_, a], [__, b]) => Number(b) - Number(a)) // 按数量降序排列
          .forEach(([db, count]: [string, any]) => {
            const dbLabel = getDatabaseTypeLabel(db);
            const countNum = Number(count);
            const percentage = totalByDb > 0 ? ((countNum / totalByDb) * 100).toFixed(1) : '0.0';
            console.log(`  ${dbLabel}: ${cliTools.colors.yellow(count.toString())} 次 (${cliTools.colors.gray(percentage + '%')})`);
          });
      }

      // 按月份统计（格式化月份显示）
      if (statistics.byMonth) {
        console.log(`\n${cliTools.colors.cyan('📅 按月份统计:')}`);
        const sortedMonths = Object.keys(statistics.byMonth).sort((a, b) => b.localeCompare(a)); // 降序排列

        sortedMonths.forEach(month => {
          const count = statistics.byMonth[month];
          // 格式化月份显示 (如: 2025-01 -> 2025年1月)
          const [year, monthNum] = month.split('-');
          const monthStr = `${year}年${parseInt(monthNum)}月`;
          console.log(`  ${monthStr}: ${cliTools.colors.yellow(count.toString())} 次`);
        });
      }

      // 显示使用趋势
      if (statistics.byMonth && Object.keys(statistics.byMonth).length > 1) {
        console.log(`\n${cliTools.colors.blue('📈 使用趋势:')}`);
        const months = Object.keys(statistics.byMonth).sort();
        if (months.length >= 2) {
          const latestMonth = months[months.length - 1];
          const previousMonth = months[months.length - 2];
          const latestCount = statistics.byMonth[latestMonth];
          const previousCount = statistics.byMonth[previousMonth];

          const trend = latestCount > previousCount ? '📈 上升' :
                       latestCount < previousCount ? '📉 下降' : '➡️ 持平';
          const change = latestCount - previousCount;
          const changePercent = previousCount > 0 ? ((Math.abs(change) / previousCount) * 100).toFixed(1) : '0.0';

          console.log(`  相比上月: ${trend} ${Math.abs(change)} 次 (${changePercent}%)`);
        }
      }

      await this.askQuestion('\n按回车键继续...');

    } catch (error: any) {
      cliTools.log.error(`❌ 获取统计信息失败: ${error.message}`);
      await this.askQuestion('\n按回车键继续...');
    }
  }

  /**
   * 清空历史记录
   */
  private async clearHistoryRecords(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n🗑️  清空历史记录'));
    console.log(cliTools.colors.gray('─'.repeat(50)));

    try {
      console.log(cliTools.colors.red('⚠️  此操作将删除所有历史记录且无法恢复！'));

      const confirm = await this.askQuestion('确定要清空所有历史记录吗？(输入 YES 确认): ');

      if (confirm === 'YES') {
        cliTools.log.info('🔄 正在清空历史记录...');

        const historyService = await this.getHistoryService();
        await historyService.clearHistory();

        console.log(cliTools.colors.green('\n✅ 历史记录已清空'));
      } else {
        console.log(cliTools.colors.yellow('\n❌ 操作已取消'));
      }

      await this.askQuestion('\n按回车键继续...');

    } catch (error: any) {
      cliTools.log.error(`❌ 清空历史记录失败: ${error.message}`);
      await this.askQuestion('\n按回车键继续...');
    }
  }

  /**
   * 显示知识库菜单
   */
  private async showKnowledgeMenu(): Promise<void> {
    while (true) {
      this.clearScreen();
      this.showHeader();

      console.log(cliTools.colors.cyan('\n🧠 知识库管理'));
      console.log(cliTools.colors.gray('═'.repeat(50)));

      const options = [
        { id: '1', name: '知识库状态', description: '查看知识库初始化状态和文档信息' },
        { id: '2', name: '加载文档', description: '从rules目录加载SQL规则文档到知识库' },
        { id: '3', name: '搜索知识库', description: '在知识库中搜索相关内容' },
        { id: '4', name: '规则审批', description: '使用评估引擎智能审批generated中的待审核规则' },
        { id: '5', name: '重置知识库', description: '清空并重新初始化知识库' },
        { id: '0', name: '返回主菜单', description: '返回主菜单' }
      ];

      options.forEach(option => {
        console.log(`  ${cliTools.colors.yellow(option.id.padEnd(2))} ${option.name} ${cliTools.colors.gray(`- ${option.description}`)}`);
      });

      console.log(cliTools.colors.gray('═'.repeat(50)));

      const choice = await this.askQuestion('\n请选择操作 (输入数字): ');

      switch (choice.trim()) {
        case '1':
          await this.showKnowledgeStatus();
          break;
        case '2':
          await this.loadKnowledgeDocuments();
          break;
        case '3':
          await this.searchKnowledgeBase();
          break;
        case '4':
          await this.approveRules();
          break;
        case '5':
          await this.resetKnowledgeBase();
          break;
        case '0':
          return;
        default:
          cliTools.log.error('❌ 无效选择，请输入正确的数字');
          await this.askQuestion('按回车键继续...');
      }
    }
  }

  /**
   * 显示知识库状态
   */
  private async showKnowledgeStatus(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n📊 知识库状态'));
    console.log(cliTools.colors.gray('─'.repeat(50)));

    try {
      cliTools.log.info('🔄 正在获取知识库状态...');

      const status = await this.knowledgeService.getKnowledgeStatus();

      console.log(`\n${cliTools.colors.green('🔍 知识库状态信息:')}`);
      console.log(`启用状态: ${status.enabled ? cliTools.colors.green('✅ 已启用') : cliTools.colors.red('❌ 未启用')}`);
      console.log(`初始化状态: ${status.initialized ? cliTools.colors.green('✅ 已初始化') : cliTools.colors.yellow('⚠️ 未初始化')}`);
      console.log(`规则文档数量: ${cliTools.colors.yellow(status.rulesCount?.toString() || '0')}`);

      if (status.error) {
        console.log(`${cliTools.colors.red('错误信息:')} ${cliTools.colors.red(status.error)}`);
      }

      // 获取更详细的文档信息
      if (status.initialized) {
        try {
          const docInfo = await this.knowledgeService.getDocumentInfo();
          if (docInfo && docInfo.documents) {
            console.log(`\n${cliTools.colors.cyan('📚 文档详情:')}`);
            console.log(`总文档数: ${cliTools.colors.yellow(docInfo.documents.length.toString())}`);

            // 按类型统计文档
            const typeStats: Record<string, number> = {};
            docInfo.documents.forEach((doc: any) => {
              // 优先使用文档的type字段，其次使用metadata中的ruleType，最后使用source路径推断
              let type = doc.type;
              if (!type && doc.metadata) {
                type = doc.metadata.ruleType || doc.metadata.type;
              }
              if (!type && doc.metadata && doc.metadata.source) {
                // 根据文件路径推断类型
                const sourcePath = doc.metadata.source;
                if (sourcePath.includes('performance') || sourcePath.includes('性能')) {
                  type = 'performance';
                } else if (sourcePath.includes('security') || sourcePath.includes('安全')) {
                  type = 'security';
                } else if (sourcePath.includes('standards') || sourcePath.includes('规范')) {
                  type = 'standards';
                }
              }
              type = type || 'unknown';
              typeStats[type] = (typeStats[type] || 0) + 1;
            });

            Object.entries(typeStats).forEach(([type, count]) => {
              console.log(`  ${type}: ${cliTools.colors.yellow(count.toString())}`);
            });
          }
        } catch (error) {
          console.log(cliTools.colors.yellow('\n⚠️ 无法获取详细文档信息'));
        }
      }

      await this.askQuestion('\n按回车键继续...');

    } catch (error: any) {
      cliTools.log.error(`❌ 获取知识库状态失败: ${error.message}`);
      await this.askQuestion('\n按回车键继续...');
    }
  }

  /**
   * 加载知识库文档
   */
  private async loadKnowledgeDocuments(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n📚 加载知识库文档'));
    console.log(cliTools.colors.gray('─'.repeat(50)));

    try {
      console.log(cliTools.colors.yellow('📝 此操作将从rules目录加载SQL规则文档到知识库'));

      const rulesDir = await this.askQuestion('规则目录路径 (默认: ./rules): ') || './rules';
      const priorityOnly = await this.askQuestion('仅加载优先级文档? (y/N): ');
      const resetFirst = await this.askQuestion('是否先重置知识库? (y/N): ');

      const options: any = {
        rulesDir: rulesDir.trim(),
        reset: resetFirst.toLowerCase().startsWith('y')
      };

      if (priorityOnly.toLowerCase().startsWith('y')) {
        options.priorityApproved = true;
      }

      cliTools.log.info(`🔄 正在从 ${rulesDir} 加载文档...`);

      const result = await this.knowledgeService.learnDocuments(options);

      if (result.success) {
        console.log(`\n${cliTools.colors.green('✅ 文档加载完成!')}`);
        console.log(`加载文档数: ${cliTools.colors.yellow(result.documentsCount?.toString() || '0')}`);
        console.log(`处理耗时: ${cliTools.colors.blue((result.duration / 1000).toFixed(2))}秒`);

        if (result.message) {
          console.log(`详细信息: ${cliTools.colors.gray(result.message)}`);
        }
      } else {
        console.log(`\n${cliTools.colors.red('❌ 文档加载失败:')}`);
        console.log(`错误信息: ${cliTools.colors.red(result.error || 'Unknown error')}`);
      }

      await this.askQuestion('\n按回车键继续...');

    } catch (error: any) {
      cliTools.log.error(`❌ 加载文档失败: ${error.message}`);
      await this.askQuestion('\n按回车键继续...');
    }
  }

  /**
   * 搜索知识库
   */
  private async searchKnowledgeBase(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n🔍 搜索知识库'));
    console.log(cliTools.colors.gray('─'.repeat(50)));

    try {
      const query = await this.askQuestion('请输入搜索关键词: ');

      if (!query.trim()) {
        console.log(cliTools.colors.yellow('\n⚠️ 搜索关键词不能为空'));
        await this.askQuestion('\n按回车键继续...');
        return;
      }

      const resultCount = await this.askQuestion('返回结果数量 (默认: 4): ') || '4';

      cliTools.log.info(`🔄 正在搜索: ${query}`);

      const result = await this.knowledgeService.searchKnowledge(query.trim(), parseInt(resultCount));

      if (result.success && result.documents && result.documents.length > 0) {
        console.log(`\n${cliTools.colors.green(`📋 找到 ${result.documents.length} 个相关结果:`)}`);
        console.log(cliTools.colors.gray('─'.repeat(80)));

        result.documents.forEach((doc: any, index: number) => {
          console.log(`${cliTools.colors.blue(`[${index + 1}]`)} ${doc.metadata?.source || 'Unknown'}`);
          if (doc.metadata?.type) {
            console.log(`  类型: ${cliTools.colors.cyan(doc.metadata.type)}`);
          }
          if (doc.pageContent) {
            console.log(`  内容: ${cliTools.colors.gray(doc.pageContent.substring(0, 200))}...`);
          }
          console.log(cliTools.colors.gray('─'.repeat(80)));
        });
      } else {
        console.log(cliTools.colors.yellow('\n📭 未找到相关内容'));
        if (result.error) {
          console.log(`原因: ${cliTools.colors.gray(result.error)}`);
        }
      }

      await this.askQuestion('\n按回车键继续...');

    } catch (error: any) {
      cliTools.log.error(`❌ 搜索知识库失败: ${error.message}`);
      await this.askQuestion('\n按回车键继续...');
    }
  }

  /**
   * 重置知识库
   */
  private async resetKnowledgeBase(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n🗑️  重置知识库'));
    console.log(cliTools.colors.gray('─'.repeat(50)));

    try {
      console.log(cliTools.colors.red('⚠️  此操作将清空知识库中的所有数据！'));

      const confirm = await this.askQuestion('确定要重置知识库吗？(输入 YES 确认): ');

      if (confirm === 'YES') {
        cliTools.log.info('🔄 正在重置知识库...');

        const result = await this.knowledgeService.resetKnowledge();

        if (result.success) {
          console.log(cliTools.colors.green('\n✅ 知识库已重置'));
          if (result.message) {
            console.log(`详细信息: ${cliTools.colors.gray(result.message)}`);
          }
        } else {
          console.log(cliTools.colors.red('\n❌ 知识库重置失败'));
          console.log(`错误信息: ${cliTools.colors.red(result.error || 'Unknown error')}`);
        }
      } else {
        console.log(cliTools.colors.yellow('\n❌ 操作已取消'));
      }

      await this.askQuestion('\n按回车键继续...');

    } catch (error: any) {
      cliTools.log.error(`❌ 重置知识库失败: ${error.message}`);
      await this.askQuestion('\n按回车键继续...');
    }
  }

  
  /**
   * 显示配置菜单
   */
  private async showConfigMenu(): Promise<void> {
    while (true) {
      this.clearScreen();
      this.showHeader();

      console.log(cliTools.colors.cyan('\n⚙️ 配置管理'));
      console.log(cliTools.colors.gray('═'.repeat(50)));

      const options = [
        { id: '1', name: '查看当前配置', description: '显示所有系统配置信息' },
        { id: '2', name: '修改服务器配置', description: '修改API服务器相关配置' },
        { id: '3', name: '修改LLM配置', description: '修改语言模型服务配置' },
        { id: '4', name: '修改知识库配置', description: '修改知识库相关配置' },
        { id: '5', name: '修改规则学习配置', description: '修改规则学习相关配置' },
        { id: '0', name: '返回主菜单', description: '返回主菜单' }
      ];

      options.forEach(option => {
        console.log(`  ${cliTools.colors.yellow(option.id.padEnd(2))} ${option.name} ${cliTools.colors.gray(`- ${option.description}`)}`);
      });

      console.log(cliTools.colors.gray('═'.repeat(50)));

      const choice = await this.askQuestion('\n请选择操作 (输入数字): ');

      switch (choice.trim()) {
        case '1':
          await this.viewCurrentConfig();
          break;
        case '2':
          await this.modifyServerConfig();
          break;
        case '3':
          await this.modifyLLMConfig();
          break;
        case '4':
          await this.modifyKnowledgeConfig();
          break;
        case '5':
          await this.modifyRuleLearningConfig();
          break;
        case '0':
          return;
        default:
          cliTools.log.error('❌ 无效选择，请输入正确的数字');
          await this.askQuestion('按回车键继续...');
      }
    }
  }

  /**
   * 查看当前配置
   */
  private async viewCurrentConfig(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n📋 当前系统配置'));
    console.log(cliTools.colors.gray('─'.repeat(50)));

    try {
      // 服务器配置
      const serverConfig = config.getServerConfig();
      console.log(`\n${cliTools.colors.green('🌐 服务器配置:')}`);
      console.log(`  端口: ${cliTools.colors.yellow(serverConfig.port?.toString() || 'N/A')}`);
      console.log(`  主机: ${cliTools.colors.yellow(serverConfig.host || 'N/A')}`);
      console.log(`  CORS启用: ${serverConfig.cors?.enabled ? cliTools.colors.green('是') : cliTools.colors.red('否')}`);
      console.log(`  CORS来源: ${cliTools.colors.yellow(serverConfig.cors?.origin || 'N/A')}`);

      // LLM配置
      const llmConfig = config.getLlmConfig();
      console.log(`\n${cliTools.colors.green('🤖 LLM配置:')}`);
      console.log(`  基础URL: ${cliTools.colors.yellow(llmConfig.baseUrl || 'N/A')}`);
      console.log(`  API密钥: ${llmConfig.apiKey ? cliTools.colors.green('已设置') : cliTools.colors.red('未设置')}`);
      console.log(`  模型: ${cliTools.colors.yellow(llmConfig.model || 'N/A')}`);
      console.log(`  超时时间: ${cliTools.colors.yellow((llmConfig.timeout / 1000).toString() + 's') || 'N/A'}`);
      console.log(`  最大重试: ${cliTools.colors.yellow(llmConfig.maxRetries?.toString() || 'N/A')}`);

      // 知识库配置
      const knowledgeConfig = config.getKnowledgeConfig();
      console.log(`\n${cliTools.colors.green('🧠 知识库配置:')}`);
      console.log(`  启用状态: ${cliTools.colors.green('已启用 (默认)')}`);
      console.log(`  规则目录: ${cliTools.colors.yellow(knowledgeConfig.rulesDir || 'N/A')}`);
      
      // 规则学习配置
      const ruleLearningConfig = config.getRuleLearningConfig();
      console.log(`\n${cliTools.colors.green('📚 规则学习配置:')}`);
      console.log(`  启用状态: ${ruleLearningConfig.enabled ? cliTools.colors.green('是') : cliTools.colors.red('否')}`);
      console.log(`  最小置信度: ${cliTools.colors.yellow(ruleLearningConfig.minConfidence?.toString() || 'N/A')}`);
      console.log(`  批处理大小: ${cliTools.colors.yellow(ruleLearningConfig.batchSize?.toString() || 'N/A')}`);
      
      await this.askQuestion('\n按回车键继续...');

    } catch (error: any) {
      cliTools.log.error(`❌ 获取配置失败: ${error.message}`);
      await this.askQuestion('\n按回车键继续...');
    }
  }

  /**
   * 修改服务器配置
   */
  private async modifyServerConfig(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n🌐 修改服务器配置'));
    console.log(cliTools.colors.gray('─'.repeat(50)));

    try {
      const currentConfig = config.getServerConfig();

      console.log(`${cliTools.colors.yellow('当前配置:')}`);
      console.log(`端口: ${currentConfig.port}`);
      console.log(`主机: ${currentConfig.host}`);

      const port = await this.askQuestion(`新端口 (当前: ${currentConfig.port}): `);
      const host = await this.askQuestion(`新主机 (当前: ${currentConfig.host}): `);

      if (port.trim() && !isNaN(parseInt(port))) {
        updateEnvFile('API_PORT', port.trim());
        console.log(cliTools.colors.green('✅ 端口已更新'));
      }

      if (host.trim()) {
        updateEnvFile('API_HOST', host.trim());
        console.log(cliTools.colors.green('✅ 主机已更新'));
      }

      await this.askQuestion('\n按回车键继续...');

    } catch (error: any) {
      cliTools.log.error(`❌ 修改服务器配置失败: ${error.message}`);
      await this.askQuestion('\n按回车键继续...');
    }
  }

  /**
   * 修改LLM配置
   */
  private async modifyLLMConfig(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n🤖 修改LLM配置'));
    console.log(cliTools.colors.gray('─'.repeat(50)));

    try {
      const currentConfig = config.getLlmConfig();

      console.log(`${cliTools.colors.yellow('当前配置 (敏感信息已隐藏):')}`);
      console.log(`基础URL: ${currentConfig.baseUrl || 'N/A'}`);
      console.log(`API密钥: ${currentConfig.apiKey ? '***已设置***' : '未设置'}`);
      console.log(`模型: ${currentConfig.model}`);

      const baseUrl = await this.askQuestion(`新基础URL (当前: ${currentConfig.baseUrl || 'N/A'}): `);
      const apiKey = await this.askQuestion('新API密钥 (留空保持不变): ');
      const model = await this.askQuestion(`新模型 (当前: ${currentConfig.model}): `);
      const timeout = await this.askQuestion(`新超时时间毫秒 (当前: ${currentConfig.timeout}): `);
      const maxRetries = await this.askQuestion(`新最大重试次数 (当前: ${currentConfig.maxRetries || 'N/A'}): `);

      if (apiKey.trim()) {
        updateEnvFile('CUSTOM_API_KEY', apiKey.trim());
        console.log(cliTools.colors.green('✅ API密钥已更新'));
      }

      if (model.trim()) {
        updateEnvFile('CUSTOM_MODEL', model.trim());
        console.log(cliTools.colors.green('✅ 模型已更新'));
      }

      if (baseUrl.trim()) {
        updateEnvFile('CUSTOM_BASE_URL', baseUrl.trim());
        console.log(cliTools.colors.green('✅ 基础URL已更新'));
      }

      if (timeout.trim() && !isNaN(parseInt(timeout))) {
        updateEnvFile('LLM_TIMEOUT', timeout.trim());
        console.log(cliTools.colors.green('✅ 超时时间已更新'));
      }

      if (maxRetries.trim() && !isNaN(parseInt(maxRetries))) {
        updateEnvFile('LLM_MAX_RETRIES', maxRetries.trim());
        console.log(cliTools.colors.green('✅ 最大重试次数已更新'));
      }

      await this.askQuestion('\n按回车键继续...');

    } catch (error: any) {
      cliTools.log.error(`❌ 修改LLM配置失败: ${error.message}`);
      await this.askQuestion('\n按回车键继续...');
    }
  }

  /**
   * 修改知识库配置
   */
  private async modifyKnowledgeConfig(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n🧠 修改知识库配置'));
    console.log(cliTools.colors.gray('─'.repeat(50)));

    try {
      const currentConfig = config.getKnowledgeConfig();

      console.log(`${cliTools.colors.yellow('当前配置:')}`);
      console.log(`启用状态: ${cliTools.colors.green('已启用 (默认)')}`);
      console.log(`规则目录: ${currentConfig.rulesDir}`);

      const rulesDir = await this.askQuestion(`新规则目录 (当前: ${currentConfig.rulesDir}): `);

      // 强制启用知识库配置
      updateEnvFile('KNOWLEDGE_BASE_ENABLED', 'true');

      if (rulesDir.trim()) {
        updateEnvFile('KNOWLEDGE_RULES_DIR', rulesDir.trim());
        console.log(cliTools.colors.green('✅ 规则目录已更新'));
      }

      await this.askQuestion('\n按回车键继续...');

    } catch (error: any) {
      cliTools.log.error(`❌ 修改知识库配置失败: ${error.message}`);
      await this.askQuestion('\n按回车键继续...');
    }
  }

  /**
   * 修改规则学习配置
   */
  private async modifyRuleLearningConfig(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n📚 修改规则学习配置'));
    console.log(cliTools.colors.gray('─'.repeat(50)));

    try {
      const currentConfig = config.getRuleLearningConfig();

      console.log(`${cliTools.colors.yellow('当前配置:')}`);
      console.log(`启用状态: ${currentConfig.enabled ? '是' : '否'}`);
      console.log(`最小置信度: ${currentConfig.minConfidence}`);
      console.log(`批处理大小: ${currentConfig.batchSize}`);
      
      const enabled = await this.askQuestion(`启用规则学习? (y/N, 当前: ${currentConfig.enabled ? '是' : '否'}): `);
      const minConfidence = await this.askQuestion(`新最小置信度 (当前: ${currentConfig.minConfidence}): `);
      const batchSize = await this.askQuestion(`新批处理大小 (当前: ${currentConfig.batchSize}): `);
      
      updateEnvFile('RULE_LEARNING_ENABLED', enabled.toLowerCase().startsWith('y') ? 'true' : 'false');
      console.log(cliTools.colors.green('✅ 启用状态已更新'));

      if (minConfidence.trim() && !isNaN(parseFloat(minConfidence))) {
        updateEnvFile('RULE_LEARNING_MIN_CONFIDENCE', minConfidence.trim());
        console.log(cliTools.colors.green('✅ 最小置信度已更新'));
      }

      if (batchSize.trim() && !isNaN(parseInt(batchSize))) {
        updateEnvFile('RULE_LEARNING_BATCH_SIZE', batchSize.trim());
        console.log(cliTools.colors.green('✅ 批处理大小已更新'));
      }

      
      await this.askQuestion('\n按回车键继续...');

    } catch (error: any) {
      cliTools.log.error(`❌ 修改规则学习配置失败: ${error.message}`);
      await this.askQuestion('\n按回车键继续...');
    }
  }

  
  
  /**
   * 显示工具箱菜单
   */
  private async showToolsMenu(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n🛠️ 工具箱'));
    console.log(cliTools.colors.gray('─'.repeat(50)));

    cliTools.log.info('工具箱功能开发中...');
    await this.askQuestion('\n按回车键继续...');
  }

  /**
   * 显示帮助菜单
   */
  private async showHelpMenu(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n❓ 帮助和文档'));
    console.log(cliTools.colors.gray('═'.repeat(50)));

    console.log(cliTools.colors.yellow('\n📖 使用说明:'));
    console.log('1. 选择数字进行菜单导航');
    console.log('2. 输入 0 通常表示返回上级菜单或退出');
    console.log('3. 大多数操作都有确认提示，请仔细阅读');

    console.log(cliTools.colors.yellow('\n🔍 分析功能:'));
    console.log('• 支持直接输入SQL语句');
    console.log('• 支持分析单个SQL文件');
    console.log('• 支持批量分析整个目录');

    console.log(cliTools.colors.yellow('\n🏥 系统监控:'));
    console.log('• 实时健康检查');
    console.log('• 详细的统计信息');
    console.log('• 系统性能监控');

    console.log(cliTools.colors.yellow('\n📞 获取帮助:'));
    console.log('• 遇到问题可查看日志文件');
    console.log('• 建议定期进行系统健康检查');
    console.log('• 重要操作前建议备份数据');

    await this.askQuestion('\n按回车键继续...');
  }

  /**
   * 审批规则功能
   */
  private async approveRules(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n📋 规则审批'));
    console.log(cliTools.colors.gray('═'.repeat(50)));

    try {
      cliTools.log.info('🔄 正在检查待审批规则...');

      // 检查generated目录（待审核规则）
      const manualReviewDir = 'rules/learning-rules/generated';
      const approvedDir = 'rules/learning-rules/approved';

      const fs = await import('fs/promises');
      const path = await import('path');

      try {
        const files = await fs.readdir(manualReviewDir);
        const ruleFiles = files.filter(f => f.endsWith('.md'));

        if (ruleFiles.length === 0) {
          console.log(cliTools.colors.yellow('\n📭 暂无待审批规则'));
          await this.askQuestion('\n按回车键继续...');
          return;
        }

        // 使用现有的规则评估引擎进行审批
        const { RuleEvaluationEngine } = await import('../../services/rule-evaluation/RuleEvaluationEngine.js');
        const evaluationEngine = RuleEvaluationEngine.getInstance();

        console.log(`\n${cliTools.colors.green(`📄 找到 ${ruleFiles.length} 个待审批规则:`)}`);
        console.log(cliTools.colors.gray('─'.repeat(50)));

        // 显示规则列表，但不进行复杂解析，因为评估引擎会处理
        const ruleFilesData = [];
        for (let i = 0; i < ruleFiles.length; i++) {
          const file = ruleFiles[i];
          const filePath = path.join(manualReviewDir, file);

          try {
            const content = await fs.readFile(filePath, 'utf8');

            // 简单提取基本信息
            const titleMatch = content.match(/^#\s+(.+)$/m);
            const categoryMatch = content.match(/^\*\*规则类别\*\*:\s*(.+)$/m);
            const confidenceMatch = content.match(/^\*\*置信度\*\*:\s*(.+)$/m);
            const qualityMatch = content.match(/^\*\*质量分数\*\*:\s*(.+)$/m);

            const title = titleMatch ? titleMatch[1] : file.replace('.md', '');
            const category = categoryMatch ? categoryMatch[1] : 'Unknown';
            const confidence = confidenceMatch ? confidenceMatch[1] : 'N/A';
            const qualityScore = qualityMatch ? qualityMatch[1] : 'N/A';

            ruleFilesData.push({
              index: i + 1,
              file,
              title,
              category,
              confidence,
              qualityScore,
              filePath,
              content
            });

            // 显示规则基本信息
            console.log(`\n${cliTools.colors.yellow(`${i + 1}. ${title}`)}`);
            console.log(`   文件: ${cliTools.colors.gray(file)}`);
            console.log(`   类别: ${cliTools.colors.blue(category)}`);
            console.log(`   置信度: ${cliTools.colors.green(confidence)}`);
            if (qualityScore !== 'N/A') {
              const score = parseFloat(qualityScore);
              const qualityColor = score >= 90 ? cliTools.colors.green :
                                 score >= 70 ? cliTools.colors.yellow : cliTools.colors.red;
              console.log(`   质量分: ${qualityColor(qualityScore)}`);
            }

          } catch (error) {
            console.log(`\n${cliTools.colors.red(`${i + 1}. ${file} (读取失败: ${error.message})`)}`);
            ruleFilesData.push({ index: i + 1, file, error: true });
          }
        }

        console.log(cliTools.colors.gray('\n─'.repeat(50)));

        // 询问用户操作
        console.log('\n' + cliTools.colors.cyan('请选择操作:'));
        console.log('  1. 批量审批所有规则');
        console.log('  2. 选择性审批');
        console.log('  3. 查看规则详情');
        console.log('  0. 返回');

        const choice = await this.askQuestion('\n请输入选择: ');

        switch (choice) {
          case '1':
            await this.batchApproveRulesWithEngine(evaluationEngine, manualReviewDir);
            break;
          case '2':
          case '3':
            console.log(cliTools.colors.yellow('\n⚠️ 此功能使用规则评估引擎，但选择界面暂未实现，请使用批量审批'));
            break;
          case '4':
            console.log(cliTools.colors.yellow('\n⚠️ 重置知识库功能暂未实现'));
            break;
          case '5':
            await this.resetKnowledgeBase();
            break;
          case '0':
            return;
          default:
            cliTools.log.error('❌ 无效选择');
        }

      } catch (error) {
        console.log(cliTools.colors.red(`❌ 无法读取manual_review目录: ${error.message}`));
      }

    } catch (error) {
      cliTools.log.error(`❌ 规则审批失败: ${error.message}`);
    }

    await this.askQuestion('\n按回车键继续...');
  }

  /**
   * 使用规则评估引擎进行批量审批
   */
  private async batchApproveRulesWithEngine(evaluationEngine: any, manualReviewDir: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      cliTools.log.info('\n🚀 开始批量评估和审批规则...');

      console.log('\n📋 正在使用规则评估引擎进行智能分类...');

      // 使用评估引擎进行批量评估
      const batchResult = await evaluationEngine.evaluateBatch(manualReviewDir, {
        batchSize: 10,
        concurrency: 3
      });

      console.log('\n📊 评估结果汇总:');
      console.log(`✅ 通过审批: ${cliTools.colors.green(batchResult.summary.approved.toString())} 个规则`);
      console.log(`⚠️ 需要人工审核: ${cliTools.colors.yellow(batchResult.summary.needsReview.toString())} 个规则`);
      console.log(`❌ 被拒绝: ${cliTools.colors.red(batchResult.summary.rejected.toString())} 个规则`);
      console.log(`🔄 重复规则: ${cliTools.colors.blue(batchResult.summary.duplicates.toString())} 个规则`);

      console.log('\n📁 文件分布:');
      const stats = batchResult.classificationStats;
      if (stats.approved > 0) {
        console.log(`  🎯 Approved: ${cliTools.colors.green(stats.approved.toString())} 个规则`);
      }
      if (stats.duplicates > 0) {
        console.log(`  🔄 Duplicates: ${cliTools.colors.blue(stats.duplicates.toString())} 个规则`);
      }
      if (stats.low_quality > 0) {
        console.log(`  ⬇️ Low Quality: ${cliTools.colors.red(stats.low_quality.toString())} 个规则`);
      }
      if (stats.invalid_format > 0) {
        console.log(`  ❌ Invalid Format: ${cliTools.colors.red(stats.invalid_format.toString())} 个规则`);
      }

      console.log('\n🎉 规则评估和审批完成！');
      console.log(`平均质量分: ${cliTools.colors.yellow(batchResult.summary.averageQualityScore.toFixed(1))}`);
      console.log(`总处理时间: ${((Date.now() - batchResult.batchInfo.startTime) / 1000).toFixed(2)}秒`);

      // 自动移动文件到对应目录
      if (batchResult.ruleResults.length > 0) {
        console.log('\n📁 开始自动分类移动文件...');
        console.log('='.repeat(50));

        try {
          const { FileMover } = await import('../../services/rule-evaluation/utils/FileMover.js');

          const moveResults = await FileMover.moveRuleFiles(batchResult.ruleResults, false);
          const moveReport = FileMover.generateMoveReport(moveResults);

          // 显示移动统计
          console.log('📊 文件移动统计:');
          console.log(`  总文件数: ${moveReport.summary.total}`);
          console.log(`  成功移动: ${cliTools.colors.green(moveReport.summary.successful.toString())}`);
          console.log(`  移动失败: ${cliTools.colors.red(moveReport.summary.failed.toString())}`);
          console.log(`  移动到approved: ${moveReport.summary.approved}`);
          console.log(`  移动到manual_review: ${moveReport.summary.manualReview}`);
          console.log(`  移动到issues: ${moveReport.summary.issues}`);

          if (moveReport.summary.failed > 0) {
            console.log('\n❌ 部分文件移动失败:');
            moveReport.details
              .filter(detail => !detail.success)
              .forEach(detail => {
                console.log(`  ${detail.fileName}: ${detail.error}`);
              });
          }

        } catch (moveError) {
          cliTools.log.error(`❌ 文件移动失败: ${moveError.message}`);
        }
      }

    } catch (error) {
      cliTools.log.error(`❌ 批量审批失败: ${error.message}`);
    }
  }

  /**
   * 退出程序
   */
  private async exit(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n👋 感谢使用SQL分析器！'));

    try {
      // 清理日志系统
      const logger = getGlobalLogger();
      if (logger && typeof logger.cleanup === 'function') {
        await logger.cleanup();
        console.log('✅ 资源已清理');
      }
    } catch (error) {
      console.error('清理资源时出错:', error);
    }

    console.log(cliTools.colors.green('再见！🎉\n'));
  }

  /**
   * 显示头部信息
   */
  private showHeader(): void {
    console.log(cliTools.colors.blue('╔══════════════════════════════════════════════════════════════╗'));
    console.log(cliTools.colors.blue('║') + '                    🚀 SQL分析器 CLI v1.0                      ' + cliTools.colors.blue('║'));
    console.log(cliTools.colors.blue('║') + cliTools.colors.gray('              专业的SQL语句智能分析工具                         ') + cliTools.colors.blue('║'));
    console.log(cliTools.colors.blue('╚══════════════════════════════════════════════════════════════╝'));
  }

  /**
   * 清屏
   */
  private clearScreen(): void {
    console.clear();
  }

  
  /**
   * 保存目录分析结果到历史记录
   */
  private async saveDirectoryAnalysisToHistory(dirPath: string, analysisResult: any, processingTime: number, recursive: boolean): Promise<void> {
    if (!this.historyService) {
      cliTools.log.warn('⚠️  历史服务未初始化，跳过保存');
      return;
    }

    // 分析目录中的文件，确定主要数据库类型
    let detectedDatabaseType = DatabaseType.UNKNOWN;
    if (analysisResult.analyses && Array.isArray(analysisResult.analyses)) {
      const dbTypeCounts: Record<string, number> = {};

      analysisResult.analyses.forEach((fileAnalysis: any) => {
        if (fileAnalysis.analyses && Array.isArray(fileAnalysis.analyses)) {
          fileAnalysis.analyses.forEach((sqlAnalysis: any) => {
            const dbType = sqlAnalysis.databaseType || DatabaseType.UNKNOWN;
            dbTypeCounts[dbType] = (dbTypeCounts[dbType] || 0) + 1;
          });
        }
      });

      // 选择出现频率最高的数据库类型
      const maxCount = Math.max(...Object.values(dbTypeCounts));
      const mostFrequentTypes = Object.entries(dbTypeCounts)
        .filter(([_, count]) => count === maxCount)
        .map(([type, _]) => type);

      if (mostFrequentTypes.length > 0) {
        detectedDatabaseType = mostFrequentTypes[0] as DatabaseType;
      }
    }

    // 构建保存的数据结构
    const historyData = {
      id: `menu_dir_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      databaseType: detectedDatabaseType,
      type: AnalysisType.DIRECTORY_ANALYSIS,
      input: {
        content: `目录分析: ${dirPath}`,
        path: dirPath,
        name: dirPath.split('\\').pop() || dirPath.split('/').pop() || 'unknown',
        recursive: recursive
      },
      result: {
        success: analysisResult.success || true,
        summary: `目录分析完成，处理了 ${analysisResult.summary?.totalFiles || 0} 个文件`,
        stats: {
          totalFiles: analysisResult.summary?.totalFiles || 0,
          sqlFiles: analysisResult.summary?.sqlFiles || 0,
          totalStatements: analysisResult.summary?.totalStatements || 0,
          successful: analysisResult.summary?.successful || 0,
          failed: analysisResult.summary?.failed || 0,
          overallScore: analysisResult.summary?.overallScore || 0
        }
      },
      metadata: {
        processingTime: processingTime,
        analyzer: 'enhanced',
        version: '2.0.0',
        source: 'menu',
        inputMethod: 'directory_analysis',
        recursive: recursive
      }
    };

    const historyService = await this.getHistoryService();
    await historyService.saveAnalysis(historyData);
  }

  /**
   * 从分析结果触发规则学习（使用统一规则学习器）
   * @param sqlContent SQL内容
   * @param analysisResult 分析结果
   */
  private async asyncTriggerRuleLearningFromResult(sqlContent: string, analysisResult: any): Promise<void> {
    try {

      // 使用统一规则学习器
      const { getUnifiedRuleLearner } = await import('../../services/rule-learning/unified-rule-learner.js');
      const learner = getUnifiedRuleLearner();

      const learningResult = await learner.learnFromAnalysis(
        sqlContent,
        analysisResult,
        'unknown', // 数据库类型，可以后续优化
        'rules/learning-rules/generated'
      );

      // Menu模式下不显示规则学习结果，避免干扰用户界面
      // 只在CLI模式下显示详细结果
      if (learningResult.success && learningResult.rules.length > 0) {
        // 可选：将规则学习结果保存到某个地方，供后续查看
        console.log(`\n${cliTools.colors.green('✅ 规则学习完成，生成 ' + learningResult.rules.length + ' 条新规则')}`);
      }

    } catch (error) {
      // 静默处理错误，不干扰用户体验
      // 可以选择记录到日志文件，但不显示在用户界面
    }
  }

  /**
   * 从文件分析结果触发规则学习
   * @param analysisResult 文件分析结果
   * @param filePath 文件路径
   */
  private async asyncTriggerRuleLearningFromFile(analysisResult: any, filePath: string): Promise<void> {
    try {
      console.log(cliTools.colors.blue('📥 开始从文件分析结果生成规则...'));
      console.log(cliTools.colors.blue('🔧 初始化服务...'));
      console.log(cliTools.colors.blue('🚀 开始执行规则学习...'));

      // 使用统一规则学习器
      const { getUnifiedRuleLearner } = await import('../../services/rule-learning/unified-rule-learner.js');
      const learner = getUnifiedRuleLearner();

      // 提取所有SQL语句的分析结果
      const analyses: Array<{ sql: string; analysisResult: any; databaseType?: string }> = [];

      if (analysisResult.analyses && Array.isArray(analysisResult.analyses)) {
        for (const analysis of analysisResult.analyses) {
          if (analysis.sql && analysis.result) {
            analyses.push({
              sql: analysis.sql,
              analysisResult: analysis.result,
              databaseType: analysis.databaseType || 'unknown'
            });
          }
        }
      }

      if (analyses.length === 0) {
        console.log(cliTools.colors.yellow('⚠️ 未找到有效的SQL分析结果，跳过规则生成'));
        return;
      }

      console.log(cliTools.colors.cyan(`📊 找到 ${analyses.length} 条SQL语句，开始生成规则...`));

      const learningResult = await learner.learnFromMultipleAnalyses(
        analyses,
        'rules/learning-rules/generated'
      );

      // 显示学习结果
      learner.printResult(learningResult, cliTools.colors);

    } catch (error) {
      console.log(`${cliTools.colors.red('❌ 文件规则学习失败:')} ${error.message}`);
    }
  }

  /**
   * 从目录分析结果触发规则学习
   * @param analysisResult 目录分析结果
   * @param dirPath 目录路径
   */
  private async asyncTriggerRuleLearningFromDirectory(analysisResult: any, dirPath: string): Promise<void> {
    try {
      console.log(cliTools.colors.blue('📥 开始从目录分析结果生成规则...'));
      console.log(cliTools.colors.blue('🔧 初始化服务...'));
      console.log(cliTools.colors.blue('🚀 开始执行规则学习...'));

      // 使用统一规则学习器
      const { getUnifiedRuleLearner } = await import('../../services/rule-learning/unified-rule-learner.js');
      const learner = getUnifiedRuleLearner();

      // 提取所有SQL语句的分析结果
      const analyses: Array<{ sql: string; analysisResult: any; databaseType?: string }> = [];

      // 目录分析结果可能包含多个文件的多个SQL语句
      if (analysisResult.analyses && Array.isArray(analysisResult.analyses)) {
        for (const fileAnalysis of analysisResult.analyses) {
          if (fileAnalysis.analyses && Array.isArray(fileAnalysis.analyses)) {
            for (const sqlAnalysis of fileAnalysis.analyses) {
              if (sqlAnalysis.sql && sqlAnalysis.result) {
                analyses.push({
                  sql: sqlAnalysis.sql,
                  analysisResult: sqlAnalysis.result,
                  databaseType: sqlAnalysis.databaseType || 'unknown'
                });
              }
            }
          }
        }
      }

      if (analyses.length === 0) {
        console.log(cliTools.colors.yellow('⚠️ 未找到有效的SQL分析结果，跳过规则生成'));
        return;
      }

      console.log(cliTools.colors.cyan(`📊 找到 ${analyses.length} 条SQL语句，开始生成规则...`));

      const learningResult = await learner.learnFromMultipleAnalyses(
        analyses,
        'rules/learning-rules/generated'
      );

      // 显示学习结果
      learner.printResult(learningResult, cliTools.colors);

    } catch (error) {
      console.log(`${cliTools.colors.red('❌ 目录规则学习失败:')} ${error.message}`);
    }
  }

  
  /**
   * 保存分析结果到历史记录
   */
  private async saveAnalysisToHistory(sql: string, analysisResult: any, processingTime: number): Promise<void> {
    if (!this.historyService) {
      cliTools.log.warn('⚠️  历史服务未初始化，跳过保存');
      return;
    }

    // 提取真实的分析结果
    const realAnalysis = analysisResult.parsedContent || analysisResult;

    // 收集所有问题和建议
    const allIssues = [];
    const allRecommendations = [];

    ['performance', 'security', 'standards'].forEach(type => {
      if (realAnalysis[type] && realAnalysis[type].issues) {
        realAnalysis[type].issues.forEach(issue => {
          allIssues.push({
            ...issue,
            dimension: type // 确保维度信息正确
          });
        });
      }
      if (realAnalysis[type] && realAnalysis[type].recommendations) {
        realAnalysis[type].recommendations.forEach(rec => {
          allRecommendations.push({
            ...rec,
            dimension: type // 确保维度信息正确
          });
        });
      }
    });

    // 获取数据库类型（从分析结果中提取）
    const detectedDatabaseType = realAnalysis.databaseType ||
                               (realAnalysis.metadata?.databaseType) ||
                               DatabaseType.UNKNOWN;

    // 构建保存的数据结构
    const historyData = {
      id: `menu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      databaseType: detectedDatabaseType,
      type: AnalysisType.SQL_STATEMENT,
      sql: sql,
      sqlPreview: sql.length > 100 ? sql.substring(0, 100) + '...' : sql,
      result: {
        success: true,
        summary: realAnalysis.summary || 'SQL分析完成',
        overallScore: realAnalysis.overallScore || 75,
        confidence: realAnalysis.confidence || 0.85,
        issues: {
          performance: allIssues.filter(issue => issue.dimension === 'performance'),
          security: allIssues.filter(issue => issue.dimension === 'security'),
          standards: allIssues.filter(issue => issue.dimension === 'standards')
        },
        recommendations: {
          performance: allRecommendations.filter(rec => rec.dimension === 'performance'),
          security: allRecommendations.filter(rec => rec.dimension === 'security'),
          standards: allRecommendations.filter(rec => rec.dimension === 'standards')
        },
        sqlFix: realAnalysis.standards?.sqlFix || null
      },
      metadata: {
        processingTime: processingTime,
        analyzer: 'enhanced',
        version: '2.0.0',
        source: 'menu',
        inputMethod: 'direct_input' // 标识输入方式
      }
    };

    const historyService = await this.getHistoryService();
    await historyService.saveAnalysis(historyData);
  }

  /**
   * 询问用户问题
   */
  private askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(cliTools.colors.cyan(question), (answer) => {
        resolve(answer);
      });
    });
  }
}