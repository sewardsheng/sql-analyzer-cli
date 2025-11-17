# ClickHouse DBA 静态规则

## 查询性能规则

### 规则 1: 避免使用 SELECT *
- **严重级别**: 高
- **描述**: 查询中避免使用 `SELECT *`，只选择必要的列
- **检测条件**: 查询中包含 `SELECT *` 或 `SELECT t.*` 语句
- **违规示例**:
  ```sql
  SELECT * FROM events;
  SELECT t.* FROM events t;
  ```
- **正确示例**:
  ```sql
  SELECT event_id, event_type, event_time FROM events;
  SELECT t.event_id, t.event_type FROM events t;
  ```
- **例外情况**: 临时查询或调试场景可酌情使用

### 规则 2: 合理使用 PREWHERE 子句
- **严重级别**: 中
- **描述**: 对于 MergeTree 表引擎，优先使用 PREWHERE 过滤数据，减少数据读取量
- **检测条件**: 查询中 WHERE 子句包含可下推的过滤条件，但未使用 PREWHERE
- **违规示例**:
  ```sql
  SELECT event_id, event_type, event_time FROM events WHERE event_date = '2023-01-01' AND event_type = 'click';
  ```
- **正确示例**:
  ```sql
  SELECT event_id, event_type, event_time FROM events PREWHERE event_date = '2023-01-01' WHERE event_type = 'click';
  ```
- **例外情况**: 当过滤条件不能下推到存储层时

### 规则 3: 避免在 WHERE 子句中使用函数
- **严重级别**: 高
- **描述**: 避免在 WHERE 子句中对列使用函数，防止索引失效
- **检测条件**: WHERE 子句中包含对列的函数调用
- **违规示例**:
  ```sql
  SELECT * FROM events WHERE toYYYYMM(event_time) = 202301;
  SELECT * FROM events WHERE lower(event_type) = 'click';
  ```
- **正确示例**:
  ```sql
  SELECT * FROM events WHERE event_time >= '2023-01-01' AND event_time < '2023-02-01';
  SELECT * FROM events WHERE event_type = 'click';
  ```
- **例外情况**: 当无法通过其他方式实现相同过滤效果时

### 规则 4: 合理使用 SAMPLE 子句
- **严重级别**: 低
- **描述**: 对于大数据量查询，考虑使用 SAMPLE 子句进行抽样查询，提高查询速度
- **检测条件**: 大表查询未使用 SAMPLE 子句且查询结果用于概览分析
- **违规示例**:
  ```sql
  SELECT count() FROM events WHERE event_date >= '2023-01-01';
  SELECT avg(value) FROM metrics;
  ```
- **正确示例**:
  ```sql
  SELECT count() FROM events SAMPLE 0.1 WHERE event_date >= '2023-01-01';
  SELECT avg(value) FROM metrics SAMPLE 1000000;
  ```
- **例外情况**: 需要精确结果或小表查询

## 索引使用规则

### 规则 5: 合理设计排序键
- **严重级别**: 高
- **描述**: MergeTree 表引擎的排序键应考虑查询模式，将常用过滤条件放在前面
- **检测条件**: 表的排序键设计不合理，与常用查询模式不匹配
- **违规示例**:
  ```sql
  CREATE TABLE events (
      event_id String,
      event_type String,
      event_time DateTime,
      event_date Date MATERIALIZED toDate(event_time)
  ) ENGINE = MergeTree()
  ORDER BY (event_id, event_type, event_time);
  ```
- **正确示例**:
  ```sql
  CREATE TABLE events (
      event_id String,
      event_type String,
      event_time DateTime,
      event_date Date MATERIALIZED toDate(event_time)
  ) ENGINE = MergeTree()
  ORDER BY (event_date, event_type, event_time);
  ```
- **例外情况**: 特定业务需求需要不同的排序键设计

### 规则 6: 使用适当的索引跳数
- **严重级别**: 中
- **描述**: 对于大表，合理设置索引跳数(index_granularity)以平衡查询性能和存储效率
- **检测条件**: 表的 index_granularity 设置不合理，过大或过小
- **违规示例**:
  ```sql
  CREATE TABLE large_table (
      id UInt64,
      data String
  ) ENGINE = MergeTree()
  ORDER BY id
  SETTINGS index_granularity = 8192;  -- 对于大表可能过小
  ```
