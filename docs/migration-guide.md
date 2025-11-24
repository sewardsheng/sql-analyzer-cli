# SQL Analyzer API 迁移指南

## 概述

本指南详细说明如何将现有的 SQL Analyzer 项目从 CLI+API 混合模式迁移到纯 API 模式。新版本完全移除了 CLI 功能，专注于提供高性能的 RESTful API 服务。

## 迁移前准备

### 1. 备份现有数据

```bash
# 备份配置文件
cp src/config/config.json src/config/config.json.backup

# 备份历史记录
cp .sql-analyzer-history.json .sql-analyzer-history.json.backup

# 备份知识库
cp -r src/core/knowledgeBase src/core/knowledgeBase.backup

# 备份环境变量
cp .env .env.backup
```

### 2. 检查当前版本

确保当前项目版本兼容：

```bash
# 检查 package.json 版本
cat package.json | grep '"version"'

# 检查依赖
bun list

# 检查当前运行模式
ps aux | grep sql-analyzer
```

### 3. 评估影响范围

在迁移前，请评估以下方面：

- **现有集成方式**：是否有系统直接调用 CLI 命令
- **自动化脚本**：是否有使用 CLI 的自动化流程
- **CI/CD 流水线**：是否需要更新构建和测试脚本
- **用户文档**：是否需要更新用户使用指南

## 迁移步骤

### 步骤 1: 环境准备

#### 1.1 停止现有服务

```bash
# 停止 CLI 服务（如果运行中）
pkill -f "sql-analyzer"

# 停止 API 服务（如果运行中）
pkill -f "src/server.js"

# 或使用 PM2
pm2 stop all
```

#### 1.2 备份当前代码

```bash
# 创建备份分支
git checkout -b backup-before-migration

# 提交当前状态
git add .
git commit -m "备份迁移前状态"
git checkout main
```

### 步骤 2: 更新项目结构

新的纯 API 模式项目结构：

```
sql-analyzer-api/
├── src/
│   ├── server.js                 # 新的 API 入口点
│   ├── middleware/               # 中间件系统
│   │   ├── index.js
│   │   ├── cors.js
│   │   ├── requestLogger.js
│   │   ├── rateLimiter.js
│   │   └── errorHandler.js
│   ├── services/
│   │   ├── api/               # API 服务层
│   │   │   ├── index.js
│   │   │   ├── routes/
│   │   │   │   ├── analyze.js
│   │   │   │   ├── config.js
│   │   │   │   ├── health.js
│   │   │   │   ├── history.js
│   │   │   │   ├── knowledge.js
│   │   │   │   └── status.js
│   │   │   └── docs.js       # Swagger 文档
│   │   ├── analysis/           # 分析服务（保留）
│   │   ├── config/            # 配置管理（保留）
│   │   ├── health/           # 健康检查服务（新增）
│   │   └── knowledge/         # 知识库服务（保留）
│   ├── core/                  # 核心业务逻辑（保留）
│   │   ├── coordinator.js
│   │   ├── reporter.js
│   │   ├── analyzers/
│   │   └── knowledgeBase.js
│   └── utils/                # 工具类（保留）
│       ├── logger.js           # 增强的日志系统
│       ├── fileReader.js
│       ├── responseHandler.js   # 新增响应处理工具
│       └── apiError.js        # 新增 API 错误处理
├── Dockerfile                 # Docker 配置
├── docker-compose.yml          # Docker Compose 配置
├── deploy.config.json         # 部署配置
└── scripts/
    ├── deploy.js             # 部署脚本
    └── healthcheck.js       # 健康检查脚本
```

### 步骤 3: 移除 CLI 相关代码

删除以下目录和文件：

```bash
# 删除 CLI 目录
rm -rf src/cli/

# 删除 UI 服务目录
rm -rf src/services/ui/

# 删除 CLI 相关文件
rm -f src/services/knowledge/knowledgeDisplay.js

# 删除 CLI 相关脚本
rm -f scripts/cli-*.js
```

### 步骤 4: 更新依赖

#### 4.1 移除 CLI 相关依赖

```bash
# 移除 CLI 相关包
bun remove commander inquirer ink ora cli-progress cli-table3 chalk

# 移除 UI 相关包
bun remove react react-dom
```

