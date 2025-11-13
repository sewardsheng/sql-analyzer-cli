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
        
        // 如果是交互模式且用户选择返回主菜单，则启动Terminal UI模式
        if (options.interactive && returnToMenu) {
          const { terminalUIMode } = await import('../../services/ui/terminalUI.js');
          await terminalUIMode();
        } else {
          // 非交互模式或用户没有选择返回主菜单，则退出
          process.exit(0);
        }
      } catch (error) {
        console.error('检查状态过程中发生错误:', error.message);
        process.exit(1);
      }
    });
}

export default {
  register
};