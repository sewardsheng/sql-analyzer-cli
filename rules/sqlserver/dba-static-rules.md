# SQL Server DBA 静态规则配置

## 规则概述

本文档包含传统DBA预先配置的SQL Server静态规则，这些规则是基于最佳实践和生产环境经验总结的强制性要求。

---

## 查询性能规则

### 禁止全表扫描规则

#### 规则: SS-001 - 禁止生产环境全表扫描
**严重级别**: 高  
**规则描述**: 禁止在生产环境执行全表扫描查询（除非表行数小于10000行）

**检测条件**:
- 执行计划显示"Table Scan"
- 预估扫描行数 > 10000
- 没有合适的WHERE条件或索引

**违规示例**:
```sql
-- 违规: 全表扫描大表
SELECT * FROM orders;

-- 违规: WHERE条件未使用索引
SELECT * FROM users WHERE YEAR(create_time) = 2023;

-- 违规: 模糊查询以通配符开头
SELECT * FROM products WHERE name LIKE '%phone';

-- 违规: 使用!=导致全表扫描
SELECT * FROM orders WHERE status != 'Completed';
```

**正确示例**:
```sql
-- 正确: 使用索引列作为条件
SELECT * FROM orders WHERE order_id = 123;

-- 正确: 避免在索引列使用函数
SELECT * FROM users 
WHERE create_time >= '2023-01-01' 
AND create_time < '2024-01-01';

-- 正确: 模糊查询不以通配符开头
SELECT * FROM products WHERE name LIKE 'phone%';

-- 正确: 使用正向条件
SELECT * FROM orders WHERE status = 'Pending';
```

**例外情况**:
- 小表查询（行数 < 10000）
- 统计分析查询（需要显式标注）
- 临时表查询

---

### 规则: SS-002 - 禁止不带索引的JOIN操作
**严重级别**: 高  
**规则描述**: JOIN操作的关联字段必须建立索引

**检测条件**:
- 执行计划显示"Hash Match"或"Nested Loops"但无索引使用
- JOIN字段上没有索引
- 查询性能差

**违规示例**:
```sql
-- 违规: customer_id没有索引
SELECT o.*, c.name 
FROM orders o 
JOIN customers c ON o.customer_id = c.id;

-- 违规: 多表JOIN无索引
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

### 规则: SS-003 - 禁止大偏移量分页查询
**严重级别**: 中  
**规则描述**: 禁止使用大偏移量的OFFSET FETCH分页（OFFSET > 10000）

**检测条件**:
- OFFSET FETCH的OFFSET值 > 10000
- 可能导致性能问题

**违规示例**:
```sql
-- 违规: 大偏移量分页
SELECT * FROM orders 
ORDER BY create_time DESC 
OFFSET 100000 ROWS FETCH NEXT 20 ROWS ONLY;

-- 违规: 使用ROW_NUMBER的大偏移量
SELECT * FROM (
    SELECT *, ROW_NUMBER() OVER (ORDER BY create_time DESC) AS rn
    FROM orders
) t WHERE rn BETWEEN 100001 AND 100020;
```

**正确示例**:
```sql
-- 正确: 使用游标分页
SELECT TOP 20 * FROM orders 
WHERE id < 90000 
ORDER BY id DESC;

-- 正确: 使用键集分页
SELECT TOP 20 * FROM orders 
WHERE create_time < '2023-12-01'
ORDER BY create_time DESC;

-- 正确: 使用SQL Server 2012+的OFFSET FETCH与小偏移量
SELECT * FROM orders 
ORDER BY create_time DESC 
OFFSET 100 ROWS FETCH NEXT 20 ROWS ONLY;
```

---

## 索引使用规则

### 规则: SS-004 - 禁止在索引列上使用函数
**严重级别**: 高  
**规则描述**: 禁止在WHERE、JOIN、ORDER BY子句的索引列上使用函数（除非创建了计算列索引）

**检测条件**:
- 索引列被函数包裹
- 导致索引失效

**违规示例**:
```sql
-- 违规: 在索引列使用日期函数
SELECT * FROM orders 
WHERE YEAR(create_time) = 2023;

-- 违规: 在索引列使用字符串函数
SELECT * FROM users 
WHERE UPPER(username) = 'ADMIN';

-- 违规: 在索引列进行计算
SELECT * FROM products 
WHERE price * 1.1 > 100;
```

**正确示例**:
```sql
-- 正确: 改写查询避免函数
SELECT * FROM orders 
WHERE create_time >= '2023-01-01' 
AND create_time < '2024-01-01';

-- 正确: 创建计算列和索引
ALTER TABLE users ADD username_upper AS UPPER(username) PERSISTED;
CREATE INDEX idx_username_upper ON users(username_upper);
SELECT * FROM users WHERE username_upper = 'ADMIN';

