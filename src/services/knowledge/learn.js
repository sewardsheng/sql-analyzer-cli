import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { readConfig } from '../../utils/config.js';
import { loadDocumentsFromRulesDirectory, resetVectorStore, isVectorStoreInitialized, saveVectorStore, isVectorStorePersisted, loadVectorStoreFromDisk } from '../../core/graph/vectorStore.js';
import { stopPerformance } from '../../core/performance/initPerformance.js';

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
      console.log(chalk.red('未配置API密钥，请运行 "sql-analyzer config" 进行配置或使用 --api-key 参数'));
      process.exit(1);
    }
    
    // 如果指定了reset选项，重置向量存储
    if (options.reset) {
      const spinner = ora('正在重置知识库...').start();
      await resetVectorStore();
      spinner.succeed('知识库已重置');
    }
    
    // 检查是否已经存在向量存储，如果存在则尝试加载
    if (!options.reset && isVectorStorePersisted()) {
      const spinner = ora('正在检查现有知识库...').start();
      try {
        const loaded = await loadVectorStoreFromDisk();
        if (loaded) {
          spinner.succeed('已从磁盘加载现有知识库');
          console.log(chalk.green('知识库加载完成！现在可以使用 "sql-analyzer analyze" 命令进行SQL分析，LangGraph将能够访问知识库内容。'));
          return;
        } else {
          spinner.warn('现有知识库不完整，将重新生成');
        }
      } catch (error) {
        spinner.warn('加载现有知识库失败，将重新生成');
      }
    }
    
    // 检查rules目录是否存在
    try {
      await fs.access(rulesDir);
    } catch (error) {
      console.log(chalk.red(`Rules目录不存在: ${rulesDir}`));
      process.exit(1);
    }
    
    // 获取目录内容
    const dirContents = await fs.readdir(rulesDir);
    if (dirContents.length === 0) {
      console.log(chalk.yellow(`Rules目录为空: ${rulesDir}`));
      return;
    }
    
    // 显示支持的文件类型
    console.log(chalk.blue('支持的文件类型: .txt, .md, .markdown, .csv, .json, .jsonl, .docx, .pdf'));
    
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
        console.log(chalk.green(`已处理的文件类型: ${result.fileTypes.join(', ')}`));
      }
      
      // 确保向量存储已保存到磁盘
      const saveSpinner = ora('正在保存知识库到磁盘...').start();
      const saved = await saveVectorStore();
      if (saved) {
        saveSpinner.succeed('知识库已保存到磁盘');
      } else {
        saveSpinner.warn('知识库保存到磁盘时出现问题，但内存中的知识库仍然可用');
      }
      
      console.log(chalk.green('知识库加载完成！现在可以使用 "sql-analyzer analyze" 命令进行SQL分析，LangGraph将能够访问知识库内容。'));
      
    } catch (error) {
      spinner.fail('加载文档失败');
      console.error(chalk.red('错误:'), error.message);
      process.exit(1);
    }
    
  } catch (error) {
    console.error(chalk.red('学习过程中发生错误:'), error.message);
    process.exit(1);
  } finally {
    // 停止性能优化功能，确保进程可以正常退出
    stopPerformance();
  }
}

/**
 * 显示知识库状态
 * @param {boolean} showReturnOption - 是否显示返回主菜单选项
 */
