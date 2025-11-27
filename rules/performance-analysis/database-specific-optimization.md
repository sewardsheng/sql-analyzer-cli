# 数据库特定优化指南

本文档提供针对不同数据库系统的特定优化技巧和最佳实践，包括MySQL、PostgreSQL、SQL Server、Oracle等主流数据库的性能优化策略。

## 1. MySQL优化

### 1.1 存储引擎优化

#### InnoDB引擎优化
```sql
-- InnoDB缓冲池大小（建议设置为物理内存的70-80%）
SET GLOBAL innodb_buffer_pool_size = 8589934592;  -- 8GB

-- InnoDB日志文件大小（建议设置为256MB-1GB）
SET GLOBAL innodb_log_file_size = 268435456;  -- 256MB

-- InnoDB日志缓冲区大小
SET GLOBAL innodb_log_buffer_size = 16777216;  -- 16MB

-- InnoDB刷新策略（性能优先）
SET GLOBAL innodb_flush_log_at_trx_commit = 2;

-- InnoDBI/O能力
SET GLOBAL innodb_io_capacity = 2000;
SET GLOBAL innodb_io_capacity_max = 4000;

-- InnoDB线程并发数
SET GLOBAL innodb_thread_concurrency = 16;
```

#### MyISAM引擎优化
```sql
-- MyISAM键缓冲区大小（建议设置为物理内存的20-30%）
SET GLOBAL key_buffer_size = 2147483648;  -- 2GB

-- MyISAM排序缓冲区大小
SET GLOBAL myisam_sort_buffer_size = 134217728;  -- 128MB

-- MyISAM修复缓冲区大小
SET GLOBAL myisam_repair_threads = 1;
```

### 1.2 查询优化

#### 查询提示
```sql
-- 强制使用索引
SELECT * FROM users USE INDEX(idx_users_email) WHERE email = 'john@example.com';

-- 忽略索引
SELECT * FROM users IGNORE INDEX(idx_users_email) WHERE email = 'john@example.com';

-- 强制连接顺序
SELECT /*+ JOIN_ORDER(users orders) */ u.name, o.total_amount 
FROM users u 
JOIN orders o ON u.id = o.user_id;

-- 强制使用特定连接类型
SELECT /*+ USE_NL(users orders) */ u.name, o.total_amount 
FROM users u 
JOIN orders o ON u.id = o.user_id;
```

#### 分区表优化
```sql
-- 创建分区表
CREATE TABLE orders (
    id INT AUTO_INCREMENT,
    user_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    order_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    PRIMARY KEY (id, order_date)
)
PARTITION BY RANGE (YEAR(order_date)) (
    PARTITION p2022 VALUES LESS THAN (2023),
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);

-- 查询分区表
SELECT * FROM orders PARTITION(p2023) WHERE user_id = 123;
```

### 1.3 索引优化

#### 前缀索引
```sql
-- 创建前缀索引
CREATE INDEX idx_users_name_prefix ON users(name(20));  -- 只索引前20个字符

-- 分析前缀选择性
SELECT 
    COUNT(DISTINCT LEFT(name, 10)) / COUNT(*) AS prefix10_selectivity,
    COUNT(DISTINCT LEFT(name, 20)) / COUNT(*) AS prefix20_selectivity,
    COUNT(DISTINCT name) / COUNT(*) AS full_selectivity
FROM users;
```

#### 函数索引（MySQL 8.0+）
```sql
-- 创建函数索引
CREATE INDEX idx_users_lower_email ON users((LOWER(email)));

-- 使用函数索引
SELECT * FROM users WHERE LOWER(email) = 'john@example.com';
```

### 1.4 查询缓存优化

```sql
-- 开启查询缓存
SET GLOBAL query_cache_type = ON;
SET GLOBAL query_cache_size = 134217728;  -- 128MB
SET GLOBAL query_cache_limit = 2097152;  -- 2MB

-- 使用SQL_CACHE提示
SELECT SQL_CACHE * FROM users WHERE id = 1;

-- 使用SQL_NO_CACHE提示
SELECT SQL_NO_CACHE * FROM users WHERE RAND() < 0.1;
```

## 2. PostgreSQL优化

### 2.1 内存配置优化

```sql
-- 共享缓冲区（建议设置为物理内存的25%）
ALTER SYSTEM SET shared_buffers = '2GB';

-- 工作内存（根据复杂查询调整）
ALTER SYSTEM SET work_mem = '64MB';

-- 维护工作内存（设置为work_mem的10倍）
ALTER SYSTEM SET maintenance_work_mem = '512MB';

-- 有效缓存大小（建议设置为物理内存的75%）
ALTER SYSTEM SET effective_cache_size = '6GB';

-- WAL缓冲区
ALTER SYSTEM SET wal_buffers = '64MB';
```

