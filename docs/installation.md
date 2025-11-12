# SQL Analyzer CLI 安装指南

本指南将帮助您在不同环境中安装和配置 SQL Analyzer CLI 工具。

## 系统要求

### 必需环境

- **Node.js**: >= 18.0.0 或 **Bun**: >= 1.0.0
- **操作系统**: Windows 10+, macOS 10.15+, 或 Linux (Ubuntu 20.04+)
- **内存**: 至少 4GB RAM
- **网络**: 稳定的互联网连接（用于访问 OpenAI API）

### 推荐环境

- **Node.js**: >= 20.0.0
- **Bun**: >= 1.0.11
- **内存**: 8GB RAM 或更多
- **存储**: 至少 1GB 可用空间

## 安装方式

### 方式一：全局安装（推荐）

使用 npm 或 bun 进行全局安装：

```bash
# 使用 npm 安装
npm install -g sql-analyzer-cli

# 或使用 bun 安装（推荐）
bun install -g sql-analyzer-cli
```

安装完成后，您可以在任何位置使用 `sql-analyzer` 命令。

### 方式二：本地安装

如果您只想在当前项目中使用：

```bash
# 克隆仓库
git clone https://github.com/sewardsheng/sql-analyzer-cli.git
cd sql-analyzer-cli

# 安装依赖
bun install

# 创建链接（可选，使命令全局可用）
bun link
```

## 初始配置

#### 方法一：使用配置命令（推荐）

```bash
# 交互式配置
sql-analyzer config
```


#### 方法二：.env 文件

在项目根目录创建 `.env` 文件：

```bash
# 复制示例文件
cp .env.example .env

# 编辑 .env 文件，添加您的 API 密钥
CUSTOM_API_KEY=your_openai_api_key_here
```


### 2. 初始化知识库

首次使用前，需要加载 SQL 分析规则到知识库：

```bash
# 加载默认规则
sql-analyzer learn

# 或从自定义目录加载
sql-analyzer learn --rules-dir /path/to/your/rules
```

## 验证安装

### 1. 检查版本

```bash
sql-analyzer --version
```

您应该看到类似输出：`sql-analyzer-cli/1.0.0`

### 2. 运行简单分析

```bash
# 分析简单 SQL 语句
sql-analyzer analyze -s "SELECT * FROM users WHERE id = 1"
```

如果一切正常，您应该看到分析结果输出。

### 3. 检查配置

```bash
# 检查知识库状态
sql-analyzer status
```

## 常见问题

### 问题 1: 命令未找到

**症状**: 运行 `sql-analyzer` 时提示 "command not found"

**解决方案**:
- 确认您已使用 `-g` 参数进行全局安装
- 检查您的 PATH 环境变量是否包含 npm/bun 的全局安装路径
- 尝试使用 `npx sql-analyzer` 或 `bunx sql-analyzer` 作为临时解决方案
- 如使用源码安装，只可在本目录运行 `sql-analyzer` 命令

### 问题 2: API 密钥错误

**症状**: 提示 "未配置 OpenAI API 密钥" 或 API 调用失败

**解决方案**:
- 确认您的 API 密钥有效且有足够的额度
- 检查密钥是否正确配置（运行 `sql-analyzer config` 修正）

### 问题 3: 知识库初始化失败

**症状**: 运行 `sql-analyzer learn` 时出错

**解决方案**:
- 确认网络连接正常
- 检查 `rules` 目录是否存在且包含有效文件
- 尝试使用 `sql-analyzer learn reset` 强制重置知识库

### 问题 4: 内存不足

**症状**: 分析大型 SQL 文件时出现内存错误


## 卸载

如果您需要卸载 SQL Analyzer CLI：

```bash
# 使用 npm 卸载
npm uninstall -g sql-analyzer-cli

# 或使用 bun 卸载
bun uninstall -g sql-analyzer-cli

# 删除配置和数据文件（可选）
rm -rf ~/.sql-analyzer
```

## 下一步

安装完成后，您可以：

1. 阅读 [使用指南](./usage.md) 了解所有命令和选项
2. 查看 [配置指南](./configuration.md) 自定义工具行为
3. 探索 [API 文档](./api.md) 了解如何以编程方式使用工具

## 获取帮助

如果您在安装过程中遇到问题：

- 查看 [常见问题](#常见问题) 部分
- 提交 [GitHub Issue](https://github.com/sewardsheng/sql-analyzer-cli/issues)
- 发送邮件至：sewardsheng@gmail.com