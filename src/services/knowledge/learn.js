import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { readConfig } from '../config/index.js';
import { loadDocumentsFromRulesDirectory, resetVectorStore, isVectorStoreInitialized, saveVectorStore, isVectorStorePersisted, loadVectorStoreFromDisk } from '../../core/vectorStore.js';

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
    
    // 合并选项和配置文件
    const apiKey = options.apiKey || config.apiKey;
    const baseURL = options.baseURL || config.baseURL;
    const model = options.model || config.model;
    const embeddingModel = options.embeddingModel || config.embeddingModel;
    const rulesDir = options.rulesDir || './rules';
    const priorityApproved = options.priorityApproved || false;
    
    // 检查API密钥
    if (!apiKey) {
      throw new Error('未配置API密钥');
    }
    
    // 如果指定了reset选项，重置向量存储
    if (options.reset) {
      console.log(chalk.blue('正在重置知识库...'));
      await resetVectorStore();
      console.log(chalk.green('知识库已重置'));
    }
    
    // 检查是否已经存在向量存储，如果存在则尝试加载
    if (!options.reset && isVectorStorePersisted()) {
      console.log(chalk.blue('正在检查现有知识库...'));
      try {
        const loaded = await loadVectorStoreFromDisk();
        if (loaded) {
          console.log(chalk.green('已从磁盘加载现有知识库'));
          return {
            success: true,
            data: {
              loaded: true,
              message: '知识库已从磁盘加载'
            }
          };
        } else {
          console.log(chalk.yellow('现有知识库不完整，将重新生成'));
        }
      } catch (error) {
        console.log(chalk.yellow('加载现有知识库失败，将重新生成'));
      }
    }
    
    // 检查rules目录是否存在
    try {
      await fs.access(rulesDir);
    } catch (error) {
      throw new Error(`Rules目录不存在: ${rulesDir}`);
    }
    
    // 获取目录内容
    const dirContents = await fs.readdir(rulesDir);
    if (dirContents.length === 0) {
      return {
        success: true,
        data: {
          documentCount: 0,
          message: 'Rules目录为空'
        }
      };
    }
    
    console.log(chalk.blue('正在加载文档到知识库...'));
    
    try {
      let result;
      
      if (priorityApproved) {
        // 优先加载 approved 目录
        result = await loadDocumentsWithPriority(rulesDir);
      } else {
        // 传统加载方式
        result = await loadDocumentsFromRulesDirectory(rulesDir);
      }
      
      if (result.documentCount === 0) {
        return {
          success: true,
          data: {
            documentCount: 0,
            message: '没有找到支持的文档文件'
          }
        };
      }
      
      console.log(chalk.green(`成功加载 ${result.documentCount} 个文档块到知识库`));
      
      // 显示加载的文件类型
      if (result.fileTypes.length > 0) {
        console.log(chalk.green(`已处理的文件类型: ${result.fileTypes.join(', ')}`));
      }
      
      // 显示加载优先级信息
      if (priorityApproved && result.loadOrder) {
        console.log(chalk.blue(`\n📋 加载优先级:`));
        result.loadOrder.forEach((item, index) => {
          const icon = item.type === 'approved' ? '✅' :
                      item.type === 'issues' ? '⏳' : '📦';
          console.log(chalk.white(`  ${index + 1}. ${icon} ${item.type} (${item.count} 个文件)`));
        });
        console.log('');
      }
      
      // 确保向量存储已保存到磁盘
      console.log(chalk.blue('正在保存知识库到磁盘...'));
      const saved = await saveVectorStore();
      if (saved) {
        console.log(chalk.green('知识库已保存到磁盘'));
      } else {
        console.log(chalk.yellow('知识库保存到磁盘时出现问题，但内存中的知识库仍然可用'));
      }
      
      console.log(chalk.green('知识库加载完成！'));
      
      return {
        success: true,
        data: {
          documentCount: result.documentCount,
          fileTypes: result.fileTypes,
          loadOrder: result.loadOrder,
          saved: saved,
          message: '知识库加载完成'
        }
      };
      
    } catch (error) {
      console.error(chalk.red('加载文档失败:'), error.message);
      throw error;
    }
    
  } catch (error) {
    console.error(chalk.red('学习过程中发生错误:'), error.message);
    throw error;
  }
}

/**
 * 获取知识库状态
 * @returns {Promise<Object>} 知识库状态信息
 */
