/**
 * 测试文件存储逻辑修复
 */

import { getIntelligentRuleLearner } from './src/services/rule-learning/IntelligentRuleLearner.js';
import { getLLMService } from './src/core/llm-service.js';
import { getHistoryService } from './src/services/history/historyService.js';

async function testStorageFix() {
  console.log('🧪 开始测试文件存储逻辑修复...\n');

  try {
    // 初始化服务
    const llmService = getLLMService();
    const historyService = getHistoryService();
    const ruleLearner = getIntelligentRuleLearner(llmService, historyService);

    // 模拟分析结果
    const mockAnalysisResult = {
      success: true,
      data: {
        performance: {
          data: {
            summary: '查询存在性能问题，需要优化索引',
            issues: [
              {
                type: '索引缺失',
                description: 'WHERE条件字段缺少索引',
                severity: 'high'
              }
            ]
          },
          metadata: { confidence: 0.8 }
        },
        security: {
          data: {
            summary: '存在SQL注入风险',
            vulnerabilities: [
              {
                type: 'SQL注入',
                description: '硬编码参数存在注入风险',
                severity: 'high'
              }
            ]
          },
          metadata: { confidence: 0.9 }
        },
        standards: {
          data: {
            summary: '编码规范需要改进',
            violations: [
              {
                type: '命名规范',
                description: '使用了SELECT *',
                severity: 'warning'
              }
            ]
          },
          metadata: { confidence: 0.7 }
        }
      },
      metadata: {
        databaseType: 'mysql',
        timestamp: new Date().toISOString()
      }
    };

    const mockSQL = "SELECT * FROM users WHERE created_at > '2025-01-01'";

    console.log('📝 模拟SQL:', mockSQL);
    console.log('📊 分析结果置信度:', {
      performance: 0.8,
      security: 0.9,
      standards: 0.7,
      average: (0.8 + 0.9 + 0.7) / 3
    });

    // 执行学习
    console.log('\n🚀 开始执行规则学习...');
    const result = await ruleLearner.learnFromAnalysis(mockAnalysisResult, mockSQL);

    console.log('\n✅ 学习结果:');
    console.log('- 成功:', result.success);
    console.log('- 生成规则数:', result.generated);
    console.log('- 评估规则数:', result.evaluated);
    console.log('- 审批规则数:', result.approved);

    if (result.success) {
      console.log('\n🎉 存储逻辑修复测试成功！');
      console.log('📁 请检查以下目录中的文件:');
      console.log('   - rules/learning-rules/approved/2025-11/');
      console.log('   - rules/learning-rules/manual_review/2025-11/');
      console.log('   - rules/learning-rules/issues/2025-11/');
    } else {
      console.log('\n❌ 学习失败:', result.error);
    }

  } catch (error) {
    console.error('\n💥 测试失败:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

// 运行测试
testStorageFix();