- **正确示例**:
  ```sql
  CREATE TABLE large_table (
      id UInt64,
      data String
  ) ENGINE = MergeTree()
  ORDER BY id
  SETTINGS index_granularity = 81920;  -- 适当增大索引粒度
  ```
- **例外情况**: 特定查询模式需要更小的索引粒度

### 规则 7: 合理使用跳数索引
- **严重级别**: 中
- **描述**: 对于包含大量重复值的列，考虑使用跳数索引(skip index)加速查询
- **检测条件**: 表中包含高基数列但未创建适当的跳数索引
- **违规示例**:
  ```sql
  CREATE TABLE events (
      event_id String,
      event_type String,
      event_time DateTime
  ) ENGINE = MergeTree()
  ORDER BY (event_time, event_type);
  ```
- **正确示例**:
  ```sql
  CREATE TABLE events (
      event_id String,
      event_type String,
      event_time DateTime,
      INDEX idx_event_type event_type TYPE minmax GRANULARITY 1
  ) ENGINE = MergeTree()
  ORDER BY (event_time, event_type);
  ```
- **例外情况**: 列基数较低或查询模式不适合使用跳数索引

## 查询语句规范

### 规则 8: 避免使用子查询
- **严重级别**: 中
- **描述**: 避免使用子查询，优先使用 JOIN 或 WITH 子句
- **检测条件**: 查询中包含子查询
- **违规示例**:
  ```sql
  SELECT * FROM users WHERE id IN (SELECT user_id FROM orders WHERE amount > 100);
  SELECT * FROM events WHERE event_type = (SELECT max(event_type) FROM event_types);
  ```
- **正确示例**:
  ```sql
  SELECT u.* FROM users u JOIN orders o ON u.id = o.user_id WHERE o.amount > 100;
  WITH max_event_type AS (SELECT max(event_type) FROM event_types)
  SELECT * FROM events WHERE event_type = max_event_type;
  ```
- **例外情况**: 当子查询是唯一实现方式或性能影响可忽略时

### 规则 9: 合理使用 JOIN 类型
- **严重级别**: 中
- **描述**: 根据数据量和查询需求选择合适的 JOIN 类型
- **检测条件**: 使用了不合适的 JOIN 类型
- **违规示例**:
  ```sql
  -- 大表与小表连接，使用默认的 ALL JOIN 算法
  SELECT * FROM large_table l ALL JOIN small_table s ON l.id = s.id;
  ```
- **正确示例**:
  ```sql
  -- 大表与小表连接，使用 HASH JOIN 算法
  SELECT * FROM large_table l HASH JOIN small_table s ON l.id = s.id;
  ```
- **例外情况**: 特定查询需求需要特定的 JOIN 类型

### 规则 10: 避免使用 DISTINCT
- **严重级别**: 中
- **描述**: 避免使用 DISTINCT，优先使用 GROUP BY 或其他去重方式
- **检测条件**: 查询中包含 DISTINCT
- **违规示例**:
  ```sql
  SELECT DISTINCT user_id FROM orders;
  SELECT DISTINCT event_type, event_date FROM events;
  ```
- **正确示例**:
  ```sql
  SELECT user_id FROM orders GROUP BY user_id;
  SELECT event_type, event_date FROM events GROUP BY event_type, event_date;
  ```
- **例外情况**: 当 DISTINCT 是最简洁或最高效的解决方案时

## 写入操作规则

### 规则 11: 批量插入优于单条插入
- **严重级别**: 高
- **描述**: 批量插入数据比单条插入效率更高，减少网络开销和服务器负载
- **检测条件**: 代码中存在循环单条插入操作
- **违规示例**:
  ```sql
  -- 循环单条插入
  INSERT INTO events VALUES ('id1', 'click', '2023-01-01 10:00:00');
  INSERT INTO events VALUES ('id2', 'view', '2023-01-01 10:01:00');
  INSERT INTO events VALUES ('id3', 'purchase', '2023-01-01 10:02:00');
  ```
