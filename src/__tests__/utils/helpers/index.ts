/**
 * 测试辅助函数
 * 老王我专门为测试搞的一些SB工具函数
 */

/**
 * 创建一个模拟的分析结果
 */
export function createMockAnalysisResult(overrides: any = {}) {
  return {
    success: true,
    parsedContent: {
      summary: '模拟分析结果',
      allIssues: [],
      allRecommendations: [],
      sqlFixData: null,
      learning: null,
      ...overrides.parsedContent
    },
    ...overrides
  };
}

/**
 * 创建一个模拟的历史记录
 */
export function createMockHistory(overrides: any = {}) {
  return {
    id: 'test_history_1',
    timestamp: new Date().toISOString(),
    databaseType: 'mysql',
    type: 'file',
    input: {
      content: 'SELECT * FROM users',
      path: '/test.sql',
      name: 'test.sql'
    },
    result: {
      success: true,
      summary: '测试分析',
      issues: [],
      recommendations: [],
      confidence: 0.85,
      sqlFix: null
    },
    metadata: {
      processingTime: 100,
      analyzer: 'test',
      version: '1.0.0'
    },
    ...overrides
  };
}

/**
 * 等待指定时间（毫秒）
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 创建一个可控制的Promise
 */
export function createControlledPromise<T = any>() {
  let resolve: (value: T) => void;
  let reject: (reason?: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  }) as Promise<T> & {
    resolve: (value: T) => void;
    reject: (reason?: any) => void;
  };

  (promise as any).resolve = resolve!;
  (promise as any).reject = reject!;

  return promise;
}

/**
 * 生成随机字符串
 */
export function randomString(length: number = 10): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * 深度合并对象
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (source[key] !== undefined) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key] as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}