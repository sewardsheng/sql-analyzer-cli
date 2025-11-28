#!/usr/bin/env node

/**
 * SQL分析器CLI工具
 * 老王我TM要把它做得专业点！
 */

import { FileAnalyzerService } from '../services/FileAnalyzerService.js';
import { createEnhancedSQLAnalyzer } from '../core/EnhancedSQLAnalyzer.js';
import { config } from '../config/index.js';

class SQLAnalyzerCLI {
  constructor() {
    this.fileAnalyzer = new FileAnalyzerService();
    this.analyzer = createEnhancedSQLAnalyzer();
  }

  /**
   * 运行CLI
   * @param {Array<string>} args - 命令行参数
   */
  async run(args = process.argv.slice(2)) {
    try {
      if (args.length === 0) {
        this.showHelp();
        return;
      }

      const command = args[0];
      const commandArgs = args.slice(1);

      switch (command) {
        case 'analyze':
        case 'a':
          await this.handleAnalyze(commandArgs);
          break;

        case 'directory':
        case 'dir':
        case 'd':
          await this.handleDirectory(commandArgs);
          break;

        case 'stats':
        case 's':
          await this.handleStats(commandArgs);
          break;

        case 'help':
        case 'h':
        case '--help':
        case '-h':
          this.showHelp();
          break;

        case 'version':
        case 'v':
        case '--version':
        case '-v':
          this.showVersion();
          break;

        default:
          console.error(`❌ 未知命令: ${command}`);
          console.log('使用 "sql-analyzer help" 查看帮助信息');
          process.exit(1);
      }

    } catch (error) {
      console.error('❌ 执行失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 处理文件分析命令
   * @param {Array<string>} args - 参数
   */
  async handleAnalyze(args) {
    if (args.length === 0) {
      console.error('❌ 请指定要分析的SQL文件');
      console.log('用法: sql-analyzer analyze <file.sql> [options]');
      return;
    }

    const filePath = args[0];
    const options = this.parseOptions(args.slice(1));

    console.log(`🔍 正在分析文件: ${filePath}`);
    const startTime = Date.now();

    try {
      const result = await this.fileAnalyzer.analyzeFile(filePath, options);

      if (result.success) {
        this.displayFileResults(result);
        const duration = Date.now() - startTime;
        console.log(`\n✅ 分析完成，耗时: ${duration}ms`);
      } else {
        console.error('❌ 分析失败:', result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ 文件分析失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 处理目录分析命令
   * @param {Array<string>} args - 参数
   */
  async handleDirectory(args) {
    if (args.length === 0) {
      console.error('❌ 请指定要分析的目录');
      console.log('用法: sql-analyzer directory <directory> [options]');
      return;
    }

    const dirPath = args[0];
    const options = this.parseOptions(args.slice(1));

    console.log(`🔍 正在分析目录: ${dirPath}`);
    const startTime = Date.now();

    try {
      const result = await this.fileAnalyzer.analyzeDirectory(dirPath, options);

      if (result.success) {
        this.displayDirectoryResults(result);
        const duration = Date.now() - startTime;
        console.log(`\n✅ 目录分析完成，耗时: ${duration}ms`);
      } else {
        console.error('❌ 目录分析失败:', result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ 目录分析失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 处理统计命令
   * @param {Array<string>} args - 参数
   */
  async handleStats(args) {
    const stats = this.fileAnalyzer.getAnalyzerStats();

    console.log('📊 分析器统计信息:');
    console.log('');
    console.log(`总分析次数: ${stats.totalAnalyses}`);
    console.log(`成功分析: ${stats.successfulAnalyses}`);
    console.log(`失败次数: ${stats.errors}`);
    console.log(`平均耗时: ${stats.averageDuration}ms`);
    console.log(`成功率: ${stats.successRate}`);
    console.log(`缓存命中率: ${stats.cacheHitRate}`);

    if (stats.toolStats) {
      console.log(`工具缓存: ${stats.toolStats.size}/${stats.toolStats.supportedTypes}`);
    }

    // 显示配置信息
    const llmConfig = config.getLLMConfig();
    console.log('');
    console.log('⚙️ 当前配置:');
    console.log(`LLM模型: ${llmConfig.model}`);
    console.log(`知识库: ${config.get('knowledge.enabled') ? '启用' : '禁用'}`);
    console.log(`缓存: ${config.get('ruleLearning.enabled') ? '启用' : '禁用'}`);
  }

  /**
   * 解析命令行选项
   * @param {Array<string>} args - 参数数组
   * @returns {Object} 解析后的选项
   */
  parseOptions(args) {
    const options = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      switch (arg) {
        case '--types':
        case '-t':
          if (i + 1 < args.length) {
            options.analysisTypes = args[++i].split(',');
          }
          break;

        case '--database':
        case '-d':
          if (i + 1 < args.length) {
            options.databaseType = args[++i];
          }
          break;

        case '--batch-size':
        case '-b':
          if (i + 1 < args.length) {
            options.batchSize = parseInt(args[++i]);
          }
          break;

        case '--recursive':
        case '-r':
          options.recursive = true;
          break;

        case '--no-cache':
          options.enableCache = false;
          break;

        case '--json':
        case '-j':
          options.outputFormat = 'json';
          break;

        case '--output':
        case '-o':
          if (i + 1 < args.length) {
            options.outputFile = args[++i];
          }
          break;

        case '--performance':
        case '-p':
          options.analysisTypes = ['performance'];
          break;

        case '--security':
        case '-s':
          options.analysisTypes = ['security'];
          break;

        case '--standards':
          options.analysisTypes = ['standards'];
          break;

        default:
          if (arg.startsWith('--')) {
            console.warn(`⚠️ 未知选项: ${arg}`);
          }
      }
    }

    return options;
  }

  /**
   * 显示文件分析结果
   * @param {Object} result - 分析结果
   */
  displayFileResults(result) {
    console.log('');
    console.log('📄 文件分析结果');
    console.log('='.repeat(50));
    console.log(`文件: ${result.fileInfo.fileName}`);
    console.log(`路径: ${result.fileInfo.filePath}`);
    console.log(`SQL语句数: ${result.stats.totalStatements}`);
    console.log(`成功分析: ${result.stats.successfulAnalyses}`);
    console.log(`总体评分: ${result.stats.overallScore}分`);
    console.log('');

    // 显示分析总结
    console.log('📋 分析总结:');
    console.log(result.analysis.summary);
    console.log('');

    // 显示问题
    if (result.analysis.issues && result.analysis.issues.length > 0) {
      console.log('⚠️ 发现的问题:');
      result.analysis.issues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.severity?.toUpperCase() || 'MEDIUM'}] ${issue.title || issue.description}`);
        if (issue.description && issue.title) {
          console.log(`   ${issue.description}`);
        }
      });
      console.log('');
    }

    // 显示建议
    if (result.analysis.recommendations && result.analysis.recommendations.length > 0) {
      console.log('💡 优化建议:');
      result.analysis.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority?.toUpperCase() || 'MEDIUM'}] ${rec.title || rec.description}`);
        if (rec.description && rec.title) {
          console.log(`   ${rec.description}`);
        }
      });
      console.log('');
    }

    // 显示置信度
    if (result.analysis.confidence > 0) {
      console.log(`🎯 分析置信度: ${(result.analysis.confidence * 100).toFixed(1)}%`);
    }
  }

  /**
   * 显示目录分析结果
   * @param {Object} result - 分析结果
   */
  displayDirectoryResults(result) {
    console.log('');
    console.log('📁 目录分析结果');
    console.log('='.repeat(50));
    console.log(`目录: ${result.directory}`);
    console.log(`文件数量: ${result.fileCount}`);
    console.log('');

    if (result.stats) {
      console.log('📊 统计信息:');
      console.log(`成功文件: ${result.stats.successfulFiles}`);
      console.log(`失败文件: ${result.stats.failedFiles}`);
      console.log(`SQL语句总数: ${result.stats.totalStatements}`);
      console.log(`问题总数: ${result.stats.totalIssues}`);
      console.log(`建议总数: ${result.stats.totalRecommendations}`);
      console.log(`平均评分: ${result.stats.averageScore}分`);
      console.log('');
    }

    // 显示每个文件的结果概要
    if (result.results && result.results.length > 0) {
      console.log('📄 文件分析概要:');
      result.results.forEach((fileResult, index) => {
        if (fileResult.success) {
          const score = fileResult.analysis?.overallScore || 0;
          const issues = (fileResult.analysis?.issues || []).length;
          console.log(`${index + 1}. ${fileResult.fileInfo?.fileName || 'Unknown'} - ${score}分 (${issues}个问题)`);
        } else {
          console.log(`${index + 1}. ${fileResult.fileName || 'Unknown'} - 分析失败`);
        }
      });
    }
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log('');
    console.log('🚀 SQL Analyzer CLI - SQL语句智能分析工具');
    console.log('');
    console.log('用法:');
    console.log('  sql-analyzer <command> [options]');
    console.log('');
    console.log('命令:');
    console.log('  analyze, a <file.sql>     分析单个SQL文件');
    console.log('  directory, dir, d <dir>  分析目录中的所有SQL文件');
    console.log('  stats, s                 显示分析器统计信息');
    console.log('  help, h                  显示帮助信息');
    console.log('  version, v               显示版本信息');
    console.log('');
    console.log('选项:');
    console.log('  --types, -t <types>       分析类型 (performance,security,standards)');
    console.log('  --database, -d <type>     数据库类型 (mysql,postgresql,oracle,sqlserver)');
    console.log('  --batch-size, -b <num>    批处理大小 (默认: 10)');
    console.log('  --recursive, -r          递归分析子目录');
    console.log('  --no-cache               禁用缓存');
    console.log('  --json, -j               输出JSON格式');
    console.log('  --output, -o <file>      输出到文件');
    console.log('  --performance, -p        仅执行性能分析');
    console.log('  --security, -s           仅执行安全分析');
    console.log('  --standards              仅执行规范检查');
    console.log('');
    console.log('示例:');
    console.log('  sql-analyzer analyze query.sql');
    console.log('  sql-analyzer analyze query.sql --types performance,security');
    console.log('  sql-analyzer directory ./sql-files --recursive');
    console.log('  sql-analyzer analyze query.sql --database mysql --json');
    console.log('  sql-analyzer stats');
  }

  /**
   * 显示版本信息
   */
  showVersion() {
    console.log('SQL Analyzer CLI v2.0.0');
    console.log('智能SQL分析工具，支持性能、安全和规范检查');
  }
}

// 如果直接运行此文件，则启动CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new SQLAnalyzerCLI();
  cli.run();
}

export default SQLAnalyzerCLI;