/**
 * UI命令 - 可视化终端界面
 * 使用 Ink + Chalk + CLI-Progress 构建交互式终端UI
 */

import { readConfig } from '../../services/config/index.js';
import { logInfo, logError } from '../../utils/logger.js';

/**
 * 注册UI命令
 * @param {Command} program - Commander程序实例
 */
function register(program) {
  program
    .command('ui')
    .description('启动可视化终端界面')
    .option('-f, --file <path>', 'SQL文件路径')
    .action(async (options) => {
      try {
        logInfo('启动UI命令');
        
        // 动态导入UI模块（避免在非UI模式下加载React）
        const { startUI } = await import('../../services/ui/index.js');
        
        // 读取配置
        const config = await readConfig();
        
        // 启动UI
        await startUI({
          config,
          file: options.file,
        });
        
      } catch (error) {
        logError('UI命令执行失败', error);
        console.error('错误:', error.message);
        process.exit(1);
      }
    });
}

export default { register };
