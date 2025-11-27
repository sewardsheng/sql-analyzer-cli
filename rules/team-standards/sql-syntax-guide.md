# 通用SQL语法指南

## 概述

SQL (Structured Query Language) 是用于管理关系型数据库系统的标准语言。虽然不同数据库系统在实现上有所差异，但大多数都遵循SQL标准。本指南涵盖了通用的SQL语法规则和最佳实践。

## 基本语法结构

### 数据定义语言 (DDL)

#### 创建数据库
```sql
-- 标准语法
CREATE DATABASE database_name;

-- 带选项的语法(部分数据库支持)
CREATE DATABASE database_name
    [CHARACTER SET charset_name]
    [COLLATE collation_name]
    [OWNER user_name];
```

#### 创建表
```sql
-- 基本语法
CREATE TABLE table_name (
    column1_name data_type [column_constraints],
    column2_name data_type [column_constraints],
    ...
    [table_constraints]
);

-- 示例
CREATE TABLE employees (
    id INTEGER PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    hire_date DATE,
    salary DECIMAL(10, 2) CHECK (salary > 0)
);
```

#### 修改表结构
```sql
-- 添加列
ALTER TABLE table_name ADD COLUMN column_name data_type [constraints];

-- 修改列定义(数据库间语法可能不同)
-- MySQL
ALTER TABLE table_name MODIFY COLUMN column_name new_data_type [constraints];

-- PostgreSQL
ALTER TABLE table_name ALTER COLUMN column_name TYPE new_data_type;

-- SQL Server
ALTER TABLE table_name ALTER COLUMN column_name new_data_type [constraints];

-- 重命名列
-- MySQL
ALTER TABLE table_name CHANGE COLUMN old_name new_name data_type [constraints];

-- PostgreSQL
ALTER TABLE table_name RENAME COLUMN old_name TO new_name;

-- SQL Server
EXEC sp_rename 'table_name.old_name', 'new_name', 'COLUMN';

-- 删除列
ALTER TABLE table_name DROP COLUMN column_name;
```

#### 删除表和数据库
```sql
DROP TABLE [IF EXISTS] table_name;
DROP DATABASE [IF EXISTS] database_name;
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

-- 插入默认值
INSERT INTO table_name DEFAULT VALUES;
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
```

#### 删除数据
```sql
DELETE FROM table_name [WHERE condition];

-- 删除所有数据但保留表结构
TRUNCATE TABLE table_name;
```

### 数据控制语言 (DCL)

#### 授权
```sql
-- 授予权限
GRANT privilege_type ON object_name TO user_name;

-- 示例
GRANT SELECT, INSERT ON employees TO user1;
GRANT ALL PRIVILEGES ON employees TO admin;

-- 授予角色
GRANT role_name TO user_name;
```

#### 撤销权限
```sql
-- 撤销权限
REVOKE privilege_type ON object_name FROM user_name;

-- 撤销角色
REVOKE role_name FROM user_name;
```

## 数据类型

### 数值类型
```sql
-- 整数类型(不同数据库可能有不同名称和范围)
SMALLINT      -- 小整数
INTEGER/INT   -- 标准整数
BIGINT        -- 大整数

-- 浮点类型
FLOAT         -- 单精度浮点数
DOUBLE/REAL   -- 双精度浮点数
DECIMAL(M,D)  -- 定点数，M是总位数，D是小数位数
NUMERIC(M,D)  -- 同DECIMAL
```

### 字符串类型
```sql
CHAR(n)       -- 固定长度字符串
VARCHAR(n)    -- 可变长度字符串
TEXT          -- 长文本
CLOB          -- 字符大对象
```

### 日期时间类型
```sql
DATE          -- 日期
TIME          -- 时间
TIMESTAMP     -- 时间戳
INTERVAL      -- 时间间隔
```

### 二进制类型
```sql
BINARY(n)     -- 固定长度二进制数据
VARBINARY(n)  -- 可变长度二进制数据
BLOB          -- 二进制大对象
```

### 布尔类型
```sql
BOOLEAN/BOOL  -- 布尔值(TRUE/FALSE)
BIT           -- 位类型
```

## 约束

