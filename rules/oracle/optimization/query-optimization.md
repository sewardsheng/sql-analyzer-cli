# Oracle SQL 查询优化与执行计划分析

## 查询优化基础

### 优化原则

1. **访问最少的数据**：减少需要访问的数据量
2. **减少逻辑I/O**：减少从内存中读取数据块的次数
3. **减少物理I/O**：减少从磁盘读取数据块的次数
4. **合理使用索引**：在适当的列上创建适当的索引
5. **避免全表扫描**：尽可能使用索引访问
6. **优化连接操作**：选择高效的连接方法和连接顺序
7. **使用适当的提示**：在必要时指导优化器选择更好的执行计划

### 统计信息

```sql
-- 收集表统计信息
BEGIN
    DBMS_STATS.GATHER_TABLE_STATS(
        ownname => 'SCOTT',
        tabname => 'EMP',
        cascade => TRUE,
        estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE,
        method_opt => 'FOR ALL COLUMNS SIZE AUTO'
    );
END;
/

-- 收集索引统计信息
BEGIN
    DBMS_STATS.GATHER_INDEX_STATS(
        ownname => 'SCOTT',
        indname => 'EMP_EMPNO_IDX',
        estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE
    );
END;
/

-- 收集整个模式的统计信息
BEGIN
    DBMS_STATS.GATHER_SCHEMA_STATS(
        ownname => 'SCOTT',
        cascade => TRUE,
        estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE,
        method_opt => 'FOR ALL COLUMNS SIZE AUTO'
    );
END;
/

-- 收集数据库统计信息
BEGIN
    DBMS_STATS.GATHER_DATABASE_STATS(
        cascade => TRUE,
        estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE,
        method_opt => 'FOR ALL COLUMNS SIZE AUTO'
    );
END;
/
```

### 查看统计信息

```sql
-- 查看表统计信息
SELECT 
    table_name,
    num_rows,
    blocks,
    empty_blocks,
    avg_space,
    chain_cnt,
    avg_row_len
FROM user_tables
WHERE table_name = 'EMPLOYEES';

-- 查看列统计信息
SELECT 
    column_name,
    num_distinct,
    num_nulls,
    density,
    histogram
FROM user_tab_col_statistics
WHERE table_name = 'EMPLOYEES'
ORDER BY column_name;

-- 查看索引统计信息
SELECT 
    index_name,
    blevel,
    leaf_blocks,
    distinct_keys,
    clustering_factor
FROM user_indexes
WHERE table_name = 'EMPLOYEES';
```

## EXPLAIN PLAN 命令

### 基本用法

```sql
-- 创建执行计划表（如果不存在）
@?/rdbms/admin/utlxplan.sql

-- 创建执行计划
EXPLAIN PLAN FOR
SELECT e.employee_id, e.first_name, e.last_name, d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id
WHERE e.salary > 5000;

-- 查看执行计划
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);

-- 使用格式化选项查看执行计划
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY(
    format => 'ALL +OUTLINE'
));
```

### 执行计划选项

```sql
-- 基本格式
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);

-- 详细格式
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY(
    format => 'ALL'
));

-- 高级格式
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY(
    format => 'ALL +OUTLINE'
));

-- 仅显示基本执行计划
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY(
    format => 'BASIC'
));

-- 显示预估的执行计划
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR(
    sql_id => 'your_sql_id',
    format => 'ALL +OUTLINE'
));

-- 显示实际的执行计划
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR(
    sql_id => 'your_sql_id',
    cursor_child_no => 0,
    format => 'ALLSTATS LAST'
));

-- 显示AWR中的执行计划
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_AWR(
    sql_id => 'your_sql_id',
    format => 'ALL +OUTLINE'
));
```

### 执行计划解读

```sql
-- 示例查询
EXPLAIN PLAN FOR
SELECT e.employee_id, e.first_name, e.last_name, d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id
WHERE e.salary > 5000
ORDER BY e.salary DESC;

-- 查看执行计划
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);
```