### 2.2 WAL优化

```sql
-- 检查点完成目标
ALTER SYSTEM SET checkpoint_completion_target = 0.9;

-- WAL写入器延迟
ALTER SYSTEM SET wal_writer_delay = '200ms';

-- WAL同步方法
ALTER SYSTEM SET wal_sync_method = 'fdatasync';

-- WAL段大小
ALTER SYSTEM SET wal_segment_size = '256MB';
```

### 2.3 查询优化

#### 高级索引类型
```sql
-- GIN索引（数组、全文搜索）
CREATE INDEX idx_user_tags ON users USING GIN(tags);

-- GiST索引（几何数据）
CREATE INDEX idx_locations_geometry ON locations USING GIST(geometry);

-- SP-GiST索引（空间分区）
CREATE INDEX idx_user_data ON users USING SPGIST(data);

-- BRIN索引（大表范围查询）
CREATE INDEX idx_orders_created_at ON orders USING BRIN(created_at);
```

#### 部分索引
```sql
-- 只为活跃用户创建索引
CREATE INDEX idx_active_users_email ON users(email) WHERE is_active = TRUE;

-- 只为未完成订单创建索引
CREATE INDEX idx_pending_orders ON orders(user_id, order_date) WHERE status = 'pending';
```

#### 表达式索引
```sql
-- 表达式索引
CREATE INDEX idx_users_lower_email ON users(LOWER(email));

-- 函数索引
CREATE INDEX idx_users_date_year ON users(EXTRACT(YEAR FROM created_at));
```

#### 物化视图
```sql
-- 创建物化视图
CREATE MATERIALIZED VIEW mv_user_order_stats AS
SELECT 
    user_id,
    COUNT(*) AS order_count,
    SUM(total_amount) AS total_spent,
    MAX(order_date) AS last_order_date
FROM orders
GROUP BY user_id
WITH DATA;

-- 刷新物化视图
REFRESH MATERIALIZED VIEW mv_user_order_stats;

-- 并发刷新物化视图
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_order_stats;
```

### 2.4 并发控制优化

```sql
-- 设置最大连接数
ALTER SYSTEM SET max_connections = 200;

-- 设置超级用户保留连接数
ALTER SYSTEM SET superuser_reserved_connections = 3;

-- 设置锁超时
SET lock_timeout = '5s';

-- 设置语句超时
SET statement_timeout = '30s';
```

## 3. SQL Server优化

### 3.1 内存配置优化

```sql
-- 设置最大服务器内存
EXEC sp_configure 'max server memory', 8192;  -- 8GB
RECONFIGURE;

-- 设置最小服务器内存
EXEC sp_configure 'min server memory', 4096;  -- 4GB
RECONFIGURE;

-- 设置最大并行度
EXEC sp_configure 'max degree of parallelism', 4;
RECONFIGURE;

-- 设置并行查询成本阈值
EXEC sp_configure 'cost threshold for parallelism', 5;
RECONFIGURE;
```

### 3.2 索引优化

#### 包含列索引
```sql
-- 创建包含列索引（覆盖索引）
CREATE INDEX idx_orders_covering ON orders(user_id, order_date)
INCLUDE (total_amount, status);
```

#### 过滤索引
```sql
-- 创建过滤索引
CREATE INDEX idx_active_users ON users(email)
WHERE is_active = 1;
```

#### 列存储索引
```sql
-- 创建列存储索引（数据仓库）
CREATE COLUMNSTORE INDEX idx_orders_columnstore ON orders(user_id, order_date, total_amount);
```

#### 视图索引
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

### 3.3 查询优化

#### 查询提示
```sql
-- 使用连接提示
SELECT u.name, o.total_amount 
FROM users u 
INNER LOOP JOIN orders o ON u.id = o.user_id;

-- 使用索引提示
SELECT * FROM users WITH (INDEX(idx_users_email)) WHERE email = 'john@example.com';

-- 使用优化器提示
SELECT u.name, o.total_amount 
FROM users u 
JOIN orders o ON u.id = o.user_id
OPTION (LOOP JOIN, MAXDOP 1);
```

#### 表变量与临时表
```sql
-- 使用表变量（小数据量）
DECLARE @UserTable TABLE (
    id INT,
    name VARCHAR(50)
);

-- 使用临时表（大数据量）
CREATE TABLE #TempUsers (
    id INT,
    name VARCHAR(50)
);

-- 创建临时表索引
CREATE INDEX idx_temp_users_id ON #TempUsers(id);
```

### 3.4 并发控制优化

