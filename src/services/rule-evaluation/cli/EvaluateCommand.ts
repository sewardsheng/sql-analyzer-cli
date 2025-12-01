/**
 * 规则评估CLI命令模块
 * 老王我把新的评估命令集成到CLI系统中了！
 */

import { join, resolve } from 'path';
import { cli as cliTools } from '../../../utils/cli/index.js';
import { RuleEvaluationEngine, getRuleEvaluationEngine } from '../RuleEvaluationEngine.js';
import { getEvaluationConfigManager } from '../config/EvaluationConfig.js';

/**
 * 规则评估命令类
 */
export class EvaluateCommand {
  private engine: RuleEvaluationEngine;

  constructor(engine?: RuleEvaluationEngine) {
    this.engine = engine || getRuleEvaluationEngine();
    this.setupEventHandlers();
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 批次开始事件
    this.engine.on('batch:started', (data) => {
      cliTools.log.info(`🚀 开始批量评估，共 ${data.totalRules} 条规则`);
      cliTools.log.info(`📁 源目录: ${data.sourceDirectory}`);
    });

    // 批次进度事件
    this.engine.on('batch:progress', (data) => {
      const progressBar = this.createProgressBar(data.processed, data.total, data.percentage);
      cliTools.log.info(`📊 进度: ${progressBar}`);
    });

    // 批次完成事件
    this.engine.on('batch:completed', (data) => {
      const result = data.result;
      cliTools.log.success(`✅ 批量评估完成！`);
      cliTools.log.info(`📈 处理统计:`);
      cliTools.log.info(`   总规则数: ${result.summary.totalRules}`);
      cliTools.log.info(`   成功处理: ${result.summary.successfulRules}`);
      cliTools.log.info(`   处理时间: ${result.summary.totalProcessingTime}ms`);
      cliTools.log.info(`   平均耗时: ${result.summary.averageProcessingTime}ms/规则`);

      if (result.statistics.scores.averageQualityScore > 0) {
        cliTools.log.info(`📊 质量分析:`);
        cliTools.log.info(`   平均质量分数: ${result.statistics.scores.averageQualityScore}`);
        cliTools.log.info(`   最高分数: ${result.statistics.scores.highestScore}`);
        cliTools.log.info(`   最低分数: ${result.statistics.scores.lowestScore}`);
      }

      this.displayClassificationDistribution(result.statistics.distribution.byClassification);
    });

    // 规则开始事件
    this.engine.on('rule:started', (data) => {
      cliTools.log.debug(`🔍 开始处理: ${data.ruleId}`);
    });

    // 规则完成事件
    this.engine.on('rule:completed', (data) => {
      const result = data.result;
      const status = result.recommendation.action === 'keep' ? '✅' :
                   result.recommendation.action === 'discard' ? '❌' : '⚠️';

      cliTools.log.debug(`${status} ${data.ruleId}: ${result.recommendation.reason}`);
    });

    // 规则失败事件
    this.engine.on('rule:failed', (data) => {
      cliTools.log.warn(`⚠️ 规则处理失败: ${data.ruleId} - ${data.error.message}`);
    });

    // 错误事件
    this.engine.on('error:occurred', (data) => {
      cliTools.log.error(`❌ 处理错误 (${data.stage}): ${data.error.message}`);
    });
  }

