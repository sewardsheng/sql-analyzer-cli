# ClickHouse 查询优化与执行计划分析

## 查询优化基础

### 查询优化原则

1. **减少数据访问量**
   - 只选择必要的列，避免使用 `SELECT *`
   - 使用 `WHERE` 子句限制返回的行数
   - 使用 `LIMIT` 限制结果集大小

2. **合理使用 PREWHERE**
   - 对于 MergeTree 表引擎，优先使用 PREWHERE 过滤数据
   - PREWHERE 在数据读取前执行，减少 I/O 操作
   - 将过滤条件从 WHERE 移到 PREWHERE 可以显著提高性能

3. **优化 JOIN 操作**
   - 确保 JOIN 字段有索引
   - 小表驱动大表原则
   - 合理使用不同的 JOIN 算法（ALL、HASH、PARTIAL、ASOF）

4. **避免全表扫描**
   - 使用索引覆盖查询
   - 避免在索引列上使用函数
   - 避免在索引列上进行计算

### 索引优化策略

#### 排序键设计
```sql
-- 单列排序键
CREATE TABLE events (
    event_id String,
    event_type String,
    event_time DateTime
) ENGINE = MergeTree()
ORDER BY event_time;

-- 复合排序键（常用过滤条件在前）
CREATE TABLE events (
    event_id String,
    event_type String,
    event_time DateTime,
    event_date Date MATERIALIZED toDate(event_time)
) ENGINE = MergeTree()
ORDER BY (event_date, event_type, event_time);

-- 使用采样键
CREATE TABLE events (
    event_id String,
    event_type String,
    event_time DateTime,
    user_id UInt64
) ENGINE = MergeTree()
ORDER BY (event_time, event_type)
SAMPLE BY user_id;
```

#### 跳数索引
```sql
-- minmax 索引
CREATE TABLE events (
    event_id String,
    event_type String,
    event_time DateTime,
    INDEX idx_event_type event_type TYPE minmax GRANULARITY 1
) ENGINE = MergeTree()
ORDER BY event_time;

-- set 索引
CREATE TABLE events (
    event_id String,
    event_type String,
    event_time DateTime,
    INDEX idx_event_type event_type TYPE set(1000) GRANULARITY 1
) ENGINE = MergeTree()
ORDER BY event_time;

-- bloom_filter 索引
CREATE TABLE events (
    event_id String,
    event_type String,
    event_time DateTime,
    INDEX idx_event_type event_type TYPE bloom_filter GRANULARITY 1
) ENGINE = MergeTree()
ORDER BY event_time;

-- tokenbf_v1 索引（适用于字符串）
CREATE TABLE events (
    event_id String,
    event_description String,
    INDEX idx_description event_description TYPE tokenbf_v1(256, 3, 0) GRANULARITY 1
) ENGINE = MergeTree()
ORDER BY event_id;
```

#### 索引失效场景
```sql
-- 以下情况可能导致索引失效

-- 1. 在索引列上使用函数
SELECT * FROM events WHERE toYYYYMM(event_time) = 202301;

-- 2. 在索引列上进行计算
SELECT * FROM events WHERE event_time + INTERVAL 1 DAY = '2023-01-02';

-- 3. 使用LIKE以通配符开头
SELECT * FROM events WHERE event_type LIKE '%click';

-- 4. 类型不匹配
SELECT * FROM events WHERE event_time = '2023-01-01';  -- event_time是DateTime类型

-- 5. 使用OR连接条件（可能导致索引失效）
SELECT * FROM events WHERE event_time = '2023-01-01' OR event_type = 'click';
```

### 查询重写技巧

#### 使用 PREWHERE 优化
```sql
-- 低效的查询
SELECT event_id, event_type, event_time 
FROM events 
WHERE event_date = '2023-01-01' AND event_type = 'click';

-- 优化后的查询（使用 PREWHERE）
SELECT event_id, event_type, event_time 
FROM events 
PREWHERE event_date = '2023-01-01' 
WHERE event_type = 'click';
```

