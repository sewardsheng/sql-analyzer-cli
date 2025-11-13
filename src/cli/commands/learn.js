/**
 * 学习命令模块
 * 提供加载rules目录中的文档到知识库功能
 */

/**
 * 注册learn命令
 * @param {Object} program - commander程序对象
 */
function register(program) {
  program
    .command('learn')
    .description('加载rules目录中的文档到知识库，供Agent使用')
    .option('-r, --rules-dir <dir>', 'rules目录路径', './rules')
    .option('--reset', '重置知识库')
    .option('--api-key <key>', 'OpenAI API密钥')
    .option('--base-url <url>', 'API基础URL')
    .option('--model <model>', '使用的模型名称')
    .option('--embedding-model <model>', '使用的嵌入模型名称')
    .action(async (options) => {
      try {
        const { learnDocuments } = await import('../../services/knowledge/learn.js');
        await learnDocuments(options);
        process.exit(0);
      } catch (error) {
        console.error('学习过程中发生错误:', error.message);
        process.exit(1);
      }
    });
}

export default {
  register
};