# MySQL 语法规范

## 基本语法结构

### 数据定义语言 (DDL)

#### 创建数据库
```sql
CREATE DATABASE [IF NOT EXISTS] database_name
[CHARACTER SET charset_name]
[COLLATE collation_name];
```

#### 创建表
```sql
CREATE TABLE [IF NOT EXISTS] table_name (
    column1_name data_type [column_constraints],
    column2_name data_type [column_constraints],
    ...
    [table_constraints]
) [ENGINE=engine_name] [DEFAULT CHARSET=charset_name];
```

#### 修改表结构
```sql
-- 添加列
ALTER TABLE table_name ADD COLUMN column_name data_type [column_constraints];

-- 修改列定义
ALTER TABLE table_name MODIFY COLUMN column_name new_data_type [new_constraints];

-- 重命名列
ALTER TABLE table_name CHANGE COLUMN old_name new_name data_type [constraints];

-- 删除列
ALTER TABLE table_name DROP COLUMN column_name;

-- 添加索引
ALTER TABLE table_name ADD INDEX index_name (column1, column2, ...);

-- 删除索引
ALTER TABLE table_name DROP INDEX index_name;
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
[LIMIT offset, row_count];
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
```

### 数据类型

#### 数值类型
- `TINYINT`: 1字节，-128到127或0到255(UNSIGNED)
- `SMALLINT`: 2字节，-32768到32767或0到65535(UNSIGNED)
- `MEDIUMINT`: 3字节，-8388608到8388607或0到16777215(UNSIGNED)
- `INT`/`INTEGER`: 4字节，-2147483648到2147483647或0到4294967295(UNSIGNED)
- `BIGINT`: 8字节，-9223372036854775808到9223372036854775807或0到18446744073709551615(UNSIGNED)
- `FLOAT`: 4字节，单精度浮点数
- `DOUBLE`: 8字节，双精度浮点数
- `DECIMAL(M, D)`: 定点数，M是总位数，D是小数位数

#### 字符串类型
- `CHAR(M)`: 固定长度字符串，最大255字节
- `VARCHAR(M)`: 可变长度字符串，最大65535字节
- `TEXT`: 可变长度文本，最大65535字节
- `MEDIUMTEXT`: 可变长度文本，最大16777215字节
- `LONGTEXT`: 可变长度文本，最大4294967295字节

#### 日期时间类型
- `DATE`: 日期，格式'YYYY-MM-DD'
- `TIME`: 时间，格式'HH:MM:SS'
- `DATETIME`: 日期时间，格式'YYYY-MM-DD HH:MM:SS'
- `TIMESTAMP`: 时间戳，范围'1970-01-01 00:00:01'到'2038-01-19 03:14:07'
- `YEAR`: 年份，格式YYYY或YY

### 约束

#### 列约束
- `PRIMARY KEY`: 主键约束
- `FOREIGN KEY`: 外键约束
- `UNIQUE`: 唯一约束
- `NOT NULL`: 非空约束
- `DEFAULT`: 默认值约束
- `AUTO_INCREMENT`: 自增约束(MySQL特有)
- `CHECK`: 检查约束(MySQL 8.0.16+)

#### 表约束
```sql
CREATE TABLE table_name (
    column1 data_type,
    column2 data_type,
    ...
    PRIMARY KEY (column1, column2),
    FOREIGN KEY (column2) REFERENCES other_table(column3),
    UNIQUE (column4),
    CHECK (column5 > 0)
);
```

### 索引

#### 创建索引
```sql
-- 普通索引
CREATE INDEX index_name ON table_name (column1, column2, ...);

-- 唯一索引
CREATE UNIQUE INDEX index_name ON table_name (column1, column2, ...);

-- 全文索引
CREATE FULLTEXT INDEX index_name ON table_name (column1, column2, ...);

-- 空间索引
CREATE SPATIAL INDEX index_name ON table_name (spatial_column);
```

### 视图

```sql
-- 创建视图
CREATE VIEW view_name AS
SELECT column1, column2, ...
FROM table_name
WHERE condition;

-- 修改视图
ALTER VIEW view_name AS
SELECT column1, column2, ...
FROM table_name
WHERE condition;

-- 删除视图
DROP VIEW [IF EXISTS] view_name;
```

### 存储过程和函数