#### 使用 WITH 子句替代子查询
```sql
-- 低效的子查询
SELECT 
    event_type,
    count() AS event_count
FROM events 
WHERE event_date = (
    SELECT max(event_date) FROM events
)
GROUP BY event_type;

-- 优化后的查询（使用 WITH 子句）
WITH max_date AS (
    SELECT max(event_date) AS max_date FROM events
)
SELECT 
    event_type,
    count() AS event_count
FROM events 
WHERE event_date = max_date.max_date
GROUP BY event_type;
```

#### 使用 JOIN 优化
```sql
-- 低效的子查询
SELECT * FROM users WHERE id IN (
    SELECT user_id FROM events WHERE event_type = 'click'
);

-- 优化后的 JOIN 查询
SELECT u.* FROM users u
JOIN (
    SELECT DISTINCT user_id FROM events WHERE event_type = 'click'
) e ON u.id = e.user_id;

-- 使用合适的 JOIN 算法
SELECT u.* FROM users u HASH JOIN events e ON u.id = e.user_id;
```

#### 使用聚合函数优化
```sql
-- 低效的精确去重
SELECT uniqExact(user_id) FROM events;

-- 优化后的近似去重（适用于大数据量）
SELECT uniqHLL12(user_id) FROM events;

-- 使用适当的聚合函数
SELECT 
    sumIf(amount, status = 'completed') AS completed_amount,
    avgIf(amount, status = 'completed') AS avg_completed_amount
FROM orders;
```

## 执行计划分析

### EXPLAIN 命令详解

#### 基本用法
```sql
-- 显示查询执行计划
EXPLAIN SELECT event_type, count() FROM events WHERE event_date = '2023-01-01' GROUP BY event_type;

-- 显示查询执行计划（包含管道信息）
EXPLAIN PIPELINE SELECT event_type, count() FROM events WHERE event_date = '2023-01-01' GROUP BY event_type;

-- 显示查询执行计划（包含估计统计信息）
EXPLAIN ESTIMATE SELECT event_type, count() FROM events WHERE event_date = '2023-01-01' GROUP BY event_type;

-- 显示查询执行计划（包含表扫描信息）
EXPLAIN TABLES SELECT event_type, count() FROM events WHERE event_date = '2023-01-01' GROUP BY event_type;
```

#### 执行计划输出解读

##### 基本输出
```sql
-- 示例查询
EXPLAIN SELECT event_type, count() FROM events WHERE event_date = '2023-01-01' GROUP BY event_type;

-- 可能的输出
Expression
  Aggregating
    Expression
      Filter (event_date = '2023-01-01')
        Expression
          SettingQuotaAndLimits
            ReadFromMergeTree (default.events)
```

##### 输出组件说明
- **Expression**: 表达式计算，如列转换、函数计算等
- **Aggregating**: 聚合操作，如 GROUP BY、聚合函数等
- **Filter**: 过滤操作，如 WHERE 子句
- **ReadFromMergeTree**: 从 MergeTree 表读取数据
- **SettingQuotaAndLimits**: 设置配额和限制
- **Union**: 合并多个数据流
- **Join**: 连接操作
- **Sort**: 排序操作
- **Limit**: 限制结果集大小
- **Distinct**: 去重操作
- **Window**: 窗口函数操作

##### 管道输出
```sql
-- 示例查询
EXPLAIN PIPELINE SELECT event_type, count() FROM events WHERE event_date = '2023-01-01' GROUP BY event_type;

-- 可能的输出
(Union)
  (Expression)
    (Aggregating)
      (Expression)
        (Filter)
          (Expression)
            (ReadFromMergeTree)

-- 更详细的管道输出
(Union)
 (Expression)
  (Aggregating)
   (Expression)
    (Filter)
     (Expression)
      (SettingQuotaAndLimits)
       (ReadFromMergeTree)
  (Expression)
   (Aggregating)
    (Expression)
     (Filter)
      (Expression)
       (SettingQuotaAndLimits)
        (ReadFromMergeTree)
```

##### 估计统计信息
```sql
-- 示例查询
EXPLAIN ESTIMATE SELECT event_type, count() FROM events WHERE event_date = '2023-01-01' GROUP BY event_type;

-- 可能的输出
┌─database─┬─table──┬─parts─┬─rows─┬─bytes_on_disk─┐
│ default  │ events │   12  │  1M  │       120.5MB │
└──────────┴────────┴───────┴──────┴───────────────┘
```

