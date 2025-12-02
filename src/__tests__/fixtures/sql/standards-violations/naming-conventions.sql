-- 规范问题：命名规范测试用例
-- 问题描述：表名、列名、别名等命名不规范

-- 1. 表名不规范
-- 问题：表名不符合命名规范
SELECT * FROM User_Data; -- 应为 user_data
SELECT * FROM ordersTable; -- 应为 orders
SELECT * FROM CUSTOMER-INFO; -- 应为 customer_info
SELECT * FROM tbl_users; -- 应为 users
SELECT * FROM user; -- 复数形式应为 users

-- 2. 列名不规范
-- 问题：列名不符合命名规范
SELECT user_name, user_email FROM user_table; -- 应为 name, email
SELECT Name, Email FROM Users; -- 应为小写
SELECT firstName, lastName FROM customers; -- 应为 first_name, last_name
SELECT user-id, user-name FROM users; -- 应使用下划线
SELECT customer id, order date FROM orders; -- 空格不规范

-- 3. 别名不规范
-- 问题：表别名和列别名不规范
SELECT u.name, u.email FROM users u; -- 别名应有意义
SELECT a.name, b.email FROM users a, profiles b; -- a, b无意义
SELECT name AS n, email AS e FROM users; -- 单字母别名不规范
SELECT user_name AS "User Name" FROM users; -- 别名包含空格和大小写

-- 4. 索引名不规范
-- 问题：索引命名不规范
CREATE INDEX idx1 ON users(email); -- 应描述索引用途
CREATE INDEX users_email_idx ON users(email); -- 应为 idx_users_email
CREATE INDEX user_index_name ON users(name); -- 应为 idx_users_name

-- 5. 约束名不规范
-- 问题：约束命名不规范
ALTER TABLE users ADD CONSTRAINT chk1 CHECK (age > 0); -- 应描述约束
ALTER TABLE users ADD CONSTRAINT users_age_check CHECK (age > 0); -- 应为 chk_users_age
ALTER TABLE orders ADD CONSTRAINT fk1 FOREIGN KEY (user_id) REFERENCES users(id); -- 应为 fk_orders_user_id

-- 6. 视图名不规范
-- 问题：视图命名不规范
CREATE VIEW v1 AS SELECT * FROM active_users; -- 应描述视图用途
CREATE VIEW user_view AS SELECT id, name FROM users; -- 应为 active_users_view

-- 7. 存储过程名不规范
-- 问题：存储过程命名不规范
CREATE PROCEDURE proc1 AS BEGIN -- 应描述功能
CREATE PROCEDURE get_user_data AS BEGIN -- 应为 sp_get_user_details

-- 8. 函数名不规范
-- 问题：函数命名不规范
CREATE FUNCTION func1() RETURNS INT -- 应描述功能
CREATE FUNCTION calculate() RETURNS DECIMAL -- 应描述计算内容

-- 9. 触发器名不规范
-- 问题：触发器命名不规范
CREATE TRIGGER tr1 BEFORE INSERT ON users -- 应描述触发器动作
CREATE TRIGGER users_trigger AFTER UPDATE ON users -- 应为 trg_users_after_update

-- 10. 临时表名不规范
-- 问题：临时表命名不规范
CREATE TEMPORARY TABLE temp1 ( -- 应描述用途
CREATE TEMPORARY TABLE tmp_users ( -- 应为 temp_user_import

-- 11. 变量名不规范
-- 问题：变量命名不规范
DECLARE @a INT; -- 应描述变量用途
DECLARE @user_count INT; -- 应为 @total_user_count
DECLARE v_name VARCHAR(100); -- 应为 @user_name

-- 12. 游标名不规范
-- 问题：游标命名不规范
DECLARE cursor1 CURSOR FOR -- 应描述游标用途
DECLARE user_cursor CURSOR FOR -- 应为 cur_active_users

-- 13. 数据库名不规范
-- 问题：数据库名不规范
USE DB1; -- 应描述数据库用途
USE TEST-DB; -- 应使用下划线

-- 14. 模式名不规范
-- 问题：模式名不规范
SELECT * FROM schema1.table_name; -- 应描述模式用途
SELECT * FROM "SCHEMA".users; -- 应使用小写

-- 15. 列名长度不规范
-- 问题：列名过长或过短
SELECT this_is_a_very_long_column_name_that_is_hard_to_read FROM table1;
SELECT a FROM users; -- 单字母列名不够描述性