# ClickHouse SQL 语法指南

## 基本概念

### ClickHouse 简介

ClickHouse 是一个面向列的开源 OLAP 数据库管理系统（DBMS），用于在线分析处理（OLAP）查询。它具有以下特点：

1. **列式存储**：数据按列存储，有利于分析查询
2. **向量化执行**：利用 CPU 向量指令加速查询执行
3. **数据压缩**：高效的数据压缩算法
4. **并行处理**：支持多核并行查询处理
5. **实时查询**：支持实时数据插入和查询
6. **高可用性**：支持副本和分片

### 数据库和表的基本概念

#### 数据库
```sql
-- 创建数据库
CREATE DATABASE db_name;

-- 使用数据库
USE db_name;

-- 删除数据库
DROP DATABASE db_name;

-- 显示所有数据库
SHOW DATABASES;

-- 显示数据库中的表
SHOW TABLES FROM db_name;
```

#### 表引擎
ClickHouse 支持多种表引擎，每种引擎适用于不同的场景：

1. **MergeTree 系列**：最常用的表引擎，支持索引和分区
2. **Log 系列**：简单的日志表引擎
3. **分布式引擎**：用于分布式查询
4. **外部引擎**：用于访问外部数据源

## 数据类型

### 基本数据类型

#### 整数类型
```sql
-- 固定长度整数
UInt8  -- 无符号 8 位整数 (0 到 255)
UInt16 -- 无符号 16 位整数 (0 到 65535)
UInt32 -- 无符号 32 位整数 (0 到 4294967295)
UInt64 -- 无符号 64 位整数 (0 到 18446744073709551615)

Int8   -- 有符号 8 位整数 (-128 到 127)
Int16  -- 有符号 16 位整数 (-32768 到 32767)
Int32  -- 有符号 32 位整数 (-2147483648 到 2147483647)
Int64  -- 有符号 64 位整数 (-9223372036854775808 到 9223372036854775807)

-- 使用示例
CREATE TABLE numbers (
    id UInt32,
    value Int64
) ENGINE = TinyLog;

INSERT INTO numbers VALUES (1, 100), (2, -50), (3, 0);
```

#### 浮点数类型
```sql
-- 浮点数类型
Float32  -- 单精度浮点数
Float64  -- 双精度浮点数

-- 使用示例
CREATE TABLE measurements (
    sensor_id UInt32,
    temperature Float32,
    pressure Float64
) ENGINE = TinyLog;

INSERT INTO measurements VALUES (1, 23.5, 1013.25), (2, 18.2, 1010.5);
```

#### 字符串类型
```sql
-- 字符串类型
String    -- 可变长度字符串
FixedString(N) -- 固定长度字符串，N 为字节数

-- 使用示例
CREATE TABLE users (
    id UInt32,
    name String,
    email FixedString(50)
) ENGINE = TinyLog;

INSERT INTO users VALUES (1, 'John Doe', 'john@example.com'), (2, 'Jane Smith', 'jane@example.com');
```

#### 日期和时间类型
```sql
-- 日期和时间类型
Date       -- 日期，存储为自 1970-01-01 以来的天数
DateTime   -- 日期和时间，存储为自 1970-01-01 00:00:00 以来的秒数
DateTime64 -- 精确到亚秒的日期时间

-- 使用示例
CREATE TABLE events (
    id UInt32,
    event_date Date,
    event_time DateTime,
    event_time_micro DateTime64(6)
) ENGINE = TinyLog;

INSERT INTO events VALUES 
(1, '2023-01-01', '2023-01-01 12:00:00', '2023-01-01 12:00:00.123456');
```

### 复合数据类型

#### 数组类型
```sql
-- 数组类型
Array(T)  -- T 可以是任何类型，包括 Array 本身

-- 使用示例
CREATE TABLE users (
    id UInt32,
    tags Array(String),
    scores Array(UInt8)
) ENGINE = TinyLog;

INSERT INTO users VALUES 
(1, ['admin', 'user'], [90, 85, 95]),
(2, ['user'], [80, 75]);
```

#### 元组类型
```sql
-- 元组类型
Tuple(T1, T2, ...)  -- T1, T2 等可以是任何类型

-- 使用示例
CREATE TABLE points (
    id UInt32,
    coordinates Tuple(Float64, Float64)
) ENGINE = TinyLog;

INSERT INTO points VALUES 
(1, (40.7128, -74.0060)),
(2, (34.0522, -118.2437));
```

#### 嵌套类型
```sql
-- 嵌套类型
Nested(Name1 Type1, Name2 Type2, ...)  -- 类似于结构体

-- 使用示例
CREATE TABLE orders (
    id UInt32,
    items Nested(
        product_id UInt32,
        quantity UInt32,
        price Float64
    )
) ENGINE = TinyLog;

INSERT INTO orders VALUES 
(1, [1, 2], [2, 1], [10.5, 20.0]),
(2, [3], [1], [15.75]);
```

### 特殊数据类型

