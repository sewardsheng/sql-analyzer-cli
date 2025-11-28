-- 示例SQL查询文件
-- 用于测试SQL分析器

-- 1. 简单SELECT查询
SELECT * FROM users WHERE id = 1;

-- 2. 带有性能问题的查询
SELECT u.*, p.* FROM users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE u.status = 'active'
ORDER BY u.created_at DESC;

-- 3. 潜在的SQL注入风险
SELECT * FROM products WHERE name = '" + userInput + "';

-- 4. 缺少索引的查询
SELECT * FROM orders WHERE order_date > '2024-01-01' AND status = 'pending';

-- 5. 复杂的子查询
SELECT c.name,
       (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) as order_count,
       (SELECT SUM(amount) FROM payments p WHERE p.customer_id = c.id) as total_spent
FROM customers c
WHERE c.created_at > '2024-01-01'
  AND EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.amount > 1000);

-- 6. 优化建议：使用索引提示
SELECT /*+ INDEX(customers idx_email) */ * FROM customers WHERE email = 'test@example.com';

-- 7. 分页查询（可能存在性能问题）
SELECT * FROM large_table ORDER BY created_at DESC LIMIT 1000, 10;

-- 8. 聚合查询
SELECT department,
       COUNT(*) as employee_count,
       AVG(salary) as avg_salary,
       MAX(salary) as max_salary
FROM employees
GROUP BY department
HAVING COUNT(*) > 5
ORDER BY avg_salary DESC;

-- 9. 更新操作（安全风险）
UPDATE users SET password = '123456' WHERE id = 1;

-- 10. 删除操作（需要谨慎）
DELETE FROM logs WHERE created_at < '2023-01-01';