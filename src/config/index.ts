/**
* 简化的配置管理器
* 去掉过度工程化的设计，保持简单实用
*/

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config();

/**
* 默认配置
*/
const defaultConfig = {
// 基础配置
nodeEnv: process.env.NODE_ENV || 'development',
logLevel: process.env.LOG_LEVEL || 'info',

// 服务器配置
server: {
port: parseInt(process.env.API_PORT || process.env.PORT || '3005'),
host: process.env.API_HOST || '0.0.0.0',
cors: {
enabled: process.env.API_CORS_ENABLED !== 'false',
origin: process.env.API_CORS_ORIGIN || '*'
}
},

// LLM服务配置
llm: {
apiKey: process.env.CUSTOM_API_KEY,
model: process.env.CUSTOM_MODEL || 'gpt-3.5-turbo',
baseUrl: process.env.CUSTOM_BASE_URL,
timeout: parseInt(process.env.LLM_TIMEOUT) || 30000,
maxRetries: parseInt(process.env.LLM_MAX_RETRIES) || 3
},

// 向量存储配置
vectorStore: {
apiKey: process.env.VECTOR_STORE_API_KEY || process.env.CUSTOM_API_KEY,
baseUrl: process.env.VECTOR_STORE_BASE_URL || process.env.CUSTOM_BASE_URL,
embeddingModel: process.env.VECTOR_STORE_EMBEDDING_MODEL || 'text-embedding-ada-002'
},

// 规则学习配置
ruleLearning: {
enabled: process.env.RULE_LEARNING_ENABLED !== 'false',
minConfidence: parseFloat(process.env.RULE_LEARNING_MIN_CONFIDENCE) || 0.5,
batchSize: parseInt(process.env.RULE_LEARNING_BATCH_SIZE) || 5,
autoApproveThreshold: parseFloat(process.env.RULE_EVALUATION_AUTO_APPROVAL_THRESHOLD) / 100 || 0.5
},

// 规则审批配置
approval: {
autoApproveThreshold: parseFloat(process.env.RULE_EVALUATION_AUTO_APPROVAL_THRESHOLD) / 100 || 0.5,
minQualityScore: parseInt(process.env.RULE_EVALUATION_MIN_QUALITY_SCORE) || 60,
completenessConfidenceThreshold: parseFloat(process.env.RULE_EVALUATION_CONFIDENCE_THRESHOLD) / 100 || 0.5
},

// 知识库配置
knowledge: {
enabled: process.env.KNOWLEDGE_BASE_ENABLED !== 'false',
rulesDir: process.env.KNOWLEDGE_RULES_DIR || 'rules',
},

// 速率限制配置
rateLimit: {
window: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15分钟
max: parseInt(process.env.RATE_LIMIT_MAX) || 100
},

// 认证配置
auth: {
apiKey: process.env.API_KEY,
adminKey: process.env.ADMIN_KEY
}
};

/**
* 简化的配置管理器类
*/
class SimpleConfigManager {
private config: any;
constructor(customConfig = {}) {
this.config = { ...defaultConfig, ...customConfig };
this.validate();
}

/**
* 获取配置值
* @param {string} path - 配置路径，如 'server.port'
* @param {*} defaultValue - 默认值
* @returns {*} 配置值
*/
get(path: string, defaultValue: any = undefined): any {
const keys = path.split('.');
let value = this.config;

for (const key of keys) {
if (value && typeof value === 'object' && key in value) {
value = value[key];
} else {
return defaultValue;
}
}

return value;
}

/**
* 设置配置值
* @param {string} path - 配置路径
* @param {*} value - 配置值
*/
set(path, value) {
const keys = path.split('.');
let current = this.config;

for (let i = 0; i < keys.length - 1; i++) {
const key = keys[i];
if (!(key in current) || typeof current[key] !== 'object') {
current[key] = {};
}
current = current[key];
}

current[keys[keys.length - 1]] = value;
}

/**
* 获取所有配置
* @returns {Object} 配置对象
*/
getAll() {
return { ...this.config };
}

/**
* 获取服务器配置
* @returns {Object} 服务器配置
*/
getServerConfig() {
return this.get('server');
}

/**
* 获取LLM配置
* @returns {Object} LLM配置
*/
getLlmConfig() {
return this.get('llm');
}

/**
* 获取规则学习配置
* @returns {Object} 规则学习配置
*/
getRuleLearningConfig() {
return this.get('ruleLearning');
}

/**
* 获取模块配置（兼容原配置管理器）
* @param {string} module - 模块名
* @param {*} defaultValue - 默认值
* @returns {*} 配置值
*/
getModule(module, defaultValue = {}) {
return this.get(module, defaultValue);
}


/**
* 获取知识库配置
* @returns {Object} 知识库配置
*/
getKnowledgeConfig() {
return this.getModule('knowledge');
}

/**
* 深度合并对象
* @param target - 目标对象
* @param source - 源对象
* @returns 合并后的对象
*/
deepMerge(target: any, source: any): any {
  const result = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = this.deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

/**
* 验证必要的配置项
*/
validate() {
const errors = [];

// 验证LLM配置
if (!this.config.llm.apiKey) {
errors.push('LLM API Key is required');
}
if (!this.config.llm.baseUrl) {
errors.push('LLM Base URL is required');
}

// 验证端口配置
if (this.config.server.port < 1 || this.config.server.port > 65535) {
errors.push('Server port must be between 1 and 65535');
}

// 验证规则学习配置
if (this.config.ruleLearning.minConfidence < 0 || this.config.ruleLearning.minConfidence > 1) {
errors.push('Rule learning minConfidence must be between 0 and 1');
}

if (errors.length > 0) {
throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
}
}
}

// 创建全局配置实例
const config = new SimpleConfigManager();

export { SimpleConfigManager, config };
export default config;