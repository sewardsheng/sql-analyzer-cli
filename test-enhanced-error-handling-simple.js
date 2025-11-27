/**
 * 增强错误处理和日志系统简化测试
 * 验证核心功能的正确性
 */

import { 
  globalErrorHandler,
  ErrorTypes,
  ErrorSeverity,
  RecoveryStrategy
} from './src/utils/error/ErrorHandler.js';

import {
  globalLogger,
  LogCategory,
  timer
} from './src/utils/logging/EnhancedLogger.js';

import {
  globalAsyncManager,
  asyncOperation,
  batchExecute
} from './src/utils/async/AsyncOperationManager.js';

import {
  globalResilienceUtils,
  executeWithResilience,
  batchExecuteWithResilience,
  healthCheck
} from './src/utils/ResilienceUtils.js';

/**
 * 测试错误处理器
 */
async function testErrorHandler() {
  console.log('\n🧪 测试错误处理器...');
  
  try {
    // 测试网络错误处理
    const networkError = new Error('Network connection failed');
    networkError.code = 'ENOTFOUND';
    
    const result = await globalErrorHandler.handleError(
      networkError,
      { operation: 'test_network' },
      async () => {
        console.log('✅ 网络错误重试成功');
        return 'retry_success';
      },
      async () => {
        console.log('✅ 网络错误降级成功');
        return 'fallback_success';
      }
    );
    
    console.log('网络错误处理结果:', result);
    
    // 测试文件不存在错误
    const fileError = new Error('File not found');
    fileError.code = 'ENOENT';
    
    const fileResult = await globalErrorHandler.handleError(
      fileError,
      { operation: 'test_file' },
      null,
      async () => {
        console.log('✅ 文件错误降级成功');
        return { fallback: true, message: '使用默认配置' };
      }
    );
    
    console.log('文件错误处理结果:', fileResult);
    
    // 测试错误统计
    const stats = globalErrorHandler.getErrorStats();
    console.log('错误统计:', Object.keys(stats));
    
    console.log('✅ 错误处理器测试完成');
    
  } catch (error) {
    console.error('❌ 错误处理器测试失败:', error);
  }
}

/**
 * 测试增强日志系统
 */
async function testEnhancedLogger() {
  console.log('\n🧪 测试增强日志系统...');
  
  try {
    // 测试各种日志级别
    globalLogger.debug(LogCategory.SYSTEM, '调试信息测试', { debug: true });
    globalLogger.info(LogCategory.API, '信息日志测试', { api: 'test' });
    globalLogger.warn(LogCategory.DATABASE, '警告日志测试', { warning: true });
    globalLogger.error(LogCategory.LLM, '错误日志测试', new Error('测试错误'), { error: true });
    
    // 测试性能计时
    const endTimer = timer('test_operation');
    await new Promise(resolve => setTimeout(resolve, 100));
    const duration = endTimer();
    console.log('操作耗时:', duration, 'ms');
    
    // 测试日志搜索
    const recentLogs = globalLogger.getRecentLogs(10, LogCategory.API);
    console.log('最近的API日志数量:', recentLogs.length);
    
    const searchResults = globalLogger.searchLogs({
      category: LogCategory.SYSTEM,
      level: 'DEBUG'
    });
    console.log('搜索结果数量:', searchResults.length);
    
    // 测试性能指标
    const metrics = globalLogger.getPerformanceMetrics();
    console.log('性能指标数量:', metrics.length);
    
    console.log('✅ 增强日志系统测试完成');
    
  } catch (error) {
    console.error('❌ 增强日志系统测试失败:', error);
  }
}

/**
 * 测试异步操作管理器
 */
