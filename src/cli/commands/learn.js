/**
 * 学习命令模块
 * 提供加载rules目录中的文档到知识库功能，以及规则质量管理
 */

/**
 * 注册learn命令及其子命令
 * @param {Object} program - commander程序对象
 */
function register(program) {
  // 主命令
  const learnCommand = program
    .command('learn')
    .description('管理知识库和规则学习');

  // 子命令：load - 加载文档到知识库
  learnCommand
    .command('load')
    .description('加载rules目录中的文档到知识库')
    .option('-r, --rules-dir <dir>', 'rules目录路径', './rules')
    .option('--priority-approved', '优先加载approved目录中的规则', false)
    .option('--api-key <key>', 'OpenAI API密钥')
    .option('--base-url <url>', 'API基础URL')
    .option('--model <model>', '使用的模型名称')
    .option('--embedding-model <model>', '嵌入模型名称')
    .action(async (options) => {
      try {
        const { learnDocuments } = await import('../../services/knowledge/learn.js');
        await learnDocuments(options);
        process.exit(0);
      } catch (error) {
        console.error('加载文档时发生错误:', error.message);
        process.exit(1);
      }
    });

  // 子命令：reset - 重置知识库
  learnCommand
    .command('reset')
    .description('重置知识库')
    .action(async () => {
      try {
        const { resetVectorStore } = await import('../../core/vectorStore.js');
        const chalk = (await import('chalk')).default;
        const ora = (await import('ora')).default;
        
        const spinner = ora('正在重置知识库...').start();
        const success = await resetVectorStore();
        
        if (success) {
          spinner.succeed('知识库已重置');
        } else {
          spinner.fail('重置知识库失败');
          process.exit(1);
        }
        process.exit(0);
      } catch (error) {
        console.error('重置知识库时发生错误:', error.message);
        process.exit(1);
      }
    });

  // 子命令：cleanup - 评估并清理低质量规则
  learnCommand
    .command('cleanup')
    .description('评估并清理所有低质量规则')
    .option('--score <score>', '质量分数阈值(0-100)，低于此分数的规则将被清理', '60')
    .option('--backup', '备份低质量规则到归档目录')
    .option('--no-auto-move', '禁用自动分类，使用传统删除方式')
    .option('--rules-dir <dir>', '要清理的规则目录', './rules/learning-rules')
    .action(async (options) => {
      try {
        const { cleanupRules } = await import('../../services/knowledge/cleanup.js');
        await cleanupRules(options);
        process.exit(0);
      } catch (error) {
        console.error('清理规则时发生错误:', error.message);
        process.exit(1);
      }
    });

  // 子命令：evaluate - 评估所有规则质量
  learnCommand
    .command('evaluate')
    .description('评估所有规则文件的质量')
    .option('--report', '生成详细评估报告')
    .option('--no-auto-move', '禁用自动分类，仅评估不移动文件')
    .option('--rules-dir <dir>', '规则目录', './rules/learning-rules')
    .action(async (options) => {
      try {
        const { evaluateRules } = await import('../../services/knowledge/evaluate.js');
        // 默认评估所有文件
        await evaluateRules({ ...options, all: true });
        process.exit(0);
      } catch (error) {
        console.error('评估规则时发生错误:', error.message);
        process.exit(1);
      }
    });

  // 子命令：approve - 手动认可规则文件
  learnCommand
    .command('approve <file>')
    .description('手动将规则文件移动到approved目录')
    .option('--rules-dir <dir>', '规则目录', './rules/learning-rules')
    .action(async (file, options) => {
      try {
        const { approveRule } = await import('../../services/knowledge/approve.js');
        await approveRule(file, options);
        process.exit(0);
      } catch (error) {
        console.error('认可规则时发生错误:', error.message);
        process.exit(1);
      }
    });

  // 子命令：status - 显示规则库状态
  learnCommand
    .command('status')
    .description('显示规则库状态和统计信息')
    .option('--rules-dir <dir>', '规则目录', './rules/learning-rules')
    .action(async (options) => {
      try {
        const { showRulesStatus } = await import('../../services/knowledge/status.js');
        await showRulesStatus(options);
        process.exit(0);
      } catch (error) {
        console.error('显示状态时发生错误:', error.message);
        process.exit(1);
      }
    });

  // 当不带子命令调用时，显示帮助信息
  learnCommand.action(() => {
    learnCommand.help();
  });
}

export default {
  register
};