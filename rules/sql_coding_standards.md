# SQL编码规范

## 1. 命名规范

### 1.1 表名命名
- 使用小写字母
- 使用下划线分隔单词
- 使用复数形式
- 使用有意义的名称

```sql
-- 推荐
user_profiles
order_items
product_categories

-- 不推荐
UserProfiles
userprofiles
tbl_user
users123
```

### 1.2 列名命名
- 使用小写字母
- 使用下划线分隔单词
- 使用单数形式
- 避免使用缩写

```sql
-- 推荐
first_name
created_at
is_active

-- 不推荐
FirstName
creationDate
flag
usr_nm
```

### 1.3 索引命名
- 使用idx_前缀
- 包含表名和列名
- 使用下划线分隔

```sql
-- 推荐
idx_users_email
idx_orders_created_at

-- 不推荐
email_index
index1
idx1
```

## 2. 格式规范

### 2.1 关键字大写
```sql
-- 推荐
SELECT id, name, email 
FROM users 
WHERE status = 'active' 
ORDER BY created_at DESC;

-- 不推荐
select id, name, email 
from users 
where status = 'active' 
order by created_at desc;
```

### 2.2 缩进和对齐
- 使用2或4个空格缩进
- 对齐关键字
- 每个主要子句单独一行

```sql
-- 推荐
SELECT u.id, 
       u.name, 
       p.title
FROM users u
JOIN posts p ON u.id = p.user_id
WHERE u.status = 'active'
  AND p.created_at >= '2023-01-01'
ORDER BY p.created_at DESC;
```

## 3. 注释规范

### 3.1 单行注释
```sql
-- 获取活跃用户的最新文章
SELECT u.id, u.name, p.title
FROM users u
JOIN posts p ON u.id = p.user_id
WHERE u.status = 'active';
```

### 3.2 多行注释
```sql
/*
 * 计算用户平均订单金额
 * 只考虑已完成订单
 * 排除异常值（金额大于10000）
 */
SELECT AVG(order_amount) as avg_amount
FROM orders
WHERE status = 'completed'
  AND order_amount < 10000;
```