#### UUID 类型
```sql
-- UUID 类型
UUID  -- 128 位 UUID

-- 使用示例
CREATE TABLE sessions (
    id UUID,
    user_id UInt32,
    start_time DateTime
) ENGINE = TinyLog;

INSERT INTO sessions VALUES 
(generateUUIDv4(), 1, now()),
(generateUUIDv4(), 2, now());
```

#### IPv4 和 IPv6 类型
```sql
-- IP 地址类型
IPv4  -- 32 位 IPv4 地址
IPv6  -- 128 位 IPv6 地址

-- 使用示例
CREATE TABLE access_logs (
    id UInt32,
    client_ip IPv4,
    server_ip IPv4
) ENGINE = TinyLog;

INSERT INTO access_logs VALUES 
(1, toIPv4('192.168.1.1'), toIPv4('10.0.0.1')),
(2, toIPv4('10.0.0.2'), toIPv4('10.0.0.1'));
```

#### 枚举类型
```sql
-- 枚举类型
Enum8('name1' = value1, 'name2' = value2, ...)  -- 8 位枚举
Enum16('name1' = value1, 'name2' = value2, ...) -- 16 位枚举

-- 使用示例
CREATE TABLE users (
    id UInt32,
    status Enum8('active' = 1, 'inactive' = 2, 'banned' = 3)
) ENGINE = TinyLog;

INSERT INTO users VALUES 
(1, 'active'),
(2, 'inactive'),
(3, 'banned');
```

#### 可空类型
```sql
-- 可空类型
Nullable(T)  -- T 可以是任何类型，除了 Array 和 Nested

-- 使用示例
CREATE TABLE users (
    id UInt32,
    name Nullable(String),
    age Nullable(UInt8)
) ENGINE = TinyLog;

INSERT INTO users VALUES 
(1, 'John Doe', 30),
(2, NULL, NULL);
```

## 基本操作

### 数据库操作

#### 创建数据库
```sql
-- 创建数据库
CREATE DATABASE db_name;

-- 创建数据库时指定引擎
CREATE DATABASE db_name ENGINE = Atomic;

-- 创建数据库时指定注释
CREATE DATABASE db_name COMMENT 'Database description';
```

#### 修改数据库
```sql
-- 修改数据库注释
ALTER DATABASE db_name MODIFY COMMENT 'New description';

-- 重命名数据库
RENAME DATABASE db_name TO new_db_name;
```

#### 删除数据库
```sql
-- 删除数据库
DROP DATABASE db_name;

-- 删除数据库（如果存在）
DROP DATABASE IF EXISTS db_name;
```

### 表操作

#### 创建表
```sql
-- 创建基本表
CREATE TABLE table_name (
    column1 Type1,
    column2 Type2,
    ...
) ENGINE = engine_name;

-- 创建表时指定排序键
CREATE TABLE table_name (
    column1 Type1,
    column2 Type2,
    ...
) ENGINE = MergeTree()
ORDER BY column1;

-- 创建表时指定分区键
CREATE TABLE table_name (
    column1 Type1,
    column2 Type2,
    ...
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(column1)
ORDER BY column2;

-- 创建表时指定采样键
CREATE TABLE table_name (
    column1 Type1,
    column2 Type2,
    ...
) ENGINE = MergeTree()
ORDER BY column1
SAMPLE BY column2;

-- 创建表时指定TTL
CREATE TABLE table_name (
    column1 Type1,
    column2 Type2,
    ...
) ENGINE = MergeTree()
ORDER BY column1
TTL column1 + INTERVAL 1 DAY DELETE;
```

#### 修改表
```sql
-- 添加列
ALTER TABLE table_name ADD COLUMN column_name Type;

-- 删除列
ALTER TABLE table_name DROP COLUMN column_name;

-- 修改列类型
ALTER TABLE table_name MODIFY COLUMN column_name NewType;

-- 重命名列
ALTER TABLE table_name RENAME COLUMN old_name TO new_name;

-- 添加索引
ALTER TABLE table_name ADD INDEX index_name column_name TYPE minmax GRANULARITY 1;

-- 删除索引
ALTER TABLE table_name DROP INDEX index_name;

-- 修改排序键
ALTER TABLE table_name MODIFY ORDER BY new_column;

-- 修改分区键
ALTER TABLE table_name MODIFY PARTITION BY new_column;

-- 添加TTL
ALTER TABLE table_name MODIFY TTL column + INTERVAL 1 DAY DELETE;

-- 移除TTL
ALTER TABLE table_name REMOVE TTL;
```

#### 删除表
```sql
-- 删除表
DROP TABLE table_name;

-- 删除表（如果存在）
DROP TABLE IF EXISTS table_name;

-- 删除表并保留数据
DROP TABLE table_name NO DELAY;
```

#### 重命名表
```sql
-- 重命名表
RENAME TABLE old_name TO new_name;

-- 移动表到另一个数据库
RENAME TABLE db1.table_name TO db2.table_name;
```

### 数据操作

