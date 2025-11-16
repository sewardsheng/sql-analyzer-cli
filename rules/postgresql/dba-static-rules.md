# PostgreSQL DBA 静态规则配置

## 规则概述

本文档包含传统DBA预先配置的PostgreSQL静态规则，这些规则是基于最佳实践和生产环境经验总结的强制性要求。

---

## 查询性能规则

### 禁止全表扫描规则

#### 规则: PG-001 - 禁止生产环境全表扫描
**严重级别**: 高  
**规则描述**: 禁止在生产环境执行全表扫描查询（除非表行数小于10000行）

**检测条件**:
- EXPLAIN结果中显示"Seq Scan"
- 预估扫描行数 > 10000
- 没有合适的WHERE条件或索引

**违规示例**:
```sql
-- 违规: 全表扫描大表
SELECT * FROM orders;

-- 违规: WHERE条件未使用索引
SELECT * FROM users WHERE EXTRACT(YEAR FROM create_time) = 2023;

-- 违规: 模糊查询以通配符开头
SELECT * FROM products WHERE name LIKE '%phone';

-- 违规: 使用!=导致全表扫描
SELECT * FROM orders WHERE status != 'completed';
```

**正确示例**:
```sql
-- 正确: 使用索引列作为条件
SELECT * FROM orders WHERE order_id = 123;

-- 正确: 避免在索引列使用函数
SELECT * FROM users 
WHERE create_time >= '2023-01-01'::date 
AND create_time < '2024-01-01'::date;

-- 正确: 模糊查询不以通配符开头
SELECT * FROM products WHERE name LIKE 'phone%';

-- 正确: 使用正向条件
SELECT * FROM orders WHERE status = 'pending';
```

**例外情况**:
- 小表查询（行数 < 10000）
- 统计分析查询（需要显式标注）
- 临时表或CTE查询

---

### 规则: PG-002 - 禁止不带索引的JOIN操作
**严重级别**: 高  
**规则描述**: JOIN操作的关联字段必须建立索引

**检测条件**:
- EXPLAIN结果显示"Hash Join"或"Nested Loop"但无索引使用
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

### 规则: PG-003 - 禁止大偏移量分页查询
**严重级别**: 中  
**规则描述**: 禁止使用大偏移量的LIMIT OFFSET分页（OFFSET > 10000）

**检测条件**:
- LIMIT OFFSET的OFFSET值 > 10000
- 可能导致性能问题

**违规示例**:
```sql
-- 违规: 大偏移量分页
SELECT * FROM orders 
ORDER BY create_time DESC 
LIMIT 20 OFFSET 100000;

-- 违规: 偏移量过大
SELECT * FROM users 
LIMIT 100 OFFSET 50000;
```

**正确示例**:
```sql
-- 正确: 使用游标分页
SELECT * FROM orders 
WHERE id < 90000 
ORDER BY id DESC 
LIMIT 20;

-- 正确: 使用键集分页
SELECT * FROM orders 
WHERE create_time < '2023-12-01 00:00:00' 
ORDER BY create_time DESC 
LIMIT 20;

-- 正确: 使用CURSOR
DECLARE orders_cursor CURSOR FOR 
    SELECT * FROM orders ORDER BY create_time DESC;
FETCH 20 FROM orders_cursor;
```

---

## 索引使用规则

### 规则: PG-004 - 禁止在索引列上使用函数
**严重级别**: 高  
**规则描述**: 禁止在WHERE、JOIN、ORDER BY子句的索引列上使用函数（除非创建了函数索引）

**检测条件**:
- 索引列被函数包裹
- 导致索引失效

**违规示例**:
```sql
-- 违规: 在索引列使用日期函数
SELECT * FROM orders 
WHERE EXTRACT(YEAR FROM create_time) = 2023;

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
WHERE create_time >= '2023-01-01'::date 
AND create_time < '2024-01-01'::date;

-- 正确: 创建函数索引
CREATE INDEX idx_upper_username ON users(UPPER(username));
SELECT * FROM users WHERE UPPER(username) = 'ADMIN';

-- 正确: 创建表达式索引
CREATE INDEX idx_price_markup ON products((price * 1.1));
SELECT * FROM products WHERE price * 1.1 > 100;
```

