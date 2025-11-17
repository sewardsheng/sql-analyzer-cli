# 通用SQL DBA静态规则配置

## 规则概述

本文档包含适用于大多数关系型数据库的通用DBA静态规则，这些规则是基于SQL最佳实践和生产环境经验总结的强制性要求。这些规则不针对特定数据库系统，而是适用于遵循SQL标准的关系型数据库。

---

## 查询性能规则

### 禁止全表扫描规则

#### 规则: SQL-GEN-001 - 禁止生产环境全表扫描
**严重级别**: 高  
**规则描述**: 禁止在生产环境执行全表扫描查询（除非表行数小于10000行）

**检测条件**:
- 执行计划显示全表扫描
- 预估扫描行数 > 10000
- 没有合适的WHERE条件

**违规示例**:
```sql
-- 违规: 全表扫描大表
SELECT * FROM orders;  

-- 违规: WHERE条件未使用索引
SELECT * FROM users WHERE YEAR(create_time) = 2023;

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

### 规则: SQL-GEN-002 - 禁止不带索引的JOIN操作
**严重级别**: 高  
**规则描述**: JOIN操作的关联字段必须建立索引

**检测条件**:
- 执行计划显示JOIN字段无索引
- 关联操作导致全表扫描
- 缺少适当的连接条件

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
CREATE INDEX idx_customer_id ON orders(customer_id);
SELECT o.*, c.name 
FROM orders o 
JOIN customers c ON o.customer_id = c.id;

-- 正确: 所有JOIN字段都有索引
CREATE INDEX idx_col1 ON table_b(col1);
CREATE INDEX idx_col2 ON table_c(col2);
SELECT a.*, b.*, c.*
FROM table_a a
JOIN table_b b ON a.col1 = b.col1
JOIN table_c c ON b.col2 = c.col2;
```

---

### 规则: SQL-GEN-003 - 禁止大偏移量分页查询
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

### 规则: SQL-GEN-004 - 禁止在索引列上使用函数
**严重级别**: 高  
**规则描述**: 禁止在WHERE、JOIN、ORDER BY子句的索引列上使用函数

**检测条件**:
- 索引列被函数包裹
- 导致索引失效

**违规示例**:
```sql
-- 违规: 在索引列使用日期函数
SELECT * FROM orders WHERE YEAR(create_time) = 2023;

-- 违规: 在索引列使用字符串函数
SELECT * FROM users WHERE UPPER(username) = 'ADMIN';

-- 违规: 在索引列进行计算
SELECT * FROM products WHERE price * 1.1 > 100;
```

**正确示例**:
```sql
-- 正确: 改写查询避免函数
SELECT * FROM orders 
WHERE create_time >= '2023-01-01' AND create_time < '2024-01-01';

-- 正确: 创建函数索引或在应用层处理
-- (注意: 函数索引在不同数据库中语法可能不同)
SELECT * FROM users WHERE UPPER(username) = 'ADMIN';

-- 正确: 改写计算表达式
SELECT * FROM products WHERE price > 100 / 1.1;
```

---

### 规则: SQL-GEN-005 - 禁止冗余索引
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

## 查询设计规则

### 规则: SQL-GEN-006 - 禁止SELECT *查询
**严重级别**: 中  
**规则描述**: 禁止在生产环境使用SELECT *查询，应明确指定所需列

**检测条件**:
- 查询中使用SELECT *
- 可能导致不必要的I/O和网络传输

**违规示例**:
```sql
-- 违规: 使用SELECT *
SELECT * FROM users WHERE id = 1;

-- 违规: 子查询中使用SELECT *
SELECT u.*, (SELECT * FROM orders WHERE user_id = u.id LIMIT 1) AS latest_order
FROM users u;
```

**正确示例**:
```sql
-- 正确: 明确指定所需列
SELECT id, username, email FROM users WHERE id = 1;

-- 正确: 子查询中明确指定列
SELECT u.id, u.username, u.email,
       (SELECT order_id, amount FROM orders WHERE user_id = u.id ORDER BY create_time DESC LIMIT 1) AS latest_order
FROM users u;
```

---

### 规则: SQL-GEN-007 - 禁止隐式类型转换
**严重级别**: 高  
**规则描述**: 禁止在查询条件中使用可能导致隐式类型转换的比较

**检测条件**:
- 不同数据类型的列与值比较
- 字符串列与数值比较
- 可能导致索引失效

**违规示例**:
```sql
-- 违规: 字符串列与数值比较
SELECT * FROM users WHERE phone = 1234567890;

-- 违规: 数值列与字符串比较
SELECT * FROM orders WHERE order_id = '12345';

-- 违规: 日期列与字符串比较
SELECT * FROM logs WHERE create_time = '2023-01-01';
```

