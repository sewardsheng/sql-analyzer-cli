/**
 * 错误分类器测试
 * 测试错误分类和处理逻辑
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ErrorClassifier,
  ErrorType,
  ErrorSeverity,
  ErrorHandlingStrategy,
  classifyError,
  getErrorAdvice
} from '../error-classifier.js';

describe('ErrorClassifier - 错误分类测试', () => {
  let classifier: ErrorClassifier;

  beforeEach(() => {
    classifier = ErrorClassifier.getInstance();
  });

  afterEach(() => {
    // 清理任何状态
  });

  describe('系统错误分类', () => {
    it('应该正确分类内存错误', () => {
      const memoryErrors = [
        'OutOfMemoryError: JavaScript heap out of memory',
        'FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed',
        'RangeError: Maximum call stack size exceeded'
      ];

      for (const error of memoryErrors) {
        const result = classifier.classifyError(error);
        expect(result.type).toBe(ErrorType.MEMORY_ERROR);
        expect(result.severity).toBe(ErrorSeverity.HIGH);
        expect(result.strategy).toBe(ErrorHandlingStrategy.FAIL_FAST);
        expect(result.retryable).toBe(false);
      }
    });

    it('应该正确分类文件系统错误', () => {
      const fileSystemErrors = [
        'ENOENT: no such file or directory, open \'/path/to/file.txt\'',
        'EACCES: permission denied, open \'/restricted/file.txt\'',
        'EMFILE: too many open files, open'
      ];

      for (const error of fileSystemErrors) {
        const result = classifier.classifyError(error);
        expect(result.type).toBeOneOf([ErrorType.FILE_SYSTEM_ERROR, ErrorType.PERMISSION_DENIED]);
        expect(result.severity).toBeOneOf([ErrorSeverity.MEDIUM, ErrorSeverity.HIGH]);
      }
    });

    it('应该正确分类网络错误', () => {
      const networkErrors = [
        'ECONNREFUSED: connection refused',
        'ETIMEDOUT: operation timed out',
        'NetworkError: Failed to fetch',
        'timeout: connecting to server'
      ];

      for (const error of networkErrors) {
        const result = classifier.classifyError(error);
        expect(result.type).toBe(ErrorType.NETWORK_ERROR);
        expect(result.retryable).toBe(true);
      }
    });
  });

  describe('业务错误分类', () => {
    it('应该正确分类验证错误', () => {
      const validationErrors = [
        'ValidationError: Input validation failed',
        'invalid input: required field missing',
        'Schema validation error: property is required'
      ];

      for (const error of validationErrors) {
        const result = classifier.classifyError(error);
        expect(result.type).toBe(ErrorType.VALIDATION_ERROR);
        expect(result.severity).toBe(ErrorSeverity.LOW);
        expect(result.strategy).toBe(ErrorHandlingStrategy.FAIL_FAST);
        expect(result.retryable).toBe(false);
      }
    });

    it('应该正确分类数据未找到错误', () => {
      const notFoundErrors = [
        'NotFoundError: Resource not found',
        '404: Record not found',
        'DataError: No record found for the given criteria'
      ];

      for (const error of notFoundErrors) {
        const result = classifier.classifyError(error);
        expect(result.type).toBe(ErrorType.DATA_NOT_FOUND);
        expect(result.severity).toBe(ErrorSeverity.LOW);
      }
    });

    it('应该正确分类权限错误', () => {
      const permissionErrors = [
        'PermissionDenied: Access denied',
        '403: Forbidden',
        'Unauthorized: Insufficient permissions'
      ];

      for (const error of permissionErrors) {
        const result = classifier.classifyError(error);
        expect(result.type).toBe(ErrorType.PERMISSION_DENIED);
        expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      }
    });
  });

  describe('外部服务错误分类', () => {
    it('应该正确分类LLM服务错误', () => {
      const llmErrors = [
        'API key invalid: please check your OpenAI API key',
        '401 Unauthorized: Invalid authentication credentials',
        'APIError: Your request exceeded model quota limit',
        'RateLimitError: You have exceeded your current quota'
      ];

      for (const error of llmErrors) {
        const result = classifier.classifyError(error);
        expect(result.type).toBeOneOf([
          ErrorType.LLM_SERVICE_ERROR,
          ErrorType.RATE_LIMIT_ERROR
        ]);
      }
    });

    it('应该正确分类数据库错误', () => {
      const dbErrors = [
        'DatabaseConnectionError: Could not connect to database',
        'ConnectionPoolExhaustedError: All connections in use',
        'SQLSyntaxError: You have an error in your SQL syntax'
      ];

      for (const error of dbErrors) {
        const result = classifier.classifyError(error);
        expect(result.type).toBe(ErrorType.DATABASE_ERROR);
        expect(result.retryable).toBe(true);
      }
    });

    it('应该正确分类API错误', () => {
      const apiErrors = [
        'HTTPError: 500 Internal Server Error',
        'FetchError: request to https://api.example.com failed',
        'NetworkError: request timeout'
      ];

      for (const error of apiErrors) {
        const result = classifier.classifyError(error);
        expect(result.type).toBeOneOf([
          ErrorType.NETWORK_ERROR,
          ErrorType.LLM_SERVICE_ERROR
        ]);
      }
    });
  });

  describe('配置错误分类', () => {
    it('应该正确分类配置错误', () => {
      const configErrors = [
        'ConfigError: Missing required configuration property',
        'Configuration file not found',
        'Invalid configuration format: expected JSON'
      ];

      for (const error of configErrors) {
        const result = classifier.classifyError(error);
        expect(result.type).toBe(ErrorType.CONFIG_ERROR);
        expect(result.severity).toBe(ErrorSeverity.HIGH);
        expect(result.retryable).toBe(false);
      }
    });

    it('应该正确分类依赖错误', () => {
      const dependencyErrors = [
        'ModuleNotFoundError: Cannot find module \'missing-module\'',
        'DependencyError: Required service is not available',
        'ImportError: Failed to import dependency'
      ];

      for (const error of dependencyErrors) {
        const result = classifier.classifyError(error);
        expect(result.type).toBe(ErrorType.DEPENDENCY_ERROR);
        expect(result.severity).toBe(ErrorSeverity.HIGH);
      }
    });
  });

  describe('敏感信息检测', () => {
    it('应该正确检测和脱敏API密钥', () => {
      const sensitiveErrors = [
        'API Error with api_key: sk-1234567890abcdef',
        'Authorization: Bearer abcdef1234567890',
        'Connection failed with config: {"password": "secret123"}'
      ];

      for (const error of sensitiveErrors) {
        const result = classifier.classifyError(error);
        expect(result.metadata?.originalMessage).toBeDefined();
        expect(result.metadata?.originalMessage).toContain(error);

        // 验证敏感信息不在用户消息中
        expect(result.userMessage).not.toContain('sk-1234567890abcdef');
        expect(result.userMessage).not.toContain('secret123');
      }
    });

    it('应该正确检测和脱敏邮箱地址', () => {
      const emailError = 'User registration failed for email: user@example.com';
      const result = classifier.classifyError(emailError);

      expect(result.metadata?.originalMessage).toContain('user@example.com');
      expect(result.userMessage).not.toContain('user@example.com');
    });

    it('应该正确检测和脱敏手机号', () => {
      const phoneError = 'SMS sending failed to number: 13800138000';
      const result = classifier.classifyError(phoneError);

      expect(result.metadata?.originalMessage).toContain('13800138000');
      expect(result.userMessage).not.toContain('13800138000');
    });
  });

  describe('错误严重程度', () => {
    it('应该正确设置错误的严重程度', () => {
      const testCases = [
        {
          error: 'ValidationError: input is required',
          expectedSeverity: ErrorSeverity.LOW,
          expectedRetryable: false
        },
        {
          error: 'ECONNREFUSED: connection refused',
          expectedSeverity: ErrorSeverity.HIGH,
          expectedRetryable: true
        },
        {
          error: 'OutOfMemoryError: heap out of memory',
          expectedSeverity: ErrorSeverity.HIGH,
          expectedRetryable: false
        },
        {
          error: 'RateLimitError: too many requests',
          expectedSeverity: ErrorSeverity.MEDIUM,
          expectedRetryable: true
        }
      ];

      for (const testCase of testCases) {
        const result = classifier.classifyError(testCase.error);
        expect(result.severity).toBe(testCase.expectedSeverity);
        expect(result.retryable).toBe(testCase.expectedRetryable);
      }
    });
  });

  describe('处理策略', () => {
    it('应该为不同错误类型推荐正确的处理策略', () => {
      const strategyTests = [
        {
          error: 'ValidationError: invalid input',
          expectedStrategy: ErrorHandlingStrategy.FAIL_FAST
        },
        {
          error: 'ETIMEDOUT: connection timeout',
          expectedStrategy: ErrorHandlingStrategy.RETRY
        },
        {
          error: 'EACCES: permission denied',
          expectedStrategy: ErrorHandlingStrategy.USER_INTERVENTION
        }
      ];

      for (const test of strategyTests) {
        const result = classifier.classifyError(test.error);
        expect(result.strategy).toBe(test.expectedStrategy);
      }
    });

    it('应该提供正确的处理建议', () => {
      const result = classifier.classifyError('ECONNREFUSED: connection refused');

      expect(result.suggestedActions).toContain('检查网络连接');
      expect(result.suggestedActions).toContain('验证服务状态');
      expect(result.suggestedActions.length).toBeGreaterThan(0);
    });
  });

  describe('重试延迟计算', () => {
    it('应该为不同错误类型计算合理的重试延迟', () => {
      const delayTests = [
        {
          error: 'ETIMEDOUT: network timeout',
          expectedDelayRange: [3000, 10000] // 3-10秒
        },
        {
          error: 'RateLimitError: too many requests',
          expectedDelayRange: [30000, 120000] // 30-120秒
        },
        {
          error: 'DatabaseConnectionError: connection failed',
          expectedDelayRange: [1000, 10000] // 1-10秒
        }
      ];

      for (const test of delayTests) {
        const result = classifier.classifyError(test.error);
        const advice = classifier.getHandlingAdvice(result);

        if (advice.retryDelay) {
          expect(advice.retryDelay).toBeGreaterThanOrEqual(test.expectedDelayRange[0]);
          expect(advice.retryDelay).toBeLessThanOrEqual(test.expectedDelayRange[1]);
        }
      }
    });
  });

  describe('未知错误处理', () => {
    it('应该正确分类未知错误', () => {
      const unknownErrors = [
        'Completely unknown error message',
        'Unexpected error: something went wrong',
        'Custom business logic error: invalid state'
      ];

      for (const error of unknownErrors) {
        const result = classifier.classifyError(error);
        expect(result.type).toBe(ErrorType.SYSTEM_ERROR);
        expect(result.severity).toBe(ErrorSeverity.MEDIUM);
        expect(result.userMessage).toContain('系统内部错误');
      }
    });

    it('应该为未知错误提供默认处理建议', () => {
      const result = classifier.classifyError('Unknown error occurred');

      expect(result.suggestedActions).toContain('查看详细日志');
      expect(result.suggestedActions).toContain('联系技术支持');
    });
  });

  describe('上下文信息', () => {
    it('应该正确包含上下文信息', () => {
      const context = {
        operation: 'userRegistration',
        userId: '12345',
        requestId: 'req-abc-123'
      };

      const result = classifier.classifyError('Validation failed', context);

      expect(result.metadata?.context).toEqual(context);
      expect(result.metadata?.context?.operation).toBe('userRegistration');
    });

    it('应该正确处理复杂上下文', () => {
      const context = {
        service: 'user-service',
        operation: 'createUser',
        retryCount: 3,
        lastSuccess: '2024-01-01T00:00:00Z',
        stackTrace: 'Error: Validation failed\n    at validateUser (user.js:45:10)'
      };

      const result = classifier.classifyError('Validation failed', context);

      expect(result.metadata?.context).toEqual(context);
    });
  });

  describe('便捷函数测试', () => {
    it('classifyError函数应该正常工作', () => {
      const result = classifyError('ECONNREFUSED: connection refused');

      expect(result).toBeDefined();
      expect(result.type).toBe(ErrorType.NETWORK_ERROR);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
    });

    it('getErrorAdvice函数应该提供完整建议', () => {
      const advice = getErrorAdvice('ValidationError: input required');

      expect(advice.classification).toBeDefined();
      expect(advice.advice).toBeDefined();
      expect(advice.userMessage).toBeDefined();

      expect(advice.advice.shouldRetry).toBe(false);
      expect(advice.advice.escalationNeeded).toBe(false);
    });
  });

  describe('单例模式', () => {
    it('应该返回相同的实例', () => {
      const instance1 = ErrorClassifier.getInstance();
      const instance2 = ErrorClassifier.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('应该在多次调用时保持状态', () => {
      const classifier = ErrorClassifier.getInstance();

      // 第一次分类
      const result1 = classifier.classifyError('Test error 1');

      // 第二次分类
      const result2 = classifier.classifyError('Test error 2');

      // 两个结果应该是独立的
      expect(result1.metadata?.originalMessage).toBe('Test error 1');
      expect(result2.metadata?.originalMessage).toBe('Test error 2');
    });
  });

  describe('边界条件和错误输入', () => {
    it('应该正确处理空字符串', () => {
      const result = classifier.classifyError('');

      expect(result.type).toBe(ErrorType.SYSTEM_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('应该正确处理null和undefined', () => {
      const result1 = classifier.classifyError(null as any);
      const result2 = classifier.classifyError(undefined as any);

      expect(result1.type).toBe(ErrorType.SYSTEM_ERROR);
      expect(result2.type).toBe(ErrorType.SYSTEM_ERROR);
    });

    it('应该正确处理非常长的错误消息', () => {
      const longError = 'A'.repeat(10000) + ' network timeout occurred';

      const result = classifier.classifyError(longError);

      expect(result.type).toBe(ErrorType.NETWORK_ERROR);
      expect(result.metadata?.originalMessage).toBe(longError);
    });
  });

  describe('并发安全性', () => {
    it('应该安全处理并发分类请求', async () => {
      const errors = Array(100).fill(null).map((_, i) => `Test error ${i}`);

      const promises = errors.map(error =>
        Promise.resolve(classifier.classifyError(error))
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      expect(results.every(result => result.type === ErrorType.SYSTEM_ERROR)).toBe(true);
    });
  });
});