#### 插入数据
```sql
-- 基本插入
INSERT INTO table_name VALUES (value1, value2, ...);

-- 指定列插入
INSERT INTO table_name (column1, column2, ...) VALUES (value1, value2, ...);

-- 插入多行
INSERT INTO table_name VALUES 
(value1_1, value1_2, ...),
(value2_1, value2_2, ...),
...;

-- 从其他表插入
INSERT INTO table_name SELECT * FROM other_table;

-- 从文件插入
INSERT INTO table_name FORMAT CSV 'file.csv';
```

#### 更新数据
```sql
-- ClickHouse 不支持直接的 UPDATE 操作，但可以使用 ALTER TABLE ... UPDATE
ALTER TABLE table_name UPDATE column = value WHERE condition;

-- 批量更新
ALTER TABLE table_name UPDATE 
    column1 = value1,
    column2 = value2
WHERE condition;
```

#### 删除数据
```sql
-- ClickHouse 不支持直接的 DELETE 操作，但可以使用 ALTER TABLE ... DELETE
ALTER TABLE table_name DELETE WHERE condition;

-- 使用 TTL 自动删除数据
ALTER TABLE table_name MODIFY TTL column + INTERVAL 1 DAY DELETE;
```

#### 查询数据
```sql
-- 基本查询
SELECT column1, column2, ... FROM table_name;

-- 查询所有列
SELECT * FROM table_name;

-- 带条件查询
SELECT * FROM table_name WHERE condition;

-- 排序查询
SELECT * FROM table_name ORDER BY column1 [ASC|DESC];

-- 限制结果数量
SELECT * FROM table_name LIMIT count;

-- 分页查询
SELECT * FROM table_name LIMIT offset, count;

-- 分组查询
SELECT column1, aggregate_function(column2) 
FROM table_name 
GROUP BY column1;

-- 带条件的分组查询
SELECT column1, aggregate_function(column2) 
FROM table_name 
WHERE condition 
GROUP BY column1 
HAVING group_condition;
```

## CRUD 操作

### CREATE 操作

#### 创建表
```sql
-- 创建 MergeTree 表
CREATE TABLE events (
    event_id String,
    event_type String,
    event_time DateTime,
    user_id UInt32,
    event_data String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_type, event_time)
TTL event_time + INTERVAL 30 DAY DELETE;

-- 创建 ReplicatedMergeTree 表（集群环境）
CREATE TABLE events (
    event_id String,
    event_type String,
    event_time DateTime,
    user_id UInt32,
    event_data String
) ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_type, event_time)
TTL event_time + INTERVAL 30 DAY DELETE;

-- 创建 Distributed 表（集群环境）
CREATE TABLE distributed_events AS events
ENGINE = Distributed(cluster_name, default, events, cityHash64(event_id));
```

#### 创建视图
```sql
-- 创建普通视图
CREATE VIEW view_name AS SELECT ... FROM table_name WHERE ...;

-- 创建物化视图
CREATE MATERIALIZED VIEW view_name
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, key)
AS SELECT 
    toDate(event_time) as date,
    key,
    count() as count,
    sum(value) as total
FROM events
GROUP BY date, key;

-- 创建物化视图并关联到表
CREATE MATERIALIZED VIEW view_name TO destination_table
AS SELECT ... FROM source_table WHERE ...;
```

### READ 操作

#### 基本查询
```sql
-- 简单查询
SELECT * FROM events;

-- 选择特定列
SELECT event_id, event_type, event_time FROM events;

-- 带条件查询
SELECT * FROM events WHERE event_type = 'click';

-- 带多个条件的查询
SELECT * FROM events 
WHERE event_type = 'click' AND event_time >= '2023-01-01';

-- 使用 IN 子句
SELECT * FROM events WHERE event_type IN ('click', 'view', 'purchase');

-- 使用 LIKE 模糊查询
SELECT * FROM events WHERE event_data LIKE '%product%';

-- 使用正则表达式
SELECT * FROM events WHERE event_data MATCHES 'product[0-9]+';
```

#### 高级查询
```sql
-- 使用 WITH 子句
WITH 
    daily_stats AS (
        SELECT 
            toDate(event_time) as date,
            event_type,
            count() as count
        FROM events
        GROUP BY date, event_type
    )
SELECT 
    date,
    sumIf(count, event_type = 'click') as click_count,
    sumIf(count, event_type = 'view') as view_count
FROM daily_stats
GROUP BY date;

-- 使用窗口函数
SELECT 
    event_id,
    event_type,
    event_time,
    row_number() OVER (PARTITION BY user_id ORDER BY event_time) as event_seq
FROM events;

-- 使用 JOIN
SELECT 
    e.event_id,
    e.event_type,
    e.event_time,
    u.name as user_name
FROM events e
LEFT JOIN users u ON e.user_id = u.id;

-- 使用子查询
SELECT * FROM events 
WHERE event_time = (
    SELECT max(event_time) FROM events
);
```

