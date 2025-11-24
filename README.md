# SQL Analyzer API

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Bun Version](https://img.shields.io/badge/bun-%3E%3D1.0.0-black)](https://bun.sh/)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://www.docker.com/)

SQL Analyzer API 是一个高性能的 SQL 语句智能分析与扫描服务，提供 RESTful API 接口，支持多种数据库的 SQL 分析、性能优化建议、安全审计和编码规范检查。

## 🚀 特性

- **纯 API 服务**：完全基于 RESTful API 的架构，易于集成和部署
- **多数据库支持**：MySQL、PostgreSQL、SQLite、SQL Server、Oracle、ClickHouse
- **智能分析**：基于 AI 的 SQL 性能优化、安全审计和编码规范检查
- **批量处理**：支持单条和批量 SQL 分析
- **知识库管理**：可扩展的规则学习和知识库系统
- **历史记录**：完整的分析历史记录和统计
- **中间件系统**：CORS、限流、日志、错误处理等企业级功能
- **健康检查**：多层次的健康监控和状态检查
- **容器化部署**：Docker 和 Docker Compose 支持
- **API 文档**：自动生成的 Swagger/OpenAPI 文档

## 📋 系统要求

- **Node.js**: 18.0.0 或更高版本
- **Bun**: 1.0.0 或更高版本（推荐）
- **内存**: 最低 4GB，推荐 8GB
- **存储**: 最低 20GB 可用空间

## 🛠️ 技术栈

- **运行时**: Bun 1.0+
- **Web 框架**: Hono 4.x
- **API 文档**: Swagger/OpenAPI 3.0
- **容器化**: Docker + Docker Compose
- **日志**: 结构化日志系统
- **限流**: 内置请求限流中间件

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/sql-analyzer-api.git
cd sql-analyzer-api
```

### 2. 安装依赖

```bash
bun install
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，配置 API 密钥等
```

### 4. 启动服务

```bash
# 开发环境
bun run dev

# 生产环境
bun run start
```

### 5. 验证服务

```bash
# 健康检查
curl http://localhost:3000/api/health/ping

# API 文档
open http://localhost:3000/api/docs/swagger
```

## 🐳 Docker 部署

### 使用 Docker Compose（推荐）

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 使用 Docker

```bash
# 构建镜像
docker build -t sql-analyzer-api .

# 运行容器
docker run -d \
  --name sql-analyzer-api \
  -p 3000:3000 \
  -e NODE_ENV=production \
  sql-analyzer-api
```

## 📖 API 使用示例

### SQL 分析

```bash
# 分析单个 SQL
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

### 批量分析

```bash
# 批量分析多个 SQL
curl -X POST http://localhost:3000/api/analyze/batch \
  -H "Content-Type: application/json" \
  -d '{
    "sqls": [
      {"sql": "SELECT * FROM users"},
      {"sql": "SELECT * FROM orders"}
    ],
    "options": {
      "performance": true,
      "security": true,
      "standards": true
    }
  }'
```

### 历史记录

```bash
# 获取历史记录
curl http://localhost:3000/api/history

# 获取历史记录详情
curl http://localhost:3000/api/history/123
```

## 📚 API 文档

- **Swagger UI**: http://localhost:3000/api/docs/swagger
- **OpenAPI 规范**: http://localhost:3000/api/docs/doc
- **API 根路径**: http://localhost:3000/

## ⚙️ 配置

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `development` |
| `API_HOST` | 服务器主机 | `0.0.0.0` |
| `API_PORT` | 服务器端口 | `3000` |
| `CUSTOM_API_KEY` | LLM API 密钥 | - |
| `CUSTOM_MODEL` | LLM 模型名称 | `deepseek-ai/DeepSeek-V3.1` |
| `LOG_LEVEL` | 日志级别 | `info` |
| `CORS_ENABLED` | 是否启用 CORS | `true` |
| `CORS_ORIGIN` | CORS 允许的源 | `*` |
| `RATE_LIMIT_ENABLED` | 是否启用限流 | `true` |
| `RATE_LIMIT_REQUESTS` | 限流请求数 | `100` |
| `RATE_LIMIT_WINDOW` | 限流时间窗口(ms) | `900000` |

### 配置示例

```env
# 基础配置
NODE_ENV=production
API_HOST=0.0.0.0
API_PORT=3000

# LLM 配置
CUSTOM_API_KEY=your_api_key_here
CUSTOM_MODEL=deepseek-ai/DeepSeek-V3.1
CUSTOM_BASE_URL=https://api.openai.com/v1

# 日志配置
LOG_LEVEL=info

# CORS 配置
CORS_ENABLED=true
CORS_ORIGIN=*

# 限流配置
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=900000
```

## 🔧 开发

### 项目结构

```
sql-analyzer-api/
├── src/
│   ├── server.js              # 服务器入口点
│   ├── middleware/            # 中间件系统
│   ├── services/              # 服务层
│   │   ├── api/              # API 服务
│   │   ├── analysis/         # 分析服务
│   │   ├── config/           # 配置管理
│   │   ├── health/           # 健康检查
│   │   └── knowledge/        # 知识库服务
│   ├── core/                 # 核心业务逻辑
│   └── utils/                # 工具类
├── docs/                     # 文档
├── rules/                    # 分析规则
├── scripts/                  # 脚本
├── Dockerfile               # Docker 配置
├── docker-compose.yml       # Docker Compose 配置
└── package.json             # 项目配置
```

### 开发命令

```bash
# 开发模式（热重载）
bun run dev

# 生产模式
bun run start

# 构建
bun run build

# 测试
bun run test

# 代码检查
bun run lint

# Docker 构建
bun run docker:build

# Docker 运行
bun run docker:run
```

## 📊 监控和日志

### 健康检查

```bash
# 基本健康检查
curl http://localhost:3000/api/health/ping

# 详细健康状态
curl http://localhost:3000/api/health/status

# 系统组件检查
curl http://localhost:3000/api/health/check/system
```

### 日志

```bash
# 查看实时日志
tail -f logs/api.log

# Docker 日志
docker-compose logs -f sql-analyzer-api
```

## 🔒 安全

- **请求限流**: 防止 API 滥用
- **CORS 配置**: 跨域请求控制
- **输入验证**: 严格的请求参数验证
- **错误处理**: 统一的错误处理和响应格式
- **API 密钥**: 可选的 API 密钥认证

## 🤝 贡献

欢迎贡献代码！请查看 [贡献指南](CONTRIBUTING.md) 了解详细信息。

### 开发流程

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

如果您遇到问题或有疑问：

1. 查看 [文档](./docs/)
2. 搜索 [Issues](https://github.com/your-username/sql-analyzer-api/issues)
3. 创建新的 [Issue](https://github.com/your-username/sql-analyzer-api/issues/new)

## 🗺️ 路线图

- [ ] 支持更多数据库类型
- [ ] 添加 GraphQL API
- [ ] 实现分布式缓存
- [ ] 添加 API 版本控制
- [ ] 支持插件系统
- [ ] 添加 Webhook 支持

## 📈 性能

- **响应时间**: 平均 < 2s（单个 SQL 分析）
- **并发处理**: 支持高并发请求
- **内存使用**: 优化的内存管理
- **缓存**: 智能结果缓存

---

**SQL Analyzer API** - 让 SQL 分析更简单、更智能！