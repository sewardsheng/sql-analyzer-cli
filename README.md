# SQL Analyzer CLI

一个强大的SQL代码分析工具，提供本地和CI/CD集成，帮助您在开发过程中确保SQL代码质量。

## 🚀 功能特性

- **本地SQL分析**：分析单个SQL文件或整个目录
- **Pre-commit集成**：提交前自动检查SQL代码质量
- **GitHub Actions集成**：在PR和Push时自动分析SQL文件
- **多模型支持**：支持OpenAI GPT和其他AI模型
- **自定义规则**：可配置的分析规则和检查项
- **详细报告**：生成Markdown格式的分析报告

## 📦 安装

### 全局安装

```bash

# 使用Bun
## 目前尚未发布到npm，仅支持从源码安装
bun install -g sql-analyzer-cli
```

### 从源码安装

```bash
git clone https://github.com/sewardsheng/sql-analyzer-cli.git
cd sql-analyzer-cli
bun install
bun run build

# 全局安装  以便调用sql-analyzer命令
bun install -g .

# 或者使用 bun link（用于开发）
bun link
# 然后在需要使用该工具的项目中执行：
# bun link sql-analyzer-cli
```

## 🔧 快速开始

### 1. 配置API密钥

创建`.env`文件：

```bash
CUSTOM_API_KEY=your_openai_api_key
CUSTOM_BASE_URL=https://api.openai.com/v1
CUSTOM_MODEL=gpt-4
```

### 2. 分析SQL文件

```bash
# 分析单个文件
sql-analyzer analyze -f queries/select_users.sql

# 分析目录
sql-analyzer analyze -d ./sql-queries

# 分析并保存报告
sql-analyzer analyze -f queries/select_users.sql -o reports/
```

### 3. 集成到项目中

#### Pre-commit集成

```bash
# 安装pre-commit钩子
curl -s https://raw.githubusercontent.com/your-username/sql-analyzer-cli/main/scripts/install-precommit.sh | bash
```

#### GitHub Actions集成

将`.github/workflows/sql-analysis.yml`文件复制到您的项目中，并在仓库设置中添加`OPENAI_API_KEY`密钥。

## 📖 详细文档

- [GitHub Actions工作流配置](docs/github-workflow.md)
- [API参考文档](docs/api-reference.md)
- [自定义规则配置](docs/custom-rules.md)

## 🛠️ 开发

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/your-username/sql-analyzer-cli.git
cd sql-analyzer-cli

# 安装依赖
bun install

# 运行开发模式
bun run dev

# 构建项目
bun run build

# 运行测试
bun test
```

### 项目结构

```
sql-analyzer-cli/
├── bin/                    # CLI入口点
│   ├── cli.js             # 主CLI文件
├── src/                    # 源代码
│   ├── cli/               # CLI命令模块
│   │   ├── commandRegistry.js  # 命令注册器
│   │   └── commands/      # 命令模块目录
│   │       ├── analyze.js    # analyze命令
│   │       ├── api.js        # api命令
│   │       ├── config.js     # config命令及其子命令
│   │       ├── history.js    # history命令及其子命令
│   │       ├── init.js       # init命令
│   │       ├── learn.js      # learn命令
│   │       ├── status.js     # status命令
│   │       └── ui.js         # ui命令
│   ├── core/              # 核心功能
│   │   ├── analyzer.js
│   │   ├── graph/
│   │   └── performance/
│   ├── services/           # 服务层
│   │   ├── api/            # API服务
│   │   ├── history/
│   │   ├── knowledge/
│   │   └── ui/
│   └── utils/             # 工具函数
│       ├── config.js
│       └── logger.js
├── scripts/               # 脚本文件
│   ├── pre-commit.js      # Pre-commit钩子
│   └── install-precommit.sh
├── .github/workflows/     # GitHub Actions工作流
├── docs/                  # 文档
├── examples/              # 示例文件
```

### CLI架构说明

为了提高代码的可维护性和可扩展性，CLI已从单一文件拆分为模块化结构：
- 每个命令都有独立的模块文件，便于维护和扩展
- 使用命令注册器统一管理所有命令
- 保持了与原始版本完全相同的功能和接口
- 详细的CLI架构说明请参考 [src/cli/README.md](src/cli/README.md)

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 📄 许可证

本项目采用MIT许可证。详见[LICENSE](LICENSE)文件。

## 🙏 致谢

感谢所有贡献者和以下开源项目：

- [Commander.js](https://github.com/tj/commander.js) - CLI框架
- [LangChain](https://github.com/langchain-ai/langchainjs) - AI集成
- [OpenAI](https://openai.com/) - AI模型支持

## 📞 支持

如果您遇到问题或有建议，请：

1. 查看[文档](docs/)
2. 搜索[已知问题](https://github.com/your-username/sql-analyzer-cli/issues)
3. 创建[新问题](https://github.com/your-username/sql-analyzer-cli/issues/new)

---

⭐ 如果这个项目对您有帮助，请给我们一个星标！