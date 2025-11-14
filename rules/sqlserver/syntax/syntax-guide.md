# SQL Server 语法规范

## 基本语法结构

### 数据定义语言 (DDL)

#### 创建表

```sql
-- 基本表创建
CREATE TABLE Employees (
    EmployeeID INT IDENTITY(1,1) PRIMARY KEY,
    FirstName NVARCHAR(50) NOT NULL,
    LastName NVARCHAR(50) NOT NULL,
    Email NVARCHAR(100) UNIQUE,
    HireDate DATE NOT NULL,
    Salary DECIMAL(10, 2) CHECK (Salary > 0),
    DepartmentID INT,
    CreatedAt DATETIME DEFAULT GETDATE(),
    ModifiedAt DATETIME
);

-- 创建临时表
CREATE TABLE #TempEmployees (
    EmployeeID INT,
    FirstName NVARCHAR(50),
    LastName NVARCHAR(50)
);

-- 创建全局临时表
CREATE TABLE ##GlobalTempEmployees (
    EmployeeID INT,
    FirstName NVARCHAR(50),
    LastName NVARCHAR(50)
);

-- 创建表变量
DECLARE @EmployeeTable TABLE (
    EmployeeID INT,
    FirstName NVARCHAR(50),
    LastName NVARCHAR(50)
);
```

#### 修改表结构

```sql
-- 添加列
ALTER TABLE Employees ADD 
    MiddleName NVARCHAR(50),
    BirthDate DATE;

-- 修改列
ALTER TABLE Employees ALTER COLUMN 
    FirstName NVARCHAR(100) NOT NULL;

-- 删除列
ALTER TABLE Employees DROP COLUMN MiddleName;

-- 添加约束
ALTER TABLE Employees ADD 
    CONSTRAINT FK_Employees_Departments 
    FOREIGN KEY (DepartmentID) 
    REFERENCES Departments(DepartmentID);

-- 删除约束
ALTER TABLE Employees DROP CONSTRAINT FK_Employees_Departments;
```

#### 删除表

```sql
-- 删除表
DROP TABLE Employees;

-- 删除表（如果存在）
IF OBJECT_ID('Employees', 'U') IS NOT NULL
    DROP TABLE Employees;
```

#### 创建和删除索引

```sql
-- 创建聚集索引
CREATE CLUSTERED INDEX IX_Employees_EmployeeID 
ON Employees(EmployeeID);

-- 创建非聚集索引
CREATE NONCLUSTERED INDEX IX_Employees_LastName 
ON Employees(LastName);

-- 创建复合索引
CREATE NONCLUSTERED INDEX IX_Employees_Department_Salary 
ON Employees(DepartmentID, Salary);

-- 创建唯一索引
CREATE UNIQUE NONCLUSTERED INDEX IX_Employees_Email 
ON Employees(Email);

-- 创建筛选索引
CREATE NONCLUSTERED INDEX IX_Employees_HighSalary 
ON Employees(EmployeeID)
WHERE Salary > 50000;

-- 删除索引
DROP INDEX IX_Employees_LastName ON Employees;
```

### 数据操作语言 (DML)

#### 插入数据

```sql
-- 基本插入
INSERT INTO Employees (FirstName, LastName, Email, HireDate, Salary, DepartmentID)
VALUES ('John', 'Doe', 'john.doe@example.com', '2023-01-15', 60000.00, 1);

-- 插入多行
INSERT INTO Employees (FirstName, LastName, Email, HireDate, Salary, DepartmentID)
VALUES 
    ('Jane', 'Smith', 'jane.smith@example.com', '2023-02-20', 65000.00, 2),
    ('Mike', 'Johnson', 'mike.johnson@example.com', '2023-03-10', 55000.00, 1),
    ('Sarah', 'Williams', 'sarah.williams@example.com', '2023-04-05', 70000.00, 3);

-- 从其他表插入
INSERT INTO Employees (FirstName, LastName, Email, HireDate, Salary, DepartmentID)
SELECT FirstName, LastName, Email, HireDate, Salary, DepartmentID
FROM NewEmployees;

-- 插入部分列
INSERT INTO Employees (FirstName, LastName, HireDate)
VALUES ('Tom', 'Brown', '2023-05-12');
```

#### 更新数据

```sql
-- 基本更新
UPDATE Employees
SET Salary = Salary * 1.05
WHERE DepartmentID = 1;

-- 更新多列
UPDATE Employees
SET 
    Salary = Salary * 1.05,
    ModifiedAt = GETDATE()
WHERE DepartmentID = 1;

-- 使用JOIN更新
UPDATE e
SET 
    e.Salary = e.Salary * 1.05,
    e.ModifiedAt = GETDATE()
FROM Employees e
JOIN Departments d ON e.DepartmentID = d.DepartmentID
WHERE d.DepartmentName = 'IT';

-- 使用子查询更新
UPDATE Employees
SET Salary = (
    SELECT AVG(Salary) * 1.1
    FROM Employees
    WHERE DepartmentID = Employees.DepartmentID
)
WHERE EmployeeID = 1;
```

#### 删除数据

```sql
-- 基本删除
DELETE FROM Employees
WHERE EmployeeID = 1;

-- 使用JOIN删除
DELETE e
FROM Employees e
JOIN Departments d ON e.DepartmentID = d.DepartmentID
WHERE d.DepartmentName = 'Temp';

-- 使用子查询删除
DELETE FROM Employees
WHERE DepartmentID IN (
    SELECT DepartmentID
    FROM Departments
    WHERE DepartmentName = 'Temp'
);

-- 删除所有数据（保留表结构）
TRUNCATE TABLE Employees;
```

#### 查询数据

