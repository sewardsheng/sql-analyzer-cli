# SQL Analyzer CLI 使用手册

本手册将详细介绍 SQL Analyzer CLI 的所有功能和使用方法，帮助您充分利用这个强大的 SQL 分析工具。

## 目录

- [快速开始](#快速开始)
- [命令概览](#命令概览)
- [详细命令说明](#详细命令说明)
  - [analyze 命令](#analyze-命令)
  - [learn 命令](#learn-命令)
  - [config 命令](#config-命令)
  - [status 命令](#status-命令)
  - [history 命令](#history-命令)
  - [api 命令](#api-命令)
  - [ui 命令](#ui-命令)
- [高级用法](#高级用法)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

## 快速开始

### 基本分析

最简单的使用方式是直接分析 SQL 语句：

```bash
# 分析简单 SQL 语句
sql-analyzer analyze -s "SELECT * FROM users WHERE id = 1"
sql-analyzer analyze --sql "SELECT * FROM users WHERE id = 1"
# 分析 SQL 文件
sql-analyzer analyze -f /path/to/your/query.sql
sql-analyzer analyze --file /path/to/your/query.sql

# 分析目录中的所有 SQL 文件
sql-analyzer analyze -d /path/to/sql/directory
sql-analyzer analyze --directory /path/to/sql/directory
```

### 查看帮助

```bash
# 查看主帮助
sql-analyzer --help

# 查看特定命令的帮助
sql-analyzer analyze --help
sql-analyzer config --help
```

## 命令概览

SQL Analyzer CLI 提供以下主要命令：

| 命令 | 描述 | 示例 |
|------|------|------|
| `analyze` | 分析 SQL 语句或文件 | `sql-analyzer analyze -s "SELECT * FROM users"` |
| `learn` | 加载规则到知识库 | `sql-analyzer learn --rules-dir ./custom-rules` |
| `config` | 管理配置 | `sql-analyzer config set apiKey your_key` |
| `status` | 查看系统状态 | `sql-analyzer status` |
| `history` | 查看分析历史 | `sql-analyzer history list` |
| `api` | 启动 API 服务器 | `sql-analyzer api --port 3000` |
| `ui` | 启动Terminal UI模式 | `sql-analyzer ui` |
| `init` | 初始化环境配置文件 | `sql-analyzer init` |

## 详细命令说明

### analyze 命令

`analyze` 命令是核心功能，用于分析 SQL 语句或文件。

#### 基本语法

```bash
sql-analyzer analyze [选项]
```

#### 选项

| 选项 | 简写 | 描述 | 默认值 |
|------|------|------|--------|
| `--sql` | `-s` | 要分析的 SQL 语句 | 无 |
| `--file` | `-f` | 要分析的 SQL 文件路径 | 无 |
| `--database` | `-d` | 指定数据库类型 | mysql |
| `--api-key` | 无 | OpenAI API 密钥 | 配置中的默认密钥 |
| `--base-url` | 无 | API 基础 URL | 配置中的默认 URL |
| `--model` | 无 | 使用的模型名称 | 配置中的默认模型 |

#### 使用示例

1. **分析单个 SQL 语句**

```bash
sql-analyzer analyze -s "SELECT * FROM users WHERE age > 18"
```

2. **分析 SQL 文件**

```bash
sql-analyzer analyze -f ./queries/report.sql
```

3. **指定数据库类型进行分析**

```bash
sql-analyzer analyze -s "SELECT * FROM users" -d postgresql
```

4. **使用特定 API 配置**

```bash
sql-analyzer analyze -f ./complex-query.sql --api-key your_api_key --base-url https://api.example.com/v1
```

5. **使用特定模型**

```bash
sql-analyzer analyze -s "SELECT * FROM orders" --model gpt-4
```

#### 输出格式

分析结果将以表格形式输出到终端，便于阅读。如需其他格式，请使用 API 模式。

### learn 命令

`learn` 命令用于加载 SQL 分析规则到知识库，提高分析质量。

#### 基本语法

```bash
sql-analyzer learn [选项]
```

#### 选项

| 选项 | 简写 | 描述 | 默认值 |
|------|------|------|--------|
| `--rules-dir` | `-r` | 指定rules目录路径 | ./rules |
| `--reset` | 无 | 重置知识库 | false |
| `--api-key` | 无 | OpenAI API 密钥 | 配置中的默认密钥 |
| `--base-url` | 无 | API 基础 URL | 配置中的默认 URL |
| `--model` | 无 | 使用的模型名称 | 配置中的默认模型 |
| `--embedding-model` | 无 | 使用的嵌入模型名称 | 配置中的默认嵌入模型 |

#### 使用示例

1. **加载默认规则**

```bash
sql-analyzer learn
```

2. **从自定义目录加载规则**

```bash
sql-analyzer learn --rules-dir ./my-sql-rules
```

3. **重置知识库并重新加载**

```bash
sql-analyzer learn --reset
```

4. **使用特定 API 配置加载规则**

```bash
sql-analyzer learn --api-key your_api_key --base-url https://api.example.com/v1
```

5. **使用特定模型加载规则**

```bash
sql-analyzer learn --model gpt-4 --embedding-model text-embedding-ada-002
```

#### 规则文件格式

规则文件应该是文本文件，包含 SQL 最佳实践、优化技巧或特定数据库的规范。例如：

```
规则：避免在 WHERE 子句中使用函数

错误示例：
SELECT * FROM users WHERE YEAR(created_at) = 2023

正确示例：
SELECT * FROM users WHERE created_at >= '2023-01-01' AND created_at < '2024-01-01'

原因：在 WHERE 子句中使用函数会阻止索引使用，导致全表扫描。
```

### config 命令

`config` 命令用于管理工具配置。

#### 基本语法

```bash
sql-analyzer config [子命令] [选项]
```

#### 子命令

| 子命令 | 描述 |
|--------|------|
| `list` | 显示所有配置项 |
| `get <key>` | 获取特定配置项 |
| `set <key> <value>` | 设置配置项 |
| `reset` | 重置所有配置为默认值 |

#### 配置项

| 配置项 | 描述 | 默认值 |
|--------|------|--------|
| `baseURL` | API 基础 URL | https://api.openai.com/v1 |
| `apiKey` | API 密钥 | 无 |
| `model` | 默认语言模型 | gpt-3.5-turbo |
| `embeddingModel` | 嵌入模型 | text-embedding-ada-002 |
| `defaultDatabaseType` | 默认数据库类型 | mysql |
| `apiPort` | API 服务器端口 | 3000 |
| `apiHost` | API 服务器主机 | localhost |
| `apiCorsEnabled` | 是否启用 CORS | true |
| `apiCorsOrigin` | CORS 允许的源 | * |

#### 使用示例

1. **查看所有配置**

```bash
sql-analyzer config list
```

2. **设置 API 密钥**

```bash
sql-analyzer config set apiKey sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

3. **设置默认模型**

```bash
sql-analyzer config set model gpt-4
```

4. **设置默认数据库类型**

```bash
sql-analyzer config set defaultDatabaseType postgresql
```

5. **获取特定配置项**

```bash
sql-analyzer config get model
```

6. **重置所有配置**

```bash
sql-analyzer config reset
```

#### 环境变量映射

配置项会自动映射到相应的环境变量：

| 配置项 | 环境变量 |
|--------|----------|
| `baseURL` | `CUSTOM_BASE_URL` |
| `apiKey` | `CUSTOM_API_KEY` |
| `model` | `CUSTOM_MODEL` |
| `embeddingModel` | `CUSTOM_EMBEDDING_MODEL` |
| `defaultDatabaseType` | `DEFAULT_DATABASE_TYPE` |
| `apiPort` | `API_PORT` |
| `apiHost` | `API_HOST` |
| `apiCorsEnabled` | `API_CORS_ENABLED` |
| `apiCorsOrigin` | `API_CORS_ORIGIN` |


### status 命令

`status` 命令用于查看系统状态和诊断问题。

#### 基本语法

```bash
sql-analyzer status [选项]
```

#### 选项

| 选项 | 简写 | 描述 | 默认值 |
|------|------|------|--------|
| `--interactive` | 无 | 交互式模式 | false |

#### 使用示例

1. **查看基本状态**

```bash
sql-analyzer status
```

3. **测试 API 连接**

```bash
sql-analyzer status --check-api
```

#### 状态信息包括

- API 连接状态
- 配置有效性
- 知识库状态
- 历史记录统计
- 系统资源使用情况

### history 命令

`history` 命令用于管理和查看分析历史记录。

#### 基本语法

```bash
sql-analyzer history [子命令] [选项]
```

#### 子命令

| 子命令 | 描述 |
|--------|------|
| `list` | 列出历史记录 |
| `detail <id>` | 显示特定历史记录详情 |
| `delete <id>` | 删除特定历史记录 |
| `clear` | 清空所有历史记录 |
| `stats` | 显示历史记录统计信息 |


#### 使用示例
1. **列出所有历史记录**

```bash
sql-analyzer history list
```

2. **显示特定历史记录详情**

```bash
sql-analyzer history detail 12345
```

3. **删除特定历史记录**

```bash
sql-analyzer history delete 12345
```

4. **查看历史记录统计**

```bash
sql-analyzer history stats
```
5. **清空所有历史记录**

```bash
sql-analyzer history clear
```

### init

初始化环境配置文件。

#### 选项

| 选项 | 简写 | 描述 | 默认值 |
|------|------|------|--------|
| `-h, --help` | 无 | 显示帮助信息 | 无 |

#### 使用示例

1. **初始化配置文件**

```bash
sql-analyzer init
```

执行后会在当前目录创建配置文件，包含默认的API配置、数据库设置和规则目录等。

---

### api 命令

`api` 命令用于启动 API 服务器，提供 HTTP API 接口。

#### 基本语法

```bash
sql-analyzer api [选项]
```

#### 选项

| 选项 | 简写 | 描述 | 默认值 |
|------|------|------|--------|
| `--port` | `-p` | API服务器端口 | 3000 |
| `--host` | `-h` | API服务器主机 | 0.0.0.0 |
| `--no-cors` | 无 | 禁用CORS | false |
| `--cors-origin` | 无 | CORS允许的源 | * |

#### 使用示例

1. **启动默认服务器**

```bash
sql-analyzer api
```

2. **启动自定义端口的服务器**

```bash
sql-analyzer api --port 8080 --host 0.0.0.0
```

3. **禁用CORS的服务器**

```bash
sql-analyzer api --no-cors
```

4. **指定CORS源的服务器**

```bash
sql-analyzer api --cors-origin "https://example.com"
```

#### API 端点

服务器启动后，提供以下 API 端点：

- `GET /` - 获取API基本信息和可用端点列表
- `GET /api/health` - 健康检查
- `POST /api/analyze` - 分析 SQL
- `GET /api/history` - 获取历史记录列表
- `GET /api/history/:id` - 获取特定历史记录详情
- `DELETE /api/history/:id` - 删除特定历史记录
- `DELETE /api/history` - 清空历史记录
- `GET /api/history/stats` - 获取历史记录统计信息
- `GET /api/knowledge/status` - 查看知识库状态
- `POST /api/knowledge/load` - 加载文档到知识库
- `POST /api/knowledge/reset` - 重置知识库
- `GET /api/config` - 获取当前配置
- `POST /api/config` - 更新配置
- `GET /api/config/:key` - 获取单个配置项
- `PUT /api/config/:key` - 更新单个配置项
- `POST /api/config/reset` - 重置配置

详细的 API 文档请参考 [API 文档](./api.md)。

### ui 命令

`ui` 命令用于启动 Terminal UI 模式，提供交互式菜单界面。

#### 基本语法

```bash
sql-analyzer ui
```

#### 功能特性

Terminal UI 模式提供以下功能：

- 交互式菜单导航
- 实时 SQL 分析
- 配置管理
- 历史记录查看
- 知识库状态监控

#### 使用示例

1. **启动 Terminal UI**

```bash
sql-analyzer ui
```

启动后，您将看到一个交互式菜单，可以使用键盘导航和选择不同的功能选项。

#### 操作说明

- 使用方向键或数字键导航菜单
- 按 Enter 键选择选项
- 按 Ctrl + C 或 指定选项退出当前菜单或程序

## 高级用法

### 集成到 CI/CD

将 SQL 分析集成到 CI/CD 流水线中有两种方式：

#### 1. 使用 Pre-commit 钩子（推荐）

Pre-commit 钩子可以在提交前自动检查 SQL 代码质量，防止问题进入代码库：

```bash
# 安装 pre-commit 钩子
curl -s https://raw.githubusercontent.com/sewardsheng/sql-analyzer-cli/main/scripts/install-precommit.sh | bash
```

安装后，每次提交包含 SQL 文件的更改时，pre-commit 钩子会自动运行分析。

#### 2. 使用 GitHub Actions 工作流

在 PR 和 Push 时自动分析 SQL 文件：

```yaml
# .github/workflows/sql-analysis.yml
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
    steps:
      - uses: actions/checkout@v4
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      - name: Install SQL Analyzer
        run: |
          git clone https://github.com/your-username/sql-analyzer-cli.git temp-analyzer
          cd temp-analyzer
          bun install
          bun run build
          bun install -g .
          cd ..
          rm -rf temp-analyzer
      - name: Configure API Key
        run: |
          echo "CUSTOM_API_KEY=${{ secrets.OPENAI_API_KEY }}" > .env
          echo "CUSTOM_BASE_URL=https://api.openai.com/v1" >> .env
          echo "CUSTOM_MODEL=gpt-4" >> .env
      - name: Analyze SQL files
        run: |
          # 获取变更的SQL文件
          if [ "${{ github.event_name }}" = "pull_request" ]; then
            files=$(git diff --name-only origin/${{ github.base_ref }}..HEAD | grep -E '\.sql$' || true)
          else
            files=$(git diff --name-only HEAD~1 HEAD | grep -E '\.sql$' || true)
          fi
          
          # 分析每个SQL文件
          for file in $files; do
            if [ -f "$file" ]; then
              sql-analyzer analyze -f "$file"
            fi
          done
```

详细集成指南请参考 [Pre-commit集成文档](./pre-commit-integration.md)。

### 自定义规则

创建自定义规则目录结构：

```
rules/
├── performance/
│   ├── indexing.md
│   └── query-optimization.md
├── security/
│   ├── sql-injection.md
│   └── data-access.md
└── best-practices/
    ├── naming-conventions.md
    └── code-organization.md
```

然后加载这些规则：

```bash
sql-analyzer learn
```


## 最佳实践

### 1. 配置管理

- 使用环境变量存储敏感信息（如 API 密钥）
- 为不同环境创建不同的配置文件
- 定期备份配置

### 2. 知识库管理

- 定期更新规则库
- 为特定项目创建专门的规则集
- 版本控制您的规则文件

```bash
# 初始化项目特定的规则
git clone https://github.com/your-org/sql-rules.git
sql-analyzer learn
```

### 3. 历史记录管理

- 定期清理旧的历史记录
- 导出重要分析结果进行长期保存
- 使用标签或过滤条件组织历史记录

## 常见问题

### Q: 分析结果不准确怎么办？

A: 尝试以下方法：
1. 使用更强大的模型（如 GPT-4）
2. 降低温度参数以获得更确定性的结果
3. 添加更多相关规则到知识库
4. 提供更多上下文信息

```bash
sql-analyzer analyze -f query.sql -m gpt-4 --temperature 0.0
```

### Q: 分析速度很慢怎么办？

A: 尝试以下优化：
1. 使用更快的模型（如 GPT-3.5-turbo）
2. 批量处理多个小查询而不是单个大查询


### Q: 如何分析包含敏感数据的 SQL？

A: 使用数据脱敏功能：

```bash
sql-analyzer analyze -f query.sql --anonymize
```

或者在分析前手动替换敏感数据：


### Q: 如何在离线环境中使用？

A: SQL Analyzer CLI 需要连接到 OpenAI API，因此完全离线使用不可行。但是，您可以：
1. 使用本地兼容的 API 端点
2. 配置代理服务器
3. 缓存分析结果以减少 API 调用

---

更多详细信息，请参考：
- [安装指南](./installation.md)
- [配置指南](./configuration.md)
- [API 文档](./api.md)