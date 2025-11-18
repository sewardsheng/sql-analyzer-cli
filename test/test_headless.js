#!/usr/bin/env bun

/**
 * Headless 模式集成测试
 * 测试 headless 模式在各种场景下的功能
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 测试配置
const TEST_CONFIG = {
  testDir: path.join(__dirname, 'temp_headless_test'),
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
      expectedScore: 20
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
      expectedScore: 30
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
 * 执行 headless 分析命令
 * @param {string} filePath - SQL文件路径
 * @param {Object} options - 命令选项
 * @returns {Object} 分析结果
 */
function runHeadlessAnalysis(filePath, options = {}) {
  try {
    const {
      format = 'json',
      threshold = 70,
      exitCode = true,
      pipe = true,
      quiet = true
    } = options;
    
    let command = `bun run src/index.js analyze -f "${filePath}" --quick --headless`;
    
    if (format) command += ` --format ${format}`;
    if (threshold) command += ` --threshold ${threshold}`;
    if (exitCode) command += ` --exit-code`;
    if (pipe) command += ` --pipe`;
    if (quiet) command += ` --quiet`;
    
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    
    // 解析输出
    if (format === 'json') {
      const result = JSON.parse(output);
      return { success: true, result, exitCode: 0 };
    } else {
      return { success: true, output, exitCode: 0 };
    }
  } catch (error) {
    // 捕获退出码错误
    if (error.status === 1) {
      try {
        if (options.format === 'json') {
          const result = JSON.parse(error.stdout || '{}');
          return { success: false, result, exitCode: 1, error: error.message };
        } else {
          return { success: false, output: error.stdout, exitCode: 1, error: error.message };
        }
      } catch {
        return { 
          success: false, 
          error: error.message,
          output: error.stdout || error.stderr,
          exitCode: error.status
        };
      }
    }
    
    return { 
      success: false, 
      error: error.message,
      output: error.stdout || error.stderr,
      exitCode: error.status || 1
    };
  }
}

/**
 * 测试 JSON 输出格式
 */
function testJsonFormat(testCase) {
  console.log(`🧪 测试 JSON 格式: ${testCase.name}`);
  
  const filePath = path.join(TEST_CONFIG.testDir, testCase.name);
  const analysis = runHeadlessAnalysis(filePath, { format: 'json' });
  
  if (!analysis.result) {
    console.log(`  ❌ 未能获取 JSON 结果: ${analysis.error}`);
    return false;
  }
  
  const result = analysis.result;
  
  // 检查必要字段
  const requiredFields = ['status', 'score', 'threshold', 'databaseType', 'timestamp'];
  for (const field of requiredFields) {
    if (!(field in result)) {
      console.log(`  ❌ 缺少必要字段: ${field}`);
      return false;
    }
  }
  
  // 检查状态
  const expectedStatus = testCase.expectedPass ? 'pass' : 'fail';
  if (result.status !== expectedStatus) {
    console.log(`  ❌ 状态错误: 期望 ${expectedStatus}, 实际 ${result.status}`);
    return false;
  }
  
  // 检查退出码
  const expectedExitCode = testCase.expectedPass ? 0 : 1;
  if (analysis.exitCode !== expectedExitCode) {
    console.log(`  ❌ 退出码错误: 期望 ${expectedExitCode}, 实际 ${analysis.exitCode}`);
    return false;
  }
  
  console.log(`  ✅ JSON 格式测试通过 (状态: ${result.status}, 评分: ${result.score}, 退出码: ${analysis.exitCode})`);
  return true;
}

/**
 * 测试 Structured 输出格式
 */
function testStructuredFormat(testCase) {
  console.log(`🧪 测试 Structured 格式: ${testCase.name}`);
  
  const filePath = path.join(TEST_CONFIG.testDir, testCase.name);
  const analysis = runHeadlessAnalysis(filePath, { format: 'structured' });
  
  if (!analysis.output) {
    console.log(`  ❌ 未能获取输出: ${analysis.error}`);
    return false;
  }
  
  const output = analysis.output;
  
  // 检查必要字段
  const requiredFields = ['STATUS:', 'SCORE:', 'THRESHOLD:', 'DATABASE:'];
  for (const field of requiredFields) {
    if (!output.includes(field)) {
      console.log(`  ❌ 缺少必要字段: ${field}`);
      return false;
    }
  }
  
  // 检查状态
  const expectedStatus = testCase.expectedPass ? 'PASS' : 'FAIL';
  if (!output.includes(`STATUS: ${expectedStatus}`)) {
    console.log(`  ❌ 状态错误: 期望包含 "STATUS: ${expectedStatus}"`);
    return false;
  }
  
  console.log(`  ✅ Structured 格式测试通过`);
  return true;
}

/**
 * 测试 Summary 输出格式
 */
function testSummaryFormat(testCase) {
  console.log(`🧪 测试 Summary 格式: ${testCase.name}`);
  
  const filePath = path.join(TEST_CONFIG.testDir, testCase.name);
  const analysis = runHeadlessAnalysis(filePath, { format: 'summary' });
  
  if (!analysis.output) {
    console.log(`  ❌ 未能获取输出: ${analysis.error}`);
    return false;
  }
  
  const output = analysis.output;
  
  // 检查输出格式
  const expectedPrefix = testCase.expectedPass ? '✓ 通过' : '✗ 失败';
  if (!output.includes(expectedPrefix)) {
    console.log(`  ❌ 输出格式错误: 期望包含 "${expectedPrefix}"`);
    return false;
  }
  
  console.log(`  ✅ Summary 格式测试通过`);
  return true;
}

