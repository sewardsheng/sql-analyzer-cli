# SQL Analyzer CLI 规则配置指南

本指南将详细介绍如何为 SQL Analyzer CLI 配置和自定义规则，以提高 SQL 分析的准确性和适应性。

## 目录

- [规则系统概述](#规则系统概述)
- [默认规则结构](#默认规则结构)
- [自定义规则创建](#自定义规则创建)
- [规则管理](#规则管理)
- [高级规则配置](#高级规则配置)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

## 规则系统概述

SQL Analyzer CLI 的规则系统是其核心功能之一，它基于预定义和自定义的 SQL 最佳实践规则来分析和评估 SQL 代码。这些规则涵盖了编码规范、性能优化、安全性等多个方面。

### 规则类型

1. **编码规范规则** - 关于 SQL 代码风格和命名约定的规则
2. **性能优化规则** - 关于 SQL 查询性能和索引使用的规则
3. **安全规则** - 关于 SQL 安全性和数据保护的规则
4. **数据库特定规则** - 针对特定数据库系统（如 MySQL、PostgreSQL）的规则

### 规则工作原理

当您执行 SQL 分析时，系统会：

1. 将输入的 SQL 语句转换为向量表示
2. 在知识库中查找与 SQL 语句相关的规则
3. 使用大型语言模型（LLM）评估 SQL 语句是否符合这些规则
4. 提供具体的改进建议和最佳实践

## 默认规则结构

SQL Analyzer CLI 默认提供以下规则类别：

### 1. SQL 编码规范 (`sql_coding_standards.md`)

包含以下方面的规则：
- 命名规范（表名、列名、索引名）
- 格式规范（关键字大小写、缩进、对齐）
- 注释规范（单行注释、多行注释）

### 2. SQL 安全规则 (`sql_security.md`)

包含以下方面的规则：
- SQL 注入防护
- 敏感数据处理
- 数据库连接安全

### 3. MySQL 性能优化规则 (`mysql_performance.md`)

包含以下方面的规则：
- 索引优化
- 查询优化
- 表结构优化

## 自定义规则创建

### 创建自定义规则目录

首先，创建一个目录来存放您的自定义规则：

```bash
mkdir -p ./custom-rules/{performance,security,best-practices}
```

### 规则文件格式

规则文件应该是 Markdown 格式（.md），包含以下结构：

```markdown
# 规则类别名称

## 规则组名称

### 规则名称

#### 规则描述
简要描述规则的用途和重要性

#### 错误示例
```sql
-- 展示违反规则的 SQL 代码
SELECT * FROM users WHERE name LIKE '%search%';
```

#### 正确示例
```sql
-- 展示符合规则的 SQL 代码
SELECT * FROM users WHERE name LIKE 'search%';
```

#### 原因解释
详细解释为什么应该遵循这个规则，以及违反规则可能导致的后果

#### 额外建议（可选）
提供额外的实施建议或相关最佳实践
```

### 示例：创建 PostgreSQL 特定规则

创建 `./custom-rules/postgresql-specific.md`：

```markdown
# PostgreSQL 特定规则

## 查询优化

### 使用 EXPLAIN ANALYZE 分析查询

#### 规则描述
在 PostgreSQL 中，使用 EXPLAIN ANALYZE 来分析查询执行计划，识别性能瓶颈。

#### 错误示例
```sql
-- 直接执行复杂查询，不了解其执行计划
SELECT u.name, COUNT(o.id) as order_count
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2023-01-01'
GROUP BY u.name
ORDER BY order_count DESC;
```

#### 正确示例
```sql
-- 先分析查询执行计划
EXPLAIN ANALYZE
SELECT u.name, COUNT(o.id) as order_count
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2023-01-01'
GROUP BY u.name
ORDER BY order_count DESC;
```

#### 原因解释
EXPLAIN ANALYZE 提供了查询的实际执行计划和统计信息，帮助识别全表扫描、排序操作等性能问题，从而进行针对性优化。

### 使用适当的索引类型

#### 规则描述
根据查询模式选择 PostgreSQL 中最合适的索引类型（B-tree、Hash、GiST、SP-GiST、GIN 和 BRIN）。

#### 错误示例
```sql
-- 为全文搜索使用默认 B-tree 索引
CREATE INDEX idx_articles_content ON articles(content);
```

#### 正确示例
```sql
-- 为全文搜索使用 GIN 索引
CREATE INDEX idx_articles_content_gin ON articles USING gin(to_tsvector('english', content));
```

#### 原因解释
不同的索引类型适用于不同的查询模式。GIN 索引对于全文搜索和包含多个键的查询效率更高，而 B-tree 索引适用于范围查询和排序。
```

### 示例：创建业务特定规则

创建 `./custom-rules/business-logic.md`：

```markdown
# 业务逻辑规则

## 数据一致性

### 使用事务处理相关操作

#### 规则描述
当执行多个相关的数据库操作时，使用事务确保数据一致性。

#### 错误示例
```sql
-- 非事务性操作，可能导致数据不一致
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
```

#### 正确示例
```sql
-- 使用事务确保操作原子性
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

#### 原因解释
事务确保一组数据库操作要么全部成功，要么全部失败，防止部分操作成功导致的数据不一致问题。

### 实现软删除而非物理删除

#### 规则描述
使用软删除（标记为已删除）而非物理删除，保留数据历史记录和审计跟踪。

#### 错误示例
```sql
-- 物理删除数据，无法恢复
DELETE FROM users WHERE id = 123;
```

#### 正确示例
```sql
-- 软删除，保留数据
UPDATE users SET deleted_at = NOW(), is_active = false WHERE id = 123;
```

#### 原因解释
软删除保留了数据的历史记录，便于审计、恢复和分析，同时避免了外键约束问题。
```

## 规则管理

### 加载自定义规则

创建自定义规则后，使用以下命令加载到知识库：

```bash
# 加载默认规则
sql-analyzer learn

# 加载自定义规则
sql-analyzer learn --rules-dir ./custom-rules

# 强制重新加载（覆盖现有知识库）
sql-analyzer learn --rules-dir ./custom-rules --force
```

### 查看规则状态

```bash
# 查看知识库状态
sql-analyzer status
```

### 更新规则

当规则文件修改后，需要重新加载规则：

```bash
sql-analyzer learn --rules-dir ./custom-rules --force
```

### 版本控制规则

建议将自定义规则纳入版本控制系统：

```bash
git init
git add .
git commit -m "Initial SQL rules"
git remote add origin <your-repo-url>
git push -u origin main
```

## 高级规则配置

### 规则优先级

虽然规则系统没有显式的优先级设置，但可以通过以下方式影响规则的重要性：

1. **规则位置** - 将更重要的规则放在文件前面
2. **规则详细程度** - 更详细的规则通常会被更严格地应用
3. **规则类别** - 安全规则通常比编码规范规则更重要

### 规则条件化

您可以为规则添加条件，使其仅适用于特定场景：

```markdown
### 大表查询限制

#### 规则描述
对于超过 100 万行的表，必须使用 LIMIT 子句限制结果集。

#### 适用条件
- 表行数 > 1,000,000
- 查询不包含 WHERE 子句或 WHERE 子句不能有效过滤数据

#### 错误示例
```sql
-- 可能导致性能问题
SELECT * FROM large_table;
```

#### 正确示例
```sql
-- 限制结果集大小
SELECT * FROM large_table LIMIT 1000;
```
```

### 规则测试

创建测试 SQL 文件来验证规则是否按预期工作：

```bash
# 创建测试文件
mkdir -p ./rule-tests
echo "SELECT * FROM users WHERE name LIKE '%search%';" > ./rule-tests/performance-test.sql
echo "DELETE FROM users WHERE id = 123;" > ./rule-tests/business-logic-test.sql

# 测试规则
sql-analyzer analyze -f ./rule-tests/performance-test.sql
sql-analyzer analyze -f ./rule-tests/business-logic-test.sql
```

## 最佳实践

### 1. 规则组织

- 按类别组织规则（性能、安全、编码规范等）
- 为不同数据库创建专门的规则文件
- 为特定业务场景创建专门的规则文件

### 2. 规则编写

- 使用清晰、简洁的语言描述规则
- 提供具体的错误和正确示例
- 解释规则背后的原因和好处
- 考虑规则的适用场景和例外情况

### 3. 规则维护

- 定期审查和更新规则
- 根据实际使用情况调整规则
- 收集开发团队的反馈
- 跟踪规则对分析结果的影响

### 4. 团队协作

- 与 DBA 和开发团队协作创建规则
- 建立规则审查流程
- 为新规则提供培训和文档
- 定期分享规则使用经验

### 5. 规则版本管理

```bash
# 为不同环境维护不同规则集
./rules/
├── common/              # 通用规则
├── development/         # 开发环境规则
├── staging/            # 测试环境规则
└── production/         # 生产环境规则
```

## 常见问题

### Q: 如何处理规则冲突？

A: 当不同规则之间存在冲突时：

1. 优先考虑安全规则
2. 根据具体业务场景权衡
3. 在规则文档中明确说明例外情况
4. 考虑创建特定场景的规则文件

### Q: 规则太多会影响分析性能吗？

A: 是的，大量规则可能会影响分析性能。解决方案：

1. 按需加载规则（使用不同的规则目录）
2. 定期清理不再需要的规则
3. 合并相似的规则
4. 使用更高效的向量存储

### Q: 如何评估规则的有效性？

A: 评估规则有效性的方法：

1. 跟踪规则建议的采纳率
2. 监控应用规则后的性能改进
3. 收集开发团队的反馈
4. 定期审查规则建议的质量

### Q: 可以为不同项目使用不同规则吗？

A: 是的，方法如下：

1. 为每个项目创建专门的规则目录
2. 使用项目特定的配置文件
3. 在 CI/CD 流水线中加载相应规则
4. 使用环境变量指定规则目录

```bash
# 项目特定规则加载
sql-analyzer learn --rules-dir ./project-a-rules
```

### Q: 如何处理数据库特定规则？

A: 处理数据库特定规则的方法：

1. 为每个数据库创建专门的规则文件
2. 在规则文件名中明确数据库类型
3. 在规则描述中说明适用的数据库版本
4. 根据连接的数据库类型加载相应规则

```bash
# 根据数据库类型加载规则
if [ "$DB_TYPE" = "postgresql" ]; then
  sql-analyzer learn --rules-dir ./rules/postgresql
elif [ "$DB_TYPE" = "mysql" ]; then
  sql-analyzer learn --rules-dir ./rules/mysql
fi
```

---

通过合理配置和自定义规则，SQL Analyzer CLI 可以更好地适应您的特定需求和业务场景，提供更有针对性的 SQL 分析和建议。