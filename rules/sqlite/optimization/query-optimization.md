# SQLite 查询优化与执行计划分析

## 查询优化基础

### 查询优化原则

1. **减少数据访问量**
   - 只选择必要的列，避免使用 `SELECT *`
   - 使用 `WHERE` 子句限制返回的行数
   - 使用 `LIMIT` 限制结果集大小

2. **合理使用索引**
   - 为经常用于查询条件的列创建索引
   - 为经常用于排序和分组的列创建索引
   - 避免过度索引，因为索引会降低写操作性能

3. **优化JOIN操作**
   - 确保JOIN字段有索引
   - 小表驱动大表原则
   - 合理使用内连接、外连接

4. **避免全表扫描**
   - 使用索引覆盖查询
   - 避免在索引列上使用函数
   - 避免在索引列上进行计算

5. **利用SQLite特性**
   - 合理使用WAL模式提高并发性能
   - 利用部分索引减少索引大小
   - 使用表达式索引优化函数查询

### 索引优化策略

#### 索引类型
```sql
-- 普通索引
CREATE INDEX idx_name ON table_name(column_name);

-- 唯一索引
CREATE UNIQUE INDEX idx_name ON table_name(column_name);

-- 复合索引
CREATE INDEX idx_name ON table_name(column1, column2, column3);

-- 部分索引（SQLite特有）
CREATE INDEX idx_name ON table_name(column_name) WHERE condition;

-- 表达式索引（SQLite 3.9.0+）
CREATE INDEX idx_name ON table_name(expression(column_name));
```

#### 索引使用原则
- **最左前缀原则**: 复合索引按照从左到右的顺序使用
- **索引覆盖**: 查询只使用索引中的列，不需要回表
- **选择性高的列优先**: 选择性高的列更适合放在索引前面
- **避免冗余索引**: 避免创建功能重复的索引

#### 索引失效场景
```sql
-- 以下情况可能导致索引失效

-- 1. 在索引列上使用函数（除非有表达式索引）
SELECT * FROM users WHERE substr(create_time, 1, 4) = '2023';

-- 2. 在索引列上进行计算
SELECT * FROM users WHERE id + 1 = 10;

-- 3. 使用LIKE以通配符开头
SELECT * FROM users WHERE name LIKE '%john';

-- 4. 类型不匹配
SELECT * FROM users WHERE id = '10';  -- id是数字类型

-- 5. 使用OR连接条件（可能无法使用索引）
SELECT * FROM users WHERE id = 1 OR name = 'john';

-- 6. 使用NOT IN、<>、!=操作符
SELECT * FROM users WHERE id <> 1;
```

#### SQLite特有索引优化
```sql
-- 部分索引示例：只为活跃用户创建索引
CREATE INDEX idx_active_users_email ON users(email) WHERE is_active = 1;

-- 表达式索引示例：优化大小写不敏感查询
CREATE INDEX idx_users_upper_name ON users(upper(name));

-- 使用表达式索引
SELECT * FROM users WHERE upper(name) = 'JOHN';
```

### 查询重写技巧

#### 子查询优化
```sql
-- 低效的相关子查询
SELECT u.name, 
       (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
FROM users u;

-- 优化后的LEFT JOIN查询
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

#### 分页查询优化
```sql
-- 低效的分页查询（偏移量大时性能差）
SELECT * FROM orders ORDER BY create_time DESC LIMIT 100000, 20;

-- 优化后的分页查询（使用游标）
SELECT * FROM orders WHERE id < 90000 ORDER BY id DESC LIMIT 20;

-- 或者使用基于时间戳的游标
SELECT * FROM orders 
WHERE create_time < '2023-12-01 00:00:00' 
ORDER BY create_time DESC 
LIMIT 20;
```

#### 批量插入优化
```sql
-- 单条插入（效率低）
INSERT INTO orders (id, customer_id, amount) VALUES (1, 100, 50.00);
INSERT INTO orders (id, customer_id, amount) VALUES (2, 101, 75.00);

-- 批量插入（效率高）
INSERT INTO orders (id, customer_id, amount) VALUES
    (1, 100, 50.00),
    (2, 101, 75.00);

-- 使用事务提高批量操作性能
BEGIN TRANSACTION;
INSERT INTO orders (id, customer_id, amount) VALUES (1, 100, 50.00);
INSERT INTO orders (id, customer_id, amount) VALUES (2, 101, 75.00);
-- 更多插入操作...
COMMIT;
```

## EXPLAIN QUERY PLAN 命令详解

### EXPLAIN QUERY PLAN 基本用法

```sql
-- 基本语法
EXPLAIN QUERY PLAN SELECT * FROM table_name WHERE condition;

