/**
 * CLI命令注册器
 * 负责统一管理所有CLI命令的注册和加载
 */

import { program } from 'commander';

/**
 * 命令注册器类
 */
class CommandRegistry {
  constructor() {
    this.commands = new Map();
  }

  /**
   * 注册命令
   * @param {string} name - 命令名称
   * @param {Function} commandModule - 命令模块
   */
  register(name, commandModule) {
    this.commands.set(name, commandModule);
  }

  /**
   * 批量注册命令
   * @param {Object} commands - 命令对象，键为命令名，值为命令模块
   */
  registerBatch(commands) {
    Object.entries(commands).forEach(([name, commandModule]) => {
      this.register(name, commandModule);
    });
  }

  /**
   * 加载所有已注册的命令
   */
  loadAllCommands() {
    for (const [name, commandModule] of this.commands) {
      try {
        // 如果模块导出了register函数，则调用它
        if (typeof commandModule.register === 'function') {
          commandModule.register(program);
        }
      } catch (error) {
        console.error(`加载命令 ${name} 时出错:`, error.message);
      }
    }
  }

  /**
   * 获取所有已注册的命令名称
   * @returns {Array<string>} 命令名称数组
   */
  getCommandNames() {
    return Array.from(this.commands.keys());
  }
}

// 创建全局命令注册器实例
const commandRegistry = new CommandRegistry();

export { commandRegistry, CommandRegistry };