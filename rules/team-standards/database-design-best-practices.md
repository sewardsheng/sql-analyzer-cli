# 数据库设计最佳实践

本文档提供数据库设计的最佳实践和指导原则，帮助团队设计高质量、可维护的数据库结构。

## 1. 数据库设计原则

### 1.1 范式化与反范式化

#### 第一范式(1NF)
- 确保每列都是原子性的
- 消除重复组
- 每行必须有唯一标识

```sql
-- 不符合1NF的设计
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    phone_numbers VARCHAR(200)  -- 存储多个电话号码
);

-- 符合1NF的设计
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE user_phones (
    id INT PRIMARY KEY,
    user_id INT NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 第二范式(2NF)
- 满足1NF
- 非主键列完全依赖于整个主键
- 消除部分依赖

```sql
-- 不符合2NF的设计（复合主键）
CREATE TABLE order_items (
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(100),  -- 仅依赖于product_id
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (order_id, product_id)
);

-- 符合2NF的设计
CREATE TABLE order_items (
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (order_id, product_id)
);

CREATE TABLE products (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    -- 其他产品属性
);
```

#### 第三范式(3NF)
- 满足2NF
- 非主键列不依赖于其他非主键列
- 消除传递依赖

```sql
-- 不符合3NF的设计
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city_id INT NOT NULL,
    city_name VARCHAR(50) NOT NULL,  -- 依赖于city_id
    country VARCHAR(50) NOT NULL      -- 依赖于city_name
);

-- 符合3NF的设计
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city_id INT NOT NULL,
    FOREIGN KEY (city_id) REFERENCES cities(id)
);

CREATE TABLE cities (
    id INT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    country VARCHAR(50) NOT NULL
);
```

#### 反范式化策略
- 适当反范式化提高查询性能
- 在读多写少的场景中使用
- 考虑数据一致性维护成本

```sql
-- 反范式化示例：在订单表中存储用户姓名
CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT NOT NULL,
    user_name VARCHAR(100) NOT NULL,  -- 冗余存储，避免JOIN
    order_date TIMESTAMP NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 1.2 数据类型选择

#### 数值类型
- 整数类型：根据范围选择TINYINT、SMALLINT、MEDIUMINT、INT或BIGINT
- 浮点类型：精确计算使用DECIMAL，近似计算使用FLOAT或DOUBLE
- 自增主键使用INT或BIGINT

```sql
-- 好的示例
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,  -- 精确金额
    stock_count INT NOT NULL DEFAULT 0,  -- 库存数量
    weight_kg DECIMAL(8, 3),  -- 重量，精确到克
    is_available BOOLEAN NOT NULL DEFAULT TRUE  -- 布尔值
);
```

#### 字符串类型
- 定长字符串使用CHAR
- 变长字符串使用VARCHAR
- 大文本使用TEXT
- 选择适当长度，避免浪费

```sql
-- 好的示例
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(50) NOT NULL,  -- 用户名
    email VARCHAR(100) NOT NULL,  -- 邮箱
    phone VARCHAR(20),  -- 电话号码
    bio TEXT,  -- 个人简介，可能很长
    country_code CHAR(2)  -- 国家代码，固定2位
);
```

#### 日期时间类型
- 使用DATE存储日期
- 使用TIME存储时间
- 使用DATETIME或TIMESTAMP存储日期时间
- 了解数据库特定差异

```sql
-- 好的示例
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    event_date DATE NOT NULL,  -- 日期
    start_time TIME NOT NULL,  -- 时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 创建时间
    updated_at TIMESTAMP  -- 更新时间
);
```

### 1.3 索引设计

#### 主键索引
- 每个表必须有主键
- 优先使用单列主键
- 考虑使用自增整数或UUID

```sql
-- 好的示例
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL
);
```

#### 唯一索引
- 为业务唯一键创建唯一索引
- 防止重复数据
- 提高查询性能

```sql
-- 好的示例
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    UNIQUE KEY uk_user_name (user_name),
    UNIQUE KEY uk_email (email)
);
```

#### 普通索引
- 为常用查询条件创建索引
- 为JOIN条件创建索引
- 为ORDER BY创建索引

```sql
-- 好的示例
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_date TIMESTAMP NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    
    INDEX idx_user_id (user_id),  -- JOIN条件
    INDEX idx_order_date (order_date),  -- 查询条件
    INDEX idx_status (status),  -- 查询条件
    INDEX idx_user_date (user_id, order_date)  -- 复合索引
);
```

#### 复合索引
- 根据查询频率和选择性设计
- 将高选择性列放在前面
- 考虑索引覆盖查询

```sql
-- 好的示例
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_date TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    -- 根据常用查询条件创建复合索引
    INDEX idx_user_status_date (user_id, status, order_date),
    INDEX idx_status_date (status, order_date)
);
```

## 2. 表设计规范

### 2.1 表结构设计

#### 列设计
- 每列必须有明确的数据类型和长度
- 所有列必须有NOT NULL或NULL约束
- 为列提供默认值（适当）
- 添加注释说明列用途

