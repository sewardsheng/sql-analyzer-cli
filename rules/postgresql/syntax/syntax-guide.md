# PostgreSQL 语法规范

## 基本语法结构

### 数据定义语言 (DDL)

#### 创建数据库
```sql
CREATE DATABASE database_name
[WITH 
    [OWNER = owner_name]
    [TEMPLATE = template_name]
    [ENCODING = encoding]
    [LC_COLLATE = collate]
    [LC_CTYPE = ctype]
    [TABLESPACE = tablespace_name]
    [ALLOW_CONNECTIONS = allowconn]
    [CONNECTION LIMIT = connlimit]
    [IS_TEMPLATE = istemplate]];
```

#### 创建表
```sql
CREATE TABLE [IF NOT EXISTS] table_name (
    column1_name data_type [column_constraints],
    column2_name data_type [column_constraints],
    ...
    [table_constraints]
) [INHERITS (parent_table_name)]
[WITH (storage_parameters)]
[ON COMMIT { PRESERVE ROWS | DELETE ROWS | DROP }]
[TABLESPACE tablespace_name];
```

#### 修改表结构
```sql
-- 添加列
ALTER TABLE table_name ADD COLUMN column_name data_type [column_constraints];

-- 修改列定义
ALTER TABLE table_name ALTER COLUMN column_name TYPE new_data_type [USING expression];
ALTER TABLE table_name ALTER COLUMN column_name SET DEFAULT expression;
ALTER TABLE table_name ALTER COLUMN column_name DROP DEFAULT;

-- 重命名列
ALTER TABLE table_name RENAME COLUMN old_name TO new_name;

-- 删除列
ALTER TABLE table_name DROP COLUMN column_name [CASCADE];

-- 添加约束
ALTER TABLE table_name ADD CONSTRAINT constraint_name constraint_definition;

-- 删除约束
ALTER TABLE table_name DROP CONSTRAINT constraint_name [RESTRICT | CASCADE];

-- 重命名表
ALTER TABLE table_name RENAME TO new_table_name;
```

#### 删除表和数据库
```sql
DROP TABLE [IF EXISTS] table_name [CASCADE | RESTRICT];
DROP DATABASE [IF EXISTS] database_name [WITH (FORCE)];
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

-- 插入并返回值
INSERT INTO table_name (column1, column2, ...) VALUES (value1, value2, ...)
RETURNING column1, column2, ...;
```

#### 查询数据
```sql
SELECT [DISTINCT [ON (column1, ...)]] column1, column2, ...
FROM table1
[JOIN table2 ON join_condition]
[WHERE condition]
[GROUP BY column1, column2, ...]
[HAVING group_condition]
[WINDOW window_name AS (window_definition)]
[UNION [ALL] | INTERSECT | EXCEPT select_query]
[ORDER BY column1 [ASC | DESC | USING operator], column2 [ASC | DESC | USING operator], ...]
[LIMIT { count | ALL }]
[OFFSET start]
[FETCH { FIRST | NEXT } count { ROW | ROWS } ONLY];
```

#### 更新数据
```sql
UPDATE table_name
SET column1 = value1, column2 = value2, ...
[FROM from_list]
[WHERE condition]
[RETURNING column1, column2, ...];
```

#### 删除数据
```sql
DELETE FROM table_name [USING using_list]
[WHERE condition]
[RETURNING column1, column2, ...];
```

### 数据类型

#### 数值类型
- `smallint`: 2字节，-32768到32767
- `integer`/`int`: 4字节，-2147483648到2147483647
- `bigint`: 8字节，-9223372036854775808到9223372036854775807
- `decimal`/`numeric`: 用户指定精度，精确数值
- `real`: 4字节，6位精度浮点数
- `double precision`: 8字节，15位精度浮点数
- `smallserial`/`serial2`: 2字节自增整数
- `serial`/`serial4`: 4字节自增整数
- `bigserial`/`serial8`: 8字节自增整数

#### 字符串类型
- `character varying(n)`/`varchar(n)`: 可变长度字符串，最大n字符
- `character(n)`/`char(n)`: 固定长度字符串，不足填充空格
- `text`: 可变长度字符串，无长度限制

#### 日期时间类型
- `timestamp [without time zone]`: 日期和时间，不包含时区
- `timestamp with time zone`/`timestamptz`: 日期和时间，包含时区
- `date`: 日期，不包含时间
- `time [without time zone]`: 时间，不包含日期和时区
- `time with time zone`: 时间，包含时区
- `interval`: 时间间隔

#### 布尔类型
- `boolean`: 布尔值，可以是TRUE、FALSE或NULL

#### 数组类型
```sql
-- 数组类型
CREATE TABLE table_name (
    column_name integer[],
    text_array text[],
    custom_array integer[3][3]  -- 多维数组
);

-- 数组操作
SELECT column_name[1] FROM table_name;  -- 访问数组元素
SELECT column_name[1:3] FROM table_name;  -- 数组切片
SELECT array_append(column_name, value) FROM table_name;  -- 追加元素
```

