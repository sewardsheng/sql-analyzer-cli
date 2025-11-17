# SQLite DBA 静态规则配置

## 规则概述

本文档包含传统DBA预先配置的SQLite静态规则，这些规则是基于SQLite特性和最佳实践总结的强制性要求。

---

## 查询性能规则

### 规则: SQLITE-001 - 禁止全表扫描规则

#### 规则: SQLITE-001 - 禁止生产环境全表扫描
**严重级别**: 高  
**规则描述**: 禁止在生产环境执行全表扫描查询（除非表行数小于10000行）

**检测条件**:
- EXPLAIN QUERY PLAN结果中SCAN TABLE（无索引）
- 预估扫描行数 > 10000
- 没有合适的WHERE条件

**违规示例**:
```sql
-- 违规: 全表扫描大表
SELECT * FROM orders;  

-- 违规: WHERE条件未使用索引
SELECT * FROM users WHERE substr(create_time, 1, 4) = '2023';

-- 违规: 模糊查询以通配符开头
SELECT * FROM products WHERE name LIKE '%phone';
```

**正确示例**:
```sql
-- 正确: 使用索引列作为条件
SELECT * FROM orders WHERE order_id = 123;

-- 正确: 避免在索引列使用函数
SELECT * FROM users WHERE create_time >= '2023-01-01' AND create_time < '2024-01-01';

-- 正确: 模糊查询不以通配符开头
SELECT * FROM products WHERE name LIKE 'phone%';
```

**例外情况**:
- 小表查询（行数 < 10000）
- 统计分析查询（需要显式标注）
- 临时表或中间表查询

---

### 规则: SQLITE-002 - 禁止不带索引的JOIN操作
**严重级别**: 高  
**规则描述**: JOIN操作的关联字段必须建立索引

**检测条件**:
- EXPLAIN QUERY PLAN结果显示JOIN字段无索引
- 使用了嵌套循环连接而非索引查找
- 扫描整个表进行连接

**违规示例**:
```sql
-- 违规: customer_id没有索引
SELECT o.*, c.name 
FROM orders o 
JOIN customers c ON o.customer_id = c.id;

-- 违规: 多个JOIN条件都没有索引
SELECT a.*, b.*, c.*
FROM table_a a
JOIN table_b b ON a.col1 = b.col1
JOIN table_c c ON b.col2 = c.col2;
```

**正确示例**:
```sql
-- 正确: 先创建索引再JOIN
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_customers_id ON customers(id);
SELECT o.*, c.name 
FROM orders o 
JOIN customers c ON o.customer_id = c.id;

-- 正确: 所有JOIN字段都有索引
CREATE INDEX idx_table_b_col1 ON table_b(col1);
CREATE INDEX idx_table_c_col2 ON table_c(col2);
SELECT a.*, b.*, c.*
FROM table_a a
JOIN table_b b ON a.col1 = b.col1
JOIN table_c c ON b.col2 = c.col2;
```

---

### 规则: SQLITE-003 - 禁止大偏移量分页查询
**严重级别**: 中  
**规则描述**: 禁止使用大偏移量的LIMIT分页（OFFSET > 10000）

**检测条件**:
- LIMIT语句的OFFSET值 > 10000
- 可能导致性能问题

**违规示例**:
```sql
-- 违规: 大偏移量分页
SELECT * FROM orders ORDER BY create_time DESC LIMIT 100000, 20;

-- 违规: 偏移量过大
SELECT * FROM users LIMIT 50000, 100;
```

**正确示例**:
```sql
-- 正确: 使用游标分页
SELECT * FROM orders 
WHERE id < 90000 
ORDER BY id DESC 
LIMIT 20;

-- 正确: 使用书签方式分页
SELECT * FROM orders 
WHERE create_time < '2023-12-01 00:00:00' 
ORDER BY create_time DESC 
LIMIT 20;
```

---

## 索引使用规则

### 规则: SQLITE-004 - 禁止在索引列上使用函数
**严重级别**: 高  
**规则描述**: 禁止在WHERE、JOIN、ORDER BY子句的索引列上使用函数

**检测条件**:
- 索引列被函数包裹
- 导致索引失效

**违规示例**:
```sql
-- 违规: 在索引列使用日期函数
SELECT * FROM orders WHERE substr(create_time, 1, 4) = '2023';

-- 违规: 在索引列使用字符串函数
SELECT * FROM users WHERE upper(username) = 'ADMIN';

-- 违规: 在索引列进行计算
SELECT * FROM products WHERE price * 1.1 > 100;
```

**正确示例**:
```sql
-- 正确: 改写查询避免函数
SELECT * FROM orders 
WHERE create_time >= '2023-01-01' AND create_time < '2024-01-01';

-- 正确: 创建表达式索引
CREATE INDEX idx_upper_username ON users(upper(username));
SELECT * FROM users WHERE upper(username) = 'ADMIN';

-- 正确: 改写计算表达式
SELECT * FROM products WHERE price > 100 / 1.1;
```

