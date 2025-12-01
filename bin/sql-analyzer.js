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

// 使用tsk执行TypeScript CLI
const child = spawn('npx', ['tsx', cliPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
  cwd: projectRoot
});

child.on('error', (error) => {
  console.error('❌ 启动失败:', error.message);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code);
});