```sql
-- 基本查询
SELECT EmployeeID, FirstName, LastName, Email, HireDate, Salary
FROM Employees;

-- 使用WHERE条件
SELECT EmployeeID, FirstName, LastName, Salary
FROM Employees
WHERE Salary > 50000 AND DepartmentID = 1;

-- 使用ORDER BY排序
SELECT EmployeeID, FirstName, LastName, Salary
FROM Employees
ORDER BY Salary DESC, LastName ASC;

-- 使用DISTINCT去重
SELECT DISTINCT DepartmentID
FROM Employees;

-- 使用TOP限制行数
SELECT TOP 10 EmployeeID, FirstName, LastName, Salary
FROM Employees
ORDER BY Salary DESC;

-- 使用TOP PERCENT
SELECT TOP 10 PERCENT EmployeeID, FirstName, LastName, Salary
FROM Employees
ORDER BY Salary DESC;

-- 使用分页
SELECT EmployeeID, FirstName, LastName, Salary
FROM Employees
ORDER BY Salary DESC
OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY;

-- 使用OFFSET和FETCH进行分页
SELECT EmployeeID, FirstName, LastName, Salary
FROM Employees
ORDER BY Salary DESC
OFFSET 10 ROWS FETCH NEXT 10 ROWS ONLY;
```

### 数据类型

#### 数值类型

```sql
-- 整数类型
CREATE TABLE NumericTypes (
    TinyIntColumn TINYINT,          -- 0-255
    SmallIntColumn SMALLINT,        -- -32,768 到 32,767
    IntColumn INT,                  -- -2,147,483,648 到 2,147,483,647
    BigIntColumn BIGINT             -- -9,223,372,036,854,775,808 到 9,223,372,036,854,775,807
);

-- 小数类型
CREATE TABLE DecimalTypes (
    DecimalColumn DECIMAL(10, 2),   -- 精确数值，总位数10，小数位2
    NumericColumn NUMERIC(10, 2),   -- 同DECIMAL
    RealColumn REAL,                -- 浮点数，约7位精度
    FloatColumn FLOAT(53),          -- 浮点数，约15位精度
    MoneyColumn MONEY,              -- 货币类型，-922,337,203,685,477.5808 到 922,337,203,685,477.5807
    SmallMoneyColumn SMALLMONEY     -- 小货币类型，-214,748.3648 到 214,748.3647
);
```

#### 字符串类型

```sql
-- 字符串类型
CREATE TABLE StringTypes (
    CharColumn CHAR(10),            -- 固定长度字符串
    VarCharColumn VARCHAR(50),      -- 可变长度字符串
    NCharColumn NCHAR(10),          -- 固定长度Unicode字符串
    NVarCharColumn NVARCHAR(50),    -- 可变长度Unicode字符串
    TextColumn TEXT,                -- 大文本数据（已弃用，使用VARCHAR(MAX)）
    NTextColumn NTEXT,              -- 大Unicode文本数据（已弃用，使用NVARCHAR(MAX)）
    VarCharMaxColumn VARCHAR(MAX),  -- 可变长度字符串，最大2GB
    NVarCharMaxColumn NVARCHAR(MAX) -- 可变长度Unicode字符串，最大2GB
);
```

#### 日期和时间类型

```sql
-- 日期和时间类型
CREATE TABLE DateTimeTypes (
    DateColumn DATE,                -- 日期
    TimeColumn TIME,                -- 时间
    DateTimeColumn DATETIME,        -- 日期和时间
    DateTime2Column DATETIME2,      -- 日期和时间，更大范围和精度
    SmallDateTimeColumn SMALLDATETIME, -- 较小范围的日期和时间
    DateTimeOffsetColumn DATETIMEOFFSET, -- 包含时区偏移的日期和时间
    DateTime2PrecisionColumn DATETIME2(3) -- 日期和时间，指定精度
);
```

#### 二进制类型

```sql
-- 二进制类型
CREATE TABLE BinaryTypes (
    BinaryColumn BINARY(10),        -- 固定长度二进制数据
    VarBinaryColumn VARBINARY(50),  -- 可变长度二进制数据
    ImageColumn IMAGE,              -- 大二进制数据（已弃用，使用VARBINARY(MAX)）
    VarBinaryMaxColumn VARBINARY(MAX) -- 可变长度二进制数据，最大2GB
);
```

#### 其他类型

```sql
-- 其他类型
CREATE TABLE OtherTypes (
    BitColumn BIT,                  -- 位类型，0或1
    UniqueIdentifierColumn UNIQUEIDENTIFIER, -- 全局唯一标识符
    XmlColumn XML,                  -- XML数据
    SqlVariantColumn SQL_VARIANT,   -- 可变类型
    HierarchyIdColumn HIERARCHYID,  -- 层次结构ID
    GeographyColumn GEOGRAPHY,      -- 地理空间数据
    GeometryColumn GEOMETRY         -- 几何空间数据
);
```

### 约束

#### 主键约束

```sql
-- 创建表时定义主键
CREATE TABLE Departments (
    DepartmentID INT PRIMARY KEY,
    DepartmentName NVARCHAR(100) NOT NULL
);

-- 创建表后添加主键
ALTER TABLE Employees
ADD CONSTRAINT PK_Employees_EmployeeID 
PRIMARY KEY (EmployeeID);

-- 复合主键
CREATE TABLE EmployeeProjects (
    EmployeeID INT,
    ProjectID INT,
    Role NVARCHAR(50),
    CONSTRAINT PK_EmployeeProjects PRIMARY KEY (EmployeeID, ProjectID)
);
```

#### 外键约束

