import fs from 'fs/promises';
import path from 'path';

// 在测试环境中不导入 inquirer
let inquirer;
if (process.env.NODE_ENV !== 'test') {
  // 在 ES 模块中使用 inquirer 的正确方式
  inquirer = await import('inquirer');
  inquirer = inquirer.default || inquirer;
}

// 在测试环境中不导入 chalk
let chalk;
if (process.env.NODE_ENV !== 'test') {
  // 在 ES 模块中使用 chalk 的正确方式
  chalk = await import('chalk');
  chalk = chalk.default || chalk;
}

// .env文件路径
const ENV_FILE = path.join(process.cwd(), '.env');

/**
 * 默认配置
 */
const DEFAULT_CONFIG = {
  baseURL: 'https://api.siliconflow.cn/v1',
  apiKey: '',
  model: 'zai-org/GLM-4.6',
  defaultDatabaseType: 'mysql',
  embeddingModel: 'BAAI/bge-m3',
  // API服务器配置
  apiPort: 3000,
  apiHost: '0.0.0.0',
  apiCorsEnabled: true,
  apiCorsOrigin: '*'
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
    'DEFAULT_DATABASE_TYPE',
    'API_PORT',
    'API_HOST',
    'API_CORS_ENABLED',
    'API_CORS_ORIGIN'
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
        case 'API_PORT':
          content += '# API服务器端口\n';
          break;
        case 'API_HOST':
          content += '# API服务器主机\n';
          break;
        case 'API_CORS_ENABLED':
          content += '# 是否启用CORS\n';
          break;
        case 'API_CORS_ORIGIN':
          content += '# CORS允许的源\n';
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
      defaultDatabaseType: env.DEFAULT_DATABASE_TYPE || process.env.DEFAULT_DATABASE_TYPE || DEFAULT_CONFIG.defaultDatabaseType,
      // API服务器配置
      apiPort: env.API_PORT || process.env.API_PORT || DEFAULT_CONFIG.apiPort,
      apiHost: env.API_HOST || process.env.API_HOST || DEFAULT_CONFIG.apiHost,
      apiCorsEnabled: env.API_CORS_ENABLED !== undefined ? env.API_CORS_ENABLED === 'true' : DEFAULT_CONFIG.apiCorsEnabled,
      apiCorsOrigin: env.API_CORS_ORIGIN || process.env.API_CORS_ORIGIN || DEFAULT_CONFIG.apiCorsOrigin
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
  
  if (chalk) {
    console.log(chalk.green('✅ 配置已保存到: ' + ENV_FILE));
  } else {
    console.log('✅ 配置已保存到: ' + ENV_FILE);
  }
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
    'embeddingModel': 'CUSTOM_EMBEDDING_MODEL',
    // API服务器配置
    'apiPort': 'API_PORT',
    'apiHost': 'API_HOST',
    'apiCorsEnabled': 'API_CORS_ENABLED',
    'apiCorsOrigin': 'API_CORS_ORIGIN'
  };
  
  const envKey = envKeyMap[key];
  if (envKey) {
    env[envKey] = value;
    await writeEnvFile(env);
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
  
  console.log(chalk.yellow('数据库配置:'));
  console.log(`  默认数据库类型: ${config.defaultDatabaseType}`);
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
 */
async function getConfigValue(key) {
  const config = await readConfig();
  
  // 验证key是否有效
  if (!config.hasOwnProperty(key)) {
    console.log(chalk.red(`❌ 无效的配置项: ${key}`));
    console.log(chalk.yellow('可用的配置项:'));
    console.log(Object.keys(config).join(', '));
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
 */
async function setConfigValue(key, value) {
  // 验证key是否有效
  const validKeys = [
    'apiKey', 'baseURL', 'model', 'defaultDatabaseType', 
    'embeddingModel', 'apiPort', 'apiHost', 'apiCorsEnabled', 'apiCorsOrigin'
  ];
  
  if (!validKeys.includes(key)) {
    console.log(chalk.red(`❌ 无效的配置项: ${key}`));
    console.log(chalk.yellow('可用的配置项:'));
    console.log(validKeys.join(', '));
    return;
  }
  
  // 转换值类型
  let processedValue = value;
  if (key === 'apiPort') {
    processedValue = parseInt(value, 10);
    if (isNaN(processedValue)) {
      console.log(chalk.red(`❌ 端口必须是数字`));
      return;
    }
  } else if (key === 'apiCorsEnabled') {
    processedValue = value === 'true' || value === '1';
  }
  
  await setConfig(key, processedValue);
  console.log(chalk.green(`✅ 已设置 ${key} = ${processedValue}`));
}

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
    const keysToReset = currentKeys.length > 0 ? currentKeys : [
      'CUSTOM_BASE_URL',
      'CUSTOM_API_KEY',
      'CUSTOM_MODEL',
      'CUSTOM_EMBEDDING_MODEL',
      'DEFAULT_DATABASE_TYPE',
      'API_PORT',
      'API_HOST',
      'API_CORS_ENABLED',
      'API_CORS_ORIGIN'
    ];
    
    // 尝试读取.env.example文件
    const envExamplePath = path.join(process.cwd(), '.env.example');
    const envExampleContent = await fs.readFile(envExamplePath, 'utf8');
    
    // 解析.env.example文件内容
    const exampleEnv = {};
    envExampleContent.split('\n').forEach(line => {
      // 跳过注释和空行
      if (line.trim() === '' || line.trim().startsWith('#')) {
        return;
      }
      
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        exampleEnv[match[1]] = match[2];
      }
    });
    
    // 只保留当前.env文件中已有的字段，但使用.env.example中的默认值
    const newEnv = {};
    keysToReset.forEach(key => {
      if (exampleEnv[key] !== undefined) {
        newEnv[key] = exampleEnv[key];
      }
    });
    
    // 直接写入.env文件，不使用writeEnvFile函数，因为它会跳过空值
    let content = '';
    
    // 按照特定顺序写入环境变量
    const envOrder = [
      'CUSTOM_BASE_URL',
      'CUSTOM_API_KEY',
      'CUSTOM_MODEL',
      'CUSTOM_EMBEDDING_MODEL',
      'DEFAULT_DATABASE_TYPE',
      'API_PORT',
      'API_HOST',
      'API_CORS_ENABLED',
      'API_CORS_ORIGIN'
    ];
    
    envOrder.forEach(key => {
      if (newEnv.hasOwnProperty(key)) {
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
          case 'API_PORT':
            content += '# API服务器端口\n';
            break;
          case 'API_HOST':
            content += '# API服务器主机\n';
            break;
          case 'API_CORS_ENABLED':
            content += '# 是否启用CORS\n';
            break;
          case 'API_CORS_ORIGIN':
            content += '# CORS允许的源\n';
            break;
        }
        content += `${key}=${newEnv[key]}\n\n`;
      }
    });
    
    await fs.writeFile(ENV_FILE, content);
    
    console.log(chalk.green('✅ 所有配置已重置为.env.example中的默认值'));
  } catch (error) {
    // 如果.env.example不存在，则使用硬编码的默认值
    const defaultEnv = {
      'CUSTOM_BASE_URL': 'https://api.openai.com/v1',
      'CUSTOM_API_KEY': 'your_api_key_here',
      'CUSTOM_MODEL': 'deepseek-ai/DeepSeek-V3.1',
      'CUSTOM_EMBEDDING_MODEL': 'BAAI/bge-m3',
      'DEFAULT_DATABASE_TYPE': 'mysql',
      'API_PORT': '3000',
      'API_HOST': '0.0.0.0',
      'API_CORS_ENABLED': 'true',
      'API_CORS_ORIGIN': '*'
    };
    
    // 读取现有的.env文件，获取当前已有的字段
    const currentEnv = await readEnvFile();
    const currentKeys = Object.keys(currentEnv);
    
    // 如果当前.env文件为空，则使用所有可能的键
    const keysToReset = currentKeys.length > 0 ? currentKeys : Object.keys(defaultEnv);
    
    const newEnv = {};
    keysToReset.forEach(key => {
      if (defaultEnv[key] !== undefined) {
        newEnv[key] = defaultEnv[key];
      }
    });
    
    // 直接写入.env文件，不使用writeEnvFile函数
    let content = '';
    
    // 按照特定顺序写入环境变量
    const envOrder = [
      'CUSTOM_BASE_URL',
      'CUSTOM_API_KEY',
      'CUSTOM_MODEL',
      'CUSTOM_EMBEDDING_MODEL',
      'DEFAULT_DATABASE_TYPE',
      'API_PORT',
      'API_HOST',
      'API_CORS_ENABLED',
      'API_CORS_ORIGIN'
    ];
    
    envOrder.forEach(key => {
      if (newEnv.hasOwnProperty(key)) {
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
          case 'API_PORT':
            content += '# API服务器端口\n';
            break;
          case 'API_HOST':
            content += '# API服务器主机\n';
            break;
          case 'API_CORS_ENABLED':
            content += '# 是否启用CORS\n';
            break;
          case 'API_CORS_ORIGIN':
            content += '# CORS允许的源\n';
            break;
        }
        content += `${key}=${newEnv[key]}\n\n`;
      }
    });
    
    await fs.writeFile(ENV_FILE, content);
    
    console.log(chalk.green('✅ 所有配置已重置为默认值'));
    console.log(chalk.yellow('⚠️  .env.example文件不存在，使用了内置默认值'));
  }
}

export {
  readConfig,
  configureSettings,
  getConfig,
  setConfig,
  listConfig,
  getConfigValue,
  setConfigValue,
  resetConfig,
  ENV_FILE
};