**正确示例**:
```sql
-- 正确: 使用相同类型比较
SELECT * FROM users WHERE phone = '1234567890';

-- 正确: 使用相同类型比较
SELECT * FROM orders WHERE order_id = 12345;

-- 正确: 使用适当的日期格式或函数
SELECT * FROM logs WHERE create_time = CAST('2023-01-01' AS DATE);
-- 或者
SELECT * FROM logs WHERE create_time = DATE '2023-01-01';
```

---

### 规则: SQL-GEN-008 - 禁止在WHERE子句中使用OR连接不同列
**严重级别**: 中  
**规则描述**: 禁止在WHERE子句中使用OR连接不同列的条件，可能导致索引失效

**检测条件**:
- WHERE子句中使用OR连接不同列
- 可能导致全表扫描

**违规示例**:
```sql
-- 违规: 使用OR连接不同列
SELECT * FROM users WHERE username = 'admin' OR email = 'admin@example.com';

-- 违规: 多个OR条件
SELECT * FROM orders WHERE status = 'pending' OR amount > 1000 OR customer_id = 123;
```

**正确示例**:
```sql
-- 正确: 使用UNION ALL替代OR
SELECT * FROM users WHERE username = 'admin'
UNION ALL
SELECT * FROM users WHERE email = 'admin@example.com' AND username != 'admin';

-- 正确: 分解为多个查询
SELECT * FROM orders WHERE status = 'pending'
UNION ALL
SELECT * FROM orders WHERE amount > 1000 AND status != 'pending'
UNION ALL
SELECT * FROM orders WHERE customer_id = 123 AND status != 'pending' AND amount <= 1000;
```

---

## 事务与并发规则

### 规则: SQL-GEN-009 - 禁止长时间运行的事务
**严重级别**: 高  
**规则描述**: 禁止长时间运行的事务（超过5分钟），可能导致锁竞争和阻塞

**检测条件**:
- 事务执行时间超过5分钟
- 可能导致资源长时间占用

**违规示例**:
```sql
-- 违规: 长时间运行的事务
BEGIN;
-- 执行多个耗时操作
UPDATE large_table SET status = 'processing' WHERE id > 0;
SELECT * FROM another_large_table WHERE complex_conditions;
-- 更多耗时操作...
COMMIT;
```

**正确示例**:
```sql
-- 正确: 分解为多个小事务
BEGIN;
UPDATE large_table SET status = 'processing' WHERE id BETWEEN 1 AND 1000;
COMMIT;

BEGIN;
UPDATE large_table SET status = 'processing' WHERE id BETWEEN 1001 AND 2000;
COMMIT;

-- 或者使用批处理
BEGIN;
UPDATE large_table SET status = 'processing' WHERE id IN (1, 2, 3, ..., 100);
COMMIT;
```

---

### 规则: SQL-GEN-010 - 禁止在事务中等待用户输入
**严重级别**: 高  
**规则描述**: 禁止在事务中等待用户输入或外部响应

**检测条件**:
- 事务开始后等待用户输入
- 可能导致长时间持锁

**违规示例**:
```sql
-- 违规: 在事务中等待用户输入
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- 等待用户确认
-- 用户输入...
COMMIT;
```

**正确示例**:
```sql
-- 正确: 先收集所有输入，再执行事务
-- 收集用户输入
-- 用户输入...

-- 然后执行事务
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

---

## 数据完整性规则

### 规则: SQL-GEN-011 - 禁止缺少主键的表
**严重级别**: 高  
**规则描述**: 禁止创建没有主键的表

**检测条件**:
- 表定义中没有主键
- 可能导致数据重复和难以维护

**违规示例**:
```sql
-- 违规: 没有主键的表
CREATE TABLE user_logs (
    user_id INT,
    action VARCHAR(50),
    log_time TIMESTAMP
);
```

**正确示例**:
```sql
-- 正确: 添加主键
CREATE TABLE user_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,  -- 或 SERIAL, IDENTITY等
    user_id INT,
    action VARCHAR(50),
    log_time TIMESTAMP
);