### 执行计划实例分析

#### 简单查询分析
```sql
-- 查询语句
EXPLAIN SELECT * FROM events WHERE event_date = '2023-01-01';

-- 执行计划分析
Expression
  Filter (event_date = '2023-01-01')
    Expression
      SettingQuotaAndLimits
        ReadFromMergeTree (default.events)

-- 分析：
-- 1. ReadFromMergeTree: 从 MergeTree 表读取数据
-- 2. SettingQuotaAndLimits: 应用配额和限制
-- 3. Expression: 计算表达式
-- 4. Filter: 应用过滤条件 event_date = '2023-01-01'
-- 5. Expression: 最终表达式计算
```

#### 聚合查询分析
```sql
-- 查询语句
EXPLAIN SELECT event_type, count() FROM events WHERE event_date = '2023-01-01' GROUP BY event_type;

-- 执行计划分析
Expression
  Aggregating
    Expression
      Filter (event_date = '2023-01-01')
        Expression
          SettingQuotaAndLimits
            ReadFromMergeTree (default.events)

-- 分析：
-- 1. ReadFromMergeTree: 从 MergeTree 表读取数据
-- 2. SettingQuotaAndLimits: 应用配额和限制
-- 3. Expression: 计算表达式
-- 4. Filter: 应用过滤条件 event_date = '2023-01-01'
-- 5. Expression: 计算表达式
-- 6. Aggregating: 执行聚合操作 GROUP BY event_type
-- 7. Expression: 最终表达式计算
```

#### JOIN 查询分析
```sql
-- 查询语句
EXPLAIN SELECT e.event_id, e.event_type, u.user_name 
FROM events e
JOIN users u ON e.user_id = u.id
WHERE e.event_date = '2023-01-01';

-- 执行计划分析
Expression
  Join (INNER)
    Expression
      Filter (event_date = '2023-01-01')
        Expression
          SettingQuotaAndLimits
            ReadFromMergeTree (default.events)
    Expression
      SettingQuotaAndLimits
        ReadFromMergeTree (default.users)

-- 分析：
-- 1. ReadFromMergeTree (events): 从 events 表读取数据
-- 2. SettingQuotaAndLimits: 应用配额和限制
-- 3. Expression: 计算表达式
-- 4. Filter: 应用过滤条件 event_date = '2023-01-01'
-- 5. Expression: 计算表达式
-- 6. ReadFromMergeTree (users): 从 users 表读取数据
-- 7. SettingQuotaAndLimits: 应用配额和限制
-- 8. Expression: 计算表达式
-- 9. Join: 执行连接操作
-- 10. Expression: 最终表达式计算
```

#### 子查询分析
```sql
-- 查询语句
EXPLAIN SELECT * FROM events 
WHERE event_date = (
    SELECT max(event_date) FROM events
);

-- 执行计划分析
Expression
  Filter (event_date = max(event_date))
    Expression
      SettingQuotaAndLimits
        ReadFromMergeTree (default.events)
  Expression
    Aggregating
      Expression
        SettingQuotaAndLimits
          ReadFromMergeTree (default.events)

-- 分析：
-- 1. 子查询部分：
--    - ReadFromMergeTree: 从 events 表读取数据
--    - SettingQuotaAndLimits: 应用配额和限制
--    - Expression: 计算表达式
--    - Aggregating: 执行聚合操作 max(event_date)
--    - Expression: 计算表达式
-- 2. 主查询部分：
--    - ReadFromMergeTree: 从 events 表读取数据
--    - SettingQuotaAndLimits: 应用配额和限制
--    - Expression: 计算表达式
--    - Filter: 应用过滤条件 event_date = max(event_date)
--    - Expression: 最终表达式计算
```

## 高级优化技术