#### 4.2 添加 API 相关依赖

```bash
# 添加 API 相关包
bun add @hono/swagger-ui @hono/zod-openapi zod

# 添加中间件相关包
bun add cors helmet express-rate-limit
```

### 步骤 5: 更新配置

#### 5.1 更新 package.json

```json
{
  "name": "sql-analyzer-api",
  "version": "1.0.0",
  "description": "SQL语句智能分析与扫描API服务",
  "main": "src/server.js",
  "type": "module",
  "scripts": {
    "dev": "NODE_ENV=development bun run src/server.js",
    "start": "NODE_ENV=production bun run src/server.js",
    "build": "bun build ./src/server.js --outdir ./dist --target node",
    "test": "jest",
    "docker:build": "docker build -t sql-analyzer-api .",
    "docker:run": "docker run -p 3000:3000 sql-analyzer-api",
    "docker:compose": "docker-compose up -d",
    "docker:compose:down": "docker-compose down"
  },
  "keywords": [
    "sql",
    "analyzer",
    "api",
    "security",
    "performance",
    "hono",
    "docker",
    "microservice"
  ]
}
```

#### 5.2 配置环境变量

创建新的 `.env` 文件：

```env
# API 配置
NODE_ENV=production
API_HOST=0.0.0.0
API_PORT=3000

# 日志配置
LOG_LEVEL=info
LOG_REQUEST_BODY=false

# CORS 配置
CORS_ENABLED=true
CORS_ORIGIN=*

# 限流配置
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=900000

# LLM 配置
CUSTOM_API_KEY=your_api_key_here
CUSTOM_MODEL=deepseek-ai/DeepSeek-V3.1
CUSTOM_BASE_URL=https://api.openai.com/v1
CUSTOM_EMBEDDING_MODEL=BAAI/bge-m3

# 向量存储配置
VECTOR_STORE_API_KEY=
VECTOR_STORE_BASE_URL=
VECTOR_STORE_EMBEDDING_MODEL=
```

### 步骤 6: 数据迁移

#### 6.1 配置迁移

CLI 配置转换为 API 环境变量：

```javascript
// 原有 CLI 配置
const cliConfig = {
  apiPort: 3000,
  apiHost: '0.0.0.0',
  logLevel: 'info',
  corsEnabled: true,
  corsOrigin: '*'
};

// 转换为环境变量
process.env.API_PORT = cliConfig.apiPort?.toString() || '3000';
process.env.API_HOST = cliConfig.apiHost || '0.0.0.0';
process.env.LOG_LEVEL = cliConfig.logLevel || 'info';
process.env.CORS_ENABLED = cliConfig.corsEnabled?.toString() || 'true';
process.env.CORS_ORIGIN = cliConfig.corsOrigin || '*';
```

#### 6.2 历史记录迁移

CLI 历史记录格式转换为 API 格式：

```javascript
// 原有格式
const cliHistory = {
  "2025-01-01T12:00:00.000Z": {
    sql: "SELECT * FROM users",
    result: "..."
  }
};

// 转换为 API 格式
const apiHistory = {
  id: generateId(),
  timestamp: "2025-01-01T12:00:00.000Z",
  sql: "SELECT * FROM users",
  result: "...",
  type: 'cli_migration',
  metadata: {
    source: 'cli_migration',
    version: '1.0.0'
  }
};

// 迁移脚本示例
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

function migrateHistory() {
  const cliHistoryPath = '.sql-analyzer-history.json';
  const apiHistoryPath = './data/history.json';
  
  if (!fs.existsSync(cliHistoryPath)) {
    console.log('CLI 历史记录不存在，跳过迁移');
    return;
  }
  
  const cliHistory = JSON.parse(fs.readFileSync(cliHistoryPath, 'utf8'));
  const apiHistory = [];
  
  for (const [timestamp, entry] of Object.entries(cliHistory)) {
    apiHistory.push({
      id: uuidv4(),
      timestamp,
      sql: entry.sql,
      result: entry.result,
      type: 'cli_migration',
      metadata: {
        source: 'cli_migration',
        version: '1.0.0'
      }
    });
  }
  
  // 确保目录存在
  fs.mkdirSync('./data', { recursive: true });
  
  // 写入新格式
  fs.writeFileSync(apiHistoryPath, JSON.stringify(apiHistory, null, 2));
  
  console.log(`迁移了 ${apiHistory.length} 条历史记录`);
}
```

