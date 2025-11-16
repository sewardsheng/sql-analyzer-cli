# Oracle DBA 静态规则配置

## 规则概述

本文档包含传统DBA预先配置的Oracle静态规则，这些规则是基于最佳实践和生产环境经验总结的强制性要求。

---

## 查询性能规则

### 禁止全表扫描规则

#### 规则: ORA-001 - 禁止生产环境全表扫描
**严重级别**: 高  
**规则描述**: 禁止在生产环境执行全表扫描查询（除非表行数小于10000行）

**检测条件**:
- 执行计划显示"TABLE ACCESS FULL"
- 预估扫描行数 > 10000
- 没有合适的WHERE条件或索引

**违规示例**:
```sql
-- 违规: 全表扫描大表
SELECT * FROM orders;

-- 违规: WHERE条件未使用索引
SELECT * FROM users WHERE EXTRACT(YEAR FROM create_time) = 2023;

-- 违规: 模糊查询以通配符开头
SELECT * FROM products WHERE name LIKE '%phone';

-- 违规: 使用!=导致全表扫描
SELECT * FROM orders WHERE status != 'COMPLETED';
```

**正确示例**:
```sql
-- 正确: 使用索引列作为条件
SELECT * FROM orders WHERE order_id = 123;

-- 正确: 避免在索引列使用函数
SELECT * FROM users 
WHERE create_time >= TO_DATE('2023-01-01', 'YYYY-MM-DD')
AND create_time < TO_DATE('2024-01-01', 'YYYY-MM-DD');

-- 正确: 模糊查询不以通配符开头
SELECT * FROM products WHERE name LIKE 'phone%';

-- 正确: 使用正向条件
SELECT * FROM orders WHERE status = 'PENDING';
```

**例外情况**:
- 小表查询（行数 < 10000）
- 统计分析查询（需要显式标注）
- 全局临时表查询

---

### 规则: ORA-002 - 禁止不带索引的JOIN操作
**严重级别**: 高  
**规则描述**: JOIN操作的关联字段必须建立索引

**检测条件**:
- 执行计划显示"HASH JOIN"或"NESTED LOOPS"但无索引
- JOIN字段上没有索引
- 查询性能差

**违规示例**:
```sql
-- 违规: customer_id没有索引
SELECT o.*, c.name 
FROM orders o 
JOIN customers c ON o.customer_id = c.id;

-- 违规: 多表JOIN无索引
SELECT a.*, b.*, c.*
FROM table_a a
JOIN table_b b ON a.col1 = b.col1
JOIN table_c c ON b.col2 = c.col2;
```

**正确示例**:
```sql
-- 正确: 先创建索引再JOIN
CREATE INDEX idx_customer_id ON orders(customer_id);
SELECT o.*, c.name 
FROM orders o 
JOIN customers c ON o.customer_id = c.id;

-- 正确: 所有JOIN字段都有索引
CREATE INDEX idx_col1 ON table_b(col1);
CREATE INDEX idx_col2 ON table_c(col2);
SELECT a.*, b.*, c.*
FROM table_a a
JOIN table_b b ON a.col1 = b.col1
JOIN table_c c ON b.col2 = c.col2;
```

---

### 规则: ORA-003 - 禁止大偏移量分页查询
**严重级别**: 中  
**规则描述**: 禁止使用大偏移量的ROWNUM分页（偏移 > 10000）

**检测条件**:
- ROWNUM分页偏移量 > 10000
- 可能导致性能问题

**违规示例**:
```sql
-- 违规: 大偏移量分页
SELECT * FROM (
    SELECT ROWNUM rn, t.* FROM (
        SELECT * FROM orders ORDER BY create_time DESC
    ) t WHERE ROWNUM <= 100020
) WHERE rn > 100000;

-- 违规: 使用OFFSET FETCH的大偏移量
SELECT * FROM orders 
ORDER BY create_time DESC 
OFFSET 100000 ROWS FETCH NEXT 20 ROWS ONLY;
```

**正确示例**:
```sql
-- 正确: 使用游标分页
SELECT * FROM orders 
WHERE id < 90000 
ORDER BY id DESC 
FETCH FIRST 20 ROWS ONLY;

-- 正确: 使用键集分页
SELECT * FROM orders 
WHERE create_time < TO_DATE('2023-12-01', 'YYYY-MM-DD')
ORDER BY create_time DESC 
FETCH FIRST 20 ROWS ONLY;

-- 正确: 使用REF CURSOR
DECLARE
    TYPE order_cursor IS REF CURSOR;
    c_orders order_cursor;
BEGIN
    OPEN c_orders FOR 
        SELECT * FROM orders ORDER BY create_time DESC;
    -- 处理游标
END;
```