#### 聚合查询
```sql
-- 基本聚合
SELECT 
    event_type,
    count() as count,
    sum(user_id) as total_user_id
FROM events
GROUP BY event_type;

-- 使用 DISTINCT
SELECT DISTINCT event_type FROM events;

-- 使用 GROUPING SETS
SELECT 
    toDate(event_time) as date,
    event_type,
    count() as count
FROM events
GROUP BY GROUPING SETS (
    (date, event_type),
    (date),
    (event_type),
    ()
);

-- 使用 CUBE
SELECT 
    toDate(event_time) as date,
    event_type,
    count() as count
FROM events
GROUP BY CUBE (date, event_type);

-- 使用 ROLLUP
SELECT 
    toDate(event_time) as date,
    event_type,
    count() as count
FROM events
GROUP BY ROLLUP (date, event_type);
```

### UPDATE 操作

#### 使用 ALTER TABLE UPDATE
```sql
-- 更新单个列
ALTER TABLE events UPDATE event_type = 'updated' WHERE event_id = '123';

-- 更新多个列
ALTER TABLE events UPDATE 
    event_type = 'updated',
    event_data = 'new data'
WHERE event_id = '123';

-- 基于其他表的更新
ALTER TABLE events UPDATE event_type = 'updated' 
WHERE user_id IN (
    SELECT id FROM users WHERE status = 'premium'
);
```

#### 使用 INSERT 和 SELECT 替代 UPDATE
```sql
-- 创建临时表存储更新数据
CREATE TEMPORARY TABLE temp_updates (
    event_id String,
    new_event_type String
) ENGINE = Memory;

-- 插入更新数据
INSERT INTO temp_updates VALUES 
('123', 'updated'),
('456', 'updated');

-- 使用 JOIN 更新
ALTER TABLE events UPDATE event_type = new_event_type 
FROM temp_updates 
WHERE events.event_id = temp_updates.event_id;
```

### DELETE 操作

#### 使用 ALTER TABLE DELETE
```sql
-- 删除特定行
ALTER TABLE events DELETE WHERE event_id = '123';

-- 基于条件删除
ALTER TABLE events DELETE WHERE event_time < '2023-01-01';

-- 基于其他表删除
ALTER TABLE events DELETE 
WHERE user_id IN (
    SELECT id FROM users WHERE status = 'banned'
);
```

#### 使用 TTL 自动删除
```sql
-- 设置 TTL 自动删除旧数据
ALTER TABLE events MODIFY TTL event_time + INTERVAL 30 DAY DELETE;

-- 设置 TTL 自动删除特定条件的数据
ALTER TABLE events MODIFY TTL 
    event_time + INTERVAL 30 DAY DELETE,
    event_type = 'temp' + INTERVAL 1 DAY DELETE;
```

## 聚合操作

### 基本聚合函数

#### 计数函数
```sql
-- 计数
SELECT count() FROM events;
SELECT count(*) FROM events;
SELECT count(DISTINCT user_id) FROM events;

-- 精确去重计数
SELECT uniqExact(user_id) FROM events;

-- 近似去重计数（更快，但可能有误差）
SELECT uniq(user_id) FROM events;
SELECT uniqHLL12(user_id) FROM events;
SELECT uniqCombined(user_id) FROM events;
```

#### 求和与平均值
```sql
-- 求和
SELECT sum(user_id) FROM events;

-- 平均值
SELECT avg(user_id) FROM events;

-- 条件求和
SELECT sumIf(user_id, event_type = 'click') FROM events;

-- 条件平均值
SELECT avgIf(user_id, event_type = 'click') FROM events;
```

#### 最值函数
```sql
-- 最大值
SELECT max(event_time) FROM events;

-- 最小值
SELECT min(event_time) FROM events;

-- 条件最大值
SELECT maxIf(event_time, event_type = 'click') FROM events;

-- 条件最小值
SELECT minIf(event_time, event_type = 'click') FROM events;
```

### 高级聚合函数

#### 分位数函数
```sql
-- 中位数
SELECT median(user_id) FROM events;

-- 分位数
SELECT quantile(0.95)(user_id) FROM events;

-- 多分位数
SELECT quantiles(0.25, 0.5, 0.75)(user_id) FROM events;
```

#### 序列相关函数
```sql
-- 序列求和
SELECT sumArray([1, 2, 3, 4]);  -- 返回 10

-- 序列平均值
SELECT avgArray([1, 2, 3, 4]);  -- 返回 2.5

-- 序列最小值
SELECT minArray([1, 2, 3, 4]);  -- 返回 1

-- 序列最大值
SELECT maxArray([1, 2, 3, 4]);  -- 返回 4
```

#### 状态聚合函数
```sql
-- 使用状态聚合函数进行多阶段聚合
-- 第一阶段：创建聚合状态
CREATE TABLE events_agg_state AS
SELECT 
    event_type,
    countState() as count_state,
    sumState(user_id) as sum_state,
    uniqState(user_id) as uniq_state
FROM events
GROUP BY event_type;

-- 第二阶段：合并状态并获取结果
SELECT 
    event_type,
    countMerge(count_state) as count,
    sumMerge(sum_state) as total_user_id,
    uniqMerge(uniq_state) as unique_users
FROM events_agg_state
GROUP BY event_type;
```

