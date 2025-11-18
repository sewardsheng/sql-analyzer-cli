# SQL分析器 Agent 系统架构分析

## 一、系统概述

这是一个基于 **LangChain** 和 **多代理协作** 的SQL分析系统,采用 **Coordinator-Analyzer** 模式实现多维度SQL代码审查。

### 核心特性
- 🔄 **多代理并行协作**: 5个专业分析器并行执行
- 🧠 **智能学习**: 具备规则学习和知识库功能
- ⚡ **快速模式**: 支持单次调用的快速分析
- 🔌 **模块化设计**: 基于继承的可扩展架构
- 📊 **多格式输出**: 支持CLI、API、UI多种交互方式

---

## 二、整体架构

### 2.1 系统分层

```
┌─────────────────────────────────────────────────────┐
│                   Interface Layer                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │   CLI    │  │   API    │  │   UI     │          │
│  └──────────┘  └──────────┘  └──────────┘          │
└─────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│                  Service Layer                       │
│  ┌──────────────┐  ┌──────────────┐                │
│  │   Analysis   │  │  Knowledge   │                │
│  │   Service    │  │   Service    │                │
│  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│                Coordination Layer                    │
│         ┌────────────────────────┐                  │
│         │  SqlAnalysisCoordinator │                 │
│         └────────────────────────┘                  │
└─────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│                  Analyzer Layer                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │PerformanceAnalyzer       │  ┌──────────┐          │
│  │          │  │SecurityAuditor│CodingStandardsChecker
│  └──────────┘  └──────────┘  └──────────┘          │
│  ┌──────────┐  ┌──────────┐                        │
│  │SqlOptimizer│ │RuleLearner│                       │
│  └──────────┘  └──────────┘                        │
└─────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│                   Core Layer                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │   LLM    │  │Knowledge │  │  Vector  │          │
│  │          │  │   Base   │  │  Store   │          │
│  └──────────┘  └──────────┘  └──────────┘          │
└─────────────────────────────────────────────────────┘
```

---

## 三、核心组件分析

### 3.1 协调器 (Coordinator)

**文件**: [`src/core/coordinator.js`](src/core/coordinator.js:19)

#### 职责
- 统筹所有分析器的执行
- 管理分析流程(并行/串行)
- 整合多维度分析结果
- 生成综合报告

#### 核心方法

```javascript
class SqlAnalysisCoordinator {
  // 完整分析流程
  async coordinateAnalysis(input) {
    // 1-3步: 性能/安全/规范 并行分析
    // 4步: 基于前3步结果生成优化建议
    // 5步: 规则学习(可选)
    // 6步: 生成综合报告
  }
  
  // 快速分析模式
  async quickAnalysis(input) {
    // 单次LLM调用,快速评分
  }
}
```

#### 执行流程

**完整模式**:
```
SQL输入 
  ↓
[并行执行]
  ├→ 性能分析 (PerformanceAnalyzer)
  ├→ 安全审计 (SecurityAuditor)  
  └→ 编码规范 (CodingStandardsChecker)
  ↓
[串行执行]
  ├→ 优化建议 (SqlOptimizer) - 基于前3步结果
  └→ 规则学习 (RuleLearner) - 可选
  ↓
综合报告生成
```

**快速模式**:
```
SQL输入 → QuickAnalyzer (单次LLM调用) → 快速评分
```

---

### 3.2 分析器基类 (BaseAnalyzer)

**文件**: [`src/core/analyzers/BaseAnalyzer.js`](src/core/analyzers/BaseAnalyzer.js:13)

#### 设计模式
采用 **模板方法模式** + **工厂模式**

#### 核心功能
```javascript
class BaseAnalyzer {
  // LLM初始化 - 所有子类共享
  async initialize() { }
  
  // 统一的LLM调用和JSON解析
  async invokeLLMAndParse(messages) { }
  
  // 标准化响应格式
  formatResponse(result, databaseType) { }
  
  // 分数字段标准化
  normalizeScoreFields(result) { }
  
  // 错误处理
  handleError(operation, error) { }
}
```

#### 优势
- ✅ 消除重复代码
- ✅ 统一错误处理
- ✅ 标准化输出格式
- ✅ 简化子类实现

---

### 3.3 专业分析器

#### 3.3.1 性能分析器 (PerformanceAnalyzer)

**文件**: [`src/core/analyzers/performanceAnalyzer.js`](src/core/analyzers/performanceAnalyzer.js:13)

**职责**:
- 识别数据库类型
- 分析查询性能瓶颈
- 索引使用评估
- 执行计划分析

**Prompt**: [`src/prompts/analyzers/performance-analysis.md`](src/prompts/analyzers/performance-analysis.md)

#### 3.3.2 安全审计器 (SecurityAuditor)

**文件**: [`src/core/analyzers/securityAuditor.js`](src/core/analyzers/securityAuditor.js)

**职责**:
- SQL注入风险检测
- 权限使用审查
- 敏感数据保护
- 安全最佳实践检查

**Prompt**: [`src/prompts/analyzers/security-audit.md`](src/prompts/analyzers/security-audit.md)

