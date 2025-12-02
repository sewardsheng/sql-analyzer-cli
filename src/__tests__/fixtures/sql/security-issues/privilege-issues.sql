-- 安全问题：权限相关问题测试用例
-- 问题描述：过度权限查询、跨租户数据访问、敏感操作权限等

-- 1. 过度权限查询
-- 问题：普通用户查询管理员表
SELECT * FROM admin_users;
SELECT * FROM system_configurations;
SELECT * FROM security_logs;

-- 2. 跨租户数据访问
-- 问题：未限制租户范围的数据查询
SELECT * FROM users WHERE tenant_id = 'unauthorized_tenant';
SELECT * FROM orders WHERE user_id IN (SELECT id FROM users WHERE tenant_id = 'other_tenant');

-- 3. 敏感系统表查询
-- 问题：查询系统元数据表
SELECT * FROM information_schema.tables;
SELECT * FROM mysql.user;
SELECT * FROM pg_shadow;
SELECT * FROM sys.database_principals;

-- 4. 绕过权限检查
-- 问题：尝试通过技术手段绕过权限控制
SELECT * FROM users WHERE id = 1 OR 1=1; -- 常见绕过尝试
SELECT * FROM sensitive_data WHERE 'a' = 'a'; -- 恒真条件

-- 5. 越权操作查询
-- 问题：普通用户查询超出权限的数据
SELECT * FROM financial_reports WHERE department = 'HR'; -- HR查询财务报表
SELECT * FROM salaries WHERE user_id != CURRENT_USER_ID(); -- 查询他人薪资

-- 6. 备份数据访问
-- 问题：查询备份表或历史数据
SELECT * FROM users_backup;
SELECT * FROM orders_archive WHERE created_at > '2023-01-01';

-- 7. 调试信息暴露
-- 问题：查询可能导致系统信息泄露的语句
SELECT VERSION(), USER(), DATABASE();
SHOW VARIABLES;
SHOW STATUS;

-- 8. 事务隔离性问题
-- 问题：可能导致脏读的查询
SELECT * FROM users WITH (NOLOCK); -- SQL Server
SELECT * FROM users ISOLATION LEVEL READ UNCOMMITTED;

-- 9. 日志查询权限问题
-- 问题：查询敏感日志信息
SELECT * FROM application_logs WHERE message LIKE '%password%';
SELECT * FROM error_logs WHERE stack_trace IS NOT NULL;

-- 10. 配置信息访问
-- 问题：查询系统配置信息
SELECT * FROM configuration WHERE category = 'security';
SELECT * FROM api_keys WHERE is_active = 1;

-- 11. 会话管理权限问题
-- 问题：查询其他用户会话信息
SELECT * FROM user_sessions WHERE user_id != CURRENT_USER();
SELECT * FROM active_sessions WHERE last_access > DATE_SUB(NOW(), INTERVAL 1 HOUR);

-- 12. 数据导出权限问题
-- 问题：大量数据导出可能超出权限范围
SELECT * FROM customers; -- 导出所有客户信息
SELECT * FROM credit_cards WHERE status = 'active'; -- 导出活跃信用卡信息

-- 13. 统计数据权限问题
-- 问题：查询不应访问的统计数据
SELECT COUNT(*) FROM users WHERE tenant_id != CURRENT_TENANT_ID();
SELECT SUM(amount) FROM orders WHERE department != CURRENT_DEPARTMENT();

-- 14. 权限升级尝试
-- 问题：尝试查询权限相关信息
SELECT * FROM user_permissions WHERE user_id = 1; -- 查询管理员权限
SELECT * FROM role_assignments WHERE role_id = 'admin';

-- 15. 审计绕过
-- 问题：查询可能绕过审计的表
SELECT * FROM temp_users; -- 临时表可能未审计
SELECT * FROM staged_data; -- 暂存数据可能未审计