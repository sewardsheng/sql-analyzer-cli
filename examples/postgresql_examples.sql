-- PostgreSQL示例SQL语句
-- 包含一些常见的问题，用于测试SQL分析器

-- 示例1: 潜在的SQL注入风险
SELECT * FROM users WHERE username = '$username' AND password = '$password';

-- 示例2: 全表扫描风险
SELECT * FROM orders WHERE to_char(order_date, 'YYYY-MM') = '2023-01';

-- 示例3: 缺少索引优化
SELECT * FROM products WHERE category_id = 5 AND status = 'active';

-- 示例4: 隐式类型转换
SELECT * FROM users WHERE id = '123';

-- 示例5: 大数据量查询无限制
SELECT * FROM logs WHERE created_at > '2023-01-01';

-- 示例6: 不当使用OR条件
SELECT * FROM products WHERE name LIKE '%keyword%' OR description LIKE '%keyword%';

-- 示例7: 子查询未优化
SELECT * FROM orders WHERE user_id IN (SELECT id FROM users WHERE status = 'active');

-- 示例8: 临时表使用
SELECT * FROM (SELECT * FROM products WHERE price > 100) AS expensive_products ORDER BY name;

-- 示例9: PostgreSQL特有问题 - 使用ILIKE可能导致性能问题
SELECT * FROM products WHERE name ILIKE '%keyword%';

-- 示例10: 不当使用正则表达式
SELECT * FROM users WHERE email ~ '.*@gmail\\.com';