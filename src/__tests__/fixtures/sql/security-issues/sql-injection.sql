-- 安全问题：SQL注入风险测试用例
-- 问题描述：字符串拼接、动态SQL构建、参数化查询缺失

-- 1. 字符串拼接风险 (参数化查询建议)
-- 问题：直接字符串拼接，存在SQL注入风险
-- 建议：使用参数化查询
'SELECT * FROM users WHERE name = ''' + userName + ''''
'SELECT * FROM users WHERE email = ''' + userEmail + ''''
'SELECT * FROM products WHERE category = ''' + category + ''''

-- 2. 动态SQL构建风险
-- 问题：动态构建SQL语句，缺乏输入验证
'SELECT * FROM users WHERE id = ' + userId
'SELECT * FROM orders WHERE amount > ' + minAmount
'SELECT * FROM products WHERE price BETWEEN ' + minPrice + ' AND ' + maxPrice

-- 3. LIKE操作注入风险
-- 问题：LIKE操作中的用户输入未处理
'SELECT * FROM users WHERE name LIKE ''%' + searchTerm + '%'''
'SELECT * FROM products WHERE description LIKE ''%' + keyword + '%'''

-- 4. IN子句注入风险
-- 问题：IN子句中动态构建列表
'SELECT * FROM users WHERE id IN (' + idList + ')'
'SELECT * FROM products WHERE category_id IN (' + categoryIds + ')'

-- 5. ORDER BY注入风险
-- 问题：动态排序字段未验证
'SELECT * FROM users ORDER BY ' + sortBy + ' ' + sortOrder
'SELECT * FROM products ORDER BY ' + orderBy

-- 6. WHERE条件注入风险
-- 问题：复杂的WHERE条件构建
'SELECT * FROM orders WHERE ' + whereClause
'SELECT * FROM users WHERE ' + dynamicCondition

-- 7. 存储过程注入风险
-- 问题：存储过程中动态SQL
CREATE PROCEDURE GetUser(IN userId VARCHAR(100))
BEGIN
    SET @sql = CONCAT('SELECT * FROM users WHERE id = ', userId);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END;

-- 8. 批量操作注入风险
-- 问题：批量更新中的注入风险
'UPDATE users SET status = ''' + status + ''' WHERE id IN (' + idList + ')'
'DELETE FROM logs WHERE created_at < ''' + date + ''''

-- 9. 时间注入风险
-- 问题：时间相关的SQL注入
'SELECT * FROM logs WHERE created_at > ''' + startDate + ''' AND created_at < ''' + endDate + ''''

-- 10. 分页注入风险
-- 问题：分页参数未验证
'SELECT * FROM products LIMIT ' + limit + ' OFFSET ' + offset

-- 11. 联合查询注入风险
-- 问题：UNION操作中的注入
'SELECT name, email FROM users WHERE id = ' + id + ' UNION SELECT username, password FROM admins'

-- 12. 函数调用注入风险
-- 问题：自定义函数中的SQL注入
CREATE FUNCTION GetUserEmail(userId INT)
RETURNS VARCHAR(255)
BEGIN
    DECLARE result VARCHAR(255);
    SET @sql = CONCAT('SELECT email FROM users WHERE id = ', userId);
    SET result = (CAST(@sql AS CHAR));
    RETURN result;
END;

-- 13. 视图定义注入风险
-- 问题：动态创建视图时的注入
CREATE VIEW user_summary AS
SELECT * FROM users WHERE ' + condition

-- 14. 触发器注入风险
-- 问题：触发器中动态SQL
CREATE TRIGGER audit_trigger
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    SET @sql = CONCAT('INSERT INTO audit SET user_id = ', NEW.id, ', action = ''insert''');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END;

-- 15. 配置注入风险
-- 问题：配置表中的动态SQL执行
SELECT @config_value FROM config WHERE config_key = 'dynamic_sql'
EXECUTE @config_value;