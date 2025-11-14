# Oracle SQL 语法规范

## 基本语法结构

### SQL语句分类

Oracle SQL语句主要分为以下几类：

1. **DML (Data Manipulation Language)**: 数据操作语言
   - SELECT: 查询数据
   - INSERT: 插入数据
   - UPDATE: 更新数据
   - DELETE: 删除数据
   - MERGE: 合并数据

2. **DDL (Data Definition Language)**: 数据定义语言
   - CREATE: 创建数据库对象
   - ALTER: 修改数据库对象
   - DROP: 删除数据库对象
   - TRUNCATE: 清空表数据
   - RENAME: 重命名数据库对象

3. **DCL (Data Control Language)**: 数据控制语言
   - GRANT: 授予权限
   - REVOKE: 撤销权限

4. **TCL (Transaction Control Language)**: 事务控制语言
   - COMMIT: 提交事务
   - ROLLBACK: 回滚事务
   - SAVEPOINT: 设置保存点

## 数据定义语言 (DDL)

### 创建表

```sql
-- 基本表创建
CREATE TABLE employees (
    employee_id NUMBER(6) PRIMARY KEY,
    first_name VARCHAR2(20),
    last_name VARCHAR2(25) NOT NULL,
    email VARCHAR2(25) UNIQUE,
    phone_number VARCHAR2(20),
    hire_date DATE NOT NULL,
    job_id VARCHAR2(10) NOT NULL,
    salary NUMBER(8,2),
    commission_pct NUMBER(2,2),
    manager_id NUMBER(6),
    department_id NUMBER(4)
);

-- 使用子查询创建表
CREATE TABLE emp_copy AS
SELECT * FROM employees WHERE department_id = 60;

-- 创建临时表
CREATE GLOBAL TEMPORARY TABLE temp_orders (
    order_id NUMBER(10),
    customer_id NUMBER(6),
    order_date DATE,
    amount NUMBER(10,2)
) ON COMMIT PRESERVE ROWS;  -- 或 ON COMMIT DELETE ROWS
```

### 修改表结构

```sql
-- 添加列
ALTER TABLE employees ADD (
    birth_date DATE,
    social_security_number VARCHAR2(11)
);

-- 修改列定义
ALTER TABLE employees MODIFY (
    salary NUMBER(10,2),
    phone_number VARCHAR2(25)
);

-- 删除列
ALTER TABLE employees DROP COLUMN social_security_number;

-- 重命名列
ALTER TABLE employees RENAME COLUMN phone_number TO contact_phone;

-- 添加约束
ALTER TABLE employees ADD CONSTRAINT emp_salary_min 
    CHECK (salary > 0);

-- 删除约束
ALTER TABLE employees DROP CONSTRAINT emp_salary_min;

-- 启用/禁用约束
ALTER TABLE employees DISABLE CONSTRAINT emp_email_uk;
ALTER TABLE employees ENABLE CONSTRAINT emp_email_uk;
```

### 创建索引

```sql
-- 创建普通索引
CREATE INDEX idx_emp_lastname ON employees(last_name);

-- 创建唯一索引
CREATE UNIQUE INDEX idx_emp_email ON employees(email);

-- 创建复合索引
CREATE INDEX idx_emp_dept_salary ON employees(department_id, salary);

-- 创建函数索引
CREATE INDEX idx_emp_upper_name ON employees(UPPER(last_name));

-- 创建位图索引（适用于低基数列）
CREATE BITMAP INDEX idx_emp_gender ON employees(gender);

-- 创建反向键索引（适用于序列生成的ID）
CREATE INDEX idx_emp_id_reverse ON employees(employee_id) REVERSE;
```

### 创建视图

```sql
-- 创建基本视图
CREATE VIEW emp_view AS
SELECT employee_id, first_name, last_name, email, salary
FROM employees
WHERE department_id = 60;

-- 创建复杂视图
CREATE VIEW dept_summary AS
SELECT 
    d.department_id,
    d.department_name,
    COUNT(e.employee_id) AS employee_count,
    AVG(e.salary) AS avg_salary,
    MAX(e.salary) AS max_salary
FROM departments d
LEFT JOIN employees e ON d.department_id = e.department_id
GROUP BY d.department_id, d.department_name;

-- 创建只读视图
CREATE VIEW emp_readonly AS
SELECT employee_id, first_name, last_name, salary
FROM employees
WITH READ ONLY;

-- 创建检查选项视图
CREATE VIEW emp_it AS
SELECT employee_id, first_name, last_name, email
FROM employees
WHERE department_id = 60
WITH CHECK OPTION CONSTRAINT emp_it_ck;
```

### 创建序列

```sql
-- 创建基本序列
CREATE SEQUENCE emp_seq
    START WITH 1
    INCREMENT BY 1
    MAXVALUE 999999
    NOCACHE
    NOCYCLE;

-- 创建缓存序列
CREATE SEQUENCE order_seq
    START WITH 1000
    INCREMENT BY 1
    MAXVALUE 9999999
    CACHE 20
    NOCYCLE;

-- 使用序列
INSERT INTO employees (employee_id, first_name, last_name, email, hire_date, job_id)
VALUES (emp_seq.NEXTVAL, 'John', 'Doe', 'john.doe@example.com', SYSDATE, 'IT_PROG');

-- 获取当前序列值
SELECT emp_seq.CURRVAL FROM DUAL;
```

## 数据操作语言 (DML)

### SELECT查询

```sql
-- 基本查询
SELECT employee_id, first_name, last_name, salary
FROM employees
WHERE department_id = 60
ORDER BY salary DESC;

-- 使用别名
SELECT 
    employee_id AS "Employee ID",
    first_name || ' ' || last_name AS "Full Name",
    salary AS "Monthly Salary",
    salary * 12 AS "Annual Salary"
FROM employees;

-- 使用CASE表达式
SELECT 
    employee_id,
    first_name,
    salary,
    CASE 
        WHEN salary < 3000 THEN 'Low'
        WHEN salary BETWEEN 3000 AND 7000 THEN 'Medium'
        WHEN salary > 7000 THEN 'High'
    END AS salary_level
FROM employees;

-- 使用DECODE函数（Oracle特有）
SELECT 
    employee_id,
    job_id,
    DECODE(job_id, 
        'IT_PROG', 'Programmer',
        'SA_MAN', 'Sales Manager',
        'AD_ASST', 'Administrative Assistant',
        'Other') AS job_title
FROM employees;
```

### 连接查询

