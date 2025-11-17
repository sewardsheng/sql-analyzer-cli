import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { readConfig } from '../config/index.js';
import IntelligentRuleLearner from '../../core/analyzers/intelligentRuleLearner.js';

/**
 * 显示规则库状态和统计信息
 * @param {Object} options - 命令行选项
 * @param {string} options.rulesDir - 规则目录路径
 */
async function showRulesStatus(options = {}) {
  try {
    console.clear();
    console.log(chalk.cyan(`
╔═════════════════════════════════════════════════════════════╗
║                      规则库状态                             ║
╚═════════════════════════════════════════════════════════════╝
`));

    const rulesDir = options.rulesDir || './rules/learning-rules';
    
    console.log(chalk.blue(`规则目录: ${rulesDir}\n`));

    // 读取配置
    const config = await readConfig();
    
    // 初始化规则学习器
    const learner = new IntelligentRuleLearner({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      model: config.model
    });

    // 获取各类型目录的文件统计
    const statusSpinner = ora('正在扫描规则目录...').start();
    
    const status = {
      issues: await getDirectoryStatus(path.join(rulesDir, 'issues'), '待评估'),
      approved: await getDirectoryStatus(path.join(rulesDir, 'approved'), '已认可'),
      archived: await getDirectoryStatus(path.join(rulesDir, 'archived'), '已归档')
    };

    statusSpinner.succeed('目录扫描完成');

    // 显示总体统计
    console.log(chalk.blue(`═══════════════════════════════════════════════════════════`));
    console.log(chalk.blue(`规则库总体统计:`));
    
    const totalFiles = status.issues.count + status.approved.count + status.archived.count;
    console.log(chalk.white(`  • 总文件数: ${totalFiles}`));
    console.log(chalk.yellow(`  • 待评估 (issues): ${status.issues.count}`));
    console.log(chalk.green(`  • 已认可 (approved): ${status.approved.count}`));
    console.log(chalk.gray(`  • 已归档 (archived): ${status.archived.count}`));
    
    if (totalFiles > 0) {
      const approvedRate = Math.round((status.approved.count / totalFiles) * 100);
      const archivedRate = Math.round((status.archived.count / totalFiles) * 100);
      const pendingRate = Math.round((status.issues.count / totalFiles) * 100);
      
      console.log(chalk.blue(`\n📊 分布比例:`));
      console.log(chalk.green(`  • 已认可: ${approvedRate}%`));
      console.log(chalk.yellow(`  • 待评估: ${pendingRate}%`));
      console.log(chalk.gray(`  • 已归档: ${archivedRate}%`));
    }
    
    console.log(chalk.blue(`═══════════════════════════════════════════════════════════\n`));

    // 显示各目录详细信息
    await displayDirectoryDetails(status.issues, learner);
    await displayDirectoryDetails(status.approved, learner);
    await displayDirectoryDetails(status.archived, learner);

    // 显示操作建议
    displayRecommendations(status);

  } catch (error) {
    console.error(chalk.red('显示规则库状态时发生错误:'), error.message);
    throw error;
  }
}

/**
 * 获取目录状态
 * @param {string} dirPath - 目录路径
 * @param {string} label - 目录标签
 * @returns {Promise<Object>} 目录状态信息
 */
async function getDirectoryStatus(dirPath, label) {
  const status = {
    path: dirPath,
    label: label,
    exists: false,
    count: 0,
    size: 0,
    subdirectories: [],
    recentFiles: []
  };

  try {
    await fs.access(dirPath);
    status.exists = true;

    const items = await fs.readdir(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = await fs.stat(itemPath);
      
      if (stat.isDirectory()) {
        const subDirStatus = await getSubdirectoryStatus(itemPath);
        status.subdirectories.push(subDirStatus);
        status.count += subDirStatus.count;
        status.size += subDirStatus.size;
        status.recentFiles.push(...subDirStatus.recentFiles);
      } else if (item.endsWith('.md')) {
        status.count++;
        status.size += stat.size;
        status.recentFiles.push({
          name: item,
          path: itemPath,
          modified: stat.mtime
        });
      }
    }

    // 按修改时间排序，保留最新的5个文件
    status.recentFiles.sort((a, b) => b.modified - a.modified);
    status.recentFiles = status.recentFiles.slice(0, 5);

  } catch (error) {
    // 目录不存在
  }

  return status;
}

/**
 * 获取子目录状态
 * @param {string} subDirPath - 子目录路径
 * @returns {Promise<Object>} 子目录状态
 */
async function getSubdirectoryStatus(subDirPath) {
  const status = {
    name: path.basename(subDirPath),
    count: 0,
    size: 0,
    recentFiles: []
  };

  try {
    const files = await fs.readdir(subDirPath);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = path.join(subDirPath, file);
        const stat = await fs.stat(filePath);
        
        status.count++;
        status.size += stat.size;
        status.recentFiles.push({
          name: file,
          path: filePath,
          modified: stat.mtime
        });
      }
    }

    // 按修改时间排序
    status.recentFiles.sort((a, b) => b.modified - a.modified);

  } catch (error) {
    // 忽略错误
  }

  return status;
}

/**
 * 显示目录详细信息
 * @param {Object} dirStatus - 目录状态
 * @param {Object} learner - 规则学习器实例
 */
async function displayDirectoryDetails(dirStatus, learner) {
  if (!dirStatus.exists) {
    console.log(chalk.gray(`📁 ${dirStatus.label} (${dirStatus.label}): 目录不存在\n`));
    return;
  }

  const color = dirStatus.label === '待评估' ? chalk.yellow : 
                dirStatus.label === '已认可' ? chalk.green : chalk.gray;
  
  console.log(color(`📁 ${dirStatus.label} (${dirStatus.label}): ${dirStatus.count} 个文件`));
  
  if (dirStatus.subdirectories.length > 0) {
    dirStatus.subdirectories.forEach(subDir => {
      if (subDir.count > 0) {
        console.log(chalk.white(`  • ${subDir.name}/: ${subDir.count} 个文件`));
      }
    });
  }

  if (dirStatus.recentFiles.length > 0) {
    console.log(chalk.gray(`  最近文件:`));
    dirStatus.recentFiles.slice(0, 3).forEach(file => {
      const date = file.modified.toLocaleDateString('zh-CN');
      console.log(chalk.gray(`    - ${file.name} (${date})`));
    });
  }

  console.log('');
}

/**
 * 显示操作建议
 * @param {Object} status - 规则库状态
 */
function displayRecommendations(status) {
  console.log(chalk.blue(`💡 操作建议:`));
  
  if (status.issues.count > 0) {
    console.log(chalk.white(`  • 运行 "sql-analyzer learn evaluate" 评估待评估规则`));
    console.log(chalk.white(`  • 运行 "sql-analyzer learn cleanup" 清理低质量规则`));
  }
  
  if (status.approved.count > 0) {
    console.log(chalk.white(`  • 运行 "sql-analyzer learn load --priority-approved" 优先加载已认可规则`));
  }
  
  if (status.issues.count === 0 && status.approved.count === 0) {
    console.log(chalk.yellow(`  • 运行 "sql-analyzer analyze" 生成新规则`));
  }
  
  console.log(chalk.white(`  • 运行 "sql-analyzer learn status" 查看最新状态`));
  console.log('');
}

export {
  showRulesStatus
};