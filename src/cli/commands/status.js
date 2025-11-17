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
    .action(async () => {
      try {
        const { showKnowledgeStatus } = await import('../../services/knowledge/learn.js');
        await showKnowledgeStatus(false);
        
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