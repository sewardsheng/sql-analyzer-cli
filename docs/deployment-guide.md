# SQL Analyzer API 部署指南

## 概述

本指南详细介绍如何在不同环境中部署 SQL Analyzer API 服务，包括 Docker、云平台和传统服务器部署。SQL Analyzer API 是一个纯 API 服务，专注于提供 SQL 语句的智能分析功能。

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

## 环境配置

### 环境变量

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

# LLM 配置
CUSTOM_API_KEY=your_api_key_here
CUSTOM_MODEL=deepseek-ai/DeepSeek-V3.1
CUSTOM_BASE_URL=https://api.openai.com/v1
CUSTOM_EMBEDDING_MODEL=BAAI/bge-m3

# 向量存储配置
VECTOR_STORE_API_KEY=
VECTOR_STORE_BASE_URL=
VECTOR_STORE_EMBEDDING_MODEL=

# 数据库配置（如果使用外部数据库）
DATABASE_URL=postgresql://user:password@localhost:5432/sql_analyzer
REDIS_URL=redis://localhost:6379     # 可选，用于缓存

# 监控配置
HEALTH_CHECK_ENABLED=true
METRICS_ENABLED=false             # 是否启用指标收集
```

## Docker 部署

### 1. 使用 Dockerfile

```bash
# 克隆项目
git clone https://github.com/your-username/sql-analyzer-api.git
cd sql-analyzer-api

# 构建镜像
docker build -t sql-analyzer-api .

# 运行容器
docker run -d \
  --name sql-analyzer-api \
  -p 3000:3000 \
  --restart unless-stopped \
  -e NODE_ENV=production \
  -e API_HOST=0.0.0.0 \
  -e API_PORT=3000 \
  -e CUSTOM_API_KEY=your_api_key_here \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/data:/app/data \
  sql-analyzer-api
