/**
 * UI命令模块
 * 提供Terminal UI模式功能
 */

/**
 * 注册ui命令
 * @param {Object} program - commander程序对象
 */
function register(program) {
  program
    .command('ui')
    .description('启动Terminal UI模式，提供交互式菜单界面')
    .action(async () => {
      try {
        const { terminalUIMode } = await import('../../services/ui/terminalUI.js');
        await terminalUIMode();
        // Terminal UI是交互式界面，不需要自动退出
      } catch (error) {
        console.error('Terminal UI模式中发生错误:', error.message);
        process.exit(1);
      }
    });
}

export default {
  register
};