执行计划输出解读：

```
Plan hash value: 3625960205

-------------------------------------------------------------------------------
| Id  | Operation                    | Name        | Rows  | Bytes | Cost |
-------------------------------------------------------------------------------
|   0 | SELECT STATEMENT             |             |    50 |  2650 |    6 |
|   1 |  SORT ORDER BY              |             |    50 |  2650 |    6 |
|   2 |   NESTED LOOPS              |             |    50 |  2650 |    5 |
|   3 |    NESTED LOOPS             |             |    50 |  2650 |    5 |
|   4 |     TABLE ACCESS BY INDEX ROWID| EMPLOYEES|    50 |  1750 |    2 |
|*  5 |      INDEX RANGE SCAN       | EMP_SALARY  |    50 |       |    1 |
|   6 |     INDEX UNIQUE SCAN       | DEPT_PK     |     1 |       |    0 |
|   7 |    TABLE ACCESS BY INDEX ROWID| DEPARTMENTS|     1 |    18 |    1 |
-------------------------------------------------------------------------------

Predicate Information (identified by operation id):
---------------------------------------------------
   5 - access("E"."SALARY">5000)

Column Projection Information (identified by operation id):
-----------------------------------------------------------
   1 - (#keys=1) "E"."SALARY"[NUMBER,22], "E"."EMPLOYEE_ID"[NUMBER,22],
       "E"."FIRST_NAME"[VARCHAR2,20], "E"."LAST_NAME"[VARCHAR2,25],
       "D"."DEPARTMENT_NAME"[VARCHAR2,30]
   2 - (#keys=0) "E"."EMPLOYEE_ID"[NUMBER,22], "E"."FIRST_NAME"[VARCHAR2,20],
       "E"."LAST_NAME"[VARCHAR2,25], "D"."DEPARTMENT_NAME"[VARCHAR2,30],
       "E"."SALARY"[NUMBER,22]
   3 - "E"."EMPLOYEE_ID"[NUMBER,22], "E"."FIRST_NAME"[VARCHAR2,20],
       "E"."LAST_NAME"[VARCHAR2,25], "E"."SALARY"[NUMBER,22],
       "D"."DEPARTMENT_NAME"[VARCHAR2,30]
   4 - "E"."EMPLOYEE_ID"[NUMBER,22], "E"."FIRST_NAME"[VARCHAR2,20],
       "E"."LAST_NAME"[VARCHAR2,25], "E"."SALARY"[NUMBER,22],
       "E"."DEPARTMENT_ID"[NUMBER,22]
   5 - "E"."ROWID"[ROWID,10], "E"."SALARY"[NUMBER,22],
       "E"."DEPARTMENT_ID"[NUMBER,22]
   6 - "D"."ROWID"[ROWID,10]
   7 - "D"."DEPARTMENT_NAME"[VARCHAR2,30]
```

### 执行计划操作类型

1. **表访问操作**：
   - `TABLE ACCESS FULL`：全表扫描
   - `TABLE ACCESS BY INDEX ROWID`：通过ROWID访问表
   - `TABLE ACCESS BY INDEX RANGE SCAN`：通过索引范围扫描访问表
   - `TABLE ACCESS BY INDEX UNIQUE SCAN`：通过索引唯一扫描访问表

2. **索引访问操作**：
   - `INDEX RANGE SCAN`：索引范围扫描
   - `INDEX UNIQUE SCAN`：索引唯一扫描
   - `INDEX FULL SCAN`：索引全扫描
   - `INDEX FAST FULL SCAN`：索引快速全扫描
   - `INDEX SKIP SCAN`：索引跳跃扫描

3. **连接操作**：
   - `NESTED LOOPS`：嵌套循环连接
   - `HASH JOIN`：哈希连接
   - `MERGE JOIN`：合并连接
   - `SORT MERGE JOIN`：排序合并连接

4. **排序操作**：
   - `SORT ORDER BY`：排序
   - `SORT GROUP BY`：分组排序
   - `SORT UNIQUE`：去重排序
   - `SORT AGGREGATE`：聚合排序

