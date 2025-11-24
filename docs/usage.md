# SQL Analyzer API 使用手册

## 概述

本手册详细介绍如何使用 SQL Analyzer API 进行 SQL 语句的智能分析。SQL Analyzer API 提供了完整的 RESTful API 接口，支持单个和批量 SQL 分析、历史记录管理、知识库查询等功能。

## 快速开始

### 1. 启动服务

确保 SQL Analyzer API 服务已启动并运行：

```bash
# 检查服务状态
curl http://localhost:3000/api/health/ping

# 预期响应
{
  "success": true,
  "message": "服务可用性检查",
  "data": {
    "message": "pong",
    "uptime": 3600
  }
}
```

### 2. 基本使用

```bash
# 分析单个 SQL 语句
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT * FROM users WHERE id = 1",
    "options": {
      "performance": true,
      "security": true,
      "standards": true
    }
  }'
```

## API 使用示例

### 1. SQL 分析

#### 单个 SQL 分析

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT * FROM users WHERE id = 1",
    "options": {
      "performance": true,
      "security": true,
      "standards": true,
      "learn": false
    }
  }'
```

**响应示例**:
```json
{
  "success": true,
  "message": "SQL分析完成",
  "data": {
    "originalQuery": "SELECT * FROM users WHERE id = 1",
    "normalizedQuery": "SELECT * FROM users WHERE id = 1",
    "databaseType": "mysql",
    "analysisResults": {
      "performance": {
        "score": 85,
        "issues": [],
        "suggestions": [
          {
            "type": "索引建议",
            "description": "建议在 id 字段上创建索引",
            "example": "CREATE INDEX idx_users_id ON users(id)"
          }
        ]
      },
      "security": {
        "score": 90,
        "issues": [],
        "suggestions": [
          {
            "type": "良好实践",
            "description": "使用了参数化查询，避免 SQL 注入风险"
          }
        ]
      },
      "standards": {
        "score": 80,
        "issues": [],
        "suggestions": [
          {
            "type": "命名规范",
            "description": "表名和字段名使用小写，符合命名规范"
          }
        ]
      }
    },
    "overallScore": 85,
    "report": "SQL 语句质量良好，建议在 id 字段上创建索引以提高查询性能。"
  },
  "timestamp": "2025-11-24T12:00:00.000Z",
  "responseTime": "1500ms"
}
```

#### 批量 SQL 分析

```bash
curl -X POST http://localhost:3000/api/analyze/batch \
  -H "Content-Type: application/json" \
  -d '{
    "sqls": [
      {"sql": "SELECT * FROM users"},
      {"sql": "SELECT * FROM orders WHERE status = '\''active'\''"}
    ],
    "options": {
      "performance": true,
      "security": true,
      "standards": true
    }
  }'
```

**响应示例**:
```json
{
  "success": true,
  "message": "批量SQL分析完成",
  "data": {
    "results": [
      {
        "index": 0,
        "sql": "SELECT * FROM users",
        "success": true,
        "overallScore": 75,
        "analysisResults": {...}
      },
      {
        "index": 1,
        "sql": "SELECT * FROM orders WHERE status = 'active'",
        "success": true,
        "overallScore": 80,
        "analysisResults": {...}
      }
    ],
    "summary": {
      "total": 2,
      "succeeded": 2,
      "failed": 0,
      "averageScore": 77.5
    }
  },
  "timestamp": "2025-11-24T12:00:00.000Z",
  "responseTime": "2500ms"
}
```

### 2. 历史记录管理

#### 获取历史记录列表

```bash
# 获取所有历史记录
curl http://localhost:3000/api/history

# 带分页参数
curl "http://localhost:3000/api/history?limit=10&offset=0"
```

#### 获取历史记录详情

```bash
# 获取特定ID的历史记录
curl http://localhost:3000/api/history/123
```

#### 获取历史记录统计

```bash
# 获取统计信息
curl http://localhost:3000/api/history/stats
```

### 3. 知识库查询

#### 获取知识库内容

```bash
# 获取所有知识库内容
curl http://localhost:3000/api/knowledge

