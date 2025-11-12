# 使用指南

## 命令概览

SQL Analyzer CLI 提供了以下主要命令：

- `analyze` - 分析 SQL 查询
- `config` - 管理配置
- `history` - 查看历史记录
- `api` - 启动 API 服务器
- `knowledge` - 知识库管理

## 分析 SQL 查询

### 基本用法

```bash
sql-analyzer analyze "SELECT * FROM users WHERE id = 1"
```

### 从文件分析

```bash
sql-analyzer analyze -f path/to/query.sql
```

### 指定数据库类型

```bash
sql-analyzer analyze -d postgresql "SELECT * FROM users"
```

### 输出格式

```bash
# 表格格式（默认）
sql-analyzer analyze "SELECT * FROM users"

# JSON 格式
sql-analyzer analyze --format json "SELECT * FROM users"
```

## 配置管理

### 交互式配置

```bash
sql-analyzer config
```

### 设置配置项

```bash
sql-analyzer config
```

## 历史记录

### 查看历史记录列表

```bash
sql-analyzer history list
```

### 查看历史记录详情

```bash
sql-analyzer history detail <id>
```

### 删除历史记录

```bash
sql-analyzer history delete <id>
```

### 清空所有历史记录

```bash
sql-analyzer history clear
```

### 查看历史记录统计

```bash
sql-analyzer history stats
```

## API 服务器

### 启动 API 服务器

```bash
sql-analyzer api
```

### 指定端口

```bash
sql-analyzer api --port 8080
```

### 指定主机

```bash
sql-analyzer api --host 0.0.0.0
```

## 知识库管理

### 学习文档

```bash
sql-analyzer learn
```

### 重置知识库

```bash
sql-analyzer learn --reset
```

### 查看知识库状态

```bash
# 基本状态显示
sql-analyzer status

# 交互模式显示状态（支持返回主菜单）
sql-analyzer status --interactive
```

## 常见用例

### 1. 分析复杂查询

```bash
sql-analyzer analyze -s "
WITH user_stats AS (
  SELECT 
    user_id,
    COUNT(*) as total_orders,
    SUM(amount) as total_spent
  FROM orders
  WHERE created_at >= '2023-01-01'
  GROUP BY user_id
)
SELECT 
  u.name,
  us.total_orders,
  us.total_spent
FROM users u
JOIN user_stats us ON u.id = us.user_id
WHERE us.total_spent > 1000
ORDER BY us.total_spent DESC
LIMIT 10
"
```

### 2. 启动API服务器并测试
```bash
# 启动API服务器
sql-analyzer api --port 8080

# 在另一个终端测试API

# 使用 curl
curl.exe -X POST http://localhost:8080/api/analyze `
  -H "Content-Type: application/json" `
  -d '{"sql": "SELECT * FROM users WHERE id = 1", "databaseType": "mysql"}'
```

## 最佳实践

1. **定期更新知识库**：使用 `sql-analyzer learn` 命令更新知识库，以获得最新的 SQL 分析能力。

2. **使用适当的数据库类型**：指定正确的数据库类型可以提供更准确的分析结果。

3. **合理使用历史记录**：定期清理不必要的历史记录，使用 `sql-analyzer history stats` 查看使用情况。

4. **配置 API 密钥**：将 API 密钥存储在配置中，避免在命令行中暴露。

5. **使用 JSON 格式进行脚本处理**：当需要在脚本中处理分析结果时，使用 `--format json` 选项。