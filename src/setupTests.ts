import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { config } from './config/index.js';

// 模拟LLM服务
vi.mock('./core/llm-service.js', () => {
  const mockLLMService = {
    call: vi.fn().mockImplementation(async (prompt: string, options?: any) => {
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 100));

      // Catch-all: 统一为所有LLM调用返回质量评估结果
      // 确保测试环境中的LLM调用总是成功并返回85分

      if (prompt.includes('重复检测') || prompt.includes('相似性')) {
        return {
          success: true,
          content: JSON.stringify({
            isDuplicate: false,
            similarity: 0.1,
            duplicateType: 'none',
            reason: '规则内容不重复',
            confidence: 0.95,
            matchedRules: [],
            matchDetails: {}
          }),
          rawContent: JSON.stringify({
            isDuplicate: false,
            similarity: 0.1,
            duplicateType: 'none',
            reason: '规则内容不重复',
            confidence: 0.95,
            matchedRules: [],
            matchDetails: {}
          }),
          usage: {
            prompt_tokens: 100,
            completion_tokens: 150,
            total_tokens: 250
          },
          duration: 800,
          model: 'gpt-3.5-turbo',
          timestamp: new Date().toISOString()
        };
      }

      // 匹配质量评估相关提示词
      if (prompt.includes('质量评估专家') || prompt.includes('评估生成的SQL规则') || prompt.includes('实际可用性') || prompt.includes('任务目标') || prompt.includes('SQL规则质量评估专家')) {
        return {
          success: true,
          content: JSON.stringify({
            qualityScore: 85,
            qualityLevel: "good",
            shouldKeep: true,
            dimensionScores: {
              accuracy: 90,
              completeness: 80,
              practicality: 85,
              generality: 85,
              consistency: 85
            },
            strengths: [
              "核心思想正确，抓住了关键问题",
              "示例清晰易懂",
              "规则具有很高的实际应用价值"
            ],
            issues: [
              "可以进一步优化描述",
              "增加更多边界情况说明"
            ],
            recommendations: [
              "补充更详细的技术细节",
              "增加更多实际应用场景"
            ],
            confidence: 0.9,
            summary: "该规则质量良好，具有实际应用价值，建议采纳使用。"
          }),
          rawContent: JSON.stringify({
            qualityScore: 85,
            qualityLevel: "good",
            shouldKeep: true,
            dimensionScores: {
              accuracy: 90,
              completeness: 80,
              practicality: 85,
              generality: 85,
              consistency: 85
            }
          }),
          usage: {
            prompt_tokens: 150,
            completion_tokens: 200,
            total_tokens: 350
          },
          duration: 1200,
          model: 'gpt-3.5-turbo',
          timestamp: new Date().toISOString()
        };
      }

      // 默认情况：对于其他提示词，也返回质量评估结果（兜底机制）
      console.log('🔍 LLM mock收到未匹配的提示词，返回默认质量评估:', prompt.substring(0, 80) + '...');
      return {
        success: true,
        content: JSON.stringify({
          qualityScore: 85,
          qualityLevel: "good",
          shouldKeep: true,
          dimensionScores: {
            accuracy: 90,
            completeness: 80,
            practicality: 85,
            generality: 85,
            consistency: 85
          },
          strengths: ["默认：规则结构完整"],
          issues: [],
          recommendations: [],
          confidence: 0.9,
          summary: "默认质量评估：规则基本符合要求。"
        }),
        rawContent: JSON.stringify({
          qualityScore: 85,
          qualityLevel: "good"
        }),
        usage: {
          prompt_tokens: 100,
          completion_tokens: 100,
          total_tokens: 200
        },
        duration: 800,
        model: 'gpt-3.5-turbo',
        timestamp: new Date().toISOString()
      };
    }),

    
    batchCall: vi.fn().mockImplementation(async (prompts: string[]) => {
      return Promise.all(prompts.map(prompt => mockLLMService.call(prompt)));
    }),

    setConfig: vi.fn(),
    getConfig: vi.fn().mockReturnValue({
      apiKey: 'test-key',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 4000
    })
  };

  return {
    LLMService: vi.fn().mockImplementation(() => mockLLMService),
    getLLMService: vi.fn().mockReturnValue(mockLLMService),
    llmService: mockLLMService,
    default: mockLLMService
  };
});

// 模拟LangChain
vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        qualityScore: 85,
        qualityLevel: "good",
        shouldKeep: true,
        dimensionScores: {
          accuracy: 90,
          completeness: 80,
          practicality: 85,
          generality: 85,
          consistency: 85
        },
        confidence: 0.9,
        summary: "模拟评估结果"
      })
    }),
    batch: vi.fn().mockResolvedValue([
      {
        content: JSON.stringify({
          qualityScore: 85,
          qualityLevel: "good",
          shouldKeep: true,
          dimensionScores: {
            accuracy: 90,
            completeness: 80,
            practicality: 85,
            generality: 85,
            consistency: 85
          },
          confidence: 0.9,
          summary: "模拟评估结果"
        })
      }
    ])
  }))
}));

