/**
 * 智能规则学习功能演示脚本
 * 展示如何使用规则学习系统的各项功能
 */

import { getRuleLearningConfig } from '../src/config/rule-learning-config.js';
import { getIntelligentRuleLearner } from '../src/services/rule-learning/IntelligentRuleLearner.js';
import { getLLMService } from '../src/core/llm-service.js';
import { getHistoryService } from '../src/services/history/historyService.js';

/**
 * 演示配置管理功能
 */
async function demoConfigManagement() {
  console.log('\n🔧 === 配置管理演示 ===');
  
  // 获取配置
  const config = getRuleLearningConfig();
  console.log('📋 默认配置:');
  console.log(`  学习功能启用: ${config.get('learning.enabled')}`);
  console.log(`  最小置信度: ${config.get('learning.minConfidence')}`);
  console.log(`  自动审批阈值: ${config.get('evaluation.autoApprovalThreshold')}`);
  
  // 更新配置
  console.log('\n🔄 更新配置...');
  config.set('learning.minConfidence', 0.8);
  config.update({
    generation: {
      maxRulesPerLearning: 15
    }
  });
  
  console.log('✅ 更新后配置:');
  console.log(`  最小置信度: ${config.get('learning.minConfidence')}`);
  console.log(`  最大规则数: ${config.get('generation.maxRulesPerLearning')}`);
  
  // 重置配置
  console.log('\n🔄 重置配置...');
  config.reset();
  console.log(`  重置后最小置信度: ${config.get('learning.minConfidence')}`);
}

/**
 * 演示智能学习功能
 */
async function demoIntelligentLearning() {
  console.log('\n🧠 === 智能学习演示 ===');
  
  const config = getRuleLearningConfig();
  const llmService = getLLMService();
  const historyService = getHistoryService();
  const ruleLearner = getIntelligentRuleLearner(llmService, historyService);
  
  // 模拟高质量分析结果
  const highQualityResult = {
    success: true,
    data: {
      performance: {
        metadata: { confidence: 0.9 },
        issues: [
          {
            type: 'select_star',
            severity: 'medium',
            description: '使用了SELECT *语句，可能影响性能'
          }
        ]
      },
      security: {
        metadata: { confidence: 0.85 },
        issues: [
          {
            type: 'sql_injection_risk',
            severity: 'high',
            description: '可能存在SQL注入风险'
          }
        ]
      },
      standards: {
        metadata: { confidence: 0.8 },
        issues: [
          {
            type: 'naming_convention',
            severity: 'low',
            description: '表名不符合命名规范'
          }
        ]
      }
    }
  };
  
  const sqlQuery = 'SELECT * FROM users WHERE id = 1';
  
  console.log(`📝 分析SQL: ${sqlQuery}`);
  console.log(`📊 分析结果置信度: 性能(0.9), 安全(0.85), 规范(0.8)`);
  
  // 判断是否应该触发学习
  const shouldLearn = await ruleLearner.shouldTriggerLearning(sqlQuery, highQualityResult);
  console.log(`🎯 是否触发学习: ${shouldLearn ? '是' : '否'}`);
  
  if (shouldLearn) {
    console.log('🚀 开始学习过程...');
    
    try {
      const learningResult = await ruleLearner.learnFromAnalysis(highQualityResult, sqlQuery);
      console.log('✅ 学习完成:');
      console.log(`  成功: ${learningResult.success}`);
      console.log(`  消息: ${learningResult.message}`);
      
      if (learningResult.generatedRules) {
        console.log(`  生成规则数: ${learningResult.generatedRules.length}`);
      }
    } catch (error) {
      console.error('❌ 学习失败:', error.message);
    }
  }
}

/**
 * 演示历史数据分析
 */