```sql
-- 创建表时定义外键
CREATE TABLE Employees (
    EmployeeID INT PRIMARY KEY,
    FirstName NVARCHAR(50) NOT NULL,
    LastName NVARCHAR(50) NOT NULL,
    DepartmentID INT,
    CONSTRAINT FK_Employees_Departments 
    FOREIGN KEY (DepartmentID) 
    REFERENCES Departments(DepartmentID)
);

-- 创建表后添加外键
ALTER TABLE Employees
ADD CONSTRAINT FK_Employees_Departments 
FOREIGN KEY (DepartmentID) 
REFERENCES Departments(DepartmentID);

-- 外键级联操作
ALTER TABLE Employees
ADD CONSTRAINT FK_Employees_Departments 
FOREIGN KEY (DepartmentID) 
REFERENCES Departments(DepartmentID)
ON DELETE CASCADE
ON UPDATE CASCADE;
```

#### 唯一约束

```sql
-- 创建表时定义唯一约束
CREATE TABLE Employees (
    EmployeeID INT PRIMARY KEY,
    Email NVARCHAR(100) UNIQUE,
    SSN NVARCHAR(11),
    CONSTRAINT UQ_Employees_SSN UNIQUE (SSN)
);

-- 创建表后添加唯一约束
ALTER TABLE Employees
ADD CONSTRAINT UQ_Employees_Email UNIQUE (Email);
```

#### 检查约束

```sql
-- 创建表时定义检查约束
CREATE TABLE Employees (
    EmployeeID INT PRIMARY KEY,
    FirstName NVARCHAR(50) NOT NULL,
    LastName NVARCHAR(50) NOT NULL,
    Salary DECIMAL(10, 2) CHECK (Salary > 0),
    Age INT CHECK (Age >= 18),
    Email NVARCHAR(100),
    HireDate DATE,
    CONSTRAINT CHK_Employees_Email CHECK (Email LIKE '%@%.%'),
    CONSTRAINT CHK_Employees_HireDate CHECK (HireDate <= GETDATE())
);

-- 创建表后添加检查约束
ALTER TABLE Employees
ADD CONSTRAINT CHK_Employees_Salary CHECK (Salary > 0);
```

#### 默认约束

```sql
-- 创建表时定义默认约束
CREATE TABLE Employees (
    EmployeeID INT PRIMARY KEY,
    FirstName NVARCHAR(50) NOT NULL,
    LastName NVARCHAR(50) NOT NULL,
    HireDate DATE DEFAULT GETDATE(),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 创建表后添加默认约束
ALTER TABLE Employees
ADD CONSTRAINT DF_Employees_IsActive DEFAULT 1 FOR IsActive;
```

### 视图

#### 创建视图

```sql
-- 基本视图
CREATE VIEW vw_EmployeeDetails AS
SELECT 
    e.EmployeeID,
    e.FirstName,
    e.LastName,
    e.Email,
    e.HireDate,
    e.Salary,
    d.DepartmentName
FROM Employees e
JOIN Departments d ON e.DepartmentID = d.DepartmentID;

-- 带条件的视图
CREATE VIEW vw_ActiveEmployees AS
SELECT 
    EmployeeID,
    FirstName,
    LastName,
    Email,
    HireDate,
    Salary,
    DepartmentID
FROM Employees
WHERE IsActive = 1;

-- 带聚合的视图
CREATE VIEW vw_DepartmentEmployeeCount AS
SELECT 
    d.DepartmentID,
    d.DepartmentName,
    COUNT(e.EmployeeID) AS EmployeeCount,
    AVG(e.Salary) AS AverageSalary
FROM Departments d
LEFT JOIN Employees e ON d.DepartmentID = e.DepartmentID
GROUP BY d.DepartmentID, d.DepartmentName;

-- 带加密选项的视图
CREATE VIEW vw_SensitiveEmployeeInfo WITH ENCRYPTION AS
SELECT 
    EmployeeID,
    FirstName,
    LastName,
    Salary
FROM Employees
WHERE Salary > 50000;

-- 带SCHEMABINDING的视图
CREATE VIEW vw_EmployeeSalary WITH SCHEMABINDING AS
SELECT 
    e.EmployeeID,
    e.FirstName,
    e.LastName,
    e.Salary,
    d.DepartmentName
FROM dbo.Employees e
JOIN dbo.Departments d ON e.DepartmentID = d.DepartmentID;
```

#### 修改视图

```sql
-- 修改视图
ALTER VIEW vw_EmployeeDetails AS
SELECT 
    e.EmployeeID,
    e.FirstName,
    e.LastName,
    e.Email,
    e.HireDate,
    e.Salary,
    e.IsActive,
    d.DepartmentName
FROM Employees e
JOIN Departments d ON e.DepartmentID = d.DepartmentID;
```

#### 删除视图

```sql
-- 删除视图
DROP VIEW vw_EmployeeDetails;

-- 删除视图（如果存在）
IF OBJECT_ID('vw_EmployeeDetails', 'V') IS NOT NULL
    DROP VIEW vw_EmployeeDetails;
```

### 存储过程

#### 创建存储过程

