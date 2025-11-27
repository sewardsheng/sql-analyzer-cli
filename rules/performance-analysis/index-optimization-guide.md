# 索引优化指南

本文档提供SQL索引优化的全面指南，包括索引设计原则、优化策略和常见问题的解决方案。

## 1. 索引基础

### 1.1 索引类型

#### B-Tree索引
- 最常用的索引类型
- 适用于范围查询和精确匹配
- 支持排序和分组操作

```sql
-- 创建B-Tree索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_date ON orders(order_date);
```

#### 哈希索引
- 仅适用于等值查询
- 查询速度快，不支持范围查询
- 内存数据库常用

```sql
-- MySQL Memory引擎使用哈希索引
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(50),
    email VARCHAR(100),
    INDEX idx_email (email) USING HASH
) ENGINE=MEMORY;
```

#### 全文索引
- 用于文本搜索
- 支持自然语言搜索
- 适用于大文本字段

```sql
-- 创建全文索引
CREATE FULLTEXT INDEX idx_article_content ON articles(content);

-- 使用全文索引查询
SELECT * FROM articles 
WHERE MATCH(content) AGAINST('database optimization' IN NATURAL LANGUAGE MODE);
```

#### 空间索引
- 用于地理空间数据
- 支持空间查询和距离计算
- 适用于地理位置应用

```sql
-- 创建空间索引
CREATE SPATIAL INDEX idx_locations_geometry ON locations(geometry);

-- 使用空间索引查询
SELECT * FROM locations 
WHERE ST_Contains(geometry, ST_GeomFromText('POINT(40.7128 -74.0060)'));
```

### 1.2 索引结构

#### 聚簇索引
- 数据行按照索引顺序存储
- 每个表只能有一个聚簇索引
- 通常是主键索引

```sql
-- MySQL InnoDB自动为主键创建聚簇索引
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,  -- 聚簇索引
    name VARCHAR(50),
    email VARCHAR(100)
);
```

#### 非聚簇索引
- 索引和数据分开存储
- 叶子节点包含指向数据行的指针
- 一个表可以有多个非聚簇索引

```sql
-- 创建非聚簇索引
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_email ON users(email);
```

#### 覆盖索引
- 索引包含查询所需的所有列
- 避免回表操作，提高查询性能
- 适用于只查询索引列的查询

```sql
-- 创建覆盖索引
CREATE INDEX idx_orders_covering ON orders(user_id, order_date, total_amount);

-- 查询只使用索引，无需访问表数据
SELECT user_id, order_date, total_amount 
FROM orders 
WHERE user_id = 123;
```

## 2. 索引设计原则

### 2.1 选择性原则
- 选择性高的列适合建索引
- 选择性 = 不同值数量 / 总行数
- 选择性越高，索引效果越好

```sql
-- 计算列的选择性
SELECT 
    COUNT(DISTINCT email) / COUNT(*) AS email_selectivity,
    COUNT(DISTINCT gender) / COUNT(*) AS gender_selectivity
FROM users;

-- 高选择性列适合建索引
CREATE INDEX idx_users_email ON users(email);  -- 高选择性，适合建索引

-- 低选择性列不适合单独建索引
CREATE INDEX idx_users_gender ON users(gender);  -- 低选择性，不适合单独建索引
```

### 2.2 最左前缀原则
- 复合索引按照最左前缀匹配
- 查询条件必须包含索引的第一列
- 索引列顺序影响查询性能

```sql
-- 创建复合索引
CREATE INDEX idx_orders_user_date_status ON orders(user_id, order_date, status);

-- 可以使用索引的查询
SELECT * FROM orders WHERE user_id = 123;  -- 使用第一列
SELECT * FROM orders WHERE user_id = 123 AND order_date = '2023-01-01';  -- 使用前两列
SELECT * FROM orders WHERE user_id = 123 AND order_date = '2023-01-01' AND status = 'shipped';  -- 使用所有列

-- 无法使用索引的查询
SELECT * FROM orders WHERE order_date = '2023-01-01';  -- 未包含第一列
SELECT * FROM orders WHERE status = 'shipped';  -- 未包含第一列
SELECT * FROM orders WHERE order_date = '2023-01-01' AND status = 'shipped';  -- 未包含第一列
```

### 2.3 索引列顺序
- 将高选择性列放在前面
- 将常用查询条件列放在前面
- 考虑排序需求

