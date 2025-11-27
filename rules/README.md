# SQL分析器规则库索引

本规则库按照安全审计、团队规范、性能分析三个维度重组，提供全面的SQL分析规则和最佳实践。

## 目录结构

```
rules/
├── security-audit/          # 安全审计规则
│   ├── README.md
│   ├── dba-security-rules.md
│   ├── sql-injection-knowledge.md
│   └── database-specific-security.md
├── team-standards/          # 团队规范
│   ├── README.md
│   ├── sql-syntax-guide.md
│   ├── sql-coding-standards.md
│   └── database-design-best-practices.md
├── performance-analysis/     # 性能分析
│   ├── README.md
│   ├── query-optimization-guide.md
│   ├── index-optimization-guide.md
│   ├── execution-plan-analysis.md
│   ├── sql-performance-tuning.md
│   └── database-specific-optimization.md
└── learning-rules/          # 学习规则
└── README.md                # 本文件
```

## 主要分类

### 1. 安全审计规则

安全审计规则帮助识别和防范SQL安全风险，包括SQL注入、权限控制、数据加密等方面。

#### 核心文件
- [安全审计规则索引](./security-audit/README.md) - 安全审计规则总览
- [DBA安全规则](./security-audit/dba-security-rules.md) - 数据库管理员安全规则
- [SQL注入知识](./security-audit/sql-injection-knowledge.md) - SQL注入攻击与防护
- [数据库特定安全](./security-audit/database-specific-security.md) - 各数据库系统安全特性

#### 快速导航
- **SQL注入防护** → [SQL注入知识](./security-audit/sql-injection-knowledge.md)
- **权限管理** → [DBA安全规则](./security-audit/dba-security-rules.md)
- **数据加密** → [数据库特定安全](./security-audit/database-specific-security.md)
- **审计日志** → [DBA安全规则](./security-audit/dba-security-rules.md)

### 2. 团队规范

团队规范提供SQL编码标准、命名规范、数据库设计最佳实践，确保团队协作的一致性和代码质量。

#### 核心文件
- [团队规范索引](./team-standards/README.md) - 团队规范总览
- [SQL语法指南](./team-standards/sql-syntax-guide.md) - SQL语法基础和最佳实践
- [SQL编码标准](./team-standards/sql-coding-standards.md) - 编码风格和命名规范
- [数据库设计最佳实践](./team-standards/database-design-best-practices.md) - 数据库设计原则和模式

