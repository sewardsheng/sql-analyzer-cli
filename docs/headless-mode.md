# Headless 模式集成指南

本指南介绍如何使用 SQL Analyzer 的 Headless 模式，实现自动化、程序化的 SQL 分析。

## 🚀 快速开始

### 什么是 Headless 模式？

Headless 模式是一种无界面、程序化友好的分析模式，特别适用于：

- **CI/CD 流水线集成**：在自动化构建中检查 SQL 质量
- **Pre-commit 钩子**：提交前自动验证 SQL
- **批处理脚本**：批量分析多个 SQL 文件
- **API 服务集成**：作为后端服务的一部分
- **自动化测试**：在测试流程中验证 SQL

### 核心特性

- ✅ **灵活的输出格式**：JSON、结构化文本、简洁摘要
- ✅ **可配置的阈值**：根据评分自动设置退出码
- ✅ **静默模式**：最小化输出，便于日志分析
- ✅ **管道友好**：支持 stdout 输出和文件输出
- ✅ **快速执行**：比完整分析快 60-80%

## 📋 基本用法

### 1. 简单示例

```bash
# 基本 headless 分析（使用快速模式）
bun run src/index.js analyze -f query.sql --quick --headless

# 指定输出格式
bun run src/index.js analyze -f query.sql --quick --headless --format json

# 设置评分阈值和退出码
bun run src/index.js analyze -f query.sql --quick --headless --threshold 80 --exit-code
```

### 2. 配置文件

在项目根目录创建 `.env` 文件：

```bash
# 复制示例配置
cp .env.example .env

# 编辑配置文件
nano .env
```

关键配置项：

```env
# Headless 模式配置
HEADLESS_DEFAULT_FORMAT=summary      # 默认输出格式
HEADLESS_DEFAULT_THRESHOLD=70        # 默认评分阈值
```

### 3. 命令行参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--headless` | 启用 headless 模式 | false |
| `--format <format>` | 输出格式 (json\|structured\|summary) | summary |
| `--threshold <score>` | 评分阈值 (0-100) | 70 |
| `--exit-code` | 根据阈值设置退出码 | false |
| `--pipe` | 管道模式，输出到 stdout | false |
| `--output-file <file>` | 输出到文件 | - |
| `--quiet` | 静默模式 | false |

## 📊 输出格式

### Summary 格式（默认）

简洁的一行摘要，适合人类阅读：

```bash
bun run src/index.js analyze -f query.sql --quick --headless
```

输出：
```
✓ 通过 - 评分: 85/70 (mysql)
```

### Structured 格式

结构化的键值对文本，易于脚本解析：

```bash
bun run src/index.js analyze -f query.sql --quick --headless --format structured
```

输出：
```
STATUS: PASS
SCORE: 85
THRESHOLD: 70
DATABASE: mysql

CRITICAL_ISSUES: 0
```

### JSON 格式

完整的 JSON 输出，适合程序化处理：

```bash
bun run src/index.js analyze -f query.sql --quick --headless --format json
```

输出：
```json
{
  "status": "pass",
  "score": 85,
  "threshold": 70,
  "databaseType": "mysql",
  "criticalIssues": [],
  "suggestions": [
    {
      "category": "良好实践",
      "description": "查询简洁高效",
      "example": "保持当前写法"
    }
  ],
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 静默模式

静默模式最小化输出，只显示最基本的结果，适合自动化脚本和日志分析：

```bash
bun run src/index.js analyze -f query.sql --quick --headless --quiet
```

输出：
```
PASS: 85/70
```

与其他输出格式结合：

```bash
# 静默模式 + JSON 输出
bun run src/index.js analyze -f query.sql --quick --headless --format json --quiet

# 静默模式 + 结构化输出
bun run src/index.js analyze -f query.sql --quick --headless --format structured --quiet
```

静默模式在 CI/CD 环境中的优势：
- 减少日志噪音
- 只关注关键信息（状态和评分）
- 便于自动化工具解析和处理

## 🔧 使用场景

### 场景 1：CI/CD 集成

#### GitHub Actions 示例

```yaml
name: SQL Quality Check

on: [push, pull_request]

jobs:
  sql-check:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
    
    - name: Install SQL Analyzer
      run: bun install
    
    - name: Configure
      run: |
        echo "CUSTOM_API_KEY=${{ secrets.API_KEY }}" >> .env
        echo "HEADLESS_DEFAULT_THRESHOLD=75" >> .env
    
    - name: Analyze SQL files
      run: |
        find . -name "*.sql" | while read file; do
          echo "Checking $file..."
          bun run src/index.js analyze -f "$file" \
            --quick --headless --format json \
            --threshold 75 --exit-code --quiet
        done
