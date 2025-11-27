# SQL编码风格与命名规范

本文档定义了团队SQL编码的标准风格和命名规范，以确保代码的一致性和可维护性。

## 1. 命名规范

### 1.1 数据库对象命名

#### 表名
- 使用小写字母
- 单词之间用下划线分隔
- 使用复数形式（如：users, orders, products）
- 避免缩写，使用完整单词
- 前缀表示业务模块（可选）

```sql
-- 好的示例
CREATE TABLE user_profiles (
    ...
);

CREATE TABLE order_items (
    ...
);

-- 不好的示例
CREATE TABLE usrProf (
    ...
);

CREATE TABLE order_itms (
    ...
);
```

#### 列名
- 使用小写字母
- 单词之间用下划线分隔
- 使用单数形式
- 避免表名作为前缀（除非是关联键）
- 布尔值列以is_, has_, can_等前缀

```sql
-- 好的示例
CREATE TABLE users (
    id INT PRIMARY KEY,
    user_name VARCHAR(50),
    email_address VARCHAR(100),
    is_active BOOLEAN,
    created_at TIMESTAMP
);

-- 不好的示例
CREATE TABLE users (
    id INT PRIMARY KEY,
    userName VARCHAR(50),
    email VARCHAR(100),
    active BOOLEAN,
    creation_date TIMESTAMP
);
```

#### 索引名
- 以idx_为前缀
- 包含表名和列名
- 使用下划线分隔

```sql
-- 好的示例
CREATE INDEX idx_users_email ON users(email_address);
CREATE INDEX idx_orders_user_id_created_at ON orders(user_id, created_at);

-- 不好的示例
CREATE INDEX email_idx ON users(email_address);
CREATE INDEX order_index ON orders(user_id, created_at);
```

#### 外键名
- 以fk_为前缀
- 包含表名和引用表名
- 使用下划线分隔

```sql
-- 好的示例
ALTER TABLE orders
ADD CONSTRAINT fk_orders_users_user_id
FOREIGN KEY (user_id) REFERENCES users(id);

-- 不好的示例
ALTER TABLE orders
ADD CONSTRAINT orders_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id);
```

#### 视图名
- 以v_为前缀
- 使用小写字母和下划线

```sql
-- 好的示例
CREATE VIEW v_user_orders AS
SELECT u.user_name, o.order_date, o.total_amount
FROM users u
JOIN orders o ON u.id = o.user_id;

-- 不好的示例
CREATE VIEW userOrders AS
SELECT u.user_name, o.order_date, o.total_amount
FROM users u
JOIN orders o ON u.id = o.user_id;
```

### 1.2 变量和参数命名

#### 存储过程和函数
- 使用小写字母和下划线
- 描述性名称，表示操作目的

```sql
-- 好的示例
CREATE PROCEDURE update_user_last_login(IN user_id INT)
BEGIN
    UPDATE users SET last_login = NOW() WHERE id = user_id;
END;

-- 不好的示例
CREATE PROCEDURE updLogin(IN uid INT)
BEGIN
    UPDATE users SET last_login = NOW() WHERE id = uid;
END;
```

#### 变量
- 使用小写字母和下划线
- 描述性名称

```sql
-- 好的示例
DECLARE user_count INT DEFAULT 0;
DECLARE max_order_date DATE;

-- 不好的示例
DECLARE cnt INT DEFAULT 0;
DECLARE maxDate DATE;
```

## 2. SQL编码风格

### 2.1 格式化

#### 关键字
- SQL关键字使用大写字母
- 函数名使用大写字母

```sql
-- 好的示例
SELECT id, user_name, email_address
FROM users
WHERE is_active = TRUE
ORDER BY created_at DESC;

-- 不好的示例
select id, user_name, email_address
from users
where is_active = true
order by created_at desc;
```

#### 缩进
- 使用4个空格缩进（不使用Tab）
- 子查询缩进
- JOIN条件缩进

