/**
 * 初始化命令模块
 * 提供环境配置文件初始化功能
 */

/**
 * 注册init命令
 * @param {Object} program - commander程序对象
 */
function register(program) {
  program
    .command('init')
    .description('初始化环境配置文件')
    .action(async () => {
      try {
        const { initEnvironment } = await import('../../utils/env.js');
        await initEnvironment();
        process.exit(0);
      } catch (error) {
        console.error('初始化过程中发生错误:', error.message);
        process.exit(1);
      }
    });
}

export default {
  register
};