### 列约束
```sql
CREATE TABLE table_name (
    column1 data_type PRIMARY KEY,           -- 主键
    column2 data_type NOT NULL,              -- 非空
    column3 data_type UNIQUE,                -- 唯一
    column4 data_type DEFAULT default_value, -- 默认值
    column5 data_type CHECK (condition),     -- 检查约束
    column6 data_type REFERENCES other_table(column_name) -- 外键
);
```

### 表约束
```sql
CREATE TABLE table_name (
    column1 data_type,
    column2 data_type,
    column3 data_type,
    -- 主键约束
    PRIMARY KEY (column1, column2),
    -- 外键约束
    FOREIGN KEY (column2) REFERENCES other_table(column3)
        [ON DELETE CASCADE] [ON UPDATE CASCADE],
    -- 唯一约束
    UNIQUE (column3),
    -- 检查约束
    CHECK (column1 > 0)
);
```

## 索引

### 创建索引
```sql
-- 普通索引
CREATE INDEX index_name ON table_name (column1, column2, ...);

-- 唯一索引
CREATE UNIQUE INDEX index_name ON table_name (column1, column2, ...);

-- 复合索引
CREATE INDEX index_name ON table_name (column1, column2, column3);

-- 部分索引(部分数据库支持)
CREATE INDEX index_name ON table_name (column1) WHERE condition;

-- 表达式索引(部分数据库支持)
CREATE INDEX index_name ON table_name (expression(column1));
```

### 删除索引
```sql
DROP INDEX index_name;
-- 或者在某些数据库中
DROP INDEX index_name ON table_name;
```

## 视图

### 创建视图
```sql
CREATE VIEW view_name AS
SELECT column1, column2, ...
FROM table_name
WHERE condition;
```

### 修改视图
```sql
-- 标准SQL(部分数据库支持)
ALTER VIEW view_name AS
SELECT column1, column2, ...
FROM table_name
WHERE condition;

-- 替代方案：删除后重新创建
DROP VIEW view_name;
CREATE VIEW view_name AS
SELECT column1, column2, ...
FROM table_name
WHERE condition;
```

### 删除视图
```sql
DROP VIEW [IF EXISTS] view_name;
```

## 触发器

### 创建触发器
```sql
-- 基本语法(不同数据库语法差异较大)
CREATE TRIGGER trigger_name
{BEFORE | AFTER} {INSERT | UPDATE | DELETE}
ON table_name
[FOR EACH ROW]
[WHEN condition]
BEGIN
    -- 触发器逻辑
END;
```

### 删除触发器
```sql
DROP TRIGGER [IF EXISTS] trigger_name;
```

## 事务控制

### 事务控制语句
```sql
-- 开始事务
BEGIN TRANSACTION;
-- 或者在某些数据库中
START TRANSACTION;

-- 提交事务
COMMIT;

-- 回滚事务
ROLLBACK;

-- 设置保存点
SAVEPOINT savepoint_name;

-- 回滚到保存点
ROLLBACK TO SAVEPOINT savepoint_name;

-- 释放保存点
RELEASE SAVEPOINT savepoint_name;
```

## 高级查询

### 子查询
```sql
-- 标量子查询
SELECT column1, (SELECT MAX(column2) FROM table2) AS max_value
FROM table1;

-- 行子查询
SELECT * FROM table1
WHERE (column1, column2) = (SELECT column1, column2 FROM table2 WHERE id = 1);

-- 表子查询
SELECT * FROM table1
WHERE column1 IN (SELECT column1 FROM table2 WHERE condition);
```

### 公用表表达式(CTE)
```sql
-- 基本CTE
WITH cte_name AS (
    SELECT column1, column2 FROM table_name WHERE condition
)
SELECT * FROM cte_name;

-- 递归CTE
WITH RECURSIVE cte_name AS (
    -- 初始查询
    SELECT column1, column2 FROM table_name WHERE condition
    UNION ALL
    -- 递归查询
    SELECT t.column1, t.column2 
    FROM table_name t
    JOIN cte_name c ON t.parent_id = c.id
)
SELECT * FROM cte_name;
```

