import fs from 'fs/promises';
import path from 'path';

// 直接导入inquirer和chalk，Bun原生支持ES模块
import inquirer from 'inquirer';
import chalk from 'chalk';

// .env文件路径
const ENV_FILE = path.join(process.cwd(), '.env');
// 配置缓存，避免频繁读取文件
let configCache = null;
let lastReadTime = 0;
const CACHE_DURATION = 1000; // 缓存有效期1秒

/**
 * 默认配置
 */
const DEFAULT_CONFIG = {
  baseURL: 'https://api.siliconflow.cn/v1',
  apiKey: '',
  model: 'zai-org/GLM-4.6',
  embeddingModel: 'BAAI/bge-m3',
  // API服务器配置
  apiPort: 3000,
  apiHost: '0.0.0.0',
  apiCorsEnabled: true,
  apiCorsOrigin: '*'
};

/**
 * 配置键映射
 */
const CONFIG_KEYS = {
  apiKey: 'CUSTOM_API_KEY',
  baseURL: 'CUSTOM_BASE_URL',
  model: 'CUSTOM_MODEL',
  embeddingModel: 'CUSTOM_EMBEDDING_MODEL',
  apiPort: 'API_PORT',
  apiHost: 'API_HOST',
  apiCorsEnabled: 'API_CORS_ENABLED',
  apiCorsOrigin: 'API_CORS_ORIGIN'
};

/**
 * 配置项描述映射
 */
const CONFIG_DESCRIPTIONS = {
  CUSTOM_API_KEY: 'API密钥',
  CUSTOM_BASE_URL: '自定义API基础URL',
  CUSTOM_MODEL: '模型名称',
  CUSTOM_EMBEDDING_MODEL: '嵌入模型名称',
  API_PORT: 'API服务器端口',
  API_HOST: 'API服务器主机',
  API_CORS_ENABLED: '是否启用CORS',
  API_CORS_ORIGIN: 'CORS允许的源'
};

/**
 * 配置项顺序
 */
const ENV_ORDER = [
  'CUSTOM_BASE_URL',
  'CUSTOM_API_KEY',
  'CUSTOM_MODEL',
  'CUSTOM_EMBEDDING_MODEL',
  'API_PORT',
  'API_HOST',
  'API_CORS_ENABLED',
  'API_CORS_ORIGIN'
];

/**
 * 读取.env文件内容
 * @returns {Promise<Object>} 环境变量对象
 */
async function readEnvFile() {
  try {
    const data = await fs.readFile(ENV_FILE, 'utf8');
    const env = {};
    
    // 解析.env文件内容
    for (const line of data.split('\n')) {
      // 跳过注释和空行
      if (line.trim() === '' || line.trim().startsWith('#')) {
        continue;
      }
      
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        env[match[1]] = match[2];
      }
    }
    
    return env;
  } catch (error) {
    // 如果.env文件不存在，返回空对象
    return {};
  }
}

/**
 * 清除配置缓存
 */
function clearConfigCache() {
  configCache = null;
  lastReadTime = 0;
};

/**
 * 写入.env文件
 * @param {Object} env 环境变量对象
 */
async function writeEnvFile(env) {
  let content = '';
  
  // 按照特定顺序写入环境变量
  for (const key of ENV_ORDER) {
    if (env[key] !== undefined) {
      // 添加注释
      if (CONFIG_DESCRIPTIONS[key]) {
        content += `# ${CONFIG_DESCRIPTIONS[key]}\n`;
      }
      content += `${key}=${env[key]}\n\n`;
    }
  }
  
  await fs.writeFile(ENV_FILE, content);
  // 清除缓存，确保下次读取的是最新配置
  clearConfigCache();
};

/**
 * 读取配置
 * @returns {Promise<Object>} 配置对象
 */
