# SQLite 语法指南

## 概述

SQLite是一种轻量级、嵌入式的关系型数据库管理系统，具有以下特点：
- 无需独立服务器进程，直接读写磁盘文件
- 支持标准SQL的大部分功能
- 事务性数据库(ACID兼容)
- 零配置，无需安装和管理
- 完整的数据库存储在单个文件中

## 基本语法结构

### 数据定义语言 (DDL)

#### 创建数据库
SQLite不需要显式创建数据库，当连接到数据库文件时会自动创建：
```sql
-- 连接到数据库文件(如果不存在会自动创建)
-- 在命令行中: sqlite3 database_file.db
```

#### 创建表
```sql
CREATE TABLE [IF NOT EXISTS] table_name (
    column1_name data_type [column_constraints],
    column2_name data_type [column_constraints],
    ...
    [table_constraints]
);

-- 示例
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 修改表结构
```sql
-- SQLite对ALTER TABLE的支持有限
-- 添加列
ALTER TABLE table_name ADD COLUMN column_name data_type [constraints];

-- 重命名表
ALTER TABLE table_name RENAME TO new_table_name;

-- 重命名列(SQLite 3.25.0+)
ALTER TABLE table_name RENAME COLUMN old_name TO new_name;
```

#### 删除表
```sql
DROP TABLE [IF EXISTS] table_name;
```

### 数据操作语言 (DML)

#### 插入数据
```sql
-- 单行插入
INSERT INTO table_name (column1, column2, ...) VALUES (value1, value2, ...);

-- 多行插入
INSERT INTO table_name (column1, column2, ...) VALUES
    (value1, value2, ...),
    (value3, value4, ...),
    ...;

-- 从其他表插入
INSERT INTO table_name (column1, column2, ...)
SELECT column1, column2, ... FROM another_table WHERE condition;

-- 插入或替换
INSERT OR REPLACE INTO table_name (column1, column2, ...) VALUES (value1, value2, ...);

-- 插入或忽略
INSERT OR IGNORE INTO table_name (column1, column2, ...) VALUES (value1, value2, ...);
```

#### 查询数据
```sql
SELECT [DISTINCT] column1, column2, ...
FROM table1
[JOIN table2 ON join_condition]
[WHERE condition]
[GROUP BY column1, column2, ...]
[HAVING group_condition]
[ORDER BY column1 [ASC|DESC], column2 [ASC|DESC], ...]
[LIMIT row_count] [OFFSET offset];
```

#### 更新数据
```sql
UPDATE table_name
SET column1 = value1, column2 = value2, ...
[WHERE condition];

-- 使用UPSERT(SQLite 3.24.0+)
INSERT INTO table_name (column1, column2, ...) VALUES (value1, value2, ...)
ON CONFLICT(conflict_column) DO UPDATE SET
    column1 = excluded.column1,
    column2 = excluded.column2;
```

#### 删除数据
```sql
DELETE FROM table_name [WHERE condition];
```

### 数据类型

#### SQLite的动态类型系统
SQLite使用动态类型系统，与大多数其他数据库不同：
- 存储类：NULL, INTEGER, REAL, TEXT, BLOB
- 列可以存储任何存储类的值，不受列定义的限制
- 但仍建议使用适当的数据类型以提高互操作性

#### 常用数据类型
- `INTEGER`: 有符号整数，根据值大小自动选择1-8字节存储
- `TEXT`: 文本字符串，使用数据库编码存储
- `REAL`: 浮点数，8字节IEEE浮点数
- `BLOB`: 二进制数据，完全按输入存储
- `NUMERIC`: 数值类型，可以存储整数、实数或文本值

#### 日期和时间
SQLite没有专门的日期时间类型，通常使用以下方式：
```sql
-- 使用TEXT存储ISO8601格式的日期时间
CREATE TABLE events (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    event_date TEXT,  -- 'YYYY-MM-DD HH:MM:SS'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 使用内置日期时间函数
SELECT datetime('now');
SELECT date('now');
SELECT time('now');
SELECT strftime('%Y-%m-%d %H:%M:%S', 'now');
```

### 约束

#### 列约束
- `PRIMARY KEY`: 主键约束
- `NOT NULL`: 非空约束
- `UNIQUE`: 唯一约束
- `CHECK`: 检查约束
- `DEFAULT`: 默认值约束
- `COLLATE`: 排序规则
- `GENERATED ALWAYS AS`: 生成列(SQLite 3.31.0+)

#### 表约束示例
```sql
CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    order_date TEXT NOT NULL,
    total REAL NOT NULL CHECK(total >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'shipped', 'delivered', 'cancelled')),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