### 窗口函数
```sql
-- 基本窗口函数
SELECT 
    column1,
    column2,
    ROW_NUMBER() OVER (ORDER BY column3) AS row_num,
    RANK() OVER (ORDER BY column3) AS rank,
    DENSE_RANK() OVER (ORDER BY column3) AS dense_rank,
    LAG(column2, 1) OVER (ORDER BY column3) AS prev_value,
    LEAD(column2, 1) OVER (ORDER BY column3) AS next_value
FROM table_name;

-- 分区窗口函数
SELECT 
    column1,
    column2,
    ROW_NUMBER() OVER (PARTITION BY column4 ORDER BY column3) AS row_num_within_partition
FROM table_name;
```

## 连接类型

### 内连接
```sql
-- 显式内连接
SELECT * FROM table1
INNER JOIN table2 ON table1.id = table2.id;

-- 隐式内连接
SELECT * FROM table1, table2
WHERE table1.id = table2.id;
```

### 外连接
```sql
-- 左外连接
SELECT * FROM table1
LEFT JOIN table2 ON table1.id = table2.id;

-- 右外连接
SELECT * FROM table1
RIGHT JOIN table2 ON table1.id = table2.id;

-- 全外连接(部分数据库支持)
SELECT * FROM table1
FULL OUTER JOIN table2 ON table1.id = table2.id;
```

### 交叉连接
```sql
-- 交叉连接(笛卡尔积)
SELECT * FROM table1
CROSS JOIN table2;

-- 或使用旧语法
SELECT * FROM table1, table2;
```

### 自连接
```sql
-- 自连接
SELECT e1.name AS employee_name, e2.name AS manager_name
FROM employees e1
LEFT JOIN employees e2 ON e1.manager_id = e2.id;
```

## 聚合函数

### 常用聚合函数
```sql
SELECT 
    COUNT(*) AS total_rows,           -- 计数所有行
    COUNT(column1) AS non_null_rows, -- 计数非空行
    COUNT(DISTINCT column1) AS unique_values, -- 计数唯一值
    SUM(column1) AS total,           -- 求和
    AVG(column1) AS average,         -- 平均值
    MIN(column1) AS minimum,         -- 最小值
    MAX(column1) AS maximum          -- 最大值
FROM table_name;
```

### 分组聚合
```sql
SELECT 
    column1,
    column2,
    COUNT(*) AS count,
    SUM(column3) AS total
FROM table_name
WHERE condition
GROUP BY column1, column2
HAVING COUNT(*) > 1
ORDER BY column1;
```

## 数据库特定功能

### MySQL特有功能
```sql
-- 自增列
CREATE TABLE table_name (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ...
);

-- 插入或更新
INSERT INTO table_name (id, column1, column2) 
VALUES (1, 'value1', 'value2')
ON DUPLICATE KEY UPDATE 
    column1 = VALUES(column1),
    column2 = VALUES(column2);

-- 分区表
CREATE TABLE table_name (
    ...
) PARTITION BY RANGE (column1) (
    PARTITION p0 VALUES LESS THAN (100),
    PARTITION p1 VALUES LESS THAN (200),
    PARTITION p2 VALUES LESS THAN MAXVALUE
);
```

### PostgreSQL特有功能
```sql
-- 序列
CREATE SEQUENCE sequence_name START 1;
SELECT nextval('sequence_name');

-- 数组类型
CREATE TABLE table_name (
    id SERIAL PRIMARY KEY,
    tags TEXT[]
);

-- JSON类型
CREATE TABLE table_name (
    id SERIAL PRIMARY KEY,
    data JSONB
);

-- 扩展
CREATE EXTENSION extension_name;
```

### SQLite特有功能
```sql
-- 自增列
CREATE TABLE table_name (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ...
);

-- UPSERT
INSERT INTO table_name (id, column1, column2) 
VALUES (1, 'value1', 'value2')
ON CONFLICT(id) DO UPDATE SET
    column1 = excluded.column1,
    column2 = excluded.column2;

-- 虚拟表
CREATE VIRTUAL TABLE table_name USING module_name(arguments);
```

### SQL Server特有功能
```sql
-- 标识列
CREATE TABLE table_name (
    id INT IDENTITY(1,1) PRIMARY KEY,
    ...
);

-- 表变量
DECLARE @TableVariable TABLE (
    id INT,
    name VARCHAR(50)
);

-- 临时表
CREATE TABLE #TempTable (
    id INT,
    name VARCHAR(50)
);
```

