-- 经典 OR 1=1 注入
bun run dev analyze --sql "SELECT * FROM users WHERE username = 'admin' OR '1'='1' AND password = 'anything'"

-- 注释符绕过
bun run dev analyze --sql "SELECT * FROM products WHERE id = 1; DROP TABLE users; --"

-- UNION SELECT 攻击
bun run dev analyze --sql "SELECT id, name FROM products WHERE category = 'electronics' UNION SELECT username, password FROM users WHERE '1'='1'"

-- 堆叠查询注入
bun run dev analyze --sql "UPDATE accounts SET balance = 0 WHERE user_id = 1; DELETE FROM audit_logs WHERE '1'='1'"

-- 盲注入（布尔）
bun run dev analyze --sql "SELECT * FROM orders WHERE id = 1 AND (SELECT COUNT(*) FROM users) > 0"

-- 时间盲注
bun run dev analyze --sql "SELECT * FROM products WHERE id = 1 AND SLEEP(5) AND '1'='1'"

-- 二次编码注入
bun run dev analyze --sql "SELECT * FROM users WHERE name = 'test%27%20OR%20%271%27%3D%271'"

-- 子查询注入
bun run dev analyze --sql "SELECT * FROM posts WHERE author = (SELECT username FROM users WHERE id = 1 OR 1=1 LIMIT 1)"

-- CASE WHEN 盲注
bun run dev analyze --sql "SELECT * FROM accounts WHERE id = 1 AND (CASE WHEN (1=1) THEN 1 ELSE (SELECT 1 UNION SELECT 2) END) = 1"

-- 利用错误消息的注入
bun run dev analyze --sql "SELECT * FROM users WHERE id = CONVERT(int, (SELECT TOP 1 name FROM sysobjects WHERE xtype='U'))"

-- XPath 注入
bun run dev analyze --sql "SELECT * FROM products WHERE name = 'laptop' OR '1'='1' AND EXTRACTVALUE(1, CONCAT(0x7e, (SELECT database())))"

-- 宽字节注入
bun run dev analyze --sql "SELECT * FROM users WHERE username = '運' OR 1=1 -- '"