```sql
-- 内连接
SELECT e.employee_id, e.first_name, d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id;

-- 左外连接
SELECT e.employee_id, e.first_name, d.department_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id;

-- 右外连接
SELECT e.employee_id, e.first_name, d.department_name
FROM employees e
RIGHT JOIN departments d ON e.department_id = d.department_id;

-- 全外连接
SELECT e.employee_id, e.first_name, d.department_name
FROM employees e
FULL JOIN departments d ON e.department_id = d.department_id;

-- 自连接
SELECT 
    e.employee_id,
    e.first_name AS employee_name,
    m.employee_id AS manager_id,
    m.first_name AS manager_name
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.employee_id;

-- 使用USING子句简化连接
SELECT employee_id, first_name, department_name
FROM employees
JOIN departments USING (department_id);
```

### 子查询

```sql
-- 单行子查询
SELECT employee_id, first_name, salary
FROM employees
WHERE salary = (SELECT MAX(salary) FROM employees);

-- 多行子查询
SELECT employee_id, first_name, salary
FROM employees
WHERE salary > ALL (SELECT salary FROM employees WHERE department_id = 60);

-- 使用IN的多行子查询
SELECT employee_id, first_name, department_id
FROM employees
WHERE department_id IN (
    SELECT department_id 
    FROM departments 
    WHERE location_id = 1700
);

-- 相关子查询
SELECT 
    department_id,
    employee_id,
    first_name,
    salary
FROM employees e
WHERE salary > (
    SELECT AVG(salary) 
    FROM employees 
    WHERE department_id = e.department_id
);

-- EXISTS子查询
SELECT department_id, department_name
FROM departments d
WHERE EXISTS (
    SELECT 1 
    FROM employees e 
    WHERE e.department_id = d.department_id
);
```

### 集合操作

```sql
-- UNION（去重）
SELECT employee_id, first_name FROM employees
WHERE department_id = 60
UNION
SELECT employee_id, first_name FROM employees
WHERE department_id = 90;

-- UNION ALL（不去重）
SELECT employee_id, first_name FROM employees
WHERE department_id = 60
UNION ALL
SELECT employee_id, first_name FROM employees
WHERE department_id = 90;

-- INTERSECT（交集）
SELECT employee_id, first_name FROM employees
WHERE department_id = 60
INTERSECT
SELECT employee_id, first_name FROM employees
WHERE salary > 10000;

-- MINUS（差集）
SELECT employee_id, first_name FROM employees
MINUS
SELECT employee_id, first_name FROM employees
WHERE department_id = 60;
```

### 数据操作

```sql
-- 插入数据
INSERT INTO employees (
    employee_id, first_name, last_name, email, 
    hire_date, job_id, salary, department_id
) VALUES (
    207, 'John', 'Doe', 'john.doe@example.com', 
    SYSDATE, 'IT_PROG', 6000, 60
);

-- 从其他表插入数据
INSERT INTO emp_history (employee_id, old_salary, new_salary, change_date)
SELECT employee_id, salary, salary * 1.1, SYSDATE
FROM employees
WHERE department_id = 60;

-- 更新数据
UPDATE employees
SET salary = salary * 1.1
WHERE department_id = 60;

-- 使用子查询更新
UPDATE employees e
SET salary = (
    SELECT AVG(salary) * 1.2
    FROM employees
    WHERE department_id = e.department_id
)
WHERE job_id = 'ST_CLERK';

-- 删除数据
DELETE FROM employees
WHERE department_id = 60;

-- 使用子查询删除
DELETE FROM employees
WHERE department_id IN (
    SELECT department_id 
    FROM departments 
    WHERE location_id = 1700
);
```

### MERGE语句

```sql
-- 基本MERGE语法
MERGE INTO employees e
USING new_employees n
ON (e.employee_id = n.employee_id)
WHEN MATCHED THEN
    UPDATE SET 
        e.first_name = n.first_name,
        e.last_name = n.last_name,
        e.salary = n.salary
WHEN NOT MATCHED THEN
    INSERT (employee_id, first_name, last_name, hire_date, job_id, salary)
    VALUES (n.employee_id, n.first_name, n.last_name, n.hire_date, n.job_id, n.salary);

-- 复杂MERGE示例
MERGE INTO bonuses b
USING (
    SELECT employee_id, salary, department_id
    FROM employees
    WHERE department_id = 60
) e
ON (b.employee_id = e.employee_id)
WHEN MATCHED THEN
    UPDATE SET b.bonus_amount = e.salary * 0.1
    DELETE WHERE b.bonus_amount < 100
WHEN NOT MATCHED THEN
    INSERT (employee_id, bonus_amount)
    VALUES (e.employee_id, e.salary * 0.1);
```

## 数据类型

### 字符数据类型

```sql
-- VARCHAR2: 可变长度字符串
CREATE TABLE test_varchar2 (
    name VARCHAR2(50),  -- 最大4000字节
    description VARCHAR2(4000)
);

-- CHAR: 固定长度字符串
CREATE TABLE test_char (
    code CHAR(10),  -- 固定长度，不足用空格填充
    status CHAR(1)
);

-- NVARCHAR2: 可变长度Unicode字符串
CREATE TABLE test_nvarchar2 (
    name NVARCHAR2(50),  -- 最大4000字节
    description NVARCHAR2(4000)
);

-- NCHAR: 固定长度Unicode字符串
CREATE TABLE test_nchar (
    code NCHAR(10),
    status NCHAR(1)
);

-- CLOB: 大型字符对象
CREATE TABLE test_clob (
    id NUMBER,
    document CLOB
);

-- NCLOB: 大型Unicode字符对象
CREATE TABLE test_nclob (
    id NUMBER,
    document NCLOB
);
```

### 数值数据类型

```sql
-- NUMBER: 通用数值类型
CREATE TABLE test_number (
    integer_value NUMBER,           -- 默认精度38位
    decimal_value NUMBER(10, 2),     -- 总共10位，其中2位小数
    float_value NUMBER(10),          -- 总共10位，无小数位
    salary NUMBER(8, 2)              -- 8位总精度，2位小数位
);

-- BINARY_FLOAT: 单精度浮点数
CREATE TABLE test_binary_float (
    value BINARY_FLOAT
);

-- BINARY_DOUBLE: 双精度浮点数
CREATE TABLE test_binary_double (
    value BINARY_DOUBLE
);
```

### 日期时间数据类型

```sql
-- DATE: 日期和时间
CREATE TABLE test_date (
    event_date DATE,
    created_at DATE DEFAULT SYSDATE
);

-- TIMESTAMP: 精确到小数秒的时间戳
CREATE TABLE test_timestamp (
    event_time TIMESTAMP,
    precise_time TIMESTAMP(9)  -- 9位小数秒精度
);

-- TIMESTAMP WITH TIME ZONE: 带时区的时间戳
CREATE TABLE test_timestamp_tz (
    event_time TIMESTAMP WITH TIME ZONE
);

-- TIMESTAMP WITH LOCAL TIME ZONE: 本地时区的时间戳
CREATE TABLE test_timestamp_ltz (
    event_time TIMESTAMP WITH LOCAL TIME ZONE
);

-- INTERVAL YEAR TO MONTH: 年到月的间隔
CREATE TABLE test_interval_ym (
    service_period INTERVAL YEAR TO MONTH
);

-- INTERVAL DAY TO SECOND: 天到秒的间隔
CREATE TABLE test_interval_ds (
    duration INTERVAL DAY TO SECOND
);
```

