# DBA 通用安全规则配置

## 规则概述

本文档包含适用于所有数据库系统的DBA安全静态规则，这些规则是基于安全最佳实践和合规要求总结的强制性安全要求。

---

## 访问控制规则

### 规则: SEC-001 - 禁止使用默认账户和密码
**严重级别**: 高  
**规则描述**: 禁止使用数据库默认账户和弱密码

**适用数据库**: 所有  
**检测条件**:
- 使用默认管理员账户（root、sa、postgres、system等）
- 使用空密码或简单密码
- 密码未定期更换

**违规示例**:
```sql
-- MySQL违规
CREATE USER 'root'@'%' IDENTIFIED BY '';
CREATE USER 'admin'@'%' IDENTIFIED BY '123456';

-- PostgreSQL违规
CREATE USER postgres WITH PASSWORD 'postgres';

-- SQL Server违规
CREATE LOGIN sa WITH PASSWORD = 'password';

-- Oracle违规
CREATE USER system IDENTIFIED BY oracle;
```

**正确示例**:
```sql
-- MySQL正确
CREATE USER 'app_user'@'192.168.1.%' IDENTIFIED BY 'C0mpl3x!P@ssw0rd#2024';

-- PostgreSQL正确
CREATE USER app_user WITH PASSWORD 'C0mpl3x!P@ssw0rd#2024';

-- SQL Server正确
CREATE LOGIN app_user WITH PASSWORD = 'C0mpl3x!P@ssw0rd#2024';

-- Oracle正确
CREATE USER app_user IDENTIFIED BY "C0mpl3x!P@ssw0rd#2024";
```

**密码复杂度要求**:
- 至少12个字符
- 包含大小写字母、数字和特殊字符
- 不包含用户名、常见单词
- 每90天强制更换

---

### 规则: SEC-002 - 实施最小权限原则
**严重级别**: 高  
**规则描述**: 应用账户只授予必要的最小权限

**适用数据库**: 所有  
**检测条件**:
- 应用账户拥有DBA/SUPERUSER权限
- 授予过多不必要的权限
- 使用通配符授权

**违规示例**:
```sql
-- MySQL违规
GRANT ALL PRIVILEGES ON *.* TO 'app_user'@'%';
GRANT SUPER ON *.* TO 'app_user'@'%';

-- PostgreSQL违规
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
ALTER USER app_user WITH SUPERUSER;

-- SQL Server违规
EXEC sp_addsrvrolemember 'app_user', 'sysadmin';

-- Oracle违规
GRANT DBA TO app_user;
GRANT UNLIMITED TABLESPACE TO app_user;
```

**正确示例**:
```sql
-- MySQL正确
GRANT SELECT, INSERT, UPDATE ON app_db.users TO 'app_user'@'192.168.1.%';
GRANT SELECT, INSERT, UPDATE, DELETE ON app_db.orders TO 'app_user'@'192.168.1.%';

-- PostgreSQL正确
GRANT SELECT, INSERT, UPDATE ON users TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO app_user;

-- SQL Server正确
GRANT SELECT, INSERT, UPDATE ON dbo.users TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.orders TO app_user;

-- Oracle正确
GRANT SELECT, INSERT, UPDATE ON users TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO app_user;
```

---

### 规则: SEC-003 - 限制远程连接
**严重级别**: 高  
**规则描述**: 限制数据库远程连接，只允许特定IP访问

**适用数据库**: 所有  
**检测条件**:
- 允许任意IP连接（%或0.0.0.0）
- 未配置防火墙规则
- 数据库端口暴露在公网

**违规示例**:
```sql
-- MySQL违规
CREATE USER 'app_user'@'%' IDENTIFIED BY 'password';  -- 允许任意IP

-- PostgreSQL违规（pg_hba.conf）
host    all    all    0.0.0.0/0    md5  -- 允许任意IP

-- SQL Server违规
-- 未配置防火墙，端口1433暴露在公网

-- Oracle违规（listener.ora）
-- 允许所有IP连接
```

**正确示例**:
```sql
-- MySQL正确
CREATE USER 'app_user'@'192.168.1.100' IDENTIFIED BY 'password';  -- 指定IP
CREATE USER 'app_user'@'192.168.1.%' IDENTIFIED BY 'password';    -- 指定网段

-- PostgreSQL正确（pg_hba.conf）
host    app_db    app_user    192.168.1.0/24    md5  -- 只允许内网

-- SQL Server正确
-- 配置Windows防火墙，只允许特定IP访问端口1433

-- Oracle正确（sqlnet.ora）
tcp.validnode_checking = yes
tcp.invited_nodes = (192.168.1.100, 192.168.1.101)
```