async function readConfig() {
  // 检查缓存是否有效
  const now = Date.now();
  if (configCache && (now - lastReadTime < CACHE_DURATION)) {
    return { ...configCache };
  }
  
  try {
    const env = await readEnvFile();
    
    // 从环境变量中读取配置，优先使用.env文件中的值
    const config = {
      baseURL: env.CUSTOM_BASE_URL || process.env.CUSTOM_BASE_URL || DEFAULT_CONFIG.baseURL,
      apiKey: env.CUSTOM_API_KEY || process.env.CUSTOM_API_KEY || DEFAULT_CONFIG.apiKey,
      model: env.CUSTOM_MODEL || process.env.CUSTOM_MODEL || DEFAULT_CONFIG.model,
      embeddingModel: env.CUSTOM_EMBEDDING_MODEL || process.env.CUSTOM_EMBEDDING_MODEL || DEFAULT_CONFIG.embeddingModel,
      // API服务器配置
      apiPort: env.API_PORT || process.env.API_PORT || DEFAULT_CONFIG.apiPort,
      apiHost: env.API_HOST || process.env.API_HOST || DEFAULT_CONFIG.apiHost,
      apiCorsEnabled: env.API_CORS_ENABLED !== undefined ? env.API_CORS_ENABLED === 'true' : DEFAULT_CONFIG.apiCorsEnabled,
      apiCorsOrigin: env.API_CORS_ORIGIN || process.env.API_CORS_ORIGIN || DEFAULT_CONFIG.apiCorsOrigin
    };
    
    // 更新缓存
    configCache = { ...config };
    lastReadTime = now;
    
    return config;
  } catch (error) {
    console.error('读取配置时出错:', error);
    // 如果出现错误，返回默认配置
    return DEFAULT_CONFIG;
  }
};

/**
 * 交互式配置设置
 */
async function configureSettings() {
  // 在测试环境中直接返回，不执行交互式配置
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  
  console.log(chalk.blue('🔧 SQL分析器配置设置'));
  
  const currentConfig = await readConfig();
  
  const questions = [
    {
      type: 'input',
      name: 'baseURL',
      message: '请输入API基础URL:',
      default: currentConfig.baseURL
    },
    {
      type: 'input',
      name: 'apiKey',
      message: '请输入API密钥:',
      default: currentConfig.apiKey,
      validate: (input) => input.trim() !== '' || 'API密钥不能为空'
    },
    {
      type: 'input',
      name: 'model',
      message: '请输入模型名称:',
      default: currentConfig.model
    },
    {
      type: 'input',
      name: 'embeddingModel',
      message: '请输入嵌入模型名称:',
      default: currentConfig.embeddingModel
    }
  ];
  
  const answers = await inquirer.prompt(questions);
  
  // 读取现有的.env文件
  const env = await readEnvFile();
  
  // 更新环境变量
  env.CUSTOM_API_KEY = answers.apiKey;
  env.CUSTOM_BASE_URL = answers.baseURL;
  env.CUSTOM_MODEL = answers.model;
  env.CUSTOM_EMBEDDING_MODEL = answers.embeddingModel;
  
  // 写入.env文件
  await writeEnvFile(env);
  
  console.log(chalk.green('✅ 配置已保存到: ' + ENV_FILE));
}

/**
 * 获取配置值
 * @param {string} [key] 配置键名，如果不提供则返回所有配置
 * @returns {Promise<any>} 配置值或配置对象
 */
async function getConfig(key) {
  const config = await readConfig();
  return key ? config[key] : config;
}

/**
 * 设置配置值
 * @param {string} key 配置键名
 * @param {any} value 配置值
 * @returns {Promise<boolean>} 是否设置成功
 */
async function setConfig(key, value) {
  if (!CONFIG_KEYS[key]) {
    console.error(`无效的配置键: ${key}`);
    return false;
  }
  
  try {
    const env = await readEnvFile();
    env[CONFIG_KEYS[key]] = value;
    await writeEnvFile(env);
    return true;
  } catch (error) {
    console.error(`设置配置${key}时出错:`, error);
    return false;
  }
}



/**
 * 显示所有配置项
 */
async function listConfig() {
  const config = await readConfig();
  
  console.log(chalk.blue('📋 当前配置:'));
  console.log('');
  
  // 显示配置项
  console.log(chalk.yellow('API配置:'));
  console.log(`  API基础URL: ${config.baseURL}`);
  console.log(`  API密钥: ${config.apiKey ? '已设置' : '未设置'}`);
  console.log(`  模型: ${config.model}`);
  console.log(`  嵌入模型: ${config.embeddingModel}`);
  console.log('');
  
  console.log(chalk.yellow('API服务器配置:'));
  console.log(`  端口: ${config.apiPort}`);
  console.log(`  主机: ${config.apiHost}`);
  console.log(`  CORS启用: ${config.apiCorsEnabled ? '是' : '否'}`);
  console.log(`  CORS源: ${config.apiCorsOrigin}`);
  console.log('');
  
  console.log(chalk.gray(`配置文件位置: ${ENV_FILE}`));
}

/**
 * 获取特定配置项
 * @param {string} key 配置键名
 */
async function getConfigValue(key) {
  const config = await readConfig();
  const validKeys = Object.keys(config);
  
  // 验证key是否有效
  if (!validKeys.includes(key)) {
    console.log(chalk.red(`❌ 无效的配置项: ${key}`));
    console.log(chalk.yellow('可用的配置项:'));
    console.log(validKeys.join(', '));
    return;
  }
  
  const value = config[key];
  
  // 对于敏感信息，只显示是否已设置
  if (key === 'apiKey') {
    console.log(`${key}: ${value ? '已设置' : '未设置'}`);
  } else {
    console.log(`${key}: ${value}`);
  }
}