async function demoHistoryAnalysis() {
  console.log('\n📊 === 历史数据分析演示 ===');
  
  const llmService = getLLMService();
  const historyService = getHistoryService();
  const ruleLearner = getIntelligentRuleLearner(llmService, historyService);
  
  // 模拟历史数据
  const mockHistory = [
    {
      sql: 'SELECT * FROM users WHERE id = 1',
      result: {
        success: true,
        data: {
          performance: { issues: [{ type: 'select_star' }] },
          security: { issues: [{ type: 'sql_injection_risk' }] }
        }
      },
      timestamp: new Date('2025-11-26T10:00:00Z')
    },
    {
      sql: 'SELECT * FROM users WHERE id = 2',
      result: {
        success: true,
        data: {
          performance: { issues: [{ type: 'select_star' }] },
          security: { issues: [{ type: 'sql_injection_risk' }] }
        }
      },
      timestamp: new Date('2025-11-26T10:05:00Z')
    },
    {
      sql: 'SELECT * FROM users WHERE id = 3',
      result: {
        success: true,
        data: {
          performance: { issues: [{ type: 'select_star' }] },
          security: { issues: [{ type: 'sql_injection_risk' }] }
        }
      },
      timestamp: new Date('2025-11-26T10:10:00Z')
    }
  ];
  
  console.log(`📈 分析 ${mockHistory.length} 条历史记录...`);
  
  try {
    const patterns = await ruleLearner.historyAnalyzer.analyzePatterns(mockHistory);
    
    console.log('🔍 发现的模式:');
    console.log(`  SQL模式数: ${patterns.sqlPatterns.length}`);
    console.log(`  问题模式数: ${patterns.issuePatterns.length}`);
    
    if (patterns.sqlPatterns.length > 0) {
      console.log('\n📝 SQL模式示例:');
      patterns.sqlPatterns.slice(0, 2).forEach((pattern, index) => {
        console.log(`  ${index + 1}. ${pattern.pattern} (出现${pattern.frequency}次)`);
      });
    }
    
    if (patterns.issuePatterns.length > 0) {
      console.log('\n⚠️  问题模式示例:');
      patterns.issuePatterns.slice(0, 2).forEach((pattern, index) => {
        console.log(`  ${index + 1}. ${pattern.type} (${pattern.category}, 出现${pattern.frequency}次)`);
      });
    }
  } catch (error) {
    console.error('❌ 历史分析失败:', error.message);
  }
}

/**
 * 演示规则生成
 */
async function demoRuleGeneration() {
  console.log('\n🎯 === 规则生成演示 ===');
  
  const llmService = getLLMService();
  const historyService = getHistoryService();
  const ruleLearner = getIntelligentRuleLearner(llmService, historyService);
  
  // 模拟学习数据
  const learningData = {
    sqlPatterns: [
      {
        pattern: 'SELECT * FROM {table} WHERE {id} = {value}',
        examples: ['SELECT * FROM users WHERE id = 1', 'SELECT * FROM users WHERE id = 2'],
        frequency: 3,
        category: 'performance'
      }
    ],
    issuePatterns: [
      {
        type: 'select_star',
        category: 'performance',
        examples: ['SELECT * FROM users WHERE id = 1'],
        frequency: 3,
        severity: 'medium'
      },
      {
        type: 'sql_injection_risk',
        category: 'security',
        examples: ['SELECT * FROM users WHERE id = 1'],
        frequency: 3,
        severity: 'high'
      }
    ]
  };
  
  console.log('🔧 基于学习数据生成规则...');
  
  try {
    const rules = await ruleLearner.ruleGenerator.generateRules(learningData);
    
    console.log(`✅ 生成了 ${rules.length} 条规则:`);
    
    rules.forEach((rule, index) => {
      console.log(`\n${index + 1}. ${rule.title}`);
      console.log(`   类别: ${rule.category}`);
      console.log(`   严重程度: ${rule.severity}`);
      console.log(`   描述: ${rule.description.substring(0, 50)}...`);
      console.log(`   触发条件: ${rule.triggerCondition.substring(0, 50)}...`);
    });
  } catch (error) {
    console.error('❌ 规则生成失败:', error.message);
  }
}

/**
 * 演示质量评估
 */