---

## 索引使用规则

### 规则: ORA-004 - 禁止在索引列上使用函数
**严重级别**: 高  
**规则描述**: 禁止在WHERE、JOIN、ORDER BY子句的索引列上使用函数（除非创建了函数索引）

**检测条件**:
- 索引列被函数包裹
- 导致索引失效

**违规示例**:
```sql
-- 违规: 在索引列使用日期函数
SELECT * FROM orders 
WHERE TRUNC(create_time) = TO_DATE('2023-01-01', 'YYYY-MM-DD');

-- 违规: 在索引列使用字符串函数
SELECT * FROM users 
WHERE UPPER(username) = 'ADMIN';

-- 违规: 在索引列进行计算
SELECT * FROM products 
WHERE price * 1.1 > 100;
```

**正确示例**:
```sql
-- 正确: 改写查询避免函数
SELECT * FROM orders 
WHERE create_time >= TO_DATE('2023-01-01', 'YYYY-MM-DD')
AND create_time < TO_DATE('2023-01-02', 'YYYY-MM-DD');

-- 正确: 创建函数索引
CREATE INDEX idx_upper_username ON users(UPPER(username));
SELECT * FROM users WHERE UPPER(username) = 'ADMIN';

-- 正确: 创建函数索引
CREATE INDEX idx_price_markup ON products(price * 1.1);
SELECT * FROM products WHERE price * 1.1 > 100;
```

---

### 规则: ORA-005 - 禁止冗余索引
**严重级别**: 中  
**规则描述**: 禁止创建功能重复或冗余的索引

**检测条件**:
- 索引列完全相同
- 单列索引与复合索引重复
- 索引前缀重复

**违规示例**:
```sql
-- 违规: 完全重复的索引
CREATE INDEX idx_name1 ON users(username);
CREATE INDEX idx_name2 ON users(username);

-- 违规: 单列索引被复合索引包含
CREATE INDEX idx_user ON orders(user_id);
CREATE INDEX idx_user_time ON orders(user_id, create_time);  -- user_id索引冗余

-- 违规: 前缀重复
CREATE INDEX idx_abc ON table1(a, b, c);
CREATE INDEX idx_ab ON table1(a, b);  -- 冗余
```

**正确示例**:
```sql
-- 正确: 只创建必要的索引
CREATE INDEX idx_user_time ON orders(user_id, create_time);

-- 正确: 根据查询模式创建不同的复合索引
CREATE INDEX idx_user_status ON orders(user_id, status);
CREATE INDEX idx_status_time ON orders(status, create_time);
```

---

### 规则: ORA-006 - 合理选择索引类型
**严重级别**: 中  
**规则描述**: 根据数据类型和查询模式选择合适的索引类型

**索引类型选择指南**:
- **B-tree**: 默认类型，适用于大多数场景
- **Bitmap**: 适用于低基数列（如性别、状态）
- **Function-based**: 适用于函数查询
- **Domain**: 适用于特定领域（如文本索引）
- **Reverse Key**: 适用于递增键值的高并发插入

**违规示例**:
```sql
-- 违规: 低基数列使用B-tree索引
CREATE INDEX idx_status ON orders(status);  -- status只有5-10个值

-- 违规: 高并发递增主键未使用反向键
CREATE INDEX idx_id ON orders(id);  -- 高并发插入导致索引热块

-- 违规: LOB列使用普通索引
CREATE INDEX idx_content ON articles(content);  -- CLOB类型
```

**正确示例**:
```sql
-- 正确: 低基数列使用位图索引
CREATE BITMAP INDEX idx_status ON orders(status);

-- 正确: 高并发递增键使用反向键索引
CREATE INDEX idx_id ON orders(id) REVERSE;

-- 正确: LOB列使用文本索引
CREATE INDEX idx_content ON articles(content) 
INDEXTYPE IS CTXSYS.CONTEXT;
```

---

### 规则: ORA-007 - 限制单表索引数量
**严重级别**: 中  
**规则描述**: 单表索引总数不超过8个（不含主键和唯一约束）

**检测条件**:
- 统计表的索引数量
- 超过阈值则告警