5. **其他操作**：
   - `VIEW`：视图操作
   - `FILTER`：过滤操作
   - `COUNT`：计数操作
   - `HASH GROUP BY`：哈希分组
   - `BUFFER SORT`：缓冲排序

## 索引优化

### 索引类型选择

```sql
-- B树索引（默认）
CREATE INDEX idx_emp_lastname ON employees(last_name);

-- 位图索引（适用于低基数列）
CREATE BITMAP INDEX idx_emp_gender ON employees(gender);

-- 函数索引
CREATE INDEX idx_emp_upper_name ON employees(UPPER(last_name));

-- 复合索引
CREATE INDEX idx_emp_dept_salary ON employees(department_id, salary);

-- 唯一索引
CREATE UNIQUE INDEX idx_emp_email ON employees(email);

-- 反向键索引（适用于序列生成的ID）
CREATE INDEX idx_emp_id_reverse ON employees(employee_id) REVERSE;

-- 分区索引（本地索引）
CREATE INDEX idx_emp_dept_local ON employees(department_id) LOCAL;

-- 分区索引（全局索引）
CREATE INDEX idx_emp_salary_global ON employees(salary) GLOBAL;
```

### 索引使用原则

1. **选择性高的列**：优先在选择性高的列上创建索引
2. **经常用于WHERE条件的列**：在经常用于查询条件的列上创建索引
3. **经常用于连接的列**：在经常用于表连接的列上创建索引
4. **经常用于ORDER BY的列**：在经常用于排序的列上创建索引
5. **避免过度索引**：过多的索引会影响DML操作性能
6. **复合索引的列顺序**：将最常用的列放在复合索引的前面

### 索引维护

```sql
-- 重建索引
ALTER INDEX idx_emp_lastname REBUILD;

-- 重建索引并设置表空间
ALTER INDEX idx_emp_lastname REBUILD TABLESPACE users;

-- 合并索引
ALTER INDEX idx_emp_lastname COALESCE;

-- 监控索引使用情况
ALTER INDEX idx_emp_lastname MONITORING USAGE;

-- 停止监控索引使用情况
ALTER INDEX idx_emp_lastname NOMONITORING USAGE;

-- 查看索引使用情况
SELECT * FROM v$object_usage WHERE index_name = 'IDX_EMP_LASTNAME';

-- 分析索引
ANALYZE INDEX idx_emp_lastname VALIDATE STRUCTURE;

-- 查看索引碎片情况
SELECT 
    index_name,
    blevel,
    leaf_blocks,
    distinct_keys,
    clustering_factor,
    (blevel / (leaf_blocks + 1)) * 100 AS btree_depth_ratio
FROM user_indexes
WHERE table_name = 'EMPLOYEES';
```

## 查询优化技巧

### WHERE子句优化

```sql
-- 避免在索引列上使用函数
-- 不好的写法
SELECT * FROM employees WHERE UPPER(last_name) = 'SMITH';

-- 好的写法（如果可能）
SELECT * FROM employees WHERE last_name = 'SMITH';

-- 或者创建函数索引
CREATE INDEX idx_emp_upper_name ON employees(UPPER(last_name));
SELECT * FROM employees WHERE UPPER(last_name) = 'SMITH';

-- 避免在索引列上进行计算
-- 不好的写法
SELECT * FROM employees WHERE salary * 12 > 60000;

-- 好的写法
SELECT * FROM employees WHERE salary > 60000 / 12;

-- 避免使用OR连接不同列的条件
-- 不好的写法
SELECT * FROM employees WHERE last_name = 'Smith' OR email LIKE '%@company.com';

-- 好的写法（使用UNION）
SELECT * FROM employees WHERE last_name = 'Smith'
UNION
SELECT * FROM employees WHERE email LIKE '%@company.com';

-- 使用LIKE时避免前导通配符
-- 不好的写法
SELECT * FROM employees WHERE last_name LIKE '%mith';

-- 好的写法
SELECT * FROM employees WHERE last_name LIKE 'Smith%';

-- 使用IN代替多个OR
-- 不好的写法
SELECT * FROM employees WHERE department_id = 10 OR department_id = 20 OR department_id = 30;

-- 好的写法
SELECT * FROM employees WHERE department_id IN (10, 20, 30);

-- 使用EXISTS代替IN（当子查询返回大量数据时）
-- 不好的写法
SELECT * FROM employees e WHERE e.department_id IN (
    SELECT d.department_id FROM departments d WHERE d.location_id = 1700
);

-- 好的写法
SELECT * FROM employees e WHERE EXISTS (
    SELECT 1 FROM departments d 
    WHERE d.department_id = e.department_id AND d.location_id = 1700
);
```