async function demoQualityEvaluation() {
  console.log('\n📊 === 质量评估演示 ===');
  
  const llmService = getLLMService();
  const historyService = getHistoryService();
  const ruleLearner = getIntelligentRuleLearner(llmService, historyService);
  
  // 测试规则
  const testRule = {
    title: '避免使用SELECT *进行主键查询',
    description: '在主键查询中使用SELECT *会导致不必要的I/O开销，应该明确指定需要的字段名。这可以提高查询性能，减少网络传输量，并使代码更加清晰。',
    category: 'performance',
    severity: 'medium',
    triggerCondition: '检测到"SELECT * FROM {table} WHERE {primary_key} = {value}"模式',
    recommendation: '明确指定需要的字段名，避免使用SELECT *。例如：SELECT id, name, email FROM users WHERE id = 1。',
    examples: [
      {
        bad: 'SELECT * FROM users WHERE id = 1;',
        good: 'SELECT id, name, email FROM users WHERE id = 1;'
      }
    ]
  };
  
  console.log('🔍 评估规则质量...');
  console.log(`规则标题: ${testRule.title}`);
  console.log(`规则类别: ${testRule.category}`);
  
  try {
    const evaluation = await ruleLearner.qualityEvaluator.evaluateRule(testRule);
    
    console.log('\n📊 评估结果:');
    console.log(`  基础验证分数: ${evaluation.basicValidation.basicScore}`);
    console.log(`  LLM评估分数: ${evaluation.llmEvaluation.qualityScore}`);
    console.log(`  综合分数: ${evaluation.combinedScore}`);
    console.log(`  置信度: ${evaluation.llmEvaluation.confidence}`);
    
    if (evaluation.basicValidation.issues.length > 0) {
      console.log('\n⚠️  基础验证问题:');
      evaluation.basicValidation.issues.forEach(issue => {
        console.log(`    - ${issue}`);
      });
    }
    
    if (evaluation.llmEvaluation.suggestions.length > 0) {
      console.log('\n💡 改进建议:');
      evaluation.llmEvaluation.suggestions.forEach(suggestion => {
        console.log(`    - ${suggestion}`);
      });
    }
  } catch (error) {
    console.error('❌ 质量评估失败:', error.message);
  }
}

/**
 * 演示自动审批
 */
async function demoAutoApproval() {
  console.log('\n✅ === 自动审批演示 ===');
  
  const llmService = getLLMService();
  const historyService = getHistoryService();
  const ruleLearner = getIntelligentRuleLearner(llmService, historyService);
  
  // 高质量规则
  const highQualityRule = {
    id: 'demo-rule-1',
    title: '避免使用SELECT *进行主键查询',
    description: '在主键查询中使用SELECT *会导致不必要的I/O开销，应该明确指定需要的字段名。',
    category: 'performance',
    severity: 'medium',
    triggerCondition: '检测到"SELECT * FROM {table} WHERE {primary_key} = {value}"模式',
    recommendation: '明确指定需要的字段名，避免使用SELECT *。',
    evaluation: {
      combinedScore: 85,
      llmEvaluation: {
        confidence: 0.9
      }
    }
  };
  
  // 低质量规则
  const lowQualityRule = {
    id: 'demo-rule-2',
    title: '测试规则',
    description: '这是一个测试规则',
    category: 'performance',
    severity: 'low',
    triggerCondition: '测试条件',
    recommendation: '测试建议',
    evaluation: {
      combinedScore: 45,
      llmEvaluation: {
        confidence: 0.5
      }
    }
  };
  
  console.log('🔍 评估高质量规则...');
  try {
    const highQualityResult = await ruleLearner.autoApprover.evaluateForAutoApproval(highQualityRule);
    console.log(`结果: ${highQualityResult.approved ? '✅ 自动审批通过' : '❌ 需要人工审核'}`);
    console.log(`原因: ${highQualityResult.reason}`);
  } catch (error) {
    console.error('❌ 高质量规则评估失败:', error.message);
  }
  
  console.log('\n🔍 评估低质量规则...');
  try {
    const lowQualityResult = await ruleLearner.autoApprover.evaluateForAutoApproval(lowQualityRule);
    console.log(`结果: ${lowQualityResult.approved ? '✅ 自动审批通过' : '❌ 需要人工审核'}`);
    console.log(`原因: ${lowQualityResult.reason}`);
  } catch (error) {
    console.error('❌ 低质量规则评估失败:', error.message);
  }
}

/**
 * 主演示函数
 */
async function main() {
  console.log('🚀 智能规则学习功能演示');
  console.log('=' .repeat(50));
  
  try {
    await demoConfigManagement();
    await demoIntelligentLearning();
    await demoHistoryAnalysis();
    await demoRuleGeneration();
    await demoQualityEvaluation();
    await demoAutoApproval();
    
    console.log('\n🎉 演示完成！');
    console.log('\n📚 更多信息请参考:');
    console.log('  - 使用文档: docs/rule-learning-usage.md');
    console.log('  - API文档: http://localhost:3000/api/docs');
    console.log('  - 测试文件: tests/rule-learning.test.js');
    
  } catch (error) {
    console.error('❌ 演示过程中发生错误:', error);
    process.exit(1);
  }
}

// 运行演示
if (import.meta.main) {
  main();
}

export {
  demoConfigManagement,
  demoIntelligentLearning,
  demoHistoryAnalysis,
  demoRuleGeneration,
  demoQualityEvaluation,
  demoAutoApproval
};