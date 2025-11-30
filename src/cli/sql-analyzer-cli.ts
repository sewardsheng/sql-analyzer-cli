#!/usr/bin/env node

/**
 * SQL分析器CLI工具
 * 老王我用commander.js重写，专业多了！
 */

import { Command } from 'commander';
import { red, green, blue, yellow, cyan, gray, magenta } from 'ansis';
import dayjs from 'dayjs';
import { createEnhancedSQLAnalyzer } from '../core/index.js';
import { readFileSync, existsSync } from 'fs';
import { resolve, extname } from 'path';
import { llmJsonParser } from '../core/llm-json-parser.js';

class SQLAnalyzerCLI {
  private program: Command;
  private analyzer: any;
  private log: {
    analysis: (msg: string) => void;
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
  };
  private colors: {
    cyan: (text: string) => string;
    green: (text: string) => string;
    yellow: (text: string) => string;
    red: (text: string) => string;
    blue: (text: string) => string;
    magenta: (text: string) => string;
    gray: (text: string) => string;
  };
  private time: {
    dayjs: () => dayjs.Dayjs;
    format: (date: Date) => string;
    formatDuration: (ms: number) => string;
  };
  private fileAnalyzer: any;

  constructor() {
    this.setupUtils();
    this.setupAnalyzer();
    this.setupProgram();
  }

  /**
   * 初始化工具类和辅助方法
   */
  private setupUtils(): void {
    // 初始化日志工具
    this.log = {
      analysis: (msg: string) => console.log(msg),
      success: (msg: string) => console.log(msg),
      error: (msg: string) => console.error(msg),
      info: (msg: string) => console.info(msg)
    };

    // 初始化颜色工具 (ansis已经导入)
    this.colors = {
      cyan: (text: string) => cyan(text),
      green: (text: string) => green(text),
      yellow: (text: string) => yellow(text),
      red: (text: string) => red(text),
      blue: (text: string) => blue(text),
      magenta: (text: string) => magenta(text),
      gray: (text: string) => gray(text)
    };

    // 初始化时间工具 (dayjs已经导入)
    this.time = {
      dayjs: () => dayjs(),
      format: (date: Date) => date.toISOString(),
      formatDuration: (ms: number) => `${ms}ms`
    };

    // fileAnalyzer 初始化为 analyzer (后面在 setupAnalyzer 中设置)
    this.fileAnalyzer = null;
  }

  /**
   * 初始化分析器
   */
  private setupAnalyzer(): void {
    try {
      this.analyzer = createEnhancedSQLAnalyzer({
        enableCaching: true,
        enableKnowledgeBase: true,
        maxConcurrency: 3
      });
      this.fileAnalyzer = this.analyzer; // 设置fileAnalyzer为同一个分析器实例
    } catch (error: any) {
      console.error(red`❌ 分析器初始化失败: ${error.message}`);
      console.error(yellow`⚠️  将使用演示模式`);
      this.analyzer = null;
      this.fileAnalyzer = null;
    }
  }

