# SQL Analyzer CLI - 快速开始

## 🚀 5分钟快速集成

### 1. 安装SQL Analyzer CLI

```bash
# 全局安装
npm install -g sql-analyzer-cli

# 验证安装
sql-analyzer --version
```

### 2. 测试SQL扫描

```bash
# 扫描当前目录的SQL文件
sql-analyzer analyze . --format console

# 扫描特定目录
sql-analyzer analyze ./migrations/
```

### 3. 集成到CI/CD

#### GitHub Actions（最简单）
1. 复制模板到你的项目：
```bash
cp .github/workflows/sql-scan-simple.yml .github/workflows/
```

2. 推送代码，自动触发扫描

#### Jenkins（最简单）
```bash
# 使用预构建脚本
./ci/jenkins/sql-scan-simple.sh
```

#### Git Hooks（最简单）
```bash
# 一键安装hooks
./scripts/install-hooks.sh

# 提交时自动检查
git commit -m "test commit"
```

## 📋 支持的输出格式

| 格式 | 命令示例 | 用途 |
|------|----------|------|
| 控制台 | `--format console` | 本地开发查看 |
| JSON | `--format json` | CI/CD机器处理 |
| JUnit | `--format junit` | 测试报告工具 |
| GitHub | `--format github` | PR评论 |
| SonarQube | `--format sonar` | 代码质量分析 |

## 🔧 基本使用

### 扫描单个文件
```bash
sql-analyzer analyze ./queries/user.sql --format json
```

### 扫描目录
```bash
sql-analyzer analyze ./migrations/ --format json --output results.json
```

### 保存结果到文件
```bash
sql-analyzer analyze ./sql --format json --output scan-results.json
sql-analyzer analyze ./sql --format junit --output junit-results.xml
sql-analyzer analyze ./sql --format github --output pr-comment.md
```

## 🚀 常见CI/CD集成

### GitHub Actions
```yaml
name: SQL Scan

on: [push, pull_request]

jobs:
  sql-scan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
    - name: Install SQL Analyzer
      run: npm install -g sql-analyzer-cli
    - name: Scan SQL Files
      run: |
        SQL_FILES=$(find . -name "*.sql" -not -path "./node_modules/*")
        if [ -n "$SQL_FILES" ]; then
          sql-analyzer analyze $SQL_FILES --format json > results.json
          # 检查高严重性问题
          HIGH_ISSUES=$(node -e "console.log(JSON.parse(require('fs').readFileSync('results.json', 'utf8')).scanInfo?.issuesBySeverity?.high || 0)")
          if [ "$HIGH_ISSUES" -gt 0 ]; then
            echo "❌ High severity issues found"
            exit 1
          fi
        fi
```

### Jenkins Pipeline
```groovy
pipeline {
    agent any
    stages {
        stage('SQL Scan') {
            steps {
                sh 'npm install -g sql-analyzer-cli'
                sh 'npm run build'
                sh '''
                    SQL_FILES=$(find . -name "*.sql" -not -path "./node_modules/*")
                    if [ -n "$SQL_FILES" ]; then
                        node dist/cli/index.js analyze $SQL_FILES --format json > results.json
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

### GitLab CI
```yaml
stages:
  - security

sql_security_scan:
  stage: security
  image: node:18
  script:
    - npm ci
    - npm run build
    - |
      SQL_FILES=$(find . -name "*.sql" -not -path "./node_modules/*")
      if [ -n "$SQL_FILES" ]; then
        node dist/cli/index.js analyze $SQL_FILES --format json > results.json
        node dist/cli/index.js analyze $SQL_FILES --format junit > results.xml
      fi
  artifacts:
    reports:
      junit: results.xml
    paths:
      - results.json
```

## 🔧 Git Hooks 自动化

### 安装Pre-commit Hook（推荐）
```bash
# 一键安装
./scripts/install-hooks.sh --pre-commit

# 测试hook
git add .
git commit -m "test: add sql file"  # 会自动触发扫描
```

### 手动安装Hook
```bash
mkdir -p .git/hooks
cp scripts/git-hooks/pre-commit-simple .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## 📊 结果解读

### JSON格式结果
```json
{
  "scanInfo": {
    "filesScanned": 5,
    "totalIssues": 3,
    "issuesBySeverity": {
      "critical": 1,
      "high": 1,
      "medium": 1,
      "low": 0
    }
  }
}
```

### 控制台输出示例
```
📋 分析完成！
  📁 文件: ./queries/user.sql
  ⚠️  发现 3 个问题
    🔴 严重: SQL注入风险
    🟡  高: 缺少索引
    🟡  中: 命名不规范
  💡 修复建议: 使用参数化查询
```

## ⚠️ 常见问题

### 命令未找到
```bash
# 解决方案
npm install -g sql-analyzer-cli
```

### 扫描失败
```bash
# 检查文件权限
ls -la *.sql

# 使用绝对路径
sql-analyzer analyze /path/to/sql-files
```

### Hook不执行
```bash
# 检查权限
ls -la .git/hooks/pre-commit

# 重新安装
./scripts/install-hooks.sh --force

# 跳过hook测试
git commit --no-verify
```

## 📈 高级功能

### 自定义配置文件
```json
{
  "rules": {
    "security": {
      "enabled": true,
      "severity": "high"
    }
  },
  "output": {
    "format": "json",
    "groupBys": ["severity"]
  }
}
```

### 文件过滤
```bash
# 只扫描包含的文件
sql-analyzer analyze ./ --include="**/*.sql"

# 排除测试文件
sql-analyzer analyze . --exclude="**/test/**"

# 只检查严重问题
sql-analyzer analyze . --severity=critical,high
```

### 批量配置
```bash
# 并发处理
sql-analyzer analyze . --concurrency 4

# 批处理大小
sql-analyzer analyze . --batch-size 50
```

## 🔗 相关链接

- [完整文档](./CI_INTEGRATION.md)
- [项目主页](https://github.com/your-org/sql-analyzer-cli)
- [问题反馈](https://github.com/your-org/sql-analyzer-cli/issues)
- [更新日志](./CHANGELOG.md)

---

## 💡 专业建议

1. **开发阶段**: 使用控制台格式查看详细问题
2. **提交阶段**: 配置pre-commit hook自动检查
3. **CI/CD阶段**: 使用JSON/JUnit格式集成
4. **PR阶段**: 使用GitHub格式自动评论

开始使用SQL Analyzer CLI，让你的SQL代码更安全、更规范！