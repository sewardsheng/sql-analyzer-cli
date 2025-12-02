# SQL Analyzer CI/CD 集成指南

本指南详细说明如何在不同的CI/CD平台中集成SQL Analyzer CLI，实现SQL提交前的自动安全扫描。

## 🚀 快速开始

### 1. 安装SQL Analyzer CLI

```bash
# 全局安装（推荐）
npm install -g sql-analyzer-cli

# 验证安装
sql-analyzer --version
```

### 2. 快速测试

```bash
# 扫描单个SQL文件
sql-analyzer analyze ./queries/user.sql

# 扫描整个SQL目录
sql-analyzer analyze ./migrations/

# 查看支持的输出格式
sql-analyzer analyze ./queries --format help
```

## 📋 支持的输出格式

| 格式 | 用途 | 适用平台 |
|------|------|----------|
| `console` | 控制台显示 | 本地开发 |
| `json` | 机器可读 | CI/CD集成 |
| `junit` | 测试工具 | Jenkins, GitLab CI |
| `github` | GitHub PR评论 | GitHub Actions |
| `sonar` | SonarQube格式 | SonarQube集成 |

## 🔧 GitHub Actions 集成

### 方式一：使用官方模板

1. 复制模板到你的项目：
```bash
cp .github/workflows/sql-security-scan.yml .github/workflows/
```

2. 根据项目需求调整模板：
   - 修改Node.js版本
   - 调整文件扫描路径
   - 配置失败条件

### 方式二：自定义Workflow

```yaml
# .github/workflows/sql-check.yml
name: SQL Security Check

on: [push, pull_request]

jobs:
  sql-check:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'

    - name: Install SQL Analyzer
      run: npm install -g sql-analyzer-cli

    - name: Run SQL Analysis
      run: |
        # 查找SQL文件
        SQL_FILES=$(find . -name "*.sql" -not -path "./node_modules/*" | tr '\n' ' ')

        if [ -n "$SQL_FILES" ]; then
          # 扫描并输出JSON格式
          sql-analyzer analyze $SQL_FILES --format json --output results.json

          # 检查是否有严重问题
          HIGH_ISSUES=$(node -e "console.log(JSON.parse(require('fs').readFileSync('results.json', 'utf8')).scanInfo?.issuesBySeverity?.high || 0)")

          if [ "$HIGH_ISSUES" -gt 0 ]; then
            echo "❌ Found high severity SQL issues"
            exit 1
          fi
        fi

    - name: Upload Results
      uses: actions/upload-artifact@v4
      with:
        name: sql-scan-results
        path: results.json
```

## 🔧 Jenkins Pipeline 集成

### 方式一：使用Jenkinsfile

1. 复制完整Jenkinsfile：
```bash
cp ci/jenkins/Jenkinsfile Jenkinsfile
```

2. 配置Jenkins项目使用该Jenkinsfile

### 方式二：简单脚本方式

```groovy
pipeline {
    agent any

    stages {
        stage('SQL Analysis') {
            steps {
                sh 'npm install -g sql-analyzer-cli'

                // 简单扫描方式
                sh '''
                    SQL_FILES=$(find . -name "*.sql" -not -path "./node_modules/*")
                    if [ -n "$SQL_FILES" ]; then
                        sql-analyzer analyze $SQL_FILES --format json > results.json

                        # 检查结果
                        HIGH_ISSUES=$(node -e "console.log(JSON.parse(require('fs').readFileSync('results.json', 'utf8')).scanInfo?.issuesBySeverity?.high || 0)")
                        if [ "$HIGH_ISSUES" -gt 0 ]; then
                            exit 1
                        fi
                    fi
                '''
            }
        }
    }
}
```

### 方式三：使用预构建脚本

```groovy
pipeline {
    agent any

    stages {
        stage('Setup') {
            steps {
                // 安装依赖和工具
                sh 'npm ci'
                sh 'npm run build'
            }
        }

        stage('SQL Security Check') {
            steps {
                // 使用预构建的扫描脚本
                sh './ci/jenkins/sql-scan-simple.sh'
            }
        }
    }
}
```

## 🔧 GitLab CI 集成

### 使用.gitlab-ci.yml