-- 详细语法（SQLite 3.28.0+）
EXPLAIN QUERY PLAN DETAIL SELECT * FROM table_name WHERE condition;
```

### EXPLAIN QUERY PLAN 输出解读

#### 基本输出结构
SQLite的EXPLAIN QUERY PLAN输出与MySQL不同，它更简洁直观：

- **SCAN TABLE**: 全表扫描
- **SEARCH TABLE**: 使用索引查找
- **USING INDEX**: 使用覆盖索引
- **USING TEMP B-TREE**: 使用临时B树结构
- **USING COVERING INDEX**: 使用覆盖索引

#### 访问类型详解
- **SCAN TABLE**: 全表扫描，性能最差
- **SEARCH TABLE USING INTEGER PRIMARY KEY**: 使用主键查找，性能最佳
- **SEARCH TABLE USING INDEX**: 使用普通索引查找，性能良好
- **USING COVERING INDEX**: 使用覆盖索引，无需回表

### EXPLAIN QUERY PLAN 实例分析

#### 简单查询分析
```sql
-- 查询语句
EXPLAIN QUERY PLAN SELECT * FROM users WHERE id = 1;

-- 可能的输出
QUERY PLAN
`--SCAN TABLE users USING INTEGER PRIMARY KEY (rowid=?)

-- 分析：
-- 使用了主键查找，性能极佳
-- rowid是SQLite的隐式主键，如果没有明确定义主键
```

#### 复杂查询分析
```sql
-- 查询语句
EXPLAIN QUERY PLAN 
SELECT o.id, c.name, o.amount 
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.create_time > '2023-01-01' 
ORDER BY o.create_time DESC
LIMIT 10;

-- 可能的输出
QUERY PLAN
|--SCAN TABLE orders
|--SEARCH TABLE customers USING INTEGER PRIMARY KEY (rowid=?)
`--USE TEMP B-TREE FOR ORDER BY

-- 分析：
-- orders表进行了全表扫描（应该为create_time创建索引）
-- customers表使用主键查找
-- 使用了临时B树进行排序（可能影响性能）
```

#### 优化后的查询分析
```sql
-- 先创建索引
CREATE INDEX idx_orders_customer_time ON orders(customer_id, create_time);

-- 再次分析查询
EXPLAIN QUERY PLAN 
SELECT o.id, c.name, o.amount 
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.create_time > '2023-01-01' 
ORDER BY o.create_time DESC
LIMIT 10;

-- 优化后的输出
QUERY PLAN
|--SEARCH TABLE orders USING INDEX idx_orders_customer_time (customer_id>?)
|--SEARCH TABLE customers USING INTEGER PRIMARY KEY (rowid=?)
`--USE TEMP B-TREE FOR ORDER BY

-- 分析：
-- orders表现在使用了索引查找，性能提升
-- 仍然需要临时B树排序，可以考虑创建包含排序字段的复合索引
```

#### 覆盖索引分析
```sql
-- 创建覆盖索引
CREATE INDEX idx_orders_covering ON orders(customer_id, create_time, amount);

-- 查询语句
EXPLAIN QUERY PLAN 
SELECT o.amount 
FROM orders o
WHERE o.customer_id = 123 
  AND o.create_time > '2023-01-01';

-- 输出
QUERY PLAN
`--SEARCH TABLE orders USING COVERING INDEX idx_orders_covering (customer_id=? AND create_time>?)

-- 分析：
-- 使用了覆盖索引，无需访问表数据，性能最佳
```

## SQLite 特有优化技术

### 1. WAL模式优化

```sql
-- 启用WAL模式提高并发性能
PRAGMA journal_mode=WAL;

-- 设置同步模式平衡性能与安全性
PRAGMA synchronous=NORMAL;

-- 增大缓存大小
PRAGMA cache_size=10000;

-- 设置WAL检查点自动触发
PRAGMA wal_autocheckpoint=1000;
```

### 2. 部分索引优化

```sql
-- 为活跃用户创建部分索引
CREATE INDEX idx_active_users_email ON users(email) WHERE is_active = 1;

-- 查询优化
EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = 'test@example.com' AND is_active = 1;
-- 将使用部分索引

EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = 'test@example.com';
-- 不会使用部分索引，因为查询条件不匹配
```

### 3. 表达式索引优化

```sql
-- 创建表达式索引优化大小写不敏感查询
CREATE INDEX idx_users_upper_name ON users(upper(name));

-- 查询优化
EXPLAIN QUERY PLAN SELECT * FROM users WHERE upper(name) = 'JOHN';
-- 将使用表达式索引

-- 创建日期表达式索引
CREATE INDEX idx_orders_year ON orders(strftime('%Y', create_time));

-- 查询优化
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE strftime('%Y', create_time) = '2023';
-- 将使用表达式索引
```

### 4. WITHOUT ROWID表优化

```sql
-- 创建WITHOUT ROWID表（适合主键查询多的场景）
CREATE TABLE users_without_rowid (
    id INTEGER PRIMARY KEY,
    name TEXT,
    email TEXT
) WITHOUT ROWID;

-- 查询优化
EXPLAIN QUERY PLAN SELECT * FROM users_without_rowid WHERE id = 1;
-- 直接使用主键，无需通过rowid转换
```

### 5. 虚拟表优化

```sql
-- 创建FTS虚拟表进行全文搜索
CREATE VIRTUAL TABLE documents USING fts5(title, content);

