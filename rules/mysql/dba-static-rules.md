# MySQL DBA 静态规则配置

## 规则概述

本文档包含传统DBA预先配置的MySQL静态规则，这些规则是基于最佳实践和生产环境经验总结的强制性要求。

---

## 查询性能规则

### 禁止全表扫描规则

#### 规则: MYSQL-001 - 禁止生产环境全表扫描
**严重级别**: 高  
**规则描述**: 禁止在生产环境执行全表扫描查询（除非表行数小于10000行）

**检测条件**:
- EXPLAIN结果中type=ALL
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

### 规则: MYSQL-002 - 禁止不带索引的JOIN操作
**严重级别**: 高  
**规则描述**: JOIN操作的关联字段必须建立索引

**检测条件**:
- EXPLAIN结果显示JOIN字段无索引
- Extra字段显示"Using join buffer"
- type=ALL或index

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

### 规则: MYSQL-003 - 禁止大偏移量分页查询
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

### 规则: MYSQL-004 - 禁止在索引列上使用函数
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
CREATE INDEX idx_upper_username ON users((UPPER(username)));
SELECT * FROM users WHERE UPPER(username) = 'ADMIN';

-- 正确: 改写计算表达式
SELECT * FROM products WHERE price > 100 / 1.1;
```

---

### 规则: MYSQL-005 - 禁止冗余索引
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

### 规则: MYSQL-006 - 限制单表索引数量
**严重级别**: 中  
**规则描述**: 单表索引总数不超过6个（不含主键）

**检测条件**:
- 统计表的索引数量
- 超过阈值则告警

**违规示例**:
```sql
-- 违规: 索引过多
CREATE INDEX idx1 ON users(col1);
CREATE INDEX idx2 ON users(col2);
CREATE INDEX idx3 ON users(col3);
CREATE INDEX idx4 ON users(col4);
CREATE INDEX idx5 ON users(col5);
CREATE INDEX idx6 ON users(col6);
CREATE INDEX idx7 ON users(col7);  -- 第7个索引
CREATE INDEX idx8 ON users(col8);  -- 第8个索引
```

**正确示例**:
```sql
-- 正确: 合理规划复合索引
CREATE INDEX idx_col1_col2 ON users(col1, col2);
CREATE INDEX idx_col3_col4 ON users(col3, col4);
CREATE INDEX idx_col5 ON users(col5);
CREATE INDEX idx_col6 ON users(col6);
-- 总共4个索引，满足要求
```

---

## SQL语句规范规则

### 规则: MYSQL-007 - 禁止使用SELECT *
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
SELECT id, username, email, create_time FROM users WHERE id = 1;

-- 正确: 只查询需要的列
SELECT user_id, order_date, total_amount FROM orders WHERE status = 'completed';
```

**例外情况**:
- COUNT(*)统计查询
- EXISTS子查询

---

### 规则: MYSQL-008 - 禁止隐式类型转换
**严重级别**: 高  
**规则描述**: WHERE条件必须与列类型匹配，避免隐式类型转换导致索引失效

**检测条件**:
- 数值列使用字符串比较
- 字符串列使用数值比较
- 导致索引失效

**违规示例**:
```sql
-- 违规: 数值列使用字符串
SELECT * FROM users WHERE id = '123';  -- id是INT类型

-- 违规: 字符串列使用数值
SELECT * FROM products WHERE code = 123;  -- code是VARCHAR类型

-- 违规: 日期列使用字符串比较
SELECT * FROM orders WHERE create_time = '2023-01-01';  -- 应该使用日期格式
```

**正确示例**:
```sql
-- 正确: 类型匹配
SELECT * FROM users WHERE id = 123;

-- 正确: 字符串使用引号
SELECT * FROM products WHERE code = '123';

-- 正确: 使用正确的日期格式
SELECT * FROM orders WHERE create_time = DATE('2023-01-01');
```

---

### 规则: MYSQL-009 - 禁止使用负向查询
**严重级别**: 中  
**规则描述**: 禁止使用NOT、!=、<>、NOT IN、NOT EXISTS等负向查询

**检测条件**:
- SQL包含负向查询操作符
- 可能导致索引失效

