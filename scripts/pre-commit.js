#!/usr/bin/env bun

/**
 * SQL Analyzer Pre-commit Hook
 * 
 * 这个钩子会在提交前自动扫描所有修改的SQL文件
 * 使用 headless 模式进行快速分析，如果发现问题则阻止提交
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
// 在Bun中，chalk需要使用不同的导入方式
const chalk = require('chalk').default;

// 配置选项
const config = {
  // SQL文件扩展名
  sqlExtensions: ['.sql'],
  // 是否允许跳过检查（通过提交消息中包含 [skip-sql-check]）
  allowSkip: true,
  // 是否在控制台显示详细输出
  verbose: true,
  // sql-analyzer命令路径（优先使用全局安装，如果不存在则使用项目本地的CLI）
  analyzerPath: 'sql-analyzer',
  // 本地备用命令路径（当全局命令不可用时）
  localAnalyzerPath: 'bun bin/cli.js',
  // 分析维度（数据库类型将由LLM自动推理，无需手动指定）
  analysisDimensions: ['performance', 'security', 'standards'],
  // Headless 模式配置
  headless: true,
  format: 'json',           // JSON格式便于解析
  scoreThreshold: 70,       // 评分阈值
  exitCode: true,           // 启用退出码
  quiet: true               // 静默模式
};

/**
 * 获取暂存区中的SQL文件列表
 */
function getStagedSqlFiles() {
  try {
    // 获取暂存区中的文件列表
    const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    const files = output.trim().split('\n').filter(Boolean);
    
    // 筛选出SQL文件
    return files.filter(file => 
      config.sqlExtensions.some(ext => file.toLowerCase().endsWith(ext))
    );
  } catch (error) {
    console.error(chalk.red('获取暂存文件失败:'), error.message);
    process.exit(1);
  }
}

/**
 * 检查是否跳过SQL检查
 */
function shouldSkipCheck() {
  if (!config.allowSkip) return false;
  
  try {
    // 获取提交消息
    const commitMsg = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
    return commitMsg.includes('[skip-sql-check]');
  } catch (error) {
    // 如果获取提交消息失败，默认不跳过
    return false;
  }
}

/**
 * 分析单个SQL文件
 */
function analyzeSqlFile(filePath) {
  try {
    if (config.verbose) {
      console.log(chalk.blue(`正在分析文件: ${filePath}`));
    }
    
    // 尝试使用全局安装的sql-analyzer命令，如果失败则回退到本地命令
    // 注意: 数据库类型将由LLM自动推理，无需手动指定
    let command = `${config.analyzerPath} analyze -f "${filePath}" --quick`;
    
    // Headless 模式配置
    if (config.headless) {
      command += ` --headless`;
      command += ` --format ${config.format}`;
      command += ` --threshold ${config.scoreThreshold}`;
      if (config.exitCode) command += ` --exit-code`;
      if (config.quiet) command += ` --quiet`;
      command += ` --pipe`; // 使用管道模式获取输出
    }
    
    let useLocalCommand = false;
    
    try {
      // 首先尝试检查全局命令是否可用
      execSync('which sql-analyzer', { stdio: 'ignore' });
    } catch (error) {
      // 全局命令不可用，使用本地命令
      command = `${config.localAnalyzerPath} analyze -f "${filePath}" --quick --headless --format ${config.format} --threshold ${config.scoreThreshold} --exit-code --quiet --pipe`;
      useLocalCommand = true;
      if (config.verbose) {
        console.log(chalk.yellow(`全局sql-analyzer命令不可用，使用本地命令`));
      }
    }
    
    // 执行SQL分析
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    
    if (config.verbose && !config.quiet) {
      console.log(output);
    }
    
    // Headless 模式：解析JSON输出
    if (config.headless && config.format === 'json') {
      try {
        const result = JSON.parse(output);
        return {
          success: result.status === 'pass',
          output,
          useLocalCommand,
          score: result.score,
          passed: result.status === 'pass',
          criticalIssues: result.criticalIssues || [],
          suggestions: result.suggestions || []
        };
      } catch (parseError) {
        console.error(chalk.red('JSON解析失败:'), parseError.message);
        return { success: false, output, useLocalCommand, error: 'JSON解析失败' };
      }
    }
    
    return { success: true, output, useLocalCommand };
  } catch (error) {
    // 分析失败（可能是退出码非0）
    if (error.status === 1 && config.headless) {
      // Headless 模式下，退出码1表示未达到阈值
      try {
        const result = JSON.parse(error.stdout || '{}');
        return {
          success: false,
          output: error.stdout,
          error: error.message,
          score: result.score,
          passed: false,
          criticalIssues: result.criticalIssues || [],
          suggestions: result.suggestions || []
        };
      } catch {
        return { 
          success: false, 
          output: error.stdout || error.message,
          error: error.stderr || error.message
        };
      }
    }
    
    return { 
      success: false, 
      output: error.stdout || error.message,
      error: error.stderr || error.message
    };
  }
}