---

### 规则: PG-005 - 禁止冗余索引
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

### 规则: PG-006 - 合理选择索引类型
**严重级别**: 中  
**规则描述**: 根据数据类型和查询模式选择合适的索引类型

**索引类型选择指南**:
- **B-tree**: 默认类型，适用于大多数场景
- **Hash**: 仅适用于等值查询，不支持范围查询
- **GiST**: 适用于几何数据类型和全文搜索
- **GIN**: 适用于数组、JSONB、全文搜索
- **BRIN**: 适用于大表的线性排序数据
- **SP-GiST**: 适用于非平衡数据结构

**违规示例**:
```sql
-- 违规: 对JSONB字段使用B-tree索引
CREATE INDEX idx_data ON logs(data);  -- data是JSONB类型

-- 违规: 对数组字段使用B-tree索引
CREATE INDEX idx_tags ON articles(tags);  -- tags是数组类型

-- 违规: 大表时间序列数据使用B-tree
CREATE INDEX idx_time ON sensor_data(timestamp);  -- 数十亿行数据
```

**正确示例**:
```sql
-- 正确: JSONB使用GIN索引
CREATE INDEX idx_data ON logs USING GIN(data);

-- 正确: 数组使用GIN索引
CREATE INDEX idx_tags ON articles USING GIN(tags);

-- 正确: 大表时间序列使用BRIN索引
CREATE INDEX idx_time ON sensor_data USING BRIN(timestamp);

-- 正确: 全文搜索使用GIN索引
CREATE INDEX idx_fulltext ON articles USING GIN(to_tsvector('english', content));
```

---

## SQL语句规范规则

### 规则: PG-007 - 禁止使用SELECT *
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
WHERE status = 'completed';
```

**例外情况**:
- COUNT(*)统计查询
- EXISTS子查询

---

### 规则: PG-008 - 禁止隐式类型转换
**严重级别**: 高  
**规则描述**: WHERE条件必须与列类型匹配，避免隐式类型转换导致索引失效

**检测条件**:
- 数值列使用字符串比较
- 字符串列使用数值比较
- 日期类型不匹配

**违规示例**:
```sql
-- 违规: 数值列使用字符串
SELECT * FROM users WHERE id = '123';  -- id是INTEGER类型

-- 违规: 字符串列使用数值
SELECT * FROM products WHERE code = 123;  -- code是VARCHAR类型

-- 违规: 日期类型不匹配
SELECT * FROM orders WHERE create_time = '2023-01-01';
```

**正确示例**:
```sql
-- 正确: 类型匹配
SELECT * FROM users WHERE id = 123;

-- 正确: 字符串使用引号
SELECT * FROM products WHERE code = '123';

-- 正确: 使用类型转换
SELECT * FROM orders WHERE create_time = '2023-01-01'::date;
SELECT * FROM orders WHERE create_time = DATE '2023-01-01';
```

---

## 写入操作规则

### 规则: PG-009 - 禁止大批量操作不分批
**严重级别**: 高  
**规则描述**: 大批量INSERT、UPDATE、DELETE操作必须分批执行

**检测条件**:
- 单次操作影响行数 > 5000
- 可能导致锁等待和表膨胀

**违规示例**:
```sql
-- 违规: 大批量删除
DELETE FROM orders 
WHERE create_time < '2020-01-01';

-- 违规: 大批量更新
UPDATE users 
SET status = 'inactive' 
WHERE last_login < '2022-01-01';
```

**正确示例**:
```sql
-- 正确: 使用CTE分批删除
WITH deleted AS (
    DELETE FROM orders 
    WHERE id IN (
        SELECT id FROM orders 
        WHERE create_time < '2020-01-01'
        LIMIT 1000
    )
    RETURNING id
)
SELECT COUNT(*) FROM deleted;

-- 正确: 使用COPY命令批量插入
COPY archive_table FROM '/path/to/data.csv' WITH CSV;
```

---

### 规则: PG-010 - 避免长事务
**严重级别**: 高  
**规则描述**: 事务持续时间不应超过30秒

**违规示例**:
```sql
-- 违规: 长事务
BEGIN;
UPDATE orders SET status = 'processing' WHERE id = 1;
-- ... 进行复杂业务逻辑处理（耗时超过30秒）
COMMIT;
```

**正确示例**:
```sql
-- 正确: 拆分为多个短事务
BEGIN;
UPDATE orders SET status = 'processing' WHERE id = 1;
COMMIT;

