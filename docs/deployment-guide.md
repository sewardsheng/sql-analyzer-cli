# 部署指南

本文档介绍SQL Analyzer CLI的部署流程和健康检查功能。

## 目录

- [快速部署](#快速部署)
- [增强部署脚本](#增强部署脚本)
- [健康检查](#健康检查)
- [故障排除](#故障排除)
- [回滚机制](#回滚机制)

## 快速部署

### 基本部署

```bash
# 克隆项目
git clone <repository-url>
cd sql-analyzer-cli

# 安装依赖
npm install

# 运行健康检查
npm run health

# 启动API服务
npm run api
```

### 生产环境部署

```bash
# 使用增强部署脚本
node scripts/deploy.js
```

## 增强部署脚本

### 功能特性

增强部署脚本 (`scripts/deploy.js`) 提供以下功能：

1. **环境检查** - 验证Node.js版本、内存、磁盘空间
2. **依赖验证** - 检查package.json和node_modules
3. **配置验证** - 验证配置文件和规则目录
4. **自动备份** - 创建部署前备份
5. **数据库连接测试** - 验证数据库配置
6. **健康检查** - 部署后系统状态验证
7. **回滚机制** - 失败时自动回滚

### 使用方法

```bash
# 执行完整部署流程
node scripts/deploy.js

# 或者通过npm脚本
npm run deploy
```

### 部署阶段

#### Phase 1: 环境检查
- Node.js版本验证 (需要v14+)
- npm版本检查
- 可用内存检查
- 磁盘空间验证

#### Phase 2: 依赖验证
- package.json存在性检查
- node_modules完整性验证
- 关键依赖包验证

#### Phase 3: 配置验证
- 环境配置文件检查
- 规则目录验证
- Prompt文件完整性检查

#### Phase 4: 创建备份
- 自动创建时间戳备份
- 备份关键文件和目录
- 保留最近5个备份

#### Phase 5: 数据库连接测试
- 验证各数据库配置
- 测试连接可用性

#### Phase 6: 执行部署
- 运行测试套件
- 构建项目（如果需要）

#### Phase 7: 健康检查
- CLI命令可用性测试
- 核心模块加载验证
- API服务状态检查

## 健康检查

### CLI健康检查

#### 完整健康检查

```bash
# 执行所有健康检查
sql-analyzer health

# 显示详细输出
sql-analyzer health --verbose

# JSON格式输出
sql-analyzer health --json

# 保存结果到文件
sql-analyzer health --output health-report.json
```

#### 特定检查类型

```bash
# 检查核心模块
sql-analyzer health --check core-modules

# 检查配置文件
sql-analyzer health --check configuration

# 检查规则文件
sql-analyzer health --check rules

# 检查依赖包
sql-analyzer health --check dependencies

# 检查内存使用
sql-analyzer health --check memory

# 检查磁盘空间
sql-analyzer health --check disk-space
```

### API健康检查

#### 基本健康检查

```bash
# 完整健康检查
curl http://localhost:3000/api/health

# 简单ping检查
curl http://localhost:3000/api/health/ping

# 服务状态信息
curl http://localhost:3000/api/health/status
```

#### 特定检查类型

```bash
# 检查核心模块
curl http://localhost:3000/api/health/check/core-modules

# 检查配置文件
curl http://localhost:3000/api/health/check/configuration
```

### 健康检查项目

| 检查类型 | 描述 | 关键性 |
|---------|------|--------|
| core-modules | 核心模块加载检查 | ✅ 关键 |
| configuration | 配置文件完整性 | ✅ 关键 |
| rules | 规则文件检查 | ✅ 关键 |
| prompts | Prompt文件检查 | ✅ 关键 |
| dependencies | 依赖包验证 | ⚠️ 非关键 |
| memory | 内存使用检查 | ⚠️ 非关键 |
| disk-space | 磁盘空间检查 | ⚠️ 非关键 |

### 健康状态

- **healthy** - 所有检查通过
- **degraded** - 有非关键检查失败
- **unhealthy** - 有关键检查失败
- **error** - 检查执行出错

## 故障排除

### 常见问题

#### 1. Node.js版本过低

```
❌ Node.js版本过低: v12.18.0，需要v14或更高版本
```

**解决方案：**
```bash
# 使用nvm升级Node.js
nvm install 18
nvm use 18
```

#### 2. 依赖包缺失

```
❌ node_modules目录不存在，需要运行npm install
```

**解决方案：**
```bash
npm install
```

#### 3. 配置文件缺失

```
❌ 关键配置文件缺失: package.json
```

**解决方案：**
```bash
# 恢复备份或重新初始化项目
node scripts/deploy.js --rollback
```

#### 4. 内存不足

```
⚠️ 可用内存较低: 0.5GB
```

**解决方案：**
- 释放系统内存
- 增加系统内存
- 关闭不必要的进程

#### 5. 磁盘空间不足

```
⚠️ 项目目录较大，建议清理
```

**解决方案：**
```bash
# 清理备份
rm -rf .backup/backup-*

# 清理日志文件
rm -f *.log

# 清理node_modules并重新安装
rm -rf node_modules
npm install
```

### API服务问题

#### API服务无法启动

```bash
# 检查端口占用
netstat -an | grep :3000

# 检查配置
sql-analyzer config show

# 查看详细日志
sql-analyzer api --verbose
```

#### 健康检查失败

```bash
# 检查API服务状态
curl http://localhost:3000/api/health/ping

# 查看详细错误信息
curl http://localhost:3000/api/health
```

## 回滚机制

### 自动回滚

部署失败时，脚本会自动执行回滚：

```bash
❌ 部署失败: 健康检查失败
🔄 开始回滚...
  ✓ 已恢复: package.json
  ✓ 已恢复: src/core/
  ✓ 已恢复: src/cli/
✅ 回滚完成
```

### 手动回滚

```bash
# 查看可用备份
ls -la .backup/

# 手动回滚到指定备份
node scripts/deploy.js --rollback backup-2025-11-18T12-00-00-000Z
```

### 备份管理

```bash
# 查看备份信息
cat .backup/backup-2025-11-18T12-00-00-000Z/backup-info.json

# 清理旧备份（保留最近5个）
node scripts/deploy.js --cleanup

# 删除所有备份
rm -rf .backup/
```

## 监控和维护

### 定期健康检查

建议设置定期健康检查：

```bash
# 每日健康检查
0 9 * * * cd /path/to/sql-analyzer-cli && npm run health >> /var/log/health.log 2>&1

# 每周完整部署检查
0 2 * * 0 cd /path/to/sql-analyzer-cli && npm run deploy >> /var/log/deploy.log 2>&1
```

### 日志监控

```bash
# 查看部署日志
tail -f /var/log/deploy.log

# 查看健康检查日志
tail -f /var/log/health.log

# 查看API服务日志
tail -f /var/log/sql-analyzer-api.log
```

### 性能监控

```bash
# 监控内存使用
watch -n 5 'ps aux | grep sql-analyzer'

# 监控磁盘使用
df -h /path/to/sql-analyzer-cli

# 监控API响应时间
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/health/ping
```

## 配置建议

### 生产环境配置

```bash
# 设置环境变量
export NODE_ENV=production
export API_PORT=3000
export API_HOST=0.0.0.0

# 使用PM2管理进程
pm2 start src/index.js --name sql-analyzer --env production

# 设置日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### 安全配置

```bash
# 限制API访问
export API_CORS_ORIGIN="https://yourdomain.com"

# 启用HTTPS
export API_SSL=true
export API_SSL_CERT=/path/to/cert.pem
export API_SSL_KEY=/path/to/key.pem

# 设置访问日志
export API_ACCESS_LOG=/var/log/sql-analyzer-access.log
```

## 总结

通过使用增强部署脚本和健康检查功能，可以确保SQL Analyzer CLI的稳定部署和运行。定期执行健康检查和监控可以及时发现和解决问题，保证系统的可靠性。

如有问题，请参考故障排除部分或查看详细日志信息。