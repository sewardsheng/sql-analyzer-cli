# SQL团队规范索引

本目录包含SQL团队开发规范、编码风格和数据库设计最佳实践，确保团队代码的一致性和可维护性。

## 文件列表

1. **[sql-syntax-guide.md](./sql-syntax-guide.md)**
   - 通用SQL语法指南
   - 包含DDL、DML、DCL语法结构，数据类型，约束，索引等

2. **[sql-coding-standards.md](./sql-coding-standards.md)**
   - SQL编码风格与命名规范
   - 包含命名规范、编码风格、复杂查询规范等

3. **[database-design-best-practices.md](./database-design-best-practices.md)**
   - 数据库设计最佳实践
   - 包含设计原则、表设计规范、高级设计模式等

## 快速导航

### 按主题分类

#### 命名规范
- [表命名](./sql-coding-standards.md#11-数据库对象命名)
- [列命名](./sql-coding-standards.md#12-列名)
- [索引命名](./sql-coding-standards.md#13-索引名)
- [外键命名](./sql-coding-standards.md#14-外键名)
- [视图命名](./sql-coding-standards.md#15-视图名)

#### 编码风格
- [格式化规范](./sql-coding-standards.md#21-格式化)
- [注释规范](./sql-coding-standards.md#22-注释规范)
- [复杂查询规范](./sql-coding-standards.md#23-复杂查询规范)

#### 数据库设计
- [设计原则](./database-design-best-practices.md#1-数据库设计原则)
- [表设计规范](./database-design-best-practices.md#2-表设计规范)
- [高级设计模式](./database-design-best-practices.md#3-高级设计模式)

#### SQL语法
- [DDL语法](./sql-syntax-guide.md#ddl-数据定义语言)
- [DML语法](./sql-syntax-guide.md#dml-数据操作语言)
- [DCL语法](./sql-syntax-guide.md#dcl-数据控制语言)

### 按数据库类型

#### MySQL
- [MySQL特定规范](./sql-coding-standards.md#61-mysql特定规范)
- [MySQL语法特点](./sql-syntax-guide.md#mysql特定功能)

#### PostgreSQL
- [PostgreSQL特定规范](./sql-coding-standards.md#62-postgresql特定规范)
- [PostgreSQL语法特点](./sql-syntax-guide.md#postgresql特定功能)

#### SQL Server
- [SQL Server特定规范](./sql-coding-standards.md#63-sql-server特定规范)
- [SQL Server语法特点](./sql-syntax-guide.md#sql-server特定功能)

#### Oracle
- [Oracle语法特点](./sql-syntax-guide.md#oracle特定功能)

#### SQLite
- [SQLite语法特点](./sql-syntax-guide.md#sqlite特定功能)

### 开发流程

#### 设计阶段
- [数据库设计原则](./database-design-best-practices.md#1-数据库设计原则)
- [表设计规范](./database-design-best-practices.md#2-表设计规范)

#### 开发阶段
- [编码规范](./sql-coding-standards.md)
- [语法指南](./sql-syntax-guide.md)

#### 审查阶段
- [代码审查清单](./sql-coding-standards.md#51-代码审查清单)
- [文档规范](./sql-coding-standards.md#52-文档规范)

#### 部署阶段
- [版本控制规范](./sql-coding-standards.md#4-版本控制规范)
- [数据迁移与版本控制](./database-design-best-practices.md#6-数据迁移与版本控制)

## 团队协作

### 代码审查
使用 [代码审查清单](./sql-coding-standards.md#51-代码审查清单) 确保代码质量。

### 文档维护
- 复杂业务逻辑必须有文档说明
- 存储过程和函数必须有注释
- 数据库设计必须有ER图
- 重要变更必须有变更记录

### 培训资源
- [SQL编码规范](./sql-coding-standards.md)
- [数据库设计最佳实践](./database-design-best-practices.md)
- [SQL语法指南](./sql-syntax-guide.md)

## 相关资源

- [安全审计规则](../security-audit/) - 了解SQL安全最佳实践
- [性能分析指南](../performance-analysis/) - 了解SQL性能优化技巧