**违规示例**:
```sql
-- 违规: 索引过多（9个普通索引）
CREATE INDEX idx1 ON users(col1);
CREATE INDEX idx2 ON users(col2);
CREATE INDEX idx3 ON users(col3);
CREATE INDEX idx4 ON users(col4);
CREATE INDEX idx5 ON users(col5);
CREATE INDEX idx6 ON users(col6);
CREATE INDEX idx7 ON users(col7);
CREATE INDEX idx8 ON users(col8);
CREATE INDEX idx9 ON users(col9);  -- 超出限制
```

**正确示例**:
```sql
-- 正确: 合理规划复合索引
CREATE INDEX idx_col1_col2 ON users(col1, col2);
CREATE INDEX idx_col3_col4 ON users(col3, col4);
CREATE INDEX idx_col5_col6 ON users(col5, col6);
CREATE INDEX idx_col7 ON users(col7);
-- 总共4个索引，满足要求
```

---

## SQL语句规范规则

### 规则: ORA-008 - 禁止使用SELECT *
**严重级别**: 中  
**规则描述**: 禁止使用SELECT *，必须明确指定查询列

**检测条件**:
- SQL语句包含"SELECT *"

**违规示例**:
```sql
-- 违规: 使用SELECT *
SELECT * FROM users WHERE id = 1;

-- 违规: 子查询中使用SELECT *
SELECT COUNT(*) FROM (SELECT * FROM orders);
```

**正确示例**:
```sql
-- 正确: 明确指定列
SELECT id, username, email, create_time 
FROM users 
WHERE id = 1;

-- 正确: 只查询需要的列
SELECT user_id, order_date, total_amount 
FROM orders 
WHERE status = 'COMPLETED';
```

**例外情况**:
- COUNT(*)统计查询
- EXISTS子查询

---

### 规则: ORA-009 - 禁止隐式类型转换
**严重级别**: 高  
**规则描述**: WHERE条件必须与列类型匹配，避免隐式类型转换导致索引失效

**检测条件**:
- 数值列使用字符串比较
- 字符串列使用数值比较
- 日期类型不匹配

**违规示例**:
```sql
-- 违规: 数值列使用字符串
SELECT * FROM users WHERE id = '123';  -- id是NUMBER类型

-- 违规: 字符串列使用数值
SELECT * FROM products WHERE code = 123;  -- code是VARCHAR2类型

-- 违规: 日期类型隐式转换
SELECT * FROM orders WHERE create_time = '2023-01-01';
```

**正确示例**:
```sql
-- 正确: 类型匹配
SELECT * FROM users WHERE id = 123;

-- 正确: 字符串使用引号
SELECT * FROM products WHERE code = '123';

-- 正确: 使用TO_DATE显式转换
SELECT * FROM orders 
WHERE create_time = TO_DATE('2023-01-01', 'YYYY-MM-DD');
```

---

### 规则: ORA-010 - 避免使用负向查询
**严重级别**: 中  
**规则描述**: 避免使用NOT、!=、<>、NOT IN、NOT EXISTS等负向查询

**检测条件**:
- SQL包含负向查询操作符
- 可能导致索引失效或性能下降

**违规示例**:
```sql
-- 违规: 使用NOT IN
SELECT * FROM orders 
WHERE status NOT IN ('CANCELLED', 'DELETED');

-- 违规: 使用!=
SELECT * FROM users WHERE status != 'INACTIVE';

-- 违规: 使用NOT EXISTS
SELECT * FROM products 
WHERE NOT EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.product_id = products.id
);
```

**正确示例**:
```sql
-- 正确: 使用IN正向查询
SELECT * FROM orders 
WHERE status IN ('PENDING', 'PROCESSING', 'COMPLETED');

-- 正确: 使用=正向查询
SELECT * FROM users WHERE status = 'ACTIVE';

-- 正确: 使用LEFT JOIN替代NOT EXISTS
SELECT p.* 
FROM products p
LEFT JOIN orders o ON o.product_id = p.id
WHERE o.id IS NULL;
```

---

## 写入操作规则

### 规则: ORA-011 - 禁止大批量操作不分批
**严重级别**: 高  
**规则描述**: 大批量INSERT、UPDATE、DELETE操作必须分批执行

**检测条件**:
- 单次操作影响行数 > 5000
- 可能导致锁等待和回滚段增长

**违规示例**:
```sql
-- 违规: 大批量删除
DELETE FROM orders 
WHERE create_time < TO_DATE('2020-01-01', 'YYYY-MM-DD');

-- 违规: 大批量更新
UPDATE users 
SET status = 'INACTIVE' 
WHERE last_login < TO_DATE('2022-01-01', 'YYYY-MM-DD');

-- 违规: 大批量插入
INSERT INTO archive_table 
SELECT * FROM large_table;
```

