/**
 * 测试验证器集成
 * 验证重构后的QualityEvaluator和AutoApprover是否正常工作
 */

import { QualityEvaluator } from './src/services/rule-learning/QualityEvaluator.js';
import { AutoApprover } from './src/services/rule-learning/AutoApprover.js';

// 模拟LLM服务
class MockLLMService {
  async generateResponse({ systemPrompt, userPrompt }) {
    // 模拟LLM评估响应
    return {
      content: JSON.stringify({
        qualityScore: 85,
        qualityLevel: 'good',
        shouldKeep: true,
        evaluationSummary: '规则质量良好，具有实用价值',
        dimensionScores: {
          accuracy: 90,
          completeness: 80,
          practicality: 85,
          generality: 85,
          consistency: 85
        },
        strengths: [
          '规则描述清晰',
          '示例代码准确',
          '触发条件合理'
        ],
        issues: [
          '可以增加更多边界情况说明'
        ]
      })
    };
  }
}

// 测试规则数据
const testRules = [
  {
    title: '使用参数化查询防止SQL注入',
    description: '将用户输入作为参数传递，而不是字符串拼接，防止SQL注入攻击。这是最基本也是最重要的安全防护措施。',
    category: 'security',
    type: 'SQL注入防护',
    severity: 'critical',
    confidence: 0.95,
    condition: '检测到用户输入直接拼接到SQL查询中',
    example: 'SELECT * FROM users WHERE id = {userId}'
  },
  {
    title: '为WHERE条件添加索引',
    description: '为经常用于WHERE条件的列创建索引，可以显著提高查询性能',
    category: 'performance',
    type: '索引优化',
    severity: 'high',
    confidence: 0.85,
    condition: 'WHERE条件中的列没有索引',
    example: 'CREATE INDEX idx_user_email ON users(email)'
  },
  {
    title: '表名使用下划线命名',
    description: '表名应该使用小写字母和下划线，提高可读性',
    category: 'standards',
    type: '命名规范',
    severity: 'medium',
    confidence: 0.75,
    condition: '表名包含大写字母或空格',
    example: 'CREATE TABLE user_profiles (...)'
  }
];

// 模拟学习上下文
const mockContext = {
  databaseType: 'MySQL',
  sql: 'SELECT * FROM users WHERE name = "' + 'testUser' + '"',
  currentAnalysis: {
    data: {
      performance: {
        data: {
          summary: '查询存在SQL注入风险',
          issues: [
            { type: 'SQL注入', description: '用户输入直接拼接' }
          ]
        }
      },
      security: {
        data: {
          summary: '严重安全漏洞',
          vulnerabilities: [
            { type: 'SQL注入', description: '可被攻击者利用' }
          ]
        }
      },
      standards: {
        data: {
          summary: '命名规范问题',
          violations: [
            { type: '命名', description: '应该使用参数化查询' }
          ]
        }
      }
    }
  },
  patterns: {
    security: [
      { type: 'SQL注入模式', description: '字符串拼接用户输入' }
    ]
  }
};

