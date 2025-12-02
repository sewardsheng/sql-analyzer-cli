-- 性能问题：索引相关问题测试用例
-- 问题描述：缺少索引、索引使用不当、函数调用导致索引失效

-- 1. 缺少索引的查询
-- 问题：WHERE条件中的字段没有索引，导致全表扫描
SELECT * FROM users WHERE email = 'test@example.com';

-- 2. 复合索引使用不当
-- 问题：创建了复合索引但查询顺序不匹配，索引失效
-- 假设有索引 (user_id, status)，但查询顺序相反
SELECT * FROM orders WHERE status = 'pending' AND user_id = 1;

-- 3. 函数调用导致索引失效
-- 问题：对索引字段使用函数，导致无法使用索引
SELECT * FROM users WHERE UPPER(name) = 'JOHN';
SELECT * FROM users WHERE SUBSTRING(email, 1, 5) = 'admin';
SELECT * FROM orders WHERE DATE_FORMAT(created_at, '%Y-%m') = '2023-12';

-- 4. LIKE查询索引失效
-- 问题：前导通配符导致索引失效
SELECT * FROM users WHERE email LIKE '%@gmail.com';
SELECT * FROM products WHERE name LIKE '%phone%';

-- 5. OR条件索引使用问题
-- 问题：OR条件可能导致索引失效或使用多个索引
SELECT * FROM users WHERE email = 'test@example.com' OR name = 'John Doe';

-- 6. 隐式类型转换
-- 问题：类型不匹配导致索引失效
-- 假设user_id是INT类型
SELECT * FROM users WHERE user_id = '123'; -- 字符串比较

-- 7. NOT操作符
-- 问题：NOT操作符可能导致索引失效
SELECT * FROM users WHERE status != 'deleted';
SELECT * FROM orders WHERE amount NOT IN (0, 100, 200);

-- 8. IS NULL/IS NOT NULL
-- 问题：对可为NULL的字段查询可能导致索引选择问题
SELECT * FROM users WHERE deleted_at IS NULL;

-- 9. 负向查询
-- 问题：负向条件可能导致索引失效
SELECT * FROM products WHERE category_id NOT IN (1, 2, 3);

-- 10. 大范围扫描
-- 问题：查询条件返回过多数据，索引扫描不如全表扫描
SELECT * FROM orders WHERE created_at > '2023-01-01';