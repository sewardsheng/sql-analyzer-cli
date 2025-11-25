/**
 * 知识库业务服务
 * 提供纯粹的知识库业务逻辑，不包含UI展示
 */

import fs from 'fs/promises';
import path from 'path';
import { getConfigManager } from '../config/index.js';
import { 
  loadDocumentsFromRulesDirectory, 
  resetVectorStore, 
  isVectorStoreInitialized, 
  saveVectorStore, 
  isVectorStorePersisted, 
  loadVectorStoreFromDisk,
  retrieveDocuments
} from '../core/index.js';

/**
 * 知识库业务服务类
 */
class KnowledgeService {
  constructor() {
    this.configManager = getConfigManager();
  }

  /**
   * 加载rules目录中的文档到知识库
   * @param {Object} options - 加载选项
   * @returns {Promise<Object>} 加载结果
   */
  async learnDocuments(options = {}) {
    try {
      // 读取配置
      const config = await this.configManager.getConfig();
      
      // 合并选项和配置
      const mergedOptions = {
        apiKey: options.apiKey || config.apiKey,
        baseURL: options.baseURL || config.baseURL,
        model: options.model || config.model,
        embeddingModel: options.embeddingModel || config.embeddingModel,
        rulesDir: options.rulesDir || './rules',
        priorityApproved: options.priorityApproved || false,
        reset: options.reset || false
      };
      
      // 验证必要参数
      if (!mergedOptions.apiKey) {
        throw new Error('未配置API密钥');
      }
      
      // 重置知识库（如果需要）
      if (mergedOptions.reset) {
        await resetVectorStore();
      }
      
      // 尝试加载现有知识库
      if (!mergedOptions.reset && isVectorStorePersisted()) {
        const loaded = await loadVectorStoreFromDisk();
        if (loaded) {
          return {
            success: true,
            message: '已从磁盘加载现有知识库',
            loaded: true
          };
        }
      }
      
      // 验证rules目录
      await this.validateRulesDirectory(mergedOptions.rulesDir);
      
      // 加载文档
      let result;
      if (mergedOptions.priorityApproved) {
        result = await this.loadDocumentsWithPriority(mergedOptions.rulesDir);
      } else {
        result = await loadDocumentsFromRulesDirectory(mergedOptions.rulesDir);
      }
      
      if (result.documentCount === 0) {
        return {
          success: true,
          message: '没有找到支持的文档文件',
          documentCount: 0
        };
      }
      
      // 保存知识库
      const saved = await saveVectorStore();
      
      return {
        success: true,
        message: `成功加载 ${result.documentCount} 个文档块到知识库`,
        documentCount: result.documentCount,
        fileTypes: result.fileTypes,
        loadOrder: result.loadOrder,
        saved: saved
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取知识库状态
   * @returns {Promise<Object>} 知识库状态信息
   */
  async getKnowledgeStatus() {
    try {
      const status = {
        initialized: isVectorStoreInitialized(),
        persisted: isVectorStorePersisted(),
        documents: null,
        statistics: null
      };
      
      if (status.initialized) {
        const docInfo = await this.getDocumentInfo();
        status.documents = docInfo;
        status.statistics = this.calculateStatistics(docInfo);
      }
      
      return {
        success: true,
        data: status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 搜索知识库
   * @param {string} query - 搜索查询
   * @param {number} k - 返回结果数量
   * @returns {Promise<Object>} 搜索结果
   */
  async searchKnowledge(query, k = 4) {
    try {
      if (!isVectorStoreInitialized()) {
        return {
          success: false,
          error: "知识库未初始化，请先运行 'learn' 命令加载文档。"
        };
      }

      const result = await retrieveDocuments(query, k);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 重置知识库
   * @returns {Promise<Object>} 重置结果
   */
  async resetKnowledge() {
    try {
      await resetVectorStore();
      return {
        success: true,
        message: '知识库已重置'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 导出知识库
   * @param {Object} options - 导出选项
   * @returns {Promise<Object>} 导出结果
   */
  async exportKnowledge(options = {}) {
    try {
      if (!isVectorStoreInitialized()) {
        throw new Error('知识库未初始化');
      }

      const docInfo = await this.getDocumentInfo();
      const { format = 'json' } = options;
      
      if (format === 'json') {
        return {
          success: true,
          data: {
            exportTime: new Date().toISOString(),
            total: docInfo.total,
            files: docInfo.files,
            documents: docInfo.documents
          }
        };
      } else {
        throw new Error(`不支持的导出格式: ${format}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 验证rules目录
   * @param {string} rulesDir - rules目录路径
   * @private
   */
  async validateRulesDirectory(rulesDir) {
    try {
      await fs.access(rulesDir);
    } catch (error) {
      throw new Error(`Rules目录不存在: ${rulesDir}`);
    }
    
    const dirContents = await fs.readdir(rulesDir);
    if (dirContents.length === 0) {
      throw new Error(`Rules目录为空: ${rulesDir}`);
    }
  }

  /**
   * 按优先级加载文档
   * @param {string} rulesDir - 规则目录路径
   * @returns {Promise<Object>} 加载结果
   * @private
   */
  async loadDocumentsWithPriority(rulesDir) {
    const learningRulesDir = path.join(rulesDir, 'learning-rules');
    const loadOrder = [];
    let totalDocumentCount = 0;
    const allFileTypes = new Set();
    const allLoadedFiles = [];

    // 定义加载优先级
    const priorityDirs = [
      { name: 'approved', label: '已认可规则' },
      { name: 'issues', label: '待评估规则' }
    ];

    for (const dirInfo of priorityDirs) {
      const dirPath = path.join(learningRulesDir, dirInfo.name);
      
      try {
        await fs.access(dirPath);
        const files = await this.getAllMarkdownFiles(dirPath);
        
        if (files.length > 0) {
          const tempDir = await this.createTempDirectory(files);
          
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
            await this.cleanupTempDirectory(tempDir);
          }
        }
      } catch (error) {
        // 目录不存在，跳过
      }
    }

    // 加载其他规则目录
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
      // 忽略其他目录的错误
    }

    return {
      documentCount: totalDocumentCount,
      fileTypes: Array.from(allFileTypes),
      loadedFiles: allLoadedFiles,
      loadOrder: loadOrder
    };
  }

  /**
   * 获取文档信息
   * @returns {Promise<Object>} 文档信息
   * @private
   */
  async getDocumentInfo() {
    try {
      const VECTOR_STORE_PATH = path.join(process.cwd(), '.vector-store');
      const docsPath = path.join(VECTOR_STORE_PATH, 'documents.json');
      
      if (await fs.access(docsPath).then(() => true).catch(() => false)) {
        const serializedDocs = JSON.parse(await fs.readFile(docsPath, 'utf8'));
        return this.processDocumentInfo(serializedDocs);
      } else {
        // 从内存中的向量存储获取信息
        const { getVectorStore } = await import('../core/vector-store.js');
        const vectorStore = getVectorStore();
        
        if (vectorStore && vectorStore.docstore && vectorStore.docstore._docs) {
          const docs = Object.values(vectorStore.docstore._docs);
          return this.processDocumentInfo(docs);
        }
      }
    } catch (error) {
      throw new Error(`无法获取文档信息: ${error.message}`);
    }
    
    return { total: 0, files: [], documents: [] };
  }

  /**
   * 处理文档信息
   * @param {Array} documents - 文档数组
   * @returns {Object} 处理后的文档信息
   * @private
   */
  processDocumentInfo(documents) {
    const sourceFiles = new Set();
    const fileTypes = new Set();
    
    documents.forEach(doc => {
      if (doc.metadata && doc.metadata.source) {
        sourceFiles.add(doc.metadata.source);
        const ext = path.extname(doc.metadata.source);
        if (ext) fileTypes.add(ext.substring(1));
      }
    });
    
    return {
      total: documents.length,
      files: Array.from(sourceFiles),
      documents: documents,
      fileTypes: Array.from(fileTypes)
    };
  }

  /**
   * 计算统计信息
   * @param {Object} docInfo - 文档信息
   * @returns {Object} 统计信息
   * @private
   */
  calculateStatistics(docInfo) {
    if (!docInfo.files || docInfo.files.length === 0) {
      return {};
    }
    
    const stats = {};
    docInfo.files.forEach(file => {
      const ext = path.extname(file).substring(1);
      stats[ext] = (stats[ext] || 0) + 1;
    });
    
    return stats;
  }

  /**
   * 获取目录下所有 Markdown 文件
   * @param {string} dirPath - 目录路径
   * @returns {Promise<Array>} 文件路径数组
   * @private
   */
  async getAllMarkdownFiles(dirPath) {
    const files = [];
    
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          const subFiles = await this.getAllMarkdownFiles(itemPath);
          files.push(...subFiles);
        } else if (item.endsWith('.md')) {
          files.push(itemPath);
        }
      }
    } catch (error) {
      // 忽略错误
    }
    
    return files;
  }

  /**
   * 创建临时目录
   * @param {Array} files - 文件路径数组
   * @returns {Promise<string>} 临时目录路径
   * @private
   */
  async createTempDirectory(files) {
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
   * @private
   */
  async cleanupTempDirectory(tempDir) {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  }
}

// 创建服务实例
const knowledgeService = new KnowledgeService();

// ============================================================================
// 向后兼容的导出函数
// ============================================================================

/**
 * 学习文档（向后兼容）
 */
export async function learnDocuments(options) {
  return await knowledgeService.learnDocuments(options);
}

/**
 * 显示知识库状态（向后兼容）
 */
export async function showKnowledgeStatus() {
  return await knowledgeService.getKnowledgeStatus();
}

// ============================================================================
// 新的导出 - 直接访问服务实例
// ============================================================================

/**
 * 获取知识库服务实例
 * @returns {KnowledgeService} 知识库服务实例
 */
export function getKnowledgeService() {
  return knowledgeService;
}

// 导出服务类和实例
export { KnowledgeService, knowledgeService };