-- ... 进行业务逻辑处理

BEGIN;
UPDATE orders SET status = 'completed' WHERE id = 1;
COMMIT;
```

---

## 函数使用规则

### 规则: PG-011 - 禁止使用高危函数
**严重级别**: 高  
**规则描述**: 禁止使用可能导致性能问题或安全风险的函数

**禁用函数列表**:
- `pg_sleep()` - 导致查询延迟
- `pg_read_file()` - 文件读取（安全风险）
- `COPY TO PROGRAM` - 执行系统命令（安全风险）
- `random()` - 在ORDER BY中使用导致全表扫描

**违规示例**:
```sql
-- 违规: 使用pg_sleep
SELECT * FROM users WHERE id = 1 AND pg_sleep(1) IS NULL;

-- 违规: 使用random排序
SELECT * FROM products ORDER BY random() LIMIT 10;
```

**正确示例**:
```sql
-- 正确: 避免使用pg_sleep

-- 正确: 使用其他方式实现随机
SELECT * FROM products 
WHERE id >= floor(random() * (SELECT max(id) FROM products))
LIMIT 10;
```

---

## 表设计规则

### 规则: PG-012 - 谨慎使用TEXT类型
**严重级别**: 中  
**规则描述**: 避免在主表使用TEXT类型存储大对象

**违规示例**:
```sql
-- 违规: 在主表使用TEXT存储大内容
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200),
    content TEXT,  -- 可能很大
    author_id INT
);
```

**正确示例**:
```sql
-- 正确: 主表只保留必要字段
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200),
    author_id INT,
    summary VARCHAR(500)
);

-- 正确: 内容存储在独立表
CREATE TABLE article_content (
    article_id INT PRIMARY KEY,
    content TEXT,
    FOREIGN KEY (article_id) REFERENCES articles(id)
);
```

---

### 规则: PG-013 - 合理使用分区表
**严重级别**: 中  
**规则描述**: 超过1000万行的大表建议使用分区表

**违规示例**:
```sql
-- 违规: 大表不分区
CREATE TABLE sensor_data (
    id BIGSERIAL PRIMARY KEY,
    sensor_id INT,
    value NUMERIC,
    timestamp TIMESTAMP
);
-- 数据量达到数亿行，但不分区
```

**正确示例**:
```sql
-- 正确: 使用范围分区
CREATE TABLE sensor_data (
    id BIGSERIAL,
    sensor_id INT,
    value NUMERIC,
    timestamp TIMESTAMP
) PARTITION BY RANGE (timestamp);

-- 创建分区
CREATE TABLE sensor_data_2023 PARTITION OF sensor_data
    FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');

CREATE TABLE sensor_data_2024 PARTITION OF sensor_data
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

---

## 规则总结

### 规则检查清单

#### 查询性能（3项）
- [ ] PG-001: 避免全表扫描
- [ ] PG-002: JOIN字段必须有索引
- [ ] PG-003: 避免大偏移量分页

#### 索引管理（3项）
- [ ] PG-004: 索引列不使用函数
- [ ] PG-005: 避免冗余索引
- [ ] PG-006: 合理选择索引类型

#### SQL规范（2项)
- [ ] PG-007: 不使用SELECT *
- [ ] PG-008: 避免隐式类型转换

#### 写入操作（2项）
- [ ] PG-009: 大批量操作分批执行
- [ ] PG-010: 避免长事务

#### 函数使用（1项）
- [ ] PG-011: 避免高危函数

#### 表设计（2项）
- [ ] PG-012: 谨慎使用TEXT类型
- [ ] PG-013: 合理使用分区表

### PostgreSQL配置建议

```ini
# postgresql.conf
shared_buffers = 256MB
work_mem = 16MB
maintenance_work_mem = 256MB
effective_cache_size = 1GB

# 慢查询日志
log_min_duration_statement = 1000
log_statement = 'all'

# 连接
max_connections = 100
```
