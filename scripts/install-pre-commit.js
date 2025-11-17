#!/usr/bin/env bun

/**
 * SQL Analyzer Pre-commit Hook Installer
 * 这个脚本用于安装pre-commit钩子到项目中
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import readline from 'readline';
import chalk from 'chalk';
import { platform } from 'os';

// 默认配置
const DEFAULT_CONFIG = {
  scoreThreshold: 70,
  blockOnCritical: true,
  enableJsonOutput: true
};

// 颜色输出
const colors = {
  info: chalk.blue,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red
};

/**
 * 打印带颜色的消息
 */
function printMessage(type, message) {
  const color = colors[type] || chalk.white;
  const prefix = type.toUpperCase().padEnd(7);
  console.log(`${color(prefix)} ${message}`);
}

function info(message) { printMessage('info', message); }
function success(message) { printMessage('success', message); }
function warning(message) { printMessage('warning', message); }
function error(message) { printMessage('error', message); }

/**
 * 创建readline接口用于用户输入
 */
function createReadline() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * 异步询问用户输入
 */
function askQuestion(rl, question, defaultValue = '') {
  return new Promise((resolve) => {
    const prompt = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
    rl.question(prompt, (answer) => {
      resolve(answer || defaultValue);
    });
  });
}

/**
 * 检查是否在git仓库中
 */
function checkGitRepo() {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    return true;
  } catch {
    error('当前目录不是Git仓库');
    process.exit(1);
  }
}

/**
 * 检查sql-analyzer是否已安装
 */
function checkSqlAnalyzer() {
  try {
    execSync('sql-analyzer --version', { stdio: 'ignore' });
    return 'sql-analyzer';
  } catch {
    // 检查是否是当前项目
    const projectRoot = process.cwd();
    const hasIndexJs = fs.existsSync(path.join(projectRoot, 'src/index.js'));
    const hasPackageJson = fs.existsSync(path.join(projectRoot, 'package.json'));
    
    if (hasIndexJs && hasPackageJson) {
      info('检测到当前是sql-analyzer项目，使用本地版本');
      const isWindows = platform() === 'win32';
      if (isWindows) {
        return `bun run "${path.join(projectRoot, 'src/index.js')}"`;
      } else {
        return `bun run ${path.join(projectRoot, 'src/index.js')}`;
      }
    } else {
      error('请先安装sql-analyzer: bun install -g .');
      process.exit(1);
    }
  }
}

/**
 * 读取用户配置
 */
async function readUserConfig() {
  const rl = createReadline();
  
  try {
    info('配置CI/CD设置 (直接回车使用默认值):');
    console.log('');
    
    const thresholdAnswer = await askQuestion(
      rl, 
      `评分阈值 (0-100, 默认: ${DEFAULT_CONFIG.scoreThreshold})`, 
      DEFAULT_CONFIG.scoreThreshold.toString()
    );
    const scoreThreshold = parseInt(thresholdAnswer) || DEFAULT_CONFIG.scoreThreshold;
    
    const blockAnswer = await askQuestion(
      rl, 
      `是否启用严重问题阻止提交? (y/N, 默认: ${DEFAULT_CONFIG.blockOnCritical})`, 
      DEFAULT_CONFIG.blockOnCritical ? 'y' : 'n'
    );
    const blockOnCritical = blockAnswer.toLowerCase().startsWith('y');
    
    const jsonAnswer = await askQuestion(
      rl, 
      `是否启用JSON输出格式? (Y/n, 默认: ${DEFAULT_CONFIG.enableJsonOutput})`, 
      DEFAULT_CONFIG.enableJsonOutput ? 'y' : 'n'
    );
    const enableJsonOutput = !jsonAnswer.toLowerCase().startsWith('n');
    
    console.log('');
    success(`配置完成: 阈值=${scoreThreshold}, 阻塞=${blockOnCritical}, JSON=${enableJsonOutput}`);
    
    return {
      scoreThreshold,
      blockOnCritical,
      enableJsonOutput
    };
  } finally {
    rl.close();
  }
}

/**
 * 创建pre-commit钩子
 */