# 按类别过滤
curl "http://localhost:3000/api/knowledge?category=performance"

# 按数据库类型过滤
curl "http://localhost:3000/api/knowledge?database=mysql"
```

#### 搜索知识库

```bash
curl -X POST http://localhost:3000/api/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "索引优化",
    "limit": 5
  }'
```

### 4. 配置管理

#### 获取配置

```bash
# 获取所有配置
curl http://localhost:3000/api/config

# 获取特定配置项
curl http://localhost:3000/api/config/logLevel
```

#### 设置配置

```bash
curl -X PUT http://localhost:3000/api/config/logLevel \
  -H "Content-Type: application/json" \
  -d '{
    "value": "debug"
  }'
```

## 客户端集成示例

### JavaScript/Node.js

#### 基本使用

```javascript
class SQLAnalyzerAPI {
  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
  }

  async analyze(sql, options = {}) {
    const response = await fetch(`${this.baseURL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql,
        options: {
          performance: true,
          security: true,
          standards: true,
          ...options
        }
      })
    });

    return await response.json();
  }

  async analyzeBatch(sqls, options = {}) {
    const response = await fetch(`${this.baseURL}/api/analyze/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sqls,
        options: {
          performance: true,
          security: true,
          standards: true,
          ...options
        }
      })
    });

    return await response.json();
  }

  async getHistory(limit = 20, offset = 0) {
    const response = await fetch(
      `${this.baseURL}/api/history?limit=${limit}&offset=${offset}`
    );
    return await response.json();
  }

  async getHistoryById(id) {
    const response = await fetch(`${this.baseURL}/api/history/${id}`);
    return await response.json();
  }

  async searchKnowledge(query, options = {}) {
    const response = await fetch(`${this.baseURL}/api/knowledge/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        ...options
      })
    });

    return await response.json();
  }
}

// 使用示例
const analyzer = new SQLAnalyzerAPI();

// 分析单个 SQL
analyzer.analyze('SELECT * FROM users WHERE id = 1')
  .then(result => {
    console.log('分析结果:', result.data.overallScore);
    console.log('建议:', result.data.analysisResults.performance.suggestions);
  })
  .catch(error => {
    console.error('分析失败:', error);
  });

// 批量分析
const sqls = [
  { sql: 'SELECT * FROM users' },
  { sql: 'SELECT * FROM orders' }
];

analyzer.analyzeBatch(sqls)
  .then(result => {
    console.log('批量分析结果:', result.data.summary);
  })
  .catch(error => {
    console.error('批量分析失败:', error);
  });
```

#### 高级使用（带认证）

```javascript
class AuthenticatedSQLAnalyzerAPI extends SQLAnalyzerAPI {
  constructor(baseURL, apiKey) {
    super(baseURL);
    this.apiKey = apiKey;
  }

  async makeRequest(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async analyze(sql, options = {}) {
    return this.makeRequest(`${this.baseURL}/api/analyze`, {
      method: 'POST',
      body: JSON.stringify({
        sql,
        options: {
          performance: true,
          security: true,
          standards: true,
          ...options
        }
      })
    });
  }
}

// 使用示例
const authenticatedAnalyzer = new AuthenticatedSQLAnalyzerAPI(
  'http://localhost:3000',
  'your-api-key-here'
);

authenticatedAnalyzer.analyze('SELECT * FROM users')
  .then(result => {
    console.log('分析结果:', result);
  })
  .catch(error => {
    console.error('分析失败:', error);
  });
```

### Python

#### 基本使用

```python
import requests
import json

class SQLAnalyzerAPI:
    def __init__(self, base_url='http://localhost:3000', api_key=None):
        self.base_url = base_url
        self.api_key = api_key
        self.headers = {
            'Content-Type': 'application/json'
        }
        
        if api_key:
            self.headers['Authorization'] = f'Bearer {api_key}'
    
    def analyze(self, sql, options=None):
        if options is None:
            options = {}
            
        data = {
            'sql': sql,
            'options': {
                'performance': True,
                'security': True,
                'standards': True,
                **options
            }
        }
        
        response = requests.post(
            f'{self.base_url}/api/analyze',
            headers=self.headers,
            data=json.dumps(data)
        )
        
        return response.json()
    
    def analyze_batch(self, sqls, options=None):
        if options is None:
            options = {}
            
        data = {
            'sqls': sqls,
            'options': {
                'performance': True,
                'security': True,
                'standards': True,
                **options
            }
        }
        
        response = requests.post(
            f'{self.base_url}/api/analyze/batch',
            headers=self.headers,
            data=json.dumps(data)
        )
        
        return response.json()
    
    def get_history(self, limit=20, offset=0):
        response = requests.get(
            f'{self.base_url}/api/history',
            headers=self.headers,
            params={'limit': limit, 'offset': offset}
        )
        
        return response.json()
    
    def get_history_by_id(self, history_id):
        response = requests.get(
            f'{self.base_url}/api/history/{history_id}',
            headers=self.headers
        )
        
        return response.json()
    
    def search_knowledge(self, query, **options):
        data = {
            'query': query,
            **options
        }
        
        response = requests.post(
            f'{self.base_url}/api/knowledge/search',
            headers=self.headers,
            data=json.dumps(data)
        )
        
        return response.json()

# 使用示例
analyzer = SQLAnalyzerAPI()

# 分析单个 SQL
result = analyzer.analyze('SELECT * FROM users WHERE id = 1')
print(f"分析结果: {result['data']['overallScore']}")
print(f"建议: {result['data']['analysisResults']['performance']['suggestions']}")

# 批量分析
sqls = [
    {'sql': 'SELECT * FROM users'},
    {'sql': 'SELECT * FROM orders'}
]

batch_result = analyzer.analyze_batch(sqls)
print(f"批量分析结果: {batch_result['data']['summary']}")
```

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

type SQLAnalyzerAPI struct {
    BaseURL string
    APIKey  string
    Client  *http.Client
}

type AnalyzeRequest struct {
    SQL     string                 `json:"sql"`
    Options map[string]interface{} `json:"options"`
}

type AnalyzeResponse struct {
    Success  bool   `json:"success"`
    Message  string `json:"message"`
    Data     struct {
        OverallScore int `json:"overallScore"`
        // 其他字段...
    } `json:"data"`
}

func NewSQLAnalyzerAPI(baseURL, apiKey string) *SQLAnalyzerAPI {
    return &SQLAnalyzerAPI{
        BaseURL: baseURL,
        APIKey:  apiKey,
        Client:  &http.Client{},
    }
}

func (api *SQLAnalyzerAPI) Analyze(sql string) (*AnalyzeResponse, error) {
    req := AnalyzeRequest{
        SQL: sql,
        Options: map[string]interface{}{
            "performance": true,
            "security":    true,
            "standards":   true,
        },
    }
    
    jsonData, err := json.Marshal(req)
    if err != nil {
        return nil, err
    }
    
    httpReq, err := http.NewRequest(
        "POST",
        api.BaseURL+"/api/analyze",
        bytes.NewBuffer(jsonData),
    )
    if err != nil {
        return nil, err
    }
    
    httpReq.Header.Set("Content-Type", "application/json")
    if api.APIKey != "" {
        httpReq.Header.Set("Authorization", "Bearer "+api.APIKey)
    }
    
    resp, err := api.Client.Do(httpReq)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    var result AnalyzeResponse
    err = json.NewDecoder(resp.Body).Decode(&result)
    if err != nil {
        return nil, err
    }
    
    return &result, nil
}

func main() {
    analyzer := NewSQLAnalyzerAPI("http://localhost:3000", "")
    
    result, err := analyzer.Analyze("SELECT * FROM users WHERE id = 1")
    if err != nil {
        fmt.Printf("分析失败: %v\n", err)
        return
    }
    
    fmt.Printf("分析结果: %d\n", result.Data.OverallScore)
}
```

## 实际应用场景

### 1. CI/CD 集成

#### GitHub Actions 示例

```yaml
name: SQL Quality Check

on: [push, pull_request]

jobs:
  sql-check:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
    
    - name: Install SQL Analyzer
      run: bun install
    
    - name: Configure
      run: |
        echo "CUSTOM_API_KEY=${{ secrets.API_KEY }}" >> .env
        echo "NODE_ENV=production" >> .env
    
    - name: Start SQL Analyzer API
      run: |
        bun run start &
        sleep 10
    
    - name: Analyze SQL files
      run: |
        for file in $(find . -name "*.sql"); do
          echo "Analyzing $file..."
          response=$(curl -s -X POST http://localhost:3000/api/analyze \
            -H "Content-Type: application/json" \
            -d "{\"sql\": \"$(cat $file)\", \"options\": {\"performance\": true, \"security\": true, \"standards\": true}}")
          
          score=$(echo $response | jq -r '.data.overallScore')
          if [ "$score" -lt 70 ]; then
            echo "SQL quality check failed for $file (score: $score)"
            exit 1
          fi
        done
```

### 2. 批量处理脚本

#### JavaScript 批量处理

```javascript
import fs from 'fs';
import path from 'path';
import { SQLAnalyzerAPI } from './sql-analyzer-api.js';

const analyzer = new SQLAnalyzerAPI('http://localhost:3000');

async function analyzeDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  const sqlFiles = files.filter(file => path.extname(file) === '.sql');
  
  console.log(`找到 ${sqlFiles.length} 个 SQL 文件`);
  
  const results = [];
  
  for (const file of sqlFiles) {
    const filePath = path.join(dirPath, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    try {
      const result = await analyzer.analyze(sql);
      results.push({
        file,
        success: true,
        score: result.data.overallScore,
        suggestions: result.data.analysisResults.performance.suggestions
      });
      
      console.log(`✓ ${file}: ${result.data.overallScore}/100`);
    } catch (error) {
      results.push({
        file,
        success: false,
        error: error.message
      });
      
      console.log(`✗ ${file}: ${error.message}`);
    }
  }
  
  // 生成报告
  const report = {
    timestamp: new Date().toISOString(),
    total: sqlFiles.length,
    succeeded: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    averageScore: results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.score, 0) / results.filter(r => r.success).length,
    results
  };
  
  fs.writeFileSync('analysis-report.json', JSON.stringify(report, null, 2));
  console.log('分析报告已保存到 analysis-report.json');
}

// 使用示例
analyzeDirectory('./sql-files');
```

### 3. Web 应用集成

#### React 组件示例

```jsx
import React, { useState } from 'react';
import { SQLAnalyzerAPI } from './api/sql-analyzer';

function SQLAnalyzer() {
  const [sql, setSql] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const analyzer = new SQLAnalyzerAPI('http://localhost:3000');
  
  const handleAnalyze = async () => {
    if (!sql.trim()) {
      setError('请输入 SQL 语句');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await analyzer.analyze(sql);
      setResult(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="sql-analyzer">
      <h2>SQL 分析器</h2>
      
      <div className="input-section">
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          placeholder="输入 SQL 语句..."
          rows={10}
          cols={80}
        />
        
        <button 
          onClick={handleAnalyze} 
          disabled={loading}
        >
          {loading ? '分析中...' : '分析'}
        </button>
      </div>
      
      {error && (
        <div className="error">
          错误: {error}
        </div>
      )}
      
      {result && (
        <div className="result">
          <h3>分析结果</h3>
          <p>总分: {result.overallScore}/100</p>
          
          <div className="suggestions">
            <h4>建议</h4>
            {result.analysisResults.performance.suggestions.map((suggestion, index) => (
              <div key={index} className="suggestion">
                <strong>{suggestion.type}:</strong> {suggestion.description}
                {suggestion.example && (
                  <pre><code>{suggestion.example}</code></pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SQLAnalyzer;
```

## 最佳实践

### 1. 错误处理

```javascript
async function analyzeWithErrorHandling(sql) {
  try {
    const result = await analyzer.analyze(sql);
    
    if (!result.success) {
      throw new Error(result.message);
    }
    
    return result.data;
  } catch (error) {
    if (error.response) {
      // HTTP 错误
      console.error('HTTP Error:', error.response.status, error.response.data);
    } else if (error.request) {
      // 网络错误
      console.error('Network Error:', error.request);
    } else {
      // 其他错误
      console.error('Error:', error.message);
    }
    
    throw error;
  }
}
```

### 2. 重试机制

```javascript
async function analyzeWithRetry(sql, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await analyzer.analyze(sql);
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      
      // 指数退避
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`重试 ${i + 1}/${maxRetries}...`);
    }
  }
}
```

### 3. 批量处理优化

```javascript
async function analyzeBatchOptimized(sqls, batchSize = 5) {
  const results = [];
  
  for (let i = 0; i < sqls.length; i += batchSize) {
    const batch = sqls.slice(i, i + batchSize);
    
    try {
      const batchResult = await analyzer.analyzeBatch(batch);
      results.push(...batchResult.data.results);
      
      // 避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`批量分析失败 (批次 ${Math.floor(i/batchSize) + 1}):`, error);
      
      // 如果批量失败，尝试单个分析
      for (const item of batch) {
        try {
          const result = await analyzer.analyze(item.sql);
          results.push({
            index: item.index,
            sql: item.sql,
            success: true,
            ...result.data
          });
        } catch (singleError) {
          results.push({
            index: item.index,
            sql: item.sql,
            success: false,
            error: singleError.message
          });
        }
      }
    }
  }
  
  return results;
}
```

## 性能优化

### 1. 连接池

```javascript
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'sql_analyzer',
  user: 'postgres',
  password: 'password',
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

class OptimizedSQLAnalyzerAPI extends SQLAnalyzerAPI {
  async analyze(sql, options = {}) {
    const client = await pool.connect();
    
    try {
      // 使用连接池执行分析
      return await super.analyze(sql, options);
    } finally {
      client.release();
    }
  }
}
```

### 2. 缓存

```javascript
import NodeCache from 'node-cache';

class CachedSQLAnalyzerAPI extends SQLAnalyzerAPI {
  constructor(baseURL, apiKey) {
    super(baseURL, apiKey);
    this.cache = new NodeCache({ stdTTL: 3600 }); // 1小时缓存
  }
  
  async analyze(sql, options = {}) {
    const cacheKey = `analyze:${Buffer.from(sql).toString('base64')}`;
    
    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('从缓存返回结果');
      return cached;
    }
    
    // 执行分析
    const result = await super.analyze(sql, options);
    
    // 缓存结果
    this.cache.set(cacheKey, result);
    
    return result;
  }
}
```

## 故障排除

### 常见问题

#### 1. 连接超时

```javascript
// 设置超时时间
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

try {
  const response = await fetch(url, {
    signal: controller.signal
  });
  clearTimeout(timeoutId);
  // 处理响应
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('请求超时');
  } else {
    console.error('其他错误:', error);
  }
}
```

#### 2. 内存使用过高

```javascript
// 流式处理大结果
async function analyzeLargeSQL(sql) {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql })
  });
  
  const reader = response.body.getReader();
  
  while (true) {
    const { done, value } = await reader.read();
    
    if (done) break;
    
    // 处理数据块
    const chunk = new TextDecoder().decode(value);
    console.log('收到数据块:', chunk);
  }
}
```

## 下一步

- 查看 [API 文档](./api.md) 了解所有可用的 API 端点
- 参考 [部署指南](./deployment-guide.md) 了解生产环境部署
- 阅读 [架构文档](./architecture-summary.md) 了解系统架构
- 查看 [迁移指南](./migration-guide.md) 了解从旧版本迁移