/**
 * 测试阈值和退出码
 */
function testThresholdAndExitCode() {
  console.log(`🧪 测试阈值和退出码功能`);
  
  const filePath = path.join(TEST_CONFIG.testDir, 'good_query.sql');
  
  // 测试低阈值（应该通过）
  const lowThresholdResult = runHeadlessAnalysis(filePath, { 
    threshold: 60, 
    exitCode: true,
    format: 'json'
  });
  
  if (lowThresholdResult.exitCode !== 0) {
    console.log(`  ❌ 低阈值测试失败: 期望退出码 0, 实际 ${lowThresholdResult.exitCode}`);
    return false;
  }
  
  // 测试高阈值（可能失败）
  const highThresholdResult = runHeadlessAnalysis(filePath, { 
    threshold: 95, 
    exitCode: true,
    format: 'json'
  });
  
  if (highThresholdResult.result && highThresholdResult.result.score < 95) {
    if (highThresholdResult.exitCode !== 1) {
      console.log(`  ❌ 高阈值测试失败: 评分低于阈值但退出码为 ${highThresholdResult.exitCode}`);
      return false;
    }
  }
  
  console.log(`  ✅ 阈值和退出码测试通过`);
  return true;
}

/**
 * 测试输出到文件
 */
function testFileOutput() {
  console.log(`🧪 测试文件输出功能`);
  
  const filePath = path.join(TEST_CONFIG.testDir, 'good_query.sql');
  const outputFile = path.join(TEST_CONFIG.testDir, 'output.json');
  
  try {
    const command = `bun run src/index.js analyze -f "${filePath}" --quick --headless --format json --output-file "${outputFile}" --quiet`;
    execSync(command, { 
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });
    
    // 检查文件是否存在
    if (!fs.existsSync(outputFile)) {
      console.log(`  ❌ 输出文件未创建`);
      return false;
    }
    
    // 验证文件内容
    const content = fs.readFileSync(outputFile, 'utf8');
    const result = JSON.parse(content);
    
    if (!result.status || !result.score) {
      console.log(`  ❌ 输出文件格式错误`);
      return false;
    }
    
    console.log(`  ✅ 文件输出测试通过`);
    return true;
  } catch (error) {
    console.log(`  ❌ 文件输出测试失败: ${error.message}`);
    return false;
  }
}

/**
 * 测试静默模式
 */
function testQuietMode() {
  console.log(`🧪 测试静默模式`);
  
  const filePath = path.join(TEST_CONFIG.testDir, 'good_query.sql');
  
  try {
    const command = `bun run src/index.js analyze -f "${filePath}" --quick --headless --format json --pipe --quiet`;
    const output = execSync(command, { 
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });
    
    // 静默模式应该只输出结果，不包含进度信息
    if (output.includes('开始执行') || output.includes('分析完成')) {
      console.log(`  ❌ 静默模式包含了进度信息`);
      return false;
    }
    
    // 应该能解析为 JSON
    const result = JSON.parse(output);
    if (!result.status) {
      console.log(`  ❌ 静默模式输出格式错误`);
      return false;
    }
    
    console.log(`  ✅ 静默模式测试通过`);
    return true;
  } catch (error) {
    console.log(`  ❌ 静默模式测试失败: ${error.message}`);
    return false;
  }
}

/**
 * 主测试函数
 */
function main() {
  console.log('🚀 开始 Headless 模式集成测试\n');
  
  let passedTests = 0;
  let totalTests = 0;
  
  try {
    // 设置测试环境
    setupTestEnvironment();
    
    // 测试 JSON 输出格式
    console.log('📋 测试 JSON 输出格式...\n');
    for (const testCase of TEST_CONFIG.sqlFiles) {
      totalTests++;
      if (testJsonFormat(testCase)) {
        passedTests++;
      }
      console.log('');
    }
    
    // 测试 Structured 输出格式
    console.log('📋 测试 Structured 输出格式...\n');
    for (const testCase of TEST_CONFIG.sqlFiles) {
      totalTests++;
      if (testStructuredFormat(testCase)) {
        passedTests++;
      }
      console.log('');
    }
    
    // 测试 Summary 输出格式
    console.log('📋 测试 Summary 输出格式...\n');
    for (const testCase of TEST_CONFIG.sqlFiles) {
      totalTests++;
      if (testSummaryFormat(testCase)) {
        passedTests++;
      }
      console.log('');
    }
    
    // 测试阈值和退出码
    console.log('📋 测试阈值和退出码功能...\n');
    totalTests++;
    if (testThresholdAndExitCode()) {
      passedTests++;
    }
    console.log('');
    
    // 测试文件输出
    console.log('📋 测试文件输出功能...\n');
    totalTests++;
    if (testFileOutput()) {
      passedTests++;
    }
    console.log('');
    
    // 测试静默模式
    console.log('📋 测试静默模式...\n');
    totalTests++;
    if (testQuietMode()) {
      passedTests++;
    }
    console.log('');
    
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
    console.error(error.stack);
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

export { main as runHeadlessTests };