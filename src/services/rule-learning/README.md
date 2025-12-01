# 智能规则学习系统

## 概述

智能规则学习系统是SQL分析器的核心组件，能够从历史SQL分析数据中自动学习并生成高质量的审核规则，减少人工配置成本，提升分析准确性。

## 系统架构

```
智能规则学习系统
├── IntelligentRuleLearner.js     # 核心学习引擎
├── HistoryAnalyzer.js            # 历史数据分析器
├── RuleGenerator.js              # 规则生成器
├── QualityEvaluator.js           # 质量评估器
└── AutoApprover.js              # 自动审批器
```

## 核心组件

### 1. IntelligentRuleLearner (智能规则学习器)

**职责**: 协调整个学习流程，管理各个组件的协作

**主要功能**:
- 判断是否触发学习条件
- 协调历史数据分析、规则生成、质量评估和自动审批
- 提供批量学习和实时学习接口
- 管理学习配置和状态

**关键方法**:
```javascript
// 判断是否应该触发学习
async shouldTriggerLearning(sqlQuery, analysisResult)

// 从单个分析结果学习
async learnFromAnalysis(analysisResult, sqlQuery)

// 执行批量学习
async performBatchLearning(options)
```

### 2. HistoryAnalyzer (历史数据分析器)

**职责**: 分析历史SQL数据，识别模式和趋势

**主要功能**:
- SQL模式提取和分类
- 问题类型统计和分析
- 学习趋势分析
- 数据质量评估

**关键方法**:
```javascript
// 分析历史数据模式
async analyzePatterns(historyData)

// 提取SQL模式
extractSQLPatterns(sqlQueries)

// 分析问题模式
analyzeIssuePatterns(analysisResults)
```

### 3. RuleGenerator (规则生成器)

**职责**: 基于分析结果生成标准化规则

**主要功能**:
- 基于模板生成规则
- 规则去重和优化
- 多类别规则支持
- 规则格式标准化

**关键方法**:
```javascript
// 生成规则
async generateRules(learningData)

// 基于模板生成规则
generateFromTemplate(pattern, category)

// 规则去重
deduplicateRules(rules)
```

### 4. QualityEvaluator (质量评估器)

**职责**: 评估生成规则的质量和可靠性

**主要功能**:
- 基础规则验证
- LLM智能评估
- 多维度质量评分
- 改进建议生成

**关键方法**:
```javascript
// 评估规则质量
async evaluateRule(rule)

// 基础验证
performBasicValidation(rule)

// LLM评估
async performLLMEvaluation(rule)
```

### 5. AutoApprover (自动审批器)

**职责**: 自动审批高质量规则，减少人工干预

**主要功能**:
- 自动审批判断
- 重复规则检测
- 安全规则特殊处理
- 审批决策记录

**关键方法**:
```javascript
// 评估是否自动审批
async evaluateForAutoApproval(rule)

// 检测重复规则
async detectDuplicateRule(rule)

// 执行自动审批
async performAutoApproval(rule)
```

## 工作流程

### 1. 实时学习流程

```
SQL分析 → 保存历史记录 → 判断学习条件 → 执行学习 → 生成规则 → 质量评估 → 自动审批 → 存储规则
```

### 2. 批量学习流程

```
获取历史数据 → 数据分析 → 模式识别 → 规则生成 → 批量评估 → 自动审批 → 批量存储
```

### 3. 详细学习步骤

1. **触发判断**
   - 检查分析结果置信度
   - 检查SQL重复度
   - 检查可学习问题数量

2. **历史分析**
   - 提取SQL模式
   - 分析问题分布
   - 计算学习价值

3. **规则生成**
   - 选择合适模板
   - 填充规则内容
   - 生成规则元数据

4. **质量评估**
   - 基础格式验证
   - LLM内容评估
   - 综合质量评分

5. **自动审批**
   - 检查审批条件
   - 重复规则检测
   - 执行审批决策

## 配置管理

### 配置结构