#### 3.3.3 编码规范检查器 (CodingStandardsChecker)

**文件**: [`src/core/analyzers/codingStandardsChecker.js`](src/core/analyzers/codingStandardsChecker.js)

**职责**:
- 命名规范检查
- 格式化检查
- SQL风格一致性
- 最佳实践遵循

**Prompt**: [`src/prompts/analyzers/coding-standards-check.md`](src/prompts/analyzers/coding-standards-check.md)

#### 3.3.4 SQL优化建议器 (SqlOptimizerAndSuggester)

**文件**: [`src/core/analyzers/sqlOptimizerAndSuggester.js`](src/core/analyzers/sqlOptimizerAndSuggester.js)

**职责**:
- 综合前3个分析器结果
- 生成优化SQL重写建议
- 提供具体改进方案

**Prompt**: [`src/prompts/analyzers/optimization-suggestions.md`](src/prompts/analyzers/optimization-suggestions.md)

#### 3.3.5 规则学习器 (IntelligentRuleLearner)

**文件**: [`src/core/analyzers/intelligentRuleLearner.js`](src/core/analyzers/intelligentRuleLearner.js)

**职责**:
- 从分析结果中提取规则
- 规则模板生成
- 知识库更新

**Prompt**: [`src/prompts/analyzers/intelligent-rule-learner.md`](src/prompts/analyzers/intelligent-rule-learner.md)

#### 3.3.6 快速分析器 (QuickAnalyzer)

**文件**: [`src/core/analyzers/quickAnalyzer.js`](src/core/analyzers/quickAnalyzer.js)

**职责**:
- 单次LLM调用
- 快速评分(0-100)
- 识别关键问题
- 适用于CI/CD场景

**Prompt**: [`src/prompts/analyzers/quick-analysis.md`](src/prompts/analyzers/quick-analysis.md)

---

### 3.4 Prompt管理系统

**文件**: [`src/utils/promptLoader.js`](src/utils/promptLoader.js:1)

#### 核心功能

```javascript
// 加载和构建prompt
async function buildPrompt(templateName, variables, options) {
  // 1. 加载markdown模板
  // 2. 替换变量
  // 3. 提取system和user部分
  return { systemPrompt, userPrompt };
}
```

#### Prompt结构
```markdown
## 系统角色定义
- 角色描述
- 能力说明

## 任务目标
- 分析目标
- 输出要求

## 输出格式
- JSON Schema
- 字段说明

## 指导原则
- 分析重点
- 注意事项
```

---

### 3.5 知识库系统

**文件**: [`src/core/knowledgeBase.js`](src/core/knowledgeBase.js:1)

#### 组件
- **VectorStore**: 向量存储(基于LangChain)
- **Knowledge Service**: 知识管理服务
- **Retrieve Tool**: 检索工具

#### 功能
```javascript
// 检索相关文档
async function retrieveKnowledge(query, k = 4) {
  // 从向量存储中检索相似文档
  return { success: true, data: documents };
}
```

---

## 四、数据流分析

### 4.1 完整分析流程

```
用户输入 (CLI/API/UI)
  ↓
AnalysisService.analyzeSql()
  ├→ 验证输入
  ├→ 准备SQL查询
  ├→ 执行核心分析 → Coordinator.coordinateAnalysis()
  │                     ↓
  │   ┌─────────────────────────────────────┐
  │   │    [并行执行 - Phase 1]             │
  │   │  PerformanceAnalyzer.analyze()       │
  │   │  SecurityAuditor.audit()             │
  │   │  CodingStandardsChecker.check()      │
  │   │    ↓ (识别数据库类型)                │
  │   │  Promise.all([...])                  │
  │   └─────────────────────────────────────┘
  │                     ↓
  │   ┌─────────────────────────────────────┐
  │   │    [串行执行 - Phase 2]             │
  │   │  SqlOptimizer.optimize()             │
  │   │    (基于Phase 1结果 + databaseType)  │
  │   │    ↓                                 │
  │   │  RuleLearner.learn() (可选)          │
  │   └─────────────────────────────────────┘
  │                     ↓
  │   ┌─────────────────────────────────────┐
  │   │    [报告生成]                        │
  │   │  ReportGenerator.generate()          │
  │   │    - 整合所有分析结果                 │
  │   │    - 生成综合评分                    │
  │   │    - 格式化输出                      │
  │   └─────────────────────────────────────┘
  ├→ 保存历史记录
  └→ 显示结果
```

### 4.2 快速分析流程

```
用户输入 --quick
  ↓
AnalysisService.analyzeSql()
  ↓
Coordinator.quickAnalysis()
  ↓
QuickAnalyzer.analyze()
  ├→ 单次LLM调用
  ├→ 快速评分(0-100)
  └→ 识别关键问题
  ↓
返回结果 (适用于CI/CD)
```

---

## 五、技术栈

### 5.1 核心依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| `@langchain/openai` | ^1.1.0 | LLM集成 |
| `@langchain/community` | ^1.0.2 | 向量存储 |
| `commander` | ^11.1.0 | CLI框架 |
| `hono` | ^4.0.0 | API服务器 |
| `ink` | ^6.5.0 | 终端UI |
| `chalk` | ^5.3.0 | 终端颜色 |