### JOIN优化

```sql
-- 确保连接列上有索引
CREATE INDEX idx_emp_dept_id ON employees(department_id);
CREATE INDEX idx_dept_id ON departments(department_id);

-- 使用适当的连接方法
-- 嵌套循环连接（适用于小表驱动大表）
SELECT /*+ USE_NL(e d) */ e.*, d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id
WHERE e.employee_id = 100;

-- 哈希连接（适用于大表连接）
SELECT /*+ USE_HASH(e d) */ e.*, d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id
WHERE e.salary > 5000;

-- 合并连接（适用于已排序的数据）
SELECT /*+ USE_MERGE(e d) */ e.*, d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id
ORDER BY e.last_name;

-- 避免在连接条件中使用函数
-- 不好的写法
SELECT e.*, d.department_name
FROM employees e
JOIN departments d ON UPPER(e.department_name) = UPPER(d.department_name);

-- 好的写法
SELECT e.*, d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id;

-- 减少连接的表数量
-- 不好的写法（连接太多表）
SELECT e.*, d.department_name, l.city, c.country_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id
JOIN locations l ON d.location_id = l.location_id
JOIN countries c ON l.country_id = c.country_id;

-- 好的写法（分步查询或使用子查询）
WITH dept_info AS (
    SELECT d.department_id, d.department_name, l.city, c.country_name
    FROM departments d
    JOIN locations l ON d.location_id = l.location_id
    JOIN countries c ON l.country_id = c.country_id
)
SELECT e.*, di.department_name, di.city, di.country_name
FROM employees e
JOIN dept_info di ON e.department_id = di.department_id;
```

### 分组优化

```sql
-- 在分组列上创建索引
CREATE INDEX idx_emp_dept_job ON employees(department_id, job_id);

-- 使用适当的分组方法
-- 哈希分组（适用于大数据量）
SELECT /*+ HASH_GROUP */ department_id, job_id, COUNT(*), AVG(salary)
FROM employees
GROUP BY department_id, job_id;

-- 排序分组（适用于小数据量或已排序的数据）
SELECT /*+ USE_HASH_AGGREGATION */ department_id, job_id, COUNT(*), AVG(salary)
FROM employees
GROUP BY department_id, job_id;

-- 减少分组的数据量
-- 不好的写法
SELECT department_id, job_id, COUNT(*), AVG(salary)
FROM employees
GROUP BY department_id, job_id;

-- 好的写法（先过滤再分组）
SELECT department_id, job_id, COUNT(*), AVG(salary)
FROM employees
WHERE hire_date > ADD_MONTHS(SYSDATE, -12)
GROUP BY department_id, job_id;

-- 使用HAVING过滤分组
SELECT department_id, COUNT(*), AVG(salary)
FROM employees
GROUP BY department_id
HAVING COUNT(*) > 10 AND AVG(salary) > 5000;
```

### 排序优化