-- 正确: 改写计算表达式
SELECT * FROM products WHERE price > 100 / 1.1;
```

---

### 规则: SS-005 - 禁止冗余索引
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
CREATE INDEX idx_user_time ON orders(user_id, create_time);

-- 违规: 前缀重复
CREATE INDEX idx_abc ON table1(a, b, c);
CREATE INDEX idx_ab ON table1(a, b);
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

### 规则: SS-006 - 合理使用索引类型
**严重级别**: 中  
**规则描述**: 根据数据类型和查询模式选择合适的索引类型

**索引类型选择指南**:
- **聚集索引**: 每表只能有一个，选择经常范围查询的列
- **非聚集索引**: 可以有多个，用于等值查询
- **列存储索引**: 适用于数据仓库和分析查询
- **全文索引**: 适用于文本搜索
- **XML索引**: 适用于XML数据类型

**违规示例**:
```sql
-- 违规: GUID作为聚集索引
CREATE TABLE orders (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY CLUSTERED
);

-- 违规: 频繁更新的列作为聚集索引
CREATE TABLE user_sessions (
    last_activity DATETIME PRIMARY KEY CLUSTERED
);

-- 违规: 分析表不使用列存储索引
CREATE TABLE fact_sales (
    date_id INT,
    product_id INT,
    amount DECIMAL(10,2)
);
```

**正确示例**:
```sql
-- 正确: 使用自增ID作为聚集索引
CREATE TABLE orders (
    id INT IDENTITY(1,1) PRIMARY KEY CLUSTERED,
    order_guid UNIQUEIDENTIFIER DEFAULT NEWID()
);

-- 正确: 合理选择聚集索引列
CREATE TABLE user_sessions (
    session_id INT IDENTITY(1,1) PRIMARY KEY CLUSTERED,
    last_activity DATETIME
);
CREATE NONCLUSTERED INDEX idx_last_activity ON user_sessions(last_activity);

-- 正确: 分析表使用列存储索引
CREATE TABLE fact_sales (
    date_id INT,
    product_id INT,
    amount DECIMAL(10,2)
);
CREATE COLUMNSTORE INDEX idx_cs_sales ON fact_sales;
```

---

### 规则: SS-007 - 限制单表索引数量
**严重级别**: 中  
**规则描述**: 单表索引总数不超过10个（包含聚集索引）

**检测条件**:
- 统计表的索引数量
- 超过阈值则告警

**违规示例**:
```sql
-- 违规: 索引过多（11个索引）
CREATE TABLE users (
    id INT PRIMARY KEY CLUSTERED
);
CREATE INDEX idx1 ON users(col1);
CREATE INDEX idx2 ON users(col2);
-- ... 总共11个索引
```

**正确示例**:
```sql
-- 正确: 合理规划复合索引
CREATE INDEX idx_col1_col2 ON users(col1, col2);
CREATE INDEX idx_col3_col4 ON users(col3, col4);
-- 总共不超过10个索引
```

---

## SQL语句规范规则

### 规则: SS-008 - 禁止使用SELECT *
**严重级别**: 中  
**规则描述**: 禁止使用SELECT *，必须明确指定查询列

**检测条件**:
- SQL语句包含"SELECT *"

**违规示例**:
```sql
-- 违规: 使用SELECT *
SELECT * FROM users WHERE id = 1;

-- 违规: 子查询中使用SELECT *
SELECT COUNT(*) FROM (SELECT * FROM orders) t;
```

**正确示例**:
```sql
-- 正确: 明确指定列
SELECT id, username, email, create_time 
FROM users 
WHERE id = 1;

-- 正确: 只查询需要的列
SELECT user_id, order_date, total_amount 
FROM orders 
WHERE status = 'Completed';
```

**例外情况**:
- COUNT(*)统计查询
- EXISTS子查询

---

### 规则: SS-009 - 禁止隐式类型转换
**严重级别**: 高  
**规则描述**: WHERE条件必须与列类型匹配，避免隐式类型转换导致索引失效

**检测条件**:
- 数值列使用字符串比较
- 字符串列使用数值比较
- 日期类型不匹配

**违规示例**:
```sql
-- 违规: 数值列使用字符串
SELECT * FROM users WHERE id = '123';

-- 违规: 字符串列使用数值
SELECT * FROM products WHERE code = 123;

-- 违规: 日期类型隐式转换
SELECT * FROM orders WHERE create_time = '2023-01-01';
```

**正确示例**:
```sql
-- 正确: 类型匹配
SELECT * FROM users WHERE id = 123;

-- 正确: 字符串使用引号
SELECT * FROM products WHERE code = '123';

