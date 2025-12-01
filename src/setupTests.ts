import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

// 全局测试设置
beforeAll(() => {
  // 设置测试环境变量
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';

  // 禁用控制台输出以保持测试输出清洁
  global.console = {
    ...console,
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
});

afterAll(() => {
  // 清理测试环境
  delete process.env.NODE_ENV;
  delete process.env.LOG_LEVEL;

  // 恢复console
  global.console = console;
});

beforeEach(() => {
  // 每个测试前的清理
  vi.clearAllMocks();
});

afterEach(() => {
  // 每个测试后的清理
  vi.restoreAllMocks();
});