```

### 索引

#### 创建索引
```sql
-- 普通索引
CREATE INDEX index_name ON table_name (column1, column2, ...);

-- 唯一索引
CREATE UNIQUE INDEX index_name ON table_name (column1, column2, ...);

-- 部分索引(WHERE条件)
CREATE INDEX index_name ON table_name (column1) WHERE condition;

-- 表达式索引
CREATE INDEX index_name ON table_name (expression);
```

#### 删除索引
```sql
DROP INDEX [IF EXISTS] index_name;
```

### 视图

```sql
-- 创建视图
CREATE VIEW view_name AS
SELECT column1, column2, ...
FROM table_name
WHERE condition;

-- 临时视图
CREATE TEMP VIEW view_name AS
SELECT column1, column2, ...
FROM table_name
WHERE condition;

-- 删除视图
DROP VIEW [IF EXISTS] view_name;
```

### 触发器

```sql
-- 创建触发器
CREATE TRIGGER trigger_name
[BEFORE|AFTER] [INSERT|UPDATE|DELETE] ON table_name
[FOR EACH ROW]
BEGIN
    -- 触发器SQL语句
END;

-- 示例：自动更新时间戳
CREATE TRIGGER update_user_timestamp
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 删除触发器
DROP TRIGGER [IF EXISTS] trigger_name;
```

### 事务

```sql
-- 开始事务
BEGIN [TRANSACTION];

-- 提交事务
COMMIT;

-- 回滚事务
ROLLBACK;

-- 保存点
SAVEPOINT savepoint_name;
RELEASE SAVEPOINT savepoint_name;
ROLLBACK TO SAVEPOINT savepoint_name;
```

### 高级查询

#### 子查询
```sql
-- 标量子查询
SELECT column1, (SELECT MAX(column2) FROM table2) AS max_column2
FROM table1;

-- 相关子查询
SELECT column1
FROM table1 t1
WHERE EXISTS (SELECT 1 FROM table2 t2 WHERE t2.id = t1.id);

-- 派生表
SELECT t1.column1, t2.max_value
FROM table1 t1
JOIN (SELECT column2, MAX(column3) AS max_value FROM table2 GROUP BY column2) t2
ON t1.column2 = t2.column2;
```

#### 公共表表达式(CTE)
```sql
-- 简单CTE
WITH cte_name AS (
    SELECT column1, column2 FROM table_name WHERE condition
)
SELECT * FROM cte_name;

-- 递归CTE
WITH RECURSIVE hierarchy(id, name, parent_id, level) AS (
    SELECT id, name, parent_id, 0 FROM categories WHERE parent_id IS NULL
    UNION ALL
    SELECT c.id, c.name, c.parent_id, h.level + 1
    FROM categories c
    JOIN hierarchy h ON c.parent_id = h.id
)
SELECT * FROM hierarchy ORDER BY level, name;
```

#### 窗口函数(SQLite 3.25.0+)
```sql
-- 基本窗口函数
SELECT 
    column1,
    column2,
    ROW_NUMBER() OVER (ORDER BY column3) AS row_num,
    RANK() OVER (PARTITION BY column4 ORDER BY column3 DESC) AS rank,
    LAG(column3, 1, 0) OVER (ORDER BY column3) AS prev_value
FROM table_name;
```

### 连接类型

```sql
-- 内连接
SELECT * FROM table1
INNER JOIN table2 ON table1.id = table2.id;

-- 左连接
SELECT * FROM table1
LEFT JOIN table2 ON table1.id = table2.id;

-- 交叉连接
SELECT * FROM table1
CROSS JOIN table2;
```

### 聚合函数

```sql
-- 常用聚合函数
SELECT 
    COUNT(*) AS total_rows,
    COUNT(column1) AS non_null_rows,
    COUNT(DISTINCT column1) AS unique_values,
    SUM(column2) AS total,
    AVG(column2) AS average,
    MIN(column2) AS minimum,
    MAX(column2) AS maximum,
    GROUP_CONCAT(column1, ', ') AS concatenated_values
