/**
 * 测试统一规则验证器
 * 验证重构后的验证逻辑是否正常工作
 */

import { RuleValidator } from './src/services/rule-learning/RuleValidator.js';

// 测试数据
const testRules = [
  {
    title: '完整的规则',
    description: '这是一个完整的规则描述，包含足够的信息来说明规则的目的和适用场景',
    category: 'security',
    type: 'SQL注入防护',
    severity: 'high',
    confidence: 0.9,
    condition: '检测到用户输入直接拼接到SQL查询中',
    example: 'SELECT * FROM users WHERE id = {userId}'
  },
  {
    title: '短标题',
    description: '描述过短',
    category: 'performance',
    type: '索引优化',
    severity: 'medium',
    confidence: 0.6,
    condition: '缺少索引',
    example: 'SELECT * FROM large_table'
  },
  {
    title: '缺少字段的规则',
    description: '这个规则缺少一些必需字段',
    category: 'standards',
    type: '命名规范',
    // 缺少 severity, confidence, condition, example
    example: 'SELECT col FROM table'
  },
  {
    title: '无效值的规则',
    description: '这个规则包含无效的字段值',
    category: 'invalid_category',
    type: '测试类型',
    severity: 'invalid_severity',
    confidence: 1.5, // 超出范围
    condition: '测试条件',
    example: 'SELECT * FROM test'
  },
  {
    title: '安全规则但严重程度不足',
    description: '这是一个安全规则但严重程度为low',
    category: 'security',
    type: '权限检查',
    severity: 'low', // 安全规则应该是high或critical
    confidence: 0.85,
    condition: '检测到权限不足的访问',
    example: 'SELECT sensitive_data FROM public_table'
  }
];

async function testRuleValidator() {
  console.log('🧪 开始测试统一规则验证器...\n');
  
  const validator = new RuleValidator();
  
  // 测试基础验证
  console.log('📋 测试基础验证 (QualityEvaluator使用):');
  console.log('=' .repeat(50));
  
  testRules.forEach((rule, index) => {
    console.log(`\n🔍 测试规则 ${index + 1}: ${rule.title}`);
    const basicResult = validator.performBasicValidation(rule);
    
    console.log(`  ✅ 通过: ${basicResult.passed}`);
    console.log(`  📊 分数: ${basicResult.score}`);
    if (basicResult.issues.length > 0) {
      console.log(`  ⚠️  问题: ${basicResult.issues.join(', ')}`);
    }
  });
  
  // 测试完整性验证
  console.log('\n\n📋 测试完整性验证 (AutoApprover使用):');
  console.log('=' .repeat(50));
  
  testRules.forEach((rule, index) => {
    console.log(`\n🔍 测试规则 ${index + 1}: ${rule.title}`);
    const completeResult = validator.performCompletenessValidation(rule);
    
    console.log(`  ✅ 通过: ${completeResult.passed}`);
    console.log(`  📊 分数: ${completeResult.score}`);
    if (completeResult.issues.length > 0) {
      console.log(`  ⚠️  问题: ${completeResult.issues.join(', ')}`);
    }
    console.log(`  📝 原因: ${completeResult.reason}`);
  });
  
  // 测试安全规则验证
  console.log('\n\n📋 测试安全规则验证:');
  console.log('=' .repeat(50));
  
  testRules.forEach((rule, index) => {
    console.log(`\n🔍 测试规则 ${index + 1}: ${rule.title}`);
    const securityResult = validator.validateSecurityRule(rule);
    
    console.log(`  ✅ 通过: ${securityResult.valid}`);
    console.log(`  📝 原因: ${securityResult.reason}`);
  });
  
  // 测试综合验证
  console.log('\n\n📋 测试综合验证:');
  console.log('=' .repeat(50));
  
  testRules.forEach((rule, index) => {
    console.log(`\n🔍 测试规则 ${index + 1}: ${rule.title}`);
    
    // 基础级别
    const basicResult = validator.validate(rule, 'basic');
    console.log(`  📊 基础验证: ${basicResult.passed ? '✅' : '❌'} (${basicResult.score}分)`);
    
    // 完整级别
    const completeResult = validator.validate(rule, 'complete');
    console.log(`  📊 完整验证: ${completeResult.passed ? '✅' : '❌'} (${completeResult.combinedScore}分)`);
    
    // 严格级别
    const strictResult = validator.validate(rule, 'strict');
    console.log(`  📊 严格验证: ${strictResult.passed ? '✅' : '❌'} (${strictResult.combinedScore}分)`);
  });
  
  // 测试批量验证
  console.log('\n\n📋 测试批量验证:');
  console.log('=' .repeat(50));
  
  const batchResults = validator.validateBatch(testRules, 'complete');
  const stats = validator.getValidationStats(batchResults);
  
  console.log(`📊 批量验证统计:`);
  console.log(`  总数: ${stats.total}`);
  console.log(`  通过: ${stats.passed}`);
  console.log(`  失败: ${stats.failed}`);
  console.log(`  通过率: ${stats.passRate}%`);
  console.log(`  平均分: ${stats.averageScore}`);
  
  if (Object.keys(stats.commonIssues).length > 0) {
    console.log(`\n⚠️  常见问题:`);
    Object.entries(stats.commonIssues).forEach(([issue, count]) => {
      console.log(`  ${issue}: ${count}次`);
    });
  }
  
  // 测试配置更新
  console.log('\n\n📋 测试配置更新:');
  console.log('=' .repeat(50));
  
  const originalConfig = validator.getConfig();
  console.log('📝 原始配置:', JSON.stringify(originalConfig.fieldLengths, null, 2));
  
  // 更新配置
  validator.updateConfig({
    fieldLengths: {
      title: { min: 8, recommended: 12 },
      description: { min: 25, recommended: 35 }
    }
  });
  
  const updatedConfig = validator.getConfig();
  console.log('📝 更新后配置:', JSON.stringify(updatedConfig.fieldLengths, null, 2));
  
  // 验证配置更新是否生效
  const testRule = testRules[1]; // 短标题的规则
  const newValidation = validator.performBasicValidation(testRule);
  console.log(`\n🔍 配置更新后重新测试短标题规则:`);
  console.log(`  ✅ 通过: ${newValidation.passed}`);
  console.log(`  📊 分数: ${newValidation.score}`);
  
  console.log('\n✅ 统一规则验证器测试完成!');
}

// 运行测试
testRuleValidator().catch(console.error);