### 大对象数据类型

```sql
-- BLOB: 二进制大对象
CREATE TABLE test_blob (
    id NUMBER,
    image BLOB,
    file_content BLOB
);

-- BFILE: 外部二进制文件引用
CREATE TABLE test_bfile (
    id NUMBER,
    external_file BFILE
);

-- RAW: 二进制数据
CREATE TABLE test_raw (
    id NUMBER,
    binary_data RAW(2000)
);

-- LONG RAW: 长二进制数据（已弃用，建议使用BLOB）
CREATE TABLE test_long_raw (
    id NUMBER,
    long_binary_data LONG RAW
);
```

## 约束

### 主键约束

```sql
-- 列级主键约束
CREATE TABLE departments (
    department_id NUMBER(4) PRIMARY KEY,
    department_name VARCHAR2(30) NOT NULL
);

-- 表级主键约束
CREATE TABLE employees (
    employee_id NUMBER(6),
    first_name VARCHAR2(20),
    last_name VARCHAR2(25),
    CONSTRAINT emp_pk PRIMARY KEY (employee_id)
);

-- 复合主键约束
CREATE TABLE order_items (
    order_id NUMBER(10),
    product_id NUMBER(6),
    quantity NUMBER(8),
    CONSTRAINT order_items_pk PRIMARY KEY (order_id, product_id)
);
```

### 外键约束

```sql
-- 基本外键约束
CREATE TABLE employees (
    employee_id NUMBER(6) PRIMARY KEY,
    first_name VARCHAR2(20),
    last_name VARCHAR2(25),
    department_id NUMBER(4),
    CONSTRAINT emp_dept_fk FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
);

-- 带级联删除的外键约束
CREATE TABLE order_items (
    order_id NUMBER(10),
    product_id NUMBER(6),
    quantity NUMBER(8),
    CONSTRAINT oi_order_fk FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE CASCADE,
    CONSTRAINT oi_product_fk FOREIGN KEY (product_id)
        REFERENCES products(product_id)
        ON DELETE RESTRICT
);

-- 自引用外键约束
CREATE TABLE employees (
    employee_id NUMBER(6) PRIMARY KEY,
    first_name VARCHAR2(20),
    last_name VARCHAR2(25),
    manager_id NUMBER(6),
    CONSTRAINT emp_manager_fk FOREIGN KEY (manager_id)
        REFERENCES employees(employee_id)
);
```

### 唯一约束

```sql
-- 列级唯一约束
CREATE TABLE users (
    user_id NUMBER PRIMARY KEY,
    username VARCHAR2(30) UNIQUE,
    email VARCHAR2(100)
);

-- 表级唯一约束
CREATE TABLE employees (
    employee_id NUMBER(6) PRIMARY KEY,
    first_name VARCHAR2(20),
    last_name VARCHAR2(25),
    email VARCHAR2(25),
    CONSTRAINT emp_email_uk UNIQUE (email)
);

-- 复合唯一约束
CREATE TABLE employee_skills (
    employee_id NUMBER(6),
    skill_id NUMBER(4),
    certification_date DATE,
    CONSTRAINT emp_skills_uk UNIQUE (employee_id, skill_id)
);
```

### 检查约束

```sql
-- 列级检查约束
CREATE TABLE employees (
    employee_id NUMBER(6) PRIMARY KEY,
    first_name VARCHAR2(20),
    last_name VARCHAR2(25),
    salary NUMBER(8,2) CHECK (salary > 0),
    commission_pct NUMBER(2,2) CHECK (commission_pct BETWEEN 0 AND 1)
);

-- 表级检查约束
CREATE TABLE products (
    product_id NUMBER(6) PRIMARY KEY,
    product_name VARCHAR2(50),
    list_price NUMBER(10,2),
    min_price NUMBER(10,2),
    CONSTRAINT prod_price_ck CHECK (list_price >= min_price),
    CONSTRAINT prod_price_positive_ck CHECK (list_price > 0)
);
```

### 非空约束

```sql
-- 列级非空约束
CREATE TABLE employees (
    employee_id NUMBER(6) PRIMARY KEY,
    first_name VARCHAR2(20) NOT NULL,
    last_name VARCHAR2(25) NOT NULL,
    email VARCHAR2(25)
);

-- 添加非空约束
ALTER TABLE employees MODIFY email VARCHAR2(25) NOT NULL;

-- 删除非空约束
ALTER TABLE employees MODIFY email VARCHAR2(25) NULL;
```

## 高级查询功能

### 分组查询

```sql
-- 基本分组
SELECT department_id, COUNT(*) AS employee_count, AVG(salary) AS avg_salary
FROM employees
GROUP BY department_id;

-- 多列分组
SELECT department_id, job_id, COUNT(*) AS employee_count, AVG(salary) AS avg_salary
FROM employees
GROUP BY department_id, job_id;

-- 使用HAVING过滤分组
SELECT department_id, COUNT(*) AS employee_count, AVG(salary) AS avg_salary
FROM employees
GROUP BY department_id
HAVING COUNT(*) > 5;

-- 复杂分组查询
SELECT 
    d.department_id,
    d.department_name,
    COUNT(e.employee_id) AS employee_count,
    AVG(e.salary) AS avg_salary,
    MAX(e.salary) AS max_salary,
    MIN(e.salary) AS min_salary,
    SUM(e.salary) AS total_salary
FROM departments d
LEFT JOIN employees e ON d.department_id = e.department_id
GROUP BY d.department_id, d.department_name
HAVING COUNT(e.employee_id) > 0
ORDER BY avg_salary DESC;
```

### 窗口函数

```sql
-- ROW_NUMBER()函数
SELECT 
    employee_id,
    first_name,
    last_name,
    salary,
    department_id,
    ROW_NUMBER() OVER (ORDER BY salary DESC) AS overall_rank,
    ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS dept_rank
FROM employees;

-- RANK()和DENSE_RANK()函数
SELECT 
    employee_id,
    first_name,
    last_name,
    salary,
    department_id,
    RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rank,
    DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS dense_rank
FROM employees;

-- 聚合窗口函数
SELECT 
    employee_id,
    first_name,
    salary,
    department_id,
    AVG(salary) OVER (PARTITION BY department_id) AS dept_avg_salary,
    SUM(salary) OVER (PARTITION BY department_id) AS dept_total_salary,
    COUNT(*) OVER (PARTITION BY department_id) AS dept_employee_count
FROM employees;

-- 行范围窗口函数
SELECT 
    order_id,
    order_date,
    amount,
    SUM(amount) OVER (ORDER BY order_date ROWS UNBOUNDED PRECEDING) AS running_total,
    SUM(amount) OVER (ORDER BY order_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS moving_total_3,
    AVG(amount) OVER (ORDER BY order_date ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING) AS moving_avg_5
FROM orders;

-- LAG和LEAD函数
SELECT 
    employee_id,
    first_name,
    salary,
    LAG(salary, 1, 0) OVER (ORDER BY salary) AS prev_salary,
    LEAD(salary, 1, 0) OVER (ORDER BY salary) AS next_salary,
    salary - LAG(salary, 1, salary) OVER (ORDER BY salary) AS salary_diff
FROM employees;
```

