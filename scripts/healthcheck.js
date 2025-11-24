#!/usr/bin/env bun
/**
 * Docker健康检查脚本
 * 检查API服务是否正常运行
 */

const url = process.env.HEALTH_CHECK_URL || 'http://localhost:3000/api/health/ping';

async function healthCheck() {
  try {
    const response = await fetch(url, {
      method: 'GET',
      timeout: 5000,
      headers: {
        'User-Agent': 'Docker-Health-Check/1.0'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.status === 'ok') {
        console.log('Health check passed');
        process.exit(0);
      }
    }
    
    console.log('Health check failed: invalid response');
    process.exit(1);
  } catch (error) {
    console.log('Health check failed:', error.message);
    process.exit(1);
  }
}

healthCheck();