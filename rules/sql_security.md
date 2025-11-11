# SQL安全规则

## 1. SQL注入防护

### 1.1 使用参数化查询
```sql
-- 不推荐（容易受到SQL注入攻击）
String sql = "SELECT * FROM users WHERE name = '" + userName + "'";

-- 推荐（使用参数化查询）
String sql = "SELECT * FROM users WHERE name = ?";
PreparedStatement stmt = connection.prepareStatement(sql);
stmt.setString(1, userName);
```

### 1.2 输入验证
- 验证所有用户输入
- 使用白名单而非黑名单
- 限制输入长度

### 1.3 最小权限原则
- 应用程序只应具有必要的数据库权限
- 避免使用SA或root账户
- 为不同功能创建不同的数据库用户

## 2. 敏感数据处理

### 2.1 敏感数据加密
```sql
-- 加密存储敏感信息
INSERT INTO users (name, email, phone_encrypted) 
VALUES ('张三', 'zhangsan@example.com', AES_ENCRYPT('13800138000', 'secret_key'));
```

### 2.2 日志安全
- 避免在日志中记录敏感信息
- 对日志文件进行访问控制
- 定期清理旧日志

## 3. 数据库连接安全

### 3.1 连接字符串安全
- 不要在代码中硬编码连接字符串
- 使用配置文件或环境变量存储连接信息
- 对配置文件进行加密

### 3.2 连接池配置
- 设置合理的连接超时时间
- 限制最大连接数
- 监控连接池使用情况