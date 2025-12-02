# SQL测试用例集

本目录包含了用于测试SQL Analyzer CLI功能的各类SQL测试用例，按照问题类型进行分类组织。

## 目录结构

### 性能问题测试用例 (performance-problems/)
1. **index-issues.sql** - 索引相关问题
   - 缺少索引的查询
   - 复合索引使用不当
   - 函数调用导致索引失效
   - LIKE查询索引失效
   - OR条件索引使用问题
   - 隐式类型转换
   - NOT操作符
   - IS NULL/IS NOT NULL
   - 负向查询
   - 大范围扫描

2. **join-issues.sql** - JOIN优化问题
   - 笛卡尔积
   - 大表驱动小表
   - 子查询未优化为JOIN
   - EXISTS子查询性能问题
   - 多表JOIN无优化
   - CROSS JOIN性能问题
   - 自连接性能问题
   - 多对多关系JOIN
   - JOIN条件使用函数
   - 复杂JOIN嵌套

3. **query-design-issues.sql** - 查询设计问题
   - SELECT *性能问题
   - 深度分页性能问题
   - OR条件使用不当
   - 重复计算
   - 过度使用DISTINCT
   - 大结果集排序
   - 不必要的子查询
   - 复杂表达式在WHERE条件
   - GROUP BY过度聚合
   - HAVING子句性能问题
   - 临时表使用
   - 全文搜索性能问题
   - 批量插入单条执行
   - 不必要的数据类型转换
   - 模糊查询优化问题

### 安全问题测试用例 (security-issues/)
1. **sql-injection.sql** - SQL注入风险
   - 字符串拼接风险
   - 动态SQL构建风险
   - LIKE操作注入风险
   - IN子句注入风险
   - ORDER BY注入风险
   - WHERE条件注入风险
   - 存储过程注入风险
   - 批量操作注入风险
   - 时间注入风险
   - 分页注入风险
   - 联合查询注入风险
   - 函数调用注入风险
   - 视图定义注入风险
   - 触发器注入风险
   - 配置注入风险

2. **privilege-issues.sql** - 权限相关问题
   - 过度权限查询
   - 跨租户数据访问
   - 敏感系统表查询
   - 绕过权限检查
   - 越权操作查询
   - 备份数据访问
   - 调试信息暴露
   - 事务隔离性问题
   - 日志查询权限问题
   - 配置信息访问
   - 会话管理权限问题
   - 数据导出权限问题
   - 统计数据权限问题
   - 权限升级尝试
   - 审计绕过

3. **sensitive-data-exposure.sql** - 敏感数据暴露
   - 明文密码查询
   - 敏感字段无保护
   - 个人隐私数据暴露
   - API密钥和令牌暴露
   - 系统配置暴露
   - 日志中的敏感信息
   - 备份数据暴露
   - 第三方集成数据
   - 通信内容暴露
   - 位置信息暴露
   - 健康信息暴露
   - 财务信息暴露
   - 教育记录暴露
   - 法律记录暴露
   - 生物识别数据暴露
   - 调试信息中的敏感数据

### 规范问题测试用例 (standards-violations/)
1. **naming-conventions.sql** - 命名规范问题
   - 表名不规范
   - 列名不规范
   - 别名不规范
   - 索引名不规范
   - 约束名不规范
   - 视图名不规范
   - 存储过程名不规范
   - 函数名不规范
   - 触发器名不规范
   - 临时表名不规范
   - 变量名不规范
   - 游标名不规范
   - 数据库名不规范
   - 模式名不规范
   - 列名长度不规范

2. **code-style.sql** - 代码风格问题
   - 大小写不一致
   - 格式混乱
   - 缺少注释
   - 过度复杂的一行语句
   - 缩进不一致
   - 字符串引号使用不一致
   - 数字格式不一致
   - 空格使用不规范
   - 换行不规范
   - 逗号位置不一致
   - 括号使用不规范
   - 操作符空格不一致
   - 列表格式不规范
   - 表连接格式不规范
   - 注释风格不一致
   - 保留字作为标识符

