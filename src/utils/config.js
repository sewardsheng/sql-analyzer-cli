const fs = require('fs').promises;
const path = require('path');
const os = require('os');
// 在 CommonJS 中使用 inquirer 的正确方式
const inquirer = require('inquirer').default || require('inquirer');
// 在 CommonJS 中使用 chalk 的正确方式
const chalk = require('chalk').default;

// 配置文件路径
const CONFIG_DIR = path.join(os.homedir(), '.sql-analyzer');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * 默认配置
 */
const DEFAULT_CONFIG = {
  apiKey: process.env.CUSTOM_API_KEY || '',
  baseURL: process.env.CUSTOM_BASE_URL || 'https://api.siliconflow.cn/v1',
  model: process.env.CUSTOM_MODEL || 'zai-org/GLM-4.6',
  defaultDatabaseType: process.env.DEFAULT_DATABASE_TYPE || 'mysql',
  embeddingModel: process.env.CUSTOM_EMBEDDING_MODEL || 'BAAI/bge-m3'
};

/**
 * 确保配置目录存在
 */
async function ensureConfigDir() {
  try {
    await fs.access(CONFIG_DIR);
  } catch (error) {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  }
}

/**
 * 读取配置文件
 */
async function readConfig() {
  try {
    await ensureConfigDir();
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    const config = JSON.parse(data);
    // 合并默认配置和用户配置
    return { ...DEFAULT_CONFIG, ...config };
  } catch (error) {
    // 如果配置文件不存在或解析失败，返回默认配置
    return DEFAULT_CONFIG;
  }
}

/**
 * 写入配置文件
 */
async function writeConfig(config) {
  await ensureConfigDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
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
      name: 'apiKey',
      message: '请输入OpenAI API密钥:',
      default: currentConfig.apiKey,
      validate: (input) => input.trim() !== '' || 'API密钥不能为空'
    },
    {
      type: 'input',
      name: 'baseURL',
      message: '请输入API基础URL:',
      default: currentConfig.baseURL
    },
    {
      type: 'input',
      name: 'model',
      message: '请输入模型名称:',
      default: currentConfig.model
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
  
  await writeConfig(answers);
  
  console.log(chalk.green('✅ 配置已保存到: ' + CONFIG_FILE));
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
  const config = await readConfig();
  config[key] = value;
  await writeConfig(config);
}

module.exports = {
  readConfig,
  writeConfig,
  configureSettings,
  getConfig,
  setConfig,
  CONFIG_FILE
};