```

#### GitLab CI 示例

```yaml
sql_check:
  stage: test
  image: oven/bun:latest
  before_script:
    - bun install
  script:
    - echo "CUSTOM_API_KEY=$API_KEY" >> .env
    - |
      find . -name "*.sql" | while read file; do
        bun run src/index.js analyze -f "$file" \
          --quick --headless --exit-code --quiet
      done
  only:
    - merge_requests
    - main
```

### 场景 2：Pre-commit 钩子

安装 pre-commit 钩子：

```bash
# 复制脚本到 Git 钩子目录
cp scripts/pre-commit.js .git/hooks/pre-commit

# 或使用安装脚本
bun run scripts/install-pre-commit.js

# 设置执行权限（Unix/Linux/Mac）
chmod +x .git/hooks/pre-commit
```

钩子会自动：
- 检测暂存的 SQL 文件
- 使用 headless 模式分析
- 根据评分阈值决定是否允许提交
- 显示详细的问题报告

跳过检查（特殊情况）：
```bash
git commit -m "feat: add feature [skip-sql-check]"
```

### 场景 3：批量处理

批量分析脚本示例：

#### Unix/Linux/Mac 版本

```bash
#!/bin/bash

# 设置配置
export HEADLESS_DEFAULT_THRESHOLD=80

# 创建结果目录
mkdir -p sql_reports