**正确示例**:
```sql
-- 正确: 分批删除
DECLARE
    v_batch_size NUMBER := 1000;
BEGIN
    LOOP
        DELETE FROM orders 
        WHERE create_time < TO_DATE('2020-01-01', 'YYYY-MM-DD')
        AND ROWNUM <= v_batch_size;
        
        EXIT WHEN SQL%ROWCOUNT = 0;
        COMMIT;
    END LOOP;
END;
/

-- 正确: 使用BULK COLLECT分批处理
DECLARE
    TYPE id_array IS TABLE OF orders.id%TYPE;
    v_ids id_array;
    CURSOR c_orders IS 
        SELECT id FROM orders 
        WHERE create_time < TO_DATE('2020-01-01', 'YYYY-MM-DD');
BEGIN
    OPEN c_orders;
    LOOP
        FETCH c_orders BULK COLLECT INTO v_ids LIMIT 1000;
        EXIT WHEN v_ids.COUNT = 0;
        
        FORALL i IN 1..v_ids.COUNT
            DELETE FROM orders WHERE id = v_ids(i);
        
        COMMIT;
    END LOOP;
    CLOSE c_orders;
END;
/
```

---

### 规则: ORA-012 - 避免长事务
**严重级别**: 高  
**规则描述**: 事务持续时间不应超过30秒，避免长事务导致锁等待和回滚段增长

**检测条件**:
- 事务执行时间 > 30秒
- 可能导致锁争用和性能问题

**违规示例**:
```sql
-- 违规: 长事务
BEGIN
    UPDATE orders SET status = 'PROCESSING' WHERE id = 1;
    -- ... 进行复杂业务逻辑处理（耗时超过30秒）
    -- ... 调用外部服务
    COMMIT;
END;

-- 违规: 事务中包含DDL
BEGIN
    UPDATE users SET status = 'ACTIVE' WHERE id = 1;
    EXECUTE IMMEDIATE 'ALTER TABLE users ADD (new_col VARCHAR2(50))';
    COMMIT;
END;
```

**正确示例**:
```sql
-- 正确: 拆分为多个短事务
BEGIN
    UPDATE orders SET status = 'PROCESSING' WHERE id = 1;
    COMMIT;
END;

-- ... 进行业务逻辑处理

BEGIN
    UPDATE orders SET status = 'COMPLETED' WHERE id = 1;
    COMMIT;
END;

-- 正确: DDL操作独立执行
ALTER TABLE users ADD (new_col VARCHAR2(50));
```

---

## 函数和包规则

### 规则: ORA-013 - 禁止使用高危函数
**严重级别**: 高  
**规则描述**: 禁止使用可能导致性能问题或安全风险的函数

**禁用函数列表**:
- `DBMS_LOCK.SLEEP()` - 导致查询延迟
- `UTL_FILE` - 文件操作（安全风险）
- `UTL_TCP/UTL_SMTP` - 网络操作（安全风险）
- `DBMS_RANDOM.VALUE` - 在ORDER BY中使用导致全表扫描

**违规示例**:
```sql
-- 违规: 使用DBMS_LOCK.SLEEP
SELECT * FROM users 
WHERE id = 1 
AND DBMS_LOCK.SLEEP(1) IS NOT NULL;

-- 违规: 使用DBMS_RANDOM排序
SELECT * FROM products 
ORDER BY DBMS_RANDOM.VALUE 
FETCH FIRST 10 ROWS ONLY;

-- 违规: 使用UTL_FILE读取文件
DECLARE
    v_file UTL_FILE.FILE_TYPE;
BEGIN
    v_file := UTL_FILE.FOPEN('/tmp', 'data.txt', 'R');
END;
```

**正确示例**:
```sql
-- 正确: 避免使用DBMS_LOCK.SLEEP

-- 正确: 使用其他方式实现随机
SELECT * FROM products 
WHERE id >= FLOOR(DBMS_RANDOM.VALUE(1, (SELECT MAX(id) FROM products)))
FETCH FIRST 10 ROWS ONLY;

-- 正确: 避免使用UTL_FILE
```

---

## 表设计规则

### 规则: ORA-014 - 谨慎使用LOB类型
**严重级别**: 中  
**规则描述**: 避免在主表使用CLOB/BLOB类型存储大对象