```sql
-- 在排序列上创建索引
CREATE INDEX idx_emp_salary ON employees(salary);

-- 使用索引排序
SELECT employee_id, first_name, last_name, salary
FROM employees
ORDER BY salary;  -- 如果有索引，可以避免排序操作

-- 避免不必要的排序
-- 不好的写法
SELECT DISTINCT department_id FROM employees ORDER BY department_id;

-- 好的写法（如果不需要排序）
SELECT DISTINCT department_id FROM employees;

-- 减少排序的数据量
-- 不好的写法
SELECT * FROM employees ORDER BY salary;

-- 好的写法
SELECT employee_id, first_name, last_name, salary
FROM employees
ORDER BY salary;

-- 使用分页减少排序的数据量
SELECT employee_id, first_name, last_name, salary
FROM (
    SELECT employee_id, first_name, last_name, salary,
           ROW_NUMBER() OVER (ORDER BY salary DESC) AS rn
    FROM employees
)
WHERE rn BETWEEN 1 AND 20;
```

## 提示使用

### 访问路径提示

```sql
-- 强制使用索引
SELECT /*+ INDEX(e emp_salary_idx) */ *
FROM employees e
WHERE e.salary > 5000;

-- 强制使用全表扫描
SELECT /*+ FULL(e) */ *
FROM employees e
WHERE e.salary > 5000;

-- 强制使用索引快速全扫描
SELECT /*+ INDEX_FFS(e emp_name_idx) */ *
FROM employees e;

-- 强制使用索引跳跃扫描
SELECT /*+ INDEX_SS(e emp_dept_job_idx) */ *
FROM employees e
WHERE e.job_id = 'IT_PROG';
```

### 连接提示

```sql
-- 强制使用嵌套循环连接
SELECT /*+ USE_NL(e d) */ e.*, d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id;

-- 强制使用哈希连接
SELECT /*+ USE_HASH(e d) */ e.*, d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id;

-- 强制使用合并连接
SELECT /*+ USE_MERGE(e d) */ e.*, d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id;

-- 指定驱动表
SELECT /*+ LEADING(e) USE_NL(d) */ e.*, d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id;
```

### 并行提示

```sql
-- 强制使用并行查询
SELECT /*+ PARALLEL(employees 4) */ *
FROM employees
WHERE department_id = 60;

-- 强制使用并行DML
INSERT /*+ PARALLEL(employees 4) */ INTO employees
SELECT * FROM employees_temp;

-- 强制使用并行索引创建
CREATE /*+ PARALLEL(4) */ INDEX idx_emp_salary ON employees(salary);
```

### 其他提示

```sql
-- 强制使用哈希聚合
SELECT /*+ HASH_AGG */ department_id, COUNT(*), AVG(salary)
FROM employees
GROUP BY department_id;

-- 强制使用排序聚合
SELECT /*+ USE_HASH_AGGREGATION */ department_id, COUNT(*), AVG(salary)
FROM employees
GROUP BY department_id;

-- 强制使用物化视图
SELECT /*+ MATERIALIZE */ *
FROM (
    SELECT department_id, COUNT(*), AVG(salary)
    FROM employees
    GROUP BY department_id
);

-- 强制使用结果缓存
SELECT /*+ RESULT_CACHE */ department_id, COUNT(*), AVG(salary)
FROM employees
GROUP BY department_id;
```

## 性能监控

### 执行计划跟踪

```sql
-- 启用SQL跟踪
ALTER SESSION SET sql_trace = TRUE;

-- 执行查询
SELECT e.*, d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id
WHERE e.salary > 5000;

-- 停止SQL跟踪
ALTER SESSION SET sql_trace = FALSE;

-- 查看跟踪文件
SELECT value FROM v$diag_info WHERE name = 'Default Trace File';

-- 使用TKPROF工具分析跟踪文件
-- 在操作系统命令行执行：
-- tkprof tracefile.trc outputfile.txt explain=username/password@database
```

### 实时SQL监控

