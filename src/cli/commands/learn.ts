/**
 * 规则学习命令模块
 * 触发规则学习系统
 */

import { getHistoryService } from '../../services/history-service.js';
import { getIntelligentRuleLearner } from '../../services/rule-learning/rule-learner.js';
import { getLLMService } from '../../core/llm-service.js';
import { cli as cliTools } from '../../utils/cli/index.js';

/**
 * 规则学习命令类
 */
export class LearnCommand {
  /**
   * 执行规则学习命令
   */
  async execute(options: any): Promise<void> {
    try {
      cliTools.log.info('🧠 开始规则学习...');

      // 初始化服务
      const historyService = await getHistoryService();
      const llmService = getLLMService();
      const ruleLearner = getIntelligentRuleLearner(llmService, historyService);

      // 获取历史统计
      const historyStats = await historyService.getHistoryStats();
      cliTools.log.info(`📊 历史记录总数: ${historyStats.total}`);

      if (historyStats.total < 5 && !options.force) {
        cliTools.log.warn('⚠️  历史记录数量较少（至少需要5条记录），学习效果可能不佳');

        const proceed = await cliTools.prompt.confirm('是否继续学习？', false);
        if (!proceed) {
          cliTools.log.info('❌ 已取消规则学习');
          return;
        }
      } else if (historyStats.total < 5 && options.force) {
        cliTools.log.warn('⚠️  使用--force选项，强制开始学习（历史记录较少）');
      }

      // 执行批量学习
      cliTools.log.info('🔄 正在执行批量规则学习...');
      const startTime = Date.now();

      const learningResult = await ruleLearner.performBatchLearning({
        minConfidence: options.minConfidence || 0.7,
        maxRules: options.maxRules || 10,
        forceLearn: options.force || false
      });

      const duration = Date.now() - startTime;

      // 显示学习结果
      console.log('\n🧠 规则学习结果:');
      console.log('=' .repeat(50));
      console.log(`⏱️  学习耗时: ${(duration / 1000).toFixed(2)}秒`);
      console.log(`📚 处理的历史记录: ${learningResult.processedRecords || 0}`);
      console.log(`🔍 识别的模式: ${learningResult.patternsIdentified || 0}`);
      console.log(`📝 生成的规则: ${learningResult.generatedRules || 0}`);
      console.log(`✅ 批准的规则: ${learningResult.approvedRules || 0}`);

      if (learningResult.newRules && learningResult.newRules.length > 0) {
        console.log('\n🆕 新生成的规则:');
        learningResult.newRules.forEach((rule: any, index: number) => {
          console.log(`  ${index + 1}. ${rule.name || rule.id}`);
          console.log(`     ${rule.description || '无描述'}`);
          console.log(`     置信度: ${rule.confidence || '未知'}`);
          console.log(`     类型: ${rule.type || '通用'}`);
          console.log('');
        });
      }

      if (learningResult.errors && learningResult.errors.length > 0) {
        console.log('\n❌ 学习过程中的错误:');
        learningResult.errors.forEach((error: string, index: number) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      }

      cliTools.log.success('✅ 规则学习完成！');

    } catch (error: any) {
      cliTools.log.error(`❌ 规则学习失败: ${error.message}`);

      if (options.debug) {
        console.error('\n调试信息:');
        console.error(error.stack);
      }

      throw error;
    }
  }
}