```sql
-- 好的示例
SELECT u.id,
       u.user_name,
       o.order_date,
       oi.product_name,
       oi.quantity
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN order_items oi ON o.id = oi.order_id
WHERE u.is_active = TRUE
  AND o.order_date >= '2023-01-01'
ORDER BY o.order_date DESC;

-- 不好的示例
SELECT u.id, u.user_name, o.order_date, oi.product_name, oi.quantity
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN order_items oi ON o.id = oi.order_id
WHERE u.is_active = TRUE AND o.order_date >= '2023-01-01'
ORDER BY o.order_date DESC;
```

#### 换行
- 每列单独一行（列多时）
- WHERE条件每条件一行
- 长表达式在操作符后换行

```sql
-- 好的示例
SELECT u.id,
       u.user_name,
       o.order_date,
       oi.product_name,
       oi.quantity,
       oi.price
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN order_items oi ON o.id = oi.order_id
WHERE u.is_active = TRUE
  AND o.order_date >= '2023-01-01'
  AND oi.quantity > 0
ORDER BY o.order_date DESC,
         oi.price DESC;

-- 不好的示例
SELECT u.id, u.user_name, o.order_date, oi.product_name, oi.quantity, oi.price FROM users u JOIN orders o ON u.id = o.user_id JOIN order_items oi ON o.id = oi.order_id WHERE u.is_active = TRUE AND o.order_date >= '2023-01-01' AND oi.quantity > 0 ORDER BY o.order_date DESC, oi.price DESC;
```

### 2.2 注释规范

#### 单行注释
- 使用--注释
- 注释上方留空行
- 注释内容与--间留一个空格

```sql
-- 获取活跃用户的最新订单
SELECT u.id,
       u.user_name,
       o.order_date
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.is_active = TRUE
ORDER BY o.order_date DESC;
```

#### 多行注释
- 使用/* */注释
- 用于复杂逻辑说明或临时禁用代码

```sql
/*
 * 计算用户订单统计信息
 * 包括订单总数、总金额和平均订单金额
 */
SELECT 
    u.id,
    u.user_name,
    COUNT(o.id) AS order_count,
    SUM(o.total_amount) AS total_spent,
    AVG(o.total_amount) AS avg_order_amount
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.user_name;
```

### 2.3 复杂查询规范

#### 子查询
- 优先使用JOIN而非子查询
- 子查询必须使用别名
- 子查询内容格式化

```sql
-- 好的示例
SELECT u.id,
       u.user_name,
       latest_order.order_date
FROM users u
JOIN (
    SELECT user_id, MAX(order_date) AS order_date
    FROM orders
    GROUP BY user_id
) AS latest_order ON u.id = latest_order.user_id;

-- 不好的示例
SELECT u.id,
       u.user_name,
       (SELECT MAX(order_date) FROM orders WHERE user_id = u.id) AS order_date
FROM users u;
```

#### 公用表表达式(CTE)
- 复杂查询使用CTE提高可读性
- CTE名称使用描述性名称
- CTE之间用空行分隔

```sql
-- 好的示例
WITH user_orders AS (
    SELECT 
        user_id,
        COUNT(id) AS order_count,
        SUM(total_amount) AS total_spent
    FROM orders
    WHERE order_date >= '2023-01-01'
    GROUP BY user_id
),
user_stats AS (
    SELECT 
        u.id,
        u.user_name,
        COALESCE(uo.order_count, 0) AS order_count,
        COALESCE(uo.total_spent, 0) AS total_spent
    FROM users u
    LEFT JOIN user_orders uo ON u.id = uo.user_id
)
SELECT *
FROM user_stats
WHERE order_count > 10
ORDER BY total_spent DESC;

-- 不好的示例
SELECT u.id, u.user_name, COALESCE(uo.order_count, 0) AS order_count, COALESCE(uo.total_spent, 0) AS total_spent
FROM users u
LEFT JOIN (SELECT user_id, COUNT(id) AS order_count, SUM(total_amount) AS total_spent FROM orders WHERE order_date >= '2023-01-01' GROUP BY user_id) uo ON u.id = uo.user_id
WHERE COALESCE(uo.order_count, 0) > 10
ORDER BY COALESCE(uo.total_spent, 0) DESC;
```

