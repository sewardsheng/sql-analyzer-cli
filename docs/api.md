# SQL Analyzer API 文档

## 概述

SQL Analyzer API 提供了一套完整的 RESTful API 接口，采用全新的四阶段分析架构，用于 SQL 语句的智能分析、性能优化建议、安全审计和编码规范检查。本文档详细介绍了所有可用的 API 端点、请求参数、响应格式和使用示例。

## 新架构特性

- **四阶段分析流程**：预处理→分析→整合→学习的完整分析链路
- **统一分析器**：单次LLM调用获取多维度分析结果，性能提升66.7%
- **智能上下文管理**：GlobalContext贯穿整个分析流程，提供一致的上下文信息
- **智能报告整合**：自动去重、优先级评估、分阶段实施计划生成
- **优雅降级机制**：多层错误处理，单个组件失败不影响整体流程

## 基础信息

- **基础 URL**: `http://localhost:3000`
- **API 版本**: v4.0.0 (新架构版本)
- **内容类型**: `application/json`
- **字符编码**: UTF-8

## 认证

目前 API 支持以下认证方式：

### API 密钥认证（可选）

```http
Authorization: Bearer your-api-key
# 或
X-API-Key: your-api-key
```

启用 API 密钥认证：

```env
API_KEY_REQUIRED=true
API_KEY=your-secret-key
```

## 通用响应格式

### 成功响应

```json
{
  "success": true,
  "message": "操作成功",
  "data": {
    // 具体数据内容
  },
  "timestamp": "2025-11-24T12:00:00.000Z",
  "responseTime": "150ms"
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": "SQL语句不能为空"
  },
  "timestamp": "2025-11-24T12:00:00.000Z",
  "responseTime": "50ms"
}
```

## API 端点

### 1. 系统信息

#### GET / - API 根路径

获取 API 基本信息。

**请求示例**:
```http
GET /
```

**响应示例**:
```json
{
  "name": "SQL Analyzer API",
  "version": "1.0.0",
  "description": "SQL语句智能分析与扫描API服务",
  "endpoints": {
    "health": "GET /api/health",
    "healthPing": "GET /api/health/ping",
    "healthStatus": "GET /api/health/status",
    "healthCheck": "GET /api/health/check/:type",
    "analyze": "POST /api/analyze",
    "analyzeBatch": "POST /api/analyze/batch",
    "history": "GET /api/history",
    "historyDetail": "GET /api/history/:id",
    "historyStats": "GET /api/history/stats",
    "knowledge": "GET /api/knowledge",
    "knowledgeSearch": "POST /api/knowledge/search",
    "knowledgeLearn": "POST /api/knowledge/learn"
  },
  "documentation": "/api/docs/swagger",
  "openapi": "/api/docs/doc"
}
```

### 2. 健康检查

#### GET /api/health - 系统健康检查

执行完整的系统健康检查。

**请求示例**:
```http
GET /api/health
```

**响应示例**:
```json
{
  "success": true,
  "message": "系统健康检查完成",
  "data": {
    "status": "healthy",
    "timestamp": "2025-11-24T12:00:00.000Z",
    "summary": "所有系统组件运行正常",
    "checks": {
      "core-modules": {
        "status": "healthy",
        "message": "核心模块加载正常"
      },
      "configuration": {
        "status": "healthy",
        "message": "配置文件加载正常"
      },
      "memory": {
        "status": "healthy",
        "message": "内存使用正常",
        "details": {
          "used": "256MB",
          "total": "4GB"
        }
      }
    },
    "recommendations": []
  }
}
```

#### GET /api/health/ping - 简单 ping 检查

用于服务可用性测试。

**请求示例**:
```http
GET /api/health/ping
```

**响应示例**:
```json
{
  "success": true,
  "message": "服务可用性检查",
  "data": {
    "message": "pong",
    "uptime": 3600
  }
}
```

#### GET /api/health/status - 服务状态信息

返回服务基本状态信息。

**请求示例**:
```http
GET /api/health/status
```