1. 复制模板：
```bash
cp .gitlab-ci.yml .gitlab-ci.yml
```

2. 自定义配置（可选）：
```yaml
variables:
  SQL_ANALYZER_NODE_VERSION: "18"
  SQL_ANALYZER_FAIL_ON_HIGH: "true"

stages:
  - setup
  - security

setup_sql_analyzer:
  stage: setup
  image: node:$SQL_ANALYZER_NODE_VERSION
  script:
    - npm install -g sql-analyzer-cli
  cache:
    key: sql-analyzer
    paths:
      - /usr/local/lib/node_modules/sql-analyzer-cli/

sql_security_scan:
  stage: security
  image: node:$SQL_ANALYZER_NODE_VERSION
  dependencies:
    - setup_sql_analyzer
  script:
    - npm run build
    - |
      SQL_FILES=$(find . -type f \( -name "*.sql" -o -name "*.SQL" \) -not -path "./node_modules/*" | tr '\n' ' ')
      if [ -n "$SQL_FILES" ]; then
        echo "Analyzing files: $SQL_FILES"
        node dist/cli/index.js analyze $SQL_FILES --format json > results.json

        if [ "$SQL_ANALYZER_FAIL_ON_HIGH" = "true" ]; then
          HIGH_ISSUES=$(node -e "console.log(JSON.parse(require('fs').readFileSync('results.json', 'utf8')).scanInfo?.issuesBySeverity?.high || 0)")
          if [ "$HIGH_ISSUES" -gt 0 ]; then
            echo "High severity SQL issues found!"
            exit 1
          fi
        fi
      fi
  artifacts:
    reports:
      junit: results.xml
    paths:
      - results.json
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

## 🔧 Git Hooks 集成

### 安装Git Hooks

```bash
# 安装所有hooks
./scripts/install-hooks.sh

# 只安装pre-commit hook
./scripts/install-hooks.sh --pre-commit

# 强制覆盖现有hooks
./scripts/install-hooks.sh --all --force
```

### 手动安装Pre-commit Hook

```bash
# 创建.git/hooks目录（如果不存在）
mkdir -p .git/hooks

# 复制hook脚本
cp scripts/git-hooks/pre-commit-simple .git/hooks/pre-commit

# 设置执行权限
chmod +x .git/hooks/pre-commit
```

### 自定义Pre-commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/sh

echo "🔍 SQL Security Pre-commit Check"

# 获取暂存的SQL文件
STAGED_SQL=$(git diff --cached --name-only --diff-filter=ACM | grep -E "\.(sql|SQL)$" || true)

if [ -z "$STAGED_SQL" ]; then
    echo "✅ No SQL files to check"
    exit 0
fi

# 检查SQL Analyzer
if ! command -v sql-analyzer &> /dev/null; then
    echo "Installing SQL Analyzer CLI..."
    npm install -g sql-analyzer-cli
fi

# 创建临时目录
TEMP_DIR=$(mktemp -d)

# 复制暂存文件
for file in $STAGED_SQL; do
    mkdir -p "$TEMP_DIR/$(dirname "$file")"
    git show ":$file" > "$TEMP_DIR/$file"
done

# 运行分析
if sql-analyzer analyze "$TEMP_DIR" --format json > /dev/null 2>&1; then
    echo "✅ SQL security check passed"
else
    echo "❌ SQL security check failed!"
    rm -rf "$TEMP_DIR"
    exit 1
fi

rm -rf "$TEMP_DIR"
```

## 📊 输出格式详解

### JSON格式（默认）

```json
{
  "scanInfo": {
    "timestamp": "2025-12-01T16:30:00Z",
    "version": "1.0.0",
    "duration": 1250,
    "filesScanned": 5,
    "totalIssues": 3,
    "issuesBySeverity": {
      "critical": 1,
      "high": 1,
      "medium": 1,
      "low": 0
    }
  },
  "results": [...]
}
```

### JUnit格式（用于测试报告）

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="SQL Analysis" tests="5" failures="2" time="0">
    <testcase classname="SQL Analysis" name="queries_user.sql" time="0">
      <failure message="SQL injection vulnerability detected">
        File: queries/user.sql
        Category: security
        Severity: critical
        Rule: sql_injection
      </failure>
    </testcase>
  </testsuite>
