# SQL Analyzer API 安装指南

## 概述

本指南详细介绍如何在不同环境中安装和配置 SQL Analyzer API 服务。SQL Analyzer API 是一个纯 API 服务，提供 SQL 语句的智能分析功能。

## 系统要求

### 最低配置
- **CPU**: 2 核心
- **内存**: 4GB RAM
- **存储**: 20GB 可用空间
- **网络**: 稳定的互联网连接

### 推荐配置
- **CPU**: 4 核心或更多
- **内存**: 8GB RAM 或更多
- **存储**: 50GB SSD
- **网络**: 高带宽连接

### 软件依赖
- **Node.js**: 18.0.0 或更高版本
- **Bun**: 1.0.0 或更高版本（推荐）
- **Docker**: 20.10.0 或更高版本（可选）
- **Docker Compose**: 2.0.0 或更高版本（可选）

## 安装方式

### 方式 1: 直接安装

#### 1. 克隆项目

```bash
git clone https://github.com/your-username/sql-analyzer-api.git
cd sql-analyzer-api
```

#### 2. 安装 Bun（推荐）

```bash
# 使用官方安装脚本
curl -fsSL https://bun.sh/install | bash

# 或使用包管理器
# macOS
brew install bun

# Windows
powershell -c "irm bun.sh/install.ps1 | iex"

# Linux
wget -qO- https://bun.sh/install | bash
```

#### 3. 安装依赖

```bash
bun install
```

#### 4. 配置环境变量

```bash
# 复制示例配置文件
cp .env.example .env

# 编辑配置文件
nano .env
```

#### 5. 验证安装

```bash
# 开发模式启动
bun run dev

# 或生产模式启动
bun run start
```

### 方式 2: Docker 安装

#### 1. 使用 Docker Compose（推荐）

```bash
# 克隆项目
git clone https://github.com/your-username/sql-analyzer-api.git
cd sql-analyzer-api

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

#### 2. 使用 Docker

```bash
# 拉取镜像
docker pull sql-analyzer-api:latest

# 或构建镜像
docker build -t sql-analyzer-api .

# 运行容器
docker run -d \
  --name sql-analyzer-api \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e CUSTOM_API_KEY=your_api_key \
  sql-analyzer-api
```

## 环境配置

### 基础配置

创建 `.env` 文件并配置以下变量：

```env
# 基础配置
NODE_ENV=production
API_HOST=0.0.0.0
API_PORT=3000

# 日志配置
LOG_LEVEL=info                    # debug, info, warn, error
LOG_REQUEST_BODY=false             # 是否记录请求体
LOG_FILE_PATH=./logs/api.log      # 日志文件路径

# CORS 配置
CORS_ENABLED=true
CORS_ORIGIN=*                   # 或指定域名：https://example.com

# 限流配置
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100          # 每个时间窗口的请求数
RATE_LIMIT_WINDOW=900000          # 时间窗口（毫秒），15分钟

# 安全配置
API_KEY_REQUIRED=false            # 是否需要 API 密钥
API_KEY=your-secret-key          # API 密钥
```

### LLM 配置

```env
# 自定义API基础URL
CUSTOM_BASE_URL=https://api.openai.com/v1
# API密钥
CUSTOM_API_KEY=your_api_key_here
# 模型名称
CUSTOM_MODEL=deepseek-ai/DeepSeek-V3.1
# 嵌入模型名称
CUSTOM_EMBEDDING_MODEL=BAAI/bge-m3

# 向量存储配置
# 向量存储API密钥（如果不设置，将使用CUSTOM_API_KEY）
VECTOR_STORE_API_KEY=
# 向量存储基础URL（如果不设置，将使用CUSTOM_BASE_URL）
VECTOR_STORE_BASE_URL=
# 向量存储嵌入模型（如果不设置，将使用CUSTOM_EMBEDDING_MODEL）
VECTOR_STORE_EMBEDDING_MODEL=
```

### 数据库配置（可选）

```env
# PostgreSQL 配置（如果使用外部数据库）
DATABASE_URL=postgresql://user:password@localhost:5432/sql_analyzer

# Redis 配置（可选，用于缓存）
REDIS_URL=redis://localhost:6379
```

### 监控配置

```env
# 健康检查配置
HEALTH_CHECK_ENABLED=true

# 指标收集配置
METRICS_ENABLED=false             # 是否启用指标收集
METRICS_PORT=9090               # 指标端口
```

## 验证安装

### 1. 健康检查

```bash
# 基本健康检查
curl http://localhost:3000/api/health/ping

# 详细健康状态
curl http://localhost:3000/api/health/status

# 系统组件检查
curl http://localhost:3000/api/health/check/system
```

### 2. API 测试

```bash
# 测试 SQL 分析
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

### 3. 文档访问

```bash
# 访问 Swagger 文档
open http://localhost:3000/api/docs/swagger

# 访问 OpenAPI 规范
curl http://localhost:3000/api/docs/doc
```

## 目录结构

安装完成后，项目目录结构如下：

