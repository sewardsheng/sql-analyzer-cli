/**
 * 配置命令模块
 * 提供API密钥和模型设置配置功能
 */

/**
 * 注册config命令及其子命令
 * @param {Object} program - commander程序对象
 */
function register(program) {
  // 配置命令
  const configCommand = program
    .command('config')
    .description('配置API密钥和模型设置');

  // 配置子命令：list
  configCommand
    .command('list')
    .description('显示所有配置项')
    .action(async () => {
      try {
        const { listConfig } = await import('../../services/config/index.js');
        await listConfig();
        process.exit(0);
      } catch (error) {
        console.error('显示配置列表时发生错误:', error.message);
        process.exit(1);
      }
    });

  // 配置子命令：get
  configCommand
    .command('get <key>')
    .description('获取特定配置项')
    .action(async (key) => {
      try {
        const { configGet } = await import('../../services/config/index.js');
        await configGet(key);
        process.exit(0);
      } catch (error) {
        console.error('获取配置项时发生错误:', error.message);
        process.exit(1);
      }
    });

  // 配置子命令：set
  configCommand
    .command('set <key> <value>')
    .description('设置配置项')
    .action(async (key, value) => {
      try {
        const { setConfigValue } = await import('../../services/config/index.js');
        await setConfigValue(key, value);
        process.exit(0);
      } catch (error) {
        console.error('设置配置项时发生错误:', error.message);
        process.exit(1);
      }
    });

  // 配置子命令：reset
  configCommand
    .command('reset')
    .description('重置所有配置为默认值')
    .action(async () => {
      try {
        const { resetConfig } = await import('../../services/config/index.js');
        await resetConfig();
        process.exit(0);
      } catch (error) {
        console.error('重置配置时发生错误:', error.message);
        process.exit(1);
      }
    });

  // 默认config命令行为（保持向后兼容）
  configCommand
    .action(async () => {
      try {
        const { configureSettings } = await import('../../services/config/index.js');
        await configureSettings();
        process.exit(0);
      } catch (error) {
        console.error('配置过程中发生错误:', error.message);
        process.exit(1);
      }
    });
}

export default {
  register
};