import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { readConfig } from '../config/index.js';
import IntelligentRuleLearner from '../../core/analyzers/intelligentRuleLearner.js';

/**
 * 手动认可规则文件
 * @param {string} filePath - 规则文件路径
 * @param {Object} options - 命令行选项
 * @param {string} options.rulesDir - 规则目录路径
 */
async function approveRule(filePath, options = {}) {
  try {
    console.clear();
    console.log(chalk.cyan(`
╔═════════════════════════════════════════════════════════════╗
║                      手动认可规则                           ║
╚═════════════════════════════════════════════════════════════╝
`));

    const rulesDir = options.rulesDir || './rules/learning-rules';
    
    // 检查文件参数是否有效
    if (!filePath || typeof filePath !== 'string') {
      console.log(chalk.red(`❌ 文件路径参数无效`));
      return;
    }

    // 处理相对路径
    if (!path.isAbsolute(filePath)) {
      filePath = path.resolve(filePath);
    }

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch (error) {
      console.log(chalk.red(`文件不存在: ${filePath}`));
      return;
    }

    // 检查文件是否在 issues 目录中
    if (!filePath.includes(path.join(rulesDir, 'issues'))) {
      console.log(chalk.yellow(`⚠️  文件不在 issues 目录中，可能已经被移动过了`));
      console.log(chalk.white(`文件路径: ${filePath}`));
      return;
    }

    console.log(chalk.blue(`准备认可规则文件:`));
    console.log(chalk.white(`  • 文件路径: ${filePath}`));
    console.log(chalk.white(`  • 目标目录: ${path.join(rulesDir, 'approved')}\n`));

    // 读取配置
    const config = await readConfig();
    
    // 初始化规则学习器
    const learner = new IntelligentRuleLearner({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      model: config.model
    });

    // 移动文件到 approved 目录
    const spinner = ora('正在移动规则文件...').start();
    
    try {
      const newPath = await learner.moveRuleFile(filePath, 'approved');
      spinner.succeed('规则文件已认可并移动');
      
      console.log(chalk.green(`\n✅ 规则文件已成功移动到 approved/ 目录:`));
      console.log(chalk.white(`  • 原路径: ${filePath}`));
      console.log(chalk.white(`  • 新路径: ${newPath}\n`));
      
      console.log(chalk.blue(`💡 提示:`));
      console.log(chalk.white(`  • 该规则现在将被优先加载到知识库`));
      console.log(chalk.white(`  • 下次评估将跳过此文件`));
      console.log(chalk.white(`  • 运行 "sql-analyzer learn load --priority-approved" 优先加载已认可的规则\n`));
      
    } catch (error) {
      spinner.fail('移动文件失败');
      console.log(chalk.red(`错误: ${error.message}`));
      throw error;
    }

  } catch (error) {
    console.error(chalk.red('认可规则时发生错误:'), error.message);
    throw error;
  }
}

/**
 * 批量认可规则文件
 * @param {Array} filePaths - 规则文件路径数组
 * @param {Object} options - 命令行选项
 */
async function batchApproveRules(filePaths, options = {}) {
  try {
    console.clear();
    console.log(chalk.cyan(`
╔═════════════════════════════════════════════════════════════╗
║                     批量认可规则                           ║
╚═════════════════════════════════════════════════════════════╝
`));

    const rulesDir = options.rulesDir || './rules/learning-rules';
    
    console.log(chalk.blue(`准备批量认可 ${filePaths.length} 个规则文件\n`));

    // 读取配置
    const config = await readConfig();
    
    // 初始化规则学习器
    const learner = new IntelligentRuleLearner({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      model: config.model
    });

    const results = {
      approved: [],
      failed: []
    };

    // 逐个处理文件
    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      
      // 检查文件路径是否有效
      if (!filePath || typeof filePath !== 'string') {
        results.failed.push({
          path: filePath || 'undefined',
          error: '文件路径无效'
        });
        continue;
      }
      
      const spinner = ora(`(${i + 1}/${filePaths.length}) 认可: ${path.basename(filePath)}`).start();
      
      try {
        // 处理相对路径
        const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
        
        // 检查文件是否存在
        await fs.access(fullPath);
        
        // 移动文件
        const newPath = await learner.moveRuleFile(fullPath, 'approved');
        
        results.approved.push({
          originalPath: fullPath,
          newPath: newPath
        });
        
        spinner.succeed(`已认可: ${path.basename(filePath)}`);
        
      } catch (error) {
        results.failed.push({
          path: filePath,
          error: error.message
        });
        spinner.fail(`失败: ${path.basename(filePath)} - ${error.message}`);
      }
    }

    // 显示结果统计
    console.log(chalk.blue(`\n═══════════════════════════════════════════════════════════`));
    console.log(chalk.blue(`批量认可完成统计:`));
    console.log(chalk.green(`  • 成功认可: ${results.approved.length}`));
    console.log(chalk.red(`  • 认可失败: ${results.failed.length}`));
    console.log(chalk.blue(`═══════════════════════════════════════════════════════════\n`));

    if (results.failed.length > 0) {
      console.log(chalk.red(`失败的文件:`));
      results.failed.forEach(item => {
        console.log(chalk.red(`  • ${path.basename(item.path)}: ${item.error}`));
      });
      console.log('');
    }

    if (results.approved.length > 0) {
      console.log(chalk.green(`✅ 批量认可完成\n`));
      console.log(chalk.blue(`💡 提示: 运行 "sql-analyzer learn load --priority-approved" 优先加载已认可的规则\n`));
    }

  } catch (error) {
    console.error(chalk.red('批量认可规则时发生错误:'), error.message);
    throw error;
  }
}

export {
  approveRule,
  batchApproveRules
};