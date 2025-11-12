# API 文档

## 概述

SQL Analyzer CLI 提供了 RESTful API 服务，允许你通过 HTTP 请求进行 SQL 分析。

## 启动 API 服务

```bash
# 使用默认配置启动（端口 3000）
sql-analyzer api

# 指定端口
sql-analyzer api --port 8080

# 指定主机
sql-analyzer api --host localhost
```

## API 基础信息

- **基础URL**: `http://localhost:3000`（默认）
- **内容类型**: `application/json`
- **认证**: 目前不需要认证

## API 端点

### 1. 获取API信息

**端点**: `GET /`

**描述**: 获取API基本信息和可用端点列表

### 2. 分析 SQL

**端点**: `POST /api/analyze`

**描述**: 分析 SQL 语句并返回优化建议

### 3. 健康检查

**端点**: `GET /api/health`

**描述**: 检查API服务状态

### 4. 历史记录管理

#### 4.1 获取历史记录列表

**端点**: `GET /api/history`

**描述**: 获取SQL分析历史记录列表，支持分页和日期过滤

#### 4.2 获取单条历史记录详情

**端点**: `GET /api/history/:id`

**描述**: 获取指定ID的历史记录详情

#### 4.3 删除单条历史记录

**端点**: `DELETE /api/history/:id`

**描述**: 删除指定ID的历史记录

#### 4.4 清空历史记录

**端点**: `DELETE /api/history`

**描述**: 清空所有历史记录或指定日期之前的记录

#### 4.5 获取历史记录统计信息

**端点**: `GET /api/history/stats`

**描述**: 获取历史记录的统计信息

### 5. 知识库管理

#### 5.1 查看知识库状态

**端点**: `GET /api/knowledge/status`

**描述**: 获取知识库的当前状态，包括初始化状态、持久化状态、文档数量等信息

#### 5.2 加载文档到知识库

**端点**: `POST /api/knowledge/load`

**描述**: 从指定目录加载文档到知识库

#### 5.3 重置知识库

**端点**: `POST /api/knowledge/reset`

**描述**: 重置知识库，清除所有已加载的文档

### 6. 配置管理

#### 6.1 获取当前配置

**端点**: `GET /api/config`

**描述**: 获取当前的配置信息

#### 6.2 更新配置

**端点**: `POST /api/config`

**描述**: 更新配置信息

#### 6.3 获取单个配置项

**端点**: `GET /api/config/:key`

**描述**: 获取指定的单个配置项

#### 6.4 更新单个配置项

**端点**: `PUT /api/config/:key`

**描述**: 更新指定的单个配置项

#### 6.5 重置配置

**端点**: `POST /api/config/reset`

**描述**: 重置所有配置为默认值

## 使用示例

### cURL
```bash
# 获取API信息
curl http://localhost:3000/

# 健康检查
curl http://localhost:3000/api/health

# 分析 SQL
curl.exe -X POST http://localhost:3000/api/analyze `
  -H "Content-Type: application/json" `
  -d '{"sql": "SELECT * FROM users", "databaseType": "mysql"}'

# 获取历史记录列表（带分页）
curl -X GET "http://localhost:3000/api/history?page=1&limit=10"

# 获取单条历史记录详情
curl -X GET "http://localhost:3000/api/history/202511121451-35ef"

# 删除单条历史记录
curl -X DELETE "http://localhost:3000/api/history/202511121451-35ef"

# 清空所有历史记录
curl -X DELETE "http://localhost:3000/api/history"

# 清空指定日期前的历史记录
curl -X DELETE "http://localhost:3000/api/history?beforeDate=2025-01-01"

# 获取历史记录统计信息
curl -X GET "http://localhost:3000/api/history/stats"

# 查看知识库状态
curl -X GET "http://localhost:3000/api/knowledge/status"

# 加载文档到知识库
curl -X POST "http://localhost:3000/api/knowledge/load" \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {
        "content": "这是第一个文档的内容",
        "metadata": {
          "source": "document1.txt",
          "type": "text"
        }
      },
      {
        "content": "这是第二个文档的内容",
        "metadata": {
          "source": "document2.txt",
          "type": "text"
        }
      }
    ],
    "apiKey": "****",
    "baseURL": "https://api.example.com/v1",
    "model": "model-name",
    "embeddingModel": "embedding-model-name"
  }'

# 重置知识库
curl -X POST "http://localhost:3000/api/knowledge/reset" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "****",
    "baseURL": "https://api.example.com/v1",
    "model": "model-name",
    "embeddingModel": "embedding-model-name"
  }'

# 获取当前配置
curl -X GET "http://localhost:3000/api/config"

# 更新配置
curl -X POST "http://localhost:3000/api/config" \
  -H "Content-Type: application/json" \
  -d '{
    "baseURL": "https://api.example.com/v1",
    "model": "model-name",
    "defaultDatabaseType": "mysql",
    "embeddingModel": "embedding-model-name",
    "apiPort": 3000,
    "apiHost": "localhost",
    "apiCorsEnabled": true,
    "apiCorsOrigin": "*"
  }'

# 获取单个配置项
curl -X GET "http://localhost:3000/api/config/model"

# 更新单个配置项
curl -X PUT "http://localhost:3000/api/config/model" \
  -H "Content-Type: application/json" \
  -d '{"value": "new-model-name"}'

# 重置配置
curl -X POST "http://localhost:3000/api/config/reset"
```