**违规示例**:
```sql
-- 违规: 在主表使用CLOB
CREATE TABLE articles (
    id NUMBER PRIMARY KEY,
    title VARCHAR2(200),
    content CLOB,  -- 可能很大
    author_id NUMBER,
    create_time DATE
);

-- 违规: 多个LOB列
CREATE TABLE documents (
    id NUMBER PRIMARY KEY,
    name VARCHAR2(200),
    description CLOB,
    content BLOB,
    metadata CLOB
);
```

**正确示例**:
```sql
-- 正确: 主表只保留必要字段
CREATE TABLE articles (
    id NUMBER PRIMARY KEY,
    title VARCHAR2(200),
    author_id NUMBER,
    create_time DATE,
    summary VARCHAR2(500)
);

-- 正确: 内容存储在独立表
CREATE TABLE article_content (
    article_id NUMBER PRIMARY KEY,
    content CLOB,
    FOREIGN KEY (article_id) REFERENCES articles(id)
);

-- 正确: 使用SecureFiles LOB
CREATE TABLE documents (
    id NUMBER PRIMARY KEY,
    name VARCHAR2(200),
    content BLOB
) LOB (content) STORE AS SECUREFILE (
    TABLESPACE lob_data
    ENABLE STORAGE IN ROW
    CHUNK 8192
    CACHE
);
```

---

### 规则: ORA-015 - 合理使用分区表
**严重级别**: 中  
**规则描述**: 超过1000万行的大表建议使用分区表

**违规示例**:
```sql
-- 违规: 大表不分区
CREATE TABLE sensor_data (
    id NUMBER PRIMARY KEY,
    sensor_id NUMBER,
    value NUMBER,
    record_time DATE
);
-- 数据量达到数亿行，但不分区
```

**正确示例**:
```sql
-- 正确: 使用范围分区
CREATE TABLE sensor_data (
    id NUMBER,
    sensor_id NUMBER,
    value NUMBER,
    record_time DATE
)
PARTITION BY RANGE (record_time) (
    PARTITION p_2023_q1 VALUES LESS THAN (TO_DATE('2023-04-01', 'YYYY-MM-DD')),
    PARTITION p_2023_q2 VALUES LESS THAN (TO_DATE('2023-07-01', 'YYYY-MM-DD')),
    PARTITION p_2023_q3 VALUES LESS THAN (TO_DATE('2023-10-01', 'YYYY-MM-DD')),
    PARTITION p_2023_q4 VALUES LESS THAN (TO_DATE('2024-01-01', 'YYYY-MM-DD'))
);

-- 正确: 使用列表分区
CREATE TABLE orders (
    id NUMBER,
    region VARCHAR2(50),
    amount NUMBER
)
PARTITION BY LIST (region) (
    PARTITION p_asia VALUES ('CN', 'JP', 'KR'),
    PARTITION p_europe VALUES ('UK', 'DE', 'FR'),
    PARTITION p_americas VALUES ('US', 'CA', 'MX')
);
```

---

## 规则总结

### 规则检查清单

#### 查询性能（3项）
- [ ] ORA-001: 避免全表扫描
- [ ] ORA-002: JOIN字段必须有索引
- [ ] ORA-003: 避免大偏移量分页

#### 索引管理（4项）
- [ ] ORA-004: 索引列不使用函数
- [ ] ORA-005: 避免冗余索引
- [ ] ORA-006: 合理选择索引类型
- [ ] ORA-007: 控制索引数量

#### SQL规范（3项）
- [ ] ORA-008: 不使用SELECT *
- [ ] ORA-009: 避免隐式类型转换
- [ ] ORA-010: 避免负向查询

#### 写入操作（2项）
- [ ] ORA-011: 大批量操作分批执行
- [ ] ORA-012: 避免长事务

#### 函数使用（1项）
- [ ] ORA-013: 避免高危函数

#### 表设计（2项）
- [ ] ORA-014: 谨慎使用LOB类型
- [ ] ORA-015: 合理使用分区表

### Oracle配置建议

```sql
-- 初始化参数建议
ALTER SYSTEM SET sga_target = 2G SCOPE=SPFILE;
ALTER SYSTEM SET pga_aggregate_target = 1G SCOPE=SPFILE;
ALTER SYSTEM SET processes = 500 SCOPE=SPFILE;
ALTER SYSTEM SET sessions = 1000 SCOPE=SPFILE;

-- 优化器设置
ALTER SYSTEM SET optimizer_mode = 'ALL_ROWS' SCOPE=BOTH;
ALTER SYSTEM SET optimizer_index_cost_adj = 100 SCOPE=BOTH;

-- 统计信息收集
EXEC DBMS_STATS.GATHER_DATABASE_STATS(estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE);
```
