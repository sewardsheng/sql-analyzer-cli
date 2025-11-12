# 配置指南

## 概述

SQL Analyzer CLI 提供了灵活的配置系统，允许你自定义分析行为、输出格式和数据库类型等设置。

## 配置文件位置

配置文件按以下优先级加载：

1. 环境变量
2. 默认配置

## 配置项详解

### API 配置

| 配置项 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `CUSTOM_BASE_URL` | string | "https://api.siliconflow.cn/v1" | API基础URL |
| `CUSTOM_API_KEY` | string | - | API密钥 |
| `CUSTOM_MODEL` | string | "zai-org/GLM-4.6" | 使用的模型 |
| `CUSTOM_EMBEDDING_MODEL` | string | "BAAI/bge-m3" | 嵌入模型 |

### 数据库配置

| 配置项 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `DEFAULT_DATABASE_TYPE` | string | "mysql" | 默认数据库类型 |

### API服务器配置

| 配置项 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `API_PORT` | number | 3000 | API 服务端口 |
| `API_HOST` | string | "0.0.0.0" | API 服务主机 |
| `API_CORS_ENABLED` | boolean | true | 是否启用 CORS |
| `API_CORS_ORIGIN` | string | "*" | CORS允许的源 |

## 配置管理命令

### 交互式配置

```bash
sql-analyzer config
```