- **正确示例**:
  ```sql
  -- 批量插入
  INSERT INTO events VALUES
    ('id1', 'click', '2023-01-01 10:00:00'),
    ('id2', 'view', '2023-01-01 10:01:00'),
    ('id3', 'purchase', '2023-01-01 10:02:00');
  ```
- **例外情况**: 实时数据流或特殊业务需求

### 规则 12: 合理使用 ALTER 操作
- **严重级别**: 高
- **描述**: 避免频繁的 ALTER 操作，特别是在生产环境
- **检测条件**: 频繁执行 ALTER TABLE 操作
- **违规示例**:
  ```sql
  -- 频繁添加列
  ALTER TABLE events ADD COLUMN new_column1 String;
  ALTER TABLE events ADD COLUMN new_column2 String;
  ALTER TABLE events ADD COLUMN new_column3 String;
  ```
- **正确示例**:
  ```sql
  -- 一次性添加多列
  ALTER TABLE events ADD COLUMN new_column1 String, ADD COLUMN new_column2 String, ADD COLUMN new_column3 String;
  ```
- **例外情况**: 紧急修复或特殊业务需求

### 规则 13: 合理使用分区
- **严重级别**: 中
- **描述**: 为大表设计合理的分区策略，提高查询性能和数据管理效率
- **检测条件**: 大表未分区或分区策略不合理
- **违规示例**:
  ```sql
  -- 大表未分区
  CREATE TABLE events (
      event_id String,
      event_type String,
      event_time DateTime
  ) ENGINE = MergeTree()
  ORDER BY event_time;
  ```
- **正确示例**:
  ```sql
  -- 按日期分区
  CREATE TABLE events (
      event_id String,
      event_type String,
      event_time DateTime
  ) ENGINE = MergeTree()
  PARTITION BY toYYYYMM(event_time)
  ORDER BY (event_type, event_time);
  ```
- **例外情况**: 小表或特定业务需求不适合分区

## 聚合操作规则

### 规则 14: 合理使用聚合函数
- **严重级别**: 中
- **描述**: 根据数据特点选择合适的聚合函数，提高查询效率
- **检测条件**: 使用了不合适的聚合函数
- **违规示例**:
  ```sql
  -- 对于高基数列使用 uniqExact
  SELECT uniqExact(user_id) FROM events;
  ```
- **正确示例**:
  ```sql
  -- 对于高基数列使用 uniqHLL12
  SELECT uniqHLL12(user_id) FROM events;
  ```
- **例外情况**: 需要精确结果且数据量不大

### 规则 15: 使用适当的聚合引擎
- **严重级别**: 中
- **描述**: 根据聚合需求选择合适的表引擎，如 AggregatingMergeTree、SummingMergeTree 等
- **检测条件**: 聚合场景使用了不合适的表引擎
- **违规示例**:
  ```sql
  -- 使用普通 MergeTree 存储需要聚合的数据
  CREATE TABLE daily_stats (
      date Date,
      event_type String,
      count UInt64
  ) ENGINE = MergeTree()
  ORDER BY (date, event_type);
  ```
- **正确示例**:
  ```sql
  -- 使用 SummingMergeTree 自动聚合计数
  CREATE TABLE daily_stats (
      date Date,
      event_type String,
      count UInt64
  ) ENGINE = SummingMergeTree()
  ORDER BY (date, event_type);
  ```
- **例外情况**: 特定业务需求需要普通表引擎

## 数据类型规则

### 规则 16: 使用合适的数据类型
- **严重级别**: 中
- **描述**: 根据数据特点选择合适的数据类型，减少存储空间和提高查询性能
- **检测条件**: 使用了不合适的数据类型
- **违规示例**:
  ```sql
  -- 使用 String 存储数值
  CREATE TABLE metrics (
      name String,
      value String
  );
  
  -- 使用 Float 存储精确小数
  CREATE TABLE financial (
      amount Float64
  );
  ```
- **正确示例**:
  ```sql
  -- 使用数值类型存储数值
  CREATE TABLE metrics (
      name String,
      value Decimal(10, 2)
  );
  
  -- 使用 Decimal 存储精确小数
  CREATE TABLE financial (
      amount Decimal(18, 6)
  );
  ```