```javascript
{
  learning: {
    enabled: true,                    // 是否启用学习
    minConfidence: 0.7,              // 最小置信度
    minBatchSize: 5,                 // 最小批量大小
    enableRealTimeLearning: true,    // 实时学习
    enableBatchLearning: true        // 批量学习
  },
  generation: {
    maxRulesPerLearning: 10,         // 最大生成规则数
    enableDeduplication: true,       // 启用去重
    deduplicationThreshold: 0.8      // 去重阈值
  },
  evaluation: {
    autoApprovalThreshold: 70,       // 自动审批阈值
    autoApprovalConfidence: 0.8,     // 审批置信度
    basicValidationWeight: 0.3,      // 基础验证权重
    llmEvaluationWeight: 0.7         // LLM评估权重
  },
  storage: {
    rulesRootDir: 'rules/learning-rules',  // 规则存储目录
    organizeByMonth: true,            // 按月组织
    keepRawAnalysis: true            // 保留原始数据
  },
  performance: {
    concurrentLearningTasks: 3,       // 并发任务数
    taskTimeout: 300000,             // 任务超时
    enableCache: true                // 启用缓存
  }
}
```

### 配置使用

```javascript
import { getRuleLearningConfig } from '../../config/rule-learning-config.js';

const config = getRuleLearningConfig();

// 获取配置
const enabled = config.get('learning.enabled');
const minConfidence = config.get('learning.minConfidence');

// 更新配置
config.set('learning.minConfidence', 0.8);
config.update({ generation: { maxRulesPerLearning: 15 } });

// 重置配置
config.reset();
```

## 规则存储

### 存储结构

```
rules/learning-rules/
├── approved/2025-11/          # 自动审批的规则
├── issues/2025-11/             # 待评估规则
└── manual_review/2025-11/      # 需人工审核规则
```

### 规则文件格式

```markdown
# 规则标题

## 基本信息
- **类别**: performance
- **严重程度**: medium
- **置信度**: 0.85
- **创建时间**: 2025-11-26T14:30:00.000Z

## 触发条件
检测到"SELECT * FROM {table} WHERE {primary_key} = {value}"模式

## 问题描述
在主键查询中使用SELECT *会导致不必要的I/O开销...

## 建议
明确指定需要的字段名，避免使用SELECT *。

## 示例
```sql
-- 不推荐
SELECT * FROM users WHERE id = 1;

-- 推荐
SELECT id, name, email FROM users WHERE id = 1;
```

## 学习来源
- 历史记录ID: hist_20251126_001
- 出现频率: 15次
- 平均置信度: 0.9
```

## API集成

### 分析路由集成

```javascript
// 在 src/api/routes/analyze.js 中
if (body.options?.learn !== false && result.success) {
  const config = getRuleLearningConfig();
  
  if (config.get('learning.enabled')) {
    const avgConfidence = calculateAverageConfidence(result);
    const minConfidence = config.get('learning.minConfidence');
    
    if (avgConfidence >= minConfidence) {
      const ruleLearner = getIntelligentRuleLearner(getLLMService(), historyService);
      ruleLearner.learnFromAnalysis(result, sqlQuery);
    }
  }
}
```

### 专用API路由

```javascript
// 规则学习管理API
GET    /api/rule-learning/config          // 获取配置
PUT    /api/rule-learning/config          // 更新配置
POST   /api/rule-learning/config/reset    // 重置配置
GET    /api/rule-learning/status          // 获取状态
POST   /api/rule-learning/learn           // 触发学习
GET    /api/rule-learning/history         // 学习历史
GET    /api/rule-learning/rules           // 规则列表
GET    /api/rule-learning/rules/:id       // 规则详情
POST   /api/rule-learning/rules/:id/approve // 审批规则
DELETE /api/rule-learning/rules/:id       // 删除规则
GET    /api/rule-learning/statistics      // 统计信息
DELETE /api/rule-learning/cleanup         // 清理数据
```

## 性能优化

### 1. 异步处理
- 所有学习操作异步执行，不阻塞主流程
- 使用队列管理批量学习任务
- 支持并发学习任务

### 2. 缓存机制
- 缓存分析结果和模式数据
- 缓存规则模板和评估结果
- 定期清理过期缓存

### 3. 批量优化
- 批量处理历史数据
- 批量生成和评估规则
- 批量存储和索引