**网络安全建议**:
- 使用VPN或跳板机访问数据库
- 配置防火墙规则
- 使用非默认端口
- 启用SSL/TLS加密连接

---

## SQL注入防护规则

### 规则: SEC-004 - 强制使用参数化查询
**严重级别**: 高  
**规则描述**: 所有动态SQL必须使用参数化查询，禁止字符串拼接

**适用数据库**: 所有  
**检测条件**:
- SQL语句包含字符串拼接
- 未使用参数化查询
- 存在SQL注入风险

**违规示例**:
```python
# Python违规示例
user_input = request.get('username')
sql = "SELECT * FROM users WHERE username = '" + user_input + "'"
cursor.execute(sql)

# Java违规示例
String username = request.getParameter("username");
String sql = "SELECT * FROM users WHERE username = '" + username + "'";
Statement stmt = conn.createStatement();
stmt.executeQuery(sql);

# PHP违规示例
$username = $_POST['username'];
$sql = "SELECT * FROM users WHERE username = '$username'";
mysqli_query($conn, $sql);
```

**正确示例**:
```python
# Python正确示例 - 使用参数化查询
username = request.get('username')
sql = "SELECT * FROM users WHERE username = %s"
cursor.execute(sql, (username,))

# Java正确示例 - 使用PreparedStatement
String username = request.getParameter("username");
String sql = "SELECT * FROM users WHERE username = ?";
PreparedStatement pstmt = conn.prepareStatement(sql);
pstmt.setString(1, username);
pstmt.executeQuery();

# PHP正确示例 - 使用PDO
$username = $_POST['username'];
$sql = "SELECT * FROM users WHERE username = :username";
$stmt = $pdo->prepare($sql);
$stmt->execute(['username' => $username]);
```

---

### 规则: SEC-005 - 输入验证和过滤
**严重级别**: 高  
**规则描述**: 对所有用户输入进行验证和过滤

**适用数据库**: 所有  
**检测条件**:
- 未对用户输入进行验证
- 允许特殊字符和SQL关键字
- 未进行长度限制

**输入验证规则**:
```python
# 正确的输入验证示例
import re

def validate_username(username):
    """验证用户名格式"""
    if not username or len(username) > 50:
        raise ValueError("Invalid username length")
    
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        raise ValueError("Invalid username format")
    
    return username

def validate_email(email):
    """验证邮箱格式"""
    if not email or len(email) > 255:
        raise ValueError("Invalid email length")
    
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        raise ValueError("Invalid email format")
    
    return email

def validate_numeric(value, min_val=None, max_val=None):
    """验证数值范围"""
    try:
        num = int(value)
        if min_val is not None and num < min_val:
            raise ValueError(f"Value must be >= {min_val}")
        if max_val is not None and num > max_val:
            raise ValueError(f"Value must be <= {max_val}")
        return num
    except (ValueError, TypeError):
        raise ValueError("Invalid numeric value")
```

**危险字符和关键字黑名单**:
```python
# SQL关键字黑名单
SQL_KEYWORDS = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
    'EXEC', 'EXECUTE', 'UNION', 'DECLARE', 'CAST', 'CONVERT',
    'SCRIPT', 'JAVASCRIPT', 'VBSCRIPT', 'EVAL', 'EXPRESSION'
]

# 危险字符
DANGEROUS_CHARS = ["'", '"', ';', '--', '/*', '*/', '#', 'xp_', 'sp_']

def sanitize_input(user_input):
    """清理用户输入"""
    # 检查SQL关键字
    for keyword in SQL_KEYWORDS:
        if keyword.upper() in user_input.upper():
            raise ValueError(f"Forbidden keyword: {keyword}")
    
    # 检查危险字符
    for char in DANGEROUS_CHARS:
        if char in user_input:
            raise ValueError(f"Forbidden character: {char}")
    
    return user_input
```

---

## 数据保护规则

### 规则: SEC-006 - 敏感数据加密存储
**严重级别**: 高  
**规则描述**: 敏感数据必须加密存储

**适用数据库**: 所有  
**敏感数据类型**:
- 密码
- 身份证号
- 银行卡号
- 手机号
- 邮箱地址
- API密钥

**违规示例**:
```sql
-- 违规: 明文存储密码
CREATE TABLE users (
    id INT PRIMARY KEY,
    username VARCHAR(50),
    password VARCHAR(50),  -- 明文密码
    id_card VARCHAR(18),   -- 明文身份证
    bank_card VARCHAR(20)  -- 明文银行卡
);

INSERT INTO users VALUES (1, 'admin', '123456', '110101199001011234', '6222021234567890123');
```