```sql
-- 启用实时SQL监控
ALTER SESSION SET statistics_level = ALL;

-- 执行查询
SELECT e.*, d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id
WHERE e.salary > 5000;

-- 查看实时SQL监控
SELECT sql_id, plan_hash_value, executions, elapsed_time, cpu_time
FROM v$sql_monitor
WHERE sql_text LIKE '%employees%';

-- 查看详细的实时SQL监控报告
SELECT DBMS_SQLTUNE.REPORT_SQL_MONITOR(
    sql_id => 'your_sql_id',
    type => 'TEXT',
    report_level => 'ALL'
) AS report FROM dual;
```

### AWR报告

```sql
-- 生成AWR报告
SELECT DBMS_WORKLOAD_REPOSITORY.CREATE_SNAPSHOT() FROM dual;

-- 执行一段时间后再次生成快照
SELECT DBMS_WORKLOAD_REPOSITORY.CREATE_SNAPSHOT() FROM dual;

-- 生成AWR报告
SELECT DBMS_WORKLOAD_REPOSITORY.AWR_REPORT_TEXT(
    dbid => (SELECT dbid FROM v$database),
    inst_num => (SELECT instance_number FROM v$instance),
    bid => start_snap_id,
    eid => end_snap_id
) FROM dual;

-- 生成SQL性能报告
SELECT DBMS_WORKLOAD_REPOSITORY.AWR_SQL_REPORT_TEXT(
    dbid => (SELECT dbid FROM v$database),
    inst_num => (SELECT instance_number FROM v$instance),
    bid => start_snap_id,
    eid => end_snap_id,
    sql_id => 'your_sql_id'
) FROM dual;
```

### SQL调优集

```sql
-- 创建SQL调优集
BEGIN
    DBMS_SQLTUNE.CREATE_SQLSET(
        sqlset_name => 'my_sql_tuning_set',
        description => 'SQL Tuning Set for Performance Analysis'
    );
END;
/

-- 加载SQL到调优集
DECLARE
    cur_cursor DBMS_SQLTUNE.SQLSET_CURSOR;
BEGIN
    OPEN cur_cursor FOR
        SELECT VALUE(p)
        FROM TABLE(
            DBMS_SQLTUNE.SELECT_CURSOR_CACHE(
                basic_filter => 'parsing_schema_name = ''SCOTT'' AND elapsed_time > 1000000',
                attribute_list => 'ALL'
            )
        ) p;
    
    DBMS_SQLTUNE.LOAD_SQLSET(
        sqlset_name => 'my_sql_tuning_set',
        populate_cursor => cur_cursor
    );
    
    CLOSE cur_cursor;
END;
/

-- 创建调优任务
DECLARE
    task_name VARCHAR2(30);
BEGIN
    task_name := DBMS_SQLTUNE.CREATE_TUNING_TASK(
        sqlset_name => 'my_sql_tuning_set',
        time_limit => 3600,
        task_name => 'my_sql_tuning_task',
        description => 'SQL Tuning Task for Performance Analysis'
    );
    
    DBMS_OUTPUT.PUT_LINE('Task Name: ' || task_name);
END;
/

-- 执行调优任务
BEGIN
    DBMS_SQLTUNE.EXECUTE_TUNING_TASK(task_name => 'my_sql_tuning_task');
END;
/

-- 查看调优建议
SELECT DBMS_SQLTUNE.REPORT_TUNING_TASK(task_name => 'my_sql_tuning_task') AS report
FROM dual;
```

## 优化案例分析

### 案例1：全表扫描优化

**问题描述**：
查询员工表中的高薪员工，但执行计划显示全表扫描，性能较差。

```sql
-- 原始查询
SELECT employee_id, first_name, last_name, salary
FROM employees
WHERE salary > 8000;
```

**执行计划**：
```
| Id  | Operation         | Name      | Rows  | Bytes | Cost |
|   0 | SELECT STATEMENT  |           |    50 |  1750 |    3 |
|   1 |  TABLE ACCESS FULL| EMPLOYEES |    50 |  1750 |    3 |
```

**优化方案**：
在salary列上创建索引。