### 层次查询

```sql
-- 基本层次查询
SELECT 
    employee_id,
    first_name,
    last_name,
    manager_id,
    LEVEL,
    SYS_CONNECT_BY_PATH(last_name, '/') AS path
FROM employees
START WITH manager_id IS NULL
CONNECT BY PRIOR employee_id = manager_id;

-- 使用CONNECT_BY_ROOT
SELECT 
    employee_id,
    first_name,
    last_name,
    salary,
    manager_id,
    CONNECT_BY_ROOT last_name AS top_manager,
    LEVEL
FROM employees
START WITH manager_id IS NULL
CONNECT BY PRIOR employee_id = manager_id;

-- 使用CONNECT_BY_ISLEAF
SELECT 
    employee_id,
    first_name,
    last_name,
    manager_id,
    LEVEL,
    CASE WHEN CONNECT_BY_ISLEAF = 1 THEN 'Leaf Node' ELSE 'Manager' END AS node_type
FROM employees
START WITH manager_id IS NULL
CONNECT BY PRIOR employee_id = manager_id;

-- 使用NOCYCLE处理循环引用
SELECT 
    employee_id,
    first_name,
    last_name,
    manager_id,
    LEVEL,
    CONNECT_BY_ISCYCLE
FROM employees
START WITH employee_id = 100
CONNECT BY NOCYCLE PRIOR employee_id = manager_id AND employee_id != 100;
```

### 递归子查询

```sql
-- 使用WITH子句进行递归查询
WITH emp_hierarchy (employee_id, first_name, last_name, manager_id, level, path) AS (
    -- 锚点成员
    SELECT 
        employee_id, 
        first_name, 
        last_name, 
        manager_id, 
        1 AS level, 
        last_name AS path
    FROM employees
    WHERE manager_id IS NULL
    
    UNION ALL
    
    -- 递归成员
    SELECT 
        e.employee_id, 
        e.first_name, 
        e.last_name, 
        e.manager_id, 
        h.level + 1, 
        h.path || '/' || e.last_name
    FROM employees e
    JOIN emp_hierarchy h ON e.manager_id = h.employee_id
)
SELECT * FROM emp_hierarchy
ORDER BY path;
```

### PIVOT和UNPIVOT

```sql
-- PIVOT查询
SELECT *
FROM (
    SELECT 
        department_id, 
        job_id, 
        salary
    FROM employees
)
PIVOT (
    AVG(salary) AS avg_salary, 
    COUNT(*) AS employee_count
    FOR job_id IN (
        'IT_PROG' AS it_prog,
        'SA_MAN' AS sa_man,
        'ST_CLERK' AS st_clerk,
        'PU_CLERK' AS pu_clerk
    )
);

-- 多列PIVOT查询
SELECT *
FROM (
    SELECT 
        department_id, 
        job_id, 
        salary,
        hire_date
    FROM employees
)
PIVOT (
    AVG(salary) AS avg_salary,
    COUNT(*) AS employee_count
    FOR job_id IN (
        'IT_PROG' AS it_prog,
        'SA_MAN' AS sa_man
    )
)
PIVOT (
    COUNT(*) AS hire_count
    FOR (EXTRACT(YEAR FROM hire_date)) IN (
        2020 AS y2020,
        2021 AS y2021,
        2022 AS y2022
    )
);

-- UNPIVOT查询
SELECT *
FROM (
    SELECT 
        department_id,
        SUM(CASE WHEN job_id = 'IT_PROG' THEN 1 ELSE 0 END) AS it_prog_count,
        SUM(CASE WHEN job_id = 'SA_MAN' THEN 1 ELSE 0 END) AS sa_man_count,
        SUM(CASE WHEN job_id = 'ST_CLERK' THEN 1 ELSE 0 END) AS st_clerk_count
    FROM employees
    GROUP BY department_id
)
UNPIVOT (
    employee_count FOR job_id IN (
        it_prog_count AS 'IT_PROG',
        sa_man_count AS 'SA_MAN',
        st_clerk_count AS 'ST_CLERK'
    )
);
```

## 事务控制

### 事务管理

```sql
-- 开始事务（隐式，第一个DML语句开始）
INSERT INTO employees (employee_id, first_name, last_name, email, hire_date, job_id)
VALUES (207, 'John', 'Doe', 'john.doe@example.com', SYSDATE, 'IT_PROG');

-- 设置保存点
SAVEPOINT before_update;

-- 更新数据
UPDATE employees SET salary = salary * 1.1 WHERE department_id = 60;

-- 回滚到保存点
ROLLBACK TO SAVEPOINT before_update;

-- 提交事务
COMMIT;

-- 回滚整个事务
ROLLBACK;
```

### 隔离级别

```sql
-- 设置事务隔离级别
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SET TRANSACTION ISOLATION LEVEL READ ONLY;

-- 设置只读事务
SET TRANSACTION READ ONLY;

-- 设置读写事务
SET TRANSACTION READ WRITE;

-- 设置事务名称
SET TRANSACTION NAME 'update_salaries';
```

### 锁定机制

```sql
-- SELECT FOR UPDATE锁定行
SELECT * FROM employees WHERE department_id = 60 FOR UPDATE;

-- SELECT FOR UPDATE NOWAIT不等待锁
SELECT * FROM employees WHERE department_id = 60 FOR UPDATE NOWAIT;

-- SELECT FOR UPDATE SKIP LOCKED跳过已锁定的行
SELECT * FROM employees WHERE department_id = 60 FOR UPDATE SKIP LOCKED;

-- 锁定表
LOCK TABLE employees IN EXCLUSIVE MODE;
LOCK TABLE employees IN SHARE MODE;
LOCK TABLE employees IN ROW SHARE MODE;

-- 释放锁
COMMIT;
ROLLBACK;
```

## PL/SQL基础

### 基本PL/SQL块

