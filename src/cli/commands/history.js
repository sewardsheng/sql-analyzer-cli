/**
 * 历史记录命令模块
 * 提供SQL分析历史记录管理功能
 */

/**
 * 注册history命令及其子命令
 * @param {Object} program - commander程序对象
 */
function register(program) {
  // 历史记录命令
  const historyCommand = program
    .command('history')
    .description('管理SQL分析历史记录，支持查看、删除和清空历史记录');

  // 历史记录子命令：list
  historyCommand
    .command('list')
    .description('显示所有历史记录列表')
    .action(async () => {
      try {
        const { listHistory } = await import('../../services/history/history.js');
        listHistory();
        process.exit(0);
      } catch (error) {
        console.error('显示历史记录列表时发生错误:', error.message);
        process.exit(1);
      }
    });

  // 历史记录子命令：detail
  historyCommand
    .command('detail <id>')
    .description('显示指定ID的历史记录详情')
    .action(async (id) => {
      try {
        const { showHistoryDetail } = await import('../../services/history/history.js');
        showHistoryDetail(id);
        process.exit(0);
      } catch (error) {
        console.error('显示历史记录详情时发生错误:', error.message);
        process.exit(1);
      }
    });

  // 历史记录子命令：delete
  historyCommand
    .command('delete <id>')
    .description('删除指定ID的历史记录')
    .action(async (id) => {
      try {
        const { deleteHistory } = await import('../../services/history/history.js');
        deleteHistory(id);
        process.exit(0);
      } catch (error) {
        console.error('删除历史记录时发生错误:', error.message);
        process.exit(1);
      }
    });

  // 历史记录子命令：clear
  historyCommand
    .command('clear')
    .description('清空所有历史记录')
    .action(async () => {
      try {
        const { clearAllHistory } = await import('../../services/history/history.js');
        clearAllHistory();
        process.exit(0);
      } catch (error) {
        console.error('清空历史记录时发生错误:', error.message);
        process.exit(1);
      }
    });

  // 历史记录子命令：stats
  historyCommand
    .command('stats')
    .description('显示历史记录统计信息')
    .action(async () => {
      try {
        const { showHistoryStats } = await import('../../services/history/history.js');
        showHistoryStats();
        process.exit(0);
      } catch (error) {
        console.error('显示历史记录统计信息时发生错误:', error.message);
        process.exit(1);
      }
    });
}

export default {
  register
};