-- Oracle测试查询
SELECT u.id, u.name, p.title 
FROM users u 
JOIN posts p ON u.id = p.user_id 
WHERE u.created_at > TO_DATE('2023-01-01', 'YYYY-MM-DD') 
ORDER BY p.created_at DESC 
FETCH FIRST 10 ROWS ONLY;