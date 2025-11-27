/**
 * 向量存储与知识库管理模块
 * 统一管理向量存储和知识库检索功能
 */

import { DirectoryLoader } from "@langchain/classic/document_loaders/fs/directory";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { JSONLoader } from "@langchain/classic/document_loaders/fs/json";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { tool } from "langchain";
import { z } from "zod";
import path from "path";
import fs from "fs";
import { createWriteStream } from "fs";
import crypto from "crypto";
import { unifiedConfigManager } from '../../config/config-manager.js';
import { error } from '../../utils/logger.js';
import { shouldIncludeDirectory, getValidRuleDirectories } from '../../services/rule-learning/directory-filter.js';

// 全局向量存储实例
let vectorStore = null;
let embeddings = null; // 添加全局嵌入模型实例

// 向量存储持久化路径
const VECTOR_STORE_PATH = path.join(process.cwd(), '.vector-store');

/**
 * 初始化向量存储
 * @returns {Promise<MemoryVectorStore>} 向量存储实例
 */
async function initializeVectorStore() {
  if (vectorStore) {
    return vectorStore;
  }

  // 直接从环境变量读取配置，而不是从配置文件
  const apiKey = process.env.VECTOR_STORE_API_KEY || process.env.CUSTOM_API_KEY;
  const baseURL = process.env.VECTOR_STORE_BASE_URL || process.env.CUSTOM_BASE_URL || 'https://api.openai.com/v1';
  const embeddingModel = process.env.VECTOR_STORE_EMBEDDING_MODEL || 'text-embedding-ada-002';
  
  if (!apiKey) {
    throw new Error("未配置向量存储API密钥，请在.env文件中设置VECTOR_STORE_API_KEY或CUSTOM_API_KEY");
  }

  embeddings = new OpenAIEmbeddings({
    modelName: embeddingModel,
    configuration: {
      apiKey: apiKey,
      baseURL: baseURL,
    }
  });

  vectorStore = new MemoryVectorStore(embeddings);
  return vectorStore;
}

/**
 * 保存向量存储到磁盘
 * @returns {Promise<boolean>} 保存是否成功
 */
async function saveVectorStore() {
  try {
    if (!vectorStore) {
      return false;
    }

    // 确保目录存在
    if (!fs.existsSync(VECTOR_STORE_PATH)) {
      fs.mkdirSync(VECTOR_STORE_PATH, { recursive: true });
    }

    // 获取向量存储中的所有文档和向量
    // 注意：MemoryVectorStore不直接支持序列化，我们需要保存原始文档
    // 这里我们保存一个标记文件，表示向量存储已初始化
    const markerPath = path.join(VECTOR_STORE_PATH, '.initialized');
    fs.writeFileSync(markerPath, new Date().toISOString());
    
    return true;
  } catch (error) {
    console.error("保存向量存储时出错:", error);
    return false;
  }
}

/**
 * 检查向量存储是否已持久化到磁盘
 * @returns {boolean} 是否已持久化
 */
function isVectorStorePersisted() {
  const markerPath = path.join(VECTOR_STORE_PATH, '.initialized');
  return fs.existsSync(markerPath);
}

/**
 * 从rules目录加载文档并添加到向量存储
 * @param {string} rulesDir - rules目录路径
 * @returns {Promise<{documentCount: number, fileTypes: string[]}>} 加载结果
 */
