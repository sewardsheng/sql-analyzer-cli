import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { readConfig } from '../config/index.js';
import IntelligentRuleLearner from '../../core/analyzers/intelligentRuleLearner.js';

/**
 * 评估规则文件质量
 * @param {Object} options - 命令行选项
 * @param {string} options.file - 要评估的特定规则文件
 * @param {boolean} options.all - 是否评估所有规则文件
 * @param {boolean} options.report - 是否生成详细报告
 * @param {string} options.rulesDir - 规则目录路径
 */
async function evaluateRules(options = {}) {
  try {
    console.clear();
    console.log(chalk.cyan(`
╔═════════════════════════════════════════════════════════════╗
║                      规则质量评估                           ║
╚═════════════════════════════════════════════════════════════╝
`));

    const rulesDir = options.rulesDir || './rules/learning-rules';
    const issuesDir = path.join(rulesDir, 'issues');

    // 检查目录是否存在
    try {
      await fs.access(issuesDir);
    } catch (error) {
      console.log(chalk.red(`规则目录不存在: ${issuesDir}`));
      return;
    }

    // 获取所有规则文件
    const filesToEvaluate = await getAllRuleFiles(issuesDir);

    if (filesToEvaluate.length === 0) {
      console.log(chalk.yellow('没有找到规则文件'));
      return;
    }

    console.log(chalk.blue(`找到 ${filesToEvaluate.length} 个规则文件\n`));

    // 读取配置
    const config = await readConfig();
    
    // 初始化规则学习器
    const learner = new IntelligentRuleLearner({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      model: config.model
    });

    // 评估结果统计
    const evaluationResults = [];
    let totalScore = 0;
    let evaluatedCount = 0;

    // 逐个评估规则文件
    for (const filePath of filesToEvaluate) {
      const spinner = ora(`评估: ${path.basename(filePath)}`).start();
      
      try {
        // 读取规则文件内容
        const fileContent = await fs.readFile(filePath, 'utf8');
        
        // 评估规则质量
        const evaluation = await learner.evaluateRuleQuality({
          filePath,
          content: fileContent
        });

        if (evaluation.success) {
          const score = evaluation.data.qualityScore;
          totalScore += score;
          evaluatedCount++;

          evaluationResults.push({
            file: path.basename(filePath),
            path: filePath,
            score: score,
            level: evaluation.data.qualityLevel,
            issues: evaluation.data.issues || [],
            strengths: evaluation.data.strengths || [],
            recommendations: evaluation.data.recommendations || []
          });

          // 根据分数显示不同颜色
          const scoreColor = score >= 80 ? chalk.green : 
                           score >= 60 ? chalk.yellow : 
                           chalk.red;
          
          spinner.succeed(`${path.basename(filePath)}: ${scoreColor(score + '/100')} (${evaluation.data.qualityLevel})`);
        } else {
          spinner.fail(`${path.basename(filePath)}: 评估失败`);
          console.log(chalk.red(`  错误: ${evaluation.error}`));
        }
      } catch (error) {
        spinner.fail(`${path.basename(filePath)}: 评估出错`);
        console.log(chalk.red(`  错误: ${error.message}`));
      }
    }

    // 显示总体统计
    if (evaluatedCount > 0) {
      const avgScore = Math.round(totalScore / evaluatedCount);
      console.log(chalk.blue(`\n═══════════════════════════════════════════════════════════`));
      console.log(chalk.blue(`评估完成统计:`));
      console.log(chalk.white(`  • 总文件数: ${evaluatedCount}`));
      console.log(chalk.white(`  • 平均分数: ${avgScore}/100`));
      console.log(chalk.white(`  • 高质量 (≥80): ${evaluationResults.filter(r => r.score >= 80).length}`));
      console.log(chalk.white(`  • 中等质量 (60-79): ${evaluationResults.filter(r => r.score >= 60 && r.score < 80).length}`));
      console.log(chalk.white(`  • 低质量 (<60): ${evaluationResults.filter(r => r.score < 60).length}`));
      console.log(chalk.blue(`═══════════════════════════════════════════════════════════\n`));
    }

    // 生成详细报告
    if (options.report) {
      await generateEvaluationReport(evaluationResults, rulesDir);
    }

    // 显示低质量规则详情
    const lowQualityRules = evaluationResults.filter(r => r.score < 60);
    if (lowQualityRules.length > 0) {
      console.log(chalk.yellow(`\n发现 ${lowQualityRules.length} 个低质量规则:`));
      lowQualityRules.forEach(rule => {
        console.log(chalk.red(`\n  • ${rule.file} (${rule.score}/100)`));
        if (rule.issues.length > 0) {
          console.log(chalk.gray(`    问题:`));
          rule.issues.slice(0, 3).forEach(issue => {
            console.log(chalk.gray(`      - ${issue}`));
          });
        }
      });
      console.log(chalk.yellow(`\n💡 提示: 使用 "sql-analyzer learn cleanup" 命令清理这些低质量规则\n`));
    }

  } catch (error) {
    console.error(chalk.red('评估规则时发生错误:'), error.message);
    throw error;
  }
}