**违规示例**:
```sql
-- 违规: 使用NOT IN
SELECT * FROM orders WHERE status NOT IN ('cancelled', 'deleted');

-- 违规: 使用!=
SELECT * FROM users WHERE status != 'inactive';

-- 违规: 使用NOT EXISTS
SELECT * FROM products WHERE NOT EXISTS (
    SELECT 1 FROM orders WHERE orders.product_id = products.id
);
```

**正确示例**:
```sql
-- 正确: 使用IN正向查询
SELECT * FROM orders WHERE status IN ('pending', 'processing', 'completed');

-- 正确: 使用=正向查询
SELECT * FROM users WHERE status = 'active';

-- 正确: 使用LEFT JOIN替代NOT EXISTS
SELECT p.* FROM products p
LEFT JOIN orders o ON o.product_id = p.id
WHERE o.id IS NULL;
```

---

### 规则: MYSQL-010 - 禁止使用OR条件
**严重级别**: 中  
**规则描述**: 建议使用UNION ALL替代OR，避免索引失效

**检测条件**:
- WHERE子句包含OR条件
- 可能导致索引失效

**违规示例**:
```sql
-- 违规: 使用OR连接不同列
SELECT * FROM users WHERE id = 1 OR username = 'admin';

-- 违规: OR连接范围查询
SELECT * FROM orders WHERE status = 'pending' OR create_time > '2023-01-01';
```

**正确示例**:
```sql
-- 正确: 使用UNION ALL
SELECT * FROM users WHERE id = 1
UNION ALL
SELECT * FROM users WHERE username = 'admin';

-- 正确: 使用IN替代单列OR
SELECT * FROM orders WHERE status IN ('pending', 'processing');
```

---

## 写入操作规则

### 规则: MYSQL-011 - 禁止大批量操作不分批
**严重级别**: 高  
**规则描述**: 大批量INSERT、UPDATE、DELETE操作必须分批执行

**检测条件**:
- 单次操作影响行数 > 5000
- 可能导致锁等待和主从延迟

**违规示例**:
```sql
-- 违规: 大批量删除
DELETE FROM orders WHERE create_time < '2020-01-01';  -- 可能影响数十万行

-- 违规: 大批量更新
UPDATE users SET status = 'inactive' WHERE last_login < '2022-01-01';

-- 违规: 大批量插入未分批
INSERT INTO archive_table SELECT * FROM large_table;
```

**正确示例**:
```sql
-- 正确: 分批删除
DELETE FROM orders WHERE create_time < '2020-01-01' LIMIT 1000;
-- 循环执行直到删除完成

-- 正确: 分批更新
UPDATE users SET status = 'inactive' 
WHERE last_login < '2022-01-01' 
LIMIT 1000;
-- 循环执行

-- 正确: 使用INSERT ... SELECT并分批
INSERT INTO archive_table 
SELECT * FROM large_table 
WHERE id BETWEEN 1 AND 1000;
```

---

### 规则: MYSQL-012 - 禁止在事务中执行DDL
**严重级别**: 高  
**规则描述**: 禁止在事务中执行ALTER TABLE、CREATE INDEX等DDL操作

**检测条件**:
- BEGIN...COMMIT之间包含DDL语句
- 可能导致表锁和事务阻塞

**违规示例**:
```sql
-- 违规: 事务中执行DDL
BEGIN;
UPDATE users SET status = 'active' WHERE id = 1;
ALTER TABLE users ADD COLUMN new_col VARCHAR(50);  -- DDL
COMMIT;

-- 违规: 事务中创建索引
START TRANSACTION;
INSERT INTO logs VALUES (...);
CREATE INDEX idx_new ON logs(create_time);  -- DDL
COMMIT;
```

**正确示例**:
```sql
-- 正确: DDL在事务外执行
ALTER TABLE users ADD COLUMN new_col VARCHAR(50);

-- 正确: 先完成事务，再执行DDL
BEGIN;
UPDATE users SET status = 'active' WHERE id = 1;
COMMIT;
-- 事务完成后再执行DDL
ALTER TABLE users ADD COLUMN new_col VARCHAR(50);
```

---

## 函数使用规则

### 规则: MYSQL-013 - 禁止使用高危函数
**严重级别**: 高  
**规则描述**: 禁止使用可能导致性能问题或安全风险的函数

