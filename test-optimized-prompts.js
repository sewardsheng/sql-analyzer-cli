/**
 * 测试优化后的提示词
 */

import { RuleGenerator } from './src/services/rule-learning/RuleGenerator.js';
import { IntelligentRuleLearner } from './src/services/rule-learning/IntelligentRuleLearner.js';

// 模拟LLM服务
class MockLLMService {
  async call(prompt) {
    console.log('🤖 模拟LLM调用，提示词长度:', prompt.length);
    
    // 模拟优化后的提示词响应
    if (prompt.includes('rule-generation')) {
      return {
        content: `您是一个专业的SQL规则生成专家，专门从SQL分析结果中提取和生成高质量的审核规则。

## 任务目标
基于提供的SQL分析结果，生成标准化、可执行的SQL审核规则。

## 分析上下文

**数据库类型**: mysql
**SQL查询**: SELECT * FROM users WHERE created_at > '2025-01-01'

**分析结果**:
{
  "performance": {
    "summary": "查询存在性能问题，需要优化索引",
    "issues": [
      {
        "type": "索引缺失",
        "description": "WHERE条件字段缺少索引",
        "severity": "high"
      }
    ],
    "recommendations": [
      "为created_at字段创建索引"
    ],
    "confidence": 0.8
  },
  "security": {
    "summary": "存在SQL注入风险",
    "vulnerabilities": [
      {
        "type": "SQL注入",
        "description": "硬编码参数存在注入风险",
        "severity": "high"
      }
    ],
    "recommendations": [
      "使用参数化查询"
    ],
    "confidence": 0.9
  },
  "standards": {
    "summary": "编码规范需要改进",
    "violations": [
      {
        "type": "命名规范",
        "description": "使用了SELECT *",
        "severity": "warning"
      }
    ],
    "recommendations": [
      "明确指定查询字段"
    ],
    "confidence": 0.7
  }
}

## 输出要求

请基于以上分析结果，生成2-3条高质量的SQL审核规则。每条规则应包含：

### 规则结构要求
1. **title**: 规则标题（简洁明确）
2. **category**: 规则类别（performance/security/standards）
3. **severity**: 严重程度（critical/high/medium/low）
4. **triggerCondition**: 触发条件描述
5. **description**: 详细问题描述
6. **recommendation**: 修复建议
7. **examples**: 示例代码（包含bad和good示例）
8. **confidence**: 置信度（0-1）

### 输出格式
请严格按照以下JSON格式输出：

\`\`\`json
{
  "rules": [
    {
      "title": "规则标题",
      "category": "performance",
      "severity": "high",
      "triggerCondition": "触发条件描述",
      "description": "详细问题描述",
      "recommendation": "修复建议",
      "examples": [
        {
          "bad": "不好的示例",
          "good": "好的示例"
        }
      ],
      "confidence": 0.9
    }
  ],
  "summary": {
    "totalRules": 1,
    "byCategory": {
      "performance": 1,
      "security": 0,
      "standards": 0
    },
    "bySeverity": {
      "low": 0,
      "medium": 0,
      "high": 1,
      "critical": 0
    }
  }
}
\`\`\`

基于以上分析结果，我生成以下SQL审核规则：

\`\`\`json
{
  "rules": [
    {
      "title": "时间字段查询缺少索引优化",
      "category": "performance",
      "severity": "high",
      "triggerCondition": "WHERE子句中使用时间字段进行范围查询但缺少相应索引",
      "description": "在时间字段上进行范围查询时，如果没有适当的索引支持，会导致全表扫描，严重影响查询性能，特别是在数据量大的表中",
      "recommendation": "为频繁用于查询条件的时间字段（如created_at、updated_at）创建B-tree索引，考虑复合索引以优化查询性能",
      "examples": [
        {
          "bad": "SELECT * FROM users WHERE created_at > '2025-01-01'",
          "good": "-- 先创建索引\\nCREATE INDEX idx_users_created_at ON users(created_at);\\n-- 然后查询\\nSELECT id, name, email FROM users WHERE created_at > '2025-01-01'"
        }
      ],
      "confidence": 0.9
    },
    {
      "title": "硬编码日期参数存在SQL注入风险",
      "category": "security",
      "severity": "medium",
      "triggerCondition": "SQL查询中包含硬编码的日期字符串参数",
      "description": "虽然硬编码日期相对安全，但这种做法缺乏灵活性，且在动态构建查询时可能引入SQL注入风险，特别是在用户输入参与构建查询的情况下",
      "recommendation": "使用参数化查询或预编译语句，即使对于日期参数也应使用参数绑定，确保查询安全性和代码可维护性",
      "examples": [
        {
          "bad": "SELECT * FROM users WHERE created_at > '2025-01-01'",
          "good": "SELECT id, name, email FROM users WHERE created_at > ?"
        }
      ],
      "confidence": 0.8
    },
    {
      "title": "SELECT * 查询影响性能和可维护性",
      "category": "standards",
      "severity": "medium",
      "triggerCondition": "查询语句使用SELECT * 而非明确指定字段列表",
      "description": "使用SELECT *会返回所有字段，增加网络传输开销，降低查询性能，同时降低代码可读性和可维护性，当表结构变更时可能导致意外问题",
      "recommendation": "明确指定需要的字段列表，避免使用SELECT *，特别是在生产环境和API接口中",
      "examples": [
        {
          "bad": "SELECT * FROM users WHERE created_at > '2025-01-01'",
          "good": "SELECT id, name, email, created_at FROM users WHERE created_at > '2025-01-01'"
        }
      ],
      "confidence": 0.85
    }
  ],
  "summary": {
    "totalRules": 3,
    "byCategory": {
      "performance": 1,
      "security": 1,
      "standards": 1
    },
    "bySeverity": {
      "low": 0,
      "medium": 2,
      "high": 1,
      "critical": 0
    }
  }
}
\`\`\``
      };
    }
    
    // 对于深度学习等其他提示词，也返回相同的JSON响应
    return { content: `基于以上分析结果，我生成以下SQL审核规则：

\`\`\`json
{
  "rules": [
    {
      "title": "时间字段查询缺少索引优化",
      "category": "performance",
      "severity": "high",
      "triggerCondition": "WHERE子句中使用时间字段进行范围查询但缺少相应索引",
      "description": "在时间字段上进行范围查询时，如果没有适当的索引支持，会导致全表扫描，严重影响查询性能，特别是在数据量大的表中",
      "recommendation": "为频繁用于查询条件的时间字段（如created_at、updated_at）创建B-tree索引，考虑复合索引以优化查询性能",
      "examples": [
        {
          "bad": "SELECT * FROM users WHERE created_at > '2025-01-01'",
          "good": "-- 先创建索引\\nCREATE INDEX idx_users_created_at ON users(created_at);\\n-- 然后查询\\nSELECT id, name, email FROM users WHERE created_at > '2025-01-01'"
        }
      ],
      "confidence": 0.9
    },
    {
      "title": "硬编码日期参数存在SQL注入风险",
      "category": "security",
      "severity": "medium",
      "triggerCondition": "SQL查询中包含硬编码的日期字符串参数",
      "description": "虽然硬编码日期相对安全，但这种做法缺乏灵活性，且在动态构建查询时可能引入SQL注入风险，特别是在用户输入参与构建查询的情况下",
      "recommendation": "使用参数化查询或预编译语句，即使对于日期参数也应使用参数绑定，确保查询安全性和代码可维护性",
      "examples": [
        {
          "bad": "SELECT * FROM users WHERE created_at > '2025-01-01'",
          "good": "SELECT id, name, email FROM users WHERE created_at > ?"
        }
      ],
      "confidence": 0.8
    },
    {
      "title": "SELECT * 查询影响性能和可维护性",
      "category": "standards",
      "severity": "medium",
      "triggerCondition": "查询语句使用SELECT * 而非明确指定字段列表",
      "description": "使用SELECT *会返回所有字段，增加网络传输开销，降低查询性能，同时降低代码可读性和可维护性，当表结构变更时可能导致意外问题",
      "recommendation": "明确指定需要的字段列表，避免使用SELECT *，特别是在生产环境和API接口中",
      "examples": [
        {
          "bad": "SELECT * FROM users WHERE created_at > '2025-01-01'",
          "good": "SELECT id, name, email, created_at FROM users WHERE created_at > '2025-01-01'"
        }
      ],
      "confidence": 0.85
    }
  ],
  "summary": {
    "totalRules": 3,
    "byCategory": {
      "performance": 1,
      "security": 1,
      "standards": 1
    },
    "bySeverity": {
      "low": 0,
      "medium": 2,
      "high": 1,
      "critical": 0
    }
  }
}
\`\`\`` };
  }
}