```sql
-- 设置快照隔离级别
ALTER DATABASE YourDatabase SET ALLOW_SNAPSHOT_ISOLATION ON;
ALTER DATABASE YourDatabase SET READ_COMMITTED_SNAPSHOT ON;

-- 使用快照隔离级别
SET TRANSACTION ISOLATION LEVEL SNAPSHOT;
BEGIN TRANSACTION;
-- 查询操作
COMMIT TRANSACTION;
```

## 4. Oracle优化

### 4.1 内存配置优化

```sql
-- 设置SGA大小
ALTER SYSTEM SET sga_target = 4G SCOPE = SPFILE;

-- 设置PGA大小
ALTER SYSTEM SET pga_aggregate_target = 1G SCOPE = SPFILE;

-- 设置共享池大小
ALTER SYSTEM SET shared_pool_size = 1G SCOPE = SPFILE;

-- 设置缓冲区缓存大小
ALTER SYSTEM SET db_cache_size = 2G SCOPE = SPFILE;
```

### 4.2 索引优化

#### 位图索引
```sql
-- 创建位图索引（适用于低基数列）
CREATE BITMAP INDEX idx_users_gender ON users(gender);

-- 创建位图连接索引
CREATE BITMAP INDEX idx_orders_users ON orders(user_id) FROM orders, users WHERE orders.user_id = users.id;
```

#### 函数索引
```sql
-- 创建函数索引
CREATE INDEX idx_users_lower_email ON users(LOWER(email));

-- 使用函数索引
SELECT * FROM users WHERE LOWER(email) = 'john@example.com';
```

#### 分区表索引
```sql
-- 创建分区表
CREATE TABLE orders (
    id NUMBER,
    user_id NUMBER,
    total_amount NUMBER(10,2),
    order_date DATE,
    status VARCHAR2(20)
)
PARTITION BY RANGE (order_date) (
    PARTITION p2022 VALUES LESS THAN (DATE '2023-01-01'),
    PARTITION p2023 VALUES LESS THAN (DATE '2024-01-01'),
    PARTITION p2024 VALUES LESS THAN (DATE '2025-01-01')
);

-- 创建本地分区索引
CREATE INDEX idx_orders_user_id ON orders(user_id) LOCAL;

-- 创建全局分区索引
CREATE INDEX idx_orders_date ON orders(order_date) GLOBAL;
```

### 4.3 查询优化

#### 查询提示
```sql
-- 使用索引提示
SELECT /*+ INDEX(users idx_users_email) */ * FROM users WHERE email = 'john@example.com';

-- 使用连接提示
SELECT /*+ USE_NL(users orders) */ u.name, o.total_amount 
FROM users u 
JOIN orders o ON u.id = o.user_id;

-- 使用并行提示
SELECT /*+ PARALLEL(orders 4) */ * FROM orders WHERE order_date > DATE '2023-01-01';
```

#### 物化视图
```sql
-- 创建物化视图
CREATE MATERIALIZED VIEW mv_user_order_stats
BUILD IMMEDIATE
REFRESH COMPLETE ON DEMAND
ENABLE QUERY REWRITE
AS
SELECT 
    user_id,
    COUNT(*) AS order_count,
    SUM(total_amount) AS total_spent,
    MAX(order_date) AS last_order_date
FROM orders
GROUP BY user_id;

-- 刷新物化视图
BEGIN
    DBMS_MVIEW.REFRESH('mv_user_order_stats', 'C');
END;
```

### 4.4 统计信息优化

```sql
-- 收集表统计信息
BEGIN
    DBMS_STATS.GATHER_TABLE_STATS(
        ownname => 'SCOTT',
        tabname => 'USERS',
        cascade => TRUE,
        estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE,
        method_opt => 'FOR ALL COLUMNS SIZE AUTO'
    );
END;

-- 收集索引统计信息
BEGIN
    DBMS_STATS.GATHER_INDEX_STATS(
        ownname => 'SCOTT',
        indname => 'IDX_USERS_EMAIL'
    );
END;

-- 收集数据库统计信息
BEGIN
    DBMS_STATS.GATHER_DATABASE_STATS(
        estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE,
        method_opt => 'FOR ALL COLUMNS SIZE AUTO'
    );
END;
```

## 5. SQLite优化

### 5.1 PRAGMA设置

```sql
-- 设置同步模式（性能优先）
PRAGMA synchronous = OFF;  -- 最高性能，但有数据丢失风险
PRAGMA synchronous = NORMAL;  -- 平衡性能和安全性
PRAGMA synchronous = FULL;  -- 最高安全性，但性能较低

-- 设置缓存大小
PRAGMA cache_size = -20000;  -- 20MB

-- 设置临时存储
PRAGMA temp_store = MEMORY;  -- 临时表存储在内存中

-- 设置页面大小
PRAGMA page_size = 4096;  -- 4KB页面大小

-- 设置WAL模式
PRAGMA journal_mode = WAL;  -- 使用WAL模式提高并发性能
```