```
sql-analyzer-api/
├── src/                       # 源代码
│   ├── server.js              # 服务器入口点
│   ├── middleware/            # 中间件系统
│   ├── services/              # 服务层
│   ├── core/                 # 核心业务逻辑
│   └── utils/                # 工具类
├── docs/                     # 文档
├── rules/                    # 分析规则
├── scripts/                  # 脚本
├── logs/                     # 日志文件（运行时创建）
├── data/                     # 数据文件（运行时创建）
├── .env                      # 环境变量配置
├── .env.example              # 环境变量示例
├── package.json              # 项目配置
├── bun.lockb                # 依赖锁定文件
├── Dockerfile               # Docker 配置
└── docker-compose.yml       # Docker Compose 配置
```

## 常见问题

### 问题 1: Bun 安装失败

**解决方案**:
```bash
# 清理缓存
rm -rf ~/.bun

# 重新安装
curl -fsSL https://bun.sh/install | bash

# 更新 PATH
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
```

### 问题 2: 端口被占用

**解决方案**:
```bash
# 查找占用端口的进程
lsof -i :3000

# 或使用 netstat
netstat -tulpn | grep :3000

# 终止进程
kill -9 <PID>

# 或更改端口
export API_PORT=3001
```

### 问题 3: 依赖安装失败

**解决方案**:
```bash
# 清理缓存
bun pm cache rm

# 删除 node_modules
rm -rf node_modules

# 重新安装
bun install
```

### 问题 4: API 密钥配置错误

**解决方案**:
```bash
# 检查配置
cat .env | grep API_KEY

# 测试连接
curl -H "Authorization: Bearer your-api-key" \
  http://localhost:3000/api/health/ping
```

### 问题 5: Docker 容器启动失败

**解决方案**:
```bash
# 查看日志
docker logs sql-analyzer-api

# 检查配置
docker-compose config

# 重新构建
docker-compose build --no-cache
```

## 性能优化

### 1. 内存优化

```env
# 设置 Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=2048"

# 启用垃圾回收优化
NODE_OPTIONS="--expose-gc --max-old-space-size=2048"
```

### 2. 并发优化

```env
# 设置工作线程数
WORKER_THREADS=4

# 启用集群模式
CLUSTER_MODE=true
```

### 3. 缓存优化

```env
# 启用 Redis 缓存
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379

# 设置缓存过期时间
CACHE_TTL=3600
```

## 安全配置

### 1. API 密钥

```env
# 启用 API 密钥认证
API_KEY_REQUIRED=true
API_KEY=your-secure-random-key-here

# 或使用环境变量生成
API_KEY=$(openssl rand -hex 32)
```

### 2. HTTPS 配置

```env
# 启用 HTTPS
HTTPS_ENABLED=true
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
```

### 3. 防火墙配置

```bash
# UFW (Ubuntu)
sudo ufw allow 3000/tcp
sudo ufw enable

# iptables
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
sudo iptables-save

# firewalld (CentOS)
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## 监控和日志

### 1. 日志配置

```env
# 日志级别
LOG_LEVEL=info

# 日志文件路径
LOG_FILE_PATH=./logs/api.log

# 日志轮转
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5

# 是否记录请求体
LOG_REQUEST_BODY=false
```

### 2. 监控配置

```env
# 启用指标收集
METRICS_ENABLED=true
METRICS_PORT=9090

# 健康检查间隔
HEALTH_CHECK_INTERVAL=30000
```

### 3. 日志查看

```bash
# 实时查看日志
tail -f logs/api.log

# 使用 Docker 查看日志
docker-compose logs -f sql-analyzer-api

# 使用 journalctl（systemd）
sudo journalctl -u sql-analyzer-api -f
```

## 升级指南

### 1. 备份数据

```bash
# 备份配置
cp .env .env.backup

# 备份数据
cp -r data data.backup

# 备份日志
cp -r logs logs.backup
```

### 2. 更新代码

```bash
# 拉取最新代码
git pull origin main

# 更新依赖
bun install

# 重新构建（如果需要）
bun run build
```

### 3. 重启服务

```bash
# 使用 Docker Compose
docker-compose down
docker-compose up -d

# 或直接重启
pm2 restart sql-analyzer-api
```

## 故障排除

### 1. 服务无法启动

**检查步骤**:
```bash
# 检查端口占用
netstat -tlnp | grep :3000

# 检查配置文件
cat .env

# 查看错误日志
tail -f logs/api.log

# 检查依赖
bun list
```

### 2. 性能问题

**检查步骤**:
```bash
# 检查系统资源
top
htop
free -h

# 检查进程
ps aux | grep node

# 检查网络
ss -tulpn | grep :3000
```

### 3. 内存泄漏

**检查步骤**:
```bash
# 监控内存使用
watch -n 1 'ps aux | grep node'

# 生成堆快照
kill -USR2 <PID>

# 使用 PM2 监控
pm2 monit
```

## 下一步

安装完成后，您可以：

1. 阅读 [API 文档](./api.md) 了解所有可用的 API 端点
2. 查看 [使用指南](./usage.md) 学习如何使用 API
3. 参考 [部署指南](./deployment-guide.md) 了解生产环境部署
4. 查看 [架构文档](./architecture-summary.md) 了解系统架构

## 技术支持

如果您在安装过程中遇到问题：

1. 查看 [常见问题](#常见问题) 部分
2. 搜索 [Issues](https://github.com/your-username/sql-analyzer-api/issues)
3. 创建新的 [Issue](https://github.com/your-username/sql-analyzer-api/issues/new)
4. 联系技术支持：support@example.com