### 步骤 7: 验证迁移

#### 7.1 功能测试

```bash
# 健康检查
curl http://localhost:3000/api/health/ping

# API 文档访问
curl http://localhost:3000/api/docs/swagger

# SQL 分析测试
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM users"}'
```

#### 7.2 性能测试

```bash
# 使用 ab 进行压力测试
ab -n 1000 -c 10 http://localhost:3000/api/health/ping

# 使用 wrk 进行测试
wrk -t12 -c400 -d30s http://localhost:3000/api/health/ping
```

## 功能对比

| 功能 | CLI 模式 | API 模式 | 迁移说明 |
|------|-----------|----------|----------|
| SQL 分析 | ✅ | ✅ | 功能保留，通过 API 调用 |
| 批量分析 | ✅ | ✅ | 功能保留，通过批量 API |
| 知识库管理 | ✅ | ✅ | 功能保留，通过 API 管理 |
| 配置管理 | ✅ | ✅ | 功能保留，通过 API 管理 |
| 历史记录 | ✅ | ✅ | 功能保留，通过 API 访问 |
| 交互式界面 | ✅ | ❌ | 移除，可使用 Swagger UI |
| 命令行参数 | ✅ | ❌ | 移除，使用环境变量 |
| 本地文件操作 | ✅ | ❌ | 移除，使用 API 上传 |
| REST API | ✅ | ✅ | 功能增强 |
| Swagger 文档 | ❌ | ✅ | 新增，自动生成 |
| Docker 部署 | ❌ | ✅ | 新增，完整支持 |
| 健康检查 | ❌ | ✅ | 新增，多层次监控 |
| 请求限流 | ❌ | ✅ | 新增，内置中间件 |
| 结构化日志 | ❌ | ✅ | 新增，生产级日志 |

## API 端点映射

### 原有 CLI 命令到 API 端点

| CLI 命令 | API 端点 | 方法 | 说明 |
|-----------|-----------|------|------|
| `analyze` | `/api/analyze` | POST | 单个 SQL 分析 |
| `analyze --batch` | `/api/analyze/batch` | POST | 批量 SQL 分析 |
| `config get` | `/api/config/:key` | GET | 获取配置 |
| `config set` | `/api/config/:key` | PUT | 设置配置 |
| `config list` | `/api/config` | GET | 获取所有配置 |
| `history list` | `/api/history` | GET | 获取历史记录 |
| `history show` | `/api/history/:id` | GET | 获取历史详情 |
| `history stats` | `/api/history/stats` | GET | 获取历史统计 |
| `knowledge list` | `/api/knowledge` | GET | 获取知识库 |
| `knowledge search` | `/api/knowledge/search` | POST | 搜索知识库 |
| `knowledge learn` | `/api/knowledge/learn` | POST | 学习新知识 |
| `status` | `/api/status` | GET | 系统状态 |
| `api` | `/api/health` | GET | 健康检查 |

## 集成方式变更

### 1. 原有 CLI 集成

**原有方式**:
```bash
# 直接调用 CLI
sql-analyzer analyze --sql "SELECT * FROM users"

# 批量分析
sql-analyzer analyze --file ./queries.sql --batch
```

**新方式**:
```bash
# 使用 API
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM users"}'

# 批量分析
curl -X POST http://localhost:3000/api/analyze/batch \
  -H "Content-Type: application/json" \
  -d '{"sqls": [{"sql": "SELECT * FROM users"}]}'
```

### 2. CI/CD 集成

**原有方式**:
```yaml
# GitHub Actions
- name: Analyze SQL
  run: |
    sql-analyzer analyze --file ./query.sql --headless --threshold 80 --exit-code
```

**新方式**:
```yaml
# GitHub Actions
- name: Analyze SQL
  run: |
    response=$(curl -s -X POST http://localhost:3000/api/analyze \
      -H "Content-Type: application/json" \
      -d "{\"sql\": \"$(cat ./query.sql)\", \"options\": {\"performance\": true, \"security\": true, \"standards\": true}}")
    
    score=$(echo $response | jq -r '.data.overallScore')
    if [ "$score" -lt 80 ]; then
      echo "SQL quality check failed (score: $score)"
      exit 1
    fi
```