#### 快速导航
- **SQL语法** → [SQL语法指南](./team-standards/sql-syntax-guide.md)
- **编码规范** → [SQL编码标准](./team-standards/sql-coding-standards.md)
- **命名规范** → [SQL编码标准](./team-standards/sql-coding-standards.md#命名规范)
- **数据库设计** → [数据库设计最佳实践](./team-standards/database-design-best-practices.md)
- **版本控制** → [SQL编码标准](./team-standards/sql-coding-standards.md#版本控制规范)

### 3. 性能分析

性能分析规则帮助优化SQL查询性能、提高系统响应速度，包括查询优化、索引设计、执行计划分析等。

#### 核心文件
- [性能分析规则索引](./performance-analysis/README.md) - 性能分析规则总览
- [查询优化指南](./performance-analysis/query-optimization-guide.md) - SQL查询优化技巧
- [索引优化指南](./performance-analysis/index-optimization-guide.md) - 索引设计和优化策略
- [执行计划分析](./performance-analysis/execution-plan-analysis.md) - SQL执行计划分析
- [SQL性能调优](./performance-analysis/sql-performance-tuning.md) - 综合性能调优方法
- [数据库特定优化](./performance-analysis/database-specific-optimization.md) - 各数据库系统优化技巧

#### 快速导航
- **查询优化** → [查询优化指南](./performance-analysis/query-optimization-guide.md)
- **索引优化** → [索引优化指南](./performance-analysis/index-optimization-guide.md)
- **执行计划** → [执行计划分析](./performance-analysis/execution-plan-analysis.md)
- **性能调优** → [SQL性能调优](./performance-analysis/sql-performance-tuning.md)
- **MySQL优化** → [数据库特定优化](./performance-analysis/database-specific-optimization.md#1-mysql优化)
- **PostgreSQL优化** → [数据库特定优化](./performance-analysis/database-specific-optimization.md#2-postgresql优化)
- **SQL Server优化** → [数据库特定优化](./performance-analysis/database-specific-optimization.md#3-sql-server优化)
- **Oracle优化** → [数据库特定优化](./performance-analysis/database-specific-optimization.md#4-oracle优化)

## 按数据库类型导航

### MySQL
- **安全规则** → [数据库特定安全](./security-audit/database-specific-security.md#1-mysql安全)
- **语法指南** → [SQL语法指南](./team-standards/sql-syntax-guide.md#mysql语法特性)
- **性能优化** → [数据库特定优化](./performance-analysis/database-specific-optimization.md#1-mysql优化)

### PostgreSQL
- **安全规则** → [数据库特定安全](./security-audit/database-specific-security.md#2-postgresql安全)
- **语法指南** → [SQL语法指南](./team-standards/sql-syntax-guide.md#postgresql语法特性)
- **性能优化** → [数据库特定优化](./performance-analysis/database-specific-optimization.md#2-postgresql优化)

### SQL Server
- **安全规则** → [数据库特定安全](./security-audit/database-specific-security.md#3-sql-server安全)
- **语法指南** → [SQL语法指南](./team-standards/sql-syntax-guide.md#sql-server语法特性)
- **性能优化** → [数据库特定优化](./performance-analysis/database-specific-optimization.md#3-sql-server优化)

### Oracle
- **安全规则** → [数据库特定安全](./security-audit/database-specific-security.md#4-oracle安全)
- **语法指南** → [SQL语法指南](./team-standards/sql-syntax-guide.md#oracle语法特性)
- **性能优化** → [数据库特定优化](./performance-analysis/database-specific-optimization.md#4-oracle优化)

### SQLite
- **安全规则** → [数据库特定安全](./security-audit/database-specific-security.md#5-sqlite安全)
- **语法指南** → [SQL语法指南](./team-standards/sql-syntax-guide.md#sqlite语法特性)
- **性能优化** → [数据库特定优化](./performance-analysis/database-specific-optimization.md#5-sqlite优化)

## 按使用场景导航

### 新手入门
1. [SQL语法指南](./team-standards/sql-syntax-guide.md) - 学习SQL基础语法
2. [SQL编码标准](./team-standards/sql-coding-standards.md) - 了解编码规范
3. [数据库设计最佳实践](./team-standards/database-design-best-practices.md) - 学习数据库设计

### 安全审计
1. [SQL注入知识](./security-audit/sql-injection-knowledge.md) - 了解SQL注入风险
2. [DBA安全规则](./security-audit/dba-security-rules.md) - 学习安全管理
3. [数据库特定安全](./security-audit/database-specific-security.md) - 了解数据库安全特性

### 性能优化
1. [查询优化指南](./performance-analysis/query-optimization-guide.md) - 学习查询优化
2. [索引优化指南](./performance-analysis/index-optimization-guide.md) - 了解索引设计
3. [执行计划分析](./performance-analysis/execution-plan-analysis.md) - 学习执行计划分析

### 团队协作
1. [SQL编码标准](./team-standards/sql-coding-standards.md) - 统一编码规范
2. [数据库设计最佳实践](./team-standards/database-design-best-practices.md) - 统一设计标准
3. [SQL语法指南](./team-standards/sql-syntax-guide.md) - 统一语法使用

## 常见问题快速解答

### 如何防止SQL注入？
参考：[SQL注入知识](./security-audit/sql-injection-knowledge.md)

### 如何优化慢查询？
参考：[查询优化指南](./performance-analysis/query-optimization-guide.md)

### 如何设计合理的数据库结构？
参考：[数据库设计最佳实践](./team-standards/database-design-best-practices.md)

### 如何创建高效的索引？
参考：[索引优化指南](./performance-analysis/index-optimization-guide.md)

### 如何规范SQL编码风格？
参考：[SQL编码标准](./team-standards/sql-coding-standards.md)

### 如何分析执行计划？
参考：[执行计划分析](./performance-analysis/execution-plan-analysis.md)

## 更新日志

### v2.0.0 (当前版本)
- 按照安全审计、团队规范、性能分析三个维度重组规则库
- 整合和优化内容，删除重复部分
- 添加各维度的索引文件，方便快速查找
- 创建总索引文件，提供全局导航

### v1.0.0 (原版本)
- 按数据库类型和功能分类的规则库
- 包含各数据库系统的语法、优化和安全规则

## 贡献指南

如果您想为规则库做出贡献，请遵循以下原则：

1. **内容组织**：按照安全审计、团队规范、性能分析三个维度组织内容
2. **避免重复**：在添加新内容前，检查是否已有类似内容
3. **保持一致**：遵循现有的格式和风格
4. **提供示例**：尽可能提供实际的SQL示例
5. **注明来源**：如果内容来自外部资源，请注明来源

## 联系方式

如有问题或建议，请通过以下方式联系：
- 创建Issue
- 提交Pull Request
- 发送邮件

---

*最后更新：2023年*