### 4. 资源管理
- 限制并发任务数量
- 设置任务超时时间
- 监控内存使用情况

## 错误处理

### 1. 学习错误
- LLM服务不可用
- 历史数据访问失败
- 规则生成异常

### 2. 配置错误
- 无效配置参数
- 配置文件损坏
- 环境变量冲突

### 3. 存储错误
- 文件系统权限
- 磁盘空间不足
- 文件写入失败

### 错误处理策略

```javascript
try {
  const result = await ruleLearner.learnFromAnalysis(analysisResult, sqlQuery);
  return result;
} catch (error) {
  console.error('规则学习失败:', error.message);
  
  // 记录错误但不影响主流程
  // 发送告警通知
  // 降级处理
  
  return {
    success: false,
    error: error.message,
    fallback: '使用默认规则'
  };
}
```

## 监控和日志

### 1. 学习指标
- 学习触发次数
- 规则生成数量
- 自动审批率
- 规则质量分布

### 2. 性能指标
- 学习耗时
- 内存使用
- 并发任务数
- 缓存命中率

### 3. 错误指标
- 错误类型分布
- 错误频率
- 恢复时间

### 日志格式

```javascript
{
  timestamp: '2025-11-26T14:30:00.000Z',
  level: 'info',
  component: 'rule-learning',
  action: 'learnFromAnalysis',
  sqlHash: 'abc123',
  confidence: 0.85,
  rulesGenerated: 2,
  duration: 1500,
  success: true
}
```

## 测试

### 单元测试
- 每个组件独立测试
- 模拟数据和依赖
- 边界条件测试

### 集成测试
- 完整学习流程测试
- API接口测试
- 配置管理测试

### 性能测试
- 大数据量处理测试
- 并发性能测试
- 内存泄漏测试

### 测试运行

```bash
# 运行所有测试
pnpm test tests/rule-learning.test.js

# 运行特定测试
pnpm test tests/rule-learning.test.js --grep "配置管理"

# 运行演示
pnpm run examples/rule-learning-demo.js
```

## 扩展性

### 1. 新增规则类别
- 扩展规则模板
- 更新评估标准
- 调整审批策略

### 2. 新增数据源
- 支持多种历史数据格式
- 集成外部数据源
- 实时数据流处理

### 3. 新增评估维度
- 业务影响评估
- 成本效益分析
- 用户反馈集成

### 4. 新增存储方式
- 数据库存储
- 云存储集成
- 分布式存储

## 最佳实践

### 1. 配置管理
- 根据业务需求调整阈值
- 定期审查和优化配置
- 使用环境变量管理敏感配置

### 2. 规则质量
- 建立质量评估标准
- 定期审查生成的规则
- 及时清理低质量规则

### 3. 性能优化
- 监控系统性能指标
- 合理设置并发参数
- 定期清理缓存和临时数据

### 4. 安全考虑
- 限制规则生成权限
- 审查安全相关规则
- 建立规则变更审计

## 故障排除

### 常见问题

1. **学习不触发**
   - 检查配置是否启用
   - 检查置信度阈值
   - 检查历史数据量

2. **规则质量低**
   - 提高置信度要求
   - 增加高质量训练数据
   - 调整评估权重

3. **性能问题**
   - 减少批量处理大小
   - 增加并发任务限制
   - 优化缓存策略

4. **存储问题**
   - 检查磁盘空间
   - 检查文件权限
   - 检查路径配置

### 调试工具

```javascript
// 启用详细日志
config.set('logging.verbose', true);
config.set('logging.level', 'debug');

// 获取学习状态
const status = await ruleLearner.getLearningStatus();

// 获取性能指标
const metrics = await ruleLearner.getPerformanceMetrics();
```

## 版本历史

### v1.0.0 (2025-11-26)
- 初始版本发布
- 实现核心学习功能
- 支持规则生成和评估
- 提供完整的API接口
- 包含配置管理和监控

---

更多信息请参考：
- [使用文档](../../../docs/rule-learning-usage.md)
- [API文档](../../../docs/api.md)
- [测试文件](../../../tests/rule-learning.test.js)
- [演示脚本](../../../examples/rule-learning-demo.js)