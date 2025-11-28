-- SQL分析测试文件
SELECT * FROM users WHERE status = 'active';
UPDATE products SET price = price * 1.1 WHERE category_id = 5;
DELETE FROM orders WHERE created_at < '2024-01-01';