---

### 规则: SQLITE-005 - 禁止冗余索引
**严重级别**: 中  
**规则描述**: 禁止创建功能重复或冗余的索引

**检测条件**:
- 索引列完全相同
- 单列索引与复合索引重复
- 索引前缀重复

**违规示例**:
```sql
-- 违规: 完全重复的索引
CREATE INDEX idx_name1 ON users(username);
CREATE INDEX idx_name2 ON users(username);

-- 违规: 单列索引被复合索引包含
CREATE INDEX idx_user ON orders(user_id);
CREATE INDEX idx_user_time ON orders(user_id, create_time);  -- user_id索引冗余

-- 违规: 前缀重复
CREATE INDEX idx_abc ON table1(a, b, c);
CREATE INDEX idx_ab ON table1(a, b);  -- 冗余
```

**正确示例**:
```sql
-- 正确: 只创建必要的索引
CREATE INDEX idx_user_time ON orders(user_id, create_time);

-- 正确: 根据查询模式创建不同的复合索引
CREATE INDEX idx_user_status ON orders(user_id, status);
CREATE INDEX idx_status_time ON orders(status, create_time);
```

---

### 规则: SQLITE-006 - 合理使用部分索引
**严重级别**: 中  
**规则描述**: 对于有明确条件过滤的表，应使用部分索引减少索引大小

**检测条件**:
- 表中有大量无效数据但仍创建全表索引
- 可以使用WHERE条件限制索引范围

**违规示例**:
```sql
-- 违规: 为整个大表创建索引，包括无效数据
CREATE INDEX idx_orders_status ON orders(status);

-- 违规: 为软删除数据创建索引
CREATE INDEX idx_users_active ON users(is_active);
```

**正确示例**:
```sql
-- 正确: 使用部分索引只索引有效数据
CREATE INDEX idx_orders_active_status ON orders(status) WHERE is_deleted = 0;

-- 正确: 只索引活跃用户
CREATE INDEX idx_users_active_name ON users(name) WHERE is_active = 1;
```

---

## 事务与并发规则

### 规则: SQLITE-007 - 避免长时间事务
**严重级别**: 高  
**规则描述**: 避免长时间运行的事务，特别是在WAL模式下

**检测条件**:
- 事务中包含大量操作
- 事务中有用户交互等待
- 事务运行时间超过30秒

**违规示例**:
```sql
-- 违规: 长时间事务
BEGIN TRANSACTION;
-- 大量INSERT/UPDATE操作
INSERT INTO logs (...) VALUES (...);
INSERT INTO logs (...) VALUES (...);
-- ... 数千条操作 ...
COMMIT;

-- 违规: 事务中有等待
BEGIN TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- 等待用户确认
-- 用户输入...
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

**正确示例**:
```sql
-- 正确: 分批提交事务
BEGIN TRANSACTION;
INSERT INTO logs (...) VALUES (...);
INSERT INTO logs (...) VALUES (...);
-- 每1000条提交一次
COMMIT;
BEGIN TRANSACTION;
-- 下一批...
COMMIT;

-- 正确: 避免事务中等待
-- 先获取用户确认
confirmed = get_user_confirmation();
IF confirmed THEN
    BEGIN TRANSACTION;
    UPDATE accounts SET balance = balance - 100 WHERE id = 1;
    UPDATE accounts SET balance = balance + 100 WHERE id = 2;
    COMMIT;
END IF;
```

---

### 规则: SQLITE-008 - 正确设置WAL模式
**严重级别**: 中  
**规则描述**: 对于并发访问场景，应启用WAL模式提高并发性能

**检测条件**:
- 多线程/多进程访问但未启用WAL模式
- 频繁的读写冲突

**违规示例**:
```sql
-- 违规: 默认的DELETE模式，并发性能差
-- 未设置PRAGMA journal_mode=WAL
```

**正确示例**:
```sql
-- 正确: 启用WAL模式提高并发性能
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;  -- 平衡性能与安全性
PRAGMA cache_size=10000;    -- 增大缓存
```

---

## 表设计规则

### 规则: SQLITE-009 - 合理定义主键
**严重级别**: 高  
**规则描述**: 每个表都应有明确的主键定义

**检测条件**:
- 表没有定义主键
- 依赖隐式rowid作为主键

**违规示例**:
```sql
-- 违规: 没有定义主键
CREATE TABLE users (
    name TEXT,
    email TEXT,
    age INTEGER
);

-- 违规: 复合表没有主键
CREATE TABLE order_items (
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    price REAL
);
```

**正确示例**:
```sql
-- 正确: 定义明确的主键
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    age INTEGER
);

