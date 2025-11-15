import { CONFIG_KEYS, DEFAULT_CONFIG, ENV_FILE } from '../constants.js';
import { getConfig, setConfig } from '../configService.js';
import fs from 'fs/promises';

/**
 * 列出当前配置
 */
export async function listConfig() {
  try {
    // 读取配置
    const config = await getConfig();
    
    // 创建输出缓冲区，而不是直接输出
    let output = [];
    output.push('当前配置:');
    output.push('-'.repeat(50));
    
    // 只使用默认配置中定义的键，确保正确顺序
    const orderedKeys = Object.keys(DEFAULT_CONFIG);
    for (const key of orderedKeys) {
      // 确保key存在于配置中
      if (config.hasOwnProperty(key)) {
        const value = config[key];
        
        // 安全处理值显示
        const displayValue = value === null || value === undefined ? '' : 
                            (typeof value === 'number' && isNaN(value) ? '' : value);
        output.push(`${key.padEnd(20)}: ${displayValue}`);
      }
    }
    
    output.push('-'.repeat(50));
    
    // 一次性输出所有内容
    console.log(output.join('\n'));
  } catch (error) {
    console.error('列出配置时出错:', error.message);
  }
}

/**
 * 获取配置项
 * @param {string} key 配置键名
 */
export async function configGet(key) {
  try {
    // 检查键名是否有效
    if (!CONFIG_KEYS[key]) {
      console.error(`无效的配置键: ${key}`);
      console.log('可用的配置键:');
      console.log(Object.keys(CONFIG_KEYS).join(', '));
      return;
    }

    // 获取配置值
    const value = await getConfig(key);
    
    // 安全处理值显示
    const displayValue = value === null || value === undefined ? '' : 
                        (typeof value === 'number' && isNaN(value) ? '' : value);
    console.log(`${key}: ${displayValue}`);
  } catch (error) {
    console.error('获取配置时出错:', error.message);
  }
}

/**
 * 设置配置项
 * @param {string} key 配置键名
 * @param {string} value 配置值
 */
export async function configSet(key, value) {
  try {
    const result = await setConfig(key, value);
    if (result) {
      console.log(`配置项 ${key} 已成功设置为 ${value}`);
    } else {
      console.error(`设置配置项 ${key} 失败`);
      console.log('可用的配置键:');
      console.log(Object.keys(CONFIG_KEYS).join(', '));
    }
  } catch (error) {
    console.error('设置配置时出错:', error.message);
  }
}

/**
 * 重置配置
 */
export async function resetConfig() {
  try {
    // 使用默认配置重新写入配置文件
    const defaultConfigEntries = Object.entries(DEFAULT_CONFIG).map(([key, value]) => {
      const envKey = CONFIG_KEYS[key] || `API_${key.toUpperCase()}`;
      return `${envKey}=${value}`;
    });
    
    await fs.writeFile(ENV_FILE, defaultConfigEntries.join('\n'));
    console.log('配置已重置为默认值!');
    
    // 显示重置后的配置
    console.log('\n重置后的配置:');
    await listConfig();
  } catch (error) {
    console.error('重置配置时出错:', error.message);
  }
}