```sql
-- 匿名块
DECLARE
    v_employee_id employees.employee_id%TYPE := 100;
    v_salary employees.salary%TYPE;
    v_increase NUMBER := 500;
BEGIN
    SELECT salary INTO v_salary
    FROM employees
    WHERE employee_id = v_employee_id;
    
    UPDATE employees
    SET salary = salary + v_increase
    WHERE employee_id = v_employee_id;
    
    DBMS_OUTPUT.PUT_LINE('Salary updated from ' || v_salary || 
                         ' to ' || (v_salary + v_increase));
    
    COMMIT;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        DBMS_OUTPUT.PUT_LINE('Employee not found: ' || v_employee_id);
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('Error: ' || SQLERRM);
        ROLLBACK;
END;
/
```

### 条件语句

```sql
-- IF-THEN-ELSE
DECLARE
    v_salary employees.salary%TYPE;
    v_employee_id employees.employee_id%TYPE := 100;
BEGIN
    SELECT salary INTO v_salary
    FROM employees
    WHERE employee_id = v_employee_id;
    
    IF v_salary < 3000 THEN
        DBMS_OUTPUT.PUT_LINE('Low salary: ' || v_salary);
    ELSIF v_salary BETWEEN 3000 AND 7000 THEN
        DBMS_OUTPUT.PUT_LINE('Medium salary: ' || v_salary);
    ELSE
        DBMS_OUTPUT.PUT_LINE('High salary: ' || v_salary);
    END IF;
END;
/

-- CASE语句
DECLARE
    v_job_id employees.job_id%TYPE;
    v_employee_id employees.employee_id%TYPE := 100;
BEGIN
    SELECT job_id INTO v_job_id
    FROM employees
    WHERE employee_id = v_employee_id;
    
    CASE v_job_id
        WHEN 'IT_PROG' THEN
            DBMS_OUTPUT.PUT_LINE('IT Programmer');
        WHEN 'SA_MAN' THEN
            DBMS_OUTPUT.PUT_LINE('Sales Manager');
        WHEN 'ST_CLERK' THEN
            DBMS_OUTPUT.PUT_LINE('Stock Clerk');
        ELSE
            DBMS_OUTPUT.PUT_LINE('Other Position');
    END CASE;
END;
/
```

### 循环语句

```sql
-- 基本LOOP
DECLARE
    v_counter NUMBER := 1;
BEGIN
    LOOP
        DBMS_OUTPUT.PUT_LINE('Counter: ' || v_counter);
        v_counter := v_counter + 1;
        EXIT WHEN v_counter > 5;
    END LOOP;
END;
/

-- WHILE循环
DECLARE
    v_counter NUMBER := 1;
BEGIN
    WHILE v_counter <= 5 LOOP
        DBMS_OUTPUT.PUT_LINE('Counter: ' || v_counter);
        v_counter := v_counter + 1;
    END LOOP;
END;
/

-- FOR循环
BEGIN
    FOR i IN 1..5 LOOP
        DBMS_OUTPUT.PUT_LINE('Counter: ' || i);
    END LOOP;
    
    FOR emp_rec IN (SELECT employee_id, first_name, salary FROM employees WHERE department_id = 60) LOOP
        DBMS_OUTPUT.PUT_LINE(emp_rec.first_name || ': ' || emp_rec.salary);
    END LOOP;
END;
/
```

### 游标

```sql
-- 显式游标
DECLARE
    CURSOR emp_cursor IS
        SELECT employee_id, first_name, salary
        FROM employees
        WHERE department_id = 60;
    
    v_emp_id employees.employee_id%TYPE;
    v_first_name employees.first_name%TYPE;
    v_salary employees.salary%TYPE;
BEGIN
    OPEN emp_cursor;
    
    LOOP
        FETCH emp_cursor INTO v_emp_id, v_first_name, v_salary;
        EXIT WHEN emp_cursor%NOTFOUND;
        
        DBMS_OUTPUT.PUT_LINE(v_first_name || ': ' || v_salary);
    END LOOP;
    
    CLOSE emp_cursor;
END;
/

-- 游标FOR循环
BEGIN
    FOR emp_rec IN (SELECT employee_id, first_name, salary FROM employees WHERE department_id = 60) LOOP
        DBMS_OUTPUT.PUT_LINE(emp_rec.first_name || ': ' || emp_rec.salary);
    END LOOP;
END;
/

-- 带参数的游标
DECLARE
    CURSOR emp_cursor(p_dept_id IN NUMBER) IS
        SELECT employee_id, first_name, salary
        FROM employees
        WHERE department_id = p_dept_id;
BEGIN
    FOR emp_rec IN emp_cursor(60) LOOP
        DBMS_OUTPUT.PUT_LINE(emp_rec.first_name || ': ' || emp_rec.salary);
    END LOOP;
END;
/
```

## 存储过程和函数

### 存储过程

```sql
-- 基本存储过程
CREATE OR REPLACE PROCEDURE increase_salary (
    p_employee_id IN employees.employee_id%TYPE,
    p_increase IN NUMBER
) AS
    v_current_salary employees.salary%TYPE;
BEGIN
    SELECT salary INTO v_current_salary
    FROM employees
    WHERE employee_id = p_employee_id;
    
    UPDATE employees
    SET salary = salary + p_increase
    WHERE employee_id = p_employee_id;
    
    DBMS_OUTPUT.PUT_LINE('Salary updated from ' || v_current_salary || 
                         ' to ' || (v_current_salary + p_increase));
    
    COMMIT;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        DBMS_OUTPUT.PUT_LINE('Employee not found: ' || p_employee_id);
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('Error: ' || SQLERRM);
        ROLLBACK;
END increase_salary;
/

-- 调用存储过程
BEGIN
    increase_salary(100, 500);
END;
/

-- 带OUT参数的存储过程
CREATE OR REPLACE PROCEDURE get_employee_info (
    p_employee_id IN employees.employee_id%TYPE,
    p_first_name OUT employees.first_name%TYPE,
    p_salary OUT employees.salary%TYPE
) AS
BEGIN
    SELECT first_name, salary
    INTO p_first_name, p_salary
    FROM employees
    WHERE employee_id = p_employee_id;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        DBMS_OUTPUT.PUT_LINE('Employee not found: ' || p_employee_id);
END get_employee_info;
/

-- 调用带OUT参数的存储过程
DECLARE
    v_first_name employees.first_name%TYPE;
    v_salary employees.salary%TYPE;
BEGIN
    get_employee_info(100, v_first_name, v_salary);
    DBMS_OUTPUT.PUT_LINE('Name: ' || v_first_name || ', Salary: ' || v_salary);
END;
/
```

### 函数