### 窗口函数

#### 基本窗口函数
```sql
-- 行号
SELECT 
    event_id,
    event_type,
    event_time,
    row_number() OVER (ORDER BY event_time) as row_num
FROM events;

-- 排名
SELECT 
    user_id,
    count() as event_count,
    rank() OVER (ORDER BY count() DESC) as rank
FROM events
GROUP BY user_id;

-- 密集排名
SELECT 
    user_id,
    count() as event_count,
    dense_rank() OVER (ORDER BY count() DESC) as dense_rank
FROM events
GROUP BY user_id;
```

#### 分析窗口函数
```sql
-- 累计求和
SELECT 
    event_date,
    event_type,
    count() as daily_count,
    sum(count()) OVER (PARTITION BY event_type ORDER BY event_date) as cumulative_count
FROM (
    SELECT 
        toDate(event_time) as event_date,
        event_type,
        count() as count
    FROM events
    GROUP BY event_date, event_type
)
GROUP BY event_date, event_type;

-- 移动平均
SELECT 
    event_date,
    event_type,
    count() as daily_count,
    avg(count()) OVER (
        PARTITION BY event_type 
        ORDER BY event_date 
        ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING
    ) as moving_avg
FROM (
    SELECT 
        toDate(event_time) as event_date,
        event_type,
        count() as count
    FROM events
    GROUP BY event_date, event_type
)
GROUP BY event_date, event_type;
```

## 索引

### 主键索引

#### 排序键（ORDER BY）
```sql
-- 单列排序键
CREATE TABLE events (
    event_id String,
    event_type String,
    event_time DateTime
) ENGINE = MergeTree()
ORDER BY event_time;

-- 复合排序键
CREATE TABLE events (
    event_id String,
    event_type String,
    event_time DateTime
) ENGINE = MergeTree()
ORDER BY (event_type, event_time);

-- 使用表达式作为排序键
CREATE TABLE events (
    event_id String,
    event_type String,
    event_time DateTime
) ENGINE = MergeTree()
ORDER BY (event_type, toYYYYMM(event_time));
```

#### 主键（PRIMARY KEY）
```sql
-- 显式指定主键（默认与排序键相同）
CREATE TABLE events (
    event_id String,
    event_type String,
    event_time DateTime
) ENGINE = MergeTree()
PRIMARY KEY event_id
ORDER BY (event_type, event_time);

-- 主键与排序键不同
CREATE TABLE events (
    event_id String,
    event_type String,
    event_time DateTime
) ENGINE = MergeTree()
PRIMARY KEY event_id
ORDER BY (event_type, event_time);
```

### 跳数索引

#### minmax 索引
```sql
-- 创建 minmax 索引
CREATE TABLE events (
    event_id String,
    event_type String,
    event_time DateTime,
    INDEX idx_event_type event_type TYPE minmax GRANULARITY 1
) ENGINE = MergeTree()
ORDER BY event_time;

-- 查询使用 minmax 索引
SELECT * FROM events WHERE event_type = 'click';
```

#### set 索引
```sql
-- 创建 set 索引
CREATE TABLE events (
    event_id String,
    event_type String,
    event_time DateTime,
    INDEX idx_event_type event_type TYPE set(1000) GRANULARITY 1
) ENGINE = MergeTree()
ORDER BY event_time;

-- 查询使用 set 索引
SELECT * FROM events WHERE event_type IN ('click', 'view');
```

#### bloom_filter 索引
```sql
-- 创建 bloom_filter 索引
CREATE TABLE events (
    event_id String,
    event_type String,
    event_time DateTime,
    INDEX idx_event_type event_type TYPE bloom_filter GRANULARITY 1
) ENGINE = MergeTree()
ORDER BY event_time;

-- 查询使用 bloom_filter 索引
SELECT * FROM events WHERE event_type = 'click';
```

#### tokenbf_v1 索引
```sql
-- 创建 tokenbf_v1 索引（适用于字符串）
CREATE TABLE events (
    event_id String,
    event_description String,
    INDEX idx_description event_description TYPE tokenbf_v1(256, 3, 0) GRANULARITY 1
) ENGINE = MergeTree()
ORDER BY event_id;

-- 查询使用 tokenbf_v1 索引
SELECT * FROM events WHERE event_description LIKE '%product%';
```

### 索引管理

#### 添加索引
```sql
-- 添加跳数索引
ALTER TABLE events ADD INDEX idx_event_type event_type TYPE minmax GRANULARITY 1;

-- 添加条件索引
ALTER TABLE events ADD INDEX idx_event_time event_time TYPE minmax GRANULARITY 1 WHERE event_type = 'click';
```

#### 删除索引
```sql
-- 删除索引
ALTER TABLE events DROP INDEX idx_event_type;
```

#### 重建索引
```sql
-- 重建索引（通过 MATERIALIZE INDEX）
ALTER TABLE events MATERIALIZE INDEX idx_event_type;
```

## 事务

### 事务概述

ClickHouse 对事务的支持有限，主要支持以下事务特性：