```sql
-- 创建索引
CREATE INDEX idx_emp_salary ON employees(salary);

-- 收集统计信息
BEGIN
    DBMS_STATS.GATHER_TABLE_STATS(
        ownname => 'SCOTT',
        tabname => 'EMPLOYEES',
        cascade => TRUE
    );
END;
/
```

**优化后的执行计划**：
```
| Id  | Operation                   | Name         | Rows  | Bytes | Cost |
|   0 | SELECT STATEMENT            |              |    50 |  1750 |    2 |
|   1 |  TABLE ACCESS BY INDEX ROWID| EMPLOYEES   |    50 |  1750 |    2 |
|*  2 |   INDEX RANGE SCAN          | IDX_EMP_SALARY|    50 |       |    1 |
```

### 案例2：连接优化

**问题描述**：
查询员工及其部门信息，但执行计划显示嵌套循环连接，性能较差。

```sql
-- 原始查询
SELECT e.employee_id, e.first_name, e.last_name, d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id
WHERE e.salary > 5000;
```

**执行计划**：
```
| Id  | Operation                    | Name        | Rows  | Bytes | Cost |
|   0 | SELECT STATEMENT             |             |    50 |  2650 |    8 |
|   1 |  NESTED LOOPS                |             |    50 |  2650 |    8 |
|   2 |   NESTED LOOPS               |             |    50 |  2650 |    8 |
|   3 |    TABLE ACCESS BY INDEX ROWID| EMPLOYEES |    50 |  1750 |    2 |
|*  4 |     INDEX RANGE SCAN         | EMP_SALARY  |    50 |       |    1 |
|   5 |    INDEX UNIQUE SCAN         | DEPT_PK     |     1 |       |    0 |
|   6 |   TABLE ACCESS BY INDEX ROWID| DEPARTMENTS|     1 |    18 |    1 |
```

**优化方案**：
使用哈希连接提示。

```sql
-- 优化后的查询
SELECT /*+ USE_HASH(e d) */ e.employee_id, e.first_name, e.last_name, d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id
WHERE e.salary > 5000;
```

**优化后的执行计划**：
```
| Id  | Operation          | Name        | Rows  | Bytes | Cost |
|   0 | SELECT STATEMENT   |             |    50 |  2650 |    5 |
|*  1 |  HASH JOIN         |             |    50 |  2650 |    5 |
|   2 |   TABLE ACCESS FULL| EMPLOYEES   |    50 |  1750 |    2 |
|   3 |   TABLE ACCESS FULL| DEPARTMENTS|    27 |   486 |    2 |
```

### 案例3：排序优化

**问题描述**：
按薪资排序查询员工，但执行计划显示排序操作，性能较差。

```sql
-- 原始查询
SELECT employee_id, first_name, last_name, salary
FROM employees
ORDER BY salary DESC;
```

**执行计划**：
```
| Id  | Operation         | Name      | Rows  | Bytes | Cost |
|   0 | SELECT STATEMENT  |           |   107 |  3745 |    4 |
|   1 |  SORT ORDER BY    |           |   107 |  3745 |    4 |
|   2 |   TABLE ACCESS FULL| EMPLOYEES|   107 |  3745 |    3 |
```

**优化方案**：
在salary列上创建索引。

```sql
-- 创建索引
CREATE INDEX idx_emp_salary ON employees(salary);

-- 收集统计信息
BEGIN
    DBMS_STATS.GATHER_TABLE_STATS(
        ownname => 'SCOTT',
        tabname => 'EMPLOYEES',
        cascade => TRUE
    );
END;
/
```

**优化后的执行计划**：
```
| Id  | Operation                    | Name         | Rows  | Bytes | Cost |
|   0 | SELECT STATEMENT             |              |   107 |  3745 |    2 |
|   1 |  TABLE ACCESS BY INDEX ROWID| EMPLOYEES    |   107 |  3745 |    2 |
|   2 |   INDEX FULL SCAN DESCENDING| IDX_EMP_SALARY| 107 |       |    1 |
```

### 案例4：分组优化

**问题描述**：
按部门统计员工数量和平均薪资，但执行计划显示排序分组，性能较差。

