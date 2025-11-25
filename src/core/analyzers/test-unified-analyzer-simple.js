/**
 * UnifiedAnalyzer 简化测试套件
 * 验证Multi-Agent架构的基本功能
 */

import UnifiedAnalyzer from './unified-analyzer.js';
import GlobalContext from '../engine/context.js';

/**
 * 创建Mock LLM用于测试
 */
function createMockLLM() {
  const mockLLM = {
    calls: [],
    responses: {
      performance: {
        score: 85,
        confidence: 0.9,
        executionPlan: {
          estimatedCost: 1000,
          estimatedRows: 100,
          operations: []
        },
        issues: [{
          type: "扫描与索引瓶颈",
          severity: "High",
          confidence: 0.8,
          description: "缺少索引导致全表扫描",
          location: "WHERE子句",
          rootCause: "user_id字段没有索引",
          performanceImpact: "查询性能下降90%",
          evidence: "SELECT * FROM users WHERE user_id = 123"
        }],
        optimizations: [{
          issueId: "idx_001",
          approach: "Primary",
          suggestion: "为user_id字段创建索引",
          sql_rewrite: "CREATE INDEX idx_user_id ON users(user_id)",
          explanation: "索引可以大幅提升查询性能",
          expectedImprovement: "性能提升90%",
          implementationComplexity: "Low",
          tradeoffs: "增加存储开销",
          prerequisites: "无"
        }],
        metrics: {
          estimatedExecutionTime: "2s",
          ioOperations: 1000,
          memoryUsage: "10MB",
          cpuComplexity: "Medium",
          parallelismPotential: "Low"
        },
        recommendations: [{
          category: "Index",
          priority: "High",
          description: "创建索引优化查询性能",
          implementation: "执行CREATE INDEX语句",
          impact: "大幅提升查询性能"
        }]
      },
      security: {
        score: 75,
        confidence: 0.8,
        threatLevel: "中",
        attackSurface: {
          totalVectors: 2,
          highRiskVectors: 1,
          exploitableVectors: 1
        },
        vulnerabilities: [{
          id: "vuln_001",
          type: "SQL注入",
          subtype: "参数化查询缺失",
          severity: "High",
          confidence: 0.9,
          cwe_id: "CWE-89",
          cvss_score: 7.5,
          mitre_tactic: "Initial Access",
          mitre_technique: "T1190",
          description: "查询存在SQL注入风险",
          location: "WHERE子句",
          attackVector: "通过恶意输入注入SQL代码",
          exploitationScenario: "攻击者可以输入' OR '1'='1绕过验证",
          impact: {
            confidentiality: "High",
            integrity: "High",
            availability: "None",
            compliance: ["CWE-89"]
          },
          evidence: "WHERE user_id = " + "' OR '1'='1",
          conditions: "用户输入未经验证直接拼接"
        }],
        recommendations: [{
          vulnerabilityId: "vuln_001",
          priority: "Critical",
          category: "ImmediateFix",
          action: "使用参数化查询",
          description: "将动态SQL替换为参数化查询",
          implementation: {
            codeExample: "SELECT * FROM users WHERE user_id = ?",
            configuration: "启用预处理语句",
            prerequisites: "数据库支持参数化查询"
          },
          validation: {
            testMethod: "输入特殊字符测试",
            expectedResult: "特殊字符被正确转义"
          },
          alternatives: ["输入验证", "存储过程"],
          tradeoffs: "需要修改应用代码"
        }],
        securityMetrics: {
          totalVulnerabilities: 1,
          criticalVulnerabilities: 0,
          highRiskVulnerabilities: 1,
          exploitableVulnerabilities: 1,
          complianceViolations: 1,
          securityPosture: "Fair"
        },
        complianceAssessment: {
          gdpr: ["潜在的数据泄露风险"],
          hipaa: [],
          pciDss: [],
          sox: []
        },
        bestPractices: [{
          category: "InputValidation",
          practice: "使用参数化查询防止SQL注入",
          implementation: "在所有数据库查询中使用参数绑定",
          relevance: "直接防止SQL注入攻击"
        }]
      },
      standards: {
        score: 80,
        confidence: 0.85,
        complexityMetrics: {
          cyclomaticComplexity: 3,
          cognitiveComplexity: 2,
          nestingDepth: 1,
          queryLength: 45,
          joinCount: 0,
          subqueryCount: 0
        },
        violations: [{
          id: "violation_001",
          type: "命名规范",
          severity: "Medium",
          confidence: 0.8,
          description: "表名不符合命名规范",
          location: "FROM子句",
          rule: "表名应使用小写字母和下划线",
          suggestion: "将User重命名为user",
          impact: "影响代码可读性和一致性"
        }],
        fixed_sql: "SELECT id, name FROM user WHERE status = 'active' ORDER BY created_at DESC",
        qualityMetrics: {
          readability: 85,
          maintainability: 80,
          portability: 90,
          standardsCompliance: 75
        },
        recommendations: [{
          category: "命名规范",
          priority: "Medium",
          description: "使用标准命名约定",
          implementation: "重命名表和字段以符合规范",
          impact: "提升代码质量和一致性"
        }]
      }
    },
    
    async invoke(messages, options = {}) {
      this.calls.push({ messages, options });
      
      // 根据系统消息内容判断分析类型
      const systemMessage = messages.find(m => m.role === 'system');
      const userMessage = messages.find(m => m.role === 'user');
      
      let response;
      if (systemMessage?.content?.includes('规范') || userMessage?.content?.includes('规范') ||
                 systemMessage?.content?.includes('标准') || userMessage?.content?.includes('标准')) {
        response = this.responses.standards;
      } else if (systemMessage?.content?.includes('安全') || userMessage?.content?.includes('安全')) {
        response = this.responses.security;
      } else if (systemMessage?.content?.includes('性能') || userMessage?.content?.includes('性能')) {
        response = this.responses.performance;
      } else {
        // 默认返回性能分析结果
        response = this.responses.performance;
      }
      
      return {
        content: JSON.stringify(response, null, 2)
      };
    }
  };
  
  return mockLLM;
}

