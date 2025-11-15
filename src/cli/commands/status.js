/**
 * 状态命令模块
 * 提供显示知识库状态功能
 */

/**
 * 注册status命令
 * @param {Object} program - commander程序对象
 */
function register(program) {
  program
    .command('status')
    .description('显示知识库状态')
    .option('--interactive', '以交互模式显示状态，支持返回主菜单')
    .action(async (options) => {
      try {
        const { showKnowledgeStatus } = await import('../../services/knowledge/learn.js');
        const returnToMenu = await showKnowledgeStatus(options.interactive);
        
        // 无论是否选择返回主菜单，都直接退出，因为UI模式已移除
        process.exit(0);
      } catch (error) {
        console.error('检查状态过程中发生错误:', error.message);
        process.exit(1);
      }
    });
}

export default {
  register
};