**正确示例**:
```sql
-- MySQL正确: 使用加密函数
CREATE TABLE users (
    id INT PRIMARY KEY,
    username VARCHAR(50),
    password_hash VARCHAR(255),  -- 存储hash值
    id_card_encrypted VARBINARY(256),  -- 加密存储
    bank_card_encrypted VARBINARY(256)  -- 加密存储
);

-- 插入时加密
INSERT INTO users VALUES (
    1, 
    'admin', 
    SHA2('password', 256),  -- 密码hash
    AES_ENCRYPT('110101199001011234', 'encryption_key'),  -- 身份证加密
    AES_ENCRYPT('6222021234567890123', 'encryption_key')  -- 银行卡加密
);

-- PostgreSQL正确: 使用pgcrypto扩展
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    password_hash TEXT,
    id_card_encrypted BYTEA,
    bank_card_encrypted BYTEA
);

-- 插入时加密
INSERT INTO users VALUES (
    DEFAULT,
    'admin',
    crypt('password', gen_salt('bf')),  -- bcrypt加密
    pgp_sym_encrypt('110101199001011234', 'encryption_key'),
    pgp_sym_encrypt('6222021234567890123', 'encryption_key')
);
```

**加密最佳实践**:
- 密码使用bcrypt、PBKDF2或Argon2等单向hash算法
- 敏感数据使用AES-256对称加密
- 密钥独立管理，不存储在数据库中
- 定期轮换加密密钥

---

### 规则: SEC-007 - 敏感数据脱敏
**严重级别**: 中  
**规则描述**: 非生产环境的敏感数据必须脱敏

**适用数据库**: 所有  
**脱敏方法**:
```sql
-- MySQL脱敏示例
-- 手机号脱敏
UPDATE users SET phone = CONCAT(LEFT(phone, 3), '****', RIGHT(phone, 4));

-- 邮箱脱敏
UPDATE users SET email = CONCAT(LEFT(email, 2), '***@', SUBSTRING_INDEX(email, '@', -1));

-- 身份证脱敏
UPDATE users SET id_card = CONCAT(LEFT(id_card, 6), '********', RIGHT(id_card, 4));

-- 银行卡脱敏
UPDATE users SET bank_card = CONCAT(LEFT(bank_card, 4), ' **** **** ', RIGHT(bank_card, 4));

-- PostgreSQL脱敏示例
UPDATE users SET phone = OVERLAY(phone PLACING '****' FROM 4 FOR 4);
UPDATE users SET email = REGEXP_REPLACE(email, '^(.{2}).*@', '\1***@');

-- SQL Server脱敏示例
UPDATE users SET phone = STUFF(phone, 4, 4, '****');

-- Oracle脱敏示例
UPDATE users SET phone = REGEXP_REPLACE(phone, '(.{3})(.{4})(.{4})', '\1****\3');
```

---

## 审计和监控规则

### 规则: SEC-008 - 启用数据库审计日志
**严重级别**: 高  
**规则描述**: 必须启用数据库审计日志，记录所有安全相关操作

**适用数据库**: 所有  
**审计内容**:
- 登录失败
- 权限变更
- DDL操作
- 敏感数据访问
- 数据删除操作

**MySQL审计配置**:
```sql
-- 启用审计日志插件
INSTALL PLUGIN audit_log SONAME 'audit_log.so';

-- 配置审计规则
SET GLOBAL audit_log_policy = 'ALL';
SET GLOBAL audit_log_format = 'JSON';
SET GLOBAL audit_log_file = '/var/log/mysql/audit.log';

-- 审计特定操作
SET GLOBAL audit_log_statement_policy = 'ALL';
SET GLOBAL audit_log_connection_policy = 'ALL';
```

**PostgreSQL审计配置**:
```sql
-- 安装pgAudit扩展
CREATE EXTENSION pgaudit;

-- 配置审计规则
ALTER SYSTEM SET pgaudit.log = 'write, ddl, role';
ALTER SYSTEM SET pgaudit.log_catalog = on;
ALTER SYSTEM SET pgaudit.log_parameter = on;
SELECT pg_reload_conf();

-- 启用日志记录
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
```

**SQL Server审计配置**:
```sql
-- 创建服务器审计
CREATE SERVER AUDIT security_audit
TO FILE (FILEPATH = 'C:\SQLAudit\')
WITH (QUEUE_DELAY = 1000, ON_FAILURE = CONTINUE);

-- 启用审计
ALTER SERVER AUDIT security_audit WITH (STATE = ON);

-- 创建审计规范
CREATE SERVER AUDIT SPECIFICATION server_audit_spec
FOR SERVER AUDIT security_audit
ADD (FAILED_LOGIN_GROUP),
ADD (SUCCESSFUL_LOGIN_GROUP),
ADD (DATABASE_PERMISSION_CHANGE_GROUP),
ADD (SCHEMA_OBJECT_CHANGE_GROUP);

ALTER SERVER AUDIT SPECIFICATION server_audit_spec WITH (STATE = ON);
```