**禁用函数列表**:
- `SLEEP()` - 导致查询延迟
- `BENCHMARK()` - 性能测试函数
- `LOAD_FILE()` - 文件读取函数（安全风险）
- `INTO OUTFILE` - 文件写入（安全风险）
- `UUID()` - 性能问题（建议使用UUID_SHORT()）
- `RAND()` - 在ORDER BY中使用会导致全表扫描

**违规示例**:
```sql
-- 违规: 使用SLEEP
SELECT * FROM users WHERE id = 1 AND SLEEP(1);

-- 违规: 使用LOAD_FILE
SELECT LOAD_FILE('/etc/passwd');

-- 违规: 使用RAND排序
SELECT * FROM products ORDER BY RAND() LIMIT 10;

-- 违规: 使用UUID作为主键
CREATE TABLE orders (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    ...
);
```

**正确示例**:
```sql
-- 正确: 避免使用SLEEP

-- 正确: 避免使用LOAD_FILE

-- 正确: 使用其他方式实现随机
SELECT * FROM products WHERE id >= FLOOR(RAND() * (SELECT MAX(id) FROM products)) LIMIT 10;

-- 正确: 使用自增ID或UUID_SHORT
CREATE TABLE orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    uuid BIGINT DEFAULT (UUID_SHORT()),
    ...
);
```

---

### 规则: MYSQL-014 - 禁止使用标量子查询
**严重级别**: 中  
**规则描述**: 禁止在SELECT列表中使用标量子查询（会产生N+1查询问题）

**检测条件**:
- SELECT列表包含子查询
- 每行都会执行一次子查询

**违规示例**:
```sql
-- 违规: 标量子查询
SELECT 
    o.id,
    o.order_no,
    (SELECT name FROM customers WHERE id = o.customer_id) AS customer_name
FROM orders o;

-- 违规: 多个标量子查询
SELECT 
    id,
    (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count,
    (SELECT SUM(amount) FROM orders WHERE user_id = u.id) AS total_amount
FROM users u;
```

**正确示例**:
```sql
-- 正确: 使用JOIN替代
SELECT 
    o.id,
    o.order_no,
    c.name AS customer_name
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id;

-- 正确: 使用子查询+JOIN
SELECT 
    u.id,
    COALESCE(s.order_count, 0) AS order_count,
    COALESCE(s.total_amount, 0) AS total_amount
FROM users u
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) AS order_count,
        SUM(amount) AS total_amount
    FROM orders
    GROUP BY user_id
) s ON u.id = s.user_id;
```

---

## 表设计规则

### 规则: MYSQL-015 - 禁止使用TEXT/BLOB存储大对象
**严重级别**: 中  
**规则描述**: 避免在主表使用TEXT、BLOB类型存储大对象，建议使用独立表

**检测条件**:
- 表中包含TEXT、BLOB、MEDIUMTEXT等大对象类型
- 可能影响查询性能

**违规示例**:
```sql
-- 违规: 在主表使用TEXT
CREATE TABLE articles (
    id INT PRIMARY KEY,
    title VARCHAR(200),
    content TEXT,  -- 违规
    author_id INT,
    create_time DATETIME
);

-- 违规: 使用BLOB存储文件
CREATE TABLE documents (
    id INT PRIMARY KEY,
    name VARCHAR(200),
    file_data BLOB,  -- 违规
    create_time DATETIME
);
```

**正确示例**:
```sql
-- 正确: 主表只保留必要字段
CREATE TABLE articles (
    id INT PRIMARY KEY,
    title VARCHAR(200),
    author_id INT,
    create_time DATETIME,
    summary VARCHAR(500)
);

-- 正确: 内容存储在独立表
CREATE TABLE article_content (
    article_id INT PRIMARY KEY,
    content TEXT,
    FOREIGN KEY (article_id) REFERENCES articles(id)
);

-- 正确: 文件存储使用文件系统，数据库只存路径
CREATE TABLE documents (
    id INT PRIMARY KEY,
    name VARCHAR(200),
    file_path VARCHAR(500),  -- 文件路径
    create_time DATETIME
);
```

---

### 规则: MYSQL-016 - 禁止使用外键约束
**严重级别**: 中  
**规则描述**: 生产环境禁止使用外键约束，通过应用层保证数据完整性

**检测条件**:
- CREATE TABLE包含FOREIGN KEY
- 外键约束影响性能和扩展性