```sql
-- 基本存储过程
CREATE PROCEDURE sp_GetAllEmployees
AS
BEGIN
    SELECT 
        EmployeeID,
        FirstName,
        LastName,
        Email,
        HireDate,
        Salary,
        DepartmentID
    FROM Employees
    ORDER BY LastName, FirstName;
END;

-- 带参数的存储过程
CREATE PROCEDURE sp_GetEmployeeByID
    @EmployeeID INT
AS
BEGIN
    SELECT 
        EmployeeID,
        FirstName,
        LastName,
        Email,
        HireDate,
        Salary,
        DepartmentID
    FROM Employees
    WHERE EmployeeID = @EmployeeID;
END;

-- 带默认参数的存储过程
CREATE PROCEDURE sp_GetEmployeesByDepartment
    @DepartmentID INT = NULL,
    @MinSalary DECIMAL(10, 2) = NULL
AS
BEGIN
    SELECT 
        EmployeeID,
        FirstName,
        LastName,
        Email,
        HireDate,
        Salary,
        DepartmentID
    FROM Employees
    WHERE 
        (@DepartmentID IS NULL OR DepartmentID = @DepartmentID) AND
        (@MinSalary IS NULL OR Salary >= @MinSalary)
    ORDER BY LastName, FirstName;
END;

-- 带输出参数的存储过程
CREATE PROCEDURE sp_GetEmployeeCount
    @DepartmentID INT,
    @EmployeeCount INT OUTPUT
AS
BEGIN
    SELECT @EmployeeCount = COUNT(*)
    FROM Employees
    WHERE DepartmentID = @DepartmentID;
END;

-- 带TRY-CATCH的存储过程
CREATE PROCEDURE sp_UpdateEmployeeSalary
    @EmployeeID INT,
    @NewSalary DECIMAL(10, 2),
    @Result NVARCHAR(100) OUTPUT
AS
BEGIN
    BEGIN TRY
        BEGIN TRANSACTION;
        
        UPDATE Employees
        SET Salary = @NewSalary,
            ModifiedAt = GETDATE()
        WHERE EmployeeID = @EmployeeID;
        
        IF @@ROWCOUNT = 0
        BEGIN
            SET @Result = 'Employee not found';
            ROLLBACK TRANSACTION;
            RETURN;
        END
        
        SET @Result = 'Salary updated successfully';
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        SET @Result = ERROR_MESSAGE();
        ROLLBACK TRANSACTION;
    END CATCH;
END;
```

#### 执行存储过程

```sql
-- 执行基本存储过程
EXEC sp_GetAllEmployees;

-- 执行带参数的存储过程
EXEC sp_GetEmployeeByID @EmployeeID = 1;

-- 执行带默认参数的存储过程
EXEC sp_GetEmployeesByDepartment;
EXEC sp_GetEmployeesByDepartment @DepartmentID = 1;
EXEC sp_GetEmployeesByDepartment @DepartmentID = 1, @MinSalary = 50000;

-- 执行带输出参数的存储过程
DECLARE @Count INT;
EXEC sp_GetEmployeeCount @DepartmentID = 1, @EmployeeCount = @Count OUTPUT;
PRINT 'Employee Count: ' + CAST(@Count AS NVARCHAR(10));
```

#### 修改和删除存储过程

```sql
-- 修改存储过程
ALTER PROCEDURE sp_GetAllEmployees
AS
BEGIN
    SELECT 
        e.EmployeeID,
        e.FirstName,
        e.LastName,
        e.Email,
        e.HireDate,
        e.Salary,
        d.DepartmentName
    FROM Employees e
    JOIN Departments d ON e.DepartmentID = d.DepartmentID
    ORDER BY e.LastName, e.FirstName;
END;

-- 删除存储过程
DROP PROCEDURE sp_GetAllEmployees;

-- 删除存储过程（如果存在）
IF OBJECT_ID('sp_GetAllEmployees', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetAllEmployees;
```

### 函数

#### 标量函数

```sql
-- 创建标量函数
CREATE FUNCTION fn_GetEmployeeFullName
    @EmployeeID INT
RETURNS NVARCHAR(101)
AS
BEGIN
    DECLARE @FullName NVARCHAR(101);
    
    SELECT @FullName = FirstName + ' ' + LastName
    FROM Employees
    WHERE EmployeeID = @EmployeeID;
    
    RETURN @FullName;
END;

-- 使用标量函数
SELECT 
    EmployeeID,
    dbo.fn_GetEmployeeFullName(EmployeeID) AS FullName,
    Salary
FROM Employees;
```

#### 表值函数

```sql
-- 内联表值函数
CREATE FUNCTION fn_GetEmployeesByDepartment
    @DepartmentID INT
RETURNS TABLE
AS
RETURN
(
    SELECT 
        EmployeeID,
        FirstName,
        LastName,
        Email,
        HireDate,
        Salary
    FROM Employees
    WHERE DepartmentID = @DepartmentID
);

-- 使用内联表值函数
SELECT * FROM dbo.fn_GetEmployeesByDepartment(1);

-- 多语句表值函数
CREATE FUNCTION fn_GetDepartmentSummary
    @DepartmentID INT
RETURNS @DepartmentSummary TABLE
(
    DepartmentID INT,
    DepartmentName NVARCHAR(100),
    EmployeeCount INT,
    AverageSalary DECIMAL(10, 2),
    MinSalary DECIMAL(10, 2),
    MaxSalary DECIMAL(10, 2)
)
AS
BEGIN
    INSERT INTO @DepartmentSummary
    SELECT 
        d.DepartmentID,
        d.DepartmentName,
        COUNT(e.EmployeeID) AS EmployeeCount,
        AVG(e.Salary) AS AverageSalary,
        MIN(e.Salary) AS MinSalary,
        MAX(e.Salary) AS MaxSalary
    FROM Departments d
    LEFT JOIN Employees e ON d.DepartmentID = e.DepartmentID
    WHERE d.DepartmentID = @DepartmentID
    GROUP BY d.DepartmentID, d.DepartmentName;
    
    RETURN;
END;

-- 使用多语句表值函数
SELECT * FROM dbo.fn_GetDepartmentSummary(1);
```

#### 修改和删除函数