// 模拟文件系统操作
vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(true),
    readdirSync: vi.fn().mockReturnValue([]),
    statSync: vi.fn().mockReturnValue({
      isFile: () => true,
      isDirectory: () => false,
      size: 1024,
      mtime: new Date()
    }),
    mkdirSync: vi.fn(),
    rmSync: vi.fn()
  },
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(true),
  readdirSync: vi.fn().mockReturnValue([]),
  statSync: vi.fn().mockReturnValue({
    isFile: () => true,
    isDirectory: () => false,
    size: 1024,
    mtime: new Date()
  }),
  mkdirSync: vi.fn(),
  rmSync: vi.fn()
}));

// 模拟HTTP请求
vi.mock('node-fetch', () => ({
  default: vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      success: true,
      data: {}
    })
  })
}));

// 全局测试设置
beforeAll(async () => {
  // 设置测试环境变量
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';
  process.env.RULE_LEARNING_ENABLED = 'false'; // 禁用规则学习避免LLM调用
  process.env.LLM_API_KEY = 'test-key';
  process.env.LLM_MODEL = 'gpt-3.5-turbo';

  // 配置测试环境
  config.set('ruleLearning.enabled', false);
  config.set('llm.mockMode', true);

  // 设置测试超时
  vi.setConfig({
    testTimeout: 10000, // 10秒超时
    hookTimeout: 10000
  });

  // 禁用控制台输出以保持测试输出清洁
  global.console = {
    ...console,
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  // 添加全局测试工具
  global.testUtils = {
    // 创建模拟的规则信息
    createMockRule: (overrides = {}) => ({
      id: 'test-rule-1',
      title: '测试规则',
      description: '这是一个测试规则',
      category: 'sql-security',
      severity: 'medium',
      sqlPattern: 'SELECT * FROM users',
      examples: { bad: ['SELECT *'], good: ['SELECT id, name'] },
      status: 'draft',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      tags: ['test'],
      metadata: {},
      ...overrides
    }),

    // 创建模拟的分析结果
    createMockAnalysisResult: (overrides = {}) => ({
      success: true,
      data: {
        summary: 'SQL分析完成',
        issues: [],
        recommendations: [],
        confidence: 0.85
      },
      metadata: {
        processingTime: 1000,
        databaseType: 'mysql'
      },
      ...overrides
    }),

    // 创建模拟的评估结果
    createMockEvaluationResult: (overrides = {}) => ({
      isDuplicate: false,
      similarity: 0,
      duplicateType: 'none',
      reason: '无重复',
      confidence: 0.9,
      matchedRules: [],
      matchDetails: {},
      ...overrides
    }),

    // 等待异步操作
    waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

    // 创建文件系统模拟
    createMockFileSystem: () => {
      const mockFs = {
        readFile: vi.fn(),
        writeFile: vi.fn(),
        exists: vi.fn(),
        readdir: vi.fn(),
        stat: vi.fn(),
        mkdir: vi.fn()
      };
      return mockFs;
    },

    // 模拟LLM服务响应
    createMockLLMResponse: (content: string) => ({
      success: true,
      content,
      rawContent: content,
      usage: {
        prompt_tokens: 100,
        completion_tokens: 200,
        total_tokens: 300
      },
      duration: 1500,
      model: 'gpt-3.5-turbo',
      timestamp: new Date().toISOString()
    })
  };

  // 添加类型声明
  declare global {
    var testUtils: {
      createMockRule: (overrides?: any) => any;
      createMockAnalysisResult: (overrides?: any) => any;
      createMockEvaluationResult: (overrides?: any) => any;
      waitFor: (ms: number) => Promise<void>;
      createMockFileSystem: () => any;
      createMockLLMResponse: (content: string) => any;
    };
  }
});

afterAll(async () => {
  // 清理测试环境
  delete process.env.NODE_ENV;
  delete process.env.LOG_LEVEL;
  delete process.env.RULE_LEARNING_ENABLED;
  delete process.env.LLM_API_KEY;
  delete process.env.LLM_MODEL;

  // 恢复console
  global.console = console;
  delete global.testUtils;

  // 清理所有模拟
  vi.unmockAll?.();
});

beforeEach(() => {
  // 每个测试前的清理
  vi.clearAllMocks();

  // 重置配置
  config.set('ruleLearning.enabled', false);
  config.set('llm.mockMode', true);
});

afterEach(() => {
  // 每个测试后的清理
  vi.restoreAllMocks();

  // 清理定时器
  vi.clearAllTimers();

  // 清理事件监听器
  process.removeAllListeners();
});