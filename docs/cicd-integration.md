# CI/CD 集成指南

本指南介绍如何将 SQL Analyzer 快速模式集成到 CI/CD 流水线中，实现 SQL 提交前的自动扫描。

## 🚀 快速开始

### 1. 基本配置

在项目根目录创建 `.env` 文件：

```bash
# 复制示例配置
cp .env.example .env

# 编辑配置文件
nano .env
```

关键配置项：

```env
# CI/CD 快速模式配置
CICD_QUICK_MODE=true                    # 启用快速模式
CICD_SCORE_THRESHOLD=70                 # 评分阈值（低于此分数阻止提交）
CICD_BLOCK_ON_CRITICAL=true             # 发现严重问题立即阻止
CICD_ENABLE_JSON_OUTPUT=true            # 启用JSON输出格式
```

### 2. Pre-commit 钩子

安装 pre-commit 钩子：

```bash
# 复制 pre-commit 脚本
cp scripts/pre-commit.js .git/hooks/pre-commit

# 设置执行权限
chmod +x .git/hooks/pre-commit
```

### 3. CI/CD 流水线集成

#### GitHub Actions 示例

```yaml
name: SQL Analysis

on: [push, pull_request]

jobs:
  sql-analysis:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
      with:
        bun-version: latest
    
    - name: Install dependencies
      run: bun install
    
    - name: Configure SQL Analyzer
      run: |
        echo "CUSTOM_API_KEY=${{ secrets.API_KEY }}" >> .env
        echo "CICD_ENABLE_JSON_OUTPUT=true" >> .env
        echo "CICD_SCORE_THRESHOLD=75" >> .env
    
    - name: Analyze SQL files
      run: |
        # 查找所有SQL文件并分析
        find . -name "*.sql" -type f | while read file; do
          echo "Analyzing $file..."
          bun run src/index.js analyze -f "$file" --quick --cicd-mode
        done
```

#### GitLab CI 示例

```yaml
sql_analysis:
  stage: test
  image: oven/bun:latest
  before_script:
    - bun install
  script:
    - echo "CUSTOM_API_KEY=$API_KEY" >> .env
    - echo "CICD_ENABLE_JSON_OUTPUT=true" >> .env
    - find . -name "*.sql" -type f -exec bun run src/index.js analyze -f {} --quick --cicd-mode \;
  only:
    - merge_requests
    - main
```

## 📊 评分规则

### 快速模式权重配置

```javascript
{
  quickModeWeights: {
    security: 0.50,    // 安全权重50%（最重要）
    performance: 0.30, // 性能权重30%
    standards: 0.20    // 规范权重20%
  }
}
```

### 一票否决机制

以下问题会触发一票否决，强制降低评分：

- **SQL注入风险**：评分降至20分以下
- **语法错误**：评分降至20分以下  
- **全表扫描**：评分降至40分以下

### 评分等级

| 评分范围 | 状态 | 说明 |
|---------|------|------|
| 80-100 | ✅ 优秀 | 通过检查 |
| 70-79   | ⚠️  良好 | 通过检查 |
| 60-69   | ⚠️  一般 | 根据阈值决定 |
| 0-59    | ❌ 不合格 | 阻止提交 |

## 🔧 配置选项

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `CICD_QUICK_MODE` | `true` | 启用快速模式 |
| `CICD_SCORE_THRESHOLD` | `70` | 评分阈值 |
| `CICD_BLOCK_ON_CRITICAL` | `true` | 严重问题阻止提交 |
| `CICD_ENABLE_JSON_OUTPUT` | `true` | 启用JSON输出 |

### 命令行选项

```bash
# 快速分析模式
sql-analyzer analyze -f query.sql --quick

# CI/CD模式（启用评分检查和JSON输出）
sql-analyzer analyze -f query.sql --quick --cicd-mode

# 组合使用
sql-analyzer analyze -f query.sql --quick --cicd-mode --no-learn
```

## 📋 输出格式

### 标准输出

```bash
⚡ 快速评分: 85/100
🗄️  数据库类型: mysql
🚦 CI/CD检查状态: 通过
📊 评分阈值: 70/100
✅ 未发现关键问题
```

### JSON 输出（CI/CD模式）

```json
{
  "status": "pass",
  "score": 85,
  "scoreThreshold": 70,
  "criticalIssues": [],
  "summary": "SQL检查通过",
  "databaseType": "mysql",
  "hasBlocking": false,
  "ciMetadata": {
    "checkTime": "2024-01-01T12:00:00.000Z",
    "analyzerVersion": "1.0.0",
    "weightedScore": 85
  },
  "suggestions": [
    {
      "category": "良好实践",
      "description": "查询简洁高效",
      "example": "保持当前写法"
    }
  ]
}
```

## 🛠️ 故障排除

### 常见问题

1. **评分过低被阻止**
   - 检查是否有SQL注入风险
   - 避免使用 `SELECT *`
   - 添加适当的WHERE条件

2. **JSON解析失败**
   - 确保设置了 `CICD_ENABLE_JSON_OUTPUT=true`
   - 检查API密钥配置

3. **Pre-commit钩子不工作**
   - 确保钩子文件有执行权限
   - 检查Git仓库是否正确初始化

### 调试模式

启用详细输出：

```bash
# 设置环境变量
export DEBUG=true
export ENABLE_COLORS=false

# 运行分析
sql-analyzer analyze -f query.sql --quick --cicd-mode
```

### 跳过检查

在特殊情况下，可以通过提交消息跳过检查：

```bash
git commit -m "feat: add new feature [skip-sql-check]"
```

## 🧪 测试

运行CI/CD集成测试：

```bash
# 运行测试套件
bun run test/test_cicd_integration.js

# 测试特定场景
CICD_SCORE_THRESHOLD=80 bun run test/test_cicd_integration.js
```

## 📈 性能优化

### 快速模式优势

- **执行时间**：比完整分析快60-80%
- **资源消耗**：减少API调用次数
- **准确性**：专注于关键问题检测

### 最佳实践

1. **批量分析**：使用脚本批量处理多个文件
2. **缓存结果**：避免重复分析未修改的文件
3. **并行处理**：在CI/CD中并行分析多个文件

```bash
# 批量分析示例
for file in $(find . -name "*.sql"); do
  echo "Analyzing $file..."
  sql-analyzer analyze -f "$file" --quick --cicd-mode &
done
wait
```

## 🔗 相关文档

- [安装指南](installation.md)
- [配置管理](configuration.md)
- [GitHub工作流](github-workflow.md)
- [规则配置](rules-configuration.md)