-- 性能问题：查询设计问题测试用例
-- 问题描述：SELECT *、深度分页、OR条件使用不当、过度聚合等

-- 1. SELECT * 性能问题
-- 问题：查询不必要的字段，增加网络传输和内存使用
SELECT * FROM users WHERE status = 'active';

-- 2. 深度分页性能问题
-- 问题：OFFSET值过大时性能急剧下降
SELECT * FROM orders ORDER BY created_at LIMIT 10000, 10;
SELECT * FROM products ORDER BY id LIMIT 50000, 20;

-- 3. OR条件使用不当
-- 问题：OR条件可能导致索引失效或全表扫描
SELECT * FROM products WHERE category = 'electronics' OR price > 1000;
SELECT * FROM users WHERE city = 'Beijing' OR age > 30;

-- 4. 重复计算
-- 问题：在SELECT和WHERE中重复计算相同表达式
SELECT
    (price * quantity) as total,
    (price * quantity) * 0.1 as tax
FROM orders
WHERE (price * quantity) > 1000;

-- 5. 过度使用DISTINCT
-- 问题：不必要或可以优化的DISTINCT使用
SELECT DISTINCT u.*
FROM users u
JOIN orders o ON u.id = o.user_id;

-- 6. 大结果集排序
-- 问题：对大数据集进行排序，消耗大量内存
SELECT * FROM large_table ORDER BY random_column;
SELECT * FROM audit_logs ORDER BY created_at, id;

-- 7. 不必要的子查询
-- 问题：可以用直接查询替代的子查询
SELECT * FROM users WHERE id IN (SELECT MAX(id) FROM users);

-- 8. 复杂表达式在WHERE条件
-- 问题：复杂的计算表达式在WHERE中影响性能
SELECT * FROM orders
WHERE (amount * 1.1) > 1000
AND (DATEDIFF(created_at, '2023-01-01') > 30);

-- 9. GROUP BY过度聚合
-- 问题：不必要的大量分组操作
SELECT
    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'),
    status,
    user_id,
    product_id,
    COUNT(*),
    SUM(amount),
    AVG(amount),
    MAX(amount),
    MIN(amount)
FROM orders
GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), status, user_id, product_id;

-- 10. HAVING子句性能问题
-- 问题：HAVING子句过滤大数据集
SELECT
    user_id,
    COUNT(*) as order_count,
    SUM(amount) as total_amount
FROM orders
GROUP BY user_id
HAVING COUNT(*) > 10 AND SUM(amount) > 5000;

-- 11. 临时表使用
-- 问题：隐式创建临时表的查询
SELECT * FROM large_table t1
WHERE t1.id NOT IN (
    SELECT id FROM another_table
);

-- 12. 全文搜索性能问题
-- 问题：使用LIKE进行全文搜索
SELECT * FROM articles WHERE content LIKE '%search term%';

-- 13. 批量插入单条执行
-- 问题：循环执行单条INSERT而非批量插入
-- (这类问题通常在应用代码中，但SQL层面可以给出建议)

-- 14. 不必要的数据类型转换
-- 问题：查询中进行不必要的数据类型转换
SELECT * FROM users WHERE CAST(age AS VARCHAR) = '25';

-- 15. 模糊查询优化问题
-- 问题：可以优化的模糊查询模式
SELECT * FROM products
WHERE name LIKE '%phone%' OR description LIKE '%smart%';