function createPreCommitHook(analyzerPath, config) {
  const hooksDir = '.git/hooks';
  const preCommitFile = path.join(hooksDir, 'pre-commit');
  
  // 确保hooks目录存在
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }
  
  const isWindows = platform() === 'win32';
  const shebang = isWindows ? '#!/usr/bin/env bash' : '#!/bin/bash';
  
  const hookContent = `${shebang}
# SQL Analyzer Pre-commit Hook
# 自动生成的钩子，请勿手动修改

# CI/CD配置
SCORE_THRESHOLD=${config.scoreThreshold}
BLOCK_ON_CRITICAL=${config.blockOnCritical}
ENABLE_JSON_OUTPUT=${config.enableJsonOutput}

# 获取脚本所在目录
SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"

# 检查是否跳过SQL检查
skip_check=false
for arg in "\$@"; do
    if [ "\$arg" = "--no-verify" ] || [ "\$arg" = "-n" ]; then
        skip_check=true
        break
    fi
done

# 获取提交消息
commit_msg=""
if [ -f ".git/COMMIT_EDITMSG" ]; then
    commit_msg=\$(cat .git/COMMIT_EDITMSG)
fi

# 检查是否跳过
if [[ "\$commit_msg" == *"[skip-sql-check]"* ]]; then
    echo "跳过SQL检查 ([skip-sql-check] 在提交消息中)"
    exit 0
fi

# 获取暂存的SQL文件
sql_files=\$(git diff --cached --name-only --diff-filter=ACM | grep -E '\\.sql$' || true)

if [ -z "\$sql_files" ]; then
    echo "没有检测到SQL文件变更，跳过检查"
    exit 0
fi

echo "🔍 SQL Analyzer Pre-commit Hook"
echo "发现 \$(echo "\$sql_files" | wc -l) 个SQL文件需要检查:"
echo "\$sql_files" | sed 's/^/  - /'

# 分析结果
has_errors=false
has_blocking=false
has_score_failures=false

# 逐个分析文件
for file in \$sql_files; do
    echo ""
    echo "🔍 正在分析: \$file"
    
    # 构建分析命令
    cmd="${analyzerPath} analyze -f \"\$file\" --quick --cicd-mode"
    
    # 执行SQL分析
    if output=\$($cmd 2>&1); then
        # 解析JSON输出（如果启用）
        if [ "$ENABLE_JSON_OUTPUT" = "true" ]; then
            # 尝试解析JSON输出
            if echo "\$output" | jq -e '.status' >/dev/null 2>&1; then
                status=\$(echo "\$output" | jq -r '.status')
                score=\$(echo "\$output" | jq -r '.score // 0')
                has_blocking_issue=\$(echo "\$output" | jq -r '.hasBlocking // false')
                
                if [ "\$status" = "fail" ]; then
                    has_errors=true
                    if [ "\$has_blocking_issue" = "true" ]; then
                        has_blocking=true
                        echo "🚫 \$file: 发现阻塞性问题 (评分: \$score)"
                    elif [ "\$score" -lt "\$SCORE_THRESHOLD" ]; then
                        has_score_failures=true
                        echo "⚠️  \$file: 评分不足 (\$score/\$SCORE_THRESHOLD)"
                    else
                        echo "❌ \$file: 分析失败"
                    fi
                else
                    echo "✅ \$file: 分析通过 (评分: \$score)"
                fi
            else
                # JSON解析失败，使用传统检查
                if echo "\$output" | grep -q "❌"; then
                    has_errors=true
                    echo "❌ \$file: 分析发现问题"
                else
                    echo "✅ \$file: 分析通过"
                fi
            fi
        else
            # 传统输出检查
            if echo "\$output" | grep -q "❌"; then
                has_errors=true
                echo "❌ \$file: 分析发现问题"
            else
                echo "✅ \$file: 分析通过"
            fi
        fi
    else
        echo "❌ \$file: 分析执行失败"
        has_errors=true
    fi
done

# 输出汇总
echo ""
echo "=== SQL分析汇总 ==="
passed_files=\$(echo "\$sql_files" | wc -l)
failed_files=0

if [ "\$has_errors" = true ]; then
    echo "❌ SQL分析发现问题，提交已被阻止"
    echo ""
    echo "📋 配置信息:"
    echo "  - 评分阈值: \$SCORE_THRESHOLD"
    echo "  - 阻塞性问题检查: \$BLOCK_ON_CRITICAL"
    echo "  - JSON输出: \$ENABLE_JSON_OUTPUT"
    echo ""
    echo "💡 提示:"
    echo "  1. 修复上述问题后再次尝试提交"
    echo "  2. 或者在提交消息中包含 [skip-sql-check] 跳过检查"
    echo "  3. 或者使用 git commit --no-verify 跳过检查"
    echo "  4. 重新运行: bun run scripts/install-pre-commit.js 更新配置"
    exit 1
else
    echo "✅ 所有SQL文件检查通过，可以提交"
    exit 0
fi
`;
  
  // 写入钩子文件
  fs.writeFileSync(preCommitFile, hookContent);
  
  // 设置执行权限
  if (!isWindows) {
    fs.chmodSync(preCommitFile, '755');
  }
  
  success(`pre-commit钩子已创建: ${preCommitFile}`);
}

/**
 * 创建配置文件
 */