/**
 * 主函数
 */
function main() {
  console.log(chalk.blue('🔍 SQL Analyzer Pre-commit Hook (Headless 模式)'));
  
  // 检查是否跳过
  if (shouldSkipCheck()) {
    console.log(chalk.yellow('跳过SQL检查 ([skip-sql-check] 在提交消息中)'));
    return;
  }
  
  // 获取暂存的SQL文件
  const sqlFiles = getStagedSqlFiles();
  
  if (sqlFiles.length === 0) {
    console.log(chalk.green('没有检测到SQL文件变更，跳过检查'));
    return;
  }
  
  console.log(chalk.blue(`发现 ${sqlFiles.length} 个SQL文件需要检查:`));
  sqlFiles.forEach(file => console.log(`  - ${file}`));
  
  // 分析结果
  let hasErrors = false;
  let hasScoreFailures = false;
  const results = [];
  
  // 逐个分析文件
  const globalCommandUsed = [];
  const localCommandUsed = [];
  
  for (const file of sqlFiles) {
    const result = analyzeSqlFile(file);
    results.push({ file, ...result });
    
    if (result.useLocalCommand) {
      localCommandUsed.push(file);
    } else {
      globalCommandUsed.push(file);
    }
    
    if (!result.success) {
      hasErrors = true;
      if (result.score !== undefined && result.score < config.scoreThreshold) {
        hasScoreFailures = true;
        console.log(chalk.yellow(`⚠️  ${file}: 评分不足 (${result.score}/${config.scoreThreshold})`));
        
        // 显示关键问题
        if (result.criticalIssues && result.criticalIssues.length > 0) {
          console.log(chalk.red(`   关键问题 (${result.criticalIssues.length} 个):`));
          result.criticalIssues.slice(0, 2).forEach(issue => {
            console.log(`     - ${issue.description || issue.type}`);
          });
        }
      } else {
        console.log(chalk.red(`❌ ${file}: 分析失败`));
        if (result.error) {
          console.log(chalk.red(`   错误: ${result.error}`));
        }
      }
    } else {
      console.log(chalk.green(`✅ ${file}: 分析通过 (评分: ${result.score || 'N/A'})`));
    }
  }
  
  // 输出命令使用情况
  if (config.verbose && (globalCommandUsed.length > 0 || localCommandUsed.length > 0)) {
    console.log('\n' + chalk.blue('=== 命令使用情况 ==='));
    if (globalCommandUsed.length > 0) {
      console.log(`使用全局命令: ${globalCommandUsed.length} 个文件`);
    }
    if (localCommandUsed.length > 0) {
      console.log(`使用本地命令: ${localCommandUsed.length} 个文件`);
      console.log(chalk.yellow('提示: 使用 "bun install -g ." 进行全局安装可以提高性能'));
    }
  }
  
  // 输出汇总
  console.log('\n' + chalk.blue('=== SQL分析汇总 ==='));
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`通过: ${passed}, 失败: ${failed}`);
  
  // Headless 模式的详细汇总
  if (config.headless) {
    const scoreFailedFiles = results.filter(r => r.score < config.scoreThreshold && !r.success);
    
    if (scoreFailedFiles.length > 0) {
      console.log(chalk.yellow(`\n⚠️  评分不足的文件 (${scoreFailedFiles.length} 个):`));
      scoreFailedFiles.forEach(({ file, score, criticalIssues }) => {
        console.log(`   - ${file}: ${score}/${config.scoreThreshold}`);
        if (criticalIssues && criticalIssues.length > 0) {
          console.log(`     问题数: ${criticalIssues.length}`);
        }
      });
    }
  }
  
  // 判断是否阻止提交
  const shouldBlock = hasErrors || (config.headless && hasScoreFailures);
  
  if (shouldBlock) {
    console.log('\n' + chalk.red('❌ SQL分析发现问题，提交已被阻止'));
    console.log(chalk.yellow('提示:'));
    console.log('  1. 修复上述问题后再次尝试提交');
    console.log('  2. 或者在提交消息中包含 [skip-sql-check] 跳过检查');
    
    if (config.headless) {
      console.log(`  3. Headless 模式要求: 评分 >= ${config.scoreThreshold}`);
    }
    
    process.exit(1);
  } else {
    console.log(chalk.green('\n✅ 所有SQL文件检查通过，可以提交'));
  }
}

// 运行主函数
main();