```sql
-- 好的索引设计
CREATE INDEX idx_orders_status_date ON orders(status, order_date);  -- 高选择性列在前

-- 不好的索引设计
CREATE INDEX idx_orders_date_status ON orders(order_date, status);  -- 低选择性列在前
```

## 3. 索引优化策略

### 3.1 查询优化

#### 避免索引失效
- 避免在索引列上使用函数
- 避免在索引列上进行计算
- 避免使用LIKE前缀通配符
- 避免使用OR连接不同列

```sql
-- 索引失效的查询
SELECT * FROM users WHERE YEAR(created_at) = 2023;  -- 函数导致索引失效
SELECT * FROM users WHERE id + 1 = 100;  -- 计算导致索引失效
SELECT * FROM users WHERE name LIKE '%john%';  -- 前缀通配符导致索引失效
SELECT * FROM users WHERE name = 'john' OR email = 'john@example.com';  -- OR导致索引失效

-- 索引有效的查询
SELECT * FROM users WHERE created_at >= '2023-01-01' AND created_at < '2024-01-01';  -- 避免函数
SELECT * FROM users WHERE id = 99;  -- 避免计算
SELECT * FROM users WHERE name LIKE 'john%';  -- 避免前缀通配符
SELECT * FROM users WHERE name = 'john'
UNION ALL
SELECT * FROM users WHERE email = 'john@example.com';  -- 使用UNION ALL替代OR
```

#### 使用覆盖索引
- 查询只包含索引列
- 避免回表操作
- 提高查询性能

```sql
-- 创建覆盖索引
CREATE INDEX idx_orders_covering ON orders(user_id, order_date, total_amount);

-- 使用覆盖索引的查询
SELECT user_id, order_date, total_amount 
FROM orders 
WHERE user_id = 123;  -- 只查询索引列，无需回表

-- 无法使用覆盖索引的查询
SELECT user_id, order_date, total_amount, status 
FROM orders 
WHERE user_id = 123;  -- 包含非索引列，需要回表
```

#### 使用索引提示
- 强制使用特定索引
- 优化器选择错误时使用
- 测试不同索引性能

```sql
-- MySQL使用索引提示
SELECT * FROM orders USE INDEX(idx_orders_user_date)
WHERE user_id = 123 AND order_date = '2023-01-01';

-- 强制使用索引
SELECT * FROM orders FORCE INDEX(idx_orders_user_date)
WHERE user_id = 123 AND order_date = '2023-01-01';

-- 忽略索引
SELECT * FROM orders IGNORE INDEX(idx_orders_user_date)
WHERE user_id = 123 AND order_date = '2023-01-01';
```

### 3.2 索引维护

#### 定期分析索引
- 检查索引使用情况
- 删除未使用的索引
- 优化索引结构

```sql
-- MySQL查看索引使用情况
SELECT 
    OBJECT_SCHEMA,
    OBJECT_NAME,
    INDEX_NAME,
    COUNT_FETCH,
    COUNT_INSERT,
    COUNT_UPDATE,
    COUNT_DELETE
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE OBJECT_SCHEMA = 'your_database';

-- PostgreSQL查看索引使用情况
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public';
```

#### 重建索引
- 索引碎片整理
- 更新统计信息
- 提高查询性能

```sql
-- MySQL重建索引
ANALYZE TABLE users;  -- 更新统计信息
OPTIMIZE TABLE users;  -- 重建表和索引

-- PostgreSQL重建索引
REINDEX TABLE users;  -- 重建表的所有索引
REINDEX INDEX idx_users_email;  -- 重建特定索引
ANALYZE users;  -- 更新统计信息

-- SQL Server重建索引
ALTER INDEX ALL ON users REBUILD;  -- 重建所有索引
ALTER INDEX idx_users_email ON users REBUILD;  -- 重建特定索引
UPDATE STATISTICS users;  -- 更新统计信息
```

#### 监控索引性能
- 监控索引使用率
- 监控查询执行时间
- 识别性能瓶颈

```sql
-- MySQL监控慢查询
SELECT 
    start_time,
    query_time,
    lock_time,
    rows_sent,
    rows_examined,
    sql_text
FROM mysql.slow_log
WHERE start_time > DATE_SUB(NOW(), INTERVAL 1 DAY)
ORDER BY query_time DESC;

-- PostgreSQL监控慢查询
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

## 4. 数据库特定索引优化

### 4.1 MySQL索引优化

#### 索引类型选择
- InnoDB使用B-Tree索引
- Memory引擎使用哈希索引
- 全文索引用于文本搜索

```sql
-- InnoDB表
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_date TIMESTAMP NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    
    INDEX idx_user_date (user_id, order_date),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- Memory表
