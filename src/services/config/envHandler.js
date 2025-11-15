import fs from 'fs/promises';
import { CONFIG_DESCRIPTIONS, ENV_ORDER, ENV_FILE } from './constants.js';

/**
 * 读取.env文件内容
 * @returns {Promise<Object>} 环境变量对象
 */
export async function readEnvFile() {
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
 * 写入.env文件
 * @param {Object} env 环境变量对象
 */
export async function writeEnvFile(env) {
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
  
  // 写入文件
  await fs.writeFile(ENV_FILE, content);
}