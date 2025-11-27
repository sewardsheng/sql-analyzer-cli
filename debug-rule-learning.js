#!/usr/bin/env node

/**
 * 规则学习功能调试脚本
 * 用于诊断为什么规则学习功能没有生成文件
 */

import fs from 'fs/promises';
import path from 'path';

// 模拟导入
const { getRuleLearningConfig } = await import('./src/config/rule-learning-config.js');
const { getIntelligentRuleLearner } = await import('./src/services/rule-learning/IntelligentRuleLearner.js');
const { getLLMService } = await import('./src/core/llm-service.js');
const { getHistoryService } = await import('./src/services/history/historyService.js');

console.log('🔍 开始调试规则学习功能...\n');

// 1. 检查配置
console.log('📋 1. 检查规则学习配置:');
try {
  const config = getRuleLearningConfig();
  const allConfig = config.getAll();
  
  console.log('✅ 配置加载成功');
  console.log(`   - 学习功能启用: ${allConfig.learning.enabled}`);
  console.log(`   - 最小置信度: ${allConfig.learning.minConfidence}`);
  console.log(`   - 最小批量大小: ${allConfig.learning.minBatchSize}`);
  console.log(`   - 实时学习启用: ${allConfig.learning.enableRealTimeLearning}`);
  console.log(`   - 批量学习启用: ${allConfig.learning.enableBatchLearning}`);
  console.log(`   - 规则存储目录: ${allConfig.storage.rulesRootDir}`);
} catch (error) {
  console.log('❌ 配置加载失败:', error.message);
}

// 2. 检查目录结构
console.log('\n📁 2. 检查目录结构:');
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

// 3. 检查历史服务
console.log('\n📚 3. 检查历史服务:');
try {
  const historyService = getHistoryService();
  const stats = await historyService.getStatistics();
  console.log('✅ 历史服务正常');
  console.log(`   - 总记录数: ${stats.totalRecords}`);
  console.log(`   - 今日记录数: ${stats.todayRecords}`);
} catch (error) {
  console.log('❌ 历史服务异常:', error.message);
}

// 4. 检查LLM服务
console.log('\n🤖 4. 检查LLM服务:');
try {
  const llmService = getLLMService();
  console.log('✅ LLM服务正常');
} catch (error) {
  console.log('❌ LLM服务异常:', error.message);
}

// 5. 模拟一次学习过程
console.log('\n🧪 5. 模拟学习过程:');
try {
  const llmService = getLLMService();
  const historyService = getHistoryService();
  const ruleLearner = getIntelligentRuleLearner(llmService, historyService);
  
  // 创建模拟分析结果
  const mockAnalysisResult = {
    success: true,
    data: {
      performance: {
        data: {
          issues: [
            {
              type: 'missing_index',
              severity: 'medium',
              description: '缺少索引可能导致查询性能下降',
              location: 'JOIN操作'
            }
          ]
        },
        metadata: {
          confidence: 0.85
        }
      },
      security: {
        data: {
          vulnerabilities: [
            {
              type: 'sql_injection_risk',
              severity: 'high',
              cwe: 'CWE-89',
              description: '可能存在SQL注入风险'
            }
          ]
        },
        metadata: {
          confidence: 0.9
        }
      },
      standards: {
        data: {
          violations: [
            {
              type: 'naming_convention',
              severity: 'low',
              rule: '表名应使用小写',
              description: '表名不符合命名规范'
            }
          ]
        },
        metadata: {
          confidence: 0.8
        }
      }
    },
    metadata: {
      databaseType: 'mysql'
    }
  };
  
  const mockSQL = "SELECT u.*, o.order_id FROM users u JOIN orders o ON u.id = o.user_id WHERE u.created_at > '2025-01-01'";
  
  console.log('   开始模拟学习...');
  const result = await ruleLearner.learnFromAnalysis(mockAnalysisResult, mockSQL);
  
  if (result.success) {
    console.log('✅ 模拟学习成功');
    console.log(`   - 生成规则数: ${result.generated}`);
    console.log(`   - 评估规则数: ${result.evaluated}`);
    console.log(`   - 审批规则数: ${result.approved}`);
  } else {
    console.log('❌ 模拟学习失败:', result.reason || result.error);
  }
  
} catch (error) {
  console.log('❌ 模拟学习过程异常:', error.message);
  console.log('   错误堆栈:', error.stack);
}

// 6. 检查生成的文件
console.log('\n📄 6. 检查生成的文件:');
try {
  const checkDir = async (dirPath, dirName) => {
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      if (files.length > 0) {
        console.log(`✅ ${dirName}目录包含 ${files.length} 个文件/目录:`);
        for (const file of files) {
          if (file.isFile()) {
            console.log(`   - ${file.name}`);
          } else {
            console.log(`   - ${file.name}/ (目录)`);
          }
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

console.log('\n🎯 调试完成！');
console.log('\n💡 可能的问题和解决方案:');
console.log('1. learning-rules目录不存在 - 已自动创建');
console.log('2. 学习功能配置问题 - 检查配置文件');
console.log('3. 历史记录不足 - 需要更多分析记录');
console.log('4. LLM服务问题 - 检查API配置');
console.log('5. 置信度阈值过高 - 调整minConfidence配置');