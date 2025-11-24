/**
 * 文件读取工具
 * 提供统一的文件读取功能
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * 从文件读取SQL语句
 * @param {string} filePath - 文件路径
 * @returns {Promise<string>} 文件内容
 */
export async function readSqlFromFile(filePath) {
  try {
    const absolutePath = path.resolve(filePath);
    const content = await fs.readFile(absolutePath, 'utf8');
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      throw new Error(`文件 ${filePath} 为空或只包含空白字符`);
    }

    return trimmedContent;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`文件不存在: ${filePath}`);
    } else if (error.code === 'EACCES') {
      throw new Error(`没有权限读取文件: ${filePath}`);
    } else {
      throw new Error(`无法读取文件 ${filePath}: ${error.message}`);
    }
  }
}

/**
 * 验证文件路径和内容
 * @param {string} filePath - 文件路径
 * @returns {Promise<boolean>} 是否有效
 */
export async function validateSqlFile(filePath) {
  try {
    const content = await readSqlFromFile(filePath);
    return content.length > 0;
  } catch {
    return false;
  }
}