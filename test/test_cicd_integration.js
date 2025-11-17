#!/usr/bin/env bun

/**
 * CI/CD集成测试
 * 测试快速模式在CI/CD环境中的功能
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 测试配置
const TEST_CONFIG = {
  testDir: path.join(__dirname, 'temp_cicd_test'),
  sqlFiles: [
    {
      name: 'good_query.sql',
      content: `SELECT id, name, email 
FROM users 
WHERE id = ? 
AND status = 'active' 
LIMIT 10;`,
      expectedPass: true,
      expectedScore: 85
    },
    {
      name: 'sql_injection.sql',
      content: `SELECT * FROM users WHERE id = '" + userId + "'`,
      expectedPass: false,
      expectedScore: 20,
      hasBlocking: true
    },
    {
      name: 'performance_issue.sql',
      content: `SELECT * FROM users WHERE name LIKE '%john%'`,
      expectedPass: false,
      expectedScore: 45
    },
    {
      name: 'syntax_error.sql',
      content: `SELCT * FORM users`, // 故意的语法错误
      expectedPass: false,
      expectedScore: 30,
      hasBlocking: true
    }
  ]
};

/**
 * 创建测试目录和文件
 */
function setupTestEnvironment() {
  console.log('🔧 设置测试环境...');
  
  // 创建测试目录
  if (fs.existsSync(TEST_CONFIG.testDir)) {
    fs.rmSync(TEST_CONFIG.testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_CONFIG.testDir, { recursive: true });
  
  // 创建测试SQL文件
  TEST_CONFIG.sqlFiles.forEach(file => {
    const filePath = path.join(TEST_CONFIG.testDir, file.name);
    fs.writeFileSync(filePath, file.content);
    console.log(`  📄 创建测试文件: ${file.name}`);
  });
  
  console.log('✅ 测试环境设置完成\n');
}

/**
 * 清理测试环境
 */
function cleanupTestEnvironment() {
  console.log('🧹 清理测试环境...');
  
  if (fs.existsSync(TEST_CONFIG.testDir)) {
    fs.rmSync(TEST_CONFIG.testDir, { recursive: true, force: true });
  }
  
  console.log('✅ 测试环境清理完成\n');
}

/**
 * 执行快速分析命令
 * @param {string} filePath - SQL文件路径
 * @param {Object} options - 命令选项
 * @returns {Object} 分析结果
 */
function runQuickAnalysis(filePath, options = {}) {
  try {
    const command = `bun run src/index.js analyze -f "${filePath}" --quick --cicd-mode`;
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    
    // 解析JSON输出
    const result = JSON.parse(output);
    return { success: true, result };
  } catch (error) {
    // 尝试解析错误输出中的JSON
    try {
      const result = JSON.parse(error.stdout || error.message);
      return { success: false, result, error: error.message };
    } catch {
      return { 
        success: false, 
        error: error.message,
        output: error.stdout || error.stderr
      };
    }
  }
}

/**
 * 运行单个测试用例
 * @param {Object} testCase - 测试用例
 */
function runTestCase(testCase) {
  console.log(`🧪 测试文件: ${testCase.name}`);
  
  const filePath = path.join(TEST_CONFIG.testDir, testCase.name);
  const analysis = runQuickAnalysis(filePath);
  
  if (!analysis.success) {
    console.log(`  ❌ 分析失败: ${analysis.error}`);
    return false;
  }
  
  const result = analysis.result;
  
  // 检查通过状态
  if (result.status !== (testCase.expectedPass ? 'pass' : 'fail')) {
    console.log(`  ❌ 状态检查失败: 期望 ${testCase.expectedPass ? 'pass' : 'fail'}, 实际 ${result.status}`);
    return false;
  }
  
  // 检查评分
  if (Math.abs(result.score - testCase.expectedScore) > 10) {
    console.log(`  ⚠️  评分偏差较大: 期望约 ${testCase.expectedScore}, 实际 ${result.score}`);
  }
  
  // 检查阻塞性问题
  if (testCase.hasBlocking !== undefined) {
    if (result.hasBlocking !== testCase.hasBlocking) {
      console.log(`  ❌ 阻塞性问题检查失败: 期望 ${testCase.hasBlocking}, 实际 ${result.hasBlocking}`);
      return false;
    }
  }
  
  // 检查必要字段
  const requiredFields = ['status', 'score', 'criticalIssues', 'ciMetadata'];
  for (const field of requiredFields) {
    if (!(field in result)) {
      console.log(`  ❌ 缺少必要字段: ${field}`);
      return false;
    }
  }
  
  console.log(`  ✅ 测试通过 (状态: ${result.status}, 评分: ${result.score})`);
  
  // 显示关键问题
  if (result.criticalIssues.length > 0) {
    console.log(`    🔍 发现问题: ${result.criticalIssues.length} 个`);
    result.criticalIssues.slice(0, 2).forEach(issue => {
      console.log(`      - ${issue.description}`);
    });
  }
  
  return true;
}

/**
 * 测试pre-commit脚本
 */
function testPreCommitScript() {
  console.log('🔧 测试pre-commit脚本...');
  
  try {
    // 初始化git仓库（如果还没有）
    if (!fs.existsSync(path.join(TEST_CONFIG.testDir, '.git'))) {
      execSync('git init', { cwd: TEST_CONFIG.testDir, stdio: 'pipe' });
      execSync('git config user.name "Test User"', { cwd: TEST_CONFIG.testDir, stdio: 'pipe' });
      execSync('git config user.email "test@example.com"', { cwd: TEST_CONFIG.testDir, stdio: 'pipe' });
    }
    
    // 添加文件到git
    execSync('git add .', { cwd: TEST_CONFIG.testDir, stdio: 'pipe' });
    
    // 尝试提交（应该被pre-commit钩子阻止）
    try {
      execSync('git commit -m "Test commit"', { cwd: TEST_CONFIG.testDir, stdio: 'pipe' });
      console.log('  ⚠️  提交未被阻止（可能没有问题文件）');
    } catch (commitError) {
      if (commitError.status === 1) {
        console.log('  ✅ pre-commit钩子成功阻止了提交');
      } else {
        console.log(`  ❌ pre-commit钩子错误: ${commitError.message}`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.log(`  ❌ pre-commit测试失败: ${error.message}`);
    return false;
  }
}

/**
 * 主测试函数
 */
function main() {
  console.log('🚀 开始CI/CD集成测试\n');
  
  let passedTests = 0;
  let totalTests = 0;
  
  try {
    // 设置测试环境
    setupTestEnvironment();
    
    // 运行SQL文件测试
    console.log('📋 运行SQL分析测试...\n');
    for (const testCase of TEST_CONFIG.sqlFiles) {
      totalTests++;
      if (runTestCase(testCase)) {
        passedTests++;
      }
      console.log('');
    }
    
    // 测试pre-commit脚本
    console.log('📋 运行pre-commit脚本测试...\n');
    totalTests++;
    if (testPreCommitScript()) {
      passedTests++;
    }
    
    // 输出测试结果
    console.log('='.repeat(60));
    console.log(`📊 测试结果: ${passedTests}/${totalTests} 通过`);
    
    if (passedTests === totalTests) {
      console.log('🎉 所有测试通过！');
      process.exit(0);
    } else {
      console.log('❌ 部分测试失败');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    process.exit(1);
  } finally {
    // 清理测试环境
    cleanupTestEnvironment();
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as runCICDTests };