```sql
-- 原始查询
SELECT department_id, COUNT(*) AS employee_count, AVG(salary) AS avg_salary
FROM employees
GROUP BY department_id;
```

**执行计划**：
```
| Id  | Operation            | Name      | Rows  | Bytes | Cost |
|   0 | SELECT STATEMENT     |           |    11 |   143 |    4 |
|   1 |  HASH GROUP BY       |           |    11 |   143 |    4 |
|   2 |   TABLE ACCESS FULL  | EMPLOYEES|   107 |  1391 |    3 |
```

**优化方案**：
在department_id列上创建索引。

```sql
-- 创建索引
CREATE INDEX idx_emp_department_id ON employees(department_id);

-- 收集统计信息
BEGIN
    DBMS_STATS.GATHER_TABLE_STATS(
        ownname => 'SCOTT',
        tabname => 'EMPLOYEES',
        cascade => TRUE
    );
END;
/
```

**优化后的执行计划**：
```
| Id  | Operation            | Name                    | Rows  | Bytes | Cost |
|   0 | SELECT STATEMENT     |                         |    11 |   143 |    3 |
|   1 |  HASH GROUP BY       |                         |    11 |   143 |    3 |
|   2 |   INDEX FAST FULL SCAN| IDX_EMP_DEPARTMENT_ID |   107 |  1391 |    2 |
```

### 案例5：子查询优化

**问题描述**：
查询薪资高于部门平均薪资的员工，但执行计划显示多次全表扫描，性能较差。

```sql
-- 原始查询
SELECT employee_id, first_name, last_name, salary, department_id
FROM employees e
WHERE salary > (
    SELECT AVG(salary)
    FROM employees
    WHERE department_id = e.department_id
);
```

**执行计划**：
```
| Id  | Operation          | Name      | Rows  | Bytes | Cost |
|   0 | SELECT STATEMENT   |           |    50 |  2650 |   13 |
|*  1 |  FILTER            |           |       |       |       |
|   2 |   TABLE ACCESS FULL| EMPLOYEES |   107 |  3745 |    3 |
|   3 |   SORT AGGREGATE   |           |     1 |    13 |       |
|*  4 |    TABLE ACCESS FULL| EMPLOYEES|    10 |   130 |    3 |
```

**优化方案**：
使用WITH子句重写查询。

```sql
-- 优化后的查询
WITH dept_avg AS (
    SELECT department_id, AVG(salary) AS avg_salary
    FROM employees
    GROUP BY department_id
)
SELECT e.employee_id, e.first_name, e.last_name, e.salary, e.department_id
FROM employees e
JOIN dept_avg d ON e.department_id = d.department_id
WHERE e.salary > d.avg_salary;
```

**优化后的执行计划**：
```
| Id  | Operation            | Name      | Rows  | Bytes | Cost |
|   0 | SELECT STATEMENT     |           |    50 |  2650 |    5 |
|*  1 |  HASH JOIN           |           |    50 |  2650 |    5 |
|   2 |   TABLE ACCESS FULL  | EMPLOYEES |   107 |  3745 |    3 |
|   3 |   VIEW               |           |    11 |   143 |    2 |
|   4 |    HASH GROUP BY     |           |    11 |   143 |    2 |
|   5 |     TABLE ACCESS FULL| EMPLOYEES |   107 |  1391 |    3 |
```

## 总结

Oracle SQL查询优化是一个复杂但重要的任务，需要综合考虑多个因素：

1. **理解执行计划**：掌握如何读取和分析执行计划，识别性能瓶颈
2. **合理使用索引**：在适当的列上创建适当的索引，提高查询效率
3. **优化查询结构**：使用高效的SQL写法，避免不必要的操作
4. **使用提示**：在必要时使用提示指导优化器选择更好的执行计划
5. **监控性能**：使用各种工具监控SQL性能，及时发现和解决问题

通过以上技术和方法，可以显著提高Oracle SQL查询的性能，提升应用程序的响应速度。