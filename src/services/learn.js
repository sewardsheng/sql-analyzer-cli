const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk').default;
const ora = require('ora').default;
const { readConfig } = require('../utils/config');
const { loadDocumentsFromRulesDirectory, resetVectorStore, isVectorStoreInitialized, saveVectorStore, isVectorStorePersisted } = require('../core/vectorStore');

/**
 * 加载rules目录中的文档到知识库
 * @param {Object} options - 命令行选项
 * @param {string} options.rulesDir - rules目录路径
 * @param {boolean} options.reset - 是否重置知识库
 * @param {string} options.apiKey - API密钥
 * @param {string} options.baseURL - API基础URL
 * @param {string} options.model - 模型名称
 * @param {string} options.embeddingModel - 嵌入模型名称
 */
async function learnDocuments(options = {}) {
  try {
    // 读取配置
    const config = await readConfig();
    
    // 合并命令行选项和配置文件
    const apiKey = options.apiKey || config.apiKey;
    const baseURL = options.baseURL || config.baseURL;
    const model = options.model || config.model;
    const embeddingModel = options.embeddingModel || config.embeddingModel;
    const rulesDir = options.rulesDir || './rules';
    
    // 检查API密钥
    if (!apiKey) {
      console.log(chalk.red('❌ 未配置API密钥，请运行 "sql-analyzer config" 进行配置或使用 --api-key 参数'));
      process.exit(1);
    }
    
    // 如果指定了reset选项，重置向量存储
    if (options.reset) {
      const spinner = ora('正在重置知识库...').start();
      resetVectorStore();
      spinner.succeed('知识库已重置');
    }
    
    // 检查rules目录是否存在
    try {
      await fs.access(rulesDir);
    } catch (error) {
      console.log(chalk.red(`❌ Rules目录不存在: ${rulesDir}`));
      process.exit(1);
    }
    
    // 获取目录内容
    const dirContents = await fs.readdir(rulesDir);
    if (dirContents.length === 0) {
      console.log(chalk.yellow(`⚠️ Rules目录为空: ${rulesDir}`));
      return;
    }
    
    // 显示支持的文件类型
    console.log(chalk.blue('📁 支持的文件类型: .txt, .md, .markdown, .csv, .json, .jsonl, .docx, .pdf'));
    
    // 开始加载文档
    const spinner = ora('正在加载文档到知识库...').start();
    
    try {
      const result = await loadDocumentsFromRulesDirectory(rulesDir);
      
      if (result.documentCount === 0) {
        spinner.warn('没有找到支持的文档文件');
        return;
      }
      
      spinner.succeed(`成功加载 ${result.documentCount} 个文档块到知识库`);
      
      // 显示加载的文件类型
      if (result.fileTypes.length > 0) {
        console.log(chalk.green(`📄 已处理的文件类型: ${result.fileTypes.join(', ')}`));
      }
      
      // 确保向量存储已保存到磁盘
      const saveSpinner = ora('正在保存知识库到磁盘...').start();
      const saved = await saveVectorStore();
      if (saved) {
        saveSpinner.succeed('知识库已保存到磁盘');
      } else {
        saveSpinner.warn('知识库保存到磁盘时出现问题，但内存中的知识库仍然可用');
      }
      
      console.log(chalk.green('✅ 知识库加载完成！现在可以使用 "sql-analyzer analyze" 命令进行SQL分析，Agent将能够访问知识库内容。'));
      
    } catch (error) {
      spinner.fail('加载文档失败');
      console.error(chalk.red('错误:'), error.message);
      process.exit(1);
    }
    
  } catch (error) {
    console.error(chalk.red('学习过程中发生错误:'), error.message);
    process.exit(1);
  }
}

/**
 * 显示知识库状态
 */
async function showKnowledgeStatus() {
  try {
    if (isVectorStoreInitialized()) {
      console.log(chalk.green('✅ 知识库已初始化'));
      
      // 检查是否已持久化到磁盘
      if (isVectorStorePersisted()) {
        console.log(chalk.green('✅ 知识库已持久化到磁盘，重启后仍可访问'));
      } else {
        console.log(chalk.yellow('⚠️ 知识库仅在内存中，重启后将丢失'));
      }
    } else {
      console.log(chalk.yellow('⚠️ 知识库未初始化，请运行 "sql-analyzer learn" 命令加载文档'));
    }
  } catch (error) {
    console.error(chalk.red('检查知识库状态时发生错误:'), error.message);
  }
}

module.exports = {
  learnDocuments,
  showKnowledgeStatus
};