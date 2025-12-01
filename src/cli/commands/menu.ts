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

  constructor(serviceContainer?: ServiceContainer) {
    // 使用依赖注入，方便测试
    this.serviceContainer = serviceContainer || ServiceContainer.getInstance();
    this.healthService = new HealthService();

    // 从服务容器获取所有服务（同步服务）
    this.analyzer = this.serviceContainer.getSQLAnalyzer();
    this.fileAnalyzer = this.serviceContainer.getFileAnalyzerService();
    this.knowledgeService = this.serviceContainer.getKnowledgeService();
    this.resultFormatter = this.serviceContainer.getResultFormatter();
  }

  /**
   * 获取历史服务（直接从ServiceContainer获取，它会处理复用）
   */
  private async getHistoryService(): Promise<any> {
    return await this.serviceContainer.getHistoryService();
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
        { id: '4', name: '🧠 知识库', description: '管理SQL知识和规则' },
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

      // 触发规则学习
      console.log(`\n${cliTools.colors.blue('🔄 正在进行规则学习...')}`);
      this.asyncTriggerRuleLearning(sql, 'sql', 'SQL语句').catch(error => {
        console.log(`${cliTools.colors.yellow('⚠️ 规则学习出错:')} ${error.message}`);
      });

    } catch (error: any) {
      cliTools.log.error(`❌ 分析失败: ${error.message}`);
    }

    await this.askQuestion('\n按回车键继续...');
  }

  /**
   * 显示分析结果
   */
  private async displayAnalysisResult(result: any, sql: string): Promise<void> {
    console.log(cliTools.colors.cyan('\n📋 分析结果'));
    console.log(cliTools.colors.gray('═'.repeat(60)));

    // 基本信息
    if (result.success) {
      console.log(`总体评分: ${this.getScoreColor(result.overallScore || 0)}(result.overallScore || 0)分`);
      console.log(`分析置信度: ${cliTools.colors.blue((result.confidence || 0).toFixed(2))}`);

      if (result.summary) {
        console.log(`\n${cliTools.colors.yellow('📝 分析摘要:')}`);
        console.log(result.summary);
      }

      // 显示各种分析结果
      if (result.performance) {
        console.log(`\n${cliTools.colors.yellow('⚡ 性能分析:')}`);
        if (result.performance.summary) {
          console.log(result.performance.summary);
        }
      }

      if (result.security) {
        console.log(`\n${cliTools.colors.yellow('🔒 安全分析:')}`);
        if (result.security.summary) {
          console.log(result.security.summary);
        }
      }

      if (result.standards) {
        console.log(`\n${cliTools.colors.yellow('📏 规范分析:')}`);
        if (result.standards.summary) {
          console.log(result.standards.summary);
        }

        // 显示修复建议
        if (result.standards.sqlFix) {
          console.log(`\n${cliTools.colors.green('💡 修复建议:')}`);
          console.log(`原始SQL: ${cliTools.colors.gray(sql)}`);
          console.log(`修复后SQL: ${cliTools.colors.cyan(result.standards.sqlFix.fixedSql)}`);
        }
      }

      // 显示问题和建议
      this.displayIssuesAndRecommendations(result);
    } else {
      console.log(cliTools.colors.red('❌ 分析失败'));
      if (result.error) {
        console.log(`错误信息: ${result.error}`);
      }
    }
  }

  /**
   * 显示问题和建议
   */
  private displayIssuesAndRecommendations(result: any): void {
    const allIssues = [];
    const allRecommendations = [];

    // 收集所有问题和建议
    ['performance', 'security', 'standards'].forEach(type => {
      if (result[type] && result[type].issues) {
        allIssues.push(...result[type].issues);
      }
      if (result[type] && result[type].recommendations) {
        allRecommendations.push(...result[type].recommendations);
      }
    });

    if (allIssues.length > 0) {
      console.log(`\n${cliTools.colors.red('⚠️ 发现的问题:')}`);
      allIssues.forEach((issue: any, index: number) => {
        const severityColor = issue.severity === 'critical' ? cliTools.colors.red :
                            issue.severity === 'high' ? cliTools.colors.yellow :
                            cliTools.colors.blue;
        console.log(`  ${index + 1}. ${severityColor(issue.title)} (${issue.severity})`);
        if (issue.description) {
          console.log(`     ${cliTools.colors.gray(issue.description)}`);
        }
      });
    }

    if (allRecommendations.length > 0) {
      console.log(`\n${cliTools.colors.green('💡 改进建议:')}`);
      allRecommendations.forEach((rec: any, index: number) => {
        const priorityColor = rec.priority === 'high' ? cliTools.colors.red :
                            rec.priority === 'medium' ? cliTools.colors.yellow :
                            cliTools.colors.blue;
        console.log(`  ${index + 1}. ${priorityColor(rec.title)} (${rec.priority})`);
        if (rec.description) {
          console.log(`     ${cliTools.colors.gray(rec.description)}`);
        }
      });
    }
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
        const historyService = await this.getHistoryService();
        await historyService.addAnalysis({
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          filePath: resolvedPath,
          type: 'file',
          result: analysisResult
        });
        console.log(cliTools.colors.green('✅ 分析结果已保存到历史记录'));
      } catch (historyError: any) {
        console.log(cliTools.colors.yellow(`⚠️ 历史记录保存失败: ${historyError.message}`));
      }

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
            console.log(`${cliTools.colors.purple('规则学习:')}`);
            analysis.learning.suggestions?.forEach((suggestion: any) => {
              console.log(`  💡 ${cliTools.colors.purple(suggestion.type)}: ${cliTools.colors.gray(suggestion.description)}`);
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
        console.log(`\n${cliTools.colors.purple('🧠 规则学习状态:')}`);
        console.log(`已处理模式: ${analysis.learning.patternsProcessed || 0}`);
        console.log(`新规则生成: ${analysis.learning.newRulesGenerated || 0}`);
        console.log(`学习建议: ${analysis.learning.suggestions?.length || 0}`);
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

      // 触发规则学习
      console.log(`\n${cliTools.colors.blue('🔄 正在进行规则学习...')}`);
      this.asyncTriggerRuleLearning('', 'directory', resolvedPath).catch(error => {
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
   * 查看历史记录
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
      } else {
        console.log(`\n${cliTools.colors.green(`📋 找到 ${records.length} 条历史记录:`)}`);
        console.log(cliTools.colors.gray('─'.repeat(80)));

        records.forEach((record: any, index: number) => {
          console.log(`${cliTools.colors.blue(`[${index + 1}]`)} ${record.timestamp}`);
          console.log(`  ID: ${cliTools.colors.cyan(record.id)}`);
          console.log(`  数据库类型: ${cliTools.colors.yellow(record.databaseType || 'Unknown')}`);
          console.log(`  SQL类型: ${cliTools.colors.green(record.type || 'Unknown')}`);
          console.log(`  SQL预览: ${cliTools.colors.gray((record.sqlPreview || record.sql || '').substring(0, 100))}...`);
          console.log(cliTools.colors.gray('─'.repeat(80)));
        });
      }

      await this.askQuestion('\n按回车键继续...');

    } catch (error: any) {
      cliTools.log.error(`❌ 查看历史记录失败: ${error.message}`);
      await this.askQuestion('\n按回车键继续...');
    }
  }

  /**
   * 搜索历史记录
   */
  private async searchHistoryRecords(): Promise<void> {
    this.clearScreen();
    console.log(cliTools.colors.cyan('\n🔍 搜索历史记录'));
    console.log(cliTools.colors.gray('─'.repeat(50)));

    try {
      const searchTerm = await this.askQuestion('请输入搜索关键词 (留空查看所有): ');
      const dbType = await this.askQuestion('数据库类型 (留空不限制): ');
      const sqlType = await this.askQuestion('SQL类型 (留空不限制): ');

      // 构建搜索条件
      const searchOptions: any = {};
      if (searchTerm.trim()) {
        searchOptions.sql = searchTerm.trim();
      }
      if (dbType.trim()) {
        searchOptions.databaseType = dbType.trim();
      }
      if (sqlType.trim()) {
        searchOptions.type = sqlType.trim();
      }
      searchOptions.limit = 20;

      cliTools.log.info('🔄 正在搜索历史记录...');

      const historyService = await this.getHistoryService();
      const records = await historyService.searchHistory(searchOptions.sql || '', searchOptions);

      if (records.length === 0) {
        console.log(cliTools.colors.yellow('\n📭 未找到匹配的历史记录'));
      } else {
        console.log(`\n${cliTools.colors.green(`📋 找到 ${records.length} 条匹配记录:`)}`);
        console.log(cliTools.colors.gray('─'.repeat(80)));

        records.forEach((record: any, index: number) => {
          console.log(`${cliTools.colors.blue(`[${index + 1}]`)} ${record.timestamp}`);
          console.log(`  ID: ${cliTools.colors.cyan(record.id)}`);
          console.log(`  数据库类型: ${cliTools.colors.yellow(record.databaseType || 'Unknown')}`);
          console.log(`  SQL类型: ${cliTools.colors.green(record.type || 'Unknown')}`);
          console.log(`  SQL预览: ${cliTools.colors.gray((record.sqlPreview || record.sql || '').substring(0, 100))}...`);
          console.log(cliTools.colors.gray('─'.repeat(80)));
        });
      }

      await this.askQuestion('\n按回车键继续...');

    } catch (error: any) {
      cliTools.log.error(`❌ 搜索历史记录失败: ${error.message}`);
      await this.askQuestion('\n按回车键继续...');
    }
  }

  /**
   * 查看历史统计信息
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

      if (statistics.byType) {
        console.log(`\n${cliTools.colors.cyan('按SQL类型统计:')}`);
        Object.entries(statistics.byType).forEach(([type, count]: [string, any]) => {
          console.log(`  ${type}: ${cliTools.colors.yellow(count.toString())}`);
        });
      }

      if (statistics.byDatabase) {
        console.log(`\n${cliTools.colors.cyan('按数据库类型统计:')}`);
        Object.entries(statistics.byDatabase).forEach(([db, count]: [string, any]) => {
          console.log(`  ${db}: ${cliTools.colors.yellow(count.toString())}`);
        });
      }

      if (statistics.byMonth) {
        console.log(`\n${cliTools.colors.cyan('按月份统计:')}`);
        Object.entries(statistics.byMonth).forEach(([month, count]: [string, any]) => {
          console.log(`  ${month}: ${cliTools.colors.yellow(count.toString())}`);
        });
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
        { id: '4', name: '重置知识库', description: '清空并重新初始化知识库' },
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
              const type = doc.type || 'Unknown';
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

    // 构建保存的数据结构
    const historyData = {
      id: `menu_dir_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      databaseType: 'unknown',
      type: 'directory',
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
        version: '1.0.0',
        source: 'menu'
      }
    };

    const historyService = await this.getHistoryService();
    await historyService.saveAnalysis(historyData);
  }

  /**
   * 触发规则学习
   * @param sqlContent SQL内容（可为空，对于目录分析）
   * @param inputType 输入类型
   * @param inputPath 输入路径
   */
  private async asyncTriggerRuleLearning(sqlContent: string, inputType: string, inputPath: string): Promise<void> {
    try {
      console.log(cliTools.colors.blue('📥 开始导入规则学习模块...'));

      // 动态导入规则生成器
      const { generateRulesFromHistory } = await import('../../services/rule-learning/rule-generator.js');

      console.log(cliTools.colors.blue('🔧 初始化服务...'));

      // 初始化服务
      const historyService = await this.getHistoryService();

      console.log(cliTools.colors.blue('🚀 开始执行规则学习...'));

      // 执行规则学习
      const learningResult = await generateRulesFromHistory(historyService, {
        maxRules: 10,
        minConfidence: 0.1 // 降低置信度阈值
      });

      console.log(cliTools.colors.blue('✅ 规则学习执行完成'));

      // 显示详细的学习结果
      console.log(cliTools.colors.magenta(`\n🔍 规则学习调试信息:`));
      console.log(`   处理记录: ${learningResult.processedRecords || 0}`);
      console.log(`   生成规则: ${learningResult.rules?.length || 0}`);

      if (learningResult.rules && learningResult.rules.length > 0) {
        console.log(`${cliTools.colors.green('\n✅ 规则学习完成!')}`);
        console.log(`   生成规则: ${learningResult.rules.length} 条`);
        console.log(`   处理记录: ${learningResult.processedRecords} 条`);

        console.log(`\n${cliTools.colors.cyan('🆕 本次分析生成的规则:')}`);
        learningResult.rules.forEach((rule: any, index: number) => {
          console.log(`   ${index + 1}. ${cliTools.colors.yellow(rule.title || rule.id)} (${cliTools.colors.gray((rule.confidence * 100).toFixed(1) + '%')})`);
        });
      } else {
        console.log(`${cliTools.colors.yellow('\n⚠️ 本次未生成新规则')}`);
        console.log(`   可能原因：历史记录不足、置信度过低或没有符合要求的分析结果`);
      }

    } catch (error) {
      console.log(`${cliTools.colors.red('❌ 规则学习失败:')} ${error.message}`);
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

    // 构建保存的数据结构
    const historyData = {
      id: `menu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      databaseType: 'unknown',
      type: 'sql',
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
        version: '1.0.0',
        source: 'menu'
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