```sql
-- 修改函数
ALTER FUNCTION fn_GetEmployeeFullName
    @EmployeeID INT,
    @IncludeMiddleName BIT = 0
RETURNS NVARCHAR(151)
AS
BEGIN
    DECLARE @FullName NVARCHAR(151);
    
    IF @IncludeMiddleName = 1
    BEGIN
        SELECT @FullName = ISNULL(FirstName, '') + ' ' + ISNULL(MiddleName, '') + ' ' + ISNULL(LastName, '')
        FROM Employees
        WHERE EmployeeID = @EmployeeID;
    END
    ELSE
    BEGIN
        SELECT @FullName = ISNULL(FirstName, '') + ' ' + ISNULL(LastName, '')
        FROM Employees
        WHERE EmployeeID = @EmployeeID;
    END
    
    RETURN LTRIM(RTRIM(REPLACE(@FullName, '  ', ' ')));
END;

-- 删除函数
DROP FUNCTION fn_GetEmployeeFullName;

-- 删除函数（如果存在）
IF OBJECT_ID('fn_GetEmployeeFullName', 'FN') IS NOT NULL
    DROP FUNCTION fn_GetEmployeeFullName;
```

### 触发器

#### 创建触发器

```sql
-- AFTER INSERT触发器
CREATE TRIGGER tr_Employees_AfterInsert
ON Employees
AFTER INSERT
AS
BEGIN
    -- 记录新员工插入日志
    INSERT INTO EmployeeAuditLog
    (EmployeeID, Action, ActionDate, ActionUser)
    SELECT 
        EmployeeID,
        'INSERT',
        GETDATE(),
        SUSER_SNAME()
    FROM inserted;
    
    -- 更新部门员工数量
    UPDATE d
    SET EmployeeCount = EmployeeCount + 1
    FROM Departments d
    JOIN inserted i ON d.DepartmentID = i.DepartmentID;
END;

-- AFTER UPDATE触发器
CREATE TRIGGER tr_Employees_AfterUpdate
ON Employees
AFTER UPDATE
AS
BEGIN
    -- 检查薪资是否有变化
    IF UPDATE(Salary)
    BEGIN
        -- 记录薪资变更日志
        INSERT INTO SalaryChangeLog
        (EmployeeID, OldSalary, NewSalary, ChangeDate, ChangeUser)
        SELECT 
            i.EmployeeID,
            d.Salary AS OldSalary,
            i.Salary AS NewSalary,
            GETDATE() AS ChangeDate,
            SUSER_SNAME() AS ChangeUser
        FROM inserted i
        JOIN deleted d ON i.EmployeeID = d.EmployeeID
        WHERE i.Salary <> d.Salary;
    END
    
    -- 记录更新日志
    INSERT INTO EmployeeAuditLog
    (EmployeeID, Action, ActionDate, ActionUser)
    SELECT 
        EmployeeID,
        'UPDATE',
        GETDATE(),
        SUSER_SNAME()
    FROM inserted;
END;

-- AFTER DELETE触发器
CREATE TRIGGER tr_Employees_AfterDelete
ON Employees
AFTER DELETE
AS
BEGIN
    -- 记录员工删除日志
    INSERT INTO EmployeeAuditLog
    (EmployeeID, Action, ActionDate, ActionUser)
    SELECT 
        EmployeeID,
        'DELETE',
        GETDATE(),
        SUSER_SNAME()
    FROM deleted;
    
    -- 更新部门员工数量
    UPDATE d
    SET EmployeeCount = EmployeeCount - 1
    FROM Departments d
    JOIN deleted del ON d.DepartmentID = del.DepartmentID;
END;

-- INSTEAD OF触发器（用于视图）
CREATE TRIGGER tr_vw_EmployeeDetails_InsteadOfInsert
ON vw_EmployeeDetails
INSTEAD OF INSERT
AS
BEGIN
    -- 插入员工数据
    INSERT INTO Employees
    (FirstName, LastName, Email, HireDate, Salary, DepartmentID)
    SELECT 
        FirstName,
        LastName,
        Email,
        HireDate,
        Salary,
        d.DepartmentID
    FROM inserted i
    JOIN Departments d ON i.DepartmentName = d.DepartmentName;
END;
```

#### 修改和删除触发器

```sql
-- 修改触发器
ALTER TRIGGER tr_Employees_AfterInsert
ON Employees
AFTER INSERT
AS
BEGIN
    -- 记录新员工插入日志
    INSERT INTO EmployeeAuditLog
    (EmployeeID, Action, ActionDate, ActionUser)
    SELECT 
        EmployeeID,
        'INSERT',
        GETDATE(),
        SUSER_SNAME()
    FROM inserted;
    
    -- 更新部门员工数量
    UPDATE d
    SET EmployeeCount = EmployeeCount + 1,
        LastEmployeeAdded = GETDATE()
    FROM Departments d
    JOIN inserted i ON d.DepartmentID = i.DepartmentID;
END;

-- 禁用触发器
DISABLE TRIGGER tr_Employees_AfterInsert ON Employees;

-- 启用触发器
ENABLE TRIGGER tr_Employees_AfterInsert ON Employees;

-- 删除触发器
DROP TRIGGER tr_Employees_AfterInsert;

-- 删除触发器（如果存在）
IF OBJECT_ID('tr_Employees_AfterInsert', 'TR') IS NOT NULL
    DROP TRIGGER tr_Employees_AfterInsert;
```

### 事务控制