**响应示例**:
```json
{
  "success": true,
  "message": "获取服务状态成功",
  "data": {
    "status": "running",
    "uptime": 3600,
    "version": "1.0.0",
    "environment": "production",
    "memory": {
      "rss": "256MB",
      "heapTotal": "128MB",
      "heapUsed": "96MB",
      "external": "32MB"
    },
    "platform": "linux",
    "nodeVersion": "v18.17.0"
  }
}
```

#### GET /api/health/check/:type - 特定类型健康检查

执行指定类型的健康检查。

**路径参数**:
- `type`: 检查类型，可选值：
  - `core-modules` - 核心模块检查
  - `configuration` - 配置检查
  - `rules` - 规则文件检查
  - `prompts` - 提示词检查
  - `dependencies` - 依赖检查
  - `memory` - 内存检查
  - `disk-space` - 磁盘空间检查
  - `cpu-usage` - CPU 使用检查
  - `network` - 网络检查
  - `external-services` - 外部服务检查
  - `database-connections` - 数据库连接检查
  - `api-performance` - API 性能检查

**请求示例**:
```http
GET /api/health/check/memory
```

**响应示例**:
```json
{
  "success": true,
  "message": "健康检查完成: memory",
  "data": {
    "type": "memory",
    "name": "内存检查",
    "status": "healthy",
    "message": "内存使用正常",
    "details": {
      "used": "256MB",
      "total": "4GB",
      "percentage": 6.25
    },
    "duration": "15ms"
  }
}
```

### 3. SQL 分析

#### POST /api/analyze - 单个 SQL 分析

分析单条 SQL 语句。

**请求体**:
```json
{
  "sql": "SELECT * FROM users WHERE id = 1",
  "options": {
    "performance": true,
    "security": true,
    "standards": true,
    "learn": false
  }
}
```

**参数说明**:
- `sql` (string, 必需): 要分析的 SQL 语句
- `options` (object, 可选): 分析选项
  - `performance` (boolean): 是否执行性能分析，默认 true
  - `security` (boolean): 是否执行安全审计，默认 true
  - `standards` (boolean): 是否执行编码规范检查，默认 true
  - `learn` (boolean): 是否启用学习功能，默认 false

**请求示例**:
```http
POST /api/analyze
Content-Type: application/json

{
  "sql": "SELECT * FROM users WHERE id = 1",
  "options": {
    "performance": true,
    "security": true,
    "standards": true
  }
}
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
    "overallScore": 85,
    "riskLevel": "medium",
    "securityVeto": false,
    "summary": {
      "performance": {
        "score": 85,
        "status": "good",
        "issues": 0,
        "recommendations": 1
      },
      "security": {
        "score": 90,
        "status": "excellent",
        "issues": 0,
        "recommendations": 1
      },
      "standards": {
        "score": 80,
        "status": "good",
        "issues": 0,
        "recommendations": 1
      }
    },
    "recommendations": [
      {
        "id": "performance_rec_0",
        "type": "performance",
        "title": "添加索引",
        "description": "建议在 id 字段上创建索引以提高查询性能",
        "impact": "high",
        "effort": "low",
        "category": "performance",
        "severity": "medium",
        "source": "performance"
      }
    ],
    "implementationPlan": {
      "immediate": [],
      "shortTerm": [
        {
          "id": "performance_rec_0",
          "type": "performance",
          "title": "添加索引",
          "description": "建议在 id 字段上创建索引以提高查询性能",
          "impact": "high",
          "effort": "low"
        }
      ],
      "longTerm": []
    },
    "analysisResults": {
      "performance": {
        "score": 85,
        "issues": [],
        "recommendations": [
          {
            "title": "添加索引",
            "description": "建议在 id 字段上创建索引",
            "impact": "high",
            "effort": "low"
          }
        ],
        "metrics": {
          "executionTime": "estimated",
          "resourceUsage": "low"
        }
      },
      "security": {
        "score": 90,
        "vulnerabilities": [],
        "recommendations": [
          {
            "title": "良好实践",
            "description": "使用了参数化查询，避免 SQL 注入风险",
            "priority": "medium"
          }
        ],
        "veto": false
      },
      "standards": {
        "score": 80,
        "violations": [],
        "recommendations": [
          {
            "title": "命名规范",
            "description": "表名和字段名使用小写，符合命名规范",
            "category": "formatting"
          }
        ]
      }
    },
    "report": "SQL 语句质量良好，建议在 id 字段上创建索引以提高查询性能。"
  },
  "metadata": {
    "requestId": "req_123456789",
    "timestamp": "2025-11-24T12:00:00.000Z",
    "databaseType": "mysql",
    "dbConfidence": 0.9,
    "sqlComplexity": "simple",
    "metrics": {
      "totalDuration": 1500,
      "llmCalls": 1,
      "stages": {
        "preprocessing": 50,
        "analysis": 1200,
        "integration": 200,
        "learning": 50
      },
      "cacheHits": 0
    },
    "options": {
      "performance": true,
      "security": true,
      "standards": true,
      "learn": false
    }
  },
  "timestamp": "2025-11-24T12:00:00.000Z",
  "responseTime": "1500ms"
}
```

