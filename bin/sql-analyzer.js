#!/usr/bin/env node

/**
 * SQL Analyzer 全局可执行命令
 * 老王我把这玩意儿做成真正的全局命令！
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 获取项目根目录
const projectRoot = join(__dirname, '..');
const cliPath = join(projectRoot, 'src', 'cli', 'index.ts');

/**
 * 获取tsx的完整路径
 */
function getTsxPath() {
  const nodeModulesBin = join(projectRoot, 'node_modules', '.bin');

  if (process.platform === 'win32') {
    // Windows下，使用node执行tsx.js文件
    return join(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  } else {
    // Unix下直接使用tsx可执行文件
    return join(nodeModulesBin, 'tsx');
  }
}

/**
 * 安全执行tsx
 */
function safeSpawnTsx(args, options) {
  const tsxPath = getTsxPath();

  if (process.platform === 'win32') {
    // Windows: 使用node执行tsx.mjs
    return spawn('node', [tsxPath, ...args], {
      ...options,
      shell: false,  // 明确禁用shell，避免安全风险
      windowsHide: true
    });
  } else {
    // Unix: 直接执行tsx
    return spawn(tsxPath, args, {
      ...options,
      shell: false  // 明确禁用shell，避免安全风险
    });
  }
}

// 使用安全的tsx执行TypeScript CLI
const child = safeSpawnTsx([cliPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: projectRoot
});

child.on('error', (error) => {
  console.error('❌ 启动失败:', error.message);
  console.error('请确保已安装tsx: npm install tsx');
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code);
});