```sql
-- 基本事务
BEGIN TRANSACTION;
    
    -- 更新员工薪资
    UPDATE Employees
    SET Salary = Salary * 1.05
    WHERE DepartmentID = 1;
    
    -- 记录薪资调整
    INSERT INTO SalaryAdjustmentLog
    (DepartmentID, AdjustmentPercentage, AdjustmentDate, AdjustmentUser)
    VALUES 
    (1, 5, GETDATE(), SUSER_SNAME());
    
COMMIT TRANSACTION;

-- 带错误处理的事务
BEGIN TRY
    BEGIN TRANSACTION;
        
        -- 更新员工薪资
        UPDATE Employees
        SET Salary = Salary * 1.05
        WHERE DepartmentID = 1;
        
        -- 记录薪资调整
        INSERT INTO SalaryAdjustmentLog
        (DepartmentID, AdjustmentPercentage, AdjustmentDate, AdjustmentUser)
        VALUES 
        (1, 5, GETDATE(), SUSER_SNAME());
        
    COMMIT TRANSACTION;
    
    PRINT 'Transaction completed successfully';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
        
    PRINT 'Transaction failed: ' + ERROR_MESSAGE();
END CATCH;

-- 嵌套事务
BEGIN TRANSACTION OuterTransaction;
    
    -- 更新部门信息
    UPDATE Departments
    SET Budget = Budget * 1.1
    WHERE DepartmentID = 1;
    
    BEGIN TRANSACTION InnerTransaction;
        
        -- 更新员工薪资
        UPDATE Employees
        SET Salary = Salary * 1.05
        WHERE DepartmentID = 1;
        
        -- 记录薪资调整
        INSERT INTO SalaryAdjustmentLog
        (DepartmentID, AdjustmentPercentage, AdjustmentDate, AdjustmentUser)
        VALUES 
        (1, 5, GETDATE(), SUSER_SNAME());
        
    COMMIT TRANSACTION InnerTransaction;
    
COMMIT TRANSACTION OuterTransaction;

-- 使用保存点
BEGIN TRANSACTION;
    
    -- 更新第一个员工
    UPDATE Employees
    SET Salary = Salary * 1.05
    WHERE EmployeeID = 1;
    
    -- 设置保存点
    SAVE TRANSACTION BeforeSecondUpdate;
    
    -- 更新第二个员工
    UPDATE Employees
    SET Salary = Salary * 1.05
    WHERE EmployeeID = 2;
    
    -- 如果第二个更新有问题，回滚到保存点
    IF @@ERROR <> 0
        ROLLBACK TRANSACTION BeforeSecondUpdate;
    
COMMIT TRANSACTION;
```

### 高级查询功能

#### 窗口函数

```sql
-- ROW_NUMBER
SELECT 
    EmployeeID,
    FirstName,
    LastName,
    Salary,
    DepartmentID,
    ROW_NUMBER() OVER (ORDER BY Salary DESC) AS SalaryRank,
    ROW_NUMBER() OVER (PARTITION BY DepartmentID ORDER BY Salary DESC) AS DeptSalaryRank
FROM Employees;

-- RANK和DENSE_RANK
SELECT 
    EmployeeID,
    FirstName,
    LastName,
    Salary,
    DepartmentID,
    RANK() OVER (ORDER BY Salary DESC) AS SalaryRank,
    DENSE_RANK() OVER (ORDER BY Salary DESC) AS DenseSalaryRank,
    RANK() OVER (PARTITION BY DepartmentID ORDER BY Salary DESC) AS DeptSalaryRank,
    DENSE_RANK() OVER (PARTITION BY DepartmentID ORDER BY Salary DESC) AS DenseDeptSalaryRank
FROM Employees;

-- NTILE
SELECT 
    EmployeeID,
    FirstName,
    LastName,
    Salary,
    NTILE(4) OVER (ORDER BY Salary DESC) AS SalaryQuartile,
    NTILE(10) OVER (ORDER BY Salary DESC) AS SalaryDecile
FROM Employees;

-- LAG和LEAD
SELECT 
    EmployeeID,
    FirstName,
    LastName,
    Salary,
    DepartmentID,
    LAG(Salary, 1, 0) OVER (PARTITION BY DepartmentID ORDER BY EmployeeID) AS PrevEmployeeSalary,
    LEAD(Salary, 1, 0) OVER (PARTITION BY DepartmentID ORDER BY EmployeeID) AS NextEmployeeSalary
FROM Employees
ORDER BY DepartmentID, EmployeeID;

-- FIRST_VALUE和LAST_VALUE
SELECT 
    EmployeeID,
    FirstName,
    LastName,
    Salary,
    DepartmentID,
    FIRST_VALUE(Salary) OVER (PARTITION BY DepartmentID ORDER BY Salary DESC) AS HighestDeptSalary,
    LAST_VALUE(Salary) OVER (PARTITION BY DepartmentID ORDER BY Salary DESC
        RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS LowestDeptSalary
FROM Employees
ORDER BY DepartmentID, Salary DESC;

-- 聚合窗口函数
SELECT 
    EmployeeID,
    FirstName,
    LastName,
    Salary,
    DepartmentID,
    SUM(Salary) OVER (PARTITION BY DepartmentID) AS DeptTotalSalary,
    AVG(Salary) OVER (PARTITION BY DepartmentID) AS DeptAvgSalary,
    COUNT(*) OVER (PARTITION BY DepartmentID) AS DeptEmployeeCount
FROM Employees
ORDER BY DepartmentID, Salary DESC;
```

#### 公共表表达式 (CTE)