#### POST /api/analyze/batch - 批量 SQL 分析

分析多条 SQL 语句。

**请求体**:
```json
{
  "sqls": [
    {"sql": "SELECT * FROM users"},
    {"sql": "SELECT * FROM orders"}
  ],
  "options": {
    "performance": true,
    "security": true,
    "standards": true,
    "learn": false
  }
}
```

**参数说明**:
- `sqls` (array, 必需): SQL 语句数组，每个元素包含 `sql` 字段
- `options` (object, 可选): 分析选项，同单个分析

**请求示例**:
```http
POST /api/analyze/batch
Content-Type: application/json

{
  "sqls": [
    {"sql": "SELECT * FROM users"},
    {"sql": "SELECT * FROM orders WHERE status = 'active'"}
  ],
  "options": {
    "performance": true,
    "security": true,
    "standards": true
  }
}
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
        "riskLevel": "medium",
        "securityVeto": false,
        "summary": {
          "performance": {
            "score": 75,
            "status": "good",
            "issues": 0,
            "recommendations": 1
          },
          "security": {
            "score": 80,
            "status": "good",
            "issues": 0,
            "recommendations": 1
          },
          "standards": {
            "score": 70,
            "status": "warning",
            "issues": 1,
            "recommendations": 1
          }
        },
        "recommendations": [
          {
            "id": "performance_rec_0",
            "type": "performance",
            "title": "添加索引",
            "description": "建议在主键字段上创建索引以提高查询性能",
            "impact": "high",
            "effort": "low",
            "severity": "medium"
          }
        ],
        "implementationPlan": {
          "immediate": [],
          "shortTerm": [
            {
              "id": "performance_rec_0",
              "type": "performance",
              "title": "添加索引",
              "description": "建议在主键字段上创建索引以提高查询性能",
              "impact": "high",
              "effort": "low"
            }
          ],
          "longTerm": []
        },
        "analysisResults": {...},
        "metadata": {
          "requestId": "req_123456789",
          "timestamp": "2025-11-24T12:00:00.000Z",
          "databaseType": "mysql",
          "dbConfidence": 0.9,
          "metrics": {
            "totalDuration": 1200,
            "llmCalls": 1,
            "stages": {
              "preprocessing": 50,
              "analysis": 1000,
              "integration": 100,
              "learning": 50
            },
            "cacheHits": 0
          }
        }
      },
      {
        "index": 1,
        "sql": "SELECT * FROM orders WHERE status = 'active'",
        "success": true,
        "overallScore": 80,
        "riskLevel": "low",
        "securityVeto": false,
        "summary": {
          "performance": {
            "score": 80,
            "status": "good",
            "issues": 0,
            "recommendations": 1
          },
          "security": {
            "score": 85,
            "status": "good",
            "issues": 0,
            "recommendations": 1
          },
          "standards": {
            "score": 75,
            "status": "good",
            "issues": 0,
            "recommendations": 1
          }
        },
        "recommendations": [
          {
            "id": "performance_rec_0",
            "type": "performance",
            "title": "添加复合索引",
            "description": "建议在 status 和 created_at 字段上创建复合索引",
            "impact": "high",
            "effort": "low",
            "severity": "medium"
          }
        ],
        "implementationPlan": {
          "immediate": [],
          "shortTerm": [
            {
              "id": "performance_rec_0",
              "type": "performance",
              "title": "添加复合索引",
              "description": "建议在 status 和 created_at 字段上创建复合索引",
              "impact": "high",
              "effort": "low"
            }
          ],
          "longTerm": []
        },
        "analysisResults": {...},
        "metadata": {
          "requestId": "req_123456790",
          "timestamp": "2025-11-24T12:00:01.000Z",
          "databaseType": "mysql",
          "dbConfidence": 0.9,
          "metrics": {
            "totalDuration": 1300,
            "llmCalls": 1,
            "stages": {
              "preprocessing": 50,
              "analysis": 1100,
              "integration": 100,
              "learning": 50
            },
            "cacheHits": 0
          }
        }
      }
    ],
    "summary": {
      "total": 2,
      "succeeded": 2,
      "failed": 0,
      "averageScore": 77.5,
      "averageDuration": 1250,
      "totalLLMCalls": 2,
      "cacheHitRate": 0
    }
  },
  "timestamp": "2025-11-24T12:00:02.000Z",
  "responseTime": "2500ms"
}
```