  /**
   * 执行评估命令
   */
  async execute(options: any): Promise<void> {
    try {
      cliTools.log.info('🔧 规则评估引擎启动中...');

      // 显示配置信息
      if (options.verbose) {
        this.displayConfiguration();
      }

      // 确定源目录
      const sourceDirectory = this.resolveSourceDirectory(options);
      cliTools.log.info(`📂 扫描目录: ${sourceDirectory}`);

      // 检查目录是否存在
      const { existsSync } = await import('fs');
      if (!existsSync(sourceDirectory)) {
        throw new Error(`源目录不存在: ${sourceDirectory}`);
      }

      // 设置处理选项
      const processOptions = {
        dryRun: options.dryRun || false,
        parallel: options.parallel || false,
        filter: this.createFileFilter(options)
      };

      if (options.dryRun) {
        cliTools.log.warn('🔍 干运行模式：不会实际移动文件');
      }

      // 执行批量处理
      const result = await this.engine.processBatch(sourceDirectory, processOptions);

      // 显示详细报告
      if (options.detailed || options.report) {
        await this.displayDetailedReport(result, options);
      }

      // 生成报告文件
      if (options.output) {
        await this.saveReportToFile(result, options.output);
      }

      cliTools.log.success('🎉 规则评估命令执行完成！');

    } catch (error: any) {
      cliTools.log.error(`❌ 规则评估失败: ${error.message}`);

      if (options.debug) {
        console.error('\n调试信息:');
        console.error(error.stack);
      }

      throw error;
    }
  }

  /**
   * 解析源目录
   */
  private resolveSourceDirectory(options: any): string {
    if (options.source) {
      return resolve(options.source);
    }

    // 默认使用manual_review目录的当前月份
    const config = getEvaluationConfigManager().getClassificationConfig();
    const currentDate = new Date().toISOString().substring(0, 7); // yyyy-MM

    return join(config.directories.baseDir, config.directories.manualReview, currentDate);
  }

  /**
   * 创建文件过滤器
   */
  private createFileFilter(options: any): ((fileInfo: { name: string; path: string }) => boolean) | undefined {
    if (!options.category && !options.severity && !options.database) {
      return undefined;
    }

    return (fileInfo) => {
      // 简化实现，后续可以扩展基于文件内容的过滤
      let matches = true;

      if (options.category) {
        const categories = Array.isArray(options.category) ? options.category : [options.category];
        matches = matches && categories.some(cat => fileInfo.name.toLowerCase().includes(cat.toLowerCase()));
      }

      if (options.severity) {
        const severities = Array.isArray(options.severity) ? options.severity : [options.severity];
        matches = matches && severities.some(sev => fileInfo.name.toLowerCase().includes(sev.toLowerCase()));
      }

      if (options.database) {
        const databases = Array.isArray(options.database) ? options.database : [options.database];
        matches = matches && databases.some(db => fileInfo.name.toLowerCase().includes(db.toLowerCase()));
      }

      return matches;
    };
  }

  /**
   * 显示配置信息
   */
  private displayConfiguration(): void {
    const configManager = getEvaluationConfigManager();
    const summary = configManager.getConfigSummary();

    console.log(cliTools.colors.cyan('\n⚙️ 评估引擎配置:'));
    console.log(summary);
  }

  /**
   * 创建进度条
   */
  private createProgressBar(processed: number, total: number, percentage: number): string {
    const barWidth = 30;
    const filledWidth = Math.round((percentage / 100) * barWidth);
    const emptyWidth = barWidth - filledWidth;

    const filledBar = '█'.repeat(filledWidth);
    const emptyBar = '░'.repeat(emptyWidth);

    const color = percentage >= 80 ? 'green' : percentage >= 50 ? 'yellow' : 'red';
    const coloredBar = cliTools.colors[color](`${filledBar}${emptyBar}`);

    return `${processed}/${total} (${percentage}%) ${coloredBar}`;
  }

  /**
   * 显示分类分布
   */
  private displayClassificationDistribution(distribution: { [key: string]: number }): void {
    if (Object.keys(distribution).length === 0) return;

    console.log(cliTools.colors.cyan('\n📋 分类结果分布:'));

    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);