CREATE TABLE cache_users (
    id INT PRIMARY KEY,
    name VARCHAR(50),
    email VARCHAR(100),
    INDEX idx_email (email) USING HASH
) ENGINE=Memory;

-- 全文索引
CREATE TABLE articles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200),
    content TEXT,
    FULLTEXT INDEX idx_title_content (title, content)
);
```

#### 索引优化技巧
- 使用前缀索引减少索引大小
- 使用覆盖索引避免回表
- 使用延迟关联优化大偏移量分页

```sql
-- 前缀索引
CREATE INDEX idx_users_name_prefix ON users(name(20));  -- 只索引前20个字符

-- 覆盖索引优化分页
CREATE INDEX idx_orders_covering ON orders(user_id, order_date, id);

-- 延迟关联优化大偏移量分页
SELECT o.*
FROM orders o
JOIN (
    SELECT id
    FROM orders
    WHERE user_id = 123
    ORDER BY order_date DESC
    LIMIT 10000, 10
) AS tmp ON o.id = tmp.id;
```

### 4.2 PostgreSQL索引优化

#### 高级索引类型
- B-Tree索引（默认）
- 哈希索引
- GIN索引（数组、全文搜索）
- GiST索引（几何数据）
- SP-GiST索引（空间分区）
- BRIN索引（大表范围查询）

```sql
-- B-Tree索引
CREATE INDEX idx_users_email ON users(email);

-- 哈希索引
CREATE INDEX idx_users_name_hash ON users USING HASH(name);

-- GIN索引（数组）
CREATE INDEX idx_user_tags ON users USING GIN(tags);

-- GIN索引（全文搜索）
CREATE INDEX idx_article_content ON articles USING GIN(to_tsvector('english', content));

-- GiST索引（几何数据）
CREATE INDEX idx_locations_geometry ON locations USING GIST(geometry);

-- BRIN索引（大表范围查询）
CREATE INDEX idx_orders_created_at ON orders USING BRIN(created_at);
```

#### 部分索引
- 只索引满足条件的行
- 减少索引大小
- 提高查询性能

```sql
-- 只为活跃用户创建索引
CREATE INDEX idx_active_users_email ON users(email) WHERE is_active = TRUE;

-- 只为未完成订单创建索引
CREATE INDEX idx_pending_orders ON orders(user_id, order_date) WHERE status = 'pending';
```

#### 表达式索引
- 索引表达式结果
- 支持函数索引
- 优化特定查询

```sql
-- 表达式索引
CREATE INDEX idx_users_lower_email ON users(LOWER(email));

-- 函数索引
CREATE INDEX idx_users_date_year ON users(EXTRACT(YEAR FROM created_at));

-- 使用表达式索引的查询
SELECT * FROM users WHERE LOWER(email) = 'john@example.com';
SELECT * FROM users WHERE EXTRACT(YEAR FROM created_at) = 2023;
```

### 4.3 SQL Server索引优化

#### 索引类型
- 聚簇索引
- 非聚簇索引
- 列存储索引
- 全文索引
- 空间索引

```sql
-- 聚簇索引
CREATE CLUSTERED INDEX idx_orders_id ON orders(id);

-- 非聚簇索引
CREATE NONCLUSTERED INDEX idx_orders_user_date ON orders(user_id, order_date);

-- 包含列的非聚簇索引（覆盖索引）
CREATE NONCLUSTERED INDEX idx_orders_covering ON orders(user_id, order_date)
INCLUDE (total_amount, status);

-- 列存储索引（数据仓库）
CREATE COLUMNSTORE INDEX idx_orders_columnstore ON orders(user_id, order_date, total_amount);
```

#### 过滤索引
- 只索引满足条件的行
- 减少索引大小
- 提高查询性能

```sql
-- 过滤索引
CREATE NONCLUSTERED INDEX idx_active_users ON users(email)
WHERE is_active = 1;

-- 使用过滤索引的查询
SELECT * FROM users WHERE email = 'john@example.com' AND is_active = 1;
```

#### 视图索引
- 为视图创建索引
- 提高复杂查询性能
- 自动维护索引

```sql
-- 创建视图
CREATE VIEW v_user_orders WITH SCHEMABINDING AS
SELECT 
    u.id,
    u.name,
    COUNT(o.id) AS order_count,
    SUM(o.total_amount) AS total_spent