```

### 2. 使用 Docker Compose

```bash
# 克隆项目
git clone https://github.com/your-username/sql-analyzer-api.git
cd sql-analyzer-api

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 3. 生产环境 Docker 配置

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  sql-analyzer-api:
    image: sql-analyzer-api:latest
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=warn
      - RATE_LIMIT_REQUESTS=200
      - CUSTOM_API_KEY=${CUSTOM_API_KEY}
    volumes:
      - /var/log/sql-analyzer:/app/logs
      - /opt/sql-analyzer/data:/app/data
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    healthcheck:
      test: ["CMD", "bun", "run", "healthcheck"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # 可选：添加Redis用于缓存和会话存储
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # 可选：添加PostgreSQL用于数据持久化
  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=sql_analyzer
      - POSTGRES_USER=sql_analyzer
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sql_analyzer"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  redis-data:
  postgres-data:

networks:
  default:
    driver: bridge
```

## 云平台部署

### 1. AWS ECS

#### 创建 ECS 任务定义

```json
{
  "family": "sql-analyzer-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "sql-analyzer-api",
      "image": "your-account.dkr.ecr.region.amazonaws.com/sql-analyzer-api:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "API_HOST",
          "value": "0.0.0.0"
        },
        {
          "name": "CUSTOM_API_KEY",
          "value": "${CUSTOM_API_KEY}"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/sql-analyzer-api",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/api/health/ping || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

#### 部署命令

```bash
# 创建 ECR 仓库
aws ecr create-repository --repository-name sql-analyzer-api

# 推送镜像
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin your-account.dkr.ecr.us-west-2.amazonaws.com
docker tag sql-analyzer-api:latest your-account.dkr.ecr.us-west-2.amazonaws.com/sql-analyzer-api:latest
docker push your-account.dkr.ecr.us-west-2.amazonaws.com/sql-analyzer-api:latest

# 创建服务
aws ecs create-service \
  --cluster sql-analyzer-cluster \
  --service-name sql-analyzer-api \
  --task-definition sql-analyzer-api \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}" \
  --load-balancer targetGroupArn=arn:aws:elasticloadbalancing:region:account:targetgroup/sql-analyzer-api,containerName=sql-analyzer-api,containerPort=3000
```

### 2. Google Cloud Run

```bash
# 构建并推送镜像
gcloud builds submit --tag gcr.io/PROJECT_ID/sql-analyzer-api .

# 部署到 Cloud Run
gcloud run deploy sql-analyzer-api \
  --image gcr.io/PROJECT_ID/sql-analyzer-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 1 \
  --set-env-vars NODE_ENV=production,LOG_LEVEL=info,CUSTOM_API_KEY=$CUSTOM_API_KEY \
  --set-cloudsql-instances INSTANCE_CONNECTION_NAME
```

### 3. Azure Container Instances

```bash
# 创建资源组
az group create --name sql-analyzer-rg --location eastus

# 创建容器注册表
az acr create --resource-group sql-analyzer-rg --name sqlanalyzeracr --sku Basic

# 构建并推送镜像
az acr build --registry sqlanalyzeracr --image sql-analyzer-api .

# 创建容器实例
az container create \
  --resource-group sql-analyzer-rg \
  --name sql-analyzer-api \
  --image sqlanalyzeracr.azurecr.io/sql-analyzer-api:latest \
  --cpu 1 \
  --memory 2 \
  --ports 3000 \
  --environment-variables \
    NODE_ENV=production \
    API_HOST=0.0.0.0 \
    CUSTOM_API_KEY=$CUSTOM_API_KEY \
  --dns-name-label sql-analyzer-api-unique
```

## 传统服务器部署

### 1. 直接部署

```bash
# 安装 Bun
curl -fsSL https://bun.sh/install | bash

# 克隆项目
git clone https://github.com/your-username/sql-analyzer-api.git
cd sql-analyzer-api

# 安装依赖
bun install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 构建项目
bun run build

# 启动服务
NODE_ENV=production bun run start
```

### 2. 使用 PM2

```bash
# 安装 PM2
npm install -g pm2

# 创建 PM2 配置文件
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'sql-analyzer-api',
    script: 'src/server.js',
    interpreter: 'bun',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      API_HOST: '0.0.0.0',
      API_PORT: 3000,
      CUSTOM_API_KEY: process.env.CUSTOM_API_KEY
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

# 启动服务
pm2 start ecosystem.config.js

# 保存配置
pm2 save

# 设置开机自启
pm2 startup
```

### 3. 使用 Systemd

```bash
# 创建服务文件
sudo tee /etc/systemd/system/sql-analyzer-api.service > /dev/null <<EOF
[Unit]
Description=SQL Analyzer API
After=network.target

[Service]
Type=simple
User=sql-analyzer
Group=sql-analyzer
WorkingDirectory=/opt/sql-analyzer-api
Environment=NODE_ENV=production
Environment=API_HOST=0.0.0.0
Environment=API_PORT=3000
Environment=CUSTOM_API_KEY=${CUSTOM_API_KEY}
ExecStart=/usr/local/bin/bun run src/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sql-analyzer-api

# 安全设置
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/sql-analyzer-api/logs /opt/sql-analyzer-api/data

[Install]
WantedBy=multi-user.target
EOF

# 创建用户和目录
sudo useradd -r -s /bin/false sql-analyzer
sudo mkdir -p /opt/sql-analyzer-api/{logs,data}
sudo chown -R sql-analyzer:sql-analyzer /opt/sql-analyzer-api

# 启用并启动服务
sudo systemctl daemon-reload
sudo systemctl enable sql-analyzer-api
sudo systemctl start sql-analyzer-api

# 检查状态
sudo systemctl status sql-analyzer-api
```

## 负载均衡配置

### 1. Nginx 反向代理

```nginx
# /etc/nginx/sites-available/sql-analyzer-api
server {
    listen 80;
    server_name api.yourdomain.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    # SSL 配置
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    
    # 日志
    access_log /var/log/nginx/sql-analyzer-api.access.log;
    error_log /var/log/nginx/sql-analyzer-api.error.log;
    
    # 限制请求大小
    client_max_body_size 10M;
    
    # 超时设置
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 健康检查
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
    }
    
    # API 文档
    location /api/docs/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 2. HAProxy 配置

```haproxy
# /etc/haproxy/haproxy.cfg
global
    daemon
    maxconn 4096
    log stdout format raw local0
    
defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms
    option httplog
    option dontlognull
    
frontend sql_analyzer_frontend
    bind *:80
    bind *:443 ssl crt /path/to/certificate.pem
    redirect scheme https if !{ ssl_fc }
    default_backend sql_analyzer_backend
    
    # ACL for health checks
    acl is_health_check path_beg /api/health
    use_backend health_backend if is_health_check
    
backend sql_analyzer_backend
    balance roundrobin
    option httpchk GET /api/health/ping
    server api1 127.0.0.1:3000 check
    server api2 127.0.0.1:3001 check
    server api3 127.0.0.1:3002 check
    
    # 健康检查配置
    option httpchk GET /api/health/ping
    http-check expect status 200
    
backend health_backend
    server health 127.0.0.1:3000 check
```

## 监控和日志

### 1. 健康检查

```bash
# 基本健康检查
curl -f http://localhost:3000/api/health/ping || exit 1

# 详细健康状态
curl http://localhost:3000/api/health/status | jq .

# 系统资源检查
curl http://localhost:3000/api/health/check/system | jq .
```

### 2. 日志管理

```bash
# 查看实时日志
tail -f logs/api.log

# 使用 journalctl（systemd）
sudo journalctl -u sql-analyzer-api -f

# 使用 PM2 日志
pm2 logs sql-analyzer-api

# 日志轮转配置
sudo tee /etc/logrotate.d/sql-analyzer-api > /dev/null <<EOF
/opt/sql-analyzer-api/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 sql-analyzer sql-analyzer
    postrotate
        systemctl reload sql-analyzer-api
    endscript
}
EOF
```

### 3. 指标收集

```bash
# Prometheus 配置
# 添加到 prometheus.yml
scrape_configs:
  - job_name: 'sql-analyzer-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 15s

# Grafana 仪表板
# 导入预配置的仪表板模板
```

## 安全配置

### 1. 防火墙设置

```bash
# UFW (Ubuntu)
sudo ufw allow 3000/tcp
sudo ufw allow 22/tcp
sudo ufw enable

# iptables
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -j DROP
sudo iptables-save

# firewalld (CentOS)
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --reload
```

### 2. SSL/TLS 配置

```nginx
# Nginx SSL 配置
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    
    # 其他安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### 3. API 密钥认证

```env
# 启用 API 密钥
API_KEY_REQUIRED=true
API_KEY=your-secure-random-key-here

# 或使用环境变量文件
echo "API_KEY=$(openssl rand -hex 32)" >> .env
```

## 性能优化

### 1. 缓存配置

```javascript
// Redis 缓存配置
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  db: 0,
  password: process.env.REDIS_PASSWORD
});

// 缓存分析结果
async function cacheAnalysisResult(sql, result) {
  const key = `analysis:${crypto.createHash('md5').update(sql).digest('hex')}`;
  await client.setex(key, 3600, JSON.stringify(result)); // 1小时过期
}
```

### 2. 连接池配置

```javascript
// 数据库连接池
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 3. 集群模式

```javascript
// PM2 集群配置
module.exports = {
  apps: [{
    name: 'sql-analyzer-api',
    script: 'src/server.js',
    interpreter: 'bun',
    instances: 'max', // 使用所有 CPU 核心
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

## 故障排除

### 常见问题

#### 1. 服务无法启动

```bash
# 检查端口占用
netstat -tlnp | grep :3000

# 检查权限
ls -la /opt/sql-analyzer-api/

# 检查日志
journalctl -u sql-analyzer-api --no-pager

# 检查配置
cat /opt/sql-analyzer-api/.env
```

#### 2. 性能问题

```bash
# 检查系统资源
top
htop
free -h
df -h

# 检查网络
ss -tulpn | grep :3000

# 检查进程
ps aux | grep node
```

#### 3. 内存泄漏

```bash
# 监控内存使用
pm2 monit

# 生成堆快照
kill -USR2 <pid>

# 检查内存趋势
watch -n 1 'ps aux | grep node | grep -v grep'
```

## 备份和恢复

### 1. 数据备份

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/sql-analyzer-$DATE"

mkdir -p $BACKUP_DIR

# 备份配置
cp -r /opt/sql-analyzer-api/.env $BACKUP_DIR/

# 备份数据
cp -r /opt/sql-analyzer-api/data $BACKUP_DIR/

# 备份日志
cp -r /opt/sql-analyzer-api/logs $BACKUP_DIR/

# 压缩备份
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
rm -rf $BACKUP_DIR

echo "备份完成: $BACKUP_DIR.tar.gz"
```

### 2. 灾难恢复

```bash
#!/bin/bash
# restore.sh
BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "用法: $0 <backup_file.tar.gz>"
    exit 1
fi

# 停止服务
sudo systemctl stop sql-analyzer-api

# 解压备份
tar -xzf $BACKUP_FILE -C /tmp/

# 恢复文件
sudo cp -r /tmp/sql-analyzer-*/.env /opt/sql-analyzer-api/
sudo cp -r /tmp/sql-analyzer-*/data/* /opt/sql-analyzer-api/data/

# 设置权限
sudo chown -R sql-analyzer:sql-analyzer /opt/sql-analyzer-api/

# 启动服务
sudo systemctl start sql-analyzer-api

echo "恢复完成"
```

## 生产环境最佳实践

### 1. 安全加固

```bash
# 禁用 root 登录
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# 更改 SSH 端口
sudo sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config

# 配置 fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 2. 监控告警

```bash
# 设置监控脚本
cat > /opt/sql-analyzer-api/monitor.sh << 'EOF'
#!/bin/bash
HEALTH_CHECK=$(curl -s http://localhost:3000/api/health/ping)
if [[ "$HEALTH_CHECK" != *"pong"* ]]; then
    echo "API 服务异常" | mail -s "SQL Analyzer API 告警" admin@example.com
fi
EOF

chmod +x /opt/sql-analyzer-api/monitor.sh

# 添加到 crontab
echo "*/5 * * * * /opt/sql-analyzer-api/monitor.sh" | crontab -
```

### 3. 自动更新

```bash
# 创建更新脚本
cat > /opt/sql-analyzer-api/update.sh << 'EOF'
#!/bin/bash
cd /opt/sql-analyzer-api

# 备份当前版本
./backup.sh

# 拉取最新代码
git pull origin main

# 更新依赖
bun install

# 重启服务
sudo systemctl restart sql-analyzer-api

echo "更新完成"
EOF

chmod +x /opt/sql-analyzer-api/update.sh
```

## 总结

通过本部署指南，您可以：

- ✅ 在多种环境中部署 API 服务
- ✅ 实现高可用和负载均衡
- ✅ 配置监控和日志管理
- ✅ 确保安全性和性能
- ✅ 建立备份和恢复机制

选择适合您需求的部署方式，并按照相应的步骤进行操作。对于生产环境，建议使用 Docker 或云平台部署，并配置适当的监控和备份策略。