1. **原子性**：支持单条语句的原子性
2. **一致性**：支持单条语句的一致性
3. **隔离性**：支持 MVCC（多版本并发控制）
4. **持久性**：支持数据的持久化

### 事务操作

#### 开始事务
```sql
-- 开始事务
BEGIN TRANSACTION;

-- 设置事务隔离级别
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

#### 提交事务
```sql
-- 提交事务
COMMIT;
```

#### 回滚事务
```sql
-- 回滚事务
ROLLBACK;
```

#### 事务示例
```sql
-- 事务示例
BEGIN TRANSACTION;

-- 插入数据
INSERT INTO events (event_id, event_type, event_time, user_id) 
VALUES ('123', 'click', now(), 1);

-- 更新数据
ALTER TABLE users UPDATE status = 'active' WHERE id = 1;

-- 提交事务
COMMIT;

-- 事务回滚示例
BEGIN TRANSACTION;

-- 插入数据
INSERT INTO events (event_id, event_type, event_time, user_id) 
VALUES ('456', 'click', now(), 2);

-- 回滚事务
ROLLBACK;
```

### 事务限制

ClickHouse 事务有以下限制：

1. **不支持跨表事务**：事务只能操作单个表
2. **不支持嵌套事务**：不支持嵌套事务
3. **不支持保存点**：不支持保存点
4. **不支持分布式事务**：不支持跨分片事务

## 性能优化

### 查询优化

#### 使用 PREWHERE
```sql
-- 使用 PREWHERE 优化查询
SELECT event_id, event_type, event_time 
FROM events 
PREWHERE event_date = '2023-01-01' 
WHERE event_type = 'click';
```

#### 使用 LIMIT
```sql
-- 使用 LIMIT 限制结果集
SELECT * FROM events LIMIT 100;

-- 使用 LIMIT 和 OFFSET 分页
SELECT * FROM events LIMIT 100 OFFSET 200;
```

#### 使用 SAMPLE
```sql
-- 使用 SAMPLE 抽样查询
SELECT * FROM events SAMPLE 0.1;  -- 10% 的数据

-- 使用 SAMPLE 和 OFFSET
SELECT * FROM events SAMPLE 0.1 OFFSET 0.05;  -- 5% 到 15% 的数据
```

#### 使用适当的聚合函数
```sql
-- 使用近似聚合函数提高性能
SELECT uniq(user_id) FROM events;  -- 近似去重计数

-- 使用条件聚合函数
SELECT sumIf(amount, status = 'completed') AS completed_amount FROM orders;
```

### 表设计优化

#### 合理设计排序键
```sql
-- 根据查询模式设计排序键
CREATE TABLE events (
    event_id String,
    event_type String,
    event_time DateTime,
    event_date Date MATERIALIZED toDate(event_time)
) ENGINE = MergeTree()
ORDER BY (event_date, event_type, event_time);
```

#### 合理设计分区键
```sql
-- 根据查询模式设计分区键
CREATE TABLE events (
    event_id String,
    event_type String,
    event_time DateTime
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_type, event_time);
```

#### 使用 TTL 自动清理数据
```sql
-- 使用 TTL 自动清理旧数据
CREATE TABLE events (
    event_id String,
    event_type String,
    event_time DateTime
) ENGINE = MergeTree()
ORDER BY (event_type, event_time)
TTL event_time + INTERVAL 30 DAY DELETE;
```

#### 使用物化视图预计算
```sql
-- 创建物化视图预计算聚合数据
CREATE MATERIALIZED VIEW daily_events_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, event_type)
AS SELECT 
    toDate(event_time) as date, 
    event_type, 
    count() as count
FROM events
GROUP BY date, event_type;
```

### 系统优化

#### 调整内存设置
```sql
-- 调整内存设置
SET max_memory_usage = 10000000000;  -- 10GB
SET max_bytes_before_external_group_by = 5000000000;  -- 5GB
SET max_bytes_before_external_sort = 5000000000;  -- 5GB
```

#### 调整并行度
```sql
-- 调整并行度
SET max_threads = 8;
SET max_parallel_replicas = 2;
```

#### 使用分布式表
```sql
-- 创建分布式表
CREATE TABLE distributed_events AS local_events
ENGINE = Distributed(cluster_name, default, local_events, cityHash64(event_id));

-- 查询分布式表
SELECT * FROM distributed_events WHERE event_date = '2023-01-01';
```

## 数据建模

### 星型模型

#### 事实表设计
```sql
-- 事实表设计
CREATE TABLE events (
    event_id String,
    event_time DateTime,
    event_date Date MATERIALIZED toDate(event_time),
    user_id UInt32,
    product_id UInt32,
    event_type String,
    revenue Float64
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, event_type, user_id, product_id);
```

#### 维度表设计
```sql
-- 用户维度表
CREATE TABLE users (
    id UInt32,
    name String,
    email String,
    registration_date Date,
    country String,
    city String,
    gender Enum8('male' = 1, 'female' = 2, 'other' = 3)
) ENGINE = MergeTree()
ORDER BY id;