FROM dbo.users u
JOIN dbo.orders o ON u.id = o.user_id
GROUP BY u.id, u.name;

-- 为视图创建索引
CREATE UNIQUE CLUSTERED INDEX idx_v_user_orders_id ON v_user_orders(id);
CREATE NONCLUSTERED INDEX idx_v_user_orders_order_count ON v_user_orders(order_count);
```

## 5. 索引性能监控

### 5.1 索引使用分析

#### MySQL索引使用分析
```sql
-- 查看索引使用情况
SELECT 
    TABLE_SCHEMA,
    TABLE_NAME,
    INDEX_NAME,
    SEQ_IN_INDEX,
    COLUMN_NAME,
    CARDINALITY
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'your_database';

-- 查看未使用的索引
SELECT 
    OBJECT_SCHEMA,
    OBJECT_NAME,
    INDEX_NAME
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE INDEX_NAME IS NOT NULL
  AND COUNT_FETCH = 0
  AND OBJECT_SCHEMA NOT IN ('mysql', 'performance_schema');
```

#### PostgreSQL索引使用分析
```sql
-- 查看索引使用情况
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan;

-- 查看未使用的索引
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

#### SQL Server索引使用分析
```sql
-- 查看索引使用情况
SELECT 
    OBJECT_NAME(i.object_id) AS table_name,
    i.name AS index_name,
    i.type_desc AS index_type,
    s.user_seeks,
    s.user_scans,
    s.user_lookups,
    s.user_updates
FROM sys.indexes i
JOIN sys.dm_db_index_usage_stats s ON i.object_id = s.object_id AND i.index_id = s.index_id
WHERE OBJECTPROPERTY(i.object_id, 'IsUserTable') = 1
  AND s.database_id = DB_ID()
ORDER BY table_name, index_name;
```

### 5.2 查询性能分析

#### 执行计划分析
```sql
-- MySQL执行计划
EXPLAIN SELECT * FROM orders WHERE user_id = 123;

-- PostgreSQL执行计划
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 123;

-- SQL Server执行计划
SET SHOWPLAN_TEXT ON;
GO
SELECT * FROM orders WHERE user_id = 123;
GO
SET SHOWPLAN_TEXT OFF;
GO
```

#### 慢查询分析
```sql
-- MySQL慢查询日志
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';

-- PostgreSQL慢查询
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- SQL Server慢查询
SELECT TOP 10
    qs.total_elapsed_time / qs.execution_count AS avg_elapsed_time,
    qs.total_worker_time / qs.execution_count AS avg_cpu_time,
    qs.total_logical_reads / qs.execution_count AS avg_logical_reads,
    qs.execution_count,
    SUBSTRING(qt.text, (qs.statement_start_offset/2) + 1,
        ((CASE qs.statement_end_offset
            WHEN -1 THEN DATALENGTH(qt.text)
            ELSE qs.statement_end_offset
        END - qs.statement_start_offset)/2) + 1) AS query_text
FROM sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) qt
ORDER BY avg_elapsed_time DESC;
```

## 6. 索引优化最佳实践

### 6.1 设计阶段
- 根据查询需求设计索引
- 遵循索引设计原则
- 考虑数据增长趋势

### 6.2 实施阶段
- 逐步添加索引
- 监控索引效果
- 及时调整索引策略

### 6.3 维护阶段
- 定期分析索引使用情况
- 删除未使用的索引
- 重建碎片化索引

### 6.4 监控阶段
- 监控查询性能
- 识别性能瓶颈
- 持续优化索引

## 7. 常见问题与解决方案

### 7.1 索引未使用
- 检查查询条件是否符合最左前缀原则
- 检查是否在索引列上使用了函数或计算
- 检查统计信息是否过时

### 7.2 索引过多
- 删除重复或冗余索引
- 合并相似索引
- 定期清理未使用的索引

### 7.3 索引碎片
- 定期重建索引
- 使用合适的填充因子
- 监控索引碎片情况

## 8. 参考资源

- [查询优化指南](./query-optimization-guide.md)
- [执行计划分析](./execution-plan-analysis.md)
- [SQL性能调优](./sql-performance-tuning.md)
- [数据库特定优化](./database-specific-optimization.md)