### 投影优化
```sql
-- 创建投影
ALTER TABLE events ADD PROJECTION projection_event_type_count (
    SELECT 
        event_type, 
        count() AS count
    FROM events
    GROUP BY event_type
);

-- 使用投影
SELECT event_type, count() FROM events GROUP BY event_type;

-- 查看投影是否被使用
EXPLAIN SELECT event_type, count() FROM events GROUP BY event_type;

-- 可能的输出（显示使用了投影）
Expression
  Projection
    ReadFromStorage (Projection)
```

### 物化视图优化
```sql
-- 创建物化视图
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

-- 查询物化视图（比查询原表快）
SELECT date, event_type, sum(count) as total_count
FROM daily_events_mv
WHERE date >= '2023-01-01' AND date < '2023-02-01'
GROUP BY date, event_type;
```

### 字典优化
```sql
-- 创建字典
CREATE DICTIONARY user_dict (
    id UInt64,
    name String,
    city String
) PRIMARY KEY id
SOURCE(CLICKHOUSE(HOST 'localhost' PORT 9000 USER 'default' TABLE users PASSWORD ''))
LAYOUT(HASHED())
LIFETIME(300);

-- 使用字典
SELECT 
    event_id, 
    dictGet('user_dict', 'name', user_id) as user_name,
    dictGet('user_dict', 'city', user_id) as user_city
FROM events
WHERE event_date = '2023-01-01';
```

### 分布式表优化
```sql
-- 创建分布式表
CREATE TABLE distributed_events AS local_events
ENGINE = Distributed(cluster_name, default, local_events, cityHash64(event_id));

-- 优化分布式查询（使用 GLOBAL JOIN）
SELECT e.event_id, e.event_type, u.user_name 
FROM distributed_events e
GLOBAL JOIN users u ON e.user_id = u.id
WHERE e.event_date = '2023-01-01';

-- 优化分布式查询（使用分布式子查询）
SELECT 
    event_type, 
    count() as count
FROM distributed_events
WHERE event_date = '2023-01-01'
GROUP BY event_type;
```

## 性能监控工具

### 系统表监控
```sql
-- 查看当前正在执行的查询
SELECT 
    query_id,
    user,
    address,
    elapsed,
    query,
    read_rows,
    read_bytes,
    result_rows,
    result_bytes,
    memory_usage
FROM system.processes
ORDER BY elapsed DESC;

-- 查看查询日志
SELECT 
    event_time,
    query_duration_ms,
    read_rows,
    read_bytes,
    result_rows,
    result_bytes,
    query
FROM system.query_log
WHERE event_date = today()
ORDER BY query_duration_ms DESC
LIMIT 10;

-- 查看表统计信息
SELECT 
    database,
    table,
    sum(rows) AS total_rows,
    sum(data_uncompressed_bytes) AS uncompressed_bytes,
    sum(data_compressed_bytes) AS compressed_bytes,
    uncompressed_bytes / compressed_bytes AS compression_ratio
FROM system.parts
WHERE active = 1
GROUP BY database, table
ORDER BY total_rows DESC;
```

### 性能分析工具
```sql
-- 查看查询性能指标
SELECT 
    event_time,
    query_duration_ms,
    read_rows,
    read_bytes,
    result_rows,
    result_bytes,
    memory_usage,
    query
FROM system.query_log
WHERE event_date = today() AND type = 'QueryFinish'
ORDER BY query_duration_ms DESC
LIMIT 10;

-- 查看慢查询
SELECT 
    event_time,
    query_duration_ms,
    read_rows,
    read_bytes,
    memory_usage,
    query
FROM system.query_log
WHERE event_date = today() 
    AND type = 'QueryFinish' 
    AND query_duration_ms > 10000  -- 超过10秒的查询
ORDER BY query_duration_ms DESC;

-- 查看最耗内存的查询
SELECT 
    event_time,
    query_duration_ms,
    memory_usage,
    query
FROM system.query_log
WHERE event_date = today() 
    AND type = 'QueryFinish'
ORDER BY memory_usage DESC
LIMIT 10;
```

