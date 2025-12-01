/**
 * 环境变量文件更新工具
 * 统一处理.env文件的读写操作，避免代码重复
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * 更新.env文件中的配置项
 * @param key 环境变量键名
 * @param value 环境变量值
 */
export function updateEnvFile(key: string, value: string): void {
  try {
    const envPath = resolve('.env');
    let envContent = '';

    // 读取现有的.env文件
    if (existsSync(envPath)) {
      envContent = readFileSync(envPath, 'utf-8');
    } else {
      // 如果.env文件不存在，从.env.example复制
      const examplePath = resolve('.env.example');
      if (existsSync(examplePath)) {
        envContent = readFileSync(examplePath, 'utf-8');
      }
    }

    // 按行分割内容
    const lines = envContent.split('\n');
    let keyFound = false;

    // 更新或添加配置项
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith(`${key}=`)) {
        lines[i] = `${key}=${value}`;
        keyFound = true;
        break;
      }
    }

    // 如果没有找到key，添加到文件末尾
    if (!keyFound) {
      lines.push(`${key}=${value}`);
    }

    // 写回文件
    writeFileSync(envPath, lines.join('\n'), 'utf-8');

  } catch (error: any) {
    throw new Error(`更新.env文件失败: ${error.message}`);
  }
}