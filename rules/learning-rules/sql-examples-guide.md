# 高质量SQL范例与历史问题SQL

## 目录说明

本目录包含以下两类SQL示例：

1. **高质量SQL范例** (`examples/`): 展示最佳实践的SQL查询，用于学习和参考
2. **历史问题SQL** (`issues/`): 收集真实场景中的SQL问题及其解决方案，用于生成审核规则

## 高质量SQL范例

### 1. 高效查询范例

#### 索引优化查询

```sql
-- 使用覆盖索引避免回表
-- 创建复合索引：CREATE INDEX idx_customer_status_date ON orders(customer_id, status, order_date);
SELECT customer_id, status, order_date
FROM orders
WHERE customer_id = 12345 AND status = 'completed' AND order_date >= '2023-01-01';

-- 使用索引提示优化JOIN
SELECT o.id, o.amount, c.name
FROM orders o FORCE INDEX (idx_customer_date)
JOIN customers c ON o.customer_id = c.id
WHERE o.order_date BETWEEN '2023-01-01' AND '2023-12-31';
```

#### 分页查询优化

```sql
-- 传统分页（偏移量大时性能差）
SELECT id, title, content
FROM articles
ORDER BY publish_date DESC
LIMIT 20 OFFSET 10000;

-- 优化后的游标分页（适用于有序ID）
SELECT id, title, content
FROM articles
WHERE id < 9876  -- 上一页最后一条记录的ID
ORDER BY id DESC
LIMIT 20;

-- 复杂排序的游标分页
SELECT id, title, publish_date
FROM articles
WHERE (publish_date < '2023-05-15') OR 
      (publish_date = '2023-05-15' AND id < 12345)
ORDER BY publish_date DESC, id DESC
LIMIT 20;
```

#### 批量操作优化

```sql
-- 批量插入（比单条插入效率高）
INSERT INTO order_items (order_id, product_id, quantity, price)
VALUES 
    (1001, 2001, 2, 19.99),
    (1001, 2002, 1, 29.99),
    (1001, 2003, 3, 9.99);

-- 使用ON DUPLICATE KEY UPDATE处理重复数据（MySQL）
INSERT INTO user_preferences (user_id, setting_name, setting_value)
VALUES (1, 'theme', 'dark'), (1, 'language', 'en')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- 使用MERGE处理UPSERT（PostgreSQL/Oracle）
MERGE INTO user_preferences AS target
USING (VALUES 
    (1, 'theme', 'dark'),
    (1, 'language', 'en')
) AS source(user_id, setting_name, setting_value)
ON target.user_id = source.user_id AND target.setting_name = source.setting_name
WHEN MATCHED THEN
    UPDATE SET setting_value = source.setting_value
WHEN NOT MATCHED THEN
    INSERT (user_id, setting_name, setting_value)
    VALUES (source.user_id, source.setting_name, source.setting_value);
```

### 2. 复杂查询范例

#### 高级JOIN操作

```sql
-- 多表JOIN与子查询结合
SELECT 
    c.id AS customer_id,
    c.name AS customer_name,
    COUNT(o.id) AS total_orders,
    SUM(o.amount) AS total_spent,
    MAX(o.order_date) AS last_order_date,
    (SELECT AVG(amount) FROM orders WHERE customer_id = c.id) AS avg_order_value
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE c.status = 'active'
GROUP BY c.id, c.name
HAVING COUNT(o.id) > 5
ORDER BY total_spent DESC
LIMIT 100;

-- 使用CTE简化复杂查询
WITH monthly_sales AS (
    SELECT 
        DATE_TRUNC('month', order_date) AS month,
        customer_id,
        SUM(amount) AS monthly_total
    FROM orders
    WHERE order_date >= '2023-01-01'
    GROUP BY DATE_TRUNC('month', order_date), customer_id
),
customer_ranking AS (
    SELECT 
        month,
        customer_id,
        monthly_total,
        RANK() OVER (PARTITION BY month ORDER BY monthly_total DESC) AS rank
    FROM monthly_sales
)
SELECT 
    m.month,
    c.name AS customer_name,
    m.monthly_total,
    m.rank
FROM customer_ranking m
JOIN customers c ON m.customer_id = c.id
WHERE m.rank <= 10
ORDER BY m.month, m.rank;
```

#### 窗口函数应用

```sql
-- 计算移动平均值
SELECT 
    order_date,
    amount,
    AVG(amount) OVER (ORDER BY order_date ROWS BETWEEN 4 PRECEDING AND CURRENT ROW) AS moving_avg_5,
    SUM(amount) OVER (ORDER BY order_date ROWS UNBOUNDED PRECEDING) AS cumulative_sum
FROM orders
WHERE customer_id = 12345
ORDER BY order_date;

-- 分组排名与比较
SELECT 
    department,
    employee_name,
    salary,
    RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank,
    salary - LAG(salary) OVER (PARTITION BY department ORDER BY salary DESC) AS salary_diff_from_prev
FROM employees;
```

#### 条件聚合查询

