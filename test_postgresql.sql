-- PostgreSQL测试查询
SELECT u.id, u.name, p.title 
FROM users u 
JOIN posts p ON u.id = p.user_id 
WHERE u.created_at > '2023-01-01' 
ORDER BY p.created_at DESC 
LIMIT 10 OFFSET 20;