-- 或者使用复合主键
CREATE TABLE user_logs (
    user_id INT,
    action VARCHAR(50),
    log_time TIMESTAMP,
    PRIMARY KEY (user_id, log_time)
);
```

---

### 规则: SQL-GEN-012 - 禁止使用过宽的表
**严重级别**: 中  
**规则描述**: 禁止创建列数过多的表（超过50列）

**检测条件**:
- 表定义中列数超过50
- 可能导致性能和维护问题

**违规示例**:
```sql
-- 违规: 列数过多的表
CREATE TABLE wide_table (
    id INT PRIMARY KEY,
    col1 VARCHAR(50), col2 VARCHAR(50), col3 VARCHAR(50), col4 VARCHAR(50), col5 VARCHAR(50),
    col6 VARCHAR(50), col7 VARCHAR(50), col8 VARCHAR(50), col9 VARCHAR(50), col10 VARCHAR(50),
    -- ... 继续定义到50列以上
    col51 VARCHAR(50), col52 VARCHAR(50), col53 VARCHAR(50)
);
```

**正确示例**:
```sql
-- 正确: 分解为多个相关表
CREATE TABLE main_table (
    id INT PRIMARY KEY,
    name VARCHAR(50),
    -- 基本信息列
    -- ...
);

CREATE TABLE extended_info (
    id INT PRIMARY KEY,
    main_table_id INT,
    col1 VARCHAR(50),
    col2 VARCHAR(50),
    -- 扩展信息列
    FOREIGN KEY (main_table_id) REFERENCES main_table(id)
);
```

---

## 安全规则

### 规则: SQL-GEN-013 - 禁止明文存储敏感数据
**严重级别**: 高  
**规则描述**: 禁止以明文形式存储密码、信用卡号等敏感数据

**检测条件**:
- 敏感数据列未加密
- 可能导致数据泄露风险

**违规示例**:
```sql
-- 违规: 明文存储密码
CREATE TABLE users (
    id INT PRIMARY KEY,
    username VARCHAR(50),
    password VARCHAR(100),  -- 明文存储密码
    credit_card VARCHAR(20)  -- 明文存储信用卡号
);
```

**正确示例**:
```sql
-- 正确: 加密存储敏感数据
CREATE TABLE users (
    id INT PRIMARY KEY,
    username VARCHAR(50),
    password_hash VARCHAR(100),  -- 存储密码哈希
    credit_card_encrypted VARCHAR(100)  -- 存储加密的信用卡号
);
```

---

### 规则: SQL-GEN-014 - 禁止使用动态SQL拼接
**严重级别**: 高  
**规则描述**: 禁止直接拼接用户输入构造SQL语句，防止SQL注入

**检测条件**:
- 直接拼接用户输入构造SQL
- 可能导致SQL注入风险

**违规示例**:
```sql
-- 违规: 直接拼接SQL
-- 伪代码示例
sql = "SELECT * FROM users WHERE username = '" + userInput + "'";
```

**正确示例**:
```sql
-- 正确: 使用参数化查询
-- 伪代码示例
sql = "SELECT * FROM users WHERE username = ?";
execute(sql, [userInput]);
```

---

## 性能监控规则

### 规则: SQL-GEN-015 - 禁止缺少统计信息的表
**严重级别**: 中  
**规则描述**: 禁止对缺少统计信息的表执行复杂查询

**检测条件**:
- 表缺少统计信息
- 可能导致查询优化器选择错误的执行计划

**违规示例**:
```sql
-- 违规: 在没有统计信息的表上执行复杂查询
SELECT * FROM large_table a
JOIN another_large_table b ON a.id = b.a_id
WHERE a.status = 'active' AND b.create_time > '2023-01-01';
```

**正确示例**:
```sql
-- 正确: 先更新统计信息
-- 语法因数据库而异
ANALYZE TABLE large_table;
ANALYZE TABLE another_large_table;

-- 然后执行查询
SELECT * FROM large_table a
JOIN another_large_table b ON a.id = b.a_id
WHERE a.status = 'active' AND b.create_time > '2023-01-01';
```

---

## 规则实施建议

1. **定期审查**: 定期审查SQL代码，确保符合规则要求
2. **自动化检查**: 使用静态分析工具自动检查SQL代码
3. **代码审查**: 将SQL规则纳入代码审查流程
4. **培训开发**: 对开发人员进行SQL最佳实践培训
5. **监控执行**: 监控规则执行情况，及时调整规则

---

## 数据库特定规则

虽然本规则集专注于通用SQL规则，但不同数据库系统可能有特定的最佳实践：

- **MySQL**: 关注InnoDB存储引擎特性、索引优化
- **PostgreSQL**: 利用高级索引类型、查询优化器特性
- **Oracle**: 考虑执行计划稳定性、分区策略
- **SQL Server**: 利用查询提示、索引视图
- **SQLite**: 注意事务模式、WAL模式优化

建议结合数据库特定的DBA规则一起使用，以获得最佳效果。