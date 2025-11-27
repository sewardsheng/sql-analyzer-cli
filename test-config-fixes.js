/**
 * 配置修复验证测试
 * 验证所有向后兼容配置移除后的正确性
 */

console.log('🔧 开始验证配置修复...\n');

async function testConfigFixes() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // 测试1: ConfigAdapters 导出检查
  try {
    const configModule = await import('./src/config/ConfigAdapters.js');
    
    const requiredExports = [
      'getAPIConfig', 'getLLMConfig', 'getServerConfig', 'getKnowledgeConfig',
      'getLearningConfig', 'getGenerationConfig', 'getEvaluationConfig',
      'getApprovalConfig', 'getStorageConfig', 'getMiddlewareConfig', 'getValidationConfig',
      'updateLearningConfig', 'updateApprovalConfig', 'updateValidationConfig'
    ];
    
    let allExportsExist = true;
    const missingExports = [];
    
    for (const exportName of requiredExports) {
      if (typeof configModule[exportName] !== 'function') {
        allExportsExist = false;
        missingExports.push(exportName);
      }
    }
    
    if (allExportsExist) {
      console.log('✅ 测试1通过: ConfigAdapters 所有必需函数都正确导出');
      results.passed++;
    } else {
      console.log('❌ 测试1失败: 缺少导出函数:', missingExports);
      results.failed++;
    }
    
    results.tests.push({
      name: 'ConfigAdapters导出检查',
      passed: allExportsExist,
      details: missingExports.length > 0 ? `缺少: ${missingExports.join(', ')}` : '所有导出正确'
    });
    
  } catch (error) {
    console.log('❌ 测试1失败: ConfigAdapters 导入错误:', error.message);
    results.failed++;
    results.tests.push({
      name: 'ConfigAdapters导出检查',
      passed: false,
      details: error.message
    });
  }

  // 测试2: 配置函数调用测试
  try {
    const { getAPIConfig, getLLMConfig, getLearningConfig, getApprovalConfig, getValidationConfig } = 
      await import('./src/config/ConfigAdapters.js');
    
    const apiConfig = getAPIConfig();
    const llmConfig = getLLMConfig();
    const learningConfig = getLearningConfig();
    const approvalConfig = getApprovalConfig();
    const validationConfig = getValidationConfig();
    
    const configsValid = apiConfig && llmConfig && learningConfig && approvalConfig && validationConfig;
    
    if (configsValid) {
      console.log('✅ 测试2通过: 所有配置函数都能正确返回配置对象');
      results.passed++;
    } else {
      console.log('❌ 测试2失败: 某些配置函数返回无效结果');
      results.failed++;
    }
    
    results.tests.push({
      name: '配置函数调用测试',
      passed: configsValid,
      details: configsValid ? '所有配置函数正常' : '配置函数异常'
    });
    
  } catch (error) {
    console.log('❌ 测试2失败: 配置函数调用错误:', error.message);
    results.failed++;
    results.tests.push({
      name: '配置函数调用测试',
      passed: false,
      details: error.message
    });
  }

  // 测试3: 模块导入测试
  const modulesToTest = [
    './src/services/rule-learning/RuleValidator.js',
    './src/services/rule-learning/AutoApprover.js',
    './src/core/llm-service.js',
    './src/core/sql-analyzer.js',
    './src/api/index.js'
  ];
  
  for (const modulePath of modulesToTest) {
    try {
      await import(modulePath);
      console.log(`✅ 模块导入成功: ${modulePath}`);
      results.passed++;
      results.tests.push({
        name: `模块导入: ${modulePath}`,
        passed: true,
        details: '导入成功'
      });
    } catch (error) {
      console.log(`❌ 模块导入失败: ${modulePath} - ${error.message}`);
      results.failed++;
      results.tests.push({
        name: `模块导入: ${modulePath}`,
        passed: false,
        details: error.message
      });
    }
  }

  // 测试4: 检查是否还有旧的配置适配器引用
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const srcDir = './src';
    const files = await recursivelyGetFiles(srcDir);
    
    let foundOldReferences = false;
    const oldReferences = [];
    
    for (const file of files) {
      if (file.endsWith('.js')) {
        const content = await fs.readFile(file, 'utf8');
        
        // 检查旧的配置适配器引用
        if (content.includes('configAdapter.') || content.includes('this.configAdapter')) {
          foundOldReferences = true;
          oldReferences.push(file);
        }
      }
    }
    
    if (!foundOldReferences) {
      console.log('✅ 测试4通过: 没有发现旧的配置适配器引用');
      results.passed++;
    } else {
      console.log('❌ 测试4失败: 发现旧的配置适配器引用:', oldReferences);
      results.failed++;
    }
    
    results.tests.push({
      name: '旧配置引用检查',
      passed: !foundOldReferences,
      details: foundOldReferences ? `发现引用: ${oldReferences.join(', ')}` : '无旧引用'
    });
    
  } catch (error) {
    console.log('❌ 测试4失败: 旧配置引用检查错误:', error.message);
    results.failed++;
    results.tests.push({
      name: '旧配置引用检查',
      passed: false,
      details: error.message
    });
  }

  // 输出测试结果
  console.log('\n📊 测试结果汇总:');
  console.log(`总测试数: ${results.tests.length}`);
  console.log(`通过: ${results.passed}`);
  console.log(`失败: ${results.failed}`);
  console.log(`成功率: ${Math.round((results.passed / results.tests.length) * 100)}%`);
  
  console.log('\n📋 详细结果:');
  results.tests.forEach(test => {
    const status = test.passed ? '✅' : '❌';
    console.log(`${status} ${test.name}: ${test.details}`);
  });
  
  return results;
}

// 递归获取文件
async function recursivelyGetFiles(dir) {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const files = [];
  
  try {
    const items = await fs.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        files.push(...await recursivelyGetFiles(fullPath));
      } else if (item.isFile() && item.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // 忽略无法读取的目录
  }
  
  return files;
}

// 运行测试
testConfigFixes().then(results => {
  if (results.failed === 0) {
    console.log('\n🎉 所有配置修复验证通过！系统已成功移除向后兼容配置。');
    process.exit(0);
  } else {
    console.log('\n⚠️  部分测试失败，请检查上述错误信息。');
    process.exit(1);
  }
}).catch(error => {
  console.error('\n💥 测试运行失败:', error);
  process.exit(1);
});