```sql
-- 多条件聚合统计
SELECT 
    DATE_TRUNC('month', order_date) AS month,
    COUNT(*) AS total_orders,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_orders,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_orders,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_orders,
    SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) AS completed_revenue,
    AVG(CASE WHEN status = 'completed' THEN amount END) AS avg_completed_order
FROM orders
WHERE order_date >= '2023-01-01'
GROUP BY DATE_TRUNC('month', order_date)
ORDER BY month;

-- 动态透视表
SELECT 
    product_category,
    SUM(CASE WHEN region = 'North' THEN sales END) AS north_sales,
    SUM(CASE WHEN region = 'South' THEN sales END) AS south_sales,
    SUM(CASE WHEN region = 'East' THEN sales END) AS east_sales,
    SUM(CASE WHEN region = 'West' THEN sales END) AS west_sales,
    SUM(sales) AS total_sales
FROM product_sales
WHERE sales_date >= '2023-01-01'
GROUP BY product_category
ORDER BY total_sales DESC;
```

### 3. 性能优化范例

#### 查询重写优化

```sql
-- 子查询优化为JOIN
-- 低效写法
SELECT * FROM orders 
WHERE customer_id IN (SELECT id FROM customers WHERE status = 'VIP');

-- 高效写法
SELECT o.* FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE c.status = 'VIP';

-- 使用EXISTS替代IN处理大量数据
-- 低效写法
SELECT * FROM orders o
WHERE o.customer_id IN (SELECT id FROM customers WHERE region = 'North');

-- 高效写法
SELECT o.* FROM orders o
WHERE EXISTS (SELECT 1 FROM customers c WHERE c.id = o.customer_id AND c.region = 'North');
```

#### 索引策略优化

```sql
-- 创建合适的复合索引
CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date DESC);

-- 创建部分索引减少索引大小
CREATE INDEX idx_active_customers ON customers(id) WHERE status = 'active';

-- 创建表达式索引支持函数查询
CREATE INDEX idx_users_lower_email ON users(LOWER(email));

-- 使用覆盖索引避免回表
CREATE INDEX idx_order_summary ON orders(customer_id, status, order_date, amount);
```

#### 分区表优化

```sql
-- 创建分区表
CREATE TABLE orders (
    id SERIAL,
    customer_id INTEGER,
    order_date DATE,
    amount NUMERIC(10,2),
    status VARCHAR(20)
) PARTITION BY RANGE (order_date);

-- 创建分区
CREATE TABLE orders_2023_q1 PARTITION OF orders
    FOR VALUES FROM ('2023-01-01') TO ('2023-04-01');

CREATE TABLE orders_2023_q2 PARTITION OF orders
    FOR VALUES FROM ('2023-04-01') TO ('2023-07-01');

-- 利用分区裁剪的查询
SELECT * FROM orders
WHERE order_date BETWEEN '2023-02-01' AND '2023-02-28';
-- 只扫描orders_2023_q1分区
```

## 历史问题SQL

### 1. 性能问题案例

#### 案例1: 全表扫描问题

```sql
-- 问题SQL：导致全表扫描
SELECT * FROM orders WHERE YEAR(order_date) = 2023;

-- 问题分析：在索引列上使用函数导致索引失效
-- EXPLAIN输出显示Seq Scan而非Index Scan

-- 解决方案1：使用范围查询
SELECT * FROM orders 
WHERE order_date >= '2023-01-01' AND order_date < '2024-01-01';

-- 解决方案2：创建表达式索引（MySQL 8.0+）
CREATE INDEX idx_orders_year ON orders((YEAR(order_date)));
```

#### 案例2: 隐式类型转换问题

```sql
-- 问题SQL：导致索引失效
SELECT * FROM users WHERE id = '123';  -- id是整数类型

-- 问题分析：字符串到整数的隐式转换导致索引失效
-- EXPLAIN输出显示Seq Scan而非Index Scan

-- 解决方案：确保类型匹配
SELECT * FROM users WHERE id = 123;  -- 使用整数
```

#### 案例3: 低效的分页查询

```sql
-- 问题SQL：大偏移量分页性能差
SELECT * FROM products 
ORDER BY create_time DESC 
LIMIT 20 OFFSET 100000;

-- 问题分析：数据库需要扫描并丢弃前100000行记录
-- 随着偏移量增加，性能线性下降

-- 解决方案：使用游标分页
SELECT * FROM products 
WHERE create_time < '2023-05-15 10:30:00'  -- 上一页最后一条记录的时间
ORDER BY create_time DESC 
LIMIT 20;
```

### 2. 逻辑错误案例

#### 案例1: NULL值处理错误

```sql
-- 问题SQL：NULL值导致逻辑错误
SELECT * FROM orders 
WHERE amount > 1000 OR amount = NULL;

-- 问题分析：amount = NULL永远返回NULL（既不是TRUE也不是FALSE）
-- 导致包含NULL值的记录不会被查询到

-- 解决方案：使用IS NULL处理NULL值
SELECT * FROM orders 
WHERE amount > 1000 OR amount IS NULL;

-- 或者使用COALESCE函数
SELECT * FROM orders 
WHERE COALESCE(amount, 0) > 1000;
```

#### 案例2: JOIN条件错误