-- 正确: 复合表定义复合主键
CREATE TABLE order_items (
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    price REAL,
    PRIMARY KEY (order_id, product_id)
);
```

---

### 规则: SQLITE-010 - 避免过宽的表
**严重级别**: 中  
**规则描述**: 避免创建包含过多列的表

**检测条件**:
- 表列数超过50列
- 包含大量冗余或稀疏数据

**违规示例**:
```sql
-- 违规: 表包含过多列
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    country TEXT,
    -- ... 继续添加40多个字段 ...
    hobby_1 TEXT,
    hobby_2 TEXT,
    -- ...
    note_50 TEXT
);
```

**正确示例**:
```sql
-- 正确: 将相关数据分离到不同表
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT
);

CREATE TABLE user_addresses (
    user_id INTEGER,
    address_type TEXT,  -- 'shipping', 'billing', etc.
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    country TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE user_hobbies (
    user_id INTEGER,
    hobby_name TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

### 规则: SQLITE-011 - 合理使用外键约束
**严重级别**: 中  
**规则描述**: 启用外键约束保证数据完整性

**检测条件**:
- 有外键关系但未启用外键约束
- 存在孤立数据

**违规示例**:
```sql
-- 违规: 未启用外键约束
PRAGMA foreign_keys=OFF;  -- 默认值

CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    total REAL,
    -- 没有外键约束
    -- FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**正确示例**:
```sql
-- 正确: 启用外键约束
PRAGMA foreign_keys=ON;

CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    total REAL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 数据类型规则

### 规则: SQLITE-012 - 正确选择数据类型
**严重级别**: 中  
**规则描述**: 根据数据特性选择合适的存储类型

**检测条件**:
- 使用不合适的数据类型
- 浪费存储空间

**违规示例**:
```sql
-- 违规: 使用TEXT存储数字
CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT,
    price TEXT  -- 应使用REAL或INTEGER
);

-- 违规: 使用INTEGER存储日期
CREATE TABLE events (
    id INTEGER PRIMARY KEY,
    name TEXT,
    event_date TEXT  -- 应使用TEXT日期格式或INTEGER时间戳
);
```

**正确示例**:
```sql
-- 正确: 使用合适的数据类型
CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT,
    price REAL
);

CREATE TABLE events (
    id INTEGER PRIMARY KEY,
    name TEXT,
    event_date TEXT  -- ISO8601格式: 'YYYY-MM-DD HH:MM:SS'
    -- 或者使用INTEGER存储Unix时间戳
    -- event_timestamp INTEGER
);
```

---

### 规则: SQLITE-013 - 避免使用BLOB存储大数据
**严重级别**: 中  
**规则描述**: 避免在数据库中直接存储大型二进制数据

**检测条件**:
- BLOB字段存储大于1MB的数据
- 影响数据库性能和备份

**违规示例**:
```sql
-- 违规: 直接在数据库中存储大文件
CREATE TABLE documents (
    id INTEGER PRIMARY KEY,
    name TEXT,
    content BLOB  -- 存储整个文件内容
);
```

**正确示例**:
```sql
-- 正确: 存储文件路径或引用
CREATE TABLE documents (
    id INTEGER PRIMARY KEY,
    name TEXT,
    file_path TEXT,  -- 存储文件路径
    file_size INTEGER,
    mime_type TEXT
);

-- 或者存储小文件的哈希值
CREATE TABLE documents (
    id INTEGER PRIMARY KEY,
    name TEXT,
    file_hash TEXT,  -- 文件内容的哈希值
    file_size INTEGER,
    mime_type TEXT
);
```

---

## 查询优化规则

### 规则: SQLITE-014 - 避免SELECT *
**严重级别**: 中  
**规则描述**: 避免使用SELECT *查询，只获取需要的列

**检测条件**:
- 使用SELECT *查询
- 获取不需要的列数据

**违规示例**:
```sql
-- 违规: 获取所有列
SELECT * FROM users WHERE id = 1;

-- 违规: 子查询中使用SELECT *
SELECT u.name, (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
FROM users u;
```

**正确示例**:
```sql
-- 正确: 只获取需要的列
SELECT id, name, email FROM users WHERE id = 1;

-- 正确: 子查询中只获取需要的列
SELECT u.name, (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
FROM users u;
```

---

### 规则: SQLITE-015 - 合理使用子查询
**严重级别**: 中  
**规则描述**: 避免使用低效的子查询，考虑使用JOIN替代

**检测条件**:
- 使用相关子查询
- 子查询在WHERE子句中

**违规示例**:
```sql
-- 违规: 相关子查询
SELECT u.name, 
       (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
FROM users u;

-- 违规: WHERE子句中的子查询
SELECT * FROM products 
WHERE id IN (SELECT product_id FROM order_items WHERE quantity > 5);
```

**正确示例**:
```sql
-- 正确: 使用LEFT JOIN替代相关子查询
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;

-- 正确: 使用JOIN替代子查询
SELECT DISTINCT p.* 
FROM products p
JOIN order_items oi ON p.id = oi.product_id
WHERE oi.quantity > 5;
```

---

## 安全规则

### 规则: SQLITE-016 - 防止SQL注入
**严重级别**: 高  
**规则描述**: 使用参数化查询防止SQL注入攻击

**检测条件**:
- 直接拼接SQL语句
- 未使用参数绑定

**违规示例**:
```sql
-- 违规: 直接拼接SQL
sql = "SELECT * FROM users WHERE name = '" + username + "'";
-- 或者
sql = "SELECT * FROM users WHERE id = " + user_id;
```

**正确示例**:
```sql
-- 正确: 使用参数化查询
-- Python示例
cursor.execute("SELECT * FROM users WHERE name = ?", (username,));
cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,));

-- Java示例
PreparedStatement stmt = conn.prepareStatement("SELECT * FROM users WHERE name = ?");
stmt.setString(1, username);
ResultSet rs = stmt.executeQuery();
```

---

### 规则: SQLITE-017 - 加密敏感数据
**严重级别**: 高  
**规则描述**: 对敏感数据进行加密存储

**检测条件**:
- 明文存储密码
- 明文存储敏感个人信息

**违规示例**:
```sql
-- 违规: 明文存储密码
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT,
    password TEXT,  -- 明文密码
    email TEXT,
    credit_card TEXT  -- 明文信用卡号
);
```

**正确示例**:
```sql
-- 正确: 存储密码哈希值
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT,
    password_hash TEXT,  -- 存储哈希值，如bcrypt
    salt TEXT,            -- 密码盐值
    email TEXT,
    encrypted_data TEXT   -- 加密存储的敏感数据
);
```

---

## 备份与恢复规则

### 规则: SQLITE-018 - 定期备份数据库
**严重级别**: 高  
**规则描述**: 建立定期备份机制，确保数据安全

**检测条件**:
- 没有定期备份计划
- 备份文件未验证

**违规示例**:
```bash
# 违规: 没有备份计划
# 仅依赖单个数据库文件
```

**正确示例**:
```bash
# 正确: 定期备份脚本
#!/bin/bash
# 每日备份脚本
DB_PATH="/path/to/database.db"
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份
sqlite3 $DB_PATH ".backup $BACKUP_DIR/backup_$DATE.db"

# 保留最近30天的备份
find $BACKUP_DIR -name "backup_*.db" -mtime +30 -delete

# 验证备份完整性
sqlite3 $BACKUP_DIR/backup_$DATE.db "PRAGMA integrity_check;"
```

---

### 规则: SQLITE-019 - 使用适当的备份策略
**严重级别**: 中  
**规则描述**: 根据应用场景选择合适的备份方法

**检测条件**:
- 对活跃数据库使用文件复制备份
- 未考虑WAL模式下的备份

**违规示例**:
```bash
# 违规: 直接复制活跃数据库文件
cp /path/to/active.db /path/to/backup.db
```

**正确示例**:
```bash
# 正确: 使用SQLite备份API
sqlite3 /path/to/database.db ".backup /path/to/backup.db"

# 或者使用VACUUM INTO
sqlite3 /path/to/database.db "VACUUM INTO '/path/to/backup.db'"

# 对于WAL模式数据库，确保备份包含WAL文件
sqlite3 /path/to/database.db "PRAGMA wal_checkpoint(TRUNCATE);"
sqlite3 /path/to/database.db ".backup /path/to/backup.db"
```

---

## 性能监控规则

### 规则: SQLITE-020 - 监控数据库性能
**严重级别**: 中  
**规则描述**: 定期检查数据库性能指标

**检测条件**:
- 未设置性能监控
- 数据库性能下降未及时发现

**违规示例**:
```sql
-- 违规: 没有性能监控
-- 没有定期检查查询性能
```

**正确示例**:
```sql
-- 正确: 定期检查查询计划
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE user_id = 123;

-- 正确: 检查数据库统计信息
PRAGMA table_info(orders);
PRAGMA index_list(orders);
PRAGMA index_info(idx_orders_user_id);

-- 正确: 检查数据库页面缓存命中率
PRAGMA cache_size;
PRAGMA page_size;
PRAGMA page_count;

-- 正确: 定期检查数据库完整性
PRAGMA integrity_check;
```

---

## 总结

以上规则涵盖了SQLite数据库使用的主要方面，包括查询性能、索引使用、事务管理、表设计、数据类型、查询优化、安全、备份恢复和性能监控。遵循这些规则可以显著提高SQLite数据库的性能、安全性和可靠性。

在实际应用中，应根据具体业务需求和数据特性，灵活应用这些规则，并定期审查和优化数据库设计和查询。