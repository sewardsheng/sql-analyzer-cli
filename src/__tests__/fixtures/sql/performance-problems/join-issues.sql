-- 性能问题：JOIN优化问题测试用例
-- 问题描述：笛卡尔积、大表驱动小表、子查询未优化、关联条件问题

-- 1. 笛卡尔积
-- 问题：缺少JOIN条件，产生笛卡尔积
SELECT u.*, o.*
FROM users u, orders o;

-- 2. 大表驱动小表
-- 问题：应该用小表驱动大表，但查询计划错误
-- 假设large_table有100万行，small_table有100行
SELECT *
FROM large_table l
JOIN small_table s ON l.id = s.large_id;

-- 3. 子查询未优化为JOIN
-- 问题：相关子查询性能差，应改为JOIN
SELECT *
FROM users u
WHERE u.id IN (
    SELECT o.user_id
    FROM orders o
    WHERE o.amount > 1000
);

-- 4. EXISTS子查询性能问题
-- 问题：EXISTS子查询可能比JOIN慢
SELECT u.*
FROM users u
WHERE EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.user_id = u.id
    AND o.amount > 1000
);

-- 5. 多表JOIN无优化
-- 问题：多表JOIN缺少合适的索引和优化
SELECT u.name, p.title, o.amount, c.name as category
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN products p ON o.product_id = p.id
JOIN categories c ON p.category_id = c.id
WHERE o.status = 'completed';

-- 6. CROSS JOIN性能问题
-- 问题：不必要的CROSS JOIN
SELECT u.name, p.name
FROM users u
CROSS JOIN products p;

-- 7. 自连接性能问题
-- 问题：大数据量表的自连接
SELECT e1.name as employee, e2.name as manager
FROM employees e1
JOIN employees e2 ON e1.manager_id = e2.id;

-- 8. 多对多关系JOIN
-- 问题：中间表数据量大时JOIN性能差
SELECT u.name, r.name as role
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id;

-- 9. JOIN条件使用函数
-- 问题：JOIN条件中使用函数，导致索引失效
SELECT u.*, o.*
FROM users u
JOIN orders o ON UPPER(u.email) = UPPER(o.customer_email);

-- 10. 复杂JOIN嵌套
-- 问题：过度嵌套的JOIN查询
SELECT
    u.name as user_name,
    o.order_number,
    p.product_name,
    c.category_name,
    s.supplier_name
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
JOIN categories c ON p.category_id = c.id
JOIN suppliers s ON p.supplier_id = s.id
WHERE o.status = 'completed'
AND o.created_at > '2023-01-01';