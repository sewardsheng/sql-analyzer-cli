import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { readConfig } from '../config/index.js';
import IntelligentRuleLearner from '../../core/analyzers/intelligentRuleLearner.js';

/**
 * 清理低质量规则
 * @param {Object} options - 命令行选项
 * @param {string} options.score - 质量分数阈值
 * @param {boolean} options.backup - 是否备份
 * @param {string} options.rulesDir - 规则目录路径
 */
async function cleanupRules(options = {}) {
  try {
    console.clear();
    console.log(chalk.cyan(`
╔═════════════════════════════════════════════════════════════╗
║                    规则质量清理                             ║
╚═════════════════════════════════════════════════════════════╝
`));

    const threshold = parseInt(options.score || '60');
    const backup = options.backup || false;
    const rulesDir = options.rulesDir || './rules/learning-rules';
    const issuesDir = path.join(rulesDir, 'issues');

    console.log(chalk.blue(`配置信息:`));
    console.log(chalk.white(`  • 质量阈值: ${threshold}/100`));
    console.log(chalk.white(`  • 备份选项: ${backup ? '启用' : '禁用'}`));
    console.log(chalk.white(`  • 规则目录: ${rulesDir}\n`));

    // 检查目录是否存在
    try {
      await fs.access(issuesDir);
    } catch (error) {
      console.log(chalk.red(`规则目录不存在: ${issuesDir}`));
      return;
    }

    // 获取所有规则文件
    const spinner = ora('正在扫描规则文件...').start();
    const allFiles = await getAllRuleFiles(issuesDir);
    
    if (allFiles.length === 0) {
      spinner.warn('没有找到规则文件');
      return;
    }
    
    spinner.succeed(`找到 ${allFiles.length} 个规则文件`);

    // 读取配置
    const config = await readConfig();
    
    // 初始化规则学习器
    const learner = new IntelligentRuleLearner({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      model: config.model
    });

    // 评估所有规则文件
    const evaluationSpinner = ora('正在评估规则质量...').start();
    const lowQualityFiles = [];
    let evaluatedCount = 0;

    for (const filePath of allFiles) {
      try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        
        // 评估规则质量
        const evaluation = await learner.evaluateRuleQuality({
          filePath,
          content: fileContent
        });

        if (evaluation.success) {
          const score = evaluation.data.qualityScore;
          evaluatedCount++;

          if (score < threshold) {
            lowQualityFiles.push({
              path: filePath,
              score: score,
              level: evaluation.data.qualityLevel,
              issues: evaluation.data.issues || []
            });
          }

          // 更新进度
          evaluationSpinner.text = `评估中... (${evaluatedCount}/${allFiles.length})`;
        }
      } catch (error) {
        console.log(chalk.yellow(`  警告: 评估文件失败 ${path.basename(filePath)}: ${error.message}`));
      }
    }

    evaluationSpinner.succeed(`评估完成: ${evaluatedCount} 个文件`);

    // 显示低质量规则
    if (lowQualityFiles.length === 0) {
      console.log(chalk.green(`\n✅ 没有发现低于阈值 (${threshold}) 的规则文件\n`));
      return;
    }

    console.log(chalk.yellow(`\n发现 ${lowQualityFiles.length} 个低质量规则文件:\n`));
    
    // 按分数排序（从低到高）
    lowQualityFiles.sort((a, b) => a.score - b.score);

    // 显示详细信息
    lowQualityFiles.forEach((file, index) => {
      const scoreColor = file.score < 40 ? chalk.red : chalk.yellow;
      console.log(`${index + 1}. ${chalk.white(path.basename(file.path))}`);
      console.log(`   ${scoreColor(`分数: ${file.score}/100`)} (${file.level})`);
      if (file.issues.length > 0) {
        console.log(chalk.gray(`   主要问题:`));
        file.issues.slice(0, 2).forEach(issue => {
          console.log(chalk.gray(`     - ${issue}`));
        });
      }
      console.log('');
    });

    // 确认删除
    const { confirmDelete } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmDelete',
        message: chalk.yellow(`确定要删除这 ${lowQualityFiles.length} 个低质量规则文件吗？`),
        default: false
      }
    ]);

    if (!confirmDelete) {
      console.log(chalk.blue('\n操作已取消\n'));
      return;
    }

    // 备份低质量规则
    if (backup) {
      const backupSpinner = ora('正在备份低质量规则...').start();
      const backupDir = path.join(rulesDir, 'archived', new Date().toISOString().split('T')[0]);
      
      try {
        await fs.mkdir(backupDir, { recursive: true });
        
        for (const file of lowQualityFiles) {
          const fileName = path.basename(file.path);
          const backupPath = path.join(backupDir, fileName);
          await fs.copyFile(file.path, backupPath);
        }
        
        backupSpinner.succeed(`已备份到: ${backupDir}`);
      } catch (error) {
        backupSpinner.fail('备份失败');
        console.log(chalk.red(`错误: ${error.message}`));
        return;
      }
    }

    // 删除低质量规则
    const deleteSpinner = ora('正在删除低质量规则...').start();
    let deletedCount = 0;
    let failedCount = 0;

    for (const file of lowQualityFiles) {
      try {
        await fs.unlink(file.path);
        deletedCount++;
      } catch (error) {
        failedCount++;
        console.log(chalk.red(`  删除失败: ${path.basename(file.path)}`));
      }
    }

    if (failedCount === 0) {
      deleteSpinner.succeed(`成功删除 ${deletedCount} 个低质量规则文件`);
    } else {
      deleteSpinner.warn(`删除了 ${deletedCount} 个文件，${failedCount} 个失败`);
    }

    // 清理空目录
    await cleanupEmptyDirectories(issuesDir);

    console.log(chalk.green(`\n✅ 清理完成\n`));
    console.log(chalk.blue(`建议操作:`));
    console.log(chalk.white(`  1. 运行 "sql-analyzer learn reset" 重置向量存储`));
    console.log(chalk.white(`  2. 运行 "sql-analyzer learn load" 重新加载规则到知识库\n`));

  } catch (error) {
    console.error(chalk.red('清理规则时发生错误:'), error.message);
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
 * 清理空目录
 * @param {string} issuesDir - issues目录路径
 */
async function cleanupEmptyDirectories(issuesDir) {
  try {
    const months = await fs.readdir(issuesDir);
    
    for (const month of months) {
      const monthPath = path.join(issuesDir, month);
      const stat = await fs.stat(monthPath);
      
      if (stat.isDirectory()) {
        const files = await fs.readdir(monthPath);
        
        // 如果目录为空，删除它
        if (files.length === 0) {
          await fs.rmdir(monthPath);
          console.log(chalk.gray(`  已删除空目录: ${month}`));
        }
      }
    }
  } catch (error) {
    // 忽略清理空目录的错误
  }
}

export {
  cleanupRules
};