- **例外情况**: 特定业务需求需要特定数据类型

### 规则 17: 合理使用 Nullable 类型
- **严重级别**: 中
- **描述**: 谨慎使用 Nullable 类型，因为它会增加存储开销和降低查询性能
- **检测条件**: 不必要地使用 Nullable 类型
- **违规示例**:
  ```sql
  CREATE TABLE users (
      id UInt64,
      name Nullable(String),
      age Nullable(UInt8),
      email Nullable(String)
  );
  ```
- **正确示例**:
  ```sql
  CREATE TABLE users (
      id UInt64,
      name String,
      age UInt8,
      email String
  );
  ```
- **例外情况**: 确实需要存储 NULL 值的场景

## 集群和分布式规则

### 规则 18: 合理使用分布式表引擎
- **严重级别**: 高
- **描述**: 根据集群规模和查询需求选择合适的分布式表引擎
- **检测条件**: 使用了不合适的分布式表引擎
- **违规示例**:
  ```sql
  -- 小集群使用 Distributed 表引擎
  CREATE TABLE distributed_events AS local_events
  ENGINE = Distributed(cluster_name, default, local_events, rand());
  ```
- **正确示例**:
  ```sql
  -- 大集群使用 Distributed 表引擎，并考虑分片键
  CREATE TABLE distributed_events AS local_events
  ENGINE = Distributed(cluster_name, default, local_events, cityHash64(event_id));
  ```
- **例外情况**: 特定业务需求需要特定的分布式策略

### 规则 19: 避免跨分片查询
- **严重级别**: 高
- **描述**: 避免需要跨分片数据交换的查询，设计合理的分片键
- **检测条件**: 查询需要跨分片数据交换
- **违规示例**:
  ```sql
  -- 按日期分片，但查询需要按用户ID聚合
  SELECT user_id, count() FROM distributed_events GROUP BY user_id;
  ```
- **正确示例**:
  ```sql
  -- 按用户ID分片，查询可以本地聚合
  SELECT user_id, count() FROM distributed_events GROUP BY user_id;
  ```
- **例外情况**: 无法避免的跨分片查询

## 性能监控规则

### 规则 20: 监控查询执行时间
- **严重级别**: 低
- **描述**: 监控查询执行时间，识别慢查询并进行优化
- **检测条件**: 查询执行时间超过阈值
- **违规示例**:
  ```sql
  -- 长时间运行的查询
  SELECT * FROM large_table WHERE complex_condition;
  ```
- **正确示例**:
  ```sql
  -- 优化后的查询或添加适当的索引
  SELECT * FROM large_table WHERE simple_condition;
  ```
- **例外情况**: 必要的长时间运行的分析查询

### 规则 21: 监控内存使用
- **严重级别**: 中
- **描述**: 监控查询内存使用，避免内存溢出
- **检测条件**: 查询内存使用超过阈值
- **违规示例**:
  ```sql
  -- 大量数据加载到内存
  SELECT * FROM large_table ORDER BY random_column LIMIT 10;
  ```
- **正确示例**:
  ```sql
  -- 使用适当的限制和索引
  SELECT * FROM large_table WHERE indexed_column = value ORDER BY sorted_column LIMIT 10;
  ```
- **例外情况**: 必要的大内存查询

## 最佳实践规则

### 规则 22: 合理使用物化视图
- **严重级别**: 中
- **描述**: 合理使用物化视图预计算和聚合数据，提高查询性能
- **检测条件**: 频繁的复杂聚合查询未使用物化视图
- **违规示例**:
  ```sql
  -- 频繁执行的复杂聚合查询
  SELECT date, event_type, count() FROM events GROUP BY date, event_type;
  ```
- **正确示例**:
  ```sql
  -- 创建物化视图预计算聚合数据
  CREATE MATERIALIZED VIEW daily_events_mv
  ENGINE = SummingMergeTree()
  ORDER BY (date, event_type)
  AS SELECT toDate(event_time) as date, event_type, count() as count
  FROM events
  GROUP BY date, event_type;
  ```
- **例外情况**: 查询频率低或数据量小