async function testValidatorIntegration() {
  console.log('🔗 开始测试验证器集成...\n');
  
  const mockLLMService = new MockLLMService();
  const qualityEvaluator = new QualityEvaluator(mockLLMService);
  const autoApprover = new AutoApprover();
  
  // 测试QualityEvaluator
  console.log('📊 测试QualityEvaluator:');
  console.log('=' .repeat(50));
  
  try {
    const evaluatedRules = await qualityEvaluator.evaluateBatch(testRules, mockContext);
    
    console.log(`✅ 成功评估 ${evaluatedRules.length} 条规则\n`);
    
    evaluatedRules.forEach((rule, index) => {
      console.log(`🔍 规则 ${index + 1}: ${rule.title}`);
      console.log(`  📊 质量分数: ${rule.evaluation.qualityScore}`);
      console.log(`  📈 质量等级: ${rule.evaluation.qualityLevel}`);
      console.log(`  ✅ 建议保留: ${rule.evaluation.shouldKeep}`);
      console.log(`  📝 评估摘要: ${rule.evaluation.evaluationSummary}`);
      
      if (rule.evaluation.basicValidation?.issues?.length > 0) {
        console.log(`  ⚠️  基础问题: ${rule.evaluation.basicValidation.issues.join(', ')}`);
      }
      
      if (rule.evaluation.llmEvaluation?.strengths?.length > 0) {
        console.log(`  💪 优势: ${rule.evaluation.llmEvaluation.strengths.join(', ')}`);
      }
      
      console.log('');
    });
    
    // 生成质量报告
    const qualityReport = qualityEvaluator.generateQualityReport(evaluatedRules);
    console.log('📋 质量报告:');
    console.log(`  总数: ${qualityReport.total}`);
    console.log(`  平均分: ${qualityReport.averageScore}`);
    console.log(`  保留数量: ${qualityReport.shouldKeepCount}`);
    console.log(`  质量分布:`, qualityReport.qualityDistribution);
    
  } catch (error) {
    console.error('❌ QualityEvaluator测试失败:', error.message);
  }
  
  // 测试AutoApprover
  console.log('\n\n📊 测试AutoApprover:');
  console.log('=' .repeat(50));
  
  try {
    // 先获取评估结果
    const evaluatedRules = await qualityEvaluator.evaluateBatch(testRules, mockContext);
    
    // 为每个规则添加评估结果
    const rulesWithEvaluation = testRules.map((rule, index) => ({
      ...rule,
      evaluation: evaluatedRules[index].evaluation
    }));
    
    const approvedRules = await autoApprover.process(rulesWithEvaluation);
    
    console.log(`✅ 成功处理 ${rulesWithEvaluation.length} 条规则，审批通过 ${approvedRules.length} 条\n`);
    
    // 显示审批统计
    const approvalStats = autoApprover.getApprovalStats();
    console.log('📋 审批统计:');
    console.log(`  总处理: ${approvalStats.totalProcessed}`);
    console.log(`  自动审批: ${approvalStats.autoApproved}`);
    console.log(`  人工审核: ${approvalStats.manualReview}`);
    console.log(`  拒绝: ${approvalStats.rejected}`);
    
    // 显示每个规则的审批结果
    console.log('\n🔍 详细审批结果:');
    for (const [index, rule] of rulesWithEvaluation.entries()) {
      const decision = await autoApprover.evaluateRuleForApproval(rule);
      console.log(`  规则 ${index + 1}: ${rule.title}`);
      console.log(`    🎯 审批结果: ${decision.action}`);
      console.log(`    📝 原因: ${decision.reason}`);
    }
    
  } catch (error) {
    console.error('❌ AutoApprover测试失败:', error.message);
  }
  
  // 测试缓存功能
  console.log('\n\n📊 测试缓存功能:');
  console.log('=' .repeat(50));
  
  try {
    const rule = testRules[0];
    
    // 第一次评估
    console.log('🕐 第一次评估...');
    const start1 = Date.now();
    const result1 = await qualityEvaluator.evaluateRule(rule, mockContext);
    const time1 = Date.now() - start1;
    console.log(`  ⏱️  耗时: ${time1}ms`);
    console.log(`  📊 分数: ${result1.qualityScore}`);
    
    // 第二次评估（应该使用缓存）
    console.log('\n🕐 第二次评估（使用缓存）...');
    const start2 = Date.now();
    const result2 = await qualityEvaluator.evaluateRule(rule, mockContext);
    const time2 = Date.now() - start2;
    console.log(`  ⏱️  耗时: ${time2}ms`);
    console.log(`  📊 分数: ${result2.qualityScore}`);
    console.log(`  🚀 缓存加速: ${time1 > time2 ? '是' : '否'} (${time1 - time2}ms)`);
    
    // 缓存统计
    const cacheStats = qualityEvaluator.getCacheStats();
    console.log(`\n📊 缓存统计:`);
    console.log(`  大小: ${cacheStats.size}`);
    
  } catch (error) {
    console.error('❌ 缓存测试失败:', error.message);
  }
  
  console.log('\n✅ 验证器集成测试完成!');
}

// 运行测试
testValidatorIntegration().catch(console.error);