### 复杂查询测试用例 (complex-queries/)
1. **window-functions.sql** - 窗口函数
   - 基本窗口函数 (ROW_NUMBER, RANK, DENSE_RANK)
   - 分位数函数 (NTILE)
   - LAG和LEAD函数
   - FIRST_VALUE和LAST_VALUE
   - 聚合窗口函数
   - 复杂窗口框架
   - 多个窗口函数组合
   - 复杂条件窗口函数
   - 动态窗口框架
   - 嵌套窗口函数
   - 复杂分析查询
   - 时间序列窗口分析
   - 复杂业务逻辑窗口查询

2. **common-table-expressions.sql** - 公用表表达式(CTE)
   - 基本CTE使用
   - 多层CTE嵌套
   - 递归CTE - 层级数据
   - 递归CTE - 产品分类树
   - CTE与聚合函数结合
   - CTE用于数据清洗和转换
   - CTE用于复杂业务逻辑计算
   - CTE用于时间序列分析
   - CTE用于复杂条件筛选
   - CTE用于复杂的报表查询

3. **stored-procedures.sql** - 存储过程
   - 基本存储过程
   - 带条件逻辑的存储过程
   - 带循环的存储过程
   - 带异常处理的存储过程
   - 带动态SQL的存储过程
   - 带输出参数的复杂存储过程
   - 带递归逻辑的存储过程
   - 带批量处理的存储过程
   - 带性能监控的存储过程

## 使用方法

### 单个测试文件执行
```sql
-- 在数据库中执行单个测试文件
SOURCE /path/to/performance-problems/index-issues.sql;
```

### 批量测试执行
```bash
# 使用脚本批量执行所有测试文件
for file in src/__tests__/fixtures/sql/**/*.sql; do
    echo "Executing $file"
    mysql -u username -p database_name < "$file"
done
```

### 在测试框架中使用
```javascript
// 在Vitest测试中使用
import { readFileSync } from 'fs';
import { resolve } from 'path';

const sqlContent = readFileSync(
  resolve(__dirname, '../fixtures/sql/performance-problems/index-issues.sql'),
  'utf8'
);

// 在测试中使用SQL内容
test('should detect index issues', async () => {
  const result = await sqlAnalyzer.analyze(sqlContent);
  expect(result.issues).toContainEqual(
    expect.objectContaining({
      type: 'performance',
      category: 'index'
    })
  );
});
```

## 测试覆盖范围

### 性能问题覆盖
- ✅ 索引优化问题 (10个测试用例)
- ✅ JOIN优化问题 (10个测试用例)
- ✅ 查询设计问题 (15个测试用例)
- 🔄 覆盖率目标: 90%

### 安全问题覆盖
- ✅ SQL注入风险 (15个测试用例)
- ✅ 权限相关问题 (15个测试用例)
- ✅ 敏感数据暴露 (16个测试用例)
- 🔄 覆盖率目标: 95%

### 规范问题覆盖
- ✅ 命名规范问题 (15个测试用例)
- ✅ 代码风格问题 (16个测试用例)
- 🔄 覆盖率目标: 85%

### 复杂查询覆盖
- ✅ 窗口函数 (15个测试用例)
- ✅ 公用表表达式 (10个测试用例)
- ✅ 存储过程 (9个测试用例)
- 🔄 覆盖率目标: 80%

## 预期结果

每个测试用例都应有对应的分析结果：

- **问题类型**: performance, security, standards
- **问题类别**: index, join, injection, privilege, naming, style等
- **严重程度**: critical, high, medium, low
- **建议类型**: 优化建议、安全建议、规范建议

## 贡献指南

### 添加新测试用例
1. 确定测试用例分类和文件位置
2. 在相应文件中添加SQL语句
3. 添加详细的注释说明问题原因
4. 更新本README文档

### 测试用例格式
```sql
-- 问题类型和编号
-- 问题描述：详细说明问题所在
-- 建议解决方案：说明如何优化

-- 实际SQL测试用例
SELECT * FROM table WHERE condition;
```

### 质量要求
- SQL语法正确
- 问题描述清晰
- 注释详细完整
- 符合分类标准

---

本测试用例集将持续更新和完善，以确保SQL Analyzer CLI能够准确识别和解决各类SQL问题。