#### JSON/JSONB类型
```sql
-- JSON类型
CREATE TABLE table_name (
    json_column json,
    jsonb_column jsonb
);

-- JSON操作
SELECT json_column->>'key' FROM table_name;  -- 获取JSON值
SELECT jsonb_column @> '{"key": "value"}' FROM table_name;  -- 包含检查
```

### 约束

#### 列约束
- `PRIMARY KEY`: 主键约束
- `FOREIGN KEY`: 外键约束
- `REFERENCES`: 外键引用
- `UNIQUE`: 唯一约束
- `NOT NULL`: 非空约束
- `CHECK`: 检查约束
- `DEFAULT`: 默认值约束
- `GENERATED ALWAYS AS`: 生成列约束(PostgreSQL 12+)

#### 表约束
```sql
CREATE TABLE table_name (
    column1 data_type,
    column2 data_type,
    ...
    CONSTRAINT pk_name PRIMARY KEY (column1, column2),
    CONSTRAINT fk_name FOREIGN KEY (column2) REFERENCES other_table(column3),
    CONSTRAINT uq_name UNIQUE (column4),
    CONSTRAINT chk_name CHECK (column5 > 0)
);
```

#### 外键约束选项
```sql
-- 外键约束动作
CREATE TABLE child_table (
    id integer PRIMARY KEY,
    parent_id integer REFERENCES parent_table(id)
        ON DELETE CASCADE      -- 级联删除
        ON UPDATE CASCADE      -- 级联更新
        ON DELETE SET NULL     -- 设置为NULL
        ON DELETE SET DEFAULT  -- 设置为默认值
        ON DELETE RESTRICT     -- 限制删除
        ON DELETE NO ACTION    -- 无动作
);
```

### 索引

#### 创建索引
```sql
-- 普通索引
CREATE INDEX index_name ON table_name (column1, column2, ...);

-- 唯一索引
CREATE UNIQUE INDEX index_name ON table_name (column1, column2, ...);

-- 部分索引
CREATE INDEX index_name ON table_name (column1) WHERE condition;

-- 表达式索引
CREATE INDEX index_name ON table_name (expression);

-- 并发创建索引
CREATE INDEX CONCURRENTLY index_name ON table_name (column1);
```

#### 索引类型
```sql
-- B-tree索引（默认）
CREATE INDEX idx_btree ON table_name (column1);

-- Hash索引
CREATE INDEX idx_hash ON table_name USING HASH (column1);

-- GiST索引（用于几何数据类型和全文检索）
CREATE INDEX idx_gist ON table_name USING GIST (column1);

-- SP-GiST索引（用于非平衡数据结构）
CREATE INDEX idx_spgist ON table_name USING SPGIST (column1);

-- GIN索引（用于数组、JSONB等复合值）
CREATE INDEX idx_gin ON table_name USING GIN (column1);

-- BRIN索引（用于线性排序的大表）
CREATE INDEX idx_brin ON table_name USING BRIN (column1);
```

### 视图

```sql
-- 创建视图
CREATE [OR REPLACE] [TEMP | TEMPORARY] VIEW view_name [(column1, column2, ...)]
AS query
[WITH [CASCADED | LOCAL] CHECK OPTION];

-- 物化视图
CREATE MATERIALIZED VIEW view_name
AS query
[WITH [NO] DATA];

-- 刷新物化视图
REFRESH MATERIALIZED VIEW [CONCURRENTLY] view_name;

-- 删除视图
DROP VIEW [IF EXISTS] view_name [CASCADE | RESTRICT];
```

### 存储过程和函数

#### 函数
```sql
-- 创建函数
CREATE [OR REPLACE] FUNCTION function_name ([parameter_name parameter_type, ...])
RETURNS return_type
LANGUAGE plpgsql
[IMMUTABLE | STABLE | VOLATILE]
[SECURITY {DEFINER | INVOKER}]
AS $$
DECLARE
    -- 变量声明
    variable_name variable_type;
BEGIN
    -- 函数体
    RETURN value;
END;
$$;

-- 调用函数
SELECT function_name(parameter_value, ...);
```

#### 存储过程(PostgreSQL 11+)
```sql
-- 创建存储过程
CREATE [OR REPLACE] PROCEDURE procedure_name ([parameter_name [IN | OUT | INOUT] parameter_type, ...])
LANGUAGE plpgsql
[SECURITY {DEFINER | INVOKER}]
AS $$
BEGIN
    -- 存储过程体
    -- 可以包含事务控制语句
END;
$$;

-- 调用存储过程
CALL procedure_name(parameter_value, ...);
```

### 触发器

```sql
-- 创建触发器函数
CREATE OR REPLACE FUNCTION trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- 触发器体
    IF TG_OP = 'INSERT' THEN
        -- 插入操作逻辑
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- 更新操作逻辑
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- 删除操作逻辑
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- 创建触发器
CREATE TRIGGER trigger_name
{BEFORE | AFTER | INSTEAD OF} {INSERT | UPDATE | DELETE}
ON table_name
[FOR [EACH] {ROW | STATEMENT}]
[WHEN condition]
EXECUTE FUNCTION trigger_function();
```