/**
 * 创建测试用的UnifiedAnalyzer实例
 */
async function createTestUnifiedAnalyzer(mockLLM) {
  const analyzer = new UnifiedAnalyzer({
    parallelExecution: true,
    timeout: 5000,
    retryAttempts: 1
  });
  
  // 创建测试上下文
  const context = new GlobalContext(
    'SELECT * FROM users WHERE user_id = 123',
    {
      databaseType: 'mysql'
    }
  );
  
  // 初始化分析器
  await analyzer.initialize(context);
  
  // 替换所有工具的LLM调用器为Mock LLM
  if (analyzer.tools) {
    console.log('🔧 替换工具LLM调用器...');
    for (const [name, tool] of Object.entries(analyzer.tools)) {
      console.log(`🔧 处理工具: ${name}, 有llmInvoker: ${!!tool.llmInvoker}`);
      if (tool.llmInvoker) {
        // 保存原始调用器
        const originalInvoker = tool.llmInvoker;
        // 替换为Mock调用器
        tool.llmInvoker = async (messages, options) => {
          console.log(`🔧 Mock LLM被调用: ${name}`);
          return mockLLM.invoke(messages, options);
        };
        console.log(`✅ 工具 ${name} LLM调用器已替换`);
      }
    }
  }
  
  return { analyzer, context, mockLLM };
}

/**
 * 断言函数
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(`断言失败: ${message}`);
  }
}

/**
 * 测试单维度分析
 */
async function testSingleDimensionAnalysis() {
  console.log('\n📊 测试1: 单维度分析');
  
  const mockLLM = createMockLLM();
  const { analyzer, context } = await createTestUnifiedAnalyzer(mockLLM);
  
  try {
    // 只执行性能分析
    const params = {
      sql: context.sql,
      databaseType: context.databaseType
    };
    
    console.log('🔧 开始执行性能分析...');
    console.log('🔧 传递的参数:', params);
    console.log('🔧 context.sql:', context.sql);
    console.log('🔧 context.databaseType:', context.databaseType);
    const result = await analyzer.tools.performance.execute(params);
    
    console.log('✅ 性能分析结果:', {
      success: result.success,
      error: result.error,
      score: result.data?.score,
      issuesCount: result.data?.issues?.length || 0,
      optimizationsCount: result.data?.optimizations?.length || 0
    });
    
    // 验证Mock LLM被调用
    assert(mockLLM.calls.length === 1, '应该只调用1次LLM，实际调用' + mockLLM.calls.length);
    
    // 验证结果结构
    assert(result.success === true, '分析应该成功');
    assert(result.data.score === 85, '分数应该是85');
    assert(result.data.issues.length === 1, '应该有1个问题');
    assert(result.data.optimizations.length === 1, '应该有1个优化建议');
    
    console.log('✅ 单维度分析测试通过');
    return true;
    
  } catch (error) {
    console.error('❌ 单维度分析测试失败:', error.message);
    console.error('错误堆栈:', error.stack);
    console.error('Mock LLM调用次数:', mockLLM.calls.length);
    console.error('Mock LLM调用详情:', mockLLM.calls);
    return false;
  }
}

/**
 * 测试并行分析
 */