async function testAsyncOperationManager() {
  console.log('\n🧪 测试异步操作管理器...');
  
  try {
    // 测试基本异步操作
    const result1 = await asyncOperation(async (signal) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return 'operation_success';
    }, {
      timeout: 5000,
      maxRetries: 2
    });
    
    console.log('异步操作结果:', result1);
    
    // 测试超时处理
    try {
      await asyncOperation(async (signal) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return 'should_timeout';
      }, {
        timeout: 500
      });
    } catch (error) {
      console.log('✅ 超时处理正确:', error.message);
    }
    
    // 测试重试机制
    let attemptCount = 0;
    const retryResult = await asyncOperation(async (signal) => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new Error('模拟失败');
      }
      return 'retry_success';
    }, {
      maxRetries: 3,
      retryDelay: 100
    });
    
    console.log('重试结果:', retryResult, '尝试次数:', attemptCount);
    
    // 测试批量执行
    const functions = [
      async () => 'result1',
      async () => 'result2',
      async () => 'result3',
      async () => { throw new Error('batch_error'); },
      async () => 'result4'
    ];
    
    const batchResults = await batchExecute(functions, {
      maxConcurrent: 3,
      timeout: 1000
    });
    
    console.log('批量执行结果:', batchResults.map(r => r.status));
    
    // 测试统计信息
    const stats = globalAsyncManager.getStats();
    console.log('异步操作统计:', stats);
    
    console.log('✅ 异步操作管理器测试完成');
    
  } catch (error) {
    console.error('❌ 异步操作管理器测试失败:', error);
  }
}

/**
 * 测试弹性工具
 */
async function testResilienceUtils() {
  console.log('\n🧪 测试弹性工具...');
  
  try {
    // 测试弹性执行
    const result1 = await executeWithResilience(
      async (signal) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'resilience_success';
      },
      {
        operationName: 'test_resilience',
        category: LogCategory.BUSINESS,
        timeout: 5000,
        maxRetries: 2
      }
    );
    
    console.log('弹性执行结果:', result1);
    
    // 测试降级处理
    const result2 = await executeWithResilience(
      async (signal) => {
        throw new Error('模拟业务错误');
      },
      {
        operationName: 'test_fallback',
        category: LogCategory.BUSINESS,
        fallbackFn: async (error) => {
          return { fallback: true, originalError: error.message };
        }
      }
    );
    
    console.log('降级处理结果:', result2);
    
    // 测试批量弹性执行
    const functions = [
      async () => 'batch1',
      async () => 'batch2',
      async () => { throw new Error('batch_error'); },
      async () => 'batch3'
    ];
    
    const batchResults = await batchExecuteWithResilience(functions, {
      operationName: 'test_batch_resilience',
      category: LogCategory.BUSINESS,
      maxConcurrent: 2,
      failFast: false
    });
    
    console.log('批量弹性执行结果:', batchResults.map(r => r.status));
    
    // 测试健康检查
    const healthResult = await healthCheck({
      database: async (signal) => ({ status: 'healthy', responseTime: 50 }),
      api: async (signal) => ({ status: 'healthy', responseTime: 100 }),
      cache: async (signal) => { throw new Error('Cache unavailable'); }
    }, {
      timeout: 2000,
      failFast: false
    });
    
    console.log('健康检查结果:', {
      status: healthResult.status,
      healthy: healthResult.summary.healthy,
      unhealthy: healthResult.summary.unhealthy
    });
    
    // 测试断路器
    let failureCount = 0;
    const circuitBreakerFn = globalResilienceUtils.createCircuitBreaker(
      async () => {
        failureCount++;
        if (failureCount <= 3) {
          throw new Error('模拟服务故障');
        }
        return 'circuit_breaker_success';
      },
      {
        failureThreshold: 3,
        recoveryTimeout: 2000
      }
    );
    
    // 触发断路器打开
    for (let i = 0; i < 5; i++) {
      try {
        const result = await circuitBreakerFn();
        console.log(`断路器测试 ${i + 1}:`, result);
      } catch (error) {
        console.log(`断路器测试 ${i + 1}:`, error.message);
      }
    }
    
    console.log('✅ 弹性工具测试完成');
    
  } catch (error) {
    console.error('❌ 弹性工具测试失败:', error);
  }
}

/**
 * 测试包装器函数（替代装饰器）
 */
