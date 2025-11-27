# SQL性能分析规则索引

本目录包含SQL性能分析相关的规则和最佳实践，帮助您优化数据库查询性能、提高系统响应速度。

## 文件列表

1. [查询优化指南](./query-optimization-guide.md) - SQL查询优化的基础知识和技巧
2. [索引优化指南](./index-optimization-guide.md) - 数据库索引设计和优化策略
3. [执行计划分析](./execution-plan-analysis.md) - 如何分析SQL执行计划并优化查询
4. [SQL性能调优](./sql-performance-tuning.md) - 综合性能调优方法和最佳实践
5. [数据库特定优化](./database-specific-optimization.md) - 针对不同数据库系统的特定优化技巧

## 按主题分类

### 查询优化
- [查询优化指南](./query-optimization-guide.md) - 基础查询优化技巧
- [执行计划分析](./execution-plan-analysis.md) - 深入理解查询执行过程
- [SQL性能调优](./sql-performance-tuning.md) - 综合性能调优方法

### 索引优化
- [索引优化指南](./index-optimization-guide.md) - 索引设计原则和策略
- [数据库特定优化](./database-specific-optimization.md) - 各数据库系统的索引特性

### 数据库特定优化
- [数据库特定优化](./database-specific-optimization.md) - MySQL、PostgreSQL、SQL Server、Oracle等特定优化

## 按数据库类型分类

### MySQL优化
- [查询优化指南](./query-optimization-guide.md) - MySQL查询优化
- [索引优化指南](./index-optimization-guide.md) - MySQL索引优化
- [数据库特定优化](./database-specific-optimization.md#1-mysql优化) - MySQL特定优化技巧

### PostgreSQL优化
- [查询优化指南](./query-optimization-guide.md) - PostgreSQL查询优化
- [索引优化指南](./index-optimization-guide.md) - PostgreSQL索引优化
- [数据库特定优化](./database-specific-optimization.md#2-postgresql优化) - PostgreSQL特定优化技巧

### SQL Server优化
- [查询优化指南](./query-optimization-guide.md) - SQL Server查询优化
- [索引优化指南](./index-optimization-guide.md) - SQL Server索引优化
- [数据库特定优化](./database-specific-optimization.md#3-sql-server优化) - SQL Server特定优化技巧

### Oracle优化
- [查询优化指南](./query-optimization-guide.md) - Oracle查询优化
- [索引优化指南](./index-optimization-guide.md) - Oracle索引优化
- [数据库特定优化](./database-specific-optimization.md#4-oracle优化) - Oracle特定优化技巧

### SQLite优化
- [查询优化指南](./query-optimization-guide.md) - SQLite查询优化
- [索引优化指南](./index-optimization-guide.md) - SQLite索引优化
- [数据库特定优化](./database-specific-optimization.md#5-sqlite优化) - SQLite特定优化技巧

### NoSQL优化
- [数据库特定优化](./database-specific-optimization.md#6-nosql数据库优化) - MongoDB和Redis优化技巧

## 性能优化检查清单

### 查询优化检查清单
- [ ] 避免使用SELECT *
- [ ] 在WHERE子句中使用索引列
- [ ] 避免在WHERE子句中对列使用函数
- [ ] 使用LIMIT限制结果集大小
- [ ] 避免使用OR条件，考虑使用UNION
- [ ] 避免使用LIKE前导通配符
- [ ] 优化JOIN操作
- [ ] 使用EXISTS替代IN
- [ ] 避免使用子查询，考虑使用JOIN
- [ ] 分析执行计划

### 索引优化检查清单
- [ ] 为常用查询条件创建索引
- [ ] 创建复合索引考虑列的选择性
- [ ] 避免过多索引影响写入性能
- [ ] 定期分析索引使用情况
- [ ] 删除未使用的索引
- [ ] 重建碎片化严重的索引
- [ ] 考虑使用覆盖索引
- [ ] 对于低基数列考虑位图索引
- [ ] 使用部分索引减少索引大小
- [ ] 考虑使用函数索引

### 数据库配置优化检查清单
- [ ] 合理配置内存参数
- [ ] 优化I/O设置
- [ ] 配置合适的连接池大小
- [ ] 启用查询缓存
- [ ] 优化事务隔离级别
- [ ] 配置合适的日志设置
- [ ] 定期更新统计信息
- [ ] 监控数据库性能指标
- [ ] 设置适当的超时参数
- [ ] 优化并发控制参数

## 性能分析工具

### 执行计划分析工具
- MySQL: EXPLAIN, EXPLAIN ANALYZE
- PostgreSQL: EXPLAIN, EXPLAIN ANALYZE, EXPLAIN (FORMAT JSON)
- SQL Server: Execution Plan, SET STATISTICS PROFILE
- Oracle: EXPLAIN PLAN, AUTOTRACE
- SQLite: EXPLAIN QUERY PLAN

### 性能监控工具
- MySQL: Performance Schema, Slow Query Log
- PostgreSQL: pg_stat_* views, pg_stat_statements
- SQL Server: DMVs, Extended Events
- Oracle: AWR, ASH, Statspack
- SQLite: sqlite3_analyzer

## 性能优化案例

### 查询优化案例
1. [使用索引优化慢查询](./query-optimization-guide.md#查询优化案例)
2. [JOIN优化技巧](./query-optimization-guide.md#join优化技巧)
3. [子查询优化](./query-optimization-guide.md#子查询优化)

### 索引优化案例
1. [复合索引设计](./index-optimization-guide.md#复合索引设计)
2. [覆盖索引应用](./index-optimization-guide.md#覆盖索引)
3. [索引维护策略](./index-optimization-guide.md#索引维护)

### 数据库特定优化案例
1. [MySQL分区表优化](./database-specific-optimization.md#12-分区表优化)
2. [PostgreSQL物化视图](./database-specific-optimization.md#23-物化视图)
3. [SQL Server列存储索引](./database-specific-optimization.md#34-列存储索引)

## 相关资源

- [安全审计规则](../security-audit/README.md)
- [团队规范](../team-standards/README.md)
- [SQL语法指南](../generic/syntax/syntax-guide.md)
- [学习资源](../learning-rules/README.md)