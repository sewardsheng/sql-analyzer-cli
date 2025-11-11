# MySQL性能优化规则

## 1. 索引优化

### 1.1 索引选择原则
- 为经常用于查询条件的列创建索引
- 为经常用于排序的列创建索引
- 为经常用于连接的列创建索引
- 避免为频繁更新的列创建过多索引

### 1.2 复合索引设计
- 将选择性高的列放在复合索引的前面
- 遵循最左前缀原则
- 考虑查询的频率和重要性

## 2. 查询优化

### 2.1 避免全表扫描
```sql
-- 不推荐
SELECT * FROM users WHERE name LIKE '%张%';

-- 推荐
SELECT * FROM users WHERE name LIKE '张%';
```

### 2.2 避免使用SELECT *
```sql
-- 不推荐
SELECT * FROM users;

-- 推荐
SELECT id, name, email FROM users;
```

### 2.3 使用LIMIT限制结果集
```sql
-- 推荐
SELECT * FROM orders WHERE status = 'pending' LIMIT 100;
```

## 3. 表结构优化

### 3.1 选择合适的数据类型
- 使用最小的数据类型
- 对于固定长度的字符串使用CHAR
- 对于可变长度的字符串使用VARCHAR

### 3.2 表分区
- 对于大表考虑使用分区
- 按时间分区是常见的选择
- 分区可以提高查询性能