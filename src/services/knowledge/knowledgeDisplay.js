/**
 * 知识库CLI展示模块
 * 专门处理知识库的命令行展示逻辑
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import path from 'path';
import { getKnowledgeService } from './knowledgeService.js';

/**
 * 知识库展示类
 */
class KnowledgeDisplay {
  constructor() {
    this.knowledgeService = getKnowledgeService();
  }

  /**
   * 学习文档并显示进度
   * @param {Object} options - 学习选项
   */
  async learnDocuments(options = {}) {
    try {
      // 读取配置
      const configManager = (await import('../config/index.js')).getConfigManager();
      const config = await configManager.getConfig();
      
      // 合并命令行选项和配置文件
      const mergedOptions = {
        apiKey: options.apiKey || config.apiKey,
        baseURL: options.baseURL || config.baseURL,
        model: options.model || config.model,
        embeddingModel: options.embeddingModel || config.embeddingModel,
        rulesDir: options.rulesDir || './rules',
        priorityApproved: options.priorityApproved || false,
        reset: options.reset || false
      };
      
      // 检查API密钥
      if (!mergedOptions.apiKey) {
        console.log(chalk.red('未配置API密钥，请运行 "sql-analyzer config" 进行配置或使用 --api-key 参数'));
        throw new Error('未配置API密钥');
      }
      
      // 如果指定了reset选项，重置向量存储
      if (mergedOptions.reset) {
        const spinner = ora('正在重置知识库...').start();
        await this.knowledgeService.resetKnowledge();
        spinner.succeed('知识库已重置');
      }
      
      // 检查是否已经存在向量存储，如果存在则尝试加载
      if (!mergedOptions.reset) {
        const status = await this.knowledgeService.getKnowledgeStatus();
        if (status.data.persisted) {
          const spinner = ora('正在检查现有知识库...').start();
          try {
            const result = await this.knowledgeService.learnDocuments({ ...mergedOptions, reset: false });
            if (result.loaded) {
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
      }
      
      // 检查rules目录是否存在
      try {
        const fs = await import('fs/promises');
        await fs.access(mergedOptions.rulesDir);
      } catch (error) {
        console.log(chalk.red(`Rules目录不存在: ${mergedOptions.rulesDir}`));
        throw new Error(`Rules目录不存在: ${mergedOptions.rulesDir}`);
      }
      
      // 获取目录内容
      const fs = await import('fs/promises');
      const dirContents = await fs.readdir(mergedOptions.rulesDir);
      if (dirContents.length === 0) {
        console.log(chalk.yellow(`Rules目录为空: ${mergedOptions.rulesDir}`));
        return;
      }
      
      // 显示支持的文件类型
      console.log(chalk.blue('支持的文件类型: .txt, .md, .markdown, .csv, .json, .jsonl, .docx, .pdf'));
      
      // 开始加载文档
      const spinner = ora('正在加载文档到知识库...').start();
      
      try {
        const result = await this.knowledgeService.learnDocuments(mergedOptions);
        
        if (!result.success) {
          spinner.fail('加载文档失败');
          console.error(chalk.red('错误:'), result.error);
          throw new Error(result.error);
        }
        
        if (result.documentCount === 0) {
          spinner.warn('没有找到支持的文档文件');
          return;
        }
        
        spinner.succeed(`成功加载 ${result.documentCount} 个文档块到知识库`);
        
        // 显示加载的文件类型
        if (result.fileTypes && result.fileTypes.length > 0) {
          console.log(chalk.green(`已处理的文件类型: ${result.fileTypes.join(', ')}`));
        }
        
        // 显示加载优先级信息
        if (mergedOptions.priorityApproved && result.loadOrder) {
          console.log(chalk.blue(`\n📋 加载优先级:`));
          result.loadOrder.forEach((item, index) => {
            const icon = item.type === 'approved' ? '✅' :
                        item.type === 'issues' ? '⏳' : '📦';
            console.log(chalk.white(`  ${index + 1}. ${icon} ${item.type} (${item.count} 个文件)`));
          });
          console.log('');
        }
        
        // 显示保存状态
        if (result.saved) {
          console.log(chalk.green('✅ 知识库已保存到磁盘'));
        } else {
          console.log(chalk.yellow('⚠️  知识库保存到磁盘时出现问题，但内存中的知识库仍然可用'));
        }
        
        console.log(chalk.green('知识库加载完成！现在可以使用 "sql-analyzer analyze" 命令进行SQL分析，LangGraph将能够访问知识库内容。'));
        
      } catch (error) {
        spinner.fail('加载文档失败');
        console.error(chalk.red('错误:'), error.message);
        throw error;
      }
      
    } catch (error) {
      console.error(chalk.red('学习过程中发生错误:'), error.message);
      throw error;
    }
  }

  /**
   * 显示知识库状态
   * @param {boolean} showReturnOption - 是否显示返回主菜单选项
   */
  async showKnowledgeStatus(showReturnOption = false) {
    try {
      console.clear();
      console.log(chalk.cyan(`
╔═════════════════════════════════════════════════════════════╗
║                        知识库状态                           ║
╚═════════════════════════════════════════════════════════════
`));
      
      const statusResult = await this.knowledgeService.getKnowledgeStatus();
      
      if (!statusResult.success) {
        console.log(chalk.red('❌ 获取知识库状态失败:'), statusResult.error);
        return this.handleReturnOption(showReturnOption);
      }
      
      const status = statusResult.data;
      
      // 显示基本状态
      if (status.initialized) {
        console.log(chalk.green('✅ 知识库已初始化'));
      } else {
        console.log(chalk.yellow('⚠️  知识库未初始化'));
      }
      
      if (status.persisted) {
        console.log(chalk.green('✅ 知识库已持久化到磁盘'));
      } else {
        console.log(chalk.yellow('⚠️  知识库未持久化到磁盘'));
      }
      
      // 显示详细信息
      if (status.initialized && status.documents) {
        console.log(chalk.blue(`\n📚 知识库包含 ${chalk.bold(status.documents.total)} 个文档块`));
        
        // 显示源文件列表
        if (status.documents.files && status.documents.files.length > 0) {
          console.log(chalk.green(`\n📄 已加载的文档 (${status.documents.files.length} 个文件):`));
          const path = await import('path');
          status.documents.files.forEach((file, index) => {
            const fileName = path.basename(file);
            const ext = path.extname(file).substring(1);
            const icon = this.getFileIcon(ext);
            console.log(chalk.white(`  ${index + 1}. ${icon} ${fileName}`));
          });
        }
        
        // 显示文件类型统计
        if (status.statistics && Object.keys(status.statistics).length > 0) {
          console.log(chalk.blue(`\n📊 文件类型统计:`));
          Object.entries(status.statistics).forEach(([type, count]) => {
            console.log(chalk.white(`  • ${type.toUpperCase()}: ${count} 个文件`));
          });
        }
      }
      
      // 显示操作提示
      console.log(chalk.blue('\n💡 操作提示:'));
      console.log(chalk.white('  • 使用 "sql-analyzer learn" 命令加载文档到知识库'));
      console.log(chalk.white('  • 使用 "sql-analyzer learn --reset" 命令重置知识库'));
      
      return this.handleReturnOption(showReturnOption);
      
    } catch (error) {
      console.error(chalk.red('检查知识库状态时发生错误:'), error.message);
      return this.handleReturnOption(showReturnOption);
    }
  }

  /**
   * 搜索知识库并显示结果
   * @param {string} query - 搜索查询
   * @param {number} k - 返回结果数量
   */
  async searchKnowledge(query, k = 4) {
    try {
      console.clear();
      console.log(chalk.cyan(`
╔═════════════════════════════════════════════════════════════╗
║                        知识库搜索                           ║
╚═════════════════════════════════════════════════════════════
`));
      
      console.log(chalk.blue(`搜索查询: ${chalk.white(query)}`));
      console.log(chalk.gray('─'.repeat(60)));
      
      const spinner = ora('正在搜索知识库...').start();
      
      try {
        const result = await this.knowledgeService.searchKnowledge(query, k);
        
        if (!result.success) {
          spinner.fail('搜索失败');
          console.log(chalk.red('错误:'), result.error);
          return;
        }
        
        spinner.succeed('搜索完成');
        
        const { text, documents } = result.data;
        
        console.log(chalk.green(`\n📋 找到 ${documents.length} 个相关文档:`));
        console.log(chalk.gray('─'.repeat(60)));
        
        if (documents.length === 0) {
          console.log(chalk.yellow('  没有找到相关文档'));
          return;
        }
        
        // 显示搜索结果
        documents.forEach((doc, index) => {
          console.log(chalk.white(`\n${index + 1}. ${chalk.cyan(doc.metadata.source || '未知来源')}`));
          
          if (doc.metadata && doc.metadata.source) {
            const fileName = path.basename(doc.metadata.source);
            const ext = path.extname(doc.metadata.source).substring(1);
            const icon = this.getFileIcon(ext);
            console.log(chalk.gray(`   ${icon} ${fileName}`));
          }
          
          // 显示文档内容预览
          const preview = doc.pageContent.substring(0, 200);
          console.log(chalk.gray(`   ${preview}${doc.pageContent.length > 200 ? '...' : ''}`));
        });
        
        console.log(chalk.gray('\n─'.repeat(60)));
        
      } catch (error) {
        spinner.fail('搜索失败');
        console.error(chalk.red('搜索错误:'), error.message);
      }
      
    } catch (error) {
      console.error(chalk.red('搜索过程中发生错误:'), error.message);
    }
  }

  /**
   * 获取文件图标
   * @param {string} ext - 文件扩展名
   * @returns {string} 文件图标
   */
  getFileIcon(ext) {
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

  /**
   * 处理返回选项
   * @param {boolean} showReturnOption - 是否显示返回选项
   * @returns {Promise<boolean>} 是否返回主菜单
   */
  async handleReturnOption(showReturnOption) {
    if (showReturnOption) {
      const { returnToMenu } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'returnToMenu',
          message: '是否返回主菜单?',
          default: true
        }
      ]);
      
      return returnToMenu;
    }
    return false;
  }
}

// 创建展示实例
const knowledgeDisplay = new KnowledgeDisplay();

// ============================================================================
// 导出展示实例
// ============================================================================

/**
 * 获取知识库展示实例
 * @returns {KnowledgeDisplay} 知识库展示实例
 */
export function getKnowledgeDisplay() {
  return knowledgeDisplay;
}

// 导出展示类和实例
export { KnowledgeDisplay, knowledgeDisplay };

// 默认导出展示实例
export default knowledgeDisplay;