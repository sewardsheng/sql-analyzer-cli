/**
 * 规则学习命令模块
 * 触发规则学习系统
 */

import { generateRulesFromHistory } from '../../services/rule-learning/rule-generator.js';
import { getLLMService } from '../../core/llm-service.js';
import { cli as cliTools } from '../../utils/cli/index.js';
import { ServiceContainer } from '../../services/factories/ServiceContainer.js';

/**
 * 规则学习命令类 - 极简版
 * 老王我直接使用TestDrivenRuleGenerator，干掉那些SB组件！
 */
export class LearnCommand {
  private serviceContainer: ServiceContainer;

  constructor(serviceContainer?: ServiceContainer) {
    // 使用依赖注入，方便测试
    this.serviceContainer = serviceContainer || ServiceContainer.getInstance();
  }

  /**
   * 执行规则学习命令
   */
  async execute(options: any): Promise<void> {
    try {
      cliTools.log.info('🧠 开始规则学习...');

      // 从服务容器获取历史服务
      const historyService = await this.serviceContainer.getHistoryService();

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

      // 执行批量学习 - 使用TestDrivenRuleGenerator
      cliTools.log.info('🔄 正在执行批量规则学习...');
      const startTime = Date.now();

      const learningResult = await generateRulesFromHistory(historyService, {
        maxRules: options.maxRules || 10,
        minConfidence: options.minConfidence || 0.7
      });

      const duration = Date.now() - startTime;

      // 显示学习结果
      console.log('\n🧠 规则学习结果:');
      console.log('=' .repeat(50));
      console.log(`⏱️  学习耗时: ${(duration / 1000).toFixed(2)}秒`);
      console.log(`📚 处理的历史记录: ${learningResult.processedRecords || historyStats.total}`);
      console.log(`📝 生成的规则: ${learningResult.rules?.length || 0}`);
      console.log(`📁 保存位置: rules/learning-rules/generated/`);

      if (learningResult.rules && learningResult.rules.length > 0) {
        console.log('\n🆕 新生成的规则:');
        learningResult.rules.forEach((rule: any, index: number) => {
          console.log(`  ${index + 1}. ${rule.title || rule.name || rule.id || '未知规则'}`);
          console.log(`     ${rule.description || '无描述'}`);
          console.log(`     类别: ${rule.category || '通用'}`);
          console.log(`     置信度: ${rule.confidence || '未知'}`);
          console.log('');
        });
      }

      // 暂时禁用错误显示，因为学习结果结构不同
      if (learningResult && (learningResult as any).errors && (learningResult as any).errors.length > 0) {
        console.log('\n❌ 学习过程中的错误:');
        (learningResult as any).errors.forEach((error: string, index: number) => {
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