### 5.2 索引优化

```sql
-- 创建索引
CREATE INDEX idx_users_email ON users(email);

-- 创建复合索引
CREATE INDEX idx_orders_user_date ON orders(user_id, order_date);

-- 创建唯一索引
CREATE UNIQUE INDEX idx_users_username ON users(username);
```

### 5.3 查询优化

```sql
-- 使用EXPLAIN QUERY PLAN分析查询
EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = 'john@example.com';

-- 使用ANALYZE分析查询
EXPLAIN QUERY PLAN ANALYZE SELECT * FROM users WHERE email = 'john@example.com';
```

## 6. NoSQL数据库优化

### 6.1 MongoDB优化

#### 索引优化
```javascript
// 创建单字段索引
db.users.createIndex({email: 1});

// 创建复合索引
db.orders.createIndex({user_id: 1, order_date: -1});

// 创建唯一索引
db.users.createIndex({username: 1}, {unique: true});

// 创建稀疏索引
db.users.createIndex({optional_field: 1}, {sparse: true});

// 创建TTL索引
db.sessions.createIndex({created_at: 1}, {expireAfterSeconds: 3600});
```

#### 查询优化
```javascript
// 使用投影减少数据传输
db.users.find({status: "active"}, {name: 1, email: 1});

// 使用limit限制结果集
db.orders.find().sort({order_date: -1}).limit(100);

// 使用聚合管道优化复杂查询
db.orders.aggregate([
    {$match: {order_date: {$gte: new Date("2023-01-01")}}},
    {$group: {
        _id: "$user_id",
        total_spent: {$sum: "$total_amount"},
        order_count: {$sum: 1}
    }},
    {$sort: {total_spent: -1}},
    {$limit: 10}
]);
```

### 6.2 Redis优化

#### 内存优化
```bash
# 设置最大内存
CONFIG SET maxmemory 2gb

# 设置内存策略
CONFIG SET maxmemory-policy allkeys-lru

# 使用哈希优化内存
HSET user:1 name "John" email "john@example.com" age 30
```

#### 持久化优化
```bash
# RDB持久化配置
CONFIG SET save "900 1 300 10 60 10000"

# AOF持久化配置
CONFIG SET appendonly yes
CONFIG SET appendfsync everysec
```

## 7. 数据库性能监控

### 7.1 MySQL监控

```sql
-- 查看性能指标
SHOW STATUS LIKE 'Com_%';
SHOW STATUS LIKE 'Handler_%';
SHOW STATUS LIKE 'Innodb_%';

-- 查看慢查询
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
```

### 7.2 PostgreSQL监控

```sql
-- 查看活动连接
SELECT * FROM pg_stat_activity;

-- 查看数据库统计
SELECT * FROM pg_stat_database;

-- 查看表统计
SELECT * FROM pg_stat_user_tables;

-- 查看索引统计
SELECT * FROM pg_stat_user_indexes;
```

### 7.3 SQL Server监控

```sql
-- 查看性能指标
SELECT * FROM sys.dm_os_performance_counters;

-- 查看慢查询
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

## 8. 数据库优化最佳实践

### 8.1 通用优化原则

1. **合理设计索引**
   - 为常用查询条件创建索引
   - 避免过多索引影响写入性能
   - 定期分析索引使用情况

2. **优化查询语句**
   - 避免SELECT *
   - 使用LIMIT限制结果集
   - 避免在WHERE子句中使用函数

3. **合理配置内存**
   - 根据数据库类型调整内存配置
   - 平衡缓存和其他内存使用
   - 监控内存使用情况

4. **定期维护数据库**
   - 更新统计信息
   - 重建索引
   - 清理无用数据

### 8.2 数据库特定建议

1. **MySQL**
   - 优先使用InnoDB引擎
   - 合理设置缓冲池大小
   - 使用分区表处理大数据量

2. **PostgreSQL**
   - 利用高级索引类型
   - 使用部分索引减少索引大小
   - 合理配置WAL参数

3. **SQL Server**
   - 使用包含列索引
   - 利用列存储索引优化分析查询
   - 合理设置并行度

4. **Oracle**
   - 使用位图索引处理低基数列
   - 利用物化视图优化复杂查询
   - 定期收集统计信息

## 9. 参考资源

- [索引优化指南](./index-optimization-guide.md)
- [执行计划分析](./execution-plan-analysis.md)
- [查询优化指南](./query-optimization-guide.md)
- [SQL性能调优](./sql-performance-tuning.md)