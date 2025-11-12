# 安装指南

## 环境要求

- Bun 1.0.0 或更高版本

## 安装步骤

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/sql-analyzer-cli.git
cd sql-analyzer-cli
```

### 2. 安装依赖

```bash
bun install
```

### 3. 配置环境变量

复制环境变量示例文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，添加你的 OpenAI API 密钥：

```
OPENAI_API_KEY=your_openai_api_key_here
```

### 4. 全局安装（可选）

如果你想在任何地方使用这个工具：

```bash
bun install -g .
```

## 验证安装

运行以下命令验证安装是否成功：

```bash
sql-analyzer --help
```

或者，如果你没有全局安装：

```bash
bun start start --help
```

## 卸载

如果你全局安装了该工具，可以使用以下命令卸载：

```bash
bun uninstall -g sql-analyzer-cli
```

## 故障排除

### 常见问题

1. **命令未找到**
   - 确保你已经全局安装了工具：`bun install -g .`
   - 或者使用 `bunx sql-analyzer` 运行

2. **API密钥错误**
   - 确保 `.env` 文件中的 `OPENAI_API_KEY` 是有效的
   - 检查是否有额外的空格或特殊字符

3. **依赖安装失败**
   - 尝试清除bun缓存：`bun pm cache clean`
   - 删除 `node_modules` 和 `bun.lockb`，然后重新安装

### 获取帮助

如果遇到问题，请：

1. 查看项目的 [Issues 页面](https://github.com/sewardsheng/sql-analyzer-cli/issues)
2. 创建新的 Issue 并提供详细的错误信息
3. 或者发送邮件至 sewardsheng@gmail.com