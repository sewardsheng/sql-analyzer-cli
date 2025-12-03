/**
 * 基础测试
 * 验证测试框架基本功能
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('基础测试 - 测试框架验证', () => {
  beforeEach(() => {
    // 测试前的清理
  });

  describe('配置管理', () => {
    it('应该正确导入配置常量', async () => {
      const { APP_CONFIG, getConfig } = await import('../config/AppConstants.js');

      expect(APP_CONFIG).toBeDefined();
      expect(APP_CONFIG.SCORING).toBeDefined();
      expect(getConfig).toBeDefined();
    });

    it('应该正确获取配置值', async () => {
      const { getConfig } = await import('../config/AppConstants.js');

      const excellentThreshold = getConfig('SCORING.QUALITY_THRESHOLDS.EXCELLENT');
      expect(excellentThreshold).toBe(90);
    });

    it('应该返回默认值当配置不存在', async () => {
      const { getConfig } = await import('../config/AppConstants.js');

      const nonExistent = getConfig('NON_EXISTENT.PATH', 'default');
      expect(nonExistent).toBe('default');
    });
  });

  describe('错误处理', () => {
    it('应该正确导入错误分类器', async () => {
      const { classifyError } = await import('../utils/error-classifier.js');

      expect(classifyError).toBeDefined();
      expect(typeof classifyError).toBe('function');
    });

    it('应该正确分类网络错误', async () => {
      const { classifyError } = await import('../utils/error-classifier.js');

      const result = classifyError('ECONNREFUSED: connection refused');
      expect(result.type).toBeDefined();
    });
  });

  describe('日志脱敏', () => {
    it('应该正确导入日志脱敏器', async () => {
      const { sanitizeLog } = await import('../utils/log-sanitizer.js');

      expect(sanitizeLog).toBeDefined();
      expect(typeof sanitizeLog).toBe('function');
    });

    it('应该脱敏API密钥', async () => {
      const { sanitizeLog } = await import('../utils/log-sanitizer.js');

      // 使用简单的API密钥格式进行测试
      const result = sanitizeLog('sk-1234567890abcdef', 'medium');
      expect(result).not.toContain('sk-1234567890abcdef');
    });
  });

  describe('环境设置', () => {
    it('应该正确设置测试环境', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(global.testUtils).toBeDefined();
    });

    it('testUtils应该包含必要的工具函数', () => {
      expect(typeof global.testUtils.createMockRule).toBe('function');
      expect(typeof global.testUtils.createMockAnalysisResult).toBe('function');
      expect(typeof global.testUtils.waitFor).toBe('function');
    });
  });
});