-- SQL Server测试查询
SELECT TOP 10 u.id, u.name, p.title 
FROM users u 
INNER JOIN posts p ON u.id = p.user_id 
WHERE u.created_at > '2023-01-01' 
ORDER BY p.created_at DESC;