# SQL Analyzer API

SQL语句智能分析与扫描API服务，提供性能优化、安全审计和编码规范检查功能。

## 🚀 功能特性

### 核心分析功能
- **性能分析**：索引优化、查询效率、执行计划分析
- **安全审计**：SQL注入检测、权限控制、数据保护
- **编码规范**：命名规范、格式标准、最佳实践

### 智能规则学习
- **自动规则生成**：基于历史数据智能学习生成审核规则
- **质量评估**：多维度评估生成规则的质量和可靠性
- **自动审批**：高质量规则自动审批，低质量规则人工审核

### 技术特性
- **多数据库支持**：MySQL、PostgreSQL、Oracle、SQL Server
- **批量分析**：支持批量SQL语句分析
- **历史记录**：完整的分析历史记录和管理
## 📋 快速开始

### 环境要求
- Node.js >= 18.0.0
- Bun >= 1.0.0 (推荐)

### 安装依赖
```bash
bun install
```

### 配置环境
复制环境变量示例文件：
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置必要的参数：
```bash
# 基础配置
NODE_ENV=development
API_HOST=0.0.0.0
API_PORT=3000

# LLM服务配置
CUSTOM_API_KEY=your_api_key_here
CUSTOM_MODEL=zai-org/GLM-4.6
CUSTOM_BASE_URL=https://api.siliconflow.cn/v1
```

### 启动服务
```bash
# 开发模式
bun run dev

# 生产模式
bun run start
```

### 访问API文档
启动服务后，访问：http://localhost:3000/api/docs

## 🔧 配置说明

### 基础配置
- `NODE_ENV`: 运行环境 (development/production)
- `API_HOST`: API服务主机地址
- `API_PORT`: API服务端口 (默认: 3000)

### LLM服务配置
- `CUSTOM_API_KEY`: LLM服务API密钥
- `CUSTOM_MODEL`: 使用的模型名称
- `CUSTOM_BASE_URL`: LLM服务基础URL

### 规则学习配置
- `RULE_LEARNING_ENABLED`: 是否启用规则学习
- `RULE_LEARNING_MIN_CONFIDENCE`: 最小学习置信度 (默认: 0.7)
- `RULE_EVALUATION_AUTO_APPROVAL_THRESHOLD`: 自动审批阈值 (默认: 70)

完整配置请参考 `.env.example` 文件。

## 📖 API使用

### SQL分析接口

#### 单条SQL分析
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT * FROM users WHERE id = 1",
    "options": {
      "performance": true,
      "security": true,
      "standards": true,
      "learn": true
    }
  }'
```

#### 批量SQL分析
```bash
curl -X POST http://localhost:3000/api/analyze/batch \
  -H "Content-Type: application/json" \
  -d '{
    "sqls": [
      "SELECT * FROM users WHERE id = 1",
      "SELECT name FROM products WHERE price > 100"
    ],
    "options": {
      "performance": true,
      "security": true,
      "standards": true
    }
  }'
```

### 规则学习管理

#### 获取学习配置
```bash
curl http://localhost:3000/api/rule-learning/config
```

#### 触发批量学习
```bash
curl -X POST http://localhost:3000/api/rule-learning/learn \
  -H "Content-Type: application/json" \
  -d '{
    "options": {
      "batchSize": 10,
      "minConfidence": 0.7
    }
  }'
```

#### 获取生成的规则
```bash
curl "http://localhost:3000/api/rule-learning/rules?page=1&limit=20"
```

## 🧠 智能规则学习

### 工作原理
1. **模式识别**：分析历史SQL分析结果，识别常见问题模式
2. **规则生成**：基于识别的模式自动生成标准化审核规则
3. **质量评估**：多维度评估生成规则的质量和可靠性
4. **自动审批**：高质量规则自动审批，低质量规则进入人工审核

### 规则分类
- **性能规则**：索引优化、查询效率、资源使用
- **安全规则**：SQL注入防护、权限控制、数据保护
- **规范规则**：编码标准、命名约定、格式规范

### 规则存储结构
```
rules/learning-rules/
├── approved/2025-11/          # 自动审批的规则
├── manual_review/2025-11/     # 需人工审核的规则
└── issues/2025-11/            # 待评估规则
```

## 🧪 开发测试

### 运行测试
```bash
# 运行所有测试
bun test

# 运行特定测试文件
bun test tests/rule-learning.test.js

# 运行演示脚本
bun run examples/rule-learning-demo.js
```

### 调试工具
```bash
# 规则质量调试
bun run debug-rule-quality.js
```

## 📁 项目结构

```
sql-analyzer-api/
├── src/
│   ├── api/                    # API路由
│   ├── config/                 # 配置管理
│   ├── core/                   # 核心功能
│   │   ├── analyzers/          # SQL分析器
│   │   ├── knowledge/          # 知识库管理
│   │   └── tools/              # 分析工具
│   ├── prompts/                # LLM提示词
│   ├── services/               # 业务服务
│   │   └── rule-learning/      # 规则学习服务
│   └── utils/                  # 工具函数
├── rules/                      # 规则文件
├── tests/                      # 测试文件
├── examples/                   # 示例脚本
└── docs/                       # 文档
```

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📝 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🔗 相关链接

- [API文档](http://localhost:3000/api/docs)
- [规则学习演示](examples/rule-learning-demo.js)
- [测试用例](tests/rule-learning.test.js)

## 📞 支持

如有问题或建议，请通过以下方式联系：
- 提交 Issue
- 发送邮件至项目维护者

---

**注意**：本项目使用LLM服务进行智能分析，请确保正确配置API密钥和相关参数。