/**
 * 设置配置项
 * @param {string} key 配置键名
 * @param {any} value 配置值
 */
async function setConfigValue(key, value) {
  const validKeys = Object.keys(CONFIG_KEYS);
  
  // 验证key是否有效
  if (!validKeys.includes(key)) {
    console.log(chalk.red(`❌ 无效的配置项: ${key}`));
    console.log(chalk.yellow('可用的配置项:'));
    console.log(validKeys.join(', '));
    return;
  }
  
  // 转换值类型并验证
  let processedValue = value;
  if (key === 'apiPort') {
    processedValue = parseInt(value, 10);
    if (isNaN(processedValue) || processedValue < 0 || processedValue > 65535) {
      console.log(chalk.red(`❌ 端口必须是0-65535之间的数字`));
      return;
    }
  } else if (key === 'apiCorsEnabled') {
    processedValue = value === 'true' || value === '1';
  }
  
  const success = await setConfig(key, processedValue);
  if (success) {
    console.log(chalk.green(`✅ 已设置 ${key} = ${processedValue}`));
  } else {
    console.log(chalk.red(`❌ 设置 ${key} 失败`));
  }
};

/**
 * 重置所有配置为默认值
 */
async function resetConfig() {
  // 确认操作
  if (process.env.NODE_ENV !== 'test') {
    const { confirm } = await inquirer.prompt([
      { 
        type: 'confirm',
        name: 'confirm',
        message: '确定要重置所有配置为默认值吗？此操作不可撤销。',
        default: false
      }
    ]);
    
    if (!confirm) {
      console.log(chalk.yellow('操作已取消'));
      return;
    }
  }
  
  try {
    // 读取现有的.env文件，获取当前已有的字段
    const currentEnv = await readEnvFile();
    const currentKeys = Object.keys(currentEnv);
    
    // 如果当前.env文件为空，则使用所有可能的键
    const keysToReset = currentKeys.length > 0 ? currentKeys : ENV_ORDER;
    
    // 尝试读取.env.example文件
    const envExamplePath = path.join(process.cwd(), '.env.example');
    let newEnv = {};
    
    try {
      // 尝试读取并解析.env.example文件
      const envExampleContent = await fs.readFile(envExamplePath, 'utf8');
      const exampleEnv = {};
      
      for (const line of envExampleContent.split('\n')) {
        // 跳过注释和空行
        if (line.trim() === '' || line.trim().startsWith('#')) {
          continue;
        }
        
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          exampleEnv[match[1]] = match[2];
        }
      }
      
      // 只保留需要重置的字段
      for (const key of keysToReset) {
        if (exampleEnv[key] !== undefined) {
          newEnv[key] = exampleEnv[key];
        }
      }
      
      // 使用writeEnvFile函数写入，确保代码复用
      await writeEnvFile(newEnv);
      console.log(chalk.green('✅ 所有配置已重置为.env.example中的默认值'));
    } catch (error) {
      // 如果.env.example不存在或读取失败，则使用硬编码的默认值
      const defaultEnv = {
        'CUSTOM_BASE_URL': 'https://api.openai.com/v1',
        'CUSTOM_API_KEY': 'your_api_key_here',
        'CUSTOM_MODEL': 'deepseek-ai/DeepSeek-V3.1',
        'CUSTOM_EMBEDDING_MODEL': 'BAAI/bge-m3',
        'API_PORT': '3000',
        'API_HOST': '0.0.0.0',
        'API_CORS_ENABLED': 'true',
        'API_CORS_ORIGIN': '*'
      };
      
      // 构建新的环境变量对象
      newEnv = {};
      for (const key of keysToReset) {
        if (defaultEnv[key] !== undefined) {
          newEnv[key] = defaultEnv[key];
        }
      }
      
      // 使用writeEnvFile函数写入
      await writeEnvFile(newEnv);
      console.log(chalk.green('✅ 所有配置已重置为默认值'));
      console.log(chalk.yellow('⚠️  .env.example文件不存在，使用了内置默认值'));
    }
  } catch (error) {
    console.error(chalk.red('重置配置时出错:'), error);
  }
};

export {
  readConfig,
  configureSettings,
  getConfig,
  setConfig,
  listConfig,
  getConfigValue,
  setConfigValue,
  resetConfig,
  clearConfigCache,
  ENV_FILE
};