    Object.entries(distribution).forEach(([category, count]) => {
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      const categoryIcon = this.getCategoryIcon(category);
      const categoryName = this.getCategoryName(category);

      console.log(`   ${categoryIcon} ${categoryName}: ${count} (${percentage}%)`);
    });
  }

  /**
   * 获取分类图标
   */
  private getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      approved: '✅',
      duplicate: '🔄',
      low_quality: '⚠️',
      invalid_format: '❌'
    };
    return icons[category] || '📄';
  }

  /**
   * 获取分类名称
   */
  private getCategoryName(category: string): string {
    const names: { [key: string]: string } = {
      approved: '通过审核',
      duplicate: '重复规则',
      low_quality: '低质量',
      invalid_format: '格式错误'
    };
    return names[category] || category;
  }

  /**
   * 显示详细报告
   */
  private async displayDetailedReport(result: any, options: any): Promise<void> {
    console.log(cliTools.colors.cyan('\n📊 详细评估报告:'));
    console.log('=' .repeat(50));

    // 概览信息
    console.log(cliTools.colors.yellow('\n📈 执行概览:'));
    console.log(`源目录: ${result.metadata.configuration.sourceDirectory}`);
    console.log(`处理模式: ${result.metadata.configuration.options.dryRun ? '干运行' : '实际执行'}`);
    console.log(`并行处理: ${result.metadata.configuration.options.parallelProcessing ? '启用' : '禁用'}`);
    console.log(`缓存启用: ${result.metadata.configuration.options.enableCache ? '启用' : '禁用'}`);

    // 质量分析
    if (result.report.detailedAnalysis.qualityAnalysis) {
      console.log(cliTools.colors.yellow('\n🎯 质量分析:'));
      console.log(`总体质量: ${result.report.detailedAnalysis.qualityAnalysis.overallQuality}`);
      console.log(`平均分数: ${result.statistics.scores.averageQualityScore}`);

      if (result.report.detailedAnalysis.qualityAnalysis.improvementAreas.length > 0) {
        console.log('改进领域:');
        result.report.detailedAnalysis.qualityAnalysis.improvementAreas.forEach((area: string) => {
          console.log(`  - ${area}`);
        });
      }
    }

    // 重复性分析
    if (result.report.detailedAnalysis.duplicateAnalysis) {
      console.log(cliTools.colors.yellow('\n🔄 重复性分析:'));
      console.log(`重复摘要: ${result.report.detailedAnalysis.duplicateAnalysis.duplicateSummary}`);
      console.log(`重复规则数: ${result.statistics.duplicates.totalDuplicates}`);
      console.log(`重复率: ${result.statistics.duplicates.duplicateRate}%`);
    }

    // 处理的规则详情
    if (options.verbose && result.results.length > 0) {
      console.log(cliTools.colors.yellow('\n📋 规则处理详情:'));
      result.results.slice(0, 10).forEach((ruleResult: any, index: number) => {
        const rule = ruleResult.rule;
        const classification = ruleResult.classification;

        console.log(`\n${index + 1}. ${cliTools.colors.cyan(rule.title)}`);
        console.log(`   文件: ${rule.fileName}`);
        console.log(`   类别: ${rule.category} | 严重度: ${rule.severity}`);
        console.log(`   质量分数: ${ruleResult.qualityEvaluation.qualityScore}`);
        console.log(`   分类结果: ${this.getCategoryName(classification.category)}`);
        console.log(`   目标路径: ${classification.targetPath}`);
        console.log(`   建议: ${ruleResult.recommendation.reason}`);
      });

      if (result.results.length > 10) {
        console.log(`\n... 还有 ${result.results.length - 10} 条规则未显示`);
      }
    }

    // 建议和下一步
    if (result.report.recommendations.length > 0) {
      console.log(cliTools.colors.yellow('\n💡 建议和下一步:'));
      result.report.recommendations.forEach((rec: any, index: number) => {
        console.log(`${index + 1}. ${rec.title}`);
        console.log(`   ${rec.description}`);
        if (rec.expectedOutcome) {
          console.log(`   预期效果: ${rec.expectedOutcome}`);
        }
      });
    }
  }

  /**
   * 保存报告到文件
   */
  private async saveReportToFile(result: any, outputPath: string): Promise<void> {
    try {
      const { writeFileSync } = await import('fs');
      const resolvedPath = resolve(outputPath);

      let reportContent: string;

      if (outputPath.endsWith('.json')) {
        reportContent = JSON.stringify(result, null, 2);
      } else {
        reportContent = this.generateMarkdownReport(result);
      }

      writeFileSync(resolvedPath, reportContent, 'utf-8');
      cliTools.log.success(`📄 报告已保存到: ${resolvedPath}`);

    } catch (error: any) {
      cliTools.log.warn(`⚠️  保存报告失败: ${error.message}`);
    }
  }

  /**
   * 生成Markdown格式报告
   */
  private generateMarkdownReport(result: any): string {
    const date = new Date().toLocaleDateString('zh-CN');

    return `# 规则评估报告

**生成时间**: ${date}
**批次ID**: ${result.metadata.batchId}
**源目录**: ${result.metadata.configuration.sourceDirectory}

## 执行概览

- **总规则数**: ${result.summary.totalRules}
- **成功处理**: ${result.summary.successfulRules}
- **处理时间**: ${result.summary.totalProcessingTime}ms
- **平均耗时**: ${result.summary.averageProcessingTime}ms/规则

## 分类结果分布

${Object.entries(result.statistics.distribution.byClassification)
  .map(([category, count]) =>
    `- **${this.getCategoryName(category)}**: ${count}`
  ).join('\n')}

## 质量分析

- **平均质量分数**: ${result.statistics.scores.averageQualityScore}
- **最高分数**: ${result.statistics.scores.highestScore}
- **最低分数**: ${result.statistics.scores.lowestScore}
- **总体质量**: ${result.report.detailedAnalysis.qualityAnalysis.overallQuality}

## 详细结果

${result.results.slice(0, 20).map((ruleResult: any, index: number) => {
  const rule = ruleResult.rule;
  const classification = ruleResult.classification;

  return `### ${index + 1}. ${rule.title}

- **文件**: ${rule.fileName}
- **类别**: ${rule.category} | **严重度**: ${rule.severity}
- **质量分数**: ${ruleResult.qualityEvaluation.qualityScore}
- **分类结果**: ${this.getCategoryName(classification.category)}
- **建议**: ${ruleResult.recommendation.reason}
`;
}).join('\n')}

${result.results.length > 20 ? `\n... *还有 ${result.results.length - 20} 条规则未显示*` : ''}

---
*此报告由规则评估引擎自动生成*
`;
  }

  /**
   * 显示帮助信息
   */
  static showHelp(): void {
    console.log(cliTools.colors.cyan(`
🔧 规则评估命令帮助

用法:
  sql-analyzer evaluate [选项]

选项:
  -s, --source <directory>      指定源目录 (默认: manual_review/yyyy-mm)
  -o, --output <file>          输出报告到文件 (.json 或 .md)
  --category <categories>       按类别过滤 (逗号分隔)
  --severity <severities>       按严重程度过滤 (逗号分隔)
  --database <databases>        按数据库类型过滤 (逗号分隔)
  --dry-run                     干运行模式，不实际移动文件
  --parallel                    启用并行处理
  --detailed                    显示详细报告
  --verbose                     显示配置信息和调试信息
  --debug                       显示错误堆栈
  --report                      生成完整报告

示例:
  sql-analyzer evaluate                           # 评估默认目录
  sql-analyzer evaluate --source ./rules         # 评估指定目录
  sql-analyzer evaluate --dry-run --detailed     # 干运行并显示详情
  sql-analyzer evaluate --parallel --category performance  # 并行处理性能类规则
  sql-analyzer evaluate --output report.md       # 输出Markdown报告

配置:
  配置文件位置: ./rule-evaluation.config.json
  使用 --verbose 查看当前配置
`));
  }
}

export default EvaluateCommand;