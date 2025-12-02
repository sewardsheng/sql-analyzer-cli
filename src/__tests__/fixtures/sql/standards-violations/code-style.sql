-- 规范问题：代码风格测试用例
-- 问题描述：大小写不一致、格式混乱、缺少注释等

-- 1. 大小写不一致
-- 问题：SQL关键字大小写不统一
select * from USERS Where id = 1; -- 应为 SELECT * FROM users WHERE id = 1
Select Name, Email From users; -- 应为 SELECT name, email FROM users
UPDATE users SET status = 'active' where id = 1; -- WHERE 应大写

-- 2. 格式混乱
-- 问题：SQL语句格式不整洁
SELECT name,email,age FROM users WHERE status='active' AND age>18; -- 应添加空格
INSERT INTO users(name,email,created_at) VALUES('John','john@example.com',NOW()); -- 应格式化
SELECT u.name,u.email FROM users u JOIN orders o ON u.id=o.user_id WHERE o.status='completed' ORDER BY u.name;

-- 3. 缺少注释
-- 问题：复杂查询缺少必要注释
SELECT complex_calculation(column1, column2) AS result FROM table_name; -- 应添加注释说明计算逻辑
SELECT
    CASE
        WHEN status = 'active' THEN 1
        WHEN status = 'pending' THEN 2
        ELSE 0
    END as status_code
FROM users; -- 应注释CASE逻辑

-- 4. 过度复杂的一行语句
-- 问题：将复杂逻辑写在一行
SELECT name, email, CASE WHEN age > 18 AND status = 'active' AND last_login > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 'active_user' WHEN age > 18 AND status = 'inactive' THEN 'inactive_user' ELSE 'minor_user' END as user_category FROM users;

-- 5. 缩进不一致
-- 问题：查询嵌套时缩进不规范
SELECT u.name,
o.order_id,
 o.amount,
  o.status
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active';

-- 6. 字符串引号使用不一致
-- 问题：单引号和双引号混用
SELECT name FROM users WHERE status = "active" AND city = 'Beijing';
UPDATE users SET email = "new@example.com" WHERE name = 'John';

-- 7. 数字格式不一致
-- 问题：数字表示方式不一致
SELECT * FROM orders WHERE amount > 1000.00 AND quantity = 5 AND discount = .10;

-- 8. 空格使用不规范
-- 问题：多余空格或缺少空格
SELECT name , email FROM   users  WHERE id= 1; -- 多余空格
INSERT INTO users(name,email)VALUES('John','john@example.com'); -- 缺少空格

-- 9. 换行不规范
-- 问题：不必要的换行或缺少必要换行
SELECT
    name
FROM
    users
WHERE
    id = 1; -- 简单查询不应多行

SELECT name, email, age, status, created_at FROM users WHERE id IN (SELECT user_id FROM orders WHERE amount > 1000 AND status = 'completed' AND created_at > '2023-01-01') ORDER BY created_at DESC; -- 长查询应分行

-- 10. 逗号位置不一致
-- 问题：逗号在行首或行尾不一致
SELECT name
    , email
    , age
FROM users;

SELECT name,
email,
age FROM users; -- 应统一风格

-- 11. 括号使用不规范
-- 问题：括号周围空格不一致
SELECT * FROM users WHERE ( status = 'active' ) OR (age>18);
SELECT * FROM orders WHERE amount > (SELECT AVG(amount) FROM orders);

-- 12. 操作符空格不一致
-- 问题：操作符周围空格不规范
SELECT * FROM users WHERE age>18 AND status = 'active' OR city='Beijing';
UPDATE users SET score=score+10 WHERE id=1;

-- 13. 列表格式不规范
-- 问题：IN列表格式混乱
SELECT * FROM users WHERE id IN(1,2,3,4,5,6,7,8,9,10);
SELECT * FROM products WHERE category_id IN ( 1 , 2 , 3 , 4 , 5 );

-- 14. 表连接格式不规范
-- 问题：JOIN条件格式不统一
SELECT u.*, o.* FROM users u JOIN orders o ON u.id=o.user_id LEFT JOIN payments p ON o.id=p.order_id WHERE u.status='active';

-- 15. 注释风格不一致
-- 问题：注释格式不统一
SELECT name FROM users; -- single line comment
/* multi line comment */
SELECT email FROM users; # another comment style

-- 16. 保留字作为标识符
-- 问题：使用保留字作为列名或表名未加引号
SELECT order, date FROM orders; -- order 是保留字
CREATE TABLE user (name VARCHAR(100)); -- user 是保留字