async function testParallelAnalysis() {
  console.log('\n🚀 测试2: 并行分析');
  
  const mockLLM = createMockLLM();
  const { analyzer, context } = await createTestUnifiedAnalyzer(mockLLM);
  
  try {
    const startTime = Date.now();
    const result = await analyzer.analyze(context);
    const duration = Date.now() - startTime;
    
    console.log('✅ 并行分析完成，耗时:', duration + 'ms');
    console.log('📊 分析结果摘要:', {
      success: result.success,
      performanceScore: result.data?.performance?.score,
      securityScore: result.data?.security?.score,
      standardsScore: result.data?.standards?.score
    });
    
    // 验证Mock LLM被调用3次（每个工具一次）
    assert(mockLLM.calls.length === 3, '应该调用3次LLM，实际调用' + mockLLM.calls.length);
    
    // 验证结果结构
    assert(result.success === true, '分析应该成功');
    assert(result.data.performance, '应该有性能分析结果');
    assert(result.data.security, '应该有安全分析结果');
    assert(result.data.standards, '应该有规范分析结果');
    
    console.log('✅ 并行分析测试通过');
    return true;
    
  } catch (error) {
    console.error('❌ 并行分析测试失败:', error.message);
    console.error('Mock LLM调用次数:', mockLLM.calls.length);
    return false;
  }
}

/**
 * 测试错误处理
 */
async function testErrorHandling() {
  console.log('\n🛡️ 测试3: 错误处理');
  
  const mockLLM = createMockLLM();
  const { analyzer, context } = await createTestUnifiedAnalyzer(mockLLM);
  
  // 模拟性能分析失败
  const originalInvoke = mockLLM.invoke;
  mockLLM.invoke = async function(messages, options) {
    const systemMessage = messages.find(m => m.role === 'system');
    if (systemMessage?.content?.includes('性能')) {
      throw new Error('模拟性能分析失败');
    }
    return originalInvoke.call(this, messages, options);
  };
  
  try {
    const result = await analyzer.analyze(context);
    
    console.log('✅ 错误处理测试完成');
    console.log('📊 结果摘要:', {
      success: result.success,
      hasPerformanceResult: !!result.data?.performance,
      hasSecurityResult: !!result.data?.security,
      hasStandardsResult: !!result.data?.standards
    });
    
    // 验证错误处理 - 性能分析可能失败，但其他应该成功
    assert(result.data.security, '安全分析应该成功');
    assert(result.data.standards, '规范分析应该成功');
    
    console.log('✅ 错误处理测试通过');
    return true;
    
  } catch (error) {
    console.error('❌ 错误处理测试失败:', error.message);
    return false;
  }
}

/**
 * 测试结果整合
 */
async function testResultIntegration() {
  console.log('\n🔗 测试4: 结果整合');
  
  const mockLLM = createMockLLM();
  const { analyzer, context } = await createTestUnifiedAnalyzer(mockLLM);
  
  try {
    const result = await analyzer.analyze(context);
    
    console.log('✅ 结果整合测试完成');
    console.log('📊 整合结果:', {
      success: result.success,
      performanceScore: result.data?.performance?.score,
      securityScore: result.data?.security?.score,
      standardsScore: result.data?.standards?.score,
      performanceIssues: result.data?.performance?.issues?.length || 0,
      securityVulnerabilities: result.data?.security?.vulnerabilities?.length || 0,
      standardsViolations: result.data?.standards?.violations?.length || 0
    });
    
    
    // 验证整合逻辑
    assert(result.success === true, '分析应该成功');
    assert(result.data.performance, '应该有性能分析结果');
    assert(result.data.security, '应该有安全分析结果');
    assert(result.data.standards, '应该有规范分析结果');
    
    // 验证字段映射
    assert(result.data.performance.issues, '性能分析应该有issues字段');
    assert(result.data.security.vulnerabilities, '安全分析应该有vulnerabilities字段');
    assert(result.data.standards.violations, '规范分析应该有violations字段');
    
    console.log('✅ 结果整合测试通过');
    return true;
    
  } catch (error) {
    console.error('❌ 结果整合测试失败:', error.message);
    return false;
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('🚀 开始UnifiedAnalyzer架构测试...\n');
  
  const tests = [
    { name: '单维度分析', fn: testSingleDimensionAnalysis },
    { name: '并行分析', fn: testParallelAnalysis },
    { name: '错误处理', fn: testErrorHandling },
    { name: '结果整合', fn: testResultIntegration }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) passed++;
    } catch (error) {
      console.error(`❌ ${test.name}测试异常:`, error.message);
    }
  }
  
  console.log('\n📋 测试摘要:');
  console.log('='.repeat(50));
  console.log(`总计: ${passed}/${total} 测试通过`);
  
  if (passed === total) {
    console.log('🎉 所有测试都通过了！新的Multi-Agent架构工作正常。');
  } else {
    console.log('⚠️  有测试失败，需要检查实现。');
  }
  
  return passed === total;
}

// 如果直接运行此文件，执行测试
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('test-unified-analyzer-simple.js')) {
  runAllTests().catch(console.error);
}

export { runAllTests };