async function createConfigFile(config) {
  const configFile = '.sql-analyzer.json';
  
  // 如果配置文件已存在，询问是否覆盖
  if (fs.existsSync(configFile)) {
    const rl = createReadline();
    try {
      const answer = await askQuestion(rl, `配置文件 ${configFile} 已存在，是否覆盖? (y/N)`, 'n');
      if (!answer.toLowerCase().startsWith('y')) {
        info('跳过配置文件创建');
        return;
      }
    } finally {
      rl.close();
    }
  }
  
  const configContent = {
    databaseType: "mysql",
    analysisDimensions: ["performance", "security", "standards"],
    allowSkip: true,
    verbose: true,
    sqlExtensions: [".sql"],
    excludePaths: ["node_modules", ".git", "dist", "build"],
    cicd: {
      quickMode: true,
      scoreThreshold: config.scoreThreshold,
      blockOnCritical: config.blockOnCritical,
      enableJsonOutput: config.enableJsonOutput,
      quickModeWeights: {
        security: 0.50,
        performance: 0.30,
        standards: 0.20
      }
    }
  };
  
  fs.writeFileSync(configFile, JSON.stringify(configContent, null, 2));
  success(`配置文件已创建: ${configFile}`);
}

/**
 * 创建环境配置文件
 */
async function createEnvFile(config) {
  const envFile = '.env';
  
  // 如果.env文件已存在，询问是否添加CI/CD配置
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf8');
    if (envContent.includes('CICD_')) {
      info('CI/CD配置已存在于 .env');
      return;
    }
    
    const rl = createReadline();
    try {
      const answer = await askQuestion(rl, `是否在 ${envFile} 中添加CI/CD配置? (Y/n)`, 'y');
      if (!answer.toLowerCase().startsWith('n')) {
        const cicdConfig = `
# CI/CD 快速模式配置
CICD_QUICK_MODE=true
CICD_SCORE_THRESHOLD=${config.scoreThreshold}
CICD_BLOCK_ON_CRITICAL=${config.blockOnCritical}
CICD_ENABLE_JSON_OUTPUT=${config.enableJsonOutput}
`;
        fs.appendFileSync(envFile, cicdConfig);
        success(`CI/CD配置已添加到 ${envFile}`);
      }
    } finally {
      rl.close();
    }
  } else {
    warning(`${envFile} 文件不存在，跳过环境配置`);
  }
}

/**
 * 检查依赖
 */
function checkDependencies(config) {
  info('检查依赖...');
  
  // 检查jq（用于JSON解析）
  try {
    execSync('jq --version', { stdio: 'ignore' });
  } catch {
    if (config.enableJsonOutput) {
      warning('jq未安装，JSON输出功能可能无法正常工作');
      info('安装jq: brew install jq (macOS) 或 apt-get install jq (Ubuntu)');
    }
  }
  
  // 检查bun
  try {
    execSync('bun --version', { stdio: 'ignore' });
  } catch {
    if (process.argv[1].includes('bun')) {
      error('bun未安装，无法使用本地版本');
      info('安装bun: curl -fsSL https://bun.sh/install | bash');
      process.exit(1);
    }
  }
  
  success('依赖检查完成');
}

/**
 * 主函数
 */
async function main() {
  console.log('');
  info('🚀 安装SQL Analyzer Pre-commit Hook...');
  console.log('');
  
  // 检查Git仓库
  checkGitRepo();
  
  // 检查sql-analyzer
  const analyzerPath = checkSqlAnalyzer();
  
  // 读取用户配置
  const config = await readUserConfig();
  console.log('');
  
  // 检查依赖
  checkDependencies(config);
  console.log('');
  
  // 创建pre-commit钩子
  createPreCommitHook(analyzerPath, config);
  console.log('');
  
  // 创建配置文件
  await createConfigFile(config);
  console.log('');
  
  // 创建环境配置文件
  await createEnvFile(config);
  console.log('');
  
  success('🎉 SQL Analyzer Pre-commit Hook安装完成!');
  console.log('');
  info('📋 使用方法:');
  console.log('  1. 正常提交: git commit -m \'feat: add new feature\'');
  console.log('  2. 跳过检查: git commit -m \'feat: add new feature [skip-sql-check]\'');
  console.log('  3. 临时跳过: git commit --no-verify -m \'feat: add new feature\'');
  console.log('');
  info('⚙️  配置信息:');
  console.log(`  - 评分阈值: ${config.scoreThreshold}`);
  console.log(`  - 阻塞性问题检查: ${config.blockOnCritical}`);
  console.log(`  - JSON输出: ${config.enableJsonOutput}`);
  console.log('');
  info('📁 配置文件:');
  console.log('  - 项目配置: .sql-analyzer.json');
  console.log('  - 环境配置: .env');
  console.log('');
  info('🔄 更新配置: 重新运行此脚本即可更新配置');
}

// 运行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    error(`安装失败: ${error.message}`);
    process.exit(1);
  });
}

export { main as installPreCommit };