```sql
-- 问题SQL：错误连接条件导致数据重复
SELECT o.id, c.name, o.amount
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id OR c.id IS NULL;

-- 问题分析：OR条件导致每个订单可能与多个客户匹配
-- 结果数据重复，聚合计算错误

-- 解决方案：修正连接条件
SELECT o.id, c.name, o.amount
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id;
```

#### 案例3: 子查询逻辑错误

```sql
-- 问题SQL：子查询返回多行导致错误
SELECT * FROM products 
WHERE category_id = (SELECT id FROM categories WHERE name = 'Electronics');

-- 问题分析：如果存在多个名为'Electronics'的类别，子查询返回多行
-- 导致SQL错误或不可预测的结果

-- 解决方案1：使用LIMIT确保单行
SELECT * FROM products 
WHERE category_id = (SELECT id FROM categories WHERE name = 'Electronics' LIMIT 1);

-- 解决方案2：使用IN处理多值
SELECT * FROM products 
WHERE category_id IN (SELECT id FROM categories WHERE name = 'Electronics');
```

### 3. 安全问题案例

#### 案例1: SQL注入漏洞

```sql
-- 问题代码：直接拼接用户输入
String sql = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";

-- 问题分析：用户输入未经过滤直接拼接，存在SQL注入风险
-- 攻击者可以输入：admin' OR '1'='1绕过认证

-- 解决方案：使用参数化查询
String sql = "SELECT * FROM users WHERE username = ? AND password = ?";
PreparedStatement stmt = connection.prepareStatement(sql);
stmt.setString(1, username);
stmt.setString(2, password);
ResultSet rs = stmt.executeQuery();
```

#### 案例2: 权限过度授予

```sql
-- 问题SQL：授予过多权限
GRANT ALL PRIVILEGES ON app_db.* TO 'app_user'@'%';

-- 问题分析：应用用户拥有包括DROP、CREATE等危险权限
-- 一旦应用被攻破，攻击者可以完全控制数据库

-- 解决方案：最小权限原则
GRANT SELECT, INSERT, UPDATE, DELETE ON app_db.* TO 'app_user'@'%';
```

### 4. 数据一致性问题

#### 案例1: 并发更新问题

```sql
-- 问题代码：读取-修改-写入操作非原子性
-- 事务1
SELECT balance FROM accounts WHERE id = 123;  -- 返回1000
-- 应用层计算新余额：1000 + 200 = 1200
UPDATE accounts SET balance = 1200 WHERE id = 123;

-- 事务2（在事务1更新前执行）
SELECT balance FROM accounts WHERE id = 123;  -- 返回1000
-- 应用层计算新余额：1000 - 500 = 500
UPDATE accounts SET balance = 500 WHERE id = 123;

-- 问题分析：两个事务都基于相同的初始余额计算，导致最终余额错误

-- 解决方案1：使用事务和行级锁
BEGIN;
SELECT balance FROM accounts WHERE id = 123 FOR UPDATE;  -- 锁定行
UPDATE accounts SET balance = balance + 200 WHERE id = 123;
COMMIT;

-- 解决方案2：使用原子更新
UPDATE accounts SET balance = balance + 200 WHERE id = 123;
```

#### 案例2: 外键约束缺失

```sql
-- 问题表设计：缺少外键约束
CREATE TABLE orders (
    id INT PRIMARY KEY,
    customer_id INT,
    amount DECIMAL(10,2),
    -- 缺少外键约束
);

-- 问题分析：可以插入不存在的customer_id，导致数据不一致
-- 删除客户时，相关订单记录仍然存在

-- 解决方案：添加外键约束
CREATE TABLE orders (
    id INT PRIMARY KEY,
    customer_id INT,
    amount DECIMAL(10,2),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE RESTRICT  -- 或 ON DELETE CASCADE根据业务需求
);
```

## SQL审核规则生成

基于以上历史问题，可以生成以下审核规则：

### 性能相关规则

1. **禁止在索引列上使用函数**
   ```regex
   WHERE\s+\w+\s*\(\s*\w+\s*\)\s*[><=!]?
   ```

2. **禁止大偏移量分页查询**
   ```regex
   LIMIT\s+\d+\s+OFFSET\s+[1-9]\d{3,}
   ```

3. **禁止隐式类型转换**
   ```regex
   WHERE\s+\w+\s*[><=!]\s*['"]\d+['"]
   ```

### 安全相关规则

1. **禁止直接拼接用户输入**
   ```regex
   (SELECT|INSERT|UPDATE|DELETE).*\+.*\w+
   ```

2. **禁止使用过于宽泛的权限**
   ```regex
   GRANT\s+ALL\s+PRIVILEGES
   ```

### 逻辑相关规则

1. **禁止使用=比较NULL值**
   ```regex
   \w+\s*=\s*NULL
   ```

2. **禁止使用OR连接NULL条件**
   ```regex
   \w+\s*=\s*NULL\s+OR
   ```

3. **禁止子查询可能返回多行**
   ```regex
   WHERE\s+\w+\s*=\s*\(\s*SELECT.*\)
   ```

这些规则可以集成到SQL审核工具中，自动检测潜在问题并提供修复建议。