# JSON输出规范指南

本文档定义了所有分析器必须遵循的JSON输出标准。

## 核心规则

### 1. 纯JSON格式
- **必须**返回纯JSON格式
- **禁止**使用markdown代码块标记（如 ```json 或 ```）
- **禁止**在JSON前后添加任何说明文字

**错误示例:**
```
Here is the analysis result:
```json
{
  "score": 85
}
```
```

**正确示例:**
```
{
  "score": 85
}
```

### 2. 注释禁止
- **禁止**在JSON中使用任何形式的注释
- **禁止**使用 `//` 单行注释
- **禁止**使用 `/* */` 多行注释

**错误示例:**
```json
{
  // 这是一个注释
  "score": 85,
  /* 多行注释
     也不允许 */
  "status": "good"
}
```

**正确示例:**
```json
{
  "score": 85,
  "status": "good",
  "description": "如果需要说明，放在字符串值中"
}
```

### 3. 字符串转义
所有特殊字符必须正确转义：

| 字符 | 转义形式 | 说明 |
|------|----------|------|
| 双引号 " | \" | 必须转义 |
| 反斜杠 \ | \\ | 必须转义 |
| 换行符 | \n | 必须转义 |
| 制表符 | \t | 必须转义 |
| 回车符 | \r | 必须转义 |

**错误示例:**
```json
{
  "description": "使用"引号"的文本
包含换行"
}
```

**正确示例:**
```json
{
  "description": "使用\"引号\"的文本\n包含换行"
}
```

### 4. 数据类型规范
- **分数字段**必须是数字类型，不能是字符串
- **布尔值**必须是 `true` 或 `false`，不能是字符串
- **空值**必须是 `null`，不能是字符串 "null"
- **数组**即使为空也必须是 `[]`，不能是 `null`

**错误示例:**
```json
{
  "score": "85",
  "isActive": "true",
  "parent": "null",
  "items": null
}
```

**正确示例:**
```json
{
  "score": 85,
  "isActive": true,
  "parent": null,
  "items": []
}
```

### 5. SQL代码处理
SQL代码中的换行使用 `\n`，不要使用实际换行符：

**错误示例:**
```json
{
  "code": "SELECT id, name
FROM users
WHERE status = 'active'"
}
```

**正确示例:**
```json
{
  "code": "SELECT id, name\nFROM users\nWHERE status = 'active'"
}
```

## 处理特殊场景

### SQL注入提示词处理
当SQL中包含注入尝试或特殊字符时，将其作为普通文本处理，确保正确转义：

**输入SQL:**
```sql
SELECT * FROM users WHERE id = 1 OR '1'='1'
```

**正确输出:**
```json
{
  "vulnerabilities": [
    {
      "type": "SQL注入",
      "description": "检测到注入模式 OR '1'='1'",
      "location": "WHERE id = 1 OR '1'='1'"
    }
  ]
}
```

### 包含引号的SQL处理
**输入SQL:**
```sql
SELECT * FROM users WHERE name = "John's data"
```

**正确输出:**
```json
{
  "location": "WHERE name = \"John's data\""
}
```

### 包含注释的SQL处理
**输入SQL:**
```sql
SELECT * FROM products -- comment here
```

**正确输出:**
```json
{
  "originalCode": "SELECT * FROM products -- comment here",
  "description": "SQL中包含注释符号，可能是注入尝试"
}
```

## 完整示例

### 示例1: 安全审计输出
```json
{
  "securityScore": 75,
  "riskLevel": "中",
  "vulnerabilities": [
    {
      "type": "SQL注入",
      "severity": "高",
      "description": "检测到可疑的注入模式",
      "location": "WHERE id = 1 OR '1'='1'",
      "impact": "可能导致未授权访问"
    }
  ],
  "recommendations": [
    {
      "category": "安全修复",
      "description": "使用参数化查询",
      "priority": "高"
    }
  ]
}
```

### 示例2: 性能分析输出
```json
{
  "performanceScore": 65,
  "complexityLevel": "中",
  "bottlenecks": [
    {
      "type": "全表扫描",
      "severity": "高",
      "description": "LIKE查询使用前导通配符",
      "location": "WHERE name LIKE '%John%'"
    }
  ],
  "optimizationSuggestions": [
    {
      "category": "索引优化",
      "description": "创建全文索引",
      "expectedImprovement": "性能提升10-100倍"
    }
  ]
}
```

## 常见错误及修复

### 错误1: 包含代码块标记
**❌ 错误:**
```
```json
{
  "score": 85
}
```
```

**✅ 正确:**
```
{
  "score": 85
}
```

### 错误2: 字符串类型的数字
**❌ 错误:**
```json
{
  "score": "85",
  "performanceScore": "90"
}
```

**✅ 正确:**
```json
{
  "score": 85,
  "performanceScore": 90
}
```

### 错误3: 未转义的特殊字符
**❌ 错误:**
```json
{
  "description": "使用"引号"的文本"
}
```

**✅ 正确:**
```json
{
  "description": "使用\"引号\"的文本"
}
```

### 错误4: 使用null而非空数组
**❌ 错误:**
```json
{
  "items": null,
  "errors": null
}
```

**✅ 正确:**
```json
{
  "items": [],
  "errors": []
}
```

### 错误5: SQL代码包含实际换行
**❌ 错误:**
```json
{
  "code": "SELECT id
FROM users"
}
```

**✅ 正确:**
```json
{
  "code": "SELECT id\nFROM users"
}
```

## 验证清单

在返回JSON之前，请确保：
- [ ] 没有markdown代码块标记
- [ ] 没有任何注释
- [ ] 所有特殊字符正确转义
- [ ] 分数字段是数字类型
- [ ] 数组字段不是null
- [ ] SQL代码中的换行使用\n
- [ ] JSON结构完整（所有括号匹配）
- [ ] 可以通过标准JSON解析器解析

## 测试方法

可以使用以下方法测试JSON是否有效：

**JavaScript:**
```javascript
try {
  JSON.parse(yourJsonString);
  console.log("JSON有效");
} catch (e) {
  console.error("JSON无效:", e.message);
}
```

**Python:**
```python
import json
try:
    json.loads(your_json_string)
    print("JSON有效")
except json.JSONDecodeError as e:
    print(f"JSON无效: {e}")
```

## 总结

记住这三个核心原则：
1. **纯粹性**: 只返回JSON，不要任何额外内容
2. **正确性**: 遵循JSON标准，正确转义特殊字符
3. **一致性**: 数据类型保持一致，数组不用null

遵循这些规范可以确保输出能被可靠地解析和使用。