# 批量分析
for file in sql/*.sql; do
  filename=$(basename "$file" .sql)
  echo "Analyzing $file..."
  
  bun run src/index.js analyze -f "$file" \
    --quick --headless --format json \
    --output-file "sql_reports/${filename}_report.json" \
    --threshold 80 --exit-code
  
  if [ $? -eq 0 ]; then
    echo "✓ $file passed"
  else
    echo "✗ $file failed"
  fi
done
```

#### Windows PowerShell 版本

```powershell
# 设置配置
$env:HEADLESS_DEFAULT_THRESHOLD = "80"

# 创建结果目录
New-Item -ItemType Directory -Force -Path "sql_reports"

# 批量分析
Get-ChildItem -Path "sql" -Filter "*.sql" | ForEach-Object {
  $file = $_
  $filename = $file.BaseName
  Write-Host "Analyzing $($file.FullName)..."
  
  & bun run src/index.js analyze -f "$($file.FullName)" `
    --quick --headless --format json `
    --output-file "sql_reports/${filename}_report.json" `
    --threshold 80 --exit-code
  
  if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ $($file.Name) passed"
  } else {
    Write-Host "✗ $($file.Name) failed"
  }
}
```

### 场景 4：管道处理

将结果传递给其他工具：

#### Unix/Linux/Mac 版本

```bash
# 使用 jq 过滤 JSON 结果
bun run src/index.js analyze -f query.sql --quick --headless --format json --pipe | \
  jq '.criticalIssues[] | select(.severity == "高")'

# 生成报告
bun run src/index.js analyze -f query.sql --quick --headless --format json --pipe | \
  python generate_report.py

# 发送到监控系统
bun run src/index.js analyze -f query.sql --quick --headless --format json --pipe | \
  curl -X POST -H "Content-Type: application/json" \
       -d @- https://monitoring.example.com/api/sql-metrics
```

#### Windows PowerShell 版本

```powershell
# 使用 PowerShell 过滤 JSON 结果
$result = bun run src/index.js analyze -f query.sql --quick --headless --format json --pipe | ConvertFrom-Json
$result.criticalIssues | Where-Object { $_.severity -eq "高" } | ForEach-Object {
  Write-Output "$($_.type): $($_.description)"
}

# 生成报告
$result = bun run src/index.js analyze -f query.sql --quick --headless --format json --pipe | ConvertFrom-Json
python generate_report.py $result

# 发送到监控系统
$result = bun run src/index.js analyze -f query.sql --quick --headless --format json --pipe | ConvertFrom-Json
$body = $result | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "https://monitoring.example.com/api/sql-metrics" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

### 场景 5：静默模式应用

静默模式在自动化流程中特别有用，以下是几个实际应用场景：

#### CI/CD 日志优化

在持续集成环境中，使用静默模式可以减少日志噪音，只保留关键信息：

```bash
# 批量分析多个SQL文件，只输出失败项
find . -name "*.sql" | while read file; do
  result=$(bun run src/index.js analyze -f "$file" --quick --headless --quiet --exit-code)
  if [ $? -ne 0 ]; then
    echo "SQL检查失败: $file - $result"
  fi
done
```

#### 定时任务输出

在定时任务（cron job）中，静默模式可以避免不必要的邮件通知：

```bash
# 每日SQL质量检查，只在有问题时发送邮件
0 8 * * * /path/to/check_sql.sh | grep -q "FAIL" && mail -s "SQL质量问题" admin@example.com
```

check_sql.sh 内容：
```bash
#!/bin/bash
has_failed=false
for file in /path/to/sql/*.sql; do
  result=$(bun run src/index.js analyze -f "$file" --quick --headless --quiet --threshold 80 --exit-code)
  if [ $? -ne 0 ]; then
    echo "FAIL: $file - $result"
    has_failed=true
  fi
done

if [ "$has_failed" = false ]; then
  echo "所有SQL文件检查通过"
fi
```

#### 监控系统集成

将静默模式结果集成到监控系统：

```bash
# 将结果发送到监控系统
result=$(bun run src/index.js analyze -f query.sql --quick --headless --quiet --format json)
score=$(echo $result | jq -r '.score')
status=$(echo $result | jq -r '.status')

# 发送指标到监控系统
curl -X POST -H "Content-Type: application/json" \
  -d "{\"metric\":\"sql_quality_score\",\"value\":$score,\"tags\":{\"file\":\"query.sql\",\"status\":\"$status\"}}" \
  https://monitoring.example.com/api/metrics
```

#### 自动化报告生成

静默模式结合脚本可以生成简洁的报告：

```bash
#!/bin/bash
# 生成SQL质量报告

echo "SQL质量报告 - $(date)" > report.txt
echo "========================" >> report.txt

total=0
passed=0
failed=0

for file in sql/*.sql; do
  total=$((total + 1))
  result=$(bun run src/index.js analyze -f "$file" --quick --headless --quiet --exit-code)
  if [ $? -eq 0 ]; then
    passed=$((passed + 1))
  else
    failed=$((failed + 1))
    echo "失败: $file - $result" >> report.txt
  fi
done

echo "" >> report.txt
echo "总计: $total" >> report.txt
echo "通过: $passed" >> report.txt
echo "失败: $failed" >> report.txt
echo "通过率: $((passed * 100 / total))%" >> report.txt

# 发送报告
mail -s "SQL质量报告" team@example.com < report.txt
```

## 🎯 评分规则

### 快速模式权重配置

```javascript
{
  scoreWeights: {
    security: 0.50,    // 安全权重 50%（最重要）
    performance: 0.30, // 性能权重 30%
    standards: 0.20    // 规范权重 20%
  }
}
```

### 评分等级

| 评分范围 | 状态 | 退出码 | 说明 |
|---------|------|--------|------|
| 80-100 | ✅ 优秀 | 0 | 高质量 SQL |
| 70-79  | ⚠️ 良好 | 0 | 通过检查 |
| 60-69  | ⚠️ 一般 | 0/1 | 根据阈值 |
| 0-59   | ❌ 不合格 | 1 | 需要改进 |

### 阈值建议

- **严格模式**：`--threshold 80` - 适合核心业务 SQL
- **标准模式**：`--threshold 70` - 适合一般开发（默认）
- **宽松模式**：`--threshold 60` - 适合遗留代码

## 🛠️ 高级用法

### 1. 自定义配置

通过配置文件设置默认行为：

```javascript
// config.js
export default {
  headless: {
    defaultFormat: 'json',
    defaultThreshold: 75,
    scoreWeights: {
      security: 0.60,     // 提高安全权重
      performance: 0.25,
      standards: 0.15
    }
  }
}
```

### 2. 结果后处理

JavaScript 示例：

```javascript
import { execSync } from 'child_process';

// 执行分析
const result = JSON.parse(
  execSync('bun run src/index.js analyze -f query.sql --quick --headless --format json --pipe')
);

// 处理结果
if (result.status === 'fail') {
  console.error('SQL 检查失败！');
  result.criticalIssues.forEach(issue => {
    console.error(`- ${issue.type}: ${issue.description}`);
  });
  process.exit(1);
}

// 生成报告
generateReport(result);
```

Python 示例：

```python
import subprocess
import json

# 执行分析
result = subprocess.run(
    ['bun', 'run', 'src/index.js', 'analyze', '-f', 'query.sql', 
     '--quick', '--headless', '--format', 'json', '--pipe'],
    capture_output=True, text=True
)

# 解析结果
data = json.loads(result.stdout)

# 检查状态
if data['status'] == 'fail':
    print('SQL 检查失败！')
    for issue in data['criticalIssues']:
        print(f"- {issue['type']}: {issue['description']}")
    exit(1)
```

### 3. 并行处理

利用多核 CPU 提高批量分析速度：

#### Unix/Linux/Mac 版本

```bash
# GNU Parallel 示例
find . -name "*.sql" | parallel -j 4 \
  'bun run src/index.js analyze -f {} --quick --headless --exit-code'

# xargs 示例
find . -name "*.sql" | xargs -P 4 -I {} \
  bun run src/index.js analyze -f {} --quick --headless --exit-code
```

#### Windows PowerShell 版本

```powershell
# 使用 PowerShell 并行处理
$files = Get-ChildItem -Recurse -Filter "*.sql"
$files | ForEach-Object -Parallel {
  $file = $_
  & bun run src/index.js analyze -f "$($file.FullName)" --quick --headless --exit-code
} -ThrottleLimit 4

# 或者使用 Start-Job 并行处理
$jobs = @()
$files = Get-ChildItem -Recurse -Filter "*.sql"

foreach ($file in $files) {
  $jobs += Start-Job -ScriptBlock {
    param($filePath, $bunPath)
    & $bunPath run src/index.js analyze -f $filePath --quick --headless --exit-code
  } -ArgumentList $file.FullName, "bun"
}

# 等待所有作业完成并获取结果
$jobs | Wait-Job | Receive-Job
$jobs | Remove-Job
```

## 🧪 测试和验证

### 单元测试集成

```javascript
// test/sql-validation.test.js
import { execSync } from 'child_process';
import { test, expect } from 'bun:test';

test('SQL should pass quality check', () => {
  const sql = 'SELECT id, name FROM users WHERE id = ? LIMIT 10';
  
  const result = JSON.parse(
    execSync(`bun run src/index.js analyze --sql "${sql}" --quick --headless --format json --pipe`)
  );
  
  expect(result.status).toBe('pass');
  expect(result.score).toBeGreaterThanOrEqual(70);
});
```

### 集成测试

运行完整的测试套件：

```bash
# 运行 headless 模式测试
bun run test/test_headless.js

# 设置自定义阈值
HEADLESS_DEFAULT_THRESHOLD=80 bun run test/test_headless.js
```

## 📈 性能优化

### 快速模式的优势

- **执行时间**：比完整分析快 60-80%
- **API 调用**：减少 70% 的大模型调用
- **资源消耗**：降低 60% 的内存使用
- **准确性**：专注于关键问题，准确率 >90%

### 最佳实践

1. **使用快速模式**：`--quick` 参数启用快速分析
2. **合理设置阈值**：根据项目需求调整阈值
3. **批量并行处理**：利用多核 CPU 加速
4. **缓存结果**：避免重复分析未修改的文件
5. **静默模式**：`--quiet` 减少不必要的输出

### 性能对比

| 分析模式 | 平均耗时 | API 调用 | 适用场景 |
|---------|---------|---------|---------|
| 完整模式 | ~15s | 5-6次 | 详细审查 |
| 快速模式 | ~5s | 1-2次 | 自动化检查 |
| Headless | ~4s | 1-2次 | CI/CD 集成 |

## 🔗 故障排除

### 常见问题

**1. 退出码始终为 0**

检查是否使用了 `--exit-code` 参数：
```bash
bun run src/index.js analyze -f query.sql --quick --headless --exit-code
```

**2. JSON 格式解析失败**

确保使用了正确的格式参数：
```bash
bun run src/index.js analyze -f query.sql --quick --headless --format json
```

**3. 阈值未生效**

检查配置优先级（命令行 > 环境变量 > 配置文件）：
```bash
# 命令行优先级最高
bun run src/index.js analyze -f query.sql --quick --headless --threshold 80 --exit-code
```

**4. 输出到文件失败**

确保目录存在且有写入权限：
```bash
mkdir -p reports
bun run src/index.js analyze -f query.sql --quick --headless --output-file reports/result.json
```

### 调试模式

启用详细输出：

```bash
# 设置环境变量
export DEBUG=true

# 运行分析（不使用 --quiet）
bun run src/index.js analyze -f query.sql --quick --headless
```

### 获取帮助

查看完整的命令帮助：

```bash
bun run src/index.js analyze --help
```

## 🔗 相关文档

- [安装指南](installation.md)
- [配置管理](configuration.md)
- [使用指南](usage.md)
- [规则配置](rules-configuration.md)

## 📝 示例项目

完整的示例项目请参考：

- [GitHub Actions 集成示例](.github/workflows/)
- [Pre-commit 钩子脚本](scripts/pre-commit.js)
- [批处理示例脚本](examples/batch-analysis.sh)