#### 存储过程
```sql
DELIMITER //
CREATE PROCEDURE procedure_name ([IN|OUT|INOUT] parameter_name data_type, ...)
BEGIN
    -- 存储过程体
    SELECT * FROM table_name WHERE condition;
END //
DELIMITER ;

-- 调用存储过程
CALL procedure_name(parameter_value, ...);
```

#### 函数
```sql
DELIMITER //
CREATE FUNCTION function_name (parameter_name data_type, ...)
RETURNS return_data_type
DETERMINISTIC
BEGIN
    -- 函数体
    RETURN value;
END //
DELIMITER ;

-- 使用函数
SELECT function_name(parameter_value, ...);
```

### 触发器

```sql
DELIMITER //
CREATE TRIGGER trigger_name
{BEFORE | AFTER} {INSERT | UPDATE | DELETE}
ON table_name
FOR EACH ROW
BEGIN
    -- 触发器体
    IF NEW.column_name > 100 THEN
        SET NEW.column_name = 100;
    END IF;
END //
DELIMITER ;
```

### 事务控制

```sql
-- 开始事务
START TRANSACTION;

-- 设置保存点
SAVEPOINT savepoint_name;

-- 提交事务
COMMIT;

-- 回滚事务
ROLLBACK;

-- 回滚到保存点
ROLLBACK TO SAVEPOINT savepoint_name;

-- 释放保存点
RELEASE SAVEPOINT savepoint_name;
```

### MySQL特有语法

#### 替换语法
```sql
-- 如果存在则更新，否则插入
REPLACE INTO table_name (column1, column2, ...) VALUES (value1, value2, ...);

-- 插入或更新
INSERT INTO table_name (column1, column2, ...) VALUES (value1, value2, ...)
ON DUPLICATE KEY UPDATE column1 = value1, column2 = value2, ...;
```

#### 正则表达式
```sql
-- 正则匹配
SELECT * FROM table_name WHERE column_name REGEXP 'pattern';

-- 正则不匹配
SELECT * FROM table_name WHERE column_name NOT REGEXP 'pattern';
```

#### JSON函数(MySQL 5.7+)
```sql
-- 创建JSON对象
SELECT JSON_OBJECT('key1', value1, 'key2', value2);

-- 创建JSON数组
SELECT JSON_ARRAY(value1, value2, value3);

-- 提取JSON值
SELECT JSON_EXTRACT(json_column, '$.key');

-- 搜索JSON值
SELECT JSON_SEARCH(json_column, 'one', 'value');

-- 修改JSON值
SELECT JSON_SET(json_column, '$.key', new_value);
```

### 窗口函数(MySQL 8.0+)

```sql
-- 排名函数
SELECT 
    column1,
    column2,
    ROW_NUMBER() OVER (ORDER BY column3 DESC) AS row_num,
    RANK() OVER (ORDER BY column3 DESC) AS rank,
    DENSE_RANK() OVER (ORDER BY column3 DESC) AS dense_rank
FROM table_name;

-- 聚合函数
SELECT 
    column1,
    column2,
    SUM(column3) OVER (PARTITION BY column1 ORDER BY column2) AS running_total
FROM table_name;
```

### 公共表表达式(CTE)

```sql
-- 非递归CTE
WITH cte_name AS (
    SELECT column1, column2, ...
    FROM table_name
    WHERE condition
)
SELECT * FROM cte_name;

-- 递归CTE(MySQL 8.0+)
WITH RECURSIVE cte_name AS (
    -- 基础查询
    SELECT column1, column2, ...
    FROM table_name
    WHERE condition
    
    UNION ALL
    
    -- 递归查询
    SELECT t.column1, t.column2, ...
    FROM table_name t
    JOIN cte_name c ON t.parent_id = c.id
)
SELECT * FROM cte_name;
```

### 注释语法

```sql
-- 单行注释
SELECT * FROM table_name; -- 行尾注释

/* 多行注释
   可以跨越多行 */
SELECT * /* 内联注释 */ FROM table_name;
```

### 最佳实践

1. **命名规范**:
   - 使用小写字母和下划线命名数据库和表
   - 列名使用描述性名称
   - 避免使用MySQL保留字作为标识符

2. **性能考虑**:
   - 为经常查询的列创建索引
   - 避免在WHERE子句中使用函数
   - 使用EXPLAIN分析查询执行计划

3. **安全性**:
   - 使用参数化查询防止SQL注入
   - 遵循最小权限原则
   - 定期备份数据