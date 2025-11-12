/**
 * 向量存储模块
 * 用于管理全局的向量存储实例，支持文档加载和检索功能
 */

const { DirectoryLoader } = require("@langchain/classic/document_loaders/fs/directory");
const { TextLoader } = require("@langchain/classic/document_loaders/fs/text");
const { CSVLoader } = require("@langchain/community/document_loaders/fs/csv");
const { JSONLoader } = require("@langchain/classic/document_loaders/fs/json");
const { DocxLoader } = require("@langchain/community/document_loaders/fs/docx");
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { MemoryVectorStore } = require("@langchain/classic/vectorstores/memory");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { readConfig } = require('../../utils/config');
const path = require("path");
const fs = require("fs");

// 全局向量存储实例
let vectorStore = null;

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

  const config = await readConfig();
  if (!config.apiKey) {
    throw new Error("未配置OpenAI API密钥，请先运行 'cli config set apiKey <your-api-key>'");
  }

  const embeddings = new OpenAIEmbeddings({
    modelName: config.embeddingModel,
    configuration: {
      apiKey: config.apiKey,
      baseURL: config.baseURL || 'https://api.openai.com/v1',
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
    console.log(`开始分批添加文档到向量存储，批次大小: ${BATCH_SIZE}`);
    for (let i = 0; i < splitDocs.length; i += BATCH_SIZE) {
      const batch = splitDocs.slice(i, i + BATCH_SIZE);
      console.log(`正在处理第 ${Math.floor(i / BATCH_SIZE) + 1} 批，共${batch.length} 个文档块...`);
      await vectorStore.addDocuments(batch);
    }
    console.log("所有文档已成功添加到向量存储。");
    
    // 保存文档信息到磁盘，以便后续重新加载
    try {
      if (!fs.existsSync(VECTOR_STORE_PATH)) {
        fs.mkdirSync(VECTOR_STORE_PATH, { recursive: true });
      }
      
      // 保存分割后的文档到磁盘
      const docsPath = path.join(VECTOR_STORE_PATH, 'documents.json');
      const serializedDocs = splitDocs.map(doc => ({
        pageContent: doc.pageContent,
        metadata: doc.metadata
      }));
      fs.writeFileSync(docsPath, JSON.stringify(serializedDocs, null, 2));
      
      // 保存配置信息
      const config = await readConfig();
      const configPath = path.join(VECTOR_STORE_PATH, 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        apiKey: config.apiKey,
        baseURL: config.baseURL || 'https://api.openai.com/v1',
        embeddingModel: config.embeddingModel
      }, null, 2));
      
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
    const configPath = path.join(VECTOR_STORE_PATH, 'config.json');
    
    if (!fs.existsSync(docsPath) || !fs.existsSync(configPath)) {
      console.warn("向量存储文件不完整，需要重新学习");
      return false;
    }

    // 读取配置
    const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const currentConfig = await readConfig();
    
    // 检查配置是否匹配
    if (savedConfig.apiKey !== currentConfig.apiKey || 
        savedConfig.embeddingModel !== currentConfig.embeddingModel) {
      console.warn("配置已更改，需要重新学习文档");
      return false;
    }

    // 读取文档
    const serializedDocs = JSON.parse(fs.readFileSync(docsPath, 'utf8'));
    
    // 初始化向量存储
    await initializeVectorStore();
    
    // 将文档添加到向量存储
    const BATCH_SIZE = 50;
    console.log(`从磁盘加载向量存储，共${serializedDocs.length} 个文档块`);
    
    for (let i = 0; i < serializedDocs.length; i += BATCH_SIZE) {
      const batch = serializedDocs.slice(i, i + BATCH_SIZE);
      await vectorStore.addDocuments(batch);
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
 */
function resetVectorStore() {
  vectorStore = null;
  
  // 删除持久化的向量存储
  try {
    if (fs.existsSync(VECTOR_STORE_PATH)) {
      // 递归删除目录及其内容
      const deleteRecursive = (directoryPath) => {
        if (fs.existsSync(directoryPath)) {
          fs.readdirSync(directoryPath).forEach((file, index) => {
            const curPath = path.join(directoryPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
              // 递归删除子目录
              deleteRecursive(curPath);
            } else {
              // 删除文件
              fs.unlinkSync(curPath);
            }
          });
          fs.rmdirSync(directoryPath);
        }
      };
      
      deleteRecursive(VECTOR_STORE_PATH);
      console.log("已删除持久化的向量存储");
    }
  } catch (error) {
    console.error("删除持久化向量存储时出错:", error);
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

module.exports = {
  initializeVectorStore,
  loadDocumentsFromRulesDirectory,
  retrieveDocuments,
  resetVectorStore,
  isVectorStoreInitialized,
  loadVectorStoreFromDisk,
  saveVectorStore,
  isVectorStorePersisted,
  similaritySearch
};