## 3. 数据库设计规范

### 3.1 主键规范
- 每个表必须有主键
- 优先使用单列主键
- 主键名称为id
- 使用自增整数或UUID

```sql
-- 好的示例
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(50) NOT NULL,
    email_address VARCHAR(100) UNIQUE NOT NULL
);

-- 不好的示例
CREATE TABLE users (
    user_id INT AUTO_INCREMENT,
    user_name VARCHAR(50) NOT NULL,
    email_address VARCHAR(100) UNIQUE NOT NULL,
    PRIMARY KEY (user_id)
);
```

### 3.2 外键规范
- 所有外键必须有明确约束
- 外键列名与引用表主键名相同
- 定义适当的级联操作

```sql
-- 好的示例
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10, 2) NOT NULL,
    CONSTRAINT fk_orders_users_user_id
        FOREIGN KEY (user_id) 
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- 不好的示例
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10, 2) NOT NULL
);
```

### 3.3 列规范
- 每列必须有明确的数据类型和长度
- 所有列必须有NOT NULL或NULL约束
- 为列提供默认值（适当）
- 添加注释说明列用途

```sql
-- 好的示例
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '用户唯一标识',
    user_name VARCHAR(50) NOT NULL COMMENT '用户名',
    email_address VARCHAR(100) NOT NULL COMMENT '邮箱地址',
    phone_number VARCHAR(20) NULL COMMENT '电话号码',
    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否激活',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP NULL COMMENT '更新时间'
);

-- 不好的示例
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(50),
    email_address VARCHAR(100),
    phone_number VARCHAR(20),
    is_active BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## 4. 版本控制规范

### 4.1 迁移脚本命名
- 使用时间戳前缀
- 描述性名称
- 使用下划线分隔

```
20231126120000_create_users_table.sql
20231126120001_add_orders_table.sql
20231126120002_add_user_profiles_table.sql
```

### 4.2 迁移脚本结构
- 每个脚本包含UP和DOWN操作
- 使用注释分隔UP和DOWN部分
- 确保DOWN操作可以完全回滚UP操作

```sql
-- 创建用户表
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(50) NOT NULL,
    email_address VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 回滚操作
DROP TABLE users;
```

## 5. 团队协作规范

### 5.1 代码审查清单
- [ ] 命名是否符合规范
- [ ] 格式是否符合规范
- [ ] 是否有适当的注释
- [ ] 是否有性能问题
- [ ] 是否有安全风险
- [ ] 是否有事务处理
- [ ] 是否有错误处理

### 5.2 文档规范
- 复杂业务逻辑必须有文档说明
- 存储过程和函数必须有注释
- 数据库设计必须有ER图
- 重要变更必须有变更记录

## 6. 数据库特定规范

### 6.1 MySQL特定规范
- 使用InnoDB存储引擎
- 字符集使用utf8mb4
- 排序规则使用utf8mb4_unicode_ci

### 6.2 PostgreSQL特定规范
- 使用UUID作为主键（分布式系统）
- 使用JSONB存储非结构化数据
- 使用数组类型存储多值属性

### 6.3 SQL Server特定规范
- 使用NVARCHAR存储Unicode数据
- 使用DATETIME2替代DATETIME
- 使用SCHEMA组织数据库对象

## 7. 工具和资源

- SQL格式化工具：SQLFormatter, Poor Man's T-SQL Formatter
- ER图工具：draw.io, Lucidchart, MySQL Workbench
- 版本控制：Git, Liquibase, Flyway
- 代码审查：GitHub, GitLab, Bitbucket

## 8. 参考资源

- [SQL语法指南](./sql-syntax-guide.md)
- [数据库设计最佳实践](./database-design-best-practices.md)
- [SQL性能优化指南](../performance-analysis/)
- [SQL安全规则](../security-audit/)