  /**
   * 设置commander程序
   */
  private setupProgram(): void {
    this.program = new Command();

    this.program
      .name('sql-analyzer')
      .description('🚀 SQL Analyzer CLI - SQL语句智能分析工具')
      .version('2.0.0', '-v, --version', '显示版本信息');

    // 分析命令
    this.program
      .command('analyze')
      .alias('a')
      .description('分析SQL语句或SQL文件')
      .option('-t, --types <types>', '分析类型 (performance,security,standards)', this.parseCommaSeparated)
      .option('-d, --database <type>', '数据库类型 (mysql,postgresql,oracle,sqlserver)')
      .option('-b, --batch-size <num>', '批处理大小 (默认: 10)', '10')
      .option('--no-cache', '禁用缓存')
      .option('-j, --json', '输出JSON格式')
      .option('-o, --output <file>', '输出到文件')
      .option('-p, --performance', '仅执行性能分析')
      .option('-s, --security', '仅执行安全分析')
      .option('--standards', '仅执行规范检查')
      .option('-i, --interactive', '交互式模式')
      .option('--sql <statement>', '要分析的SQL语句')
      .option('--file <path>', '要分析的SQL文件路径')
      .addHelpText('after', `
示例:
  sql-analyzer analyze --sql "SELECT * FROM users"           # 直接分析SQL语句
  sql-analyzer analyze --file ./query.sql                  # 分析SQL文件
  sql-analyzer analyze --sql "SELECT * FROM users" --database mysql --json
  sql-analyzer analyze --file ./query.sql --types performance,security
  sql-analyzer analyze --sql "SELECT * FROM users" --standards
  sql-analyzer analyze --file ./query.sql --performance --no-cache`)
      .action(async (options: any) => {
        await this.handleAnalyze(options);
      });

    // 目录分析命令
    this.program
      .command('directory')
      .alias('dir')
      .description('分析目录中的所有SQL文件')
      .argument('<directory>', '要分析的目录路径')
      .option('-t, --types <types>', '分析类型 (performance,security,standards)', this.parseCommaSeparated)
      .option('-d, --database <type>', '数据库类型 (mysql,postgresql,oracle,sqlserver)')
      .option('-b, --batch-size <num>', '批处理大小 (默认: 10)', '10')
      .option('-r, --recursive', '递归分析子目录')
      .option('--no-cache', '禁用缓存')
      .option('-j, --json', '输出JSON格式')
      .option('-o, --output <file>', '输出到文件')
      .addHelpText('after', `
示例:
  sql-analyzer directory ./sql-files
  sql-analyzer directory ./sql-files --recursive
  sql-analyzer directory ./sql-files --types performance,security --output report.json`)
      .action(async (directory: string, options: any) => {
        await this.handleDirectory(directory, options);
      });

    // 统计命令
    this.program
      .command('stats')
      .alias('s')
      .description('显示分析器统计信息')
      .addHelpText('after', `
示例:
  sql-analyzer stats
  sql-analyzer stats --debug`)
      .action(async () => {
        await this.handleStats();
      });

    // 全局选项
    this.program
      .option('--debug', '启用调试模式')
      .hook('preAction', (thisCommand) => {
        const options = thisCommand.opts();
        if (options.debug) {
          console.log(gray`🔧 调试模式已启用`);
        }
      });
  }

  /**
   * 解析逗号分隔的字符串
   */
  private parseCommaSeparated(value: string): string[] {
    return value.split(',').map(item => item.trim());
  }

  /**
   * 格式化持续时间
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}小时${minutes % 60}分${seconds % 60}秒`;
    } else if (minutes > 0) {
      return `${minutes}分${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }

  /**
   * 运行CLI
   * @param {Array<string>} args - 命令行参数
   */
  async run(args = process.argv): Promise<void> {
    try {
      await this.program.parseAsync(args);
    } catch (error: any) {
      console.error(`❌ 执行失败: ${error.message || error}`);
      process.exit(1);
    }
  }

