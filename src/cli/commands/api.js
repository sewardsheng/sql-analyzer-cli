/**
 * API服务器命令模块
 * 提供启动SQL分析API服务器功能
 */

/**
 * 注册api命令
 * @param {Object} program - commander程序对象
 */
function register(program) {
  program
    .command('api')
    .description('启动SQL分析API服务器')
    .option('-p, --port <port>', 'API服务器端口', '3000')
    .option('-h, --host <host>', 'API服务器主机', '0.0.0.0')
    .option('--no-cors', '禁用CORS')
    .option('--cors-origin <origin>', 'CORS允许的源', '*')
    .action(async (options) => {
      try {
        const { createApiServer } = await import('../../services/api/apiServer.js');
        createApiServer(options);
        // API服务器是长期运行的服务，不需要自动退出
      } catch (error) {
        console.error('启动API服务器时发生错误:', error.message);
        process.exit(1);
      }
    });
}

export default {
  register
};