-- 正确: 使用明确的日期类型
SELECT * FROM orders WHERE create_time = CAST('2023-01-01' AS DATE);
```

---

### 规则: SS-010 - 避免使用NOLOCK提示
**严重级别**: 中  
**规则描述**: 避免滥用NOLOCK提示，可能导致脏读

**违规示例**:
```sql
-- 违规: 对关键数据使用NOLOCK
SELECT * FROM financial_transactions WITH (NOLOCK)
WHERE amount > 10000;

-- 违规: 对所有表都使用NOLOCK
SELECT o.*, c.* 
FROM orders o WITH (NOLOCK)
JOIN customers c WITH (NOLOCK) ON o.customer_id = c.id;
```

**正确示例**:
```sql
-- 正确: 使用READ COMMITTED SNAPSHOT
ALTER DATABASE mydb SET READ_COMMITTED_SNAPSHOT ON;
SELECT * FROM financial_transactions WHERE amount > 10000;

-- 正确: 只对报表查询使用NOLOCK
SELECT * FROM log_table WITH (NOLOCK)
WHERE log_date = CAST(GETDATE() AS DATE);
```

---

## 写入操作规则

### 规则: SS-011 - 禁止大批量操作不分批
**严重级别**: 高  
**规则描述**: 大批量INSERT、UPDATE、DELETE操作必须分批执行

**检测条件**:
- 单次操作影响行数 > 5000
- 可能导致事务日志增长和锁等待

**违规示例**:
```sql
-- 违规: 大批量删除
DELETE FROM orders 
WHERE create_time < '2020-01-01';

-- 违规: 大批量更新
UPDATE users 
SET status = 'Inactive' 
WHERE last_login < '2022-01-01';
```

**正确示例**:
```sql
-- 正确: 分批删除
DECLARE @BatchSize INT = 1000;
WHILE 1 = 1
BEGIN
    DELETE TOP (@BatchSize) FROM orders 
    WHERE create_time < '2020-01-01';
    
    IF @@ROWCOUNT < @BatchSize BREAK;
END;

-- 正确: 使用OUTPUT分批处理
DECLARE @DeletedIds TABLE (id INT);
WHILE 1 = 1
BEGIN
    DELETE TOP (1000) FROM orders
    OUTPUT DELETED.id INTO @DeletedIds
    WHERE create_time < '2020-01-01';
    
    IF @@ROWCOUNT = 0 BREAK;
    
    -- 处理删除的记录
END;
```

---

### 规则: SS-012 - 避免长事务
**严重级别**: 高  
**规则描述**: 事务持续时间不应超过30秒

**违规示例**:
```sql
-- 违规: 长事务
BEGIN TRANSACTION;
UPDATE orders SET status = 'Processing' WHERE id = 1;
-- ... 进行复杂业务逻辑处理（耗时超过30秒）
COMMIT;
```

**正确示例**:
```sql
-- 正确: 拆分为多个短事务
BEGIN TRANSACTION;
UPDATE orders SET status = 'Processing' WHERE id = 1;
COMMIT;

-- ... 进行业务逻辑处理

BEGIN TRANSACTION;
UPDATE orders SET status = 'Completed' WHERE id = 1;
COMMIT;
```

---

## 函数和存储过程规则

### 规则: SS-013 - 禁止使用高危函数
**严重级别**: 高  
**规则描述**: 禁止使用可能导致性能问题或安全风险的函数

**禁用函数列表**:
- `WAITFOR DELAY` - 导致查询延迟
- `xp_cmdshell` - 执行系统命令（安全风险）
- `sp_OACreate` - COM对象（安全风险）
- `NEWID()` - 在ORDER BY中使用导致全表扫描

**违规示例**:
```sql
-- 违规: 使用WAITFOR DELAY
SELECT * FROM users 
WHERE id = 1 
AND (SELECT CASE WHEN 1=1 THEN 1 ELSE 0 END FROM (SELECT 1 UNION ALL SELECT 2) AS t CROSS APPLY (SELECT WAITFOR DELAY '00:00:01') AS d) = 1;

-- 违规: 使用NEWID排序
SELECT TOP 10 * FROM products 
ORDER BY NEWID();

-- 违规: 使用xp_cmdshell
EXEC xp_cmdshell 'dir c:\';
```

**正确示例**:
```sql
-- 正确: 避免使用WAITFOR DELAY

-- 正确: 使用其他方式实现随机
SELECT TOP 10 * FROM products 
WHERE id >= FLOOR(RAND() * (SELECT MAX(id) FROM products));

-- 正确: 避免使用xp_cmdshell
```

---

### 规则: SS-014 - 避免使用游标
**严重级别**: 中  
**规则描述**: 尽量避免使用游标，优先使用基于集合的操作

**违规示例**:
```sql
-- 违规: 使用游标逐行处理
DECLARE @id INT, @name NVARCHAR(50);
DECLARE user_cursor CURSOR FOR 
    SELECT id, name FROM users;