### 4. 配置管理

#### GET /api/config - 获取所有配置

返回当前系统的所有配置项。

**请求示例**:
```http
GET /api/config
```

**响应示例**:
```json
{
  "success": true,
  "message": "获取配置成功",
  "data": {
    "apiPort": 3000,
    "apiHost": "0.0.0.0",
    "logLevel": "info",
    "corsEnabled": true,
    "corsOrigin": "*",
    "rateLimitEnabled": true,
    "rateLimitRequests": 100,
    "rateLimitWindow": 900000,
    "customApiKey": "sk-***",
    "customModel": "deepseek-ai/DeepSeek-V3.1"
  }
}
```

#### GET /api/config/:key - 获取指定配置项

返回指定键名的配置值。

**路径参数**:
- `key`: 配置项键名

**请求示例**:
```http
GET /api/config/logLevel
```

**响应示例**:
```json
{
  "success": true,
  "message": "获取配置项成功",
  "data": {
    "key": "logLevel",
    "value": "info"
  }
}
```

#### PUT /api/config/:key - 设置配置项

设置指定键名的配置值。

**路径参数**:
- `key`: 配置项键名

**请求体**:
```json
{
  "value": "debug"
}
```

**请求示例**:
```http
PUT /api/config/logLevel
Content-Type: application/json

{
  "value": "debug"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "配置项 \"logLevel\" 已更新",
  "data": {
    "key": "logLevel",
    "value": "debug"
  }
}
```

#### DELETE /api/config/:key - 重置配置项

将指定键名的配置项重置为默认值。

**路径参数**:
- `key`: 配置项键名

**请求示例**:
```http
DELETE /api/config/logLevel
```

**响应示例**:
```json
{
  "success": true,
  "message": "配置项 \"logLevel\" 已重置为默认值",
  "data": null
}
```

#### POST /api/config/reset - 重置所有配置

将所有配置项重置为默认值。

**请求示例**:
```http
POST /api/config/reset
```

**响应示例**:
```json
{
  "success": true,
  "message": "所有配置已重置为默认值",
  "data": null
}
```

### 5. 历史记录

#### GET /api/history - 获取历史记录列表

返回所有历史记录的简要信息。

**查询参数**:
- `limit` (number, 可选): 返回记录数量限制，默认 20
- `offset` (number, 可选): 偏移量，默认 0

**请求示例**:
```http
GET /api/history?limit=10&offset=0
```

**响应示例**:
```json
{
  "success": true,
  "message": "获取历史记录成功",
  "data": [
    {
      "id": "123",
      "timestamp": "2025-11-24T12:00:00.000Z",
      "sql": "SELECT * FROM users WHERE id = 1",
      "databaseType": "mysql",
      "overallScore": 85,
      "type": "command"
    },
    {
      "id": "124",
      "timestamp": "2025-11-24T12:05:00.000Z",
      "sql": "SELECT * FROM orders",
      "databaseType": "mysql",
      "overallScore": 75,
      "type": "batch"
    }
  ],
  "total": 2
}
```

#### GET /api/history/:id - 获取历史记录详情

返回指定ID的历史记录完整信息。

**路径参数**:
- `id`: 历史记录ID