**违规示例**:
```sql
-- 违规: 使用外键约束
CREATE TABLE orders (
    id INT PRIMARY KEY,
    customer_id INT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)  -- 违规
);

-- 违规: 级联删除
CREATE TABLE order_items (
    id INT PRIMARY KEY,
    order_id INT,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE  -- 违规
);
```

**正确示例**:
```sql
-- 正确: 不使用外键，通过应用层保证
CREATE TABLE orders (
    id INT PRIMARY KEY,
    customer_id INT,
    INDEX idx_customer_id (customer_id)
);

-- 正确: 在应用层实现级联逻辑
-- 应用代码中先删除order_items，再删除orders
```

---

## 字符集和排序规则

### 规则: MYSQL-017 - 强制使用UTF8MB4字符集
**严重级别**: 高  
**规则描述**: 所有表必须使用utf8mb4字符集，排序规则使用utf8mb4_general_ci

**检测条件**:
- 表字符集不是utf8mb4
- 列字符集不是utf8mb4

**违规示例**:
```sql
-- 违规: 使用utf8字符集
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;  -- 违规

-- 违规: 使用latin1
CREATE TABLE logs (
    id INT PRIMARY KEY,
    message VARCHAR(500)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;  -- 违规
```

**正确示例**:
```sql
-- 正确: 使用utf8mb4
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 正确: 指定列字符集
CREATE TABLE logs (
    id INT PRIMARY KEY,
    message VARCHAR(500) CHARACTER SET utf8mb4
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

---

## 规则总结

### 规则严重级别说明
- **高**: 必须严格遵守，违反将导致严重性能问题或安全风险
- **中**: 强烈建议遵守，违反可能导致性能下降或维护困难
- **低**: 建议遵守，有助于提升代码质量和可维护性

### 规则检查清单

#### 查询性能（5项）
- [ ] MYSQL-001: 避免全表扫描
- [ ] MYSQL-002: JOIN字段必须有索引
- [ ] MYSQL-003: 避免大偏移量分页
- [ ] MYSQL-004: 索引列不使用函数
- [ ] MYSQL-014: 避免标量子查询

#### 索引管理（3项）
- [ ] MYSQL-005: 避免冗余索引
- [ ] MYSQL-006: 控制索引数量
- [ ] MYSQL-002: JOIN字段建立索引

#### SQL规范（5项）
- [ ] MYSQL-007: 不使用SELECT *
- [ ] MYSQL-008: 避免隐式类型转换
- [ ] MYSQL-009: 避免负向查询
- [ ] MYSQL-010: 避免OR条件
- [ ] MYSQL-017: 使用UTF8MB4字符集

#### 写入操作（2项）
- [ ] MYSQL-011: 大批量操作分批执行
- [ ] MYSQL-012: 事务中不执行DDL

#### 函数和类型（2项）
- [ ] MYSQL-013: 避免高危函数
- [ ] MYSQL-015: 避免TEXT/BLOB大对象

#### 表设计（2项）
- [ ] MYSQL-016: 不使用外键约束
- [ ] MYSQL-017: 强制UTF8MB4字符集

### 规则应用建议

1. **开发阶段**: 在代码审查时强制检查这些规则
2. **测试阶段**: 使用EXPLAIN分析所有查询的执行计划
3. **上线前**: 进行全面的SQL审计，确保符合所有规则
4. **生产环境**: 持续监控慢查询日志，识别违规SQL

### 自动化检查

建议使用以下工具自动检查规则合规性:
- Sonar SQL Plugin
- SQLCheck
- pt-query-digest
- 自定义静态分析脚本

---

## 附录：规则配置示例

### MySQL配置建议
```ini
[mysqld]
# 慢查询日志
slow_query_log = 1
long_query_time = 1
log_queries_not_using_indexes = 1

# 连接超时
wait_timeout = 600
interactive_timeout = 600

# 索引优化
optimizer_switch = 'index_merge=on,index_merge_union=on'

# 字符集
character-set-server = utf8mb4
collation-server = utf8mb4_general_ci
```

### 应用层配置建议
```yaml
# 连接池配置
database:
  pool:
    min_size: 5
    max_size: 20
    timeout: 30
    
  # 查询超时
  query_timeout: 30
  
  # 事务超时
  transaction_timeout: 60
  
  # 慢查询阈值
  slow_query_threshold: 1000
```