**Oracle审计配置**:
```sql
-- 启用统一审计
ALTER SYSTEM SET audit_trail = DB,EXTENDED SCOPE=SPFILE;

-- 创建审计策略
CREATE AUDIT POLICY security_policy
ACTIONS
    LOGON,
    LOGOFF,
    ALTER USER,
    GRANT,
    REVOKE,
    DROP TABLE,
    TRUNCATE TABLE;

-- 启用审计策略
AUDIT POLICY security_policy;
```

---

### 规则: SEC-009 - 监控异常访问行为
**严重级别**: 高  
**规则描述**: 实时监控并告警异常访问行为

**监控指标**:
- 短时间内大量失败登录
- 非工作时间的访问
- 异常IP地址访问
- 大批量数据查询
- 敏感表频繁访问

**告警规则示例**:
```python
# 异常访问检测脚本
import logging
from collections import defaultdict
from datetime import datetime, timedelta

class SecurityMonitor:
    def __init__(self):
        self.failed_logins = defaultdict(list)
        self.query_counts = defaultdict(int)
        
    def check_failed_logins(self, username, ip_address):
        """检测失败登录次数"""
        now = datetime.now()
        self.failed_logins[username].append(now)
        
        # 清理5分钟前的记录
        self.failed_logins[username] = [
            t for t in self.failed_logins[username]
            if now - t < timedelta(minutes=5)
        ]
        
        # 5分钟内失败5次，触发告警
        if len(self.failed_logins[username]) >= 5:
            self.alert(f"Multiple failed login attempts for {username} from {ip_address}")
            return True
        return False
    
    def check_suspicious_query(self, username, query, row_count):
        """检测可疑查询"""
        # 检测大批量查询
        if row_count > 100000:
            self.alert(f"Large query result ({row_count} rows) by {username}: {query}")
        
        # 检测敏感表访问
        sensitive_tables = ['users', 'passwords', 'credit_cards', 'bank_accounts']
        for table in sensitive_tables:
            if table in query.lower():
                logging.warning(f"Sensitive table access by {username}: {table}")
    
    def alert(self, message):
        """发送告警"""
        logging.error(f"SECURITY ALERT: {message}")
        # 发送邮件/短信/推送通知
```

---

## 备份和恢复规则

### 规则: SEC-010 - 定期备份并加密
**严重级别**: 高  
**规则描述**: 定期备份数据库，备份文件必须加密

**备份策略**:
- 每天全量备份
- 每小时增量备份
- 备份保留至少30天
- 异地备份

**MySQL备份示例**:
```bash
# 加密备份
mysqldump -u root -p \
  --single-transaction \
  --routines \
  --triggers \
  --all-databases | \
  openssl enc -aes-256-cbc -salt -k 'backup_password' > \
  /backup/mysql_$(date +%Y%m%d_%H%M%S).sql.enc

# 验证备份
openssl enc -aes-256-cbc -d -k 'backup_password' \
  -in /backup/mysql_20240101.sql.enc | \
  head -n 10
```

**PostgreSQL备份示例**:
```bash
# 加密备份
pg_dump -U postgres -Fc appdb | \
  gpg --symmetric --cipher-algo AES256 > \
  /backup/postgres_$(date +%Y%m%d_%H%M%S).dump.gpg

# 验证备份
gpg --decrypt /backup/postgres_20240101.dump.gpg | \
  pg_restore --list | head -n 10
```

---

## 规则总结

### 安全检查清单

#### 访问控制（3项）
- [ ] SEC-001: 禁止使用默认账户和密码
- [ ] SEC-002: 实施最小权限原则
- [ ] SEC-003: 限制远程连接

#### SQL注入防护（2项）
- [ ] SEC-004: 强制使用参数化查询
- [ ] SEC-005: 输入验证和过滤

#### 数据保护（2项）
- [ ] SEC-006: 敏感数据加密存储
- [ ] SEC-007: 敏感数据脱敏

#### 审计监控（2项）
- [ ] SEC-008: 启用数据库审计日志
- [ ] SEC-009: 监控异常访问行为

#### 备份恢复（1项）
- [ ] SEC-010: 定期备份并加密

### 合规要求

#### 等保2.0要求
- 身份鉴别
- 访问控制
- 安全审计
- 数据完整性
- 数据保密性

#### GDPR要求
- 数据加密
- 访问控制
- 审计日志
- 数据脱敏
- 定期备份

### 安全工具推荐
- SQLMap: SQL注入检测
- OWASP ZAP: Web安全扫描
- Nmap: 端口扫描
- Wireshark: 网络抓包分析
- Metasploit: 渗透测试