### 规则 23: 合理使用字典
- **严重级别**: 低
- **描述**: 对于维度表数据，考虑使用字典提高 JOIN 性能
- **检测条件**: 频繁与小表 JOIN 但未使用字典
- **违规示例**:
  ```sql
  -- 频繁与小表 JOIN
  SELECT e.*, d.name FROM events e JOIN dimensions d ON e.dimension_id = d.id;
  ```
- **正确示例**:
  ```sql
  -- 创建字典
  CREATE DICTIONARY dimension_dict (
      id UInt64,
      name String
  ) PRIMARY KEY id
  SOURCE(CLICKHOUSE(HOST 'localhost' PORT 9000 USER 'default' TABLE dimensions PASSWORD ''))
  LAYOUT(HASHED())
  LIFETIME(300);
  
  -- 使用字典
  SELECT e.*, dictGet('dimension_dict', 'name', e.dimension_id) as name FROM events e;
  ```
- **例外情况**: 字典不适合的场景

### 规则 24: 合理使用投影
- **严重级别**: 低
- **描述**: 对于常用查询模式，考虑使用投影提高查询性能
- **检测条件**: 频繁的特定查询模式未使用投影
- **违规示例**:
  ```sql
  -- 频繁的特定查询模式
  SELECT event_type, count() FROM events WHERE event_date = '2023-01-01' GROUP BY event_type;
  ```
- **正确示例**:
  ```sql
  -- 创建投影
  ALTER TABLE events ADD PROJECTION projection_event_type_count (
      SELECT 
          event_type, 
          count() AS count
      FROM events
      WHERE event_date = '2023-01-01'
      GROUP BY event_type
  );
  ```
- **例外情况**: 投影不适合的场景

## 安全规则

### 规则 25: 限制用户权限
- **严重级别**: 高
- **描述**: 根据最小权限原则，限制用户权限
- **检测条件**: 用户权限超出必要范围
- **违规示例**:
  ```sql
  -- 授予过多权限
  GRANT ALL ON *.* TO 'app_user';
  ```
- **正确示例**:
  ```sql
  -- 授予必要权限
  GRANT SELECT, INSERT ON app_db.* TO 'app_user';
  ```
- **例外情况**: 管理员账户

### 规则 26: 使用行级安全策略
- **严重级别**: 中
- **描述**: 对于多租户场景，使用行级安全策略隔离数据
- **检测条件**: 多租户场景未使用行级安全策略
- **违规示例**:
  ```sql
  -- 查询未限制租户范围
  SELECT * FROM tenant_data;
  ```
- **正确示例**:
  ```sql
  -- 创建行级安全策略
  CREATE ROW POLICY tenant_policy ON tenant_data USING tenant_id = currentTenantId();
  
  -- 查询自动应用策略
  SELECT * FROM tenant_data;
  ```
- **例外情况**: 不需要行级安全的场景

## 备份和恢复规则

### 规则 27: 定期备份
- **严重级别**: 高
- **描述**: 定期备份重要数据，确保数据安全
- **检测条件**: 未设置定期备份策略
- **违规示例**:
  ```sql
  -- 无备份策略
  ```
- **正确示例**:
  ```sql
  -- 设置备份策略
  BACKUP TABLE events TO 'backups/events_20230101';
  ```
- **例外情况**: 临时数据或测试环境

### 规则 28: 测试恢复流程
- **严重级别**: 中
- **描述**: 定期测试备份恢复流程，确保备份可用
- **检测条件**: 未测试备份恢复流程
- **违规示例**:
  ```sql
  -- 未测试恢复流程
  ```
- **正确示例**:
  ```sql
  -- 测试恢复流程
  RESTORE TABLE events FROM 'backups/events_20230101' AS test_events;
  ```
- **例外情况**: 无法进行恢复测试的环境

## 总结

ClickHouse 作为高性能列式数据库，有其独特的优化规则和最佳实践。以上规则涵盖了查询性能、索引使用、数据类型、集群管理等多个方面，遵循这些规则可以显著提高 ClickHouse 的查询性能和系统稳定性。

在实际应用中，应根据具体的业务场景和数据特点，灵活应用这些规则，并结合性能监控和测试，不断优化数据库设计和查询语句。