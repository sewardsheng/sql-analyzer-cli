# SQL安全审计规则索引

本目录包含SQL安全审计相关的规则和知识库，用于识别和防范SQL安全风险。

## 文件列表

1. **[dba-security-rules.md](./dba-security-rules.md)**
   - 数据库管理员安全规则配置
   - 包含访问控制、SQL注入防护、数据保护等10项规则

2. **[sql-injection-knowledge.md](./sql-injection-knowledge.md)**
   - SQL注入攻击知识库
   - 包含攻击技术、检测与防御方法

3. **[database-specific-security.md](./database-specific-security.md)**
   - 各数据库特定的安全规则
   - 包含MySQL、PostgreSQL、SQL Server、Oracle和SQLite的安全规则

## 快速导航

### 按安全主题

- **访问控制**: [dba-security-rules.md](./dba-security-rules.md#访问控制), [database-specific-security.md](./database-specific-security.md#访问控制)
- **SQL注入防护**: [sql-injection-knowledge.md](./sql-injection-knowledge.md), [dba-security-rules.md](./dba-security-rules.md#sql注入防护)
- **数据加密**: [dba-security-rules.md](./dba-security-rules.md#数据加密), [database-specific-security.md](./database-specific-security.md#数据加密)
- **审计日志**: [database-specific-security.md](./database-specific-security.md#审计日志)

### 按数据库类型

- **MySQL**: [database-specific-security.md](./database-specific-security.md#mysql安全规则)
- **PostgreSQL**: [database-specific-security.md](./database-specific-security.md#postgresql安全规则)
- **SQL Server**: [database-specific-security.md](./database-specific-security.md#sql-server安全规则)
- **Oracle**: [database-specific-security.md](./database-specific-security.md#oracle安全规则)
- **SQLite**: [database-specific-security.md](./database-specific-security.md#sqlite安全规则)

## 安全审计检查清单

参考 [database-specific-security.md](./database-specific-security.md#安全审计检查清单) 中的完整检查清单，确保您的SQL环境符合安全最佳实践。

## 相关资源

- [团队规范](../team-standards/) - 了解编码和命名规范
- [性能分析](../performance-analysis/) - 了解安全与性能的平衡