FROM table_name
GROUP BY column3;
```

### SQLite特有功能

#### UPSERT语法(SQLite 3.24.0+)
```sql
-- 插入或更新
INSERT INTO table_name (id, column1, column2) VALUES (1, 'value1', 'value2')
ON CONFLICT(id) DO UPDATE SET
    column1 = excluded.column1,
    column2 = excluded.column2;

-- 插入或什么都不做
INSERT INTO table_name (id, column1, column2) VALUES (1, 'value1', 'value2')
ON CONFLICT(id) DO NOTHING;
```

#### 生成列(SQLite 3.31.0+)
```sql
CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    total REAL GENERATED ALWAYS AS (price * quantity) STORED
);
```

#### JSON1扩展
```sql
-- 创建包含JSON的表
CREATE TABLE config (
    id INTEGER PRIMARY KEY,
    settings TEXT NOT NULL -- JSON格式
);

-- 查询JSON数据
SELECT json_extract(settings, '$.theme') AS theme FROM config;
SELECT json_array_length(settings, '$.items') AS item_count FROM config;
SELECT json_extract(settings, '$.items[0].name') AS first_item FROM config;
```

#### FTS全文搜索
```sql
-- 创建FTS表
CREATE VIRTUAL TABLE documents USING fts5(title, content);

-- 插入数据
INSERT INTO documents(title, content) VALUES ('SQLite Guide', 'SQLite is a lightweight database...');

-- 全文搜索
SELECT * FROM documents WHERE documents MATCH 'SQLite';

-- 带排名的搜索
SELECT 
    title, 
    snippet(documents, 2, '<mark>', '</mark>', '...', 32) AS snippet,
    rank
FROM documents 
WHERE documents MATCH 'database' 
ORDER BY rank;
```

### 性能优化技巧

#### 使用EXPLAIN QUERY PLAN
```sql
EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = 'user@example.com';
```

#### 使用事务批量操作
```sql
BEGIN;
INSERT INTO logs (message, created_at) VALUES ('Log 1', CURRENT_TIMESTAMP);
INSERT INTO logs (message, created_at) VALUES ('Log 2', CURRENT_TIMESTAMP);
-- ...更多插入
COMMIT;
```

#### 使用适当的PRAGMA设置
```sql
-- 设置WAL模式以提高并发性
PRAGMA journal_mode = WAL;

-- 增加缓存大小
PRAGMA cache_size = 10000;

-- 启用外键约束
PRAGMA foreign_keys = ON;

-- 设置同步模式
PRAGMA synchronous = NORMAL;
```

### 数据库管理

#### 备份数据库
```sql
-- 命令行备份
.backup backup_file.db

-- SQL方式备份
.output backup_file.sql
.dump
```

#### 优化数据库
```sql
-- 分析表统计信息
ANALYZE;

-- 重建数据库
VACUUM;

-- 增量VACUUM(SQLite 3.16.0+)
PRAGMA incremental_vacuum = 1000;
```

#### 检查数据库完整性
```sql
-- 检查整个数据库
PRAGMA integrity_check;

-- 快速检查
PRAGMA quick_check;
```

## 最佳实践

1. **使用适当的数据类型**：虽然SQLite是动态类型，但使用适当类型可提高互操作性
2. **合理使用索引**：为常用查询条件创建索引，但避免过多索引
3. **使用事务**：批量操作时使用事务提高性能
4. **定期VACUUM**：定期执行VACUUM重建数据库文件
5. **使用WAL模式**：在需要高并发时使用WAL模式
6. **避免使用SELECT ***：明确指定需要的列
7. **使用参数化查询**：防止SQL注入
8. **合理设计表结构**：避免过宽的表，适当规范化
9. **使用EXPLAIN QUERY PLAN**：分析查询执行计划
10. **定期备份**：定期备份数据库文件

## 常见问题与解决方案

1. **数据库锁定**：确保所有事务正确提交或回滚
2. **性能问题**：使用EXPLAIN QUERY PLAN分析查询，添加适当索引
3. **并发访问限制**：使用WAL模式提高并发性
4. **数据库文件过大**：执行VACUUM或增量VACUUM
5. **数据类型问题**：了解SQLite的动态类型系统特性