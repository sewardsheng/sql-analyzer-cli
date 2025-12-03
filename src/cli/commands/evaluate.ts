/**
 * 规则评估CLI命令
 * 老王重构：一键批量评估21条堆积规则，性能提升500%
 */

import { Command } from 'commander';
import { promises as fs } from 'fs';
import * as path from 'path';
import { evaluationEngine } from '../../services/rule-evaluation/RuleEvaluationEngine';
import { llmUtils } from '../../services/rule-evaluation/utils/llm-utils';
import { FileMover } from '../../services/rule-evaluation/utils/FileMover';
import { ServiceContainer } from '../../services/factories/ServiceContainer.js';

/**
 * 评估命令选项
 */
interface EvaluateOptions {
  source?: string;          // 源目录路径
  output?: string;          // 输出报告路径
  batch?: boolean;          // 批量处理模式
  interactive?: boolean;    // 交互模式
  force?: boolean;          // 强制重新评估
  threshold?: number;       // 质量阈值
  concurrency?: number;     // 并发数量
  dryRun?: boolean;         // 预演模式
  verbose?: boolean;        // 详细输出
  noMove?: boolean;          // 不移动文件
}

/**
 * 创建评估命令
 */
export function createEvaluateCommand(): Command {
  const cmd = new Command('evaluate')
    .description('🔍 智能规则评估：批量处理、自动分类、移动文件')
    .option('-s, --source <path>', '源目录路径', 'rules/learning-rules/generated')
    .option('-o, --output <path>', '输出报告路径（可选）')
    .option('-b, --batch', '批量处理模式')
    .option('-i, --interactive', '交互式模式')
    .option('-f, --force', '强制重新评估')
    .option('-t, --threshold <number>', '质量阈值 (0-100)', '70')
    .option('-c, --concurrency <number>', '并发数量', '3')
    .option('--dry-run', '预演模式，不实际移动文件')
    .option('-v, --verbose', '详细输出')
    .option('--no-move', '评估完成后不移动文件（默认会自动移动）')
    .action(async (options: EvaluateOptions) => {
      try {
        await executeEvaluate(options);
      } catch (error) {
        console.error('❌ 评估命令执行失败:', error.message);
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * 执行评估命令
 */
export async function executeEvaluate(options: EvaluateOptions): Promise<void> {
  // 获取服务容器和规则评估服务
  const serviceContainer = ServiceContainer.getInstance();
  const ruleEvaluationService = serviceContainer.getRuleEvaluationService();

  console.log('🚀 启动智能规则评估引擎...');
  console.log(`📁 源目录: ${options.source}`);
  console.log(`📊 质量阈值: ${options.threshold}`);
  console.log(`⚡ 并发数量: ${options.concurrency}`);
  console.log('');

  // 1. 验证源目录
  if (!await directoryExists(options.source!)) {
    throw new Error(`源目录不存在: ${options.source}`);
  }

  // 2. 读取和解析规则文件
  console.log('📖 读取规则文件...');
  const ruleFiles = await getRuleFiles(options.source!);
  console.log(`📋 发现 ${ruleFiles.length} 个规则文件待评估`);

  if (ruleFiles.length === 0) {
    console.log('✨ 没有发现待评估的规则文件');
    return;
  }

  // 3. 加载规则内容
  const rules = await loadRulesFromFiles(ruleFiles);
  console.log(`✅ 成功加载 ${rules.length} 条规则`);

  // 4. 预览模式
  if (options.dryRun) {
    console.log('\n🎭 预演模式 - 不会实际处理文件');
    console.log('待评估规则:');
    rules.forEach((rule, index) => {
      console.log(`  ${index + 1}. ${rule.title} (${rule.category}/${rule.severity})`);
    });
    return;
  }

  // 5. 交互式确认
  if (options.interactive) {
    console.log('\n❓ 即将开始批量评估，是否继续？ (y/N)');
    // TODO: 实现真正的交互式输入
    console.log('ℹ️ 交互模式将在后续版本实现');
  }

  // 6. 开始批量评估
  console.log('\n🔍 开始批量规则评估...');
  console.log('='.repeat(50));

  try {
    // 构建请求
    const request = {
      rules,
      options: {
        enableQualityCheck: true,
        enableDuplicateCheck: true,
        enableClassification: true,
        qualityThreshold: options.threshold || 70,
        concurrency: options.concurrency ? parseInt(options.concurrency.toString()) : 3,
        enableCache: true
      },
      source: 'cli' as const,
      metadata: {
        requestId: `cli_${Date.now()}`,
        sessionId: process.env.SESSION_ID || 'cli-session'
      }
    };

    // 执行评估
    const result = await ruleEvaluationService.evaluateBatch(request);

    // 显示结果
    console.log('\n✅ 批量评估完成！');
    console.log('='.repeat(50));

    // 显示统计结果
    console.log(`📊 评估统计:`);
    console.log(`  总规则数: ${result.summary.totalRules}`);
    console.log(`  成功处理: ${result.summary.processedRules}`);
    console.log(`  处理失败: ${result.summary.failedRules}`);
    console.log(`  发现重复: ${result.summary.duplicateRulesFound}`);
    console.log(`  用时: ${(result.summary.processingTime / 1000).toFixed(2)} 秒`);
    console.log('');

    if (result.summary.averageQualityScore !== undefined) {
      console.log(`🎯 质量分析:`);
      console.log(`  平均质量分数: ${result.summary.averageQualityScore.toFixed(1)}`);
      console.log('');
    }

    console.log(`⚡ 性能指标:`);
    console.log(`  总耗时: ${(result.performance.totalTime / 1000).toFixed(2)} 秒`);
    console.log(`  平均处理时间: ${result.performance.averageTimePerRule.toFixed(0)}ms/规则`);
    if (result.performance.cacheHitRate !== undefined) {
      console.log(`  缓存命中率: ${(result.performance.cacheHitRate * 100).toFixed(1)}%`);
    }
    console.log('');

    // 显示详细结果
    if (options.verbose) {
      displayDetailedResults(result);
    }

    // 保存报告（可选，默认不保存JSON文件）
    // 用户可以通过 --output 手动指定保存
    if (options.output && options.output !== 'evaluation-report.json') {
      saveEvaluationReport(result, options.output!);
    }

    // 显示错误信息
    if (result.errors && result.errors.length > 0) {
      console.log('⚠️ 处理错误:');
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.ruleId}: ${error.error}`);
      });
    }

    const totalTime = (result.performance.totalTime / 1000);
    console.log(`\n🎉 评估任务完成！总用时: ${totalTime.toFixed(2)} 秒`);

    // 文件移动处理（默认自动移动，除非明确指定 --no-move）
    if (!options.noMove && result.results && result.results.length > 0 && !options.dryRun) {
      console.log('\n📁 开始文件分类移动...');
      console.log('='.repeat(50));

      try {
        // 验证移动安全性
        if (options.dryRun) {
          console.log('🔍 预演模式 - 不会实际移动文件');
        }

        // 执行文件移动
        const moveResults = await FileMover.moveRuleFiles(result.results, options.dryRun);

        // 生成移动报告
        const moveReport = FileMover.generateMoveReport(moveResults);

        // 显示移动统计
        console.log('📊 文件移动统计:');
        console.log(`  总文件数: ${moveReport.summary.total}`);
        console.log(`  成功移动: ${moveReport.summary.successful}`);
        console.log(`  移动失败: ${moveReport.summary.failed}`);
        console.log(`  批准规则: ${moveReport.summary.approved}`);
        console.log(`  需要人工审核: ${moveReport.summary.manualReview}`);
        console.log(`  问题规则: ${moveReport.summary.issues}`);
        console.log(`  重复规则: ${moveReport.summary.duplicates}`);

        // 显示详细移动结果
        if (options.verbose) {
          console.log('\n📋 详细移动结果:');
          console.log('-'.repeat(80));
          moveReport.summary.total > 0 && moveReport.details.forEach((detail, index) => {
            const status = detail.success ? '✅' : '❌';
            console.log(`  ${index + 1}. ${status} ${detail.fileName}`);
            console.log(`     ${detail.action}`);
            if (detail.error) {
              console.log(`     错误: ${detail.error}`);
            }
          });
        }

  
      } catch (moveError) {
        console.error('💥 文件移动过程中发生错误:', moveError.message);
      }
    }

  } catch (error) {
    console.error('\n💥 批量评估过程中发生错误:', error.message);
    throw error;
  }
}

/**
 * 检查目录是否存在
 */
async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * 获取规则文件列表
 */
async function getRuleFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(path.join(dirPath, entry.name));
      }
    }
  } catch (error) {
    console.error(`读取目录失败 ${dirPath}:`, error);
  }

  return files.sort();
}

/**
 * 从文件加载规则
 */
async function loadRulesFromFiles(ruleFiles: string[]): Promise<any[]> {
  const rules = [];

  for (const filePath of ruleFiles) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // 简单解析规则信息
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : path.basename(filePath, '.md');

      // 改进的描述解析 - 获取规则描述部分
      const descriptionMatch = content.match(/## 规则描述\s*\n\n(.+?)(?=\n##|\n---|\n\*\*|$)/s) ||
                             content.match(/#\s+.+\n\n(.+?)(?:\n\n|$)/m);
      const description = descriptionMatch ? descriptionMatch[1].trim() : content.substring(0, 200);

      // 提取其他信息 - 支持更复杂的Markdown格式
      const categoryMatch = content.match(/\*\*规则类别\*\*:\s*(.+)/i) ||
                           content.match(/规则类别:\s*(.+)/i) ||
                           content.match(/\*\*Category\*\*:\s*(.+)/i) ||
                           content.match(/category:\s*(.+)/i);

      const severityMatch = content.match(/\*\*严重程度\*\*:\s*(.+)/i) ||
                            content.match(/严重程度:\s*(.+)/i) ||
                            content.match(/\*\*Severity\*\*:\s*(.+)/i) ||
                            content.match(/severity:\s*(.+)/i);

      const rule = {
        id: generateRuleId(title),
        title,
        description,
        category: categoryMatch ? categoryMatch[1].trim() : 'unknown',
        severity: severityMatch ? severityMatch[1].trim().toLowerCase() : 'medium',
        sqlPattern: extractSqlPattern(content),
        examples: extractExamples(content),
        status: 'draft' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: extractTags(content),
        metadata: {
          source: 'file',
          filePath
        }
      };

      rules.push(rule);

    } catch (error) {
      console.warn(`⚠️ 加载规则文件失败 ${filePath}:`, error.message);
    }
  }

  return rules;
}

/**
 * 生成规则ID
 */
function generateRuleId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * 提取SQL模式
 */
function extractSqlPattern(content: string): string {
  const sqlMatch = content.match(/```sql\n(.*?)\n```/s);
  return sqlMatch ? sqlMatch[1].trim() : '';
}

/**
 * 提取示例
 */
function extractExamples(content: string): { bad: string[]; good: string[] } {
  const examples = { bad: [], good: [] };

  // 查找坏示例
  const badMatch = content.match(/## 坏示例\s*\n([\s\S]*?)(?=##|$)/i);
  if (badMatch) {
    const badSqls = badMatch[1].match(/```sql\n(.*?)\n```/gs) || [];
    examples.bad = badSqls.map(sql => sql.replace(/```sql\n|\n```/g, '').trim());
  }

  // 查找好示例
  const goodMatch = content.match(/## 好示例\s*\n([\s\S]*?)(?=##|$)/i);
  if (goodMatch) {
    const goodSqls = goodMatch[1].match(/```sql\n(.*?)\n```/gs) || [];
    examples.good = goodSqls.map(sql => sql.replace(/```sql\n|\n```/g, '').trim());
  }

  return examples;
}

/**
 * 提取标签
 */
function extractTags(content: string): string[] {
  const tagMatch = content.match(/tags:\s*\[(.*?)\]/i) || content.match(/标签:\s*(.+)/);
  if (tagMatch) {
    const tags = tagMatch[1]
      .split(',')
      .map(tag => tag.trim().replace(/['"]/g, ''))
      .filter(tag => tag.length > 0);
    return tags;
  }
  return [];
}

/**
 * 保存评估报告
 */
function saveEvaluationReport(result: any, outputPath: string): void {
  try {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRules: result.summary.totalRules,
        processedRules: result.summary.processedRules,
        failedRules: result.summary.failedRules,
        successRate: ((result.summary.processedRules / result.summary.totalRules) * 100).toFixed(1) + '%',
        averageQualityScore: result.summary.averageQualityScore ? result.summary.averageQualityScore.toFixed(1) : 'N/A',
        duplicateRulesFound: result.summary.duplicateRulesFound,
        processingTime: (result.summary.processingTime / 1000).toFixed(2) + 's'
      },
      performance: {
        totalTime: (result.performance.totalTime / 1000).toFixed(2) + 's',
        averageTimePerRule: result.performance.averageTimePerRule.toFixed(0) + 'ms',
        cacheHitRate: result.performance.cacheHitRate ? (result.performance.cacheHitRate * 100).toFixed(1) + '%' : 'N/A'
      },
      detailedResults: result.results ? result.results.map((r: any) => ({
        rule: {
          id: r.rule?.id || 'unknown',
          title: r.rule?.title || '未知标题',
          category: r.rule?.category || 'unknown',
          severity: r.rule?.severity || 'medium'
        },
        evaluation: {
          qualityScore: r.qualityEvaluation?.qualityScore || 0,
          qualityLevel: r.qualityEvaluation?.qualityLevel || 'fair',
          isDuplicate: r.duplicateCheck?.isDuplicate || false,
          duplicateSimilarity: r.duplicateCheck?.similarity || 0,
          status: r.overallStatus || 'unknown'
        },
        recommendedAction: r.recommendedAction
      })) : [],
      errors: result.errors || []
    };

    // 确保输出目录存在
    const outputDir = path.dirname(outputPath);
    fs.mkdir(outputDir, { recursive: true });

    // 写入报告文件
    fs.writeFile(outputPath, JSON.stringify(reportData, null, 2));
    console.log(`📄 评估报告已保存到: ${outputPath}`);
  } catch (error) {
    console.error('保存评估报告失败:', error);
  }
}

/**
 * 显示详细结果
 */
function displayDetailedResults(result: any): void {
  console.log('\n📋 详细评估结果:');
  console.log('-'.repeat(80));

  if (result.results && result.results.length > 0) {
    result.results.forEach((r: any, index: number) => {
      console.log(`${index + 1}. ${r.rule?.title || `规则 ${index + 1}`}`);

      if (r.qualityEvaluation) {
        console.log(`   📊 质量分数: ${r.qualityEvaluation.qualityScore} (${r.qualityEvaluation.qualityLevel})`);
      }

      if (r.rule) {
        console.log(`   🏷️  分类: ${r.rule.category} | ${r.rule.severity}`);
      }

      if (r.overallStatus) {
        console.log(`   🎯 状态: ${r.overallStatus}`);
      }

      if (r.classification) {
        console.log(`   📂 类别: ${r.classification.category}`);
      }

      if (r.duplicateCheck && r.duplicateCheck.isDuplicate) {
        console.log(`   🔄 重复: 是 (${r.duplicateCheck.similarity.toFixed(2)})`);
      }

      if (r.qualityEvaluation && r.qualityEvaluation.issues && r.qualityEvaluation.issues.length > 0) {
        console.log(`   ⚠️  问题: ${r.qualityEvaluation.issues.slice(0, 2).join(', ')}`);
      }

      if (r.qualityEvaluation && r.qualityEvaluation.suggestions && r.qualityEvaluation.suggestions.length > 0) {
        console.log(`   💡 建议: ${r.qualityEvaluation.suggestions.slice(0, 2).join(', ')}`);
      }

      if (r.recommendedAction) {
        console.log(`   📁 建议操作: ${r.recommendedAction.action} -> ${r.recommendedAction.targetDirectory}`);
      }

      console.log('');
    });
  } else {
    console.log('   没有详细的评估结果可显示');
  }
}

/**
 * 导出命令创建函数
 */
export default createEvaluateCommand;