### 5.2 运行环境
- **Runtime**: Bun (>=1.0.0)
- **Node**: 兼容(通过polyfill)
- **类型**: ES Module

---

## 六、设计模式分析

### 6.1 使用的设计模式

1. **策略模式** - 不同的分析器实现不同的分析策略
2. **模板方法模式** - BaseAnalyzer定义通用流程
3. **工厂模式** - `createXXXTool()`函数创建分析器实例
4. **观察者模式** - 进度条和日志系统
5. **单例模式** - 服务实例管理
6. **责任链模式** - 分析流程的顺序执行

### 6.2 架构优势

✅ **高内聚低耦合**: 每个分析器独立,通过协调器解耦  
✅ **可扩展性**: 易于添加新分析器  
✅ **可测试性**: 每个组件可独立测试  
✅ **性能优化**: 并行执行提升速度  
✅ **配置灵活**: 可选择性启用/禁用分析器  

---

## 七、关键技术实现

### 7.1 并行执行优化

```javascript
// 协调器中的并行任务处理
const parallelTasks = [
  performanceAnalyzer.func({ sqlQuery }),
  securityAuditor.func({ sqlQuery }),
  standardsChecker.func({ sqlQuery })
];

const results = await Promise.all(parallelTasks);
```

### 7.2 JSON清洗机制

**文件**: [`src/utils/jsonCleaner.js`](src/utils/jsonCleaner.js)

- 处理LLM返回的非标准JSON
- 移除markdown代码块标记
- 容错解析

### 7.3 Prompt模板系统

- Markdown格式的prompt模板
- 变量替换机制
- System/User消息分离
- 易于维护和迭代

---

## 八、系统特色

### 8.1 智能学习能力

通过 [`RuleLearner`](src/core/analyzers/intelligentRuleLearner.js) 实现:
- 从分析结果中提取规则模式
- 生成规则模板
- 更新知识库

### 8.2 多模式支持

1. **完整分析模式**: 5个分析器全面检查
2. **快速分析模式**: 单次LLM调用快速评分
3. **Headless模式**: CI/CD集成,支持退出码
4. **交互模式**: 丰富的CLI/UI体验

### 8.3 多数据库支持

通过规则系统支持:
- MySQL
- PostgreSQL
- Oracle
- SQL Server
- SQLite
- ClickHouse

规则存储在 [`rules/`](rules/) 目录下,分为:
- 语法规则 (`syntax/`)
- DBA规则 (`dba-static-rules.md`)
- 优化规则 (`optimization/`)
- 安全规则 (`security/`)

---

## 九、性能优化策略

### 9.1 已实现的优化

1. **并行执行**: 前3个分析器并行运行
2. **配置缓存**: 预加载配置到内存
3. **LLM复用**: BaseAnalyzer统一管理LLM实例
4. **延迟初始化**: 按需初始化分析器

### 9.2 分析用时

```javascript
// 协调器中的计时
const analysisStartTime = Date.now();
// ... 执行分析 ...
const analysisDuration = (Date.now() - analysisStartTime) / 1000;
console.log(`⏱️  本次分析用时: ${analysisDuration.toFixed(2)} 秒`);
```

---

## 十、改进建议

### 10.1 架构层面

1. **引入消息队列**
   - 当前: 内存中的Promise.all
   - 建议: 使用消息队列(如BullMQ)处理大批量分析

2. **缓存机制**
   - 当前: 无缓存
   - 建议: 对相同SQL的分析结果进行缓存

3. **流式输出**
   - 当前: 等待所有分析完成
   - 建议: 实现流式输出,逐步返回结果

### 10.2 功能层面

1. **可视化分析报告**
   - 生成HTML/PDF格式的详细报告
   - 图表展示性能趋势

2. **规则权重配置**
   - 允许用户自定义规则优先级
   - 根据项目特点调整评分权重

3. **多SQL批量分析**
   - 当前: 已有基础实现
   - 建议: 增强并行处理能力

### 10.3 工程层面

1. **单元测试覆盖**
   - 当前测试覆盖率较低
   - 建议: 为每个分析器编写单元测试

2. **性能监控**
   - 添加性能指标收集
   - 分析瓶颈并优化

3. **错误重试机制**
   - 对LLM调用失败进行智能重试
   - 指数退避策略

---

## 十一、总结

这是一个**设计良好、架构清晰**的多代理SQL分析系统,主要特点:

### ✅ 优势
- 模块化设计,易于扩展
- 多代理并行协作,性能优秀
- 基于BaseAnalyzer的统一抽象
- 完善的Prompt管理系统
- 支持多种使用模式(CLI/API/UI)
- 智能学习能力

### ⚠️ 可优化点
- 缓存机制缺失
- 流式输出未实现
- 测试覆盖率可提升
- 规则权重配置不够灵活

### 🎯 总体评价
**⭐⭐⭐⭐☆ (8.5/10)**

这是一个**生产级质量**的agent系统,架构设计遵循SOLID原则,代码质量高,具备良好的可维护性和可扩展性。适合作为企业级SQL代码审查工具使用。