-- 全文搜索优化
EXPLAIN QUERY PLAN SELECT * FROM documents WHERE documents MATCH 'sqlite';
-- 使用FTS索引，性能远高于LIKE查询
```

## 性能监控与调优

### 1. 查询性能分析

```sql
-- 启用查询分析器（SQLite 3.25.0+）
PRAGMA optimize;

-- 检查查询计划
EXPLAIN QUERY PLAN SELECT ...;

-- 分析查询执行时间（需要编程环境支持）
-- 例如在Python中：
import sqlite3
import time

conn = sqlite3.connect('database.db')
conn.execute("PRAGMA journal_mode=WAL")

start_time = time.time()
cursor = conn.execute("SELECT * FROM large_table WHERE condition")
results = cursor.fetchall()
end_time = time.time()

print(f"查询耗时: {end_time - start_time:.4f}秒")
print(f"返回行数: {len(results)}")
```

### 2. 数据库统计信息

```sql
-- 获取表信息
PRAGMA table_info(table_name);

-- 获取索引信息
PRAGMA index_list(table_name);
PRAGMA index_info(index_name);

-- 获取数据库页面信息
PRAGMA page_size;
PRAGMA page_count;

-- 计算数据库大小
SELECT page_count * page_size AS 'Database Size (bytes)' 
FROM pragma_page_count(), pragma_page_size();
```

### 3. 性能调优参数

```sql
-- 调整缓存大小（默认2000页）
PRAGMA cache_size=10000;

-- 调整临时存储
PRAGMA temp_store=MEMORY;  -- 临时表存储在内存中

-- 调整同步模式
PRAGMA synchronous=OFF;     -- 最高性能，但安全性最低
PRAGMA synchronous=NORMAL;  -- 平衡性能与安全性
PRAGMA synchronous=FULL;    -- 最高安全性，但性能最低

-- 调整WAL模式参数
PRAGMA wal_autocheckpoint=1000;  -- 每1000页自动检查点
PRAGMA wal_checkpoint(TRUNCATE); -- 手动检查点并截断WAL文件
```

## 常见性能问题与解决方案

### 1. 大量小写入操作

**问题**: 频繁的小事务写入导致性能下降

**解决方案**:
```sql
-- 使用事务批量提交
BEGIN TRANSACTION;
INSERT INTO logs (message, timestamp) VALUES ('message1', '2023-01-01');
INSERT INTO logs (message, timestamp) VALUES ('message2', '2023-01-01');
-- 更多插入...
COMMIT;

-- 或者使用预编译语句批量插入
```

### 2. 大表查询性能差

**问题**: 大表查询响应时间长

**解决方案**:
```sql
-- 创建合适的索引
CREATE INDEX idx_table_column ON table_name(column_name);

-- 使用部分索引减少索引大小
CREATE INDEX idx_active_users ON users(name) WHERE is_active = 1;

-- 使用覆盖索引避免回表
CREATE INDEX idx_orders_covering ON orders(user_id, status, amount);
```

### 3. 复杂查询性能差

**问题**: 多表JOIN或复杂子查询性能差

**解决方案**:
```sql
-- 确保JOIN字段有索引
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_users_id ON users(id);

-- 重写子查询为JOIN
-- 低效:
SELECT * FROM users WHERE id IN (SELECT user_id FROM orders WHERE amount > 100);

-- 高效:
SELECT DISTINCT u.* FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.amount > 100;
```

### 4. 数据库文件过大

**问题**: 数据库文件增长过快

**解决方案**:
```sql
-- 定期执行VACUUM回收空间
VACUUM;

-- 或者使用增量VACUUM（SQLite 3.16.0+）
PRAGMA incremental_vacuum(1000);

-- 清理WAL文件
PRAGMA wal_checkpoint(TRUNCATE);
```

## 优化检查清单

### 查询优化检查
- [ ] 是否避免了SELECT *？
- [ ] WHERE条件是否使用了索引？
- [ ] JOIN字段是否都有索引？
- [ ] 是否避免了在索引列上使用函数？
- [ ] 分页查询是否使用了高效的游标方式？
- [ ] 是否使用了EXPLAIN QUERY PLAN验证查询计划？

### 索引优化检查
- [ ] 是否为常用查询条件创建了索引？
- [ ] 是否避免了冗余索引？
- [ ] 是否考虑使用部分索引减少索引大小？
- [ ] 是否考虑使用表达式索引优化函数查询？
- [ ] 复合索引的列顺序是否合理？

### 数据库设计检查
- [ ] 表是否定义了主键？
- [ ] 是否使用了合适的数据类型？
- [ ] 是否启用了WAL模式提高并发性能？
- [ ] 是否设置了合理的缓存大小？
- [ ] 是否定期执行VACUUM回收空间？

### 性能监控检查
- [ ] 是否定期检查查询执行计划？
- [ ] 是否监控数据库大小增长？
- [ ] 是否设置了合适的同步模式？
- [ ] 是否定期执行数据库完整性检查？
- [ ] 是否有定期备份策略？

通过遵循以上优化原则和检查清单，可以显著提高SQLite数据库的查询性能和整体效率。