/**
 * 获取所有规则文件
 * @param {string} issuesDir - issues目录路径
 * @returns {Promise<string[]>} 规则文件路径数组
 */
async function getAllRuleFiles(issuesDir) {
  const files = [];
  
  try {
    const months = await fs.readdir(issuesDir);
    
    for (const month of months) {
      const monthPath = path.join(issuesDir, month);
      const stat = await fs.stat(monthPath);
      
      if (stat.isDirectory()) {
        const monthFiles = await fs.readdir(monthPath);
        for (const file of monthFiles) {
          if (file.endsWith('.md')) {
            files.push(path.join(monthPath, file));
          }
        }
      }
    }
  } catch (error) {
    console.error('读取规则文件时出错:', error);
  }
  
  return files;
}

/**
 * 生成评估报告
 * @param {Array} evaluationResults - 评估结果数组
 * @param {string} rulesDir - 规则目录
 */
async function generateEvaluationReport(evaluationResults, rulesDir) {
  try {
    const reportPath = path.join(rulesDir, 'evaluation-report.md');
    const timestamp = new Date().toISOString();
    
    let report = `# 规则质量评估报告\n\n`;
    report += `**生成时间**: ${timestamp}\n\n`;
    report += `## 评估概览\n\n`;
    
    const avgScore = Math.round(evaluationResults.reduce((sum, r) => sum + r.score, 0) / evaluationResults.length);
    const highQuality = evaluationResults.filter(r => r.score >= 80).length;
    const mediumQuality = evaluationResults.filter(r => r.score >= 60 && r.score < 80).length;
    const lowQuality = evaluationResults.filter(r => r.score < 60).length;
    
    report += `- 总文件数: ${evaluationResults.length}\n`;
    report += `- 平均分数: ${avgScore}/100\n`;
    report += `- 高质量规则 (≥80分): ${highQuality}\n`;
    report += `- 中等质量规则 (60-79分): ${mediumQuality}\n`;
    report += `- 低质量规则 (<60分): ${lowQuality}\n\n`;
    
    report += `## 详细评估结果\n\n`;
    
    // 按分数排序
    evaluationResults.sort((a, b) => b.score - a.score);
    
    evaluationResults.forEach((result, index) => {
      report += `### ${index + 1}. ${result.file}\n\n`;
      report += `- **评分**: ${result.score}/100\n`;
      report += `- **质量等级**: ${result.level}\n`;
      report += `- **文件路径**: \`${result.path}\`\n\n`;
      
      if (result.strengths && result.strengths.length > 0) {
        report += `**优点**:\n`;
        result.strengths.forEach(strength => {
          report += `- ${strength}\n`;
        });
        report += `\n`;
      }
      
      if (result.issues && result.issues.length > 0) {
        report += `**问题**:\n`;
        result.issues.forEach(issue => {
          report += `- ${issue}\n`;
        });
        report += `\n`;
      }
      
      if (result.recommendations && result.recommendations.length > 0) {
        report += `**改进建议**:\n`;
        result.recommendations.forEach(rec => {
          report += `- ${rec}\n`;
        });
        report += `\n`;
      }
      
      report += `---\n\n`;
    });
    
    await fs.writeFile(reportPath, report, 'utf8');
    console.log(chalk.green(`\n✅ 详细评估报告已保存到: ${reportPath}\n`));
  } catch (error) {
    console.error('生成评估报告时出错:', error);
  }
}

export {
  evaluateRules
};