### 事务控制

```sql
-- 开始事务
BEGIN [WORK | TRANSACTION] [transaction_mode [, ...]];

-- 设置保存点
SAVEPOINT savepoint_name;

-- 回滚到保存点
ROLLBACK [WORK | TRANSACTION] TO [SAVEPOINT] savepoint_name;

-- 释放保存点
RELEASE [SAVEPOINT] savepoint_name;

-- 提交事务
COMMIT [WORK | TRANSACTION];

-- 回滚事务
ROLLBACK [WORK | TRANSACTION];

-- 事务隔离级别
BEGIN TRANSACTION ISOLATION LEVEL {READ COMMITTED | REPEATABLE READ | SERIALIZABLE};
```

### 高级查询特性

#### 窗口函数
```sql
-- 排名函数
SELECT 
    column1,
    column2,
    ROW_NUMBER() OVER (ORDER BY column3 DESC) AS row_num,
    RANK() OVER (ORDER BY column3 DESC) AS rank,
    DENSE_RANK() OVER (ORDER BY column3 DESC) AS dense_rank,
    LAG(column3, 1, 0) OVER (ORDER BY column3) AS prev_value,
    LEAD(column3, 1, 0) OVER (ORDER BY column3) AS next_value
FROM table_name;

-- 聚合函数
SELECT 
    column1,
    column2,
    SUM(column3) OVER (PARTITION BY column1 ORDER BY column2) AS running_total,
    AVG(column3) OVER (PARTITION BY column1 ORDER BY column2 
        ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING) AS moving_avg
FROM table_name;
```

#### 公共表表达式(CTE)
```sql
-- 非递归CTE
WITH cte_name AS (
    SELECT column1, column2, ...
    FROM table_name
    WHERE condition
)
SELECT * FROM cte_name;

-- 递归CTE
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

#### LATERAL连接
```sql
-- LATERAL连接
SELECT t1.*, t2.*
FROM table1 t1
CROSS JOIN LATERAL (
    SELECT *
    FROM table2 t2
    WHERE t2.id = t1.id
) t2;
```

### PostgreSQL特有语法

#### UPSERT操作
```sql
-- INSERT ... ON CONFLICT
INSERT INTO table_name (column1, column2, ...) VALUES (value1, value2, ...)
ON CONFLICT (conflict_column) DO NOTHING;

INSERT INTO table_name (column1, column2, ...) VALUES (value1, value2, ...)
ON CONFLICT (conflict_column) DO UPDATE 
SET column1 = EXCLUDED.column1, column2 = EXCLUDED.column2;
```

#### 数组操作
```sql
-- 数组构造
SELECT ARRAY[1, 2, 3, 4, 5];
SELECT ARRAY(SELECT column_name FROM table_name);

-- 数组操作
SELECT array_length(array_column, 1) FROM table_name;
SELECT array_append(array_column, value) FROM table_name;
SELECT array_prepend(value, array_column) FROM table_name;
SELECT array_remove(array_column, value) FROM table_name;
SELECT array_position(array_column, value) FROM table_name;
```

#### JSON/JSONB操作
```sql
-- JSON操作
SELECT json_column->>'key' AS value FROM table_name;
SELECT jsonb_column @> '{"key": "value"}' FROM table_name;
SELECT jsonb_column ? 'key' FROM table_name;
SELECT jsonb_column ?| array['key1', 'key2'] FROM table_name;
SELECT jsonb_column ?& array['key1', 'key2'] FROM table_name;

-- JSONB修改操作
SELECT jsonb_set(jsonb_column, '{key}', '"new_value"') FROM table_name;
SELECT jsonb_insert(jsonb_column, '{key}', '"new_value"') FROM table_name;
SELECT jsonb_delete(jsonb_column, '{key}') FROM table_name;
```

#### 全文搜索
```sql
-- 全文搜索配置
SELECT tsvector('english', 'The quick brown fox jumped over the lazy dog');
SELECT tsquery('english', 'fox & dog');

-- 全文搜索查询
SELECT * FROM documents 
WHERE to_tsvector('english', content) @@ to_tsquery('english', 'fox & dog');

-- 创建全文搜索索引
CREATE INDEX idx_fts ON documents USING GIN(to_tsvector('english', content));
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
   - 避免使用PostgreSQL保留字作为标识符

2. **性能考虑**:
   - 为经常查询的列创建索引
   - 使用EXPLAIN ANALYZE分析查询执行计划
   - 考虑使用部分索引减少索引大小

3. **安全性**:
   - 使用参数化查询防止SQL注入
   - 遵循最小权限原则
   - 使用行级安全策略(Row Level Security)

4. **数据完整性**:
   - 合理使用约束保证数据完整性
   - 使用外键约束维护引用完整性
   - 考虑使用触发器实现复杂业务规则