-- 产品维度表
CREATE TABLE products (
    id UInt32,
    name String,
    category String,
    price Float64,
    created_date Date
) ENGINE = MergeTree()
ORDER BY id;
```

### 雪花模型

#### 多级维度表设计
```sql
-- 产品类别表
CREATE TABLE product_categories (
    id UInt32,
    name String,
    parent_id UInt32
) ENGINE = MergeTree()
ORDER BY id;

-- 产品表（引用类别表）
CREATE TABLE products (
    id UInt32,
    name String,
    category_id UInt32,
    price Float64,
    created_date Date
) ENGINE = MergeTree()
ORDER BY id;
```

### 宽表设计

#### 反规范化设计
```sql
-- 宽表设计（反规范化）
CREATE TABLE events_wide (
    event_id String,
    event_time DateTime,
    event_date Date MATERIALIZED toDate(event_time),
    user_id UInt32,
    user_name String,
    user_country String,
    product_id UInt32,
    product_name String,
    product_category String,
    event_type String,
    revenue Float64
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, event_type, user_id, product_id);
```

### 时间序列设计

#### 时间序列表设计
```sql
-- 时间序列表设计
CREATE TABLE metrics (
    metric_name String,
    metric_value Float64,
    timestamp DateTime,
    tags Map(String, String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (metric_name, timestamp, tags);
```

#### 使用物化视图聚合时间序列数据
```sql
-- 创建物化视图聚合时间序列数据
CREATE MATERIALIZED VIEW metrics_hourly_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (metric_name, hour, tags)
AS SELECT 
    metric_name,
    toStartOfHour(timestamp) as hour,
    tags,
    sum(metric_value) as total_value,
    count() as count
FROM metrics
GROUP BY metric_name, hour, tags;
```

## 安全与权限

### 用户管理

#### 创建用户
```sql
-- 创建用户
CREATE USER user_name IDENTIFIED BY 'password';

-- 创建用户并指定主机
CREATE USER user_name IDENTIFIED BY 'password' HOST IP '192.168.1.0/24';

-- 创建用户并指定角色
CREATE USER user_name IDENTIFIED BY 'password' DEFAULT ROLE role_name;
```

#### 修改用户
```sql
-- 修改用户密码
ALTER USER user_name IDENTIFIED BY 'new_password';

-- 修改用户主机
ALTER USER user_name HOST IP '192.168.1.0/24';

-- 修改用户角色
ALTER USER user_name DEFAULT ROLE role_name;
```

#### 删除用户
```sql
-- 删除用户
DROP USER user_name;
```

### 角色管理

#### 创建角色
```sql
-- 创建角色
CREATE ROLE role_name;

-- 创建角色并授予权限
CREATE ROLE role_name GRANT SELECT ON db_name.table_name;
```

#### 修改角色
```sql
-- 授予权限
GRANT SELECT ON db_name.table_name TO role_name;

-- 撤销权限
REVOKE SELECT ON db_name.table_name FROM role_name;
```

#### 删除角色
```sql
-- 删除角色
DROP ROLE role_name;
```

### 行级安全

#### 行级策略
```sql
-- 创建行级策略
CREATE ROW POLICY policy_name ON db_name.table_name 
FOR SELECT USING condition;

-- 修改行级策略
ALTER ROW POLICY policy_name ON db_name.table_name 
FOR SELECT USING new_condition;

-- 删除行级策略
DROP ROW POLICY policy_name ON db_name.table_name;
```

### 列级安全

#### 列掩码
```sql
-- 创建列掩码
CREATE MASK POLICY policy_name ON db_name.table_name 
FOR COLUMN column_name USING expression;

-- 修改列掩码
ALTER MASK POLICY policy_name ON db_name.table_name 
FOR COLUMN column_name USING new_expression;

-- 删除列掩码
DROP MASK POLICY policy_name ON db_name.table_name;
```

## 备份与恢复

### 数据备份

#### 使用 CLICKHOUSE-BACKUP 工具
```bash
# 安装 clickhouse-backup
sudo apt-get install clickhouse-backup

# 创建备份
clickhouse-backup create backup_name

# 创建远程备份
clickhouse-backup create backup_name --remote

# 列出备份
clickhouse-backup list

# 删除备份
clickhouse-backup delete local backup_name
clickhouse-backup delete remote backup_name
```

#### 使用 EXPORT/IMPORT
```sql
-- 导出表数据
EXPORT TABLE db_name.table_name TO FILE('backup_path/table_name.tsv');

-- 导入表数据
IMPORT TABLE db_name.table_name FROM FILE('backup_path/table_name.tsv');
```

### 数据恢复

#### 使用 CLICKHOUSE-BACKUP 工具
```bash
# 从本地备份恢复
clickhouse-backup restore backup_name

# 从远程备份恢复
clickhouse-backup restore backup_name --remote

# 恢复特定表
clickhouse-backup restore backup_name --tables db_name.table_name
```

#### 使用 EXPORT/IMPORT
```sql
-- 导入表数据
IMPORT TABLE db_name.table_name FROM FILE('backup_path/table_name.tsv');
```

## 常用工具与命令

### 命令行工具

#### clickhouse-client
```bash
# 连接到 ClickHouse 服务器
clickhouse-client

# 连接到指定主机和端口
clickhouse-client --host=localhost --port=9000

# 使用指定用户连接
clickhouse-client --user=default --password=password

# 执行查询
clickhouse-client --query="SELECT 1"

# 执行文件中的查询
clickhouse-client --queries-file=queries.sql

# 输出格式
clickhouse-client --format=TSV
clickhouse-client --format=CSV
clickhouse-client --format=JSONEachRow
```

#### clickhouse-local
```bash
# 本地处理数据
echo "1,2,3" | clickhouse-local --query="SELECT sum(column1) FROM table" --structure="column1 UInt32,column2 UInt32,column3 UInt32"

# 处理文件
clickhouse-local --query="SELECT * FROM table" --structure="column1 UInt32,column2 UInt32" --input-format=CSV --file=data.csv
```

### 系统表

#### 查询系统表
```sql
-- 查看当前正在执行的查询
SELECT * FROM system.processes;

-- 查看查询日志
SELECT * FROM system.query_log ORDER BY event_time DESC LIMIT 10;

-- 查看表信息
SELECT * FROM system.tables WHERE database = 'default';

-- 查看列信息
SELECT * FROM system.columns WHERE table = 'events';

-- 查看分区信息
SELECT * FROM system.parts WHERE table = 'events';

-- 查看集群信息
SELECT * FROM system.clusters;
```

#### 性能监控
```sql
-- 查看系统指标
SELECT * FROM system.metrics;

-- 查看异步指标
SELECT * FROM system.asynchronous_metrics;

-- 查看系统事件
SELECT * FROM system.events;
```

### 配置文件

#### 主配置文件
```xml
<!-- /etc/clickhouse-server/config.xml -->
<config>
    <!-- 日志级别 -->
    <level>trace</level>
    
    <!-- HTTP 端口 -->
    <http_port>8123</http_port>
    
    <!-- TCP 端口 -->
    <tcp_port>9000</tcp_port>
    
    <!-- 最大连接数 -->
    <max_connections>4096</max_connections>
    
    <!-- 最大内存使用 -->
    <max_memory_usage>10000000000</max_memory_usage>
    
    <!-- 数据目录 -->
    <path>/var/lib/clickhouse/</path>
    <tmp_path>/var/lib/clickhouse/tmp/</path>
    <user_files_path>/var/lib/clickhouse/user_files/</user_files>
    
    <!-- 日志文件 -->
    <log>/var/log/clickhouse-server/clickhouse-server.log</log>
    <errorlog>/var/log/clickhouse-server/clickhouse-server.err.log</errorlog>
</config>
```

#### 用户配置文件
```xml
<!-- /etc/clickhouse-server/users.xml -->
<users>
    <default>
        <password></password>
        <networks incl="networks" replace="replace">
            <ip>::/0</ip>
        </networks>
        <profile>default</profile>
        <quota>default</quota>
    </default>
    
    <readonly>
        <password>readonly</password>
        <networks incl="networks" replace="replace">
            <ip>::/0</ip>
        </networks>
        <profile>readonly</profile>
        <quota>default</quota>
    </readonly>
</users>
```

## 最佳实践

### 查询设计最佳实践

1. **避免 SELECT ***：只选择必要的列
2. **合理使用 PREWHERE**：尽早过滤数据
3. **避免在 WHERE 子句中使用函数**：防止索引失效
4. **使用参数化查询**：避免 SQL 注入和提高计划重用
5. **合理使用 SAMPLE 子句**：对于概览查询使用抽样

### 表设计最佳实践

1. **合理设计排序键**：根据查询模式设计排序键
2. **合理设计分区键**：根据数据特点和使用模式设计分区
3. **合理使用跳数索引**：为高基数列创建适当的跳数索引
4. **合理使用物化视图**：为常用聚合查询创建物化视图
5. **合理使用投影**：为常用查询模式创建投影

### 集群设计最佳实践

1. **合理设计分片键**：根据查询模式设计分片键
2. **合理使用分布式表**：根据集群规模和使用模式选择分布式表引擎
3. **避免跨分片查询**：设计合理的分片键避免跨分片数据交换
4. **合理使用副本**：提高数据可用性和查询性能
5. **合理使用 ZooKeeper**：管理集群元数据和分布式 DDL

### 性能优化最佳实践

1. **监控查询性能**：定期检查慢查询
2. **优化数据分布**：确保数据均匀分布
3. **合理使用内存**：避免内存溢出
4. **合理使用并行度**：充分利用多核 CPU
5. **定期维护表**：定期合并分区和清理旧数据

### 安全最佳实践

1. **最小权限原则**：只授予必要的权限
2. **使用强密码**：避免使用弱密码
3. **限制网络访问**：只允许必要的网络访问
4. **定期审计**：定期检查用户和权限
5. **加密敏感数据**：对敏感数据进行加密