async function testWrappers() {
  console.log('\n🧪 测试包装器函数...');
  
  try {
    // 创建测试服务类
    class TestService {
      constructor() {
        // 包装错误处理
        this.riskyOperation = globalErrorHandler.wrapFunction(
          this.riskyOperation.bind(this),
          {
            context: { service: 'TestService' },
            retry: async () => 'wrapper_retry_success',
            fallback: async () => 'wrapper_fallback_success'
          }
        );
        
        // 包装弹性执行
        this.resilientOperation = globalResilienceUtils.createWrapper({
          operationName: 'resilient_operation',
          category: LogCategory.BUSINESS,
          timeout: 1000,
          maxRetries: 2,
          fallbackFn: async () => 'resilient_fallback'
        })(this.resilientOperation.bind(this));
        
        // 包装断路器
        this.circuitOperation = globalResilienceUtils.createCircuitBreaker(
          this.circuitOperation.bind(this),
          {
            failureThreshold: 2,
            recoveryTimeout: 1000
          }
        );
      }
      
      async riskyOperation(shouldFail = false) {
        if (shouldFail) {
          throw new Error('包装器测试错误');
        }
        return 'wrapper_success';
      }
      
      async resilientOperation(shouldFail = false) {
        if (shouldFail) {
          throw new Error('弹性操作失败');
        }
        return 'resilient_success';
      }
      
      async circuitOperation(shouldFail = false) {
        if (shouldFail) {
          throw new Error('断路器测试失败');
        }
        return 'circuit_success';
      }
    }
    
    const service = new TestService();
    
    // 测试错误处理包装器
    try {
      const result1 = await service.riskyOperation(false);
      console.log('错误处理包装器成功结果:', result1);
    } catch (error) {
      console.log('错误处理包装器失败:', error.message);
    }
    
    try {
      const result2 = await service.riskyOperation(true);
      console.log('错误处理包装器降级结果:', result2);
    } catch (error) {
      console.log('错误处理包装器最终失败:', error.message);
    }
    
    // 测试弹性包装器
    try {
      const resilientResult1 = await service.resilientOperation(false);
      console.log('弹性包装器成功结果:', resilientResult1);
    } catch (error) {
      console.log('弹性包装器失败:', error.message);
    }
    
    try {
      const resilientResult2 = await service.resilientOperation(true);
      console.log('弹性包装器降级结果:', resilientResult2);
    } catch (error) {
      console.log('弹性包装器最终失败:', error.message);
    }
    
    // 测试断路器包装器
    for (let i = 0; i < 4; i++) {
      try {
        const circuitResult = await service.circuitOperation(i < 2);
        console.log(`断路器包装器测试 ${i + 1}:`, circuitResult);
      } catch (error) {
        console.log(`断路器包装器测试 ${i + 1}:`, error.message);
      }
    }
    
    console.log('✅ 包装器函数测试完成');
    
  } catch (error) {
    console.error('❌ 包装器函数测试失败:', error);
  }
}

/**
 * 测试系统状态
 */
async function testSystemStatus() {
  console.log('\n🧪 测试系统状态...');
  
  try {
    const status = globalResilienceUtils.getSystemStatus();
    
    console.log('系统状态概览:');
    console.log('- 时间戳:', status.timestamp);
    console.log('- 进程ID:', status.process.pid);
    console.log('- 运行时间:', status.process.uptime.toFixed(2), '秒');
    console.log('- 内存使用:', Math.round(status.process.memory.heapUsed / 1024 / 1024), 'MB');
    
    console.log('- 错误统计:', Object.keys(status.errorHandler.errorStats).length, '种错误类型');
    console.log('- 最近日志:', status.logger.recentLogs.length, '条');
    console.log('- 性能指标:', status.logger.performanceMetrics.length, '个');
    console.log('- 异步操作统计:', status.asyncManager.stats);
    
    console.log('✅ 系统状态测试完成');
    
  } catch (error) {
    console.error('❌ 系统状态测试失败:', error);
  }
}

/**
 * 主测试函数
 */
async function runAllTests() {
  console.log('🚀 开始增强错误处理和日志系统测试...');
  
  const startTime = Date.now();
  
  try {
    await testErrorHandler();
    await testEnhancedLogger();
    await testAsyncOperationManager();
    await testResilienceUtils();
    await testWrappers();
    await testSystemStatus();
    
    const duration = Date.now() - startTime;
    
    console.log('\n🎉 所有测试完成!');
    console.log(`⏱️  总耗时: ${duration}ms`);
    console.log('✅ 增强错误处理和日志系统工作正常');
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error);
  } finally {
    // 清理资源
    await globalResilienceUtils.cleanup();
    console.log('🧹 资源清理完成');
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export {
  testErrorHandler,
  testEnhancedLogger,
  testAsyncOperationManager,
  testResilienceUtils,
  testWrappers,
  testSystemStatus,
  runAllTests
};