```sql
-- 基本CTE
WITH DepartmentEmployees AS (
    SELECT 
        DepartmentID,
        COUNT(*) AS EmployeeCount,
        AVG(Salary) AS AvgSalary
    FROM Employees
    GROUP BY DepartmentID
)
SELECT 
    d.DepartmentName,
    de.EmployeeCount,
    de.AvgSalary
FROM Departments d
JOIN DepartmentEmployees de ON d.DepartmentID = de.DepartmentID
ORDER BY de.EmployeeCount DESC;

-- 递归CTE（层次结构）
WITH EmployeeHierarchy AS (
    -- 基础查询：顶级经理（没有上级的员工）
    SELECT 
        EmployeeID,
        FirstName,
        LastName,
        Title,
        ManagerID,
        0 AS Level
    FROM Employees
    WHERE ManagerID IS NULL
    
    UNION ALL
    
    -- 递归查询：下属员工
    SELECT 
        e.EmployeeID,
        e.FirstName,
        e.LastName,
        e.Title,
        e.ManagerID,
        eh.Level + 1
    FROM Employees e
    JOIN EmployeeHierarchy eh ON e.ManagerID = eh.EmployeeID
)
SELECT 
    EmployeeID,
    FirstName,
    LastName,
    Title,
    ManagerID,
    Level,
    REPLICATE('  ', Level) + FirstName + ' ' + LastName AS DisplayPath
FROM EmployeeHierarchy
ORDER BY Level, LastName;

-- 多个CTE
WITH DepartmentStats AS (
    SELECT 
        DepartmentID,
        COUNT(*) AS EmployeeCount,
        AVG(Salary) AS AvgSalary,
        MIN(Salary) AS MinSalary,
        MAX(Salary) AS MaxSalary
    FROM Employees
    GROUP BY DepartmentID
),
HighSalaryDepts AS (
    SELECT DepartmentID
    FROM DepartmentStats
    WHERE AvgSalary > 60000
)
SELECT 
    d.DepartmentName,
    ds.EmployeeCount,
    ds.AvgSalary,
    ds.MinSalary,
    ds.MaxSalary
FROM Departments d
JOIN DepartmentStats ds ON d.DepartmentID = ds.DepartmentID
WHERE d.DepartmentID IN (SELECT DepartmentID FROM HighSalaryDepts)
ORDER BY ds.AvgSalary DESC;
```

#### PIVOT和UNPIVOT

```sql
-- PIVOT示例
WITH EmployeeSales AS (
    SELECT 
        e.EmployeeID,
        e.FirstName,
        e.LastName,
        YEAR(so.OrderDate) AS OrderYear,
        sod.LineTotal AS SaleAmount
    FROM Employees e
    JOIN SalesOrders so ON e.EmployeeID = so.EmployeeID
    JOIN SalesOrderDetails sod ON so.SalesOrderID = sod.SalesOrderID
)
SELECT 
    FirstName,
    LastName,
    [2019],
    [2020],
    [2021],
    [2022]
FROM EmployeeSales
PIVOT (
    SUM(SaleAmount)
    FOR OrderYear IN ([2019], [2020], [2021], [2022])
) AS p
ORDER BY LastName, FirstName;

-- 动态PIIVOT
DECLARE @columns NVARCHAR(MAX), @sql NVARCHAR(MAX);

-- 获取动态列名
SET @columns = N'';

SELECT @columns += N', ' + QUOTENAME(YEAR(OrderDate))
FROM (SELECT DISTINCT YEAR(OrderDate) AS OrderYear FROM SalesOrders) AS Years
ORDER BY OrderYear;

SET @sql = N'
WITH EmployeeSales AS (
    SELECT 
        e.EmployeeID,
        e.FirstName,
        e.LastName,
        YEAR(so.OrderDate) AS OrderYear,
        sod.LineTotal AS SaleAmount
    FROM Employees e
    JOIN SalesOrders so ON e.EmployeeID = so.EmployeeID
    JOIN SalesOrderDetails sod ON so.SalesOrderID = sod.SalesOrderID
)
SELECT 
    FirstName,
    LastName' + @columns + N'
FROM EmployeeSales
PIVOT (
    SUM(SaleAmount)
    FOR OrderYear IN (' + STUFF(@columns, 1, 2, '') + N')
) AS p
ORDER BY LastName, FirstName;';

EXEC sp_executesql @sql;

-- UNPIVOT示例
WITH DepartmentYearlySales AS (
    SELECT 
        DepartmentID,
        [2019] AS Sales2019,
        [2020] AS Sales2020,
        [2021] AS Sales2021,
        [2022] AS Sales2022
    FROM DepartmentSales
)
SELECT 
    DepartmentID,
    OrderYear,
    SalesAmount
FROM DepartmentYearlySales
UNPIVOT (
    SalesAmount FOR OrderYear IN (Sales2019, Sales2020, Sales2021, Sales2022)
) AS unp;
```

#### APPLY运算符

```sql
-- CROSS APPLY
SELECT 
    e.EmployeeID,
    e.FirstName,
    e.LastName,
    s.SalesAmount
FROM Employees e
CROSS APPLY (
    SELECT SUM(LineTotal) AS SalesAmount
    FROM SalesOrders so
    JOIN SalesOrderDetails sod ON so.SalesOrderID = sod.SalesOrderID
    WHERE so.EmployeeID = e.EmployeeID
) s
WHERE s.SalesAmount > 100000;

-- OUTER APPLY
SELECT 
    e.EmployeeID,
    e.FirstName,
    e.LastName,
    s.SalesAmount
FROM Employees e
OUTER APPLY (
    SELECT SUM(LineTotal) AS SalesAmount
    FROM SalesOrders so
    JOIN SalesOrderDetails sod ON so.SalesOrderID = sod.SalesOrderID
    WHERE so.EmployeeID = e.EmployeeID
) s
ORDER BY s.SalesAmount DESC;
```

### SQL Server特有语法

#### MERGE语句

```sql
-- 基本MERGE
MERGE INTO TargetTable AS T
USING SourceTable AS S
ON T.ID = S.ID
WHEN MATCHED THEN
    UPDATE SET 
        T.Name = S.Name,
        T.Value = S.Value
WHEN NOT MATCHED BY TARGET THEN
    INSERT (ID, Name, Value)
    VALUES (S.ID, S.Name, S.Value)
WHEN NOT MATCHED BY SOURCE THEN
    DELETE;

-- 复杂MERGE
MERGE INTO Employees AS T
USING EmployeeUpdates AS S
ON T.EmployeeID = S.EmployeeID
WHEN MATCHED AND (
    T.FirstName <> S.FirstName OR 
    T.LastName <> S.LastName OR 
    T.Salary <> S.Salary
) THEN
    UPDATE SET 
        T.FirstName = S.FirstName,
        T.LastName = S.LastName,
        T.Salary = S.Salary,
        T.ModifiedAt = GETDATE()
WHEN MATCHED AND S.IsActive = 0 THEN
    DELETE
WHEN NOT MATCHED BY TARGET THEN
    INSERT (FirstName, LastName, Email, HireDate, Salary, DepartmentID, IsActive)
    VALUES (S.FirstName, S.LastName, S.Email, S.HireDate, S.Salary, S.DepartmentID, S.IsActive)
OUTPUT 
    $action AS Action,
    INSERTED.EmployeeID,
    INSERTED.FirstName,
    INSERTED.LastName,
    DELETED.FirstName AS OldFirstName,
    DELETED.LastName AS OldLastName;
```

