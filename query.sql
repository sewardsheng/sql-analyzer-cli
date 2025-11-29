-- 测试SQL示例
SELECT * FROM users WHERE id = 1;

-- 性能问题查询
SELECT * FROM orders o LEFTc JOIN users u ON o.user_id = u.id WHERE o.status = 'pending';

-- 潜在安全风险的查询
SELECT name FROM users WHERE password = '123456';