```sql
-- 好的示例
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '用户唯一标识',
    user_name VARCHAR(50) NOT NULL COMMENT '用户名',
    email VARCHAR(100) NOT NULL COMMENT '邮箱地址',
    phone VARCHAR(20) NULL COMMENT '电话号码',
    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否激活',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP NULL COMMENT '更新时间'
);
```

#### 约束设计
- 使用主键约束确保唯一性
- 使用外键约束确保引用完整性
- 使用唯一约束防止重复
- 使用检查约束确保数据有效性

```sql
-- 好的示例
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    
    CONSTRAINT fk_orders_users FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT chk_total_amount CHECK (total_amount > 0),
    CONSTRAINT chk_status CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'))
);
```

### 2.2 关系设计

#### 一对一关系
- 使用外键唯一约束
- 或将表合并（如果关系紧密）

```sql
-- 好的示例：一对一关系
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL
);

CREATE TABLE user_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,  -- 唯一约束确保一对一
    bio TEXT,
    avatar_url VARCHAR(255),
    
    CONSTRAINT fk_user_profiles_users FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 一对多关系
- 在"多"的一方添加外键
- 考虑级联操作

```sql
-- 好的示例：一对多关系
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL
);

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    CONSTRAINT fk_orders_users FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT  -- 防止删除有订单的用户
        ON UPDATE CASCADE
);
```

#### 多对多关系
- 使用中间表
- 复合主键或自增主键
- 添加额外属性

```sql
-- 好的示例：多对多关系
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

CREATE TABLE courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE student_courses (
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    enrollment_date DATE NOT NULL,
    grade VARCHAR(2),
    
    PRIMARY KEY (student_id, course_id),  -- 复合主键
    CONSTRAINT fk_sc_students FOREIGN KEY (student_id) REFERENCES students(id),
    CONSTRAINT fk_sc_courses FOREIGN KEY (course_id) REFERENCES courses(id)
);
```

## 3. 高级设计模式

### 3.1 软删除模式
- 添加is_deleted标记
- 添加deleted_at时间戳
- 查询时过滤已删除记录

```sql
-- 好的示例：软删除
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_is_deleted (is_deleted)
);

-- 查询未删除用户
SELECT * FROM users WHERE is_deleted = FALSE;
```

### 3.2 审计日志模式
- 创建审计表
- 使用触发器自动记录
- 记录变更前后值

```sql
-- 好的示例：审计日志
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(10) NOT NULL,  -- INSERT, UPDATE, DELETE
    old_values JSON,  -- 变更前的值
    new_values JSON,  -- 变更后的值
    changed_by VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_changed_at (changed_at)
);
```

### 3.3 继承模式
- 单表继承(STI)
- 类表继承(CTI)
- 具体表继承

```sql
-- 好的示例：单表继承
CREATE TABLE people (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(20) NOT NULL,  -- 'student' or 'teacher'
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    
    -- 学生特有属性
    grade VARCHAR(10) NULL,
    
    -- 教师特有属性
    department VARCHAR(50) NULL,
    
    CHECK (
        (type = 'student' AND grade IS NOT NULL AND department IS NULL) OR
        (type = 'teacher' AND grade IS NULL AND department IS NOT NULL)
    )
);
```

### 3.4 状态机模式
- 使用状态字段
- 定义状态转换规则
- 使用约束确保有效性

```sql
-- 好的示例：状态机
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_status_transition CHECK (
        -- 定义状态转换规则
        (status = 'pending') OR
        (status = 'confirmed') OR
        (status = 'shipped') OR
        (status = 'delivered') OR
        (status = 'cancelled')
    )
);
```

## 4. 性能优化设计

### 4.1 分区策略
- 按范围分区
- 按列表分区
- 按哈希分区

```sql
-- 好的示例：按时间范围分区
CREATE TABLE orders (
    id INT NOT NULL,
    order_date DATE NOT NULL,
    user_id INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    PRIMARY KEY (id, order_date)
)
PARTITION BY RANGE (YEAR(order_date)) (
    PARTITION p2022 VALUES LESS THAN (2023),
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);
```

### 4.2 分库分表策略
- 水平分表
- 垂直分表
- 分库策略

### 4.3 读写分离
- 主从复制
- 读写分离中间件
- 数据一致性策略

## 5. 安全设计

### 5.1 数据加密
- 传输加密(SSL/TLS)
- 存储加密
- 字段级加密

### 5.2 访问控制
- 最小权限原则
- 角色基础访问控制
- 数据库用户权限设计

### 5.3 审计设计
- 操作日志
- 数据变更追踪
- 敏感操作监控

## 6. 数据迁移与版本控制

### 6.1 迁移脚本
- 版本化迁移脚本
- 可回滚设计
- 数据一致性检查

### 6.2 数据库版本控制
- 使用Liquibase或Flyway
- 变更集管理
- 环境同步

## 7. 设计文档

### 7.1 ER图设计
- 实体关系图
- 属性标注
- 关系类型

### 7.2 数据字典
- 表结构说明
- 字段含义
- 约束说明

## 8. 参考资源

- [SQL编码规范](./sql-coding-standards.md)
- [SQL语法指南](./sql-syntax-guide.md)
- [SQL性能优化指南](../performance-analysis/)
- [SQL安全规则](../security-audit/)