### 系统指标监控
```sql
-- 查看系统指标
SELECT 
    metric,
    value,
    description
FROM system.metrics
WHERE metric IN (
    'Query',
    'Insert',
    'Select',
    'Merge',
    'BackgroundPoolTask',
    'BackgroundFetchesPoolTask',
    'BackgroundMovePoolTask',
    'BackgroundSchedulePoolTask',
    'BackgroundDistributedSchedulePoolTask',
    'BackgroundBufferFlushSchedulePoolTask',
    'BackgroundDistributedSendPoolTask',
    'ReplicatedFetches',
    'ReplicatedSends',
    'ReplicatedChecks',
    'ZooKeeperWatch',
    'ZooKeeperRequest'
)
ORDER BY metric;

-- 查看异步指标
SELECT 
    metric,
    value,
    description
FROM system.asynchronous_metrics
WHERE metric IN (
    'NumberOfTables',
    'NumberOfDatabases',
    'NumberOfParts',
    'NumberOfTemporaryTables',
    'NumberOfEvents',
    'NumberOfPreparedQueries',
    'VersionInteger'
)
ORDER BY metric;

-- 查看系统事件
SELECT 
    event,
    value,
    description
FROM system.events
WHERE event IN (
    'Query',
    'InsertQuery',
    'SelectQuery',
    'FailedQuery',
    'FailedInsertQuery',
    'FailedSelectQuery',
    'Merge',
    'ReplicatedFetch',
    'ReplicatedSend',
    'ReplicatedCheck',
    'FileOpen',
    'FileRead',
    'FileWrite',
    'FileOpenFailed',
    'FileReadFailed',
    'FileWriteFailed',
    'FileSeek',
    'FileBufferRead',
    'FileBufferWrite',
    'FileBufferReadFailed',
    'FileBufferWriteFailed',
    'FileReadBytes',
    'FileWriteBytes',
    'NetworkReceive',
    'NetworkSend',
    'NetworkReceiveBytes',
    'NetworkSendBytes',
    'NetworkReceiveElapsedMicroseconds',
    'NetworkSendElapsedMicroseconds',
    'HTTPConnection',
    'HTTPRequest',
    'ZooKeeperRequest',
    'ZooKeeperWaitMicroseconds',
    'DiskReadElapsedMicroseconds',
    'DiskWriteElapsedMicroseconds',
    'ContextLock',
    'ContextLockWaitMicroseconds',
    'RWLockAcquiredReadLocks',
    'RWLockAcquiredWriteLocks',
    'RWLockReadLockWaitMicroseconds',
    'RWLockWriteLockWaitMicroseconds'
)
ORDER BY event;
```

## 最佳实践

### 查询设计原则
1. **避免SELECT ***: 只选择必要的列
2. **合理使用PREWHERE**: 尽早过滤数据
3. **避免在WHERE子句中使用函数**: 防止索引失效
4. **使用参数化查询**: 避免SQL注入和提高计划重用
5. **合理使用SAMPLE子句**: 对于概览查询使用抽样

### 表设计原则
1. **合理设计排序键**: 根据查询模式设计排序键
2. **合理设计分区键**: 根据数据特点和使用模式设计分区
3. **合理使用跳数索引**: 为高基数列创建适当的跳数索引
4. **合理使用物化视图**: 为常用聚合查询创建物化视图
5. **合理使用投影**: 为常用查询模式创建投影

### 集群设计原则
1. **合理设计分片键**: 根据查询模式设计分片键
2. **合理使用分布式表**: 根据集群规模和使用模式选择分布式表引擎
3. **避免跨分片查询**: 设计合理的分片键避免跨分片数据交换
4. **合理使用副本**: 提高数据可用性和查询性能
5. **合理使用ZooKeeper**: 管理集群元数据和分布式DDL

### 性能优化检查清单
- [ ] 是否有合适的排序键支持查询？
- [ ] 是否使用了PREWHERE子句？
- [ ] 是否避免了全表扫描？
- [ ] JOIN操作是否高效？
- [ ] 是否有不必要的排序操作？
- [ ] 是否使用了适当的聚合函数？
- [ ] 统计信息是否是最新的？
- [ ] 是否考虑了分布式查询的优化？
- [ ] 是否考虑了物化视图的适用性？
- [ ] 是否考虑了字典的适用性？
- [ ] 是否考虑了投影的适用性？
- [ ] 是否有适当的监控和告警机制？