### 3. 应用程序集成

**原有方式**:
```javascript
// 调用 CLI
import { execSync } from 'child_process';

const result = execSync('sql-analyzer analyze --sql "SELECT * FROM users" --headless --format json');
const analysis = JSON.parse(result.toString());
```

**新方式**:
```javascript
// 调用 API
import fetch from 'node-fetch';

const response = await fetch('http://localhost:3000/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sql: 'SELECT * FROM users',
    options: { performance: true, security: true, standards: true }
  })
});

const analysis = await response.json();
```

## 部署方式变更

### 1. 原有部署方式

```bash
# CLI 模式部署
npm install -g sql-analyzer
sql-analyzer api --port 3000
```

### 2. 新部署方式

#### Docker 部署（推荐）

```bash
# 使用 Docker Compose
docker-compose up -d

# 或使用 Docker
docker run -d \
  --name sql-analyzer-api \
  -p 3000:3000 \
  -e NODE_ENV=production \
  sql-analyzer-api
```

#### 直接部署

```bash
# 安装依赖
bun install

# 配置环境变量
cp .env.example .env

# 启动服务
NODE_ENV=production bun run start
```

#### PM2 部署

```bash
# 使用 PM2
pm2 start ecosystem.config.js
```

## 回滚计划

如果迁移出现问题，可以按以下步骤回滚：

### 1. 停止 API 服务

```bash
# Docker 环境
docker stop sql-analyzer-api

# PM2 环境
pm2 stop sql-analyzer-api

# 直接运行
pkill -f "bun run src/server.js"
```

### 2. 恢复 CLI 模式

```bash
# 恢复 package.json
git checkout HEAD~1 -- package.json

# 恢复 CLI 代码
git checkout HEAD~1 -- src/cli/ src/services/ui/

# 重新安装依赖
bun install

# 恢复配置
cp src/config/config.json.backup src/config/config.json
```

### 3. 验证回滚

```bash
# 测试 CLI 功能
bun run src/index.js --help
bun run src/index.js analyze "SELECT * FROM users"
```

## 常见问题

### Q: 迁移后无法访问 API
A: 检查防火墙设置和端口配置，确保 3000 端口开放。

### Q: Docker 容器启动失败
A: 检查 Docker 日志：`docker logs sql-analyzer-api`，常见问题是权限或环境变量配置错误。

### Q: 性能下降
A: 检查日志级别设置，生产环境建议使用 `warn` 或 `error` 级别。

### Q: 内存使用过高
A: 调整限流配置和连接池设置，考虑添加 Redis 缓存。

### Q: 历史记录丢失
A: 确保运行了历史记录迁移脚本，检查 `./data/history.json` 文件。

### Q: 配置项不生效
A: 检查环境变量名称是否正确，参考 `.env.example` 文件。

## 迁移检查清单

### 迁移前

- [ ] 备份所有重要数据
- [ ] 记录当前配置
- [ ] 评估集成影响
- [ ] 准备回滚计划

### 迁移中

- [ ] 停止现有服务
- [ ] 更新项目结构
- [ ] 移除 CLI 相关代码
- [ ] 更新依赖
- [ ] 配置环境变量
- [ ] 迁移数据

### 迁移后

- [ ] 启动 API 服务
- [ ] 验证基本功能
- [ ] 测试 API 端点
- [ ] 检查性能指标
- [ ] 验证集成系统
- [ ] 更新文档

## 技术支持

如果在迁移过程中遇到问题，请：

1. 查看详细日志：`tail -f logs/api.log`
2. 检查健康状态：`curl http://localhost:3000/api/health/status`
3. 提交 Issue：[GitHub Issues](https://github.com/your-username/sql-analyzer-api/issues)
4. 联系技术支持：migration-support@example.com

## 总结

通过本迁移指南，您可以：

- ✅ 保留所有核心分析功能
- ✅ 增强API服务能力
- ✅ 简化部署和运维
- ✅ 提供完整的API文档
- ✅ 支持容器化部署
- ✅ 实现生产级监控

迁移完成后，您将拥有一个现代化、可扩展的 SQL 分析 API 服务，提供更好的性能、可靠性和可维护性。