#### OUTPUT子句

```sql
-- INSERT OUTPUT
INSERT INTO Employees (FirstName, LastName, Email, HireDate, Salary, DepartmentID)
OUTPUT 
    INSERTED.EmployeeID,
    INSERTED.FirstName,
    INSERTED.LastName
VALUES 
    ('John', 'Doe', 'john.doe@example.com', '2023-01-15', 60000.00, 1);

-- UPDATE OUTPUT
UPDATE Employees
SET Salary = Salary * 1.05
OUTPUT 
    INSERTED.EmployeeID,
    INSERTED.FirstName,
    INSERTED.LastName,
    DELETED.Salary AS OldSalary,
    INSERTED.Salary AS NewSalary,
    INSERTED.Salary - DELETED.Salary AS SalaryIncrease
WHERE DepartmentID = 1;

-- DELETE OUTPUT
DELETE FROM Employees
WHERE DepartmentID = 5
OUTPUT 
    DELETED.EmployeeID,
    DELETED.FirstName,
    DELETED.LastName,
    DELETED.Salary;
```

#### TABLESAMPLE

```sql
-- 返回约10%的行
SELECT * FROM Employees TABLESAMPLE (10 PERCENT);

-- 返回约100行
SELECT * FROM Employees TABLESAMPLE (100 ROWS);

-- 使用SYSTEM选项
SELECT * FROM Employees TABLESAMPLE SYSTEM (10 PERCENT);

-- 使用REPEATABLE选项
SELECT * FROM Employees TABLESAMPLE (10 PERCENT) REPEATABLE (123);
```

#### FOR XML和FOR JSON

```sql
-- FOR XML PATH
SELECT 
    EmployeeID AS '@EmployeeID',
    FirstName AS 'Name/First',
    LastName AS 'Name/Last',
    Email AS 'Email',
    Salary AS 'Salary'
FROM Employees
WHERE DepartmentID = 1
FOR XML PATH('Employee'), ROOT('Employees');

-- FOR XML AUTO
SELECT 
    e.EmployeeID,
    e.FirstName,
    e.LastName,
    d.DepartmentName
FROM Employees e
JOIN Departments d ON e.DepartmentID = d.DepartmentID
WHERE e.DepartmentID = 1
FOR XML AUTO, ROOT('Employees');

-- FOR JSON PATH
SELECT 
    EmployeeID,
    FirstName,
    LastName,
    Email,
    Salary,
    DepartmentID
FROM Employees
WHERE DepartmentID = 1
FOR JSON PATH, ROOT('Employees');

-- FOR JSON AUTO
SELECT 
    e.EmployeeID,
    e.FirstName,
    e.LastName,
    d.DepartmentName
FROM Employees e
JOIN Departments d ON e.DepartmentID = d.DepartmentID
WHERE e.DepartmentID = 1
FOR JSON AUTO, ROOT('Employees');
```

#### 临时表和表变量

```sql
-- 临时表
CREATE TABLE #TempEmployees (
    EmployeeID INT,
    FirstName NVARCHAR(50),
    LastName NVARCHAR(50),
    Salary DECIMAL(10, 2)
);

-- 插入数据到临时表
INSERT INTO #TempEmployees (EmployeeID, FirstName, LastName, Salary)
SELECT EmployeeID, FirstName, LastName, Salary
FROM Employees
WHERE DepartmentID = 1;

-- 使用临时表
SELECT * FROM #TempEmployees ORDER BY Salary DESC;

-- 删除临时表
DROP TABLE #TempEmployees;

-- 表变量
DECLARE @EmployeeTable TABLE (
    EmployeeID INT,
    FirstName NVARCHAR(50),
    LastName NVARCHAR(50),
    Salary DECIMAL(10, 2)
);

-- 插入数据到表变量
INSERT INTO @EmployeeTable (EmployeeID, FirstName, LastName, Salary)
SELECT EmployeeID, FirstName, LastName, Salary
FROM Employees
WHERE DepartmentID = 1;

-- 使用表变量
SELECT * FROM @EmployeeTable ORDER BY Salary DESC;
```

## 最佳实践

1. **命名约定**：
   - 表名使用PascalCase（如Employees）
   - 列名使用PascalCase（如FirstName）
   - 存储过程使用sp_前缀（如sp_GetEmployees）
   - 函数使用fn_前缀（如fn_GetEmployeeFullName）
   - 视图使用vw_前缀（如vw_EmployeeDetails）
   - 触发器使用tr_前缀（如tr_Employees_AfterInsert）

2. **性能优化**：
   - 在适当列上创建索引
   - 避免在WHERE子句中对列使用函数
   - 使用参数化查询防止SQL注入
   - 避免使用SELECT *，只查询需要的列
   - 使用适当的JOIN类型

3. **安全性**：
   - 使用参数化查询
   - 限制用户权限
   - 使用存储过程封装业务逻辑
   - 定期备份数据库

4. **代码组织**：
   - 使用注释解释复杂逻辑
   - 保持一致的代码格式
   - 使用事务确保数据一致性
   - 实现适当的错误处理

通过遵循以上语法规范和最佳实践，可以编写出高效、可维护的SQL Server代码。