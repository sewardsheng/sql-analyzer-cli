# SQL规则生成器

基于SQL分析结果生成标准化审核规则。

## 输入参数
- `{{sqlQuery}}`: SQL查询语句
- `{{analysisResult}}`: 分析结果(JSON)
- `{{databaseType}}`: 数据库类型
- `{{existingRules}}`: 现有规则(可选)

## 规则生成标准

### 1. 规则结构
```json
{
  "id": "UUID",
  "title": "规则标题(≤30字)",
  "category": "performance|security|standards",
  "type": "规则类型(如:索引优化,SQL注入防护,编码规范等)",
  "severity": "critical|high|medium|low",
  "triggerCondition": "检测条件描述",
  "patternRegex": "正则表达式(可选)",
  "description": "问题描述(50-100字)",
  "impact": "影响说明",
  "recommendation": "修复建议(30-60字)",
  "confidence": 0.0-1.0,
  "examples": [{"bad": "", "good": "", "explanation": ""}]
}
```

### 2. 优先级
- **Critical**: SQL注入、数据泄露
- **High**: 索引缺失、全表扫描  
- **Medium**: JOIN优化、格式问题
- **Low**: 命名规范、注释

### 3. 质量要求
- 基于实际分析证据
- 触发条件可程序检测
- 建议具体可实施
- 避免与现有规则重复

## 输出格式
```json
{
  "metadata": {
    "generatedAt": "ISO时间",
    "databaseType": "{{databaseType}}",
    "totalRules": 0
  },
  "rules": [/* 规则数组 */],
  "summary": {
    "totalRules": 0,
    "byCategory": {"performance": 0, "security": 0, "standards": 0},
    "bySeverity": {"critical": 0, "high": 0, "medium": 0, "low": 0}
  }
}
```

## 生成策略

### 性能规则
- 索引缺失 → 建议添加索引
- SELECT * → 建议指定字段
- 前导通配符 → 建议全文索引
- 大表无WHERE → 建议添加条件

### 安全规则  
- 动态SQL拼接 → 建议参数化查询
- 权限绕过 → 建议严格权限控制
- 敏感数据暴露 → 建议字段脱敏

### 规范规则
- 命名不规范 → 建议统一命名
- 缺少注释 → 建议添加说明
- 格式混乱 → 建议统一格式

## 示例

### 输入
```sql
SELECT * FROM users WHERE name LIKE '%admin%'
```

### 输出  
```json
{
  "metadata": {
    "generatedAt": "2024-01-01T12:00:00Z",
    "databaseType": "MySQL",
    "totalRules": 1
  },
  "rules": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "避免前导通配符LIKE查询",
      "category": "performance",
      "severity": "medium",
      "triggerCondition": "LIKE子句包含前导通配符%",
      "patternRegex": "LIKE\\s+['\"].*%.*['\"]",
      "description": "前导通配符导致索引失效，引发全表扫描",
      "impact": "大表查询性能严重下降",
      "recommendation": "使用全文索引或避免前导通配符",
      "confidence": 0.9,
      "examples": [
        {
          "bad": "SELECT * FROM users WHERE name LIKE '%admin%'",
          "good": "SELECT * FROM users WHERE MATCH(name) AGAINST('admin')",
          "explanation": "全文索引提供高效文本搜索"
        }
      ]
    }
  ],
  "summary": {
    "totalRules": 1,
    "byCategory": {"performance": 1, "security": 0, "standards": 0},
    "bySeverity": {"critical": 0, "high": 0, "medium": 1, "low": 0}
  }
}
```

## 注意事项
1. 只基于实际分析结果生成规则
2. 每个问题类型最多生成1条规则  
3. 避免过度复杂的规则条件
4. 确保建议的技术可行性
5. 保持规则标题简洁明确

基于提供的分析结果，生成相应的SQL审核规则。