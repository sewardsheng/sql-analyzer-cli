import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandlerMiddleware } from '../middleware/apiMiddleware.js';
import { learnDocuments } from '../../knowledge/learn.js';
import { isVectorStoreInitialized, isVectorStorePersisted } from '../../../core/graph/vectorStore.js';
import fs from 'fs/promises';
import path from 'path';

const knowledgeRouter = new Hono();

// 应用CORS中间件
knowledgeRouter.use('*', cors());

// 应用错误处理中间件
knowledgeRouter.use('*', errorHandlerMiddleware());

/**
 * 获取知识库状态数据（用于API）
 * @returns {Object} 知识库状态数据
 */
async function getKnowledgeStatusData() {
  try {
    // 检查知识库是否已初始化
    const isInitialized = isVectorStoreInitialized();
    
    // 检查知识库是否已持久化到磁盘
    const isPersisted = isVectorStorePersisted();
    
    const result = {
      initialized: isInitialized,
      persisted: isPersisted,
      documentCount: 0,
      files: [],
      fileTypes: []
    };
    
    // 如果知识库已初始化，尝试获取更多信息
    if (isInitialized) {
      try {
        // 尝试从磁盘加载文档信息
        const VECTOR_STORE_PATH = path.join(process.cwd(), '.vector-store');
        const docsPath = path.join(VECTOR_STORE_PATH, 'documents.json');
        
        if (await fs.access(docsPath).then(() => true).catch(() => false)) {
          // 从磁盘读取文档信息
          const serializedDocs = JSON.parse(await fs.readFile(docsPath, 'utf8'));
          result.documentCount = serializedDocs.length;
          
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
          
          result.files = Array.from(sourceFiles);
          result.fileTypes = Array.from(fileTypes);
        } else {
          // 尝试从内存中的向量存储获取信息
          const { getVectorStore } = await import('../../../core/graph/vectorStore.js');
          const vectorStore = getVectorStore();
          
          if (vectorStore && vectorStore.docstore && vectorStore.docstore._docs) {
            const docCount = Object.keys(vectorStore.docstore._docs).length;
            result.documentCount = docCount;
            
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
            
            result.files = Array.from(sourceFiles);
            result.fileTypes = Array.from(fileTypes);
          }
        }
      } catch (error) {
        // 如果获取详细信息失败，只返回基本状态
        console.error('获取知识库详细信息失败:', error.message);
      }
    }
    
    return result;
  } catch (error) {
    throw new Error(`获取知识库状态失败: ${error.message}`);
  }
}

// 获取知识库状态
knowledgeRouter.get('/status', async (c) => {
  try {
    const status = await getKnowledgeStatusData();
    
    return c.json({
      success: true,
      data: {
        ...status,
        message: status.initialized 
          ? '知识库已初始化' 
          : '知识库未初始化'
      }
    });
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message
      }
    }, 500);
  }
});

// 加载文档到知识库
knowledgeRouter.post('/load', async (c) => {
  try {
    const { rulesDir, reset, apiKey, baseURL, model, embeddingModel } = await c.req.json();
    
    // 使用learnDocuments函数加载文档
    await learnDocuments({
      rulesDir: rulesDir || './rules',
      reset: reset || false,
      apiKey,
      baseURL,
      model,
      embeddingModel
    });
    
    // 获取加载后的状态
    const status = await getKnowledgeStatusData();
    
    return c.json({
      success: true,
      data: {
        ...status,
        message: '文档加载成功'
      }
    });
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message
      }
    }, 500);
  }
});

// 重置知识库
knowledgeRouter.delete('/reset', async (c) => {
  try {
    const { resetVectorStore } = await import('../../../core/graph/vectorStore.js');
    resetVectorStore();
    
    return c.json({
      success: true,
      data: {
        initialized: false,
        persisted: false,
        documentCount: 0,
        files: [],
        fileTypes: [],
        message: '知识库已重置'
      }
    });
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message
      }
    }, 500);
  }
});

export { knowledgeRouter };