**请求示例**:
```http
GET /api/history/123
```

**响应示例**:
```json
{
  "success": true,
  "message": "获取历史记录详情成功",
  "data": {
    "id": "123",
    "timestamp": "2025-11-24T12:00:00.000Z",
    "sql": "SELECT * FROM users WHERE id = 1",
    "databaseType": "mysql",
    "overallScore": 85,
    "analysisResults": {
      "performance": {...},
      "security": {...},
      "standards": {...}
    },
    "report": "SQL 语句质量良好...",
    "type": "command",
    "metadata": {
      "userAgent": "curl/7.68.0",
      "ip": "192.168.1.100"
    }
  }
}
```

#### DELETE /api/history/:id - 删除历史记录

删除指定ID的历史记录。

**路径参数**:
- `id`: 历史记录ID

**请求示例**:
```http
DELETE /api/history/123
```

**响应示例**:
```json
{
  "success": true,
  "message": "删除历史记录成功",
  "data": null
}
```

#### GET /api/history/stats - 获取历史记录统计信息

返回历史记录的统计信息。

**请求示例**:
```http
GET /api/history/stats
```

**响应示例**:
```json
{
  "success": true,
  "message": "获取历史记录统计成功",
  "data": {
    "total": 150,
    "today": 10,
    "thisWeek": 45,
    "thisMonth": 120,
    "averageScore": 78.5,
    "databaseTypes": {
      "mysql": 80,
      "postgresql": 40,
      "sqlite": 20,
      "sqlserver": 10
    },
    "scoreDistribution": {
      "excellent": 30,
      "good": 60,
      "fair": 45,
      "poor": 15
    }
  }
}
```

### 6. 知识库管理

#### GET /api/knowledge - 获取知识库内容

返回知识库中的所有规则和知识。

**查询参数**:
- `category` (string, 可选): 规则类别过滤
- `database` (string, 可选): 数据库类型过滤

**请求示例**:
```http
GET /api/knowledge?category=performance&database=mysql
```

**响应示例**:
```json
{
  "success": true,
  "message": "获取知识库成功",
  "data": {
    "rules": [
      {
        "id": "perf-001",
        "title": "索引优化建议",
        "category": "performance",
        "database": "mysql",
        "description": "为经常查询的字段创建索引",
        "example": "CREATE INDEX idx_users_id ON users(id)",
        "approved": true
      }
    ],
    "total": 1
  }
}
```

#### POST /api/knowledge/search - 搜索知识库

根据关键词搜索知识库内容。

**请求体**:
```json
{
  "query": "索引优化",
  "category": "performance",
  "database": "mysql",
  "limit": 10
}
```

**参数说明**:
- `query` (string, 必需): 搜索关键词
- `category` (string, 可选): 规则类别过滤
- `database` (string, 可选): 数据库类型过滤
- `limit` (number, 可选): 返回结果数量限制，默认 5

**请求示例**:
```http
POST /api/knowledge/search
Content-Type: application/json

{
  "query": "索引优化",
  "limit": 5
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "搜索知识库成功",
  "data": {
    "results": [
      {
        "id": "perf-001",
        "title": "索引优化建议",
        "category": "performance",
        "database": "mysql",
        "description": "为经常查询的字段创建索引",
        "example": "CREATE INDEX idx_users_id ON users(id)",
        "score": 0.95,
        "approved": true
      }
    ],
    "total": 1
  }
}
```

#### POST /api/knowledge/learn - 学习新知识

从提供的文档中学习新的规则和知识。

**请求体**:
```json
{
  "content": "SQL 性能优化最佳实践...",
  "category": "performance",
  "database": "mysql",
  "source": "manual"
}
```

**参数说明**:
- `content` (string, 必需): 学习内容
- `category` (string, 可选): 规则类别
- `database` (string, 可选): 数据库类型
- `source` (string, 可选): 内容来源

**请求示例**:
```http
POST /api/knowledge/learn
Content-Type: application/json

{
  "content": "在 WHERE 子句中使用索引字段可以提高查询性能...",
  "category": "performance",
  "database": "mysql"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "学习新知识成功",
  "data": {
    "ruleId": "learned-001",
    "status": "pending_approval",
    "extractedRules": 3,
    "qualityScore": 0.85
  }
}
```

