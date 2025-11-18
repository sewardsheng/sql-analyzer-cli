# SQL分析器智能体架构图表

## 项目概述

本项目是一个基于多智能体架构的SQL分析工具，采用LangChain框架实现，支持多种数据库类型的SQL性能分析、安全审计和编码规范检查。

## 智能体架构图

```mermaid
graph TB
    subgraph "用户接口层"
        CLI[命令行接口]
        API[REST API]
        UI[用户界面]
    end
    
    subgraph "服务层"
        CS[配置服务]
        KS[知识库服务]
        AS[分析服务]
        RS[报告服务]
    end
    
    subgraph "协调层"
        C[协调器<br/>SqlAnalysisCoordinator]
    end
    
    subgraph "分析器层"
        PA[性能分析器<br/>PerformanceAnalyzer]
        SA[安全审计器<br/>SecurityAuditor]
        CSC[编码规范检查器<br/>CodingStandardsChecker]
        RL[规则学习器<br/>RuleLearner]
        QA[快速分析器<br/>QuickAnalyzer]
    end
    
    subgraph "核心层"
        LLM[大语言模型]
        VS[向量存储]
        KB[知识库]
        PR[提示词资源]
    end
    
    CLI --> AS
    API --> AS
    UI --> AS
    
    AS --> C
    CS --> C
    KS --> C
    RS --> C
    
    C --> PA
    C --> SA
    C --> CSC
    C --> RL
    C --> QA
    
    PA --> LLM
    SA --> LLM
    CSC --> LLM
    RL --> LLM
    QA --> LLM
    
    PA --> VS
    SA --> VS
    CSC --> VS
    RL --> VS
    QA --> VS
    
    RL --> KB
    VS --> KB
    KS --> KB
    
    PA --> PR
    SA --> PR
    CSC --> PR
    RL --> PR
    QA --> PR
```

## 智能体协作流程图

```mermaid
sequenceDiagram
    participant U as 用户
    participant C as 协调器
    participant PA as 性能分析器
    participant SA as 安全审计器
    participant CSC as 编码规范检查器
    participant RL as 规则学习器
    participant QA as 快速分析器
    participant RG as 报告生成器
    
    Note over U,RG: 完整分析模式
    U->>C: 提交SQL分析请求(完整模式)
    par 并行执行专业分析
        C->>PA: 启动性能分析
        C->>SA: 启动安全审计
        C->>CSC: 启动编码规范检查
    end
    
    PA-->>C: 返回性能分析结果
    SA-->>C: 返回安全审计结果
    CSC-->>C: 返回编码规范检查结果
    
    C->>RL: 基于分析结果学习新规则
    RL-->>C: 返回学习到的规则
    
    C->>RG: 整合所有结果生成报告
    RG-->>C: 返回完整分析报告
    C-->>U: 返回分析结果
    
    Note over U,RG: 快速分析模式
    U->>C: 提交SQL分析请求(快速模式)
    C->>QA: 启动快速分析
    QA-->>C: 返回快速分析结果
    C-->>U: 返回分析结果
```

## 智能体详细功能图

```mermaid
mindmap
  root((SQL分析器智能体))
    协调器
      ::icon(fa fa-project-diagram)
      初始化分析器
      协调分析流程
      整合分析结果
      管理执行模式
    性能分析器
      ::icon(fa fa-tachometer-alt)
      分析查询性能
      识别性能瓶颈
      提供优化建议
      支持多数据库
    安全审计器
      ::icon(fa fa-shield-alt)
      检测安全漏洞
      SQL注入防护
      权限审计
      安全最佳实践
    编码规范检查器
      ::icon(fa fa-code)
      代码风格检查
      命名规范验证
      语法正确性
      可读性评估
    规则学习器
      ::icon(fa fa-brain)
      从分析结果学习
      生成新规则
      更新知识库
      规则验证
    快速分析器
      ::icon(fa fa-bolt)
      轻量级分析
      快速反馈
      基础检查
      简化报告
```

## 技术架构特点

### 1. 模块化设计
- 每个智能体专注于特定领域的分析
- 基于BaseAnalyzer的统一继承结构
- 清晰的职责分离和接口定义

### 2. 并行处理
- 性能、安全和编码规范分析可并行执行
- 提高分析效率和响应速度
- 资源利用最大化

### 3. Prompt驱动
- 每个分析器使用专门的Prompt模板
- 支持多数据库类型的特定分析
- 可通过Prompt更新调整分析行为

### 4. 知识积累
- 规则学习器从分析结果中提取新规则
- 向量存储提供高效的语义检索
- 持续学习和改进的分析能力

## 文件结构

```
src/
├── core/
│   ├── coordinator.js          # 协调器实现
│   ├── analyzers/              # 分析器目录
│   │   ├── BaseAnalyzer.js     # 分析器基类
│   │   ├── performanceAnalyzer.js      # 性能分析器
│   │   ├── securityAuditor.js  # 安全审计器
│   │   ├── codingStandardsChecker.js   # 编码规范检查器
│   │   ├── intelligentRuleLearner.js    # 规则学习器
│   │   └── quickAnalyzer.js    # 快速分析器
│   ├── knowledgeBase.js        # 知识库
│   ├── reporter.js             # 报告生成器
│   └── vectorStore.js          # 向量存储
├── prompts/
│   ├── analyzers/              # 分析器提示词
│   ├── common/                 # 通用提示词
│   └── rule-learning/          # 规则学习提示词
└── services/
    ├── analysis/               # 分析服务
    ├── knowledge/              # 知识库服务
    └── config/                 # 配置服务
```

## 使用方式

### 完整分析模式
```bash
sql-analyzer analyze --file query.sql --mode full
```

### 快速分析模式
```bash
sql-analyzer analyze --file query.sql --mode quick
```

### API调用
```http
POST /api/analyze
Content-Type: application/json

{
  "sql": "SELECT * FROM users",
  "mode": "full",
  "database": "postgresql"
}
```

## 扩展性

系统设计支持轻松添加新的分析器智能体：

1. 继承BaseAnalyzer基类
2. 实现特定的分析方法
3. 添加对应的Prompt模板
4. 在协调器中注册新分析器
5. 更新配置和路由

这种设计使得系统能够不断适应新的分析需求和数据库技术。