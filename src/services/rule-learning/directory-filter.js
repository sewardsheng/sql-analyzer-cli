/**
 * 规则目录过滤器
 * 控制哪些目录的规则可以被加载到知识库中
 */

import path from 'path';
import fs from 'fs/promises';

/**
 * 可加载到知识库的目录白名单
 * 只有这些目录的规则会被向量化
 */
const ALLOWED_DIRECTORIES = [
  'approved',        // 已批准的规则 - 高质量，可用于学习
  'performance',     // 性能规则 - 技术性强，有价值
  'security',        // 安全规则 - 重要，需要学习
  'standards'        // 规范规则 - 基础但重要
];

/**
 * 需要排除的目录黑名单
 * 这些目录的规则不会被加载
 */
const EXCLUDED_DIRECTORIES = [
  'issues',          // 有问题的规则 - 质量低，不学习
  'manual_review',   // 待审核规则 - 状态不确定，不学习
  'rejected',        // 被拒绝的规则 - 明确不采用
  'raw-data',        // 原始数据 - 非结构化规则
  'temp',            // 临时文件 - 不稳定
  'backup'           // 备份文件 - 可能过时
];

/**
 * 过滤目录路径
 * @param {string} dirPath - 目录路径
 * @param {string} baseDir - 基础目录
 * @returns {boolean} 是否应该包含该目录
 */
export function shouldIncludeDirectory(dirPath, baseDir) {
  try {
    // 获取相对路径
    const relativePath = path.relative(baseDir, dirPath);
    const pathParts = relativePath.split(path.sep);
    
    // 检查是否在learning-rules目录下
    if (!pathParts.includes('learning-rules')) {
      return true; // 非learning-rules目录，正常处理
    }
    
    // 获取learning-rules下的子目录名
    const learningRulesIndex = pathParts.indexOf('learning-rules');
    const subDirName = pathParts[learningRulesIndex + 1];
    
    if (!subDirName) {
      return true; // learning-rules目录本身，包含
    }
    
    // 检查是否在黑名单中
    if (EXCLUDED_DIRECTORIES.includes(subDirName)) {
      console.log(`[DirectoryFilter] 排除目录: ${subDirName} (在黑名单中)`);
      return false;
    }
    
    // 检查是否在白名单中
    if (ALLOWED_DIRECTORIES.includes(subDirName)) {
      console.log(`[DirectoryFilter] 包含目录: ${subDirName} (在白名单中)`);
      return true;
    }
    
    // 既不在白名单也不在黑名单的目录，默认排除
    console.log(`[DirectoryFilter] 排除未知目录: ${subDirName} (不在白名单中)`);
    return false;
    
  } catch (error) {
    console.warn(`[DirectoryFilter] 目录过滤出错: ${error.message}`);
    return false; // 出错时默认排除
  }
}

/**
 * 获取指定基础目录下的有效规则目录
 * @param {string} baseDir - 基础目录路径
 * @returns {Promise<string[]>} 有效目录路径数组
 */
export async function getValidRuleDirectories(baseDir) {
  const validDirs = [];
  
  try {
    const learningRulesDir = path.join(baseDir, 'learning-rules');
    
    // 检查learning-rules目录是否存在
    try {
      await fs.access(learningRulesDir);
    } catch {
      return validDirs; // 目录不存在，返回空数组
    }
    
    // 读取learning-rules目录下的子目录
    const items = await fs.readdir(learningRulesDir);
    
    for (const item of items) {
      const itemPath = path.join(learningRulesDir, item);
      const stat = await fs.stat(itemPath);
      
      if (stat.isDirectory() && shouldIncludeDirectory(itemPath, baseDir)) {
        validDirs.push(itemPath);
      }
    }
    
  } catch (error) {
    console.error(`[DirectoryFilter] 获取有效规则目录失败: ${error.message}`);
  }
  
  return validDirs;
}

/**
 * 过滤文件路径列表
 * @param {string[]} filePaths - 文件路径数组
 * @param {string} baseDir - 基础目录
 * @returns {string[]} 过滤后的文件路径数组
 */
export function filterFilePaths(filePaths, baseDir) {
  return filePaths.filter(filePath => {
    const dirPath = path.dirname(filePath);
    return shouldIncludeDirectory(dirPath, baseDir);
  });
}

/**
 * 创建目录过滤器函数
 * @param {string} baseDir - 基础目录
 * @returns {Function} 过滤器函数
 */
export function createDirectoryFilter(baseDir) {
  return (filePath) => {
    const dirPath = path.dirname(filePath);
    return shouldIncludeDirectory(dirPath, baseDir);
  };
}

/**
 * 获取目录过滤统计信息
 * @param {string} baseDir - 基础目录
 * @returns {Promise<Object>} 统计信息
 */
export async function getDirectoryFilterStats(baseDir) {
  const stats = {
    totalDirectories: 0,
    includedDirectories: 0,
    excludedDirectories: 0,
    includedTypes: [],
    excludedTypes: []
  };
  
  try {
    const learningRulesDir = path.join(baseDir, 'learning-rules');
    
    try {
      await fs.access(learningRulesDir);
    } catch {
      return stats;
    }
    
    const items = await fs.readdir(learningRulesDir);
    stats.totalDirectories = items.length;
    
    for (const item of items) {
      const itemPath = path.join(learningRulesDir, item);
      const stat = await fs.stat(itemPath);
      
      if (stat.isDirectory()) {
        if (shouldIncludeDirectory(itemPath, baseDir)) {
          stats.includedDirectories++;
          stats.includedTypes.push(item);
        } else {
          stats.excludedDirectories++;
          stats.excludedTypes.push(item);
        }
      }
    }
    
  } catch (error) {
    console.error(`[DirectoryFilter] 获取统计信息失败: ${error.message}`);
  }
  
  return stats;
}