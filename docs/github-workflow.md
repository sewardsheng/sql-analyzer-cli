# SQL Analyzer 集成指南

本指南介绍如何将SQL Analyzer工具集成到您的开发流程中，包括本地Pre-commit钩子和GitHub Actions工作流，实现全面的SQL代码质量检查。

## 📋 目录

1. [概述](#概述)
2. [Pre-commit本地集成](#pre-commit本地集成)
3. [GitHub Actions工作流集成](#github-actions工作流集成)
4. [环境设置](#环境设置)
5. [自定义配置](#自定义配置)
6. [故障排除](#故障排除)

## 📖 概述

SQL Analyzer提供了两种主要的代码质量保障机制：

1. **本地Pre-commit钩子**：在提交前自动检查SQL文件，提供即时反馈
2. **GitHub Actions工作流**：在CI/CD流程中自动分析SQL文件，确保代码质量

这两种机制可以单独使用，也可以组合使用，确保SQL代码在整个开发流程中的质量。

## 🔧 Pre-commit本地集成

### 1. 安装SQL Analyzer

首先，确保您的系统上已安装SQL Analyzer CLI工具：

```bash
# 全局安装
npm install -g sql-analyzer-cli

# 或者使用Bun
bun install -g sql-analyzer-cli

# 或者从源码安装
git clone https://github.com/sewardsheng/sql-analyzer-cli.git
cd sql-analyzer-cli
bun install
bun run build
bun link
```

### 2. 安装Pre-commit钩子

在您的项目根目录中运行以下命令：

```bash
# 方法1: 使用安装脚本（推荐）
curl -s https://raw.githubusercontent.com/sewardsheng/sql-analyzer-cli/main/scripts/install-precommit.sh | bash

# 方法2: 手动安装
# 1. 将scripts/pre-commit.js复制到您的项目
# 2. 将.pre-commit-config.yaml复制到您的项目根目录
# 3. 运行: chmod +x scripts/pre-commit.js
# 4. 运行: git config core.hooksPath .git/hooks
# 5. 运行: cp scripts/pre-commit.js .git/hooks/pre-commit
```

### 3. 配置环境变量

创建`.env`文件或设置环境变量：

```bash
# API配置
CUSTOM_API_KEY=your_openai_api_key
CUSTOM_BASE_URL=https://api.openai.com/v1
CUSTOM_MODEL=gpt-4
```

### 4. 使用方法

安装完成后，每次您尝试提交包含SQL文件的更改时，pre-commit钩子会自动运行：

```bash
# 添加SQL文件
git add *.sql

# 尝试提交 - pre-commit钩子会自动运行
git commit -m "Add new SQL queries"
```

如果SQL文件中有问题，提交将被阻止，您会看到类似以下的输出：

```
🔍 SQL Analyzer Pre-commit Hook
发现 2 个SQL文件需要检查:
  - queries/select_users.sql
  - queries/update_table.sql

正在分析文件: queries/select_users.sql
✅ queries/select_users.sql: 分析通过

正在分析文件: queries/update_table.sql
❌ queries/update_table.sql: 分析失败
   错误: 查询缺少WHERE子句，可能导致全表扫描

=== SQL分析汇总 ===
通过: 1, 失败: 1

❌ SQL分析发现问题，提交已被阻止
提示:
  1. 修复上述问题后再次尝试提交
  2. 或者在提交消息中包含 [skip-sql-check] 跳过检查
```

### 5. 跳过检查（不推荐）

如果需要临时跳过检查：

```bash
# 方法1: 使用git commit的--no-verify选项
git commit --no-verify -m "Skip SQL analysis"

# 方法2: 使用环境变量
SQL_ANALYZER_SKIP=true git commit -m "Skip SQL analysis"

# 方法3: 在提交消息中添加[skip-sql-check]
git commit -m "Add queries [skip-sql-check]"
```

## 🔄 GitHub Actions工作流集成

### 1. 添加工作流文件

在您的项目中创建`.github/workflows/sql-analysis.yml`文件，内容如下：

```yaml
name: SQL Analysis

on:
  push:
    paths:
      - '**/*.sql'
  pull_request:
    paths:
      - '**/*.sql'

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # 获取完整历史记录，以便比较提交
        
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
          
      - name: Install SQL Analyzer
        run: |
          # 克隆SQL Analyzer仓库
          git clone https://github.com/sewardsheng/sql-analyzer-cli.git temp-analyzer
          cd temp-analyzer
          bun install
          bun run build
          # 设置可执行权限
          chmod +x bin/cli.js
          cd ..
          # 创建环境变量，指向SQL Analyzer的路径
          echo "SQL_ANALYZER_PATH=$(pwd)/temp-analyzer/bin/cli.js" >> $GITHUB_ENV
        
      - name: Get changed SQL files
        id: changed-files
        run: |
          if [ "${{ github.event_name }}" = "pull_request" ]; then
            # PR事件：获取PR中的变更文件
            files=$(git diff --name-only origin/${{ github.base_ref }}..HEAD | grep -E '\.sql$' || true)
          else
            # Push事件：获取最新提交中的变更文件
            files=$(git diff --name-only HEAD~1 HEAD | grep -E '\.sql$' || true)
          fi
          
          if [ -z "$files" ]; then
            echo "has_sql_files=false" >> $GITHUB_OUTPUT
            echo "没有检测到SQL文件变更"
          else
            echo "has_sql_files=true" >> $GITHUB_OUTPUT
            echo "sql_files<<EOF" >> $GITHUB_OUTPUT
            echo "$files" >> $GITHUB_OUTPUT
            echo "EOF" >> $GITHUB_OUTPUT
            echo "检测到以下SQL文件变更:"
            echo "$files" | sed 's/^/  - /'
          fi
          
      - name: Configure API Key
        if: steps.changed-files.outputs.has_sql_files == 'true'
        run: |
          echo "CUSTOM_API_KEY=${{ secrets.OPENAI_API_KEY }}" > .env
          echo "CUSTOM_BASE_URL=https://api.openai.com/v1" >> .env
          echo "CUSTOM_MODEL=gpt-4" >> .env
          
      - name: Create reports directory
        if: steps.changed-files.outputs.has_sql_files == 'true'
        run: mkdir -p reports
        
      - name: Analyze SQL files
        if: steps.changed-files.outputs.has_sql_files == 'true'
        run: |
          set -e  # Exit on any error
          total_files=0
          passed_files=0
          failed_files=0
          
          # Create summary report
          echo "# SQL Analysis Report" > reports/summary.md
          echo "Generated on: $(date)" >> reports/summary.md
          echo "Event: ${{ github.event_name }}" >> reports/summary.md
          echo "Repository: ${{ github.repository }}" >> reports/summary.md
          echo "Commit: ${{ github.sha }}" >> reports/summary.md
          echo "" >> reports/summary.md
          
          # Process each SQL file
          for file in ${{ steps.changed-files.outputs.sql_files }}; do
            if [ -f "$file" ]; then
              total_files=$((total_files + 1))
              filename=$(basename "$file")
              echo "Analyzing $filename..."
              
              # Create individual report file
              report_file="reports/${filename%.sql}_report.md"
              echo "# Analysis Report for $filename" > "$report_file"
              echo "" >> "$report_file"
              
              # Run analysis and capture output
              if bun "${{ env.SQL_ANALYZER_PATH }}" analyze -f "$file" >> "$report_file" 2>&1; then
                echo "✅ $filename - Analysis completed successfully" >> reports/summary.md
                passed_files=$((passed_files + 1))
              else
                echo "❌ $filename - Analysis failed" >> reports/summary.md
                failed_files=$((failed_files + 1))
              fi
              echo "" >> reports/summary.md
            fi
          done
          
          # Add summary section
          echo "## Summary" >> reports/summary.md
          echo "- Total files analyzed: $total_files" >> reports/summary.md
          echo "- Passed: $passed_files" >> reports/summary.md
          echo "- Failed: $failed_files" >> reports/summary.md
          echo "" >> reports/summary.md
          
          # Set exit code based on results
          if [ $failed_files -gt 0 ]; then
            echo "::error::Some SQL files failed analysis. Check the reports for details."
            exit 1
          fi
          
      - name: Cleanup
        if: always()
        run: |
          # 清理临时目录和文件
          rm -rf temp-analyzer || true
          rm -f .env || true
          echo "Cleanup completed successfully"
          
      - name: Upload analysis reports
        if: steps.changed-files.outputs.has_sql_files == 'true'
        uses: actions/upload-artifact@v4
        with:
          name: sql-analysis-reports
          path: reports/
          retention-days: 30
          
      - name: Comment PR with results
        if: github.event_name == 'pull_request' && steps.changed-files.outputs.has_sql_files == 'true'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const path = require('path');
            
            // Read summary report
            const summaryPath = path.join(process.env.GITHUB_WORKSPACE, 'reports/summary.md');
            const summary = fs.readFileSync(summaryPath, 'utf8');
            
            // Create PR comment
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 🔍 SQL Analysis Results\n\n${summary}`
            });
```

### 2. 工作流行为

工作流执行以下操作：

1. 检测变更的SQL文件
2. 安装SQL Analyzer工具
3. 分析每个SQL文件
4. 生成分析报告
5. 在PR中添加评论（如果是PR）
6. 上传分析报告作为构建产物

### 3. 工作流输出示例

在PR中，您会看到类似以下的评论：

```
## 🔍 SQL Analysis Results

# SQL Analysis Report
Generated on: 2023-11-15 14:30:45
Event: pull_request
Repository: your-org/your-project
Commit: abc123def456

✅ queries/select_users.sql - Analysis completed successfully
❌ queries/update_table.sql - Analysis failed

## Summary
- Total files analyzed: 2
- Passed: 1
- Failed: 1
```

## 🔧 环境设置

### 1. 配置仓库密钥

在GitHub仓库设置中添加以下密钥：

1. 转到仓库的"Settings" > "Secrets and variables" > "Actions"
2. 点击"New repository secret"
3. 添加以下密钥：
   - `OPENAI_API_KEY`: 您的OpenAI API密钥

### 2. 权限设置

工作流需要以下权限：
- `contents: read`: 读取仓库内容
- `pull-requests: write`: 在PR中添加评论

## 🔄 工作流详解

### 触发条件

工作流在以下情况触发：
- Push任何SQL文件到仓库
- 创建或更新包含SQL文件的Pull Request

### 执行步骤

1. **检出代码**：获取仓库代码和历史记录
2. **设置Bun环境**：安装Bun运行时
3. **安装SQL Analyzer**：克隆仓库并构建工具
4. **检测变更文件**：识别变更的SQL文件
5. **配置API密钥**：设置环境变量
6. **分析SQL文件**：对每个文件执行分析
7. **清理环境**：删除临时文件
8. **上传报告**：保存分析结果
9. **PR评论**：在PR中添加分析结果

## 📊 工作流输出示例

### PR评论示例

在PR中，您会看到类似以下的评论：

```
## 🔍 SQL Analysis Results

# SQL Analysis Report
Generated on: 2023-11-15 14:30:45
Event: pull_request
Repository: your-org/your-project
Commit: abc123def456

✅ queries/select_users.sql - Analysis completed successfully
❌ queries/update_table.sql - Analysis failed

## Summary
- Total files analyzed: 2
- Passed: 1
- Failed: 1
```

### 详细分析报告

对于每个SQL文件，分析器会提供详细报告：

```
## 📋 Analysis for queries/select_users.sql

### Performance Analysis
- ✅ Query uses appropriate indexes
- ✅ No full table scans detected
- ⚠️ Consider adding LIMIT clause for large result sets

### Security Analysis
- ✅ No SQL injection vulnerabilities detected
- ✅ Proper parameter binding used

### Style Analysis
- ✅ Follows SQL naming conventions
- ✅ Proper indentation and formatting
```

### 失败分析报告

当分析失败时，会显示错误信息：

```
## ❌ Analysis for queries/update_table.sql

### Error Details
- Error Code: SQL_PARSE_ERROR
- Message: Unexpected token at line 15
- Suggestion: Check for missing comma or semicolon

### Quick Fix
```sql
-- Before
UPDATE users SET name = 'John' email = 'john@example.com'

-- After
UPDATE users SET name = 'John', email = 'john@example.com'
```

## ⚙️ 自定义配置

### Pre-commit配置

您可以通过修改`.pre-commit-config.yaml`来自定义pre-commit钩子的行为：

```yaml
repos:
  - repo: local
    hooks:
      - id: sql-analyzer
        name: SQL Analyzer
        entry: bun scripts/pre-commit.js
        language: system
        files: '\.sql$'
        # 自定义选项
        args: [--verbose]  # 添加详细输出
        pass_filenames: false
        always_run: false  # 只在有SQL文件变更时运行
```

**注意**：由于项目使用Bun运行时，pre-commit钩子必须使用Bun而不是Node.js来执行。如果遇到`require is not defined in ES module scope`错误，请确保：

1. 钩子脚本使用`#!/usr/bin/env bun`而不是`#!/usr/bin/env node`
2. 在Bun中，chalk库需要使用`require('chalk').default`导入
3. 钩子脚本中的`analyzerPath`配置为`'bun bin/cli.js'`而不是`'sql-analyzer'`

### SQL Analyzer配置

您可以通过创建`sql-analyzer.config.json`文件来自定义分析器的行为：

```json
{
  "rules": {
    "performance": {
      "enabled": true,
      "require_where": true,
      "check_indexes": true
    },
    "security": {
      "enabled": true,
      "check_sql_injection": true
    },
    "style": {
      "enabled": true,
      "enforce_naming": true
    }
  },
  "output": {
    "format": "markdown",
    "verbose": false
  }
}
```

### GitHub Actions自定义

您可以通过修改`.github/workflows/sql-analysis.yml`来自定义CI/CD流程：

```yaml
# 自定义触发条件
on:
  push:
    branches: [main, develop]
    paths: ['**/*.sql']
  pull_request:
    branches: [main]
    paths: ['**/*.sql']

# 自定义环境
jobs:
  analyze:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]  # 多Node版本测试
```

### 修改触发条件

您可以根据需要修改工作流的触发条件：

```yaml
# 只对特定分支进行SQL分析
on:
  push:
    branches: [main, develop]
    paths: ['**/*.sql']
  pull_request:
    branches: [main]
    paths: ['**/*.sql']
```

### 自定义分析参数

您可以通过修改分析命令来自定义分析参数：

```yaml
# 使用不同的数据库类型
if bun "${{ env.SQL_ANALYZER_PATH }}" analyze -f "$file" -d postgresql >> "$report_file" 2>&1; then

# 使用自定义API配置
if bun "${{ env.SQL_ANALYZER_PATH }}" analyze -f "$file" --model gpt-3.5-turbo >> "$report_file" 2>&1; then
```

### 多环境分析

您可以为不同环境设置不同的分析规则：

```yaml
- name: Analyze SQL files
  run: |
    # 根据分支选择不同的配置
    if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
      echo "CUSTOM_MODEL=gpt-4" >> .env
      echo "ANALYSIS_STRICTNESS=high" >> .env
    else
      echo "CUSTOM_MODEL=gpt-3.5-turbo" >> .env
      echo "ANALYSIS_STRICTNESS=medium" >> .env
    fi
```

## 🔧 故障排除

### 常见问题

1. **Pre-commit钩子不执行**
   - 确保文件有执行权限：`chmod +x scripts/pre-commit.js`
   - 检查Git钩子路径：`git config core.hooksPath`
   - 确认SQL Analyzer已安装且在PATH中
   - 确保使用Bun而不是Node.js运行钩子

2. **Pre-commit钩子报错：`require is not defined in ES module scope`**
   - 确保钩子脚本使用`#!/usr/bin/env bun`而不是`#!/usr/bin/env node`
   - 检查chalk库导入方式：`const chalk = require('chalk').default`
   - 确保钩子脚本中的`analyzerPath`配置为`'bun bin/cli.js'`

3. **Pre-commit钩子报错：`chalk.blue is not a function`**
   - 在Bun中，chalk库需要使用不同的导入方式：`const chalk = require('chalk').default`

4. **API密钥错误**
   - 检查`.env`文件中的`CUSTOM_API_KEY`
   - 确认GitHub仓库中设置了`OPENAI_API_KEY`密钥

5. **工作流失败：权限错误**
   - 确保仓库设置了正确的权限
   - 检查`OPENAI_API_KEY`密钥是否正确设置

6. **分析失败：Bun命令未找到**
   - 确保`oven-sh/setup-bun@v1`步骤正确执行
   - 检查Bun版本是否与项目兼容

7. **文件检测错误：未找到变更的SQL文件**
   - 检查文件路径是否正确
   - 确认文件扩展名是`.sql`

8. **API错误：认证失败**
   - 验证OpenAI API密钥是否有效
   - 检查API配额是否充足

9. **性能问题**
   - 对于大型SQL文件，考虑增加超时时间
   - 限制同时分析的文件数量

### 调试技巧

1. **启用详细输出**
   ```bash
   SQL_ANALYZER_VERBOSE=true git commit -m "Test commit"
   ```

2. **手动运行钩子**
   ```bash
   ./scripts/pre-commit.js
   ```

3. **启用详细输出（工作流）**
   ```yaml
   - name: Analyze SQL files
     run: |
       set -x  # 启用命令跟踪
       # ... 分析命令
   ```

4. **保存调试信息**
   ```yaml
   - name: Debug info
     if: failure()
     run: |
       echo "Current directory: $(pwd)"
       echo "Files in directory:"
       ls -la
       echo "Environment variables:"
       env | grep SQL_
   ```

5. **本地测试**
   ```bash
   # 在本地模拟工作流
   bun install
   bun run build
   bun bin/cli.js analyze -f your-file.sql
   ```

6. **测试工作流**
   - 使用GitHub Actions的"rerun failed jobs"功能
   - 创建测试PR来验证工作流

## 📚 更多资源

- [SQL Analyzer CLI文档](https://github.com/sewardsheng/sql-analyzer-cli)
- [GitHub Actions文档](https://docs.github.com/en/actions)
- [Bun文档](https://bun.sh/docs)

## 🤝 贡献

欢迎提交问题和拉取请求来改进这个工作流！请确保：

1. 遵循现有的代码风格
2. 添加适当的测试
3. 更新文档

## 📄 许可证

本项目采用MIT许可证。详见[LICENSE](LICENSE)文件。