## 错误代码

| 错误代码 | HTTP状态码 | 说明 |
|---------|-----------|------|
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `UNAUTHORIZED` | 401 | 未授权访问 |
| `FORBIDDEN` | 403 | 禁止访问 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求频率超限 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |
| `SERVICE_UNAVAILABLE` | 503 | 服务不可用 |

## 限流

API 实现了请求限流机制，防止滥用：

- **默认限制**: 每 15 分钟 100 个请求
- **限制类型**: 基于 IP 地址
- **超限响应**: HTTP 429 状态码

可以通过环境变量配置限流：

```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=900000
```

## CORS

API 支持 CORS（跨域资源共享），可以通过环境变量配置：

```env
CORS_ENABLED=true
CORS_ORIGIN=*
```

## Swagger 文档

API 提供了交互式的 Swagger 文档：

- **Swagger UI**: `/api/docs/swagger`
- **OpenAPI 规范**: `/api/docs/doc`

## 使用示例

### JavaScript/Node.js

```javascript
// 分析 SQL
const response = await fetch('http://localhost:3000/api/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sql: 'SELECT * FROM users WHERE id = 1',
    options: {
      performance: true,
      security: true,
      standards: true
    }
  })
});

const result = await response.json();
console.log(result.data.overallScore);
```

### Python

```python
import requests

# 分析 SQL
response = requests.post('http://localhost:3000/api/analyze', json={
    'sql': 'SELECT * FROM users WHERE id = 1',
    'options': {
        'performance': True,
        'security': True,
        'standards': True
    }
})

result = response.json()
print(result['data']['overallScore'])
```

### cURL

```bash
# 分析 SQL
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

## 版本控制

API 使用语义化版本控制（SemVer），当前版本为 v1.0.0。

版本信息包含在所有响应的 `version` 字段中，也可以通过 `/api/health/status` 端点获取。

## 新架构响应格式说明

### 核心字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `overallScore` | number | 综合评分 (0-100) |
| `riskLevel` | string | 风险等级 (low/medium/high/critical) |
| `securityVeto` | boolean | 安全一票否决标志 |
| `summary` | object | 各维度分析摘要 |
| `recommendations` | array | 去重后的建议列表 |
| `implementationPlan` | object | 分阶段实施计划 |
| `metadata.metrics` | object | 详细的性能指标 |
| `metadata.metrics.llmCalls` | number | LLM调用次数 |
| `metadata.metrics.stages` | object | 各阶段执行时间 |

### 实施计划说明

| 阶段 | 说明 | 内容 |
|------|------|------|
| `immediate` | 立即执行 | 严重安全问题 |
| `shortTerm` | 短期执行 | 高优先级问题 |
| `longTerm` | 长期执行 | 中低优先级问题 |

## 性能优化说明

### 新架构性能提升

- **LLM调用优化**: 从3-4次减少到1次，提升66.7%
- **响应时间**: 平均响应时间从6-8秒减少到4-5秒
- **缓存机制**: 智能缓存减少重复计算，命中率>80%
- **并行处理**: 多维度分析并行执行，提升整体效率

### 性能监控

API 提供详细的性能指标，可通过以下方式获取：

```bash
# 获取系统状态
curl http://localhost:3000/api/health/status

# 查看分析指标
# 响应中的 metadata.metrics 字段包含详细的性能数据
```

## 更新日志

### v4.0.0 (2025-11-25) - 新架构版本
- 🏗️ 全新四阶段分析架构
- ⚡ LLM调用次数减少66.7%，响应时间提升30-40%
- 🧠 统一分析器替代多个独立分析器
- 🎯 GlobalContext智能上下文管理
- 📊 智能报告整合和去重机制
- 🛡️ 优雅降级和错误处理机制
- 📈 多级缓存系统
- 🔄 两级数据库识别策略

### v1.0.0 (2025-11-24)
- 初始版本发布
- 完整的 SQL 分析 API
- 健康检查和监控
- 配置管理
- 历史记录
- 知识库管理
- 中间件系统（CORS、限流、日志、错误处理）
- Swagger 文档支持