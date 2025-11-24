#!/usr/bin/env bun

/**
 * 简化的SQL Analyzer API服务器
 * 用于测试基本功能
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const app = new Hono();

// 基础中间件
app.use('*', cors());
app.use('*', logger());

// 基础路由
app.get('/', (c) => {
  return c.json({
    name: 'SQL Analyzer API',
    version: '1.0.0',
    status: 'running'
  });
});

app.get('/api/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'sql-analyzer-api',
    version: '1.0.0'
  });
});

// 启动服务器
const port = 3002; // 使用固定端口避免冲突
const host = '0.0.0.0';

console.log(`🚀 服务器启动中...`);
console.log(`📍 地址: http://${host}:${port}`);

const server = Bun.serve({
  port,
  hostname: host,
  fetch: app.fetch
});

console.log('✅ 服务器已启动');