  /**
   * 处理分析命令（支持文件和SQL语句）
   * @param {Object} options - 命令行选项
   */
  async handleAnalyze(options: any): Promise<void> {
    try {
      // 验证输入选项
      if (!options.sql && !options.file) {
        throw new Error('请使用 --sql 或 --file 选项指定要分析的内容');
      }

      if (options.sql && options.file) {
        throw new Error('--sql 和 --file 选项不能同时使用');
      }

      let sqlContent: string;
      let inputType: 'file' | 'sql';
      let inputPath: string;

      // 判断是文件还是SQL语句
      if (options.sql) {
        // 直接分析SQL语句
        sqlContent = options.sql.trim();
        inputType = 'sql';
        inputPath = 'SQL语句';
        console.log(cyan`🔍 正在分析SQL语句: ${sqlContent.substring(0, 50)}${sqlContent.length > 50 ? '...' : ''}`);
      } else {
        // 分析文件
        const resolvedPath = resolve(options.file);
        inputPath = resolvedPath;
        inputType = 'file';

        // 检查文件是否存在
        if (!existsSync(resolvedPath)) {
          throw new Error(`文件不存在: ${resolvedPath}`);
        }

        // 检查文件扩展名
        const fileExt = extname(resolvedPath).toLowerCase();
        if (!['.sql', '.ddl', '.dml'].includes(fileExt)) {
          console.warn(yellow`⚠️  文件类型 ${fileExt} 可能不是SQL文件`);
        }

        console.log(cyan`🔍 正在分析文件: ${resolvedPath}`);

        // 读取文件内容
        const fileContent = readFileSync(resolvedPath, 'utf-8');
        sqlContent = fileContent.trim();

        if (!sqlContent) {
          throw new Error('文件内容为空');
        }
      }

      const startTime = Date.now();

      let result;

      // 如果分析器可用，使用真实分析；否则使用演示模式
      if (this.analyzer) {
        console.log(blue`🧠 使用AI智能分析模式...`);
        const analysisOptions = this.processOptions(options);
        try {
          // 尝试使用analyzeFile方法（如果存在）
          if (typeof this.analyzer.analyzeFile === 'function') {
            result = await this.analyzer.analyzeFile(sqlContent, {
              ...analysisOptions,
              filePath: inputPath,
              inputType
            });
          } else if (typeof this.analyzer.analyzeSQL === 'function') {
            // 使用analyzeSQL方法分析SQL内容
            const analysisResult = await this.analyzer.analyzeSQL(sqlContent, analysisOptions);

            // 提取真实的分析结果
            const realAnalysis = analysisResult.parsedContent || analysisResult;

            // 调试输出 - 检查全局调试选项
            const globalOptions = this.program.opts();
            const isDebugMode = globalOptions.debug || options.debug;

            if (isDebugMode) {
              console.log(magenta`\n🔍 调试信息 - 原始分析结果:`);
              console.log(JSON.stringify(analysisResult, null, 2));
              console.log(magenta`\n🔍 调试信息 - 提取的分析结果:`);
              console.log(JSON.stringify(realAnalysis, null, 2));
            }

            // 使用统一的JSON解析器提取维度分析结果
            const dimensionAnalysis = llmJsonParser.extractDimensionAnalysis(realAnalysis);

            if (isDebugMode) {
              console.log(magenta`\n🔍 调试信息 - 提取的维度分析结果:`);
              console.log(JSON.stringify(dimensionAnalysis, null, 2));
            }

            // 构建最终结果
            result = {
              fileInfo: {
                fileName: inputType === 'file' ?
                  (inputPath.split('\\').pop() || inputPath.split('/').pop() || 'unknown') :
                  'SQL语句',
                filePath: inputPath
              },
              stats: {
                totalStatements: 1,
                successfulAnalyses: analysisResult.success ? 1 : 0,
                overallScore: dimensionAnalysis.overallScore
              },
              analysis: {
                summary: dimensionAnalysis.summary,
                issues: dimensionAnalysis.allIssues,
                recommendations: dimensionAnalysis.allRecommendations,
                confidence: realAnalysis.confidence || 0.85,
                sqlFix: dimensionAnalysis.sqlFixData
              },
              rawResult: analysisResult // 保留原始结果用于调试
            };
          } else {
            throw new Error('分析器没有可用的分析方法');
          }
        } catch (error: any) {
          console.error(red`❌ 分析失败: ${error.message}`);
          throw error; // 直接抛出错误，不使用演示模式
        }
      } else {
        throw new Error('分析器不可用');
      }

      // 显示分析结果
      this.displayFileResults(result);

      const duration = Date.now() - startTime;
      console.log(green`✅ 分析完成，耗时: ${this.formatDuration(duration)}`);
      console.log(blue`💡 完成时间: ${new Date().toLocaleString()}`);

    } catch (error: any) {
      console.error(red`❌ 文件分析失败: ${error.message}`);
      process.exit(1);
    }
  }

  
  /**
   * 处理目录分析命令
   * @param {string} dirPath - 目录路径
   * @param {Object} options - 命令行选项
   */
  async handleDirectory(dirPath: string, options: any): Promise<void> {
    const analysisOptions = this.processOptions(options);

    this.log.analysis(`正在分析目录: ${this.colors.cyan(dirPath)}`);
    const startTime = this.time.dayjs();

    try {
      const result = await this.fileAnalyzer.analyzeDirectory(dirPath, analysisOptions);

      if (result.success) {
        this.displayDirectoryResults(result);
        const endTime = this.time.dayjs();
        const duration = endTime.diff(startTime);
        this.log.success(`目录分析完成，耗时: ${this.time.formatDuration(duration)}`);
        this.log.info(`完成时间: ${this.time.format(endTime.toDate())}`);
      } else {
        this.log.error(`目录分析失败: ${result.error}`);
        process.exit(1);
      }
    } catch (error: any) {
      this.log.error(`目录分析失败: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * 处理统计命令
   */
  async handleStats(): Promise<void> {
    try {
      console.log(cyan`📊 分析器统计信息:`);
      console.log('');

      if (this.analyzer && this.analyzer.getStats) {
        // 使用真实分析器的统计信息
        const stats = this.analyzer.getStats();
        const successRate = stats.totalAnalyses > 0
          ? ((stats.successfulAnalyses / stats.totalAnalyses) * 100).toFixed(1)
          : '0';
        const cacheHitRate = stats.totalAnalyses > 0
          ? ((stats.cacheHits / stats.totalAnalyses) * 100).toFixed(1)
          : '0';
        const avgDuration = stats.totalAnalyses > 0
          ? Math.floor(stats.totalDuration / stats.totalAnalyses)
          : 0;

        console.log(`总分析次数: ${yellow(stats.totalAnalyses.toString())}`);
        console.log(`成功分析: ${green(stats.successfulAnalyses.toString())}`);
        console.log(`失败次数: ${red(stats.errors.toString())}`);
        console.log(`平均耗时: ${cyan(`${avgDuration}ms`)}`);
        console.log(`成功率: ${green(`${successRate}%`)}`);
        console.log(`缓存命中率: ${blue(`${cacheHitRate}%`)}`);
      } else {
        // 显示分析器状态
        if (this.analyzer) {
          console.log(`分析器状态: ${green('✅ 已就绪')}`);
          console.log(`分析模式: ${cyan('🧠 AI智能分析')}`);
        } else {
          console.log(`分析器状态: ${red('❌ 未初始化')}`);
          console.log(`分析模式: ${yellow('🎭 演示模式')}`);
        }
        console.log(`总分析次数: ${yellow('0')}`);
        console.log(`成功分析: ${green('0')}`);
        console.log(`失败次数: ${red('0')}`);
        console.log(`平均耗时: ${cyan('0ms')}`);
        console.log(`成功率: ${green('--%')}`);
        console.log(`缓存命中率: ${blue('--%')}`);
      }

      console.log('');
      console.log(yellow`⚙️  当前配置:`);
      console.log(`分析器类型: ${cyan(this.analyzer ? 'EnhancedSQLAnalyzer' : 'DemoAnalyzer')}`);
      console.log(`知识库支持: ${this.analyzer ? green('启用') : red('禁用')}`);
      console.log(`缓存功能: ${this.analyzer ? green('启用') : red('禁用')}`);
      console.log(`并发数: ${cyan('3')}`);

      if (!this.analyzer) {
        console.log('');
        console.log(gray`💡 提示: 分析器初始化失败，当前使用演示模式`);
        console.log(gray`   请检查配置文件和依赖项后重试`);
      }

    } catch (error: any) {
      console.error(red`❌ 获取统计信息失败: ${error.message}`);
    }
  }

  /**
   * 处理commander选项，转换为分析器需要的格式
   * @param {Object} commanderOptions - commander解析的选项
   * @returns {Object} 处理后的选项
   */
  private processOptions(commanderOptions: any): any {
    const options: any = {};

    // 基础选项
    if (commanderOptions.types) {
      options.analysisTypes = commanderOptions.types;
    }

    if (commanderOptions.database) {
      options.databaseType = commanderOptions.database;
    }

    if (commanderOptions.batchSize) {
      options.batchSize = parseInt(commanderOptions.batchSize);
    }

    if (commanderOptions.recursive) {
      options.recursive = true;
    }

    // 缓存选项处理（commander会自动处理--no-cache为false值）
    if (commanderOptions.cache === false) {
      options.enableCache = false;
    }

    if (commanderOptions.json) {
      options.outputFormat = 'json';
    }

    if (commanderOptions.output) {
      options.outputFile = commanderOptions.output;
    }

    // 快捷选项处理
    if (commanderOptions.performance) {
      options.analysisTypes = ['performance'];
    }

    if (commanderOptions.security) {
      options.analysisTypes = ['security'];
    }

    if (commanderOptions.standards) {
      options.analysisTypes = ['standards'];
    }

    return options;
  }

  /**
   * 显示文件分析结果
   * @param {Object} result - 分析结果
   */
  displayFileResults(result: any) {
    console.log('');
    console.log(cyan`📄 文件分析结果`);
    console.log(gray('='.repeat(50)));
    console.log(`文件: ${cyan(result.fileInfo.fileName)}`);
    console.log(`路径: ${gray(result.fileInfo.filePath)}`);
    console.log(`SQL语句数: ${yellow(result.stats.totalStatements)}`);
    console.log(`成功分析: ${green(result.stats.successfulAnalyses)}`);

    // 根据分数显示不同颜色
    const score = result.stats.overallScore;
    let scoreColor = green; // 默认绿色
    if (score < 60) scoreColor = red;
    else if (score < 80) scoreColor = yellow;

    console.log(`总体评分: ${scoreColor(`${score}分`)}`);
    console.log('');

    // 优先显示SQL修复信息 - 这是最重要的解决方案
    if (result.analysis.sqlFix) {
      console.log(green`🔧 SQL修复:`);
      console.log(gray('='.repeat(30)));
      console.log(cyan`修复后的SQL:`);
      console.log(blue(result.analysis.sqlFix.fixedSql));
      console.log('');

      console.log(cyan`修复详情:`);
      console.log(`✅ 语法正确: ${result.analysis.sqlFix.isValidSyntax ? '是' : '否'}`);
      console.log(`🛡️  安全执行: ${result.analysis.sqlFix.isSafe ? '是' : '否'}`);

      if (result.analysis.sqlFix.changes && result.analysis.sqlFix.changes.length > 0) {
        console.log(cyan`修复变更:`);
        result.analysis.sqlFix.changes.forEach((change: any, index: number) => {
          console.log(`${green(index + 1)}. ${change.type}: ${change.description}`);
        });
      }
      console.log('');
    }

    // 按维度显示问题 - 用户最关心的部分
    if (result.analysis.issues && result.analysis.issues.length > 0) {
      const issuesByDimension = this.groupByDimension(result.analysis.issues);

      Object.keys(issuesByDimension).forEach(dimension => {
        const dimensionName = this.getDimensionDisplayName(dimension);
        const dimensionColor = this.getDimensionColor(dimension);

        console.log(dimensionColor`⚠️  ${dimensionName}问题:`);

        issuesByDimension[dimension].forEach((issue: any, index: number) => {
          const severity = issue.severity?.toUpperCase() || 'MEDIUM';
          let severityColor = yellow;

          if (severity === 'HIGH' || severity === 'CRITICAL') {
            severityColor = red;
          } else if (severity === 'LOW') {
            severityColor = green;
          }

          console.log(`${cyan(index + 1)}. [${severityColor(severity)}] ${issue.title || issue.description}`);
          if (issue.description && issue.title) {
            console.log(`   ${gray(issue.description)}`);
          }
        });
        console.log('');
      });
    }

    // 按维度显示建议 - 具体的解决方案
    if (result.analysis.recommendations && result.analysis.recommendations.length > 0) {
      const recommendationsByDimension = this.groupByDimension(result.analysis.recommendations);

      Object.keys(recommendationsByDimension).forEach(dimension => {
        const dimensionName = this.getDimensionDisplayName(dimension);
        const dimensionColor = this.getDimensionColor(dimension);

        console.log(dimensionColor`💡 ${dimensionName}建议:`);

        recommendationsByDimension[dimension].forEach((rec: any, index: number) => {
          const priority = rec.priority?.toUpperCase() || 'MEDIUM';
          let priorityColor = yellow;

          if (priority === 'HIGH') {
            priorityColor = red;
          } else if (priority === 'LOW') {
            priorityColor = green;
          }

          console.log(`${cyan(index + 1)}. [${priorityColor(priority)}] ${rec.title || rec.description}`);
          if (rec.description && rec.title) {
            console.log(`   ${gray(rec.description)}`);
          }
        });
        console.log('');
      });
    }

    // 最后显示分析总结 - 总体评估
    console.log(cyan`📋 分析总结:`);
    console.log(gray(result.analysis.summary));
    console.log('');

    // 显示置信度
    if (result.analysis.confidence > 0) {
      const confidence = (result.analysis.confidence * 100).toFixed(1);
      console.log(blue`🎯 分析置信度: ${green(confidence)}%`);
    }
  }

  /**
   * 按维度分组项目
   */
  private groupByDimension(items: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    items.forEach(item => {
      const dimension = item.dimension || 'general';
      if (!grouped[dimension]) {
        grouped[dimension] = [];
      }
      grouped[dimension].push(item);
    });

    return grouped;
  }

  /**
   * 获取维度显示名称
   */
  private getDimensionDisplayName(dimension: string): string {
    const names: Record<string, string> = {
      'performance': '性能',
      'security': '安全',
      'standards': '规范',
      'general': '通用'
    };
    return names[dimension] || dimension;
  }

  /**
   * 获取维度颜色
   */
  private getDimensionColor(dimension: string): (text: string) => string {
    switch (dimension) {
      case 'performance': return yellow;
      case 'security': return red;
      case 'standards': return blue;
      case 'general': return cyan;
      default: return cyan;
    }
  }

  /**
   * 显示目录分析结果
   * @param {Object} result - 分析结果
   */
  displayDirectoryResults(result) {
    console.log('');
    console.log(this.colors.blue('📁 目录分析结果'));
    console.log(this.colors.gray('='.repeat(50)));
    console.log(`目录: ${this.colors.cyan(result.directory)}`);
    console.log(`文件数量: ${this.colors.yellow(result.fileCount)}`);
    console.log('');

    if (result.stats) {
      console.log(this.colors.blue('📊 统计信息:'));
      console.log(`成功文件: ${this.colors.green(result.stats.successfulFiles)}`);
      console.log(`失败文件: ${this.colors.red(result.stats.failedFiles)}`);
      console.log(`SQL语句总数: ${this.colors.yellow(result.stats.totalStatements)}`);
      console.log(`问题总数: ${this.colors.yellow(result.stats.totalIssues)}`);
      console.log(`建议总数: ${this.colors.magenta(result.stats.totalRecommendations)}`);

      const avgScore = result.stats.averageScore;
      let scoreColor = this.colors.green;
      if (avgScore < 60) scoreColor = this.colors.red;
      else if (avgScore < 80) scoreColor = this.colors.yellow;

      console.log(`平均评分: ${scoreColor(`${avgScore}分`)}`);
      console.log('');
    }

    // 显示每个文件的结果概要
    if (result.results && result.results.length > 0) {
      console.log(this.colors.blue('📄 文件分析概要:'));
      result.results.forEach((fileResult, index) => {
        if (fileResult.success) {
          const score = fileResult.analysis?.overallScore || 0;
          const issues = (fileResult.analysis?.issues || []).length;
          let scoreColor = this.colors.green;
          if (score < 60) scoreColor = this.colors.red;
          else if (score < 80) scoreColor = this.colors.yellow;

          const fileName = fileResult.fileInfo?.fileName || 'Unknown';
          console.log(`${this.colors.cyan(index + 1)}. ${this.colors.cyan(fileName)} - ${scoreColor(`${score}分`)} (${this.colors.yellow(issues + '个问题')})`);
        } else {
          const fileName = fileResult.fileName || 'Unknown';
          console.log(`${this.colors.cyan(index + 1)}. ${this.colors.red(fileName)} - ${this.colors.red('分析失败')}`);
        }
      });
    }
  }
}

// 如果直接运行此文件，则启动CLI
const cli = new SQLAnalyzerCLI();
cli.run().then(() => {
  // 确保进程正常退出
  setTimeout(() => {
    process.exit(0);
  }, 100);
}).catch((error) => {
  console.error('CLI启动失败:', error);
  process.exit(1);
});

export default SQLAnalyzerCLI;