```sql
-- 基本函数
CREATE OR REPLACE FUNCTION get_employee_salary (
    p_employee_id IN employees.employee_id%TYPE
) RETURN employees.salary%TYPE AS
    v_salary employees.salary%TYPE;
BEGIN
    SELECT salary INTO v_salary
    FROM employees
    WHERE employee_id = p_employee_id;
    
    RETURN v_salary;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN NULL;
END get_employee_salary;
/

-- 调用函数
SELECT employee_id, first_name, get_employee_salary(employee_id) AS salary
FROM employees
WHERE department_id = 60;

-- 确定性函数
CREATE OR REPLACE FUNCTION calculate_bonus (
    p_salary IN employees.salary%TYPE
) RETURN NUMBER DETERMINISTIC AS
BEGIN
    RETURN p_salary * 0.1;
END calculate_bonus;
/

-- 管道函数
CREATE OR REPLACE FUNCTION get_department_employees (
    p_department_id IN departments.department_id%TYPE
) RETURN SYS_REFCURSOR AS
    v_cursor SYS_REFCURSOR;
BEGIN
    OPEN v_cursor FOR
        SELECT employee_id, first_name, last_name, salary
        FROM employees
        WHERE department_id = p_department_id;
    
    RETURN v_cursor;
END get_department_employees;
/
```

## 触发器

### DML触发器

```sql
-- 行级触发器
CREATE OR REPLACE TRIGGER trg_emp_audit
AFTER INSERT OR UPDATE OR DELETE ON employees
FOR EACH ROW
DECLARE
    v_action VARCHAR2(10);
BEGIN
    IF INSERTING THEN
        v_action := 'INSERT';
        INSERT INTO employee_audit (
            employee_id, action, action_date, old_salary, new_salary
        ) VALUES (
            :NEW.employee_id, v_action, SYSDATE, NULL, :NEW.salary
        );
    ELSIF UPDATING THEN
        v_action := 'UPDATE';
        INSERT INTO employee_audit (
            employee_id, action, action_date, old_salary, new_salary
        ) VALUES (
            :NEW.employee_id, v_action, SYSDATE, :OLD.salary, :NEW.salary
        );
    ELSIF DELETING THEN
        v_action := 'DELETE';
        INSERT INTO employee_audit (
            employee_id, action, action_date, old_salary, new_salary
        ) VALUES (
            :OLD.employee_id, v_action, SYSDATE, :OLD.salary, NULL
        );
    END IF;
END trg_emp_audit;
/

-- 语句级触发器
CREATE OR REPLACE TRIGGER trg_emp_dept_check
BEFORE INSERT OR UPDATE ON employees
DECLARE
    v_dept_count NUMBER;
BEGIN
    -- 检查部门是否存在
    IF INSERTING OR UPDATING THEN
        SELECT COUNT(*) INTO v_dept_count
        FROM departments
        WHERE department_id = :NEW.department_id;
        
        IF v_dept_count = 0 THEN
            RAISE_APPLICATION_ERROR(-20001, 'Department does not exist');
        END IF;
    END IF;
END trg_emp_dept_check;
/

-- INSTEAD OF触发器（用于视图）
CREATE OR REPLACE VIEW emp_dept_view AS
SELECT 
    e.employee_id,
    e.first_name,
    e.last_name,
    e.email,
    d.department_name,
    e.salary
FROM employees e
JOIN departments d ON e.department_id = d.department_id;

CREATE OR REPLACE TRIGGER trg_emp_dept_view_io
INSTEAD OF INSERT ON emp_dept_view
DECLARE
    v_dept_id departments.department_id%TYPE;
BEGIN
    -- 查找部门ID
    SELECT department_id INTO v_dept_id
    FROM departments
    WHERE department_name = :NEW.department_name;
    
    -- 插入员工记录
    INSERT INTO employees (
        employee_id, first_name, last_name, email, department_id, salary
    ) VALUES (
        emp_seq.NEXTVAL, :NEW.first_name, :NEW.last_name, :NEW.email, v_dept_id, :NEW.salary
    );
END trg_emp_dept_view_io;
/
```

### 系统触发器

```sql
-- 数据库级触发器
CREATE OR REPLACE TRIGGER trg_logon_audit
AFTER LOGON ON DATABASE
DECLARE
    v_user VARCHAR2(30) := USER;
BEGIN
    INSERT INTO logon_audit (
        username, logon_time, session_id
    ) VALUES (
        v_user, SYSDATE, USERENV('SESSIONID')
    );
END trg_logon_audit;
/

-- DDL触发器
CREATE OR REPLACE TRIGGER trg_ddl_audit
AFTER DDL ON DATABASE
DECLARE
    v_user VARCHAR2(30) := USER;
BEGIN
    INSERT INTO ddl_audit (
        username, ddl_time, ddl_type, object_name, sql_text
    ) VALUES (
        v_user, SYSDATE, ORA_SYSEVENT, ORA_DICT_OBJ_NAME, ORA_SQL_TXT
    );
END trg_ddl_audit;
/
```

## 包

### 包规范

```sql
CREATE OR REPLACE PACKAGE emp_pkg AS
    -- 常量
    c_max_increase CONSTANT NUMBER := 1000;
    
    -- 类型定义
    TYPE emp_rec_type IS RECORD (
        employee_id employees.employee_id%TYPE,
        first_name employees.first_name%TYPE,
        last_name employees.last_name%TYPE,
        salary employees.salary%TYPE
    );
    
    TYPE emp_table_type IS TABLE OF emp_rec_type INDEX BY PLS_INTEGER;
    
    -- 过程声明
    PROCEDURE increase_salary (
        p_employee_id IN employees.employee_id%TYPE,
        p_increase IN NUMBER
    );
    
    PROCEDURE increase_dept_salary (
        p_department_id IN departments.department_id%TYPE,
        p_percentage IN NUMBER
    );
    
    -- 函数声明
    FUNCTION get_employee_salary (
        p_employee_id IN employees.employee_id%TYPE
    ) RETURN employees.salary%TYPE;
    
    FUNCTION get_dept_avg_salary (
        p_department_id IN departments.department_id%TYPE
    ) RETURN employees.salary%TYPE;
    
    -- 游标声明
    CURSOR emp_cursor (p_dept_id IN NUMBER) RETURN employees%ROWTYPE;
    
END emp_pkg;
/
```

### 包体