</testsuites>
```

### GitHub PR评论格式

```markdown
## 🔍 SQL Security Scan Results

### 📊 Summary
- **Files Scanned**: 25
- **Issues Found**: 47 (3 Critical, 12 High, 20 Medium, 12 Low)

### 🚨 Critical & High Issues

**queries/user.sql**
1. 🚨 **Security** - SQL injection vulnerability
   ```sql
   SELECT * FROM users WHERE name = ' + userInput
   ```
   **💡 Suggestion**: Use parameterized queries or prepared statements

### ✅ Actions Required
- [ ] **URGENT**: Fix all critical issues before merge
- [ ] Review all high severity issues
```

## 🔍 高级配置

### 1. 自定义规则配置

创建 `.sql-analyzer.json` 配置文件：

```json
{
  "version": "1.0",
  "scan": {
    "include": ["**/*.sql"],
    "exclude": ["node_modules/**", "**/test/**"],
    "maxFileSize": "10MB"
  },
  "rules": {
    "performance": {
      "enabled": true,
      "severity": "medium"
    },
    "security": {
      "enabled": true,
      "severity": "high"
    },
    "standards": {
      "enabled": true,
      "severity": "low"
    }
  },
  "output": {
    "format": "json",
    "includeSource": true,
    "groupBys": ["file", "severity"]
  }
}
```

### 2. 跳径和文件过滤

```bash
# 只扫描特定目录
sql-analyzer analyze ./migrations --include="**/*.sql"

# 排除测试文件
sql-analyzer analyze . --exclude="**/test/**" --exclude="**/spec/**"

# 按严重性过滤
sql-analyzer analyze ./sql --severity=critical,high
```

### 3. 批处理配置

```bash
# 设置批处理大小
sql-analyzer analyze ./sql --batch-size 50

# 并发处理
sql-analyzer analyze ./sql --concurrency 4

# 性能分析
sql-analyzer analyze ./sql --performance --security
```

## 🚨 故障排除

### 常见问题

#### 1. "sql-analyzer command not found"

**解决方案**：
```bash
npm install -g sql-analyzer-cli
```

#### 2. "No SQL files found"

**解决方案**：
- 检查项目路径是否正确
- 确认文件扩展名是否为 `.sql`
- 使用 `find . -name "*.sql"` 验证

#### 3. "JSON parsing failed"

**解决方案**：
- 检查文件权限
- 确认文件内容格式正确
- 尝试使用其他输出格式

#### 4. Hook脚本执行失败

**解决方案**：
```bash
# 检查hook权限
ls -la .git/hooks/pre-commit

# 手动测试hook
./.git/hooks/pre-commit

# 重新安装hooks
./scripts/install-hooks.sh --force
```

### 调试技巧

1. **本地测试**：
```bash
# 手动执行相同的命令
sql-analyzer analyze ./migrations --format json
```

2. **详细输出**：
```bash
# 使用控制台格式查看详细信息
sql-analyzer analyze ./migrations --format console
```

3. **检查结果**：
```bash
# 查看JSON结果
cat results.json | jq '.scanInfo'

# 统计问题数量
cat results.json | jq '.scanInfo.totalIssues'
```

## 📈 最佳实践

### 1. 项目配置

- 在项目根目录创建 `.sql-analyzer.json`
- 在 `.gitignore` 中添加 `sql-analysis-results/`
- 为不同环境创建不同配置文件

### 2. CI/CD优化

- 使用缓存减少安装时间
- 合理设置文件扫描范围
- 配置适当的失败条件
- 保存分析结果供审计

### 3. 团队协作

- 统一团队配置文件
- 定期更新规则库
- 建立代码审查流程
- 提供清晰的问题修复指导

### 4. 监控和报告

- 定期审查扫描结果
- 建立问题趋势分析
- 设置重要问题告警
- 生成安全报告

---

## 📞 获取帮助

- **项目文档**: README.md
- **GitHub Issues**: 报告问题和建议
- **更新日志**: CHANGELOG.md
- **技术支持**: 查看项目Wiki或联系维护团队

通过以上配置，你可以在开发、提交、部署的各个阶段实现SQL安全的自动化检测和防护！