OPEN user_cursor;
FETCH NEXT FROM user_cursor INTO @id, @name;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- 逐行处理
    UPDATE user_profile SET display_name = @name WHERE user_id = @id;
    FETCH NEXT FROM user_cursor INTO @id, @name;
END;

CLOSE user_cursor;
DEALLOCATE user_cursor;
```

**正确示例**:
```sql
-- 正确: 使用基于集合的UPDATE
UPDATE p
SET p.display_name = u.name
FROM user_profile p
JOIN users u ON p.user_id = u.id;

-- 正确: 如果必须使用游标，使用FAST_FORWARD
DECLARE user_cursor CURSOR FAST_FORWARD FOR 
    SELECT id, name FROM users;
```

---

## 表设计规则

### 规则: SS-015 - 谨慎使用TEXT/NTEXT类型
**严重级别**: 中  
**规则描述**: 避免使用已过时的TEXT/NTEXT类型，使用VARCHAR(MAX)/NVARCHAR(MAX)

**违规示例**:
```sql
-- 违规: 使用TEXT类型
CREATE TABLE articles (
    id INT PRIMARY KEY,
    title NVARCHAR(200),
    content TEXT
);

-- 违规: 使用NTEXT类型
CREATE TABLE documents (
    id INT PRIMARY KEY,
    name NVARCHAR(200),
    description NTEXT
);
```

**正确示例**:
```sql
-- 正确: 使用VARCHAR(MAX)
CREATE TABLE articles (
    id INT PRIMARY KEY,
    title NVARCHAR(200),
    content VARCHAR(MAX)
);

-- 正确: 使用NVARCHAR(MAX)
CREATE TABLE documents (
    id INT PRIMARY KEY,
    name NVARCHAR(200),
    description NVARCHAR(MAX)
);
```

---

### 规则: SS-016 - 合理使用分区表
**严重级别**: 中  
**规则描述**: 超过1000万行的大表建议使用分区表

**违规示例**:
```sql
-- 违规: 大表不分区
CREATE TABLE sensor_data (
    id BIGINT IDENTITY PRIMARY KEY,
    sensor_id INT,
    value DECIMAL(10,2),
    record_time DATETIME
);
```

**正确示例**:
```sql
-- 正确: 创建分区函数和方案
CREATE PARTITION FUNCTION pf_date_range (DATETIME)
AS RANGE RIGHT FOR VALUES 
    ('2023-01-01', '2023-04-01', '2023-07-01', '2023-10-01', '2024-01-01');

CREATE PARTITION SCHEME ps_date_range
AS PARTITION pf_date_range
ALL TO ([PRIMARY]);

-- 正确: 使用分区表
CREATE TABLE sensor_data (
    id BIGINT IDENTITY,
    sensor_id INT,
    value DECIMAL(10,2),
    record_time DATETIME
) ON ps_date_range(record_time);
```

---

## 规则总结

### 规则检查清单

#### 查询性能（3项）
- [ ] SS-001: 避免全表扫描
- [ ] SS-002: JOIN字段必须有索引
- [ ] SS-003: 避免大偏移量分页

#### 索引管理（4项）
- [ ] SS-004: 索引列不使用函数
- [ ] SS-005: 避免冗余索引
- [ ] SS-006: 合理选择索引类型
- [ ] SS-007: 控制索引数量

#### SQL规范（3项）
- [ ] SS-008: 不使用SELECT *
- [ ] SS-009: 避免隐式类型转换
- [ ] SS-010: 谨慎使用NOLOCK

#### 写入操作（2项）
- [ ] SS-011: 大批量操作分批执行
- [ ] SS-012: 避免长事务

#### 函数使用（2项）
- [ ] SS-013: 避免高危函数
- [ ] SS-014: 避免使用游标

#### 表设计（2项）
- [ ] SS-015: 避免TEXT/NTEXT类型
- [ ] SS-016: 合理使用分区表

### SQL Server配置建议

```sql
-- 数据库配置
ALTER DATABASE mydb SET READ_COMMITTED_SNAPSHOT ON;
ALTER DATABASE mydb SET AUTO_UPDATE_STATISTICS_ASYNC ON;
ALTER DATABASE mydb SET PARAMETERIZATION SIMPLE;

-- 启用查询存储
ALTER DATABASE mydb SET QUERY_STORE = ON;
ALTER DATABASE mydb SET QUERY_STORE (
    OPERATION_MODE = READ_WRITE,
    MAX_STORAGE_SIZE_MB = 1000
);

-- 服务器配置
EXEC sp_configure 'max degree of parallelism', 4;
EXEC sp_configure 'cost threshold for parallelism', 50;
RECONFIGURE;
```