```sql
CREATE OR REPLACE PACKAGE BODY emp_pkg AS
    -- 私有变量
    v_audit_count NUMBER := 0;
    
    -- 私有过程
    PROCEDURE log_audit (
        p_employee_id IN employees.employee_id%TYPE,
        p_action IN VARCHAR2,
        p_old_salary IN employees.salary%TYPE DEFAULT NULL,
        p_new_salary IN employees.salary%TYPE DEFAULT NULL
    ) IS
    BEGIN
        INSERT INTO emp_salary_audit (
            employee_id, action, action_date, old_salary, new_salary
        ) VALUES (
            p_employee_id, p_action, SYSDATE, p_old_salary, p_new_salary
        );
        
        v_audit_count := v_audit_count + 1;
    END log_audit;
    
    -- 公共过程实现
    PROCEDURE increase_salary (
        p_employee_id IN employees.employee_id%TYPE,
        p_increase IN NUMBER
    ) IS
        v_old_salary employees.salary%TYPE;
        v_new_salary employees.salary%TYPE;
    BEGIN
        IF p_increase > c_max_increase THEN
            RAISE_APPLICATION_ERROR(-20001, 'Increase exceeds maximum allowed');
        END IF;
        
        SELECT salary INTO v_old_salary
        FROM employees
        WHERE employee_id = p_employee_id;
        
        UPDATE employees
        SET salary = salary + p_increase
        WHERE employee_id = p_employee_id;
        
        v_new_salary := v_old_salary + p_increase;
        
        log_audit(p_employee_id, 'INCREASE', v_old_salary, v_new_salary);
        
        COMMIT;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RAISE_APPLICATION_ERROR(-20002, 'Employee not found: ' || p_employee_id);
    END increase_salary;
    
    PROCEDURE increase_dept_salary (
        p_department_id IN departments.department_id%TYPE,
        p_percentage IN NUMBER
    ) IS
        CURSOR emp_cur IS
            SELECT employee_id, salary
            FROM employees
            WHERE department_id = p_department_id;
        
        v_increase NUMBER;
    BEGIN
        FOR emp_rec IN emp_cur LOOP
            v_increase := emp_rec.salary * p_percentage / 100;
            increase_salary(emp_rec.employee_id, v_increase);
        END LOOP;
    END increase_dept_salary;
    
    -- 公共函数实现
    FUNCTION get_employee_salary (
        p_employee_id IN employees.employee_id%TYPE
    ) RETURN employees.salary%TYPE IS
        v_salary employees.salary%TYPE;
    BEGIN
        SELECT salary INTO v_salary
        FROM employees
        WHERE employee_id = p_employee_id;
        
        RETURN v_salary;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN NULL;
    END get_employee_salary;
    
    FUNCTION get_dept_avg_salary (
        p_department_id IN departments.department_id%TYPE
    ) RETURN employees.salary%TYPE IS
        v_avg_salary employees.salary%TYPE;
    BEGIN
        SELECT AVG(salary) INTO v_avg_salary
        FROM employees
        WHERE department_id = p_department_id;
        
        RETURN v_avg_salary;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN NULL;
    END get_dept_avg_salary;
    
    -- 游标实现
    CURSOR emp_cursor (p_dept_id IN NUMBER) RETURN employees%ROWTYPE IS
        SELECT *
        FROM employees
        WHERE department_id = p_dept_id;
    
END emp_pkg;
/
```

## 集合类型

### 嵌套表

```sql
-- 创建嵌套表类型
CREATE OR REPLACE TYPE phone_list_type IS TABLE OF VARCHAR2(25);
/

-- 使用嵌套表类型
CREATE TABLE employees (
    employee_id NUMBER(6) PRIMARY KEY,
    first_name VARCHAR2(20),
    last_name VARCHAR2(25),
    phones phone_list_type
) NESTED TABLE phones STORE AS employee_phones;

-- 插入嵌套表数据
INSERT INTO employees (
    employee_id, first_name, last_name, phones
) VALUES (
    100, 'John', 'Doe', 
    phone_list_type('123-456-7890', '098-765-4321')
);

-- 查询嵌套表数据
SELECT employee_id, first_name, last_name, phones
FROM employees;

-- 展开嵌套表
SELECT employee_id, first_name, last_name, column_value AS phone
FROM employees e, TABLE(e.phones);
```

### 可变数组

```sql
-- 创建可变数组类型
CREATE OR REPLACE TYPE skill_list_type IS VARRAY(10) OF VARCHAR2(30);
/

-- 使用可变数组类型
CREATE TABLE employees (
    employee_id NUMBER(6) PRIMARY KEY,
    first_name VARCHAR2(20),
    last_name VARCHAR2(25),
    skills skill_list_type
);

-- 插入可变数组数据
INSERT INTO employees (
    employee_id, first_name, last_name, skills
) VALUES (
    100, 'John', 'Doe', 
    skill_list_type('Java', 'SQL', 'Python')
);

-- 查询可变数组数据
SELECT employee_id, first_name, last_name, skills
FROM employees;

-- 展开可变数组
SELECT employee_id, first_name, last_name, column_value AS skill
FROM employees e, TABLE(e.skills);
```

### 关联数组

```sql
-- PL/SQL中的关联数组
DECLARE
    TYPE emp_salary_table IS TABLE OF employees.salary%TYPE 
        INDEX BY employees.employee_id%TYPE;
    
    v_emp_salaries emp_salary_table;
BEGIN
    -- 填充关联数组
    FOR emp_rec IN (SELECT employee_id, salary FROM employees WHERE department_id = 60) LOOP
        v_emp_salaries(emp_rec.employee_id) := emp_rec.salary;
    END LOOP;
    
    -- 访问关联数组
    FOR emp_id IN v_emp_salaries.FIRST .. v_emp_salaries.LAST LOOP
        IF v_emp_salaries.EXISTS(emp_id) THEN
            DBMS_OUTPUT.PUT_LINE('Employee ' || emp_id || ': ' || v_emp_salaries(emp_id));
        END IF;
    END LOOP;
END;
/
```

## 对象关系特性

### 对象类型

```sql
-- 创建对象类型
CREATE OR REPLACE TYPE address_type AS OBJECT (
    street VARCHAR2(50),
    city VARCHAR2(30),
    state VARCHAR2(20),
    zip_code VARCHAR2(10),
    
    -- 构造函数
    CONSTRUCTOR FUNCTION address_type (
        p_street VARCHAR2,
        p_city VARCHAR2,
        p_state VARCHAR2,
        p_zip_code VARCHAR2
    ) RETURN SELF AS RESULT,
    
    -- 成员方法
    MEMBER FUNCTION get_full_address RETURN VARCHAR2,
    MEMBER PROCEDURE set_address (
        p_street VARCHAR2,
        p_city VARCHAR2,
        p_state VARCHAR2,
        p_zip_code VARCHAR2
    )
);
/

-- 对象类型体
CREATE OR REPLACE TYPE BODY address_type AS
    -- 构造函数实现
    CONSTRUCTOR FUNCTION address_type (
        p_street VARCHAR2,
        p_city VARCHAR2,
        p_state VARCHAR2,
        p_zip_code VARCHAR2
    ) RETURN SELF AS RESULT IS
    BEGIN
        self.street := p_street;
        self.city := p_city;
        self.state := p_state;
        self.zip_code := p_zip_code;
        RETURN;
    END;
    
    -- 成员方法实现
    MEMBER FUNCTION get_full_address RETURN VARCHAR2 IS
    BEGIN
        RETURN self.street || ', ' || self.city || ', ' || self.state || ' ' || self.zip_code;
    END;
    
    MEMBER PROCEDURE set_address (
        p_street VARCHAR2,
        p_city VARCHAR2,
        p_state VARCHAR2,
        p_zip_code VARCHAR2
    ) IS
    BEGIN
        self.street := p_street;
        self.city := p_city;
        self.state := p_state;
        self.zip_code := p_zip_code;
    END;
END;
/

-- 使用对象类型
CREATE TABLE employees (
    employee_id NUMBER(6) PRIMARY KEY,
    first_name VARCHAR2(20),
    last_name VARCHAR2(25),
    address address_type
);

-- 插入对象数据
INSERT INTO employees (
    employee_id, first_name, last_name, address
) VALUES (
    100, 'John', 'Doe', 
    address_type('123 Main St', 'New York', 'NY', '10001')
);

-- 查询对象数据
SELECT employee_id, first_name, last_name, address
FROM employees;

-- 访问对象属性
SELECT employee_id, first_name, last_name, 
       e.address.street, e.address.city, e.address.state
FROM employees e;

-- 调用对象方法
SELECT employee_id, first_name, last_name, 
       e.address.get_full_address() AS full_address
FROM employees e;
```

