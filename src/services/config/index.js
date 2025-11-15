import fs from 'fs/promises';
import path from 'path';

// 配置文件路径
const ENV_FILE = path.join(process.cwd(), '.env');

// 默认配置
export const DEFAULT_CONFIG = {
  baseURL: 'https://api.siliconflow.cn/v1',
  apiKey: '',
  model: 'zai-org/GLM-4.6',
  embeddingModel: 'BAAI/bge-m3',
  apiPort: 3000,
  apiHost: '0.0.0.0',
  apiCorsEnabled: true,
  apiCorsOrigin: '*'
};

// 配置键映射 (内部键名 -> 环境变量名)
const CONFIG_MAP = {
  apiKey: 'CUSTOM_API_KEY',
  baseURL: 'CUSTOM_BASE_URL',
  model: 'CUSTOM_MODEL',
  embeddingModel: 'CUSTOM_EMBEDDING_MODEL',
  apiPort: 'API_PORT',
  apiHost: 'API_HOST',
  apiCorsEnabled: 'API_CORS_ENABLED',
  apiCorsOrigin: 'API_CORS_ORIGIN'
};

// 配置键描述
const CONFIG_DESC = {
  apiKey: 'API密钥',
  baseURL: 'API基础URL',
  model: '模型名称',
  embeddingModel: '嵌入模型名称',
  apiPort: 'API服务器端口',
  apiHost: 'API服务器主机',
  apiCorsEnabled: '是否启用CORS',
  apiCorsOrigin: 'CORS允许的源'
};

/**
 * 解析.env文件内容
 * @param {string} content - 文件内容
 * @returns {Object} 环境变量对象
 */
function parseEnvContent(content) {
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  }
  return env;
}

/**
 * 读取配置
 * @returns {Promise<Object>} 配置对象
 */
export async function readConfig() {
  try {
    const content = await fs.readFile(ENV_FILE, 'utf8');
    const env = parseEnvContent(content);
    
    // 构建配置对象
    const config = {};
    for (const [key, envKey] of Object.entries(CONFIG_MAP)) {
      const envValue = env[envKey] || process.env[envKey];
      
      // 类型转换
      if (key === 'apiPort') {
        config[key] = envValue ? parseInt(envValue, 10) : DEFAULT_CONFIG[key];
        if (isNaN(config[key])) config[key] = DEFAULT_CONFIG[key];
      } else if (key === 'apiCorsEnabled') {
        config[key] = envValue ? envValue === 'true' : DEFAULT_CONFIG[key];
      } else {
        config[key] = envValue || DEFAULT_CONFIG[key];
      }
    }
    
    return config;
  } catch (error) {
    // 文件不存在或读取失败,返回默认配置
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * 获取单个配置项
 * @param {string} key - 配置键名
 * @returns {Promise<any>} 配置值
 */
export async function getConfig(key) {
  const config = await readConfig();
  return config[key];
}

/**
 * 设置配置项
 * @param {string} key - 配置键名
 * @param {any} value - 配置值
 * @returns {Promise<boolean>} 是否成功
 */
export async function setConfig(key, value) {
  if (!CONFIG_MAP[key]) {
    throw new Error(`无效的配置键: ${key}`);
  }
  
  try {
    // 读取现有配置
    let env = {};
    try {
      const content = await fs.readFile(ENV_FILE, 'utf8');
      env = parseEnvContent(content);
    } catch {
      // 文件不存在,使用空对象
    }
    
    // 更新配置
    const envKey = CONFIG_MAP[key];
    env[envKey] = String(value);
    
    // 写入文件
    await writeEnvFile(env);
    return true;
  } catch (error) {
    console.error('设置配置失败:', error);
    return false;
  }
}

/**
 * 写入.env文件
 * @param {Object} env - 环境变量对象
 */
async function writeEnvFile(env) {
  let content = '';
  
  // 按照配置映射的顺序写入
  for (const [key, envKey] of Object.entries(CONFIG_MAP)) {
    if (env[envKey] !== undefined) {
      content += `# ${CONFIG_DESC[key]}\n`;
      content += `${envKey}=${env[envKey]}\n\n`;
    }
  }
  
  await fs.writeFile(ENV_FILE, content, 'utf8');
}

/**
 * 列出所有配置
 */
export async function listConfig() {
  const config = await readConfig();
  
  console.log('当前配置:');
  console.log('-'.repeat(50));
  
  for (const key of Object.keys(DEFAULT_CONFIG)) {
    const value = config[key];
    const displayValue = value === '' ? '(未设置)' : value;
    console.log(`${key.padEnd(20)}: ${displayValue}`);
  }
  
  console.log('-'.repeat(50));
}

/**
 * 重置配置为默认值
 */
export async function resetConfig() {
  const env = {};
  for (const [key, envKey] of Object.entries(CONFIG_MAP)) {
    env[envKey] = String(DEFAULT_CONFIG[key]);
  }
  
  await writeEnvFile(env);
  console.log('配置已重置为默认值');
  await listConfig();
}