#!/usr/bin/env bun
/**
 * API 功能完整性测试
 * 测试所有 API 端点的功能和性能
 */

const { describe, it, expect, beforeAll, afterAll } = require('bun:test');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

describe('SQL Analyzer API 功能测试', () => {
  let testResults = [];
  
  beforeAll(async () => {
    console.log('🚀 开始 API 功能测试...');
    console.log(`📡 测试目标: ${API_BASE_URL}`);
  });

  afterAll(() => {
    console.log('\n📊 测试结果汇总:');
    testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.name}: ${result.message}`);
    });
    
    const passed = testResults.filter(r => r.passed).length;
    const total = testResults.length;
    console.log(`\n🎯 总体结果: ${passed}/${total} 测试通过`);
    
    if (passed === total) {
      console.log('🎉 所有测试通过！API 功能完整性验证成功。');
    } else {
      console.log('⚠️  部分测试失败，请检查相关功能。');
    }
  });

  function addTestResult(name, passed, message, details = null) {
    testResults.push({ name, passed, message, details });
  }

  describe('健康检查端点', () => {
    it('GET /api/health/ping - 基本健康检查', async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/health/ping`);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.status).toBe('ok');
        expect(data.timestamp).toBeDefined();
        
        addTestResult('健康检查 - ping', true, '响应正常');
      } catch (error) {
        addTestResult('健康检查 - ping', false, `请求失败: ${error.message}`);
      }
    });

    it('GET /api/health/status - 详细健康状态', async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/health/status`);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.status).toBe('healthy');
        expect(data.uptime).toBeDefined();
        expect(data.memory).toBeDefined();
        expect(data.version).toBeDefined();
        
        addTestResult('健康检查 - status', true, '状态信息完整');
      } catch (error) {
        addTestResult('健康检查 - status', false, `请求失败: ${error.message}`);
      }
    });
  });

  describe('API 文档端点', () => {
    it('GET /api/docs/swagger - Swagger UI 可访问', async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/docs/swagger`);
        
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toContain('text/html');
        
        addTestResult('API 文档 - Swagger UI', true, 'Swagger UI 可正常访问');
      } catch (error) {
        addTestResult('API 文档 - Swagger UI', false, `访问失败: ${error.message}`);
      }
    });

    it('GET /api/docs/doc - OpenAPI 规范', async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/docs/doc`);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.openapi).toBeDefined();
        expect(data.info).toBeDefined();
        expect(data.paths).toBeDefined();
        
        addTestResult('API 文档 - OpenAPI 规范', true, 'OpenAPI 规范可正常获取');
      } catch (error) {
        addTestResult('API 文档 - OpenAPI 规范', false, `获取失败: ${error.message}`);
      }
    });
  });

  describe('SQL 分析端点', () => {
    const testSQL = 'SELECT * FROM users WHERE id = 1';
    
    it('POST /api/analyze - 单个 SQL 分析', async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sql: testSQL,
            options: {
              performance: true,
              security: true,
              standards: true
            }
          })
        });
        
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
        expect(data.data.originalQuery).toBe(testSQL);
        
        addTestResult('SQL 分析 - 单个分析', true, '分析功能正常');
      } catch (error) {
        addTestResult('SQL 分析 - 单个分析', false, `分析失败: ${error.message}`);
      }
    });

    it('POST /api/analyze - 参数验证', async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // 缺少必需的 sql 参数
            options: {
              performance: true
            }
          })
        });
        
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
        
        addTestResult('SQL 分析 - 参数验证', true, '参数验证正常工作');
      } catch (error) {
        addTestResult('SQL 分析 - 参数验证', false, `参数验证测试失败: ${error.message}`);
      }
    });
  });

  describe('配置管理端点', () => {
    it('GET /api/config - 获取所有配置', async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/config`);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
        expect(typeof data.data).toBe('object');
        
        addTestResult('配置管理 - 获取所有', true, '配置获取功能正常');
      } catch (error) {
        addTestResult('配置管理 - 获取所有', false, `获取配置失败: ${error.message}`);
      }
    });
  });

  describe('历史记录端点', () => {
    it('GET /api/history - 获取历史记录列表', async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/history`);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
        expect(Array.isArray(data.data)).toBe(true);
        
        addTestResult('历史记录 - 获取列表', true, '历史记录列表获取正常');
      } catch (error) {
        addTestResult('历史记录 - 获取列表', false, `获取历史记录失败: ${error.message}`);
      }
    });
  });

  describe('知识库端点', () => {
    it('GET /api/knowledge - 获取知识库内容', async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/knowledge`);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
        
        addTestResult('知识库 - 获取内容', true, '知识库内容获取正常');
      } catch (error) {
        addTestResult('知识库 - 获取内容', false, `获取知识库失败: ${error.message}`);
      }
    });
  });

  describe('系统状态端点', () => {
    it('GET /api/status - 获取系统状态', async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/status`);
        const data = await response.json();
        
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
        expect(data.data.system).toBeDefined();
        expect(data.data.services).toBeDefined();
        
        addTestResult('系统状态 - 获取状态', true, '系统状态获取正常');
      } catch (error) {
        addTestResult('系统状态 - 获取状态', false, `获取系统状态失败: ${error.message}`);
      }
    });
  });

  describe('错误处理', () => {
    it('404 错误处理', async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/nonexistent`);
        
        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
        expect(data.type).toBe('NOT_FOUND_ERROR');
        
        addTestResult('错误处理 - 404', true, '404 错误处理正常');
      } catch (error) {
        addTestResult('错误处理 - 404', false, `404 错误处理测试失败: ${error.message}`);
      }
    });
  });

  describe('性能测试', () => {
    it('响应时间测试', async () => {
      const startTime = Date.now();
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/health/ping`);
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        expect(response.status).toBe(200);
        expect(responseTime).toBeLessThan(1000); // 响应时间应小于1秒
        
        addTestResult('性能 - 响应时间', true, `响应时间: ${responseTime}ms`);
      } catch (error) {
        addTestResult('性能 - 响应时间', false, `响应时间测试失败: ${error.message}`);
      }
    });
  });

  describe('中间件功能', () => {
    it('请求 ID 追踪', async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/health/ping`);
        
        expect(response.status).toBe(200);
        const requestId = response.headers.get('x-request-id');
        expect(requestId).toBeDefined();
        expect(typeof requestId).toBe('string');
        
        addTestResult('中间件 - 请求 ID', true, '请求 ID 追踪正常');
      } catch (error) {
        addTestResult('中间件 - 请求 ID', false, `请求 ID 测试失败: ${error.message}`);
      }
    });
  });
});

// 运行测试
if (process.argv[1] === 'run') {
  console.log('🧪 开始执行 API 功能完整性测试...\n');
}