### 对象表

```sql
-- 创建对象表
CREATE TABLE employee_obj OF employee_type (
    PRIMARY KEY (employee_id)
);

-- 插入对象表数据
INSERT INTO employee_obj VALUES (
    employee_type(100, 'John', 'Doe', 'john.doe@example.com', 6000)
);

-- 查询对象表数据
SELECT VALUE(e) AS employee_obj
FROM employee_obj e;

-- 使用VALUE函数
SELECT VALUE(e).first_name, VALUE(e).last_name, VALUE(e).salary
FROM employee_obj e;

-- 使用REF函数获取对象引用
SELECT REF(e) AS employee_ref
FROM employee_obj e
WHERE e.employee_id = 100;
```

## 性能优化

### 查询优化

```sql
-- 使用提示优化查询
SELECT /*+ INDEX(e emp_name_idx) */ *
FROM employees e
WHERE e.last_name = 'Smith';

-- 使用并行查询
SELECT /*+ PARALLEL(employees 4) */ *
FROM employees
WHERE department_id = 60;

-- 使用哈希连接提示
SELECT /*+ USE_HASH(e d) */ *
FROM employees e
JOIN departments d ON e.department_id = d.department_id;

-- 使用合并连接提示
SELECT /*+ USE_MERGE(e d) */ *
FROM employees e
JOIN departments d ON e.department_id = d.department_id;
```

### 索引优化

```sql
-- 创建函数索引
CREATE INDEX idx_emp_upper_name ON employees(UPPER(last_name));

-- 创建位图连接索引
CREATE BITMAP INDEX idx_emp_dept_job ON employees(department_id, job_id);

-- 创建域索引（全文索引）
CREATE INDEX idx_emp_resume_text ON employees(resume) 
INDEXTYPE IS ctxsys.context;

-- 重建索引
ALTER INDEX idx_emp_lastname REBUILD;

-- 合并索引
ALTER INDEX idx_emp_lastname COALESCE;

-- 监控索引使用情况
ALTER INDEX idx_emp_lastname MONITORING USAGE;
ALTER INDEX idx_emp_lastname NOMONITORING USAGE;

-- 查看索引使用情况
SELECT * FROM v$object_usage WHERE index_name = 'IDX_EMP_LASTNAME';
```

### 分区表

```sql
-- 创建范围分区表
CREATE TABLE orders (
    order_id NUMBER(10),
    customer_id NUMBER(6),
    order_date DATE,
    amount NUMBER(10,2)
) PARTITION BY RANGE (order_date) (
    PARTITION orders_2022 VALUES LESS THAN (TO_DATE('2023-01-01', 'YYYY-MM-DD')),
    PARTITION orders_2023 VALUES LESS THAN (TO_DATE('2024-01-01', 'YYYY-MM-DD')),
    PARTITION orders_2024 VALUES LESS THAN (TO_DATE('2025-01-01', 'YYYY-MM-DD')),
    PARTITION orders_future VALUES LESS THAN (MAXVALUE)
);

-- 创建列表分区表
CREATE TABLE products (
    product_id NUMBER(6),
    product_name VARCHAR2(50),
    category VARCHAR2(30)
) PARTITION BY LIST (category) (
    PARTITION electronics VALUES ('Electronics'),
    PARTITION clothing VALUES ('Clothing'),
    PARTITION books VALUES ('Books'),
    PARTITION other VALUES (DEFAULT)
);

-- 创建哈希分区表
CREATE TABLE customers (
    customer_id NUMBER(6),
    customer_name VARCHAR2(50),
    email VARCHAR2(50)
) PARTITION BY HASH (customer_id) PARTITIONS 4;

-- 创建复合分区表
CREATE TABLE sales (
    sale_id NUMBER(10),
    product_id NUMBER(6),
    customer_id NUMBER(6),
    sale_date DATE,
    amount NUMBER(10,2)
) PARTITION BY RANGE (sale_date)
SUBPARTITION BY HASH (product_id) SUBPARTITIONS 4 (
    PARTITION sales_2023 VALUES LESS THAN (TO_DATE('2024-01-01', 'YYYY-MM-DD')),
    PARTITION sales_2024 VALUES LESS THAN (TO_DATE('2025-01-01', 'YYYY-MM-DD')),
    PARTITION sales_future VALUES LESS THAN (MAXVALUE)
);

-- 分区维护
-- 添加分区
ALTER TABLE orders ADD PARTITION orders_2025 VALUES LESS THAN (TO_DATE('2026-01-01', 'YYYY-MM-DD'));

-- 删除分区
ALTER TABLE orders DROP PARTITION orders_2022;

-- 合并分区
ALTER TABLE orders MERGE PARTITIONS orders_2023, orders_2024 INTO PARTITION orders_2023_2024;

-- 分割分区
ALTER TABLE orders SPLIT PARTITION orders_future INTO (
    PARTITION orders_2025 VALUES LESS THAN (TO_DATE('2026-01-01', 'YYYY-MM-DD')),
    PARTITION orders_future VALUES LESS THAN (MAXVALUE)
);

-- 截断分区
ALTER TABLE orders TRUNCATE PARTITION orders_2022;
```

## 总结

本语法规范涵盖了Oracle SQL的主要特性，包括：

1. 基本语法结构和数据类型
2. DDL和DML语句
3. 高级查询功能（窗口函数、层次查询等）
4. 事务控制和锁定机制
5. PL/SQL编程基础
6. 存储过程、函数、触发器和包
7. 集合类型和对象关系特性
8. 性能优化技术

这些规范可以帮助开发人员编写高效、可维护的Oracle SQL代码，并充分利用Oracle数据库的强大功能。