async function loadDocumentsFromRulesDirectory(rulesDir = "./rules") {
  try {
    // 检查目录是否存在
    if (!fs.existsSync(rulesDir)) {
      throw new Error(`Rules目录不存在: ${rulesDir}`);
    }

    // 获取目录内容
    const dirContents = fs.readdirSync(rulesDir);
    if (dirContents.length === 0) {
      return { documentCount: 0, fileTypes: [] };
    }

    // 过滤learning-rules目录，只加载白名单中的目录
    const filteredContents = dirContents.filter(item => {
      const itemPath = path.join(rulesDir, item);
      return shouldIncludeDirectory(itemPath, rulesDir);
    });

    if (filteredContents.length === 0) {
      console.log("[DirectoryFilter] 没有符合条件的规则目录需要加载");
      return { documentCount: 0, fileTypes: [] };
    }

    console.log(`[DirectoryFilter] 将加载以下目录: ${filteredContents.join(', ')}`);

    // 创建目录加载器，支持多种文件类型
    const loader = new DirectoryLoader(rulesDir, {
      ".txt": (path) => new TextLoader(path),
      ".md": (path) => new TextLoader(path),
      ".markdown": (path) => new TextLoader(path),
      ".csv": (path) => new CSVLoader(path),
      ".json": (path) => new JSONLoader(path),
      ".jsonl": (path) => new JSONLoader(path),
      ".docx": (path) => new DocxLoader(path),
      ".pdf": (path) => new PDFLoader(path),
    });

    // 加载文档
    const docs = await loader.load();
    
    // 如果没有文档，直接返回
    if (docs.length === 0) {
      return { documentCount: 0, fileTypes: [] };
    }

    // 文本分割器，将长文档分割成小块
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    // 分割文档
    const splitDocs = await textSplitter.splitDocuments(docs);
    console.log(`已切分文档为 ${splitDocs.length} 个块`);
    
    // 初始化向量存储
    await initializeVectorStore();
    
    const BATCH_SIZE = 50;
    const PARALLEL_BATCHES = 3; // 并行处理的批次数量
    console.log(`开始分批添加文档到向量存储，批次大小: ${BATCH_SIZE}，并行数: ${PARALLEL_BATCHES}`);
    
    // 将文档分成批次
    const batches = [];
    for (let i = 0; i < splitDocs.length; i += BATCH_SIZE) {
      batches.push(splitDocs.slice(i, i + BATCH_SIZE));
    }
    
    // 并行处理多个批次
    for (let i = 0; i < batches.length; i += PARALLEL_BATCHES) {
      const parallelBatches = batches.slice(i, i + PARALLEL_BATCHES);
      const batchNumbers = parallelBatches.map((_, idx) => i + idx + 1);
      console.log(`正在并行处理第 ${batchNumbers.join(', ')} 批，共 ${parallelBatches.reduce((sum, b) => sum + b.length, 0)} 个文档块...`);
      
      await Promise.all(
        parallelBatches.map(batch => vectorStore.addDocuments(batch))
      );
    }
    console.log("所有文档已成功添加到向量存储。");
    
    // 保存文档信息和向量数据到磁盘，以便后续重新加载
    try {
      if (!fs.existsSync(VECTOR_STORE_PATH)) {
        fs.mkdirSync(VECTOR_STORE_PATH, { recursive: true });
      }
      
      // 获取当前嵌入模型信息
      const apiKey = process.env.VECTOR_STORE_API_KEY || process.env.CUSTOM_API_KEY;
      const baseURL = process.env.VECTOR_STORE_BASE_URL || process.env.CUSTOM_BASE_URL || 'https://api.openai.com/v1';
      const embeddingModel = process.env.VECTOR_STORE_EMBEDDING_MODEL || 'text-embedding-ada-002';
      
      // 保存分割后的文档到磁盘
      const docsPath = path.join(VECTOR_STORE_PATH, 'documents.json');
      const serializedDocs = splitDocs.map(doc => ({
        pageContent: doc.pageContent,
        metadata: doc.metadata
      }));
      fs.writeFileSync(docsPath, JSON.stringify(serializedDocs, null, 2));
      
      // 获取并保存向量数据
      console.log("正在提取向量数据...");
      const vectors = [];
      for (let i = 0; i < splitDocs.length; i++) {
        const doc = splitDocs[i];
        // 为每个文档生成向量
        const vector = await embeddings.embedQuery(doc.pageContent);
        vectors.push({
          content: doc.pageContent,
          embedding: vector,
          metadata: doc.metadata
        });
        
        // 显示进度
        if ((i + 1) % 50 === 0 || i === splitDocs.length - 1) {
          console.log(`已提取 ${i + 1}/${splitDocs.length} 个向量`);
        }
      }
      
      // 使用流式写入保存向量数据(优化大文件写入性能和内存占用)
      const vectorsPath = path.join(VECTOR_STORE_PATH, 'vectors.json');
      console.log("正在流式写入向量数据到磁盘...");
      
      const writeStream = createWriteStream(vectorsPath);
      
      // 写入文件头部
      writeStream.write('{\n');
      writeStream.write(`  "model": "${embeddingModel}",\n`);
      writeStream.write(`  "baseURL": "${baseURL}",\n`);
      writeStream.write('  "vectors": [\n');
      
      // 流式写入向量数据
      for (let i = 0; i < vectors.length; i++) {
        const vectorJson = JSON.stringify(vectors[i], null, 4);
        // 添加缩进
        const indentedJson = vectorJson.split('\n').map(line => '    ' + line).join('\n');
        writeStream.write(indentedJson);
        
        if (i < vectors.length - 1) {
          writeStream.write(',\n');
        } else {
          writeStream.write('\n');
        }
      }
      
      // 写入文件尾部
      writeStream.write('  ]\n');
      writeStream.write('}\n');
      
      // 等待写入完成
      await new Promise((resolve, reject) => {
        writeStream.end();
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      
      console.log("向量数据已流式写入完成");
      
      // 创建初始化标记
      const markerPath = path.join(VECTOR_STORE_PATH, '.initialized');
      fs.writeFileSync(markerPath, new Date().toISOString());
      
      console.log("向量存储已保存到磁盘");
    } catch (saveError) {
      console.warn("保存向量存储到磁盘时出错:", saveError.message);
    }
    
    // 收集文件类型信息
    const fileTypes = new Set();
    docs.forEach(doc => {
      const ext = path.extname(doc.metadata.source).toLowerCase();
      if (ext) {
        fileTypes.add(ext);
      }
    });

    return {
      documentCount: splitDocs.length,
      fileTypes: Array.from(fileTypes)
    };
  } catch (error) {
    console.error("加载文档时出错:", error);
    throw error;
  }
}

/**
 * 从磁盘加载向量存储
 * @returns {Promise<boolean>} 加载是否成功
 */
async function loadVectorStoreFromDisk() {
  try {
    if (!isVectorStorePersisted()) {
      return false;
    }

    // 检查必要文件是否存在
    const docsPath = path.join(VECTOR_STORE_PATH, 'documents.json');
    const vectorsPath = path.join(VECTOR_STORE_PATH, 'vectors.json');
    
    if (!fs.existsSync(docsPath)) {
      console.warn("向量存储文件不完整，需要重新学习");
      return false;
    }

    // 获取当前嵌入模型信息
    const apiKey = process.env.VECTOR_STORE_API_KEY || process.env.CUSTOM_API_KEY;
    const baseURL = process.env.VECTOR_STORE_BASE_URL || process.env.CUSTOM_BASE_URL || 'https://api.openai.com/v1';
    const embeddingModel = process.env.VECTOR_STORE_EMBEDDING_MODEL || 'text-embedding-ada-002';
    
    // 初始化向量存储
    await initializeVectorStore();
    
    // 优先尝试加载预计算的向量数据
    if (fs.existsSync(vectorsPath)) {
      try {
        console.log("正在加载预计算的向量数据...");
        const vectorsData = JSON.parse(fs.readFileSync(vectorsPath, 'utf8'));
        
        // 检查嵌入模型是否匹配
        if (vectorsData.model !== embeddingModel || vectorsData.baseURL !== baseURL) {
          console.warn("嵌入模型或API地址不匹配，将重新生成向量");
          console.log(`当前: ${embeddingModel} @ ${baseURL}`);
          console.log(`存储: ${vectorsData.model} @ ${vectorsData.baseURL}`);
          
          // 回退到原始文档加载方式
          const serializedDocs = JSON.parse(fs.readFileSync(docsPath, 'utf8'));
          
          const BATCH_SIZE = 50;
          const PARALLEL_BATCHES = 3;
          console.log(`从磁盘加载文档，共${serializedDocs.length} 个文档块`);
          
          // 将文档分成批次并并行处理
          const batches = [];
          for (let i = 0; i < serializedDocs.length; i += BATCH_SIZE) {
            batches.push(serializedDocs.slice(i, i + BATCH_SIZE));
          }
          
          for (let i = 0; i < batches.length; i += PARALLEL_BATCHES) {
            const parallelBatches = batches.slice(i, i + PARALLEL_BATCHES);
            await Promise.all(
              parallelBatches.map(batch => vectorStore.addDocuments(batch))
            );
          }
        } else {
          // 直接使用预计算的向量数据
          console.log(`直接加载 ${vectorsData.vectors.length} 个预计算向量`);
          
          // 将向量数据添加到向量存储
          const BATCH_SIZE = 50;
          const PARALLEL_BATCHES = 3;
          
          // 准备所有批次
          const batches = [];
          for (let i = 0; i < vectorsData.vectors.length; i += BATCH_SIZE) {
            const batch = vectorsData.vectors.slice(i, i + BATCH_SIZE);
            const docs = batch.map(item => ({
              pageContent: item.content,
              metadata: item.metadata
            }));
            batches.push(docs);
          }
          
          // 并行处理批次
          for (let i = 0; i < batches.length; i += PARALLEL_BATCHES) {
            const parallelBatches = batches.slice(i, i + PARALLEL_BATCHES);
            await Promise.all(
              parallelBatches.map(batch => vectorStore.addDocuments(batch))
            );
          }
        }
        
        console.log("向量存储已从磁盘加载");
        return true;
      } catch (vectorsError) {
        console.warn("加载向量数据失败，回退到文档加载方式:", vectorsError.message);
      }
    }
    
    // 回退方案：加载原始文档并重新生成向量
    console.log("正在加载原始文档并重新生成向量...");
    const serializedDocs = JSON.parse(fs.readFileSync(docsPath, 'utf8'));
    
    const BATCH_SIZE = 50;
    const PARALLEL_BATCHES = 3;
    console.log(`从磁盘加载文档，共${serializedDocs.length} 个文档块`);
    
    // 将文档分成批次并并行处理
    const batches = [];
    for (let i = 0; i < serializedDocs.length; i += BATCH_SIZE) {
      batches.push(serializedDocs.slice(i, i + BATCH_SIZE));
    }
    
    for (let i = 0; i < batches.length; i += PARALLEL_BATCHES) {
      const parallelBatches = batches.slice(i, i + PARALLEL_BATCHES);
      await Promise.all(
        parallelBatches.map(batch => vectorStore.addDocuments(batch))
      );
    }
    
    console.log("向量存储已从磁盘加载");
    return true;
  } catch (error) {
    console.error("从磁盘加载向量存储时出错:", error);
    return false;
  }
}

/**
 * 从向量存储中检索相关文档
 * @param {string} query - 查询字符串
 * @param {number} k - 返回文档数量，默认为2
 * @returns {Promise<{text: string, documents: any[]}>} 检索结果
 */
async function retrieveDocuments(query, k = 2) {
  try {
    // 如果向量存储未初始化，尝试从磁盘加载
    if (!vectorStore && isVectorStorePersisted()) {
      await loadVectorStoreFromDisk();
    }
    
    if (!vectorStore) {
      throw new Error("向量存储未初始化，请先运行 'learn' 命令加载文档");
    }

    const retrievedDocs = await vectorStore.similaritySearch(query, k);
    
    // 格式化检索结果
    const serialized = retrievedDocs
      .map(
        (doc) => `源文件: ${doc.metadata.source}\n内容: ${doc.pageContent}`
      )
      .join("\n");

    return {
      text: serialized,
      documents: retrievedDocs
    };
  } catch (error) {
    console.error("检索文档时出错:", error);
    throw error;
  }
}

/**
 * 直接进行相似性搜索（供 performance.js 使用）
 * @param {string} query - 查询字符串
 * @param {number} k - 返回文档数量，默认为4
 * @returns {Promise<any[]>} 检索到的文档数组
 */
async function similaritySearch(query, k = 4) {
  try {
    // 如果向量存储未初始化，尝试从磁盘加载
    if (!vectorStore && isVectorStorePersisted()) {
      await loadVectorStoreFromDisk();
    }
    
    if (!vectorStore) {
      throw new Error("向量存储未初始化，请先运行 'learn' 命令加载文档");
    }

    return await vectorStore.similaritySearch(query, k);
  } catch (error) {
    console.error("相似性搜索时出错:", error);
    throw error;
  }
}

/**
 * 重置向量存储
 * @returns {Promise<boolean>} 重置是否成功
 */
async function resetVectorStore() {
  try {
    // 重置内存中的向量存储
    vectorStore = null;
    embeddings = null; // 重置嵌入模型实例
    
    // 删除持久化的向量存储目录
    if (fs.existsSync(VECTOR_STORE_PATH)) {
      fs.rmSync(VECTOR_STORE_PATH, { recursive: true, force: true });
      console.log("已删除持久化的向量存储和向量数据文件");
    }
    
    return true;
  } catch (error) {
    console.error("重置向量存储时出错:", error);
    return false;
  }
}

/**
 * 检查向量存储是否已初始化
 * @returns {boolean} 是否已初始化
 */
function isVectorStoreInitialized() {
  // 如果内存中有向量存储，返回true
  if (vectorStore !== null) {
    return true;
  }
  
  // 如果内存中没有但磁盘上有持久化的向量存储，也返回true
  // 这样在analyze命令中会尝试从磁盘加载
  return isVectorStorePersisted();
}

/**
 * 创建知识库检索工具（从knowledgeBase.js合并）
 * @returns {Object} 知识库检索工具
 */
function createRetrieveTool() {
  // 定义检索工具的输入模式
  const retrieveSchema = z.object({
    query: z.string().describe("用于检索相关文档的查询字符串")
  });

  // 创建检索工具
  const retrieve = tool(
    async ({ query }) => {
      try {
        // 检查向量存储是否已初始化
        if (!isVectorStoreInitialized()) {
          return "知识库未初始化，请先运行 'learn' 命令加载文档。";
        }

        // 从向量存储中检索相关文档
        const { text, documents } = await retrieveDocuments(query, 4);

        // 格式化检索结果
        const formattedResult = `检索到 ${documents.length} 个相关文档:\n${text}`;

        return [formattedResult, documents];
      } catch (error) {
        error('knowledge', '检索文档时出错', error);
        return `检索文档时出错: ${error.message}`;
      }
    },
    {
      name: "retrieve",
      description: "从知识库中检索与查询相关的信息",
      schema: retrieveSchema,
      responseFormat: "content_and_artifact",
    }
  );

  return retrieve;
}

/**
 * 直接检索知识库文档（从knowledgeBase.js合并）
 * @param {string} query - 查询字符串
 * @param {number} k - 返回文档数量
 * @returns {Promise<Object>} 检索结果
 */
async function retrieveKnowledge(query, k = 4) {
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
    error('knowledge', '检索知识库失败', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export {
  initializeVectorStore,
  loadDocumentsFromRulesDirectory,
  retrieveDocuments,
  resetVectorStore,
  isVectorStoreInitialized,
  loadVectorStoreFromDisk,
  saveVectorStore,
  isVectorStorePersisted,
  similaritySearch,
  createRetrieveTool,
  retrieveKnowledge
};


/**
 * 生成API密钥的哈希值，用于验证而不暴露实际密钥
 * @param {string} apiKey - API密钥
 * @returns {string} - 哈希值
 */
function hashApiKey(apiKey) {
  if (!apiKey) return '';
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}