async function getKnowledgeStatus() {
  try {
    // 检查知识库是否已初始化
    const isInitialized = isVectorStoreInitialized();
    const isPersisted = isVectorStorePersisted();
    
    const status = {
      initialized: isInitialized,
      persisted: isPersisted,
      documents: {
        total: 0,
        files: []
      },
      statistics: {}
    };
    
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
          status.documents.total = serializedDocs.length;
          
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
          
          status.documents.files = Array.from(sourceFiles);
          
          // 显示文件类型统计
          fileTypes.forEach(type => {
            const count = Array.from(sourceFiles).filter(file => 
              path.extname(file).substring(1) === type
            ).length;
            status.statistics[type] = count;
          });
        } else {
          // 尝试从内存中的向量存储获取信息
          const { getVectorStore } = await import('../../core/vectorStore.js');
          const vectorStore = getVectorStore();
          if (vectorStore && vectorStore.docstore && vectorStore.docstore._docs) {
            const docCount = Object.keys(vectorStore.docstore._docs).length;
            status.documents.total = docCount;
            
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
            
            status.documents.files = Array.from(sourceFiles);
            
            // 显示文件类型统计
            fileTypes.forEach(type => {
              const count = Array.from(sourceFiles).filter(file => 
                path.extname(file).substring(1) === type
              ).length;
              status.statistics[type] = count;
            });
          }
        }
      } catch (error) {
        console.log(chalk.yellow(`无法获取知识库详细信息: ${error.message}`));
      }
    }
    
    return {
      success: true,
      data: status
    };
    
  } catch (error) {
    console.error(chalk.red('检查知识库状态时发生错误:'), error.message);
    return {
      success: false,
      error: error.message
    };
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

/**
 * 按优先级加载文档
 * @param {string} rulesDir - 规则目录路径
 * @returns {Promise<Object>} 加载结果
 */
async function loadDocumentsWithPriority(rulesDir) {
  const learningRulesDir = path.join(rulesDir, 'learning-rules');
  const loadOrder = [];
  let totalDocumentCount = 0;
  const allFileTypes = new Set();
  const allLoadedFiles = [];

  // 定义加载优先级（排除 archived 目录）
  const priorityDirs = [
    { name: 'approved', label: '已认可规则' },
    { name: 'issues', label: '待评估规则' }
  ];

  for (const dirInfo of priorityDirs) {
    const dirPath = path.join(learningRulesDir, dirInfo.name);
    
    try {
      await fs.access(dirPath);
      
      // 获取该目录下的所有文件
      const files = await getAllMarkdownFiles(dirPath);
      
      if (files.length > 0) {
        console.log(chalk.blue(`正在加载 ${dirInfo.label} (${files.length} 个文件)...`));
        
        // 临时创建一个只包含当前目录的规则目录
        const tempDir = await createTempDirectory(files);
        
        try {
          const result = await loadDocumentsFromRulesDirectory(tempDir);
          
          if (result.documentCount > 0) {
            totalDocumentCount += result.documentCount;
            result.fileTypes.forEach(type => allFileTypes.add(type));
            allLoadedFiles.push(...(result.loadedFiles || []));
            
            loadOrder.push({
              type: dirInfo.name,
              count: files.length,
              documents: result.documentCount
            });
          }
        } finally {
          // 清理临时目录
          await cleanupTempDirectory(tempDir);
        }
      }
    } catch (error) {
      // 目录不存在，跳过
      console.log(chalk.gray(`跳过 ${dirInfo.label}: 目录不存在`));
    }
  }

  // 加载其他规则目录（非 learning-rules）
  try {
    const otherDirs = await fs.readdir(rulesDir);
    
    for (const dir of otherDirs) {
      if (dir !== 'learning-rules') {
        const dirPath = path.join(rulesDir, dir);
        const stat = await fs.stat(dirPath);
        
        if (stat.isDirectory()) {
          const result = await loadDocumentsFromRulesDirectory(dirPath);
          
          if (result.documentCount > 0) {
            totalDocumentCount += result.documentCount;
            result.fileTypes.forEach(type => allFileTypes.add(type));
            allLoadedFiles.push(...(result.loadedFiles || []));
            
            loadOrder.push({
              type: dir,
              count: result.documentCount,
              documents: result.documentCount
            });
          }
        }
      }
    }
  } catch (error) {
    console.log(chalk.yellow('加载其他规则目录时出错:', error.message));
  }

  // 显示排除 archived 目录的提示
  if (loadOrder.length > 0) {
    console.log(chalk.blue(`\n📋 加载说明:`));
    console.log(chalk.gray(`  • archived/ 目录中的低质量规则已被排除，不会加载到知识库`));
    console.log(chalk.gray(`  • 只加载 approved/ 和 issues/ 目录中的高质量规则`));
  }

  return {
    documentCount: totalDocumentCount,
    fileTypes: Array.from(allFileTypes),
    loadedFiles: allLoadedFiles,
    loadOrder: loadOrder
  };
}

/**
 * 获取目录下所有 Markdown 文件
 * @param {string} dirPath - 目录路径
 * @returns {Promise<Array>} 文件路径数组
 */
async function getAllMarkdownFiles(dirPath) {
  const files = [];
  
  try {
    const items = await fs.readdir(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = await fs.stat(itemPath);
      
      if (stat.isDirectory()) {
        // 递归获取子目录中的文件
        const subFiles = await getAllMarkdownFiles(itemPath);
        files.push(...subFiles);
      } else if (item.endsWith('.md')) {
        files.push(itemPath);
      }
    }
  } catch (error) {
    console.error(`读取目录 ${dirPath} 时出错:`, error);
  }
  
  return files;
}

/**
 * 创建临时目录并复制文件
 * @param {Array} files - 文件路径数组
 * @returns {Promise<string>} 临时目录路径
 */
async function createTempDirectory(files) {
  const tempDir = path.join(process.cwd(), '.temp-rules-' + Date.now());
  await fs.mkdir(tempDir, { recursive: true });
  
  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const tempPath = path.join(tempDir, fileName);
    await fs.copyFile(filePath, tempPath);
  }
  
  return tempDir;
}

/**
 * 清理临时目录
 * @param {string} tempDir - 临时目录路径
 */
async function cleanupTempDirectory(tempDir) {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.warn('清理临时目录时出错:', error.message);
  }
}

export {
  learnDocuments,
  getKnowledgeStatus
};