## 性能优化技巧

### 查询优化
```sql
-- 使用EXPLAIN分析查询
EXPLAIN SELECT * FROM table_name WHERE condition;

-- 使用索引提示(MySQL)
SELECT * FROM table_name USE INDEX (index_name) WHERE condition;

-- 使用查询提示(SQL Server)
SELECT * FROM table_name WITH (INDEX(index_name)) WHERE condition;
```

### 索引优化
```sql
-- 创建覆盖索引
CREATE INDEX index_name ON table_name (column1, column2) INCLUDE (column3, column4);

-- 创建过滤索引(SQL Server)
CREATE INDEX index_name ON table_name (column1) WHERE column2 > 100;

-- 创建部分索引(PostgreSQL)
CREATE INDEX index_name ON table_name (column1) WHERE column2 > 100;
```

## 数据库管理

### 用户管理
```sql
-- 创建用户
-- MySQL
CREATE USER 'username'@'host' IDENTIFIED BY 'password';

-- PostgreSQL
CREATE USER username WITH PASSWORD 'password';

-- SQL Server
CREATE LOGIN login_name WITH PASSWORD = 'password';
CREATE USER user_name FOR LOGIN login_name;
```

### 权限管理
```sql
-- 授予权限
GRANT SELECT, INSERT, UPDATE, DELETE ON table_name TO user_name;

-- 授予所有权限
GRANT ALL PRIVILEGES ON table_name TO user_name;

-- 撤销权限
REVOKE SELECT ON table_name FROM user_name;
```

### 备份与恢复
```sql
-- 备份数据库(语法因数据库而异)
-- MySQL
mysqldump -u username -p database_name > backup.sql

-- PostgreSQL
pg_dump -U username database_name > backup.sql

-- SQL Server
BACKUP DATABASE database_name TO DISK = 'backup_path';
```

## 最佳实践

### 命名规范
- 使用有意义的表名和列名
- 使用下划线分隔单词(如：user_profile)
- 避免使用SQL保留字作为标识符
- 保持命名一致性

### 查询编写
- 避免使用SELECT *，明确指定需要的列
- 使用参数化查询防止SQL注入
- 合理使用索引，避免全表扫描
- 使用事务确保数据一致性

### 数据库设计
- 遵循数据库范式，避免数据冗余
- 合理使用外键约束确保引用完整性
- 选择适当的数据类型
- 为经常查询的列创建索引

### 安全性
- 限制数据库用户权限，遵循最小权限原则
- 使用加密连接传输敏感数据
- 定期备份数据
- 审计数据库访问和操作

## 常见问题与解决方案

### SQL注入防护
```sql
-- 错误示例：直接拼接SQL
"SELECT * FROM users WHERE name = '" + userName + "'"

-- 正确示例：使用参数化查询
-- Java PreparedStatement
PreparedStatement stmt = connection.prepareStatement("SELECT * FROM users WHERE name = ?");
stmt.setString(1, userName);
ResultSet rs = stmt.executeQuery();

-- Python sqlite3
cursor.execute("SELECT * FROM users WHERE name = ?", (userName,))
```

### 处理NULL值
```sql
-- 使用COALESCE函数替换NULL
SELECT COALESCE(column1, 'default_value') FROM table_name;

-- 使用NULLIF函数避免除零错误
SELECT column1 / NULLIF(column2, 0) FROM table_name;

-- 使用CASE WHEN处理NULL
SELECT 
    CASE 
        WHEN column1 IS NULL THEN 'default_value'
        ELSE column1
    END AS processed_column
FROM table_name;
```

### 日期时间处理
```sql
-- 获取当前日期时间
-- MySQL
SELECT NOW();

-- PostgreSQL
SELECT CURRENT_TIMESTAMP;

-- SQLite
SELECT datetime('now');

-- 日期时间格式化
-- MySQL
SELECT DATE_FORMAT(date_column, '%Y-%m-%d') FROM table_name;

-- PostgreSQL
SELECT TO_CHAR(date_column, 'YYYY-MM-DD') FROM table_name;

-- SQLite
SELECT strftime('%Y-%m-%d', date_column) FROM table_name;
```