async function showKnowledgeStatus(showReturnOption = false) {
  try {
    console.clear();
    console.log(chalk.cyan(`
╔═════════════════════════════════════════════════════════════╗
║                        知识库状态                           ║
╚═════════════════════════════════════════════════════════════
`));
    
    // 检查知识库是否已初始化
    const isInitialized = isVectorStoreInitialized();
    if (isInitialized) {
      console.log(chalk.green('✅ 知识库已初始化'));
    } else {
      console.log(chalk.yellow('⚠️  知识库未初始化'));
    }
    
    // 检查知识库是否已持久化到磁盘
    const isPersisted = isVectorStorePersisted();
    if (isPersisted) {
      console.log(chalk.green('✅ 知识库已持久化到磁盘'));
    } else {
      console.log(chalk.yellow('⚠️  知识库未持久化到磁盘'));
    }
    
    // 如果知识库已初始化，显示更多信息
    if (isInitialized) {
      try {
        // 尝试从磁盘加载文档信息
        const path = await import('path');
        const fs = await import('fs');
        const VECTOR_STORE_PATH = path.join(process.cwd(), '.vector-store');
        const docsPath = path.join(VECTOR_STORE_PATH, 'documents.json');
        
        if (fs.existsSync(docsPath)) {
          // 从磁盘读取文档信息
          const serializedDocs = JSON.parse(fs.readFileSync(docsPath, 'utf8'));
          console.log(chalk.blue(`\n📚 知识库包含 ${chalk.bold(serializedDocs.length)} 个文档块`));
          
          // 收集所有唯一的源文件
          const sourceFiles = new Set();
          const fileTypes = new Set();
          
          serializedDocs.forEach(doc => {
            if (doc.metadata && doc.metadata.source) {
              sourceFiles.add(doc.metadata.source);
              const ext = path.extname(doc.metadata.source);
              if (ext) fileTypes.add(ext.substring(1)); // 去掉点号
            }
          });
          
          // 显示源文件列表
          if (sourceFiles.size > 0) {
            console.log(chalk.green(`\n📄 已加载的文档 (${sourceFiles.size} 个文件):`));
            Array.from(sourceFiles).forEach((file, index) => {
              const fileName = path.basename(file);
              const ext = path.extname(file).substring(1);
              const icon = getFileIcon(ext);
              console.log(chalk.white(`  ${index + 1}. ${icon} ${fileName}`));
            });
          }
          
          // 显示文件类型统计
          if (fileTypes.size > 0) {
            console.log(chalk.blue(`\n📊 文件类型统计:`));
            Array.from(fileTypes).forEach(type => {
              const count = Array.from(sourceFiles).filter(file => 
                path.extname(file).substring(1) === type
              ).length;
              console.log(chalk.white(`  • ${type.toUpperCase()}: ${count} 个文件`));
            });
          }
        } else {
          // 尝试从内存中的向量存储获取信息
          const { getVectorStore } = await import('../../core/graph/vectorStore.js');
          const vectorStore = getVectorStore();
          if (vectorStore && vectorStore.docstore && vectorStore.docstore._docs) {
            const docCount = Object.keys(vectorStore.docstore._docs).length;
            console.log(chalk.blue(`\n📚 知识库包含 ${chalk.bold(docCount)} 个文档块`));
            
            // 尝试获取源文件信息
            const sourceFiles = new Set();
            const fileTypes = new Set();
            
            Object.values(vectorStore.docstore._docs).forEach(doc => {
              if (doc.metadata && doc.metadata.source) {
                sourceFiles.add(doc.metadata.source);
                const ext = path.extname(doc.metadata.source);
                if (ext) fileTypes.add(ext.substring(1));
              }
            });
            
            // 显示源文件列表
            if (sourceFiles.size > 0) {
              console.log(chalk.green(`\n📄 已加载的文档 (${sourceFiles.size} 个文件):`));
              Array.from(sourceFiles).forEach((file, index) => {
                const fileName = path.basename(file);
                const ext = path.extname(file).substring(1);
                const icon = getFileIcon(ext);
                console.log(chalk.white(`  ${index + 1}. ${icon} ${fileName}`));
              });
            }
            
            // 显示文件类型统计
            if (fileTypes.size > 0) {
              console.log(chalk.blue(`\n📊 文件类型统计:`));
              Array.from(fileTypes).forEach(type => {
                const count = Array.from(sourceFiles).filter(file => 
                  path.extname(file).substring(1) === type
                ).length;
                console.log(chalk.white(`  • ${type.toUpperCase()}: ${count} 个文件`));
              });
            }
          } else {
            console.log(chalk.yellow('\n⚠️  知识库已初始化，但无法获取详细信息'));
          }
        }
      } catch (error) {
        console.log(chalk.yellow(`\n⚠️  无法获取知识库详细信息: ${error.message}`));
      }
    }
    
    // 显示操作提示
    console.log(chalk.blue('\n💡 操作提示:'));
    console.log(chalk.white('  • 使用 "sql-analyzer learn" 命令加载文档到知识库'));
    console.log(chalk.white('  • 使用 "sql-analyzer learn --reset" 命令重置知识库'));
    
    // 如果显示返回选项，添加返回主菜单的选项
    if (showReturnOption) {
      const inquirer = await import('inquirer');
      const { returnToMenu } = await inquirer.default.prompt([
        {
          type: 'confirm',
          name: 'returnToMenu',
          message: '是否返回主菜单?',
          default: true
        }
      ]);
      
      return returnToMenu;
    }
    
  } catch (error) {
    console.error(chalk.red('检查知识库状态时发生错误:'), error.message);
    if (showReturnOption) {
      const inquirer = await import('inquirer');
      const { returnToMenu } = await inquirer.default.prompt([
        {
          type: 'confirm',
          name: 'returnToMenu',
          message: '是否返回主菜单?',
          default: true
        }
      ]);
      
      return returnToMenu;
    } else {
      process.exit(1);
    }
  } finally {
    // 停止性能优化功能，确保进程可以正常退出
    stopPerformance();
  }
}

/**
 * 获取文件图标
 * @param {string} ext - 文件扩展名
 * @returns {string} 文件图标
 */
function getFileIcon(ext) {
  const icons = {
    'md': '📝',
    'txt': '📄',
    'pdf': '📕',
    'docx': '📘',
    'json': '📋',
    'jsonl': '📋',
    'csv': '📊',
    'sql': '🗃️',
    'yml': '⚙️',
    'yaml': '⚙️'
  };
  
  return icons[ext.toLowerCase()] || '📄';
}

export {
  learnDocuments,
  showKnowledgeStatus
};