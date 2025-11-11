const fs = require('fs').promises;
const path = require('path');
// 在 CommonJS 中使用 inquirer 的正确方式
const inquirer = require('inquirer').default || require('inquirer');
// 在 CommonJS 中使用 chalk 的正确方式
const chalk = require('chalk').default;

// .env文件路径
const ENV_FILE = path.join(process.cwd(), '.env');

/**
 * 默认配置
 */
const DEFAULT_CONFIG = {
  baseURL: process.env.CUSTOM_BASE_URL || 'https://api.siliconflow.cn/v1',
  apiKey: process.env.CUSTOM_API_KEY || '',
  model: process.env.CUSTOM_MODEL || 'zai-org/GLM-4.6',
  defaultDatabaseType: process.env.DEFAULT_DATABASE_TYPE || 'mysql',
  embeddingModel: process.env.CUSTOM_EMBEDDING_MODEL || 'BAAI/bge-m3'
};

/**
 * 读取.env文件内容
 */
async function readEnvFile() {
  try {
    const data = await fs.readFile(ENV_FILE, 'utf8');
    const env = {};
    
    // 解析.env文件内容
    data.split('\n').forEach(line => {
      // 跳过注释和空行
      if (line.trim() === '' || line.trim().startsWith('#')) {
        return;
      }
      
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        env[match[1]] = match[2];
      }
    });
    
    return env;
  } catch (error) {
    // 如果.env文件不存在，返回空对象
    return {};
  }
}

/**
 * 写入.env文件
 */
async function writeEnvFile(env) {
  let content = '';
  
  // 按照特定顺序写入环境变量
  const envOrder = [
    'CUSTOM_BASE_URL',
    'CUSTOM_API_KEY',
    'CUSTOM_MODEL',
    'CUSTOM_EMBEDDING_MODEL',
    'DEFAULT_DATABASE_TYPE'
  ];
  
  envOrder.forEach(key => {
    if (env[key]) {
      // 添加注释
      switch (key) {
        case 'CUSTOM_API_KEY':
          content += '# API密钥\n';
          break;
        case 'CUSTOM_BASE_URL':
          content += '# 自定义API基础URL\n';
          break;
        case 'CUSTOM_MODEL':
          content += '# 模型名称\n';
          break;
        case 'CUSTOM_EMBEDDING_MODEL':
          content += '# 嵌入模型名称\n';
          break;
        case 'DEFAULT_DATABASE_TYPE':
          content += '# 默认数据库类型\n';
          break;
      }
      content += `${key}=${env[key]}\n\n`;
    }
  });
  
  await fs.writeFile(ENV_FILE, content);
}

/**
 * 读取配置
 */
async function readConfig() {
  try {
    const env = await readEnvFile();
    
    // 从环境变量中读取配置，优先使用.env文件中的值
    const config = {
      baseURL: env.CUSTOM_BASE_URL || process.env.CUSTOM_BASE_URL || DEFAULT_CONFIG.baseURL,
      apiKey: env.CUSTOM_API_KEY || process.env.CUSTOM_API_KEY || DEFAULT_CONFIG.apiKey,
      model: env.CUSTOM_MODEL || process.env.CUSTOM_MODEL || DEFAULT_CONFIG.model,
      embeddingModel: env.CUSTOM_EMBEDDING_MODEL || process.env.CUSTOM_EMBEDDING_MODEL || DEFAULT_CONFIG.embeddingModel,
      defaultDatabaseType: env.DEFAULT_DATABASE_TYPE || process.env.DEFAULT_DATABASE_TYPE || DEFAULT_CONFIG.defaultDatabaseType
    };
    
    return config;
  } catch (error) {
    // 如果出现错误，返回默认配置
    return DEFAULT_CONFIG;
  }
}

/**
 * 交互式配置设置
 */
async function configureSettings() {
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
    },
    {
      type: 'list',
      name: 'defaultDatabaseType',
      message: '选择默认数据库类型:',
      choices: ['mysql', 'postgresql', 'oracle', 'sqlserver'],
      default: currentConfig.defaultDatabaseType
    }
  ];
  
  const answers = await inquirer.prompt(questions);
  
  // 读取现有的.env文件
  const env = await readEnvFile();
  
  // 更新环境变量
  env.CUSTOM_API_KEY = answers.apiKey;
  env.CUSTOM_BASE_URL = answers.baseURL;
  env.CUSTOM_MODEL = answers.model;
  env.DEFAULT_DATABASE_TYPE = answers.defaultDatabaseType;
  env.CUSTOM_EMBEDDING_MODEL = answers.embeddingModel;
  
  // 写入.env文件
  await writeEnvFile(env);
  
  console.log(chalk.green('✅ 配置已保存到: ' + ENV_FILE));
}

/**
 * 获取配置值
 */
async function getConfig(key) {
  const config = await readConfig();
  return key ? config[key] : config;
}

/**
 * 设置配置值
 */
async function setConfig(key, value) {
  const env = await readEnvFile();
  
  // 根据key映射到对应的环境变量
  const envKeyMap = {
    'apiKey': 'CUSTOM_API_KEY',
    'baseURL': 'CUSTOM_BASE_URL',
    'model': 'CUSTOM_MODEL',
    'defaultDatabaseType': 'DEFAULT_DATABASE_TYPE',
    'embeddingModel': 'CUSTOM_EMBEDDING_MODEL'
  };
  
  const envKey = envKeyMap[key];
  if (envKey) {
    env[envKey] = value;
    await writeEnvFile(env);
  }
}

module.exports = {
  readConfig,
  configureSettings,
  getConfig,
  setConfig,
  ENV_FILE
};