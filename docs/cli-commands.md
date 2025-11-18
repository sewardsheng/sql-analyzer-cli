# SQL Analyzer CLI 命令行使用文档

## 目录
- [基础命令](#基础命令)
- [分析命令](#分析命令)
- [配置管理命令](#配置管理命令)
- [知识库管理命令](#知识库管理命令)
- [历史记录命令](#历史记录命令)
- [系统工具命令](#系统工具命令)
- [常见错误](#常见错误)

## 基础命令

### 查看帮助
```bash
# 使用绑定的命令
sql-analyzer --help
sql-analyzer analyze --help

# 或使用bun运行
bun run src/index.js --help
bun run src/index.js analyze --help
```

## 分析命令

### analyze - SQL分析命令

#### 基本用法

**1. 分析SQL字符串**
```bash
# 使用绑定的命令
sql-analyzer analyze --sql "SELECT * FROM users WHERE id = 1"

# 或使用bun运行
bun run src/index.js analyze --sql "SELECT * FROM users WHERE id = 1"
```

**2. 分析SQL文件**
```bash
# 使用绑定的命令
sql-analyzer analyze --file ./test.sql

# 或使用bun运行
bun run src/index.js analyze --file ./test.sql
```

#### 分析模式

**快速分析模式**（推荐用于日常检查）
```bash
sql-analyzer analyze --sql "SELECT * FROM users" --quick
```

**完整分析模式**（默认，包含深度分析）
```bash
sql-analyzer analyze --sql "SELECT * FROM users"
```

#### Headless 模式选项

**无界面模式**（适用于CI/CD）
```bash
sql-analyzer analyze --sql "SELECT * FROM users" --headless
```

**设置输出格式**
```bash
# JSON格式
sql-analyzer analyze --sql "SELECT * FROM users" --headless --format json

# 结构化格式
sql-analyzer analyze --sql "SELECT * FROM users" --headless --format structured

# 摘要格式（默认）
sql-analyzer analyze --sql "SELECT * FROM users" --headless --format summary
```

**设置评分阈值**
```bash
# 设置70分为阈值（默认）
sql-analyzer analyze --sql "SELECT * FROM users" --threshold 70

# 根据阈值设置退出码
sql-analyzer analyze --sql "SELECT * FROM users" --threshold 80 --exit-code
```

**输出到文件**
```bash
sql-analyzer analyze --sql "SELECT * FROM users" --output-file ./result.json
```

**静默模式**
```bash
sql-analyzer analyze --sql "SELECT * FROM users" --quiet
```

**管道模式**
```bash
sql-analyzer analyze --sql "SELECT * FROM users" --pipe | jq .
```

#### 禁用特定分析

**禁用学习功能**
```bash
sql-analyzer analyze --sql "SELECT * FROM users" --no-learn
```

**禁用性能分析**
```bash
sql-analyzer analyze --sql "SELECT * FROM users" --no-performance
```

**禁用安全审计**
```bash
sql-analyzer analyze --sql "SELECT * FROM users" --no-security
```

**禁用编码规范检查**
```bash
sql-analyzer analyze --sql "SELECT * FROM users" --no-standards
```

#### 组合使用示例

**快速分析 + Headless + JSON输出**
```bash
sql-analyzer analyze --sql "SELECT * FROM users" --quick --headless --format json
```

**完整分析 + 禁用学习 + 输出到文件**
```bash
sql-analyzer analyze --file ./test.sql --no-learn --output-file ./result.json
```

**CI/CD 集成示例**
```bash
sql-analyzer analyze --file ./query.sql --headless --format json --threshold 80 --exit-code --quiet
```

## 配置管理命令

### config - 配置管理

#### 查看配置

**显示所有配置项**
```bash
sql-analyzer config list
# 或直接使用
sql-analyzer config
```

**获取特定配置项**
```bash
sql-analyzer config get OPENAI_API_KEY
```

#### 设置配置

**设置配置项**
```bash
sql-analyzer config set OPENAI_API_KEY your_api_key_here
sql-analyzer config set OPENAI_MODEL gpt-4
```

**重置所有配置**
```bash
sql-analyzer config reset
```

## 知识库管理命令

### learn - 规则学习与知识库管理

#### 加载文档到知识库

**加载rules目录中的文档**
```bash
sql-analyzer learn load
```

**指定rules目录路径**
```bash
sql-analyzer learn load --rules-dir ./custom-rules
```

**优先加载approved目录中的规则**
```bash
sql-analyzer learn load --priority-approved
```

**覆盖配置设置**
```bash
sql-analyzer learn load --api-key your_key --base-url your_url --model gpt-4
```

#### 知识库管理

**重置知识库**
```bash
sql-analyzer learn reset
```

#### 规则质量管理

**评估所有规则文件质量**
```bash
sql-analyzer learn evaluate
```

**生成详细评估报告**
```bash
sql-analyzer learn evaluate --report
```

**清理低质量规则**
```bash
sql-analyzer learn cleanup
```

**设置质量分数阈值**
```bash
sql-analyzer learn cleanup --score 70
```

**备份低质量规则**
```bash
sql-analyzer learn cleanup --backup
```

**手动认可规则文件**
```bash
sql-analyzer learn approve rule-file.md
```

**显示规则库状态**
```bash
sql-analyzer learn status
```

### search - 知识库搜索

**搜索知识库**
```bash
sql-analyzer search "SELECT 优化"
```

**指定返回结果数量**
```bash
sql-analyzer search "索引优化" --count 10
```

## 历史记录命令

### history - SQL分析历史记录管理

#### 查看历史记录

**显示所有历史记录列表**
```bash
sql-analyzer history list
```

**显示指定ID的历史记录详情**
```bash
sql-analyzer history detail 123
```

**显示历史记录统计信息**
```bash
sql-analyzer history stats
```

#### 管理历史记录

**删除指定ID的历史记录**
```bash
sql-analyzer history delete 123
```

**清空所有历史记录**
```bash
sql-analyzer history clear
```

## 系统工具命令

### status - 系统状态

**显示知识库状态**
```bash
sql-analyzer status
```

### init - 初始化环境

**初始化环境配置文件**
```bash
sql-analyzer init
```

### api - API服务器

**启动API服务器**
```bash
sql-analyzer api
```

**指定端口和主机**
```bash
sql-analyzer api --port 8080 --host 127.0.0.1
```

**启用CORS**
```bash
sql-analyzer api --cors
# 或指定允许的源
sql-analyzer api --cors "https://example.com"
```

### ui - 可视化终端界面

**启动可视化终端界面**
```bash
sql-analyzer ui
```

**指定SQL文件**
```bash
sql-analyzer ui --file ./test.sql
```

### health - 系统健康检查

**执行完整健康检查**
```bash
sql-analyzer health
```

**显示详细输出**
```bash
sql-analyzer health --verbose
```

**以JSON格式输出结果**
```bash
sql-analyzer health --json
```

**将结果保存到文件**
```bash
sql-analyzer health --output ./health-report.json
```

**执行特定类型的检查**
```bash
sql-analyzer health --check core-modules
sql-analyzer health --check configuration
sql-analyzer health --check rules
sql-analyzer health --check prompts
sql-analyzer health --check dependencies
sql-analyzer health --check memory
sql-analyzer health --check disk-space
```

## 常见错误

### 错误 1: 缺少必需参数
```bash
# ❌ 错误
sql-analyzer analyze

# ✅ 正确
sql-analyzer analyze --sql "SELECT * FROM users"
# 或
sql-analyzer analyze --file ./test.sql
```

### 错误 2: SQL字符串格式错误
```bash
# ❌ 错误（缺少 --sql 参数）
sql-analyzer analyze "SELECT * FROM users"

# ✅ 正确
sql-analyzer analyze --sql "SELECT * FROM users"
```

### 错误 3: 未知选项
```bash
# ❌ 错误（--mode 不存在）
sql-analyzer analyze --sql "SELECT * FROM users" --mode quick

# ✅ 正确
sql-analyzer analyze --sql "SELECT * FROM users" --quick
```

### 错误 4: 文件路径错误
```bash
# ❌ 错误（文件不存在）
sql-analyzer analyze --file ./nonexistent.sql

# ✅ 正确（确保文件存在）
sql-analyzer analyze --file ./test.sql
```

### 错误 5: 配置命令使用错误
```bash
# ❌ 错误（使用了旧的选项格式）
sql-analyzer config --set OPENAI_API_KEY=value

# ✅ 正确（使用子命令）
sql-analyzer config set OPENAI_API_KEY value
```

### 错误 6: 搜索命令使用错误
```bash
# ❌ 错误（使用了--query选项）
sql-analyzer search --query "SELECT 优化"

# ✅ 正确（直接提供查询参数）
sql-analyzer search "SELECT 优化"
```

## 完整命令参考

### analyze 命令完整选项

| 选项 | 缩写 | 说明 | 默认值 |
|------|------|------|--------|
| `--sql <sql>` | `-s` | 要分析的SQL语句 | - |
| `--file <file>` | `-f` | SQL文件路径 | - |
| `--quick` | - | 快速分析模式 | false |
| `--headless` | - | 无界面模式 | false |
| `--format <format>` | - | 输出格式(json\|structured\|summary) | summary |
| `--threshold <score>` | - | 评分阈值(0-100) | 70 |
| `--exit-code` | - | 根据阈值设置退出码 | false |
| `--pipe` | - | 管道模式 | false |
| `--output-file <file>` | - | 输出到文件 | - |
| `--quiet` | - | 静默模式 | false |
| `--no-learn` | - | 禁用学习功能 | false |
| `--no-performance` | - | 禁用性能分析 | false |
| `--no-security` | - | 禁用安全审计 | false |
| `--no-standards` | - | 禁用编码规范检查 | false |

### api 命令选项

| 选项 | 缩写 | 说明 | 默认值 |
|------|------|------|--------|
| `--port <port>` | `-p` | API服务器端口 | 3000 |
| `--host <host>` | `-h` | API服务器主机 | 0.0.0.0 |
| `--cors [origin]` | - | 启用CORS并指定允许的源 | "*" |

### health 命令选项

| 选项 | 缩写 | 说明 | 默认值 |
|------|------|------|--------|
| `--verbose` | `-v` | 显示详细输出 | false |
| `--json` | `-j` | 以JSON格式输出结果 | false |
| `--output <file>` | `-o` | 将结果保存到文件 | - |
| `--check <type>` | - | 只执行特定类型的检查 | - |

### search 命令选项

| 选项 | 缩写 | 说明 | 默认值 |
|------|------|------|--------|
| `--count <number>` | `-k` | 返回结果数量 | 5 |

### ui 命令选项

| 选项 | 缩写 | 说明 | 默认值 |
|------|------|------|--------|
| `--file <path>` | `-f` | SQL文件路径 | - |

### learn load 子命令选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--rules-dir <dir>` | rules目录路径 | ./rules |
| `--priority-approved` | 优先加载approved目录中的规则 | false |
| `--api-key <key>` | OpenAI API密钥 (覆盖配置文件设置) | - |
| `--base-url <url>` | API基础URL (覆盖配置文件设置) | - |
| `--model <model>` | 使用的模型名称 (覆盖配置文件设置) | - |
| `--embedding-model <model>` | 嵌入模型名称 (覆盖配置文件设置) | - |

### learn cleanup 子命令选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--score <score>` | 质量分数阈值(0-100)，低于此分数的规则将被清理 | 60 |
| `--backup` | 备份低质量规则到归档目录 | false |
| `--no-auto-move` | 禁用自动分类，仅评估不移动文件 | false |
| `--rules-dir <dir>` | 要清理的规则目录 | ./rules/learning-rules |

### learn evaluate 子命令选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--report` | 生成详细评估报告 | false |
| `--no-auto-move` | 禁用自动分类，仅评估不移动文件 | false |
| `--rules-dir <dir>` | 规则目录 | ./rules/learning-rules |

### learn approve 子命令选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--rules-dir <dir>` | 规则目录 | ./rules/learning-rules |

### learn status 子命令选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--rules-dir <dir>` | 规则目录 | ./rules/learning-rules |

## 退出码说明

| 退出码 | 说明 |
|--------|------|
| 0 | 命令成功执行 |
| 1 | 命令执行失败或出现错误 |
| 2 | 健康检查显示系统状态为degraded |

## 最佳实践

### 1. 日常开发
```bash
# 快速检查SQL
sql-analyzer analyze --sql "YOUR_SQL" --quick
```

### 2. 代码审查
```bash
# 完整分析
sql-analyzer analyze --file ./query.sql
```

### 3. CI/CD 集成
```bash
# 使用 Headless 模式
sql-analyzer analyze --file ./query.sql \
  --headless \
  --format json \
  --threshold 80 \
  --exit-code \
  --quiet \
  --output-file ./analysis-result.json
```

### 4. 批量分析
```bash
# 使用脚本批量处理
for file in ./sql/*.sql; do
  echo "Analyzing $file"
  sql-analyzer analyze --file "$file" --quick --headless
done
```

### 5. 知识库管理
```bash
# 加载新规则
sql-analyzer learn load

# 评估规则质量
sql-analyzer learn evaluate --report

# 清理低质量规则
sql-analyzer learn cleanup --score 70 --backup
```

### 6. 系统维护
```bash
# 执行健康检查
sql-analyzer health --verbose

# 检查特定组件
sql-analyzer health --check configuration
sql-analyzer health --check memory
```

## 环境变量

可以通过 `.env` 文件配置以下环境变量：

```env
# LLM配置
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4
OPENAI_BASE_URL=https://api.openai.com/v1

# 向量数据库配置
VECTOR_STORE_PATH=./vector-store

# 日志级别
LOG_LEVEL=info
```

## 疑难解答

### 问题：分析速度慢
**解决方案：**
1. 使用 `--quick` 快速分析模式
2. 使用 `--no-learn` 禁用学习功能
3. 禁用不需要的分析项

### 问题：内存占用高
**解决方案：**
1. 使用 `--headless` 模式
2. 分析完成后立即退出
3. 避免同时分析大量SQL

### 问题：无法连接到LLM服务
**解决方案：**
1. 检查 `.env` 配置
2. 使用 `sql-analyzer config list` 查看当前配置
3. 使用 `sql-analyzer config set OPENAI_API_KEY your_key` 设置API密钥
4. 检查网络连接

### 问题：知识库搜索无结果
**解决方案：**
1. 使用 `sql-analyzer learn load` 加载规则到知识库
2. 使用 `sql-analyzer learn status` 检查知识库状态
3. 尝试不同的搜索关键词

### 问题：API服务器无法启动
**解决方案：**
1. 使用 `sql-analyzer health --check dependencies` 检查依赖
2. 检查端口是否被占用
3. 使用 `--port` 指定其他端口

## 更多信息

- [安装指南](./installation.md)
- [配置说明](./configuration.md)
- [API文档](./api.md)
- [规则管理](./rules-configuration.md)