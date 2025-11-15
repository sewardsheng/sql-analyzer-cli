# 提示词统一管理文档

## 概述

本项目已实现提示词的统一管理，将所有分析器的系统提示词从代码中分离到独立的Markdown文件中。这样做提高了可维护性、可复用性和可扩展性。

## 目录结构

```
src/prompts/
├── analyzers/                                  # 分析器提示词
│   ├── README.md                              # 分析器提示词使用指南
│   ├── coding-standards-checker.md            # 编码规范检查
│   ├── performance-analyzer.md                # 性能分析
│   ├── security-auditor.md                    # 安全审计
│   ├── sql-optimizer-and-suggester.md        # SQL优化建议
│   ├── sql-parser-and-dialect-normalizer.md  # SQL解析
│   └── intelligent-rule-learner.md            # 智能规则学习
└── rule-learning/                             # 规则学习提示词
    ├── README.md
    ├── rule-generation.md
    ├── rule-evaluation.md
    └── template-generation.md
```

## 提示词文件格式

每个提示词文件采用Markdown格式，包含以下部分：

### 1. 系统角色定义
使用二级标题 `## 系统角色 - XXX` 定义，说明分析器的角色和职责。

### 2. 任务说明
描述分析器需要完成的具体任务。

### 3. 输出格式
使用 `## 输出格式` 定义标准的JSON输出格式。

### 4. 多部分支持
一个文件可以包含多个相关的提示词部分，使用 `---` 分隔。

## 使用方式

### 加载提示词

```javascript
import { buildPrompt } from '../../utils/promptLoader.js';

// 基本用法
const { systemPrompt, userPrompt } = await buildPrompt(
  'coding-standards-checker.md',  // 文件名
  {},                              // 变量对象
  { 
    category: 'analyzers',         // 类别
    section: '编码规范检查'         // 要使用的部分
  }
);
```

### 参数说明

- **templateName**: 提示词文件名
- **variables**: 用于替换模板中 `{{variableName}}` 的变量对象
- **options.category**: 提示词类别，默认为 `'rule-learning'`，可选值：
  - `'analyzers'`: 分析器提示词
  - `'rule-learning'`: 规则学习提示词
- **options.section**: 要提取的特定部分，对应 `## 系统角色 - XXX` 中的 XXX

## 已完成的改进

### 1. 创建统一的提示词文件结构
- 在 `src/prompts/analyzers/` 目录下创建了所有分析器的提示词文件
- 每个文件包含清晰的角色定义、任务说明和输出格式

### 2. 更新提示词加载工具
- 增强 `promptLoader.js` 支持多目录和多部分提示词
- 添加 `category` 参数支持不同类别的提示词
- 添加 `section` 参数支持从一个文件中提取特定部分

### 3. 更新所有分析器
- 编码规范检查器 (CodingStandardsChecker)
- 性能分析器 (PerformanceAnalyzer)
- 安全审计器 (SecurityAuditor)
- SQL优化器 (SqlOptimizerAndSuggester)
- SQL解析器 (SqlParserAndDialectNormalizer)
- 智能规则学习器 (IntelligentRuleLearner)

## 优势

### 1. 可维护性
- 提示词与代码分离，易于查找和修改
- 统一的格式和结构，降低维护成本
- 版本控制更清晰

### 2. 可复用性
- 提示词可以在不同的分析器之间共享
- 支持参数化，适配不同场景
- 一个文件可以包含多个相关提示词

### 3. 可扩展性
- 添加新提示词只需创建新的Markdown文件
- 不需要修改代码逻辑
- 支持多语言提示词（通过文件组织）

### 4. 协作友好
- 非技术人员也可以修改提示词
- 便于团队协作和审查
- 清晰的文档和使用指南

## 最佳实践

### 1. 提示词编写
- 清晰定义角色和任务
- 使用结构化的JSON输出格式
- 提供示例和说明
- 保持简洁和专注

### 2. 文件组织
- 按功能模块组织提示词文件
- 相关的提示词放在同一个文件中
- 使用清晰的命名规范

### 3. 版本管理
- 重大更改时在文件顶部添加版本说明
- 保持向后兼容性
- 必要时创建新部分而非修改现有部分


## 相关文件

- `src/prompts/analyzers/README.md`: 分析器提示词详细说明
- `src/prompts/rule-learning/README.md`: 规则学习提示词详细说明
- `src/utils/promptLoader.js`: 提示词加载工具