async function testOptimizedPrompts() {
  console.log('🧪 开始测试优化后的提示词...\n');
  
  try {
    // 创建模拟服务
    const mockLLMService = new MockLLMService();
    const ruleGenerator = new RuleGenerator(mockLLMService);
    
    // 创建学习上下文
    const learningContext = {
      sql: "SELECT * FROM users WHERE created_at > '2025-01-01'",
      databaseType: 'mysql',
      currentAnalysis: {
        data: {
          performance: {
            data: {
              summary: '查询存在性能问题，需要优化索引',
              issues: [
                { type: '索引缺失', description: 'WHERE条件字段缺少索引', severity: 'high' }
              ],
              recommendations: ['为created_at字段创建索引']
            },
            metadata: { confidence: 0.8 }
          },
          security: {
            data: {
              summary: '存在SQL注入风险',
              vulnerabilities: [
                { type: 'SQL注入', description: '硬编码参数存在注入风险', severity: 'high' }
              ],
              recommendations: ['使用参数化查询']
            },
            metadata: { confidence: 0.9 }
          },
          standards: {
            data: {
              summary: '编码规范需要改进',
              violations: [
                { type: '命名规范', description: '使用了SELECT *', severity: 'warning' }
              ],
              recommendations: ['明确指定查询字段']
            },
            metadata: { confidence: 0.7 }
          }
        }
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('📝 测试规则生成...');
    const rules = await ruleGenerator.generateRules(learningContext);
    
    console.log(`✅ 规则生成完成: ${rules.length}条规则`);
    
    if (rules.length > 0) {
      console.log('\n📋 生成的规则:');
      rules.forEach((rule, index) => {
        console.log(`\n${index + 1}. ${rule.title}`);
        console.log(`   类别: ${rule.category}`);
        console.log(`   严重程度: ${rule.severity}`);
        console.log(`   置信度: ${rule.confidence}`);
        console.log(`   描述: ${rule.description.substring(0, 100)}...`);
      });
    }
    
    console.log('\n🎉 优化后的提示词测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testOptimizedPrompts();