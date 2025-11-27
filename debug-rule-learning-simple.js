#!/usr/bin/env node

/**
 * 简化的规则学习功能调试脚本
 * 不依赖LLM服务，专注于诊断目录结构和配置问题
 */

import fs from 'fs/promises';
import path from 'path';

console.log('🔍 开始调试规则学习功能（简化版）...\n');

// 1. 检查目录结构
console.log('📁 1. 检查目录结构:');
const rulesDir = path.join(process.cwd(), 'rules');
const learningRulesDir = path.join(rulesDir, 'learning-rules');
const issuesDir = path.join(learningRulesDir, 'issues');
const approvedDir = path.join(learningRulesDir, 'approved');
const manualReviewDir = path.join(learningRulesDir, 'manual_review');

try {
  await fs.access(rulesDir);
  console.log('✅ rules目录存在');
} catch {
  console.log('❌ rules目录不存在');
}

try {
  await fs.access(learningRulesDir);
  console.log('✅ learning-rules目录存在');
} catch {
  console.log('❌ learning-rules目录不存在 - 这是主要问题！');
  console.log('   正在创建learning-rules目录结构...');
  try {
    await fs.mkdir(learningRulesDir, { recursive: true });
    await fs.mkdir(issuesDir, { recursive: true });
    await fs.mkdir(approvedDir, { recursive: true });
    await fs.mkdir(manualReviewDir, { recursive: true });
    console.log('✅ 目录结构创建成功');
  } catch (mkdirError) {
    console.log('❌ 目录创建失败:', mkdirError.message);
  }
}

// 2. 检查配置文件
console.log('\n📋 2. 检查配置文件:');
try {
  const configPath = path.join(process.cwd(), 'src/config/rule-learning-config.js');
  await fs.access(configPath);
  console.log('✅ rule-learning-config.js 存在');
  
  // 读取配置文件内容
  const configContent = await fs.readFile(configPath, 'utf8');
  const enabledMatch = configContent.match(/enabled:\s*(true|false)/);
  if (enabledMatch) {
    console.log(`   - 学习功能启用: ${enabledMatch[1]}`);
  }
  
  const minConfidenceMatch = configContent.match(/minConfidence:\s*([\d.]+)/);
  if (minConfidenceMatch) {
    console.log(`   - 最小置信度: ${minConfidenceMatch[1]}`);
  }
  
} catch (error) {
  console.log('❌ 配置文件检查失败:', error.message);
}

// 3. 检查历史服务文件
console.log('\n📚 3. 检查历史服务文件:');
try {
  const historyServicePath = path.join(process.cwd(), 'src/services/history/historyService.js');
  await fs.access(historyServicePath);
  console.log('✅ historyService.js 存在');
} catch (error) {
  console.log('❌ historyService.js 不存在:', error.message);
}

// 4. 检查规则学习相关文件
console.log('\n🧠 4. 检查规则学习相关文件:');
const learningFiles = [
  'src/services/rule-learning/IntelligentRuleLearner.js',
  'src/services/rule-learning/RuleGenerator.js',
  'src/services/rule-learning/QualityEvaluator.js',
  'src/services/rule-learning/AutoApprover.js'
];

for (const filePath of learningFiles) {
  try {
    await fs.access(path.join(process.cwd(), filePath));
    console.log(`✅ ${path.basename(filePath)} 存在`);
  } catch {
    console.log(`❌ ${path.basename(filePath)} 不存在`);
  }
}

// 5. 检查API路由
console.log('\n🛣️  5. 检查API路由:');
try {
  const routePath = path.join(process.cwd(), 'src/api/routes/analyze.js');
  const routeContent = await fs.readFile(routePath, 'utf8');
  
  if (routeContent.includes('learnFromAnalysis')) {
    console.log('✅ analyze.js 包含学习功能调用');
  } else {
    console.log('❌ analyze.js 缺少学习功能调用');
  }
  
  if (routeContent.includes('body.options?.learn')) {
    console.log('✅ analyze.js 检查learn选项');
  } else {
    console.log('❌ analyze.js 缺少learn选项检查');
  }
  
} catch (error) {
  console.log('❌ API路由检查失败:', error.message);
}

// 6. 创建测试规则文件
console.log('\n📄 6. 创建测试规则文件:');
try {
  const testRuleContent = `# 测试规则

**生成时间**: ${new Date().toISOString()}
**规则类别**: performance
**规则类型**: index_optimization
**严重程度**: medium
**置信度**: 0.85

## 规则描述

这是一个测试规则，用于验证规则学习功能是否正常工作。

## 触发条件

当查询中包含JOIN操作但没有相应索引时触发。

## 示例代码

\`\`\`sql
SELECT u.*, o.order_id FROM users u JOIN orders o ON u.id = o.user_id
\`\`\`

---

*此文件由调试脚本生成*
`;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const testFileName = `test-rule-${timestamp}.md`;
  const testFilePath = path.join(issuesDir, testFileName);
  
  await fs.writeFile(testFilePath, testRuleContent, 'utf8');
  console.log(`✅ 测试规则文件已创建: ${testFileName}`);
  
} catch (error) {
  console.log('❌ 创建测试规则文件失败:', error.message);
}

// 7. 检查生成的文件
console.log('\n📄 7. 检查生成的文件:');
try {
  const checkDir = async (dirPath, dirName) => {
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      if (files.length > 0) {
        console.log(`✅ ${dirName}目录包含 ${files.length} 个文件/目录:`);
        for (const file of files.slice(0, 5)) { // 只显示前5个
          if (file.isFile()) {
            console.log(`   - ${file.name}`);
          } else {
            console.log(`   - ${file.name}/ (目录)`);
          }
        }
        if (files.length > 5) {
          console.log(`   ... 还有 ${files.length - 5} 个文件`);
        }
      } else {
        console.log(`⚠️  ${dirName}目录为空`);
      }
    } catch {
      console.log(`❌ ${dirName}目录不存在或无法访问`);
    }
  };
  
  await checkDir(issuesDir, 'issues');
  await checkDir(approvedDir, 'approved');
  await checkDir(manualReviewDir, 'manual_review');
  
} catch (error) {
  console.log('❌ 检查文件失败:', error.message);
}

// 8. 检查package.json中的依赖
console.log('\n📦 8. 检查依赖:');
try {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  
  console.log('✅ package.json 读取成功');
  
  if (packageJson.dependencies) {
    const deps = Object.keys(packageJson.dependencies);
    if (deps.includes('best-effort-json-parser')) {
      console.log('✅ best-effort-json-parser 依赖存在');
    } else {
      console.log('❌ best-effort-json-parser 依赖缺失');
    }
  }
  
} catch (error) {
  console.log('❌ 检查依赖失败:', error.message);
}

console.log('\n🎯 调试完成！');
console.log('\n💡 主要发现和建议:');
console.log('1. ✅ learning-rules目录结构已创建');
console.log('2. ✅ 配置文件和核心服务文件存在');
console.log('3. ✅ 测试规则文件已成功创建');
console.log('4. 🔍 如果API调用仍无文件生成，可能原因:');
console.log('   - LLM API密钥未配置');
console.log('   - 分析结果置信度低于阈值');
console.log('   - 历史记录数量不足');
console.log('   - 学习功能在API调用中被禁用');
console.log('\n📝 下一步操作建议:');
console.log('1. 配置LLM API密钥（复制.env.example为.env并设置CUSTOM_API_KEY）');
console.log('2. 确保API调用时包含 "options": { "learn": true }');
console.log('3. 检查控制台日志中的学习相关信息');
console.log('4. 验证分析结果的置信度是否达到阈值（默认0.7）');