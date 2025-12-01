/**
 * 规则评估API路由
 * 老王我把智能评估算法集成到API了！支持RESTful调用
 */

import { Hono } from 'hono';
import { Context } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { RuleInfo } from '../../services/rule-evaluation/models/RuleModels';
import { formatSuccessResponse, formatErrorResponse } from '../../utils/api/response-formatter';
import { createValidationError } from '../../utils/api/api-error';
import { ServiceContainer } from '../../services/factories/ServiceContainer.js';

// 创建路由实例和服务容器
const evaluationRoutes = new Hono();
const serviceContainer = ServiceContainer.getInstance();

// 中间件
evaluationRoutes.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}));

evaluationRoutes.use('*', logger());

/**
 * 验证请求数据
 */
function validateRuleData(data: any): RuleInfo[] {
  if (!Array.isArray(data)) {
    throw createValidationError('请求数据必须是数组');
  }

  return data.map((item, index) => {
    if (!item.id || !item.title || !item.description) {
      throw createValidationError(`规则 ${index + 1} 缺少必要字段 (id, title, description)`);
    }

    return {
      id: item.id,
      title: item.title,
      description: item.description,
      category: item.category || 'unknown',
      severity: item.severity || 'medium',
      sqlPattern: item.sqlPattern || '',
      examples: item.examples || { bad: [], good: [] },
      status: item.status || 'draft',
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
      tags: Array.isArray(item.tags) ? item.tags : [],
      metadata: item.metadata || {}
    };
  });
}

/**
 * POST /api/evaluation/batch
 * 批量评估规则
 */
evaluationRoutes.post('/batch', async (c: Context) => {
  try {
    const body = await c.req.json();
    const { rules, options = {} } = body;

    if (!rules || !Array.isArray(rules)) {
      throw createValidationError('缺少规则数据或格式不正确');
    }

    // 验证规则数据
    const validatedRules = validateRuleData(rules);

    // 构建请求
    const request = {
      rules: validatedRules,
      options: {
        enableQualityCheck: options.enableQualityCheck !== false,
        enableDuplicateCheck: options.enableDuplicateCheck !== false,
        enableClassification: options.enableClassification !== false,
        qualityThreshold: options.qualityThreshold || 70,
        concurrency: options.concurrency || 3,
        enableCache: options.enableCache !== false
      },
      source: 'api' as const,
      metadata: {
        requestId: `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: c.req.header('X-User-ID'),
        sessionId: c.req.header('X-Session-ID')
      }
    };

    // 获取规则评估服务并执行评估
    const ruleEvaluationService = serviceContainer.getRuleEvaluationService();
    const result = await ruleEvaluationService.evaluateBatch(request);

    return c.json(formatSuccessResponse(result, '批量评估完成'));

  } catch (error: any) {
    console.error('批量评估API错误:', error);
    return c.json(
      formatErrorResponse(
        error.message || '批量评估失败',
        error.status || 500,
        error.code || 'BATCH_EVALUATION_ERROR'
      ),
      error.status || 500
    );
  }
});

/**
 * POST /api/evaluation/single
 * 评估单个规则
 */
evaluationRoutes.post('/single', async (c: Context) => {
  try {
    const body = await c.req.json();
    const { rule, options = {} } = body;

    if (!rule || typeof rule !== 'object') {
      throw createValidationError('缺少规则数据');
    }

    // 验证规则数据
    const validatedRules = validateRuleData([rule]);
    const validatedRule = validatedRules[0];

    // 构建请求
    const request = {
      rule: validatedRule,
      options: {
        enableQualityCheck: options.enableQualityCheck !== false,
        enableDuplicateCheck: options.enableDuplicateCheck !== false,
        enableClassification: options.enableClassification !== false,
        qualityThreshold: options.qualityThreshold || 70
      },
      source: 'api' as const
    };

    // 获取规则评估服务并执行评估
    const ruleEvaluationService = serviceContainer.getRuleEvaluationService();
    const result = await ruleEvaluationService.evaluateSingle(request);

    if (result.success) {
      return c.json(formatSuccessResponse(result, '单规则评估完成'));
    } else {
      return c.json(
        formatErrorResponse(
          result.errors?.join(', ') || '评估失败',
          400,
          'SINGLE_EVALUATION_ERROR'
        ),
        400
      );
    }

  } catch (error: any) {
    console.error('单规则评估API错误:', error);
    return c.json(
      formatErrorResponse(
        error.message || '单规则评估失败',
        error.status || 500,
        error.code || 'SINGLE_EVALUATION_ERROR'
      ),
      error.status || 500
    );
  }
});

/**
 * POST /api/evaluation/duplicate
 * 仅检查规则重复
 */
evaluationRoutes.post('/duplicate', async (c: Context) => {
  try {
    const body = await c.req.json();
    const { rule } = body;

    if (!rule || typeof rule !== 'object') {
      throw createValidationError('缺少规则数据');
    }

    // 验证规则数据
    const validatedRules = validateRuleData([rule]);
    const validatedRule = validatedRules[0];

    // 获取规则评估服务并执行去重检测
    const ruleEvaluationService = serviceContainer.getRuleEvaluationService();
    const result = await ruleEvaluationService.checkDuplicate(validatedRule);

    return c.json(formatSuccessResponse(result, '去重检测完成'));

  } catch (error: any) {
    console.error('去重检测API错误:', error);
    return c.json(
      formatErrorResponse(
        error.message || '去重检测失败',
        error.status || 500,
        error.code || 'DUPLICATE_CHECK_ERROR'
      ),
      error.status || 500
    );
  }
});

/**
 * GET /api/evaluation/health
 * 获取服务健康状态
 */
evaluationRoutes.get('/health', async (c: Context) => {
  try {
    const ruleEvaluationService = serviceContainer.getRuleEvaluationService();
    const healthStatus = await ruleEvaluationService.getHealthStatus();

    return c.json(formatSuccessResponse(healthStatus, '健康状态获取成功'));

  } catch (error: any) {
    console.error('健康检查API错误:', error);
    return c.json(
      formatErrorResponse(
        error.message || '健康检查失败',
        error.status || 500,
        error.code || 'HEALTH_CHECK_ERROR'
      ),
      error.status || 500
    );
  }
});

/**
 * GET /api/evaluation/stats
 * 获取服务统计信息
 */
evaluationRoutes.get('/stats', async (c: Context) => {
  try {
    const ruleEvaluationService = serviceContainer.getRuleEvaluationService();
    const stats = ruleEvaluationService.getServiceStats();

    return c.json(formatSuccessResponse(stats, '统计信息获取成功'));

  } catch (error: any) {
    console.error('统计信息API错误:', error);
    return c.json(
      formatErrorResponse(
        error.message || '统计信息获取失败',
        error.status || 500,
        error.code || 'STATS_ERROR'
      ),
      error.status || 500
    );
  }
});

/**
 * DELETE /api/evaluation/cache
 * 清理所有缓存
 */
evaluationRoutes.delete('/cache', async (c: Context) => {
  try {
    const ruleEvaluationService = serviceContainer.getRuleEvaluationService();
    await ruleEvaluationService.clearAllCaches();

    return c.json(formatSuccessResponse(
      { message: '所有缓存已清理' },
      '缓存清理成功'
    ));

  } catch (error: any) {
    console.error('清理缓存API错误:', error);
    return c.json(
      formatErrorResponse(
        error.message || '缓存清理失败',
        error.status || 500,
        error.code || 'CACHE_CLEAR_ERROR'
      ),
      error.status || 500
    );
  }
});

/**
 * GET /api/evaluation/config
 * 获取评估配置
 */
evaluationRoutes.get('/config', async (c: Context) => {
  try {
    // 这里可以返回当前配置信息
    const config = {
      defaultOptions: {
        enableQualityCheck: true,
        enableDuplicateCheck: true,
        enableClassification: true,
        qualityThreshold: 70,
        concurrency: 3,
        enableCache: true
      },
      supportedOptions: {
        qualityThreshold: { min: 0, max: 100, default: 70, description: '质量阈值 (0-100)' },
        concurrency: { min: 1, max: 10, default: 3, description: '并发数量' },
        enableQualityCheck: { type: 'boolean', default: true, description: '启用质量检查' },
        enableDuplicateCheck: { type: 'boolean', default: true, description: '启用重复检查' },
        enableClassification: { type: 'boolean', default: true, description: '启用自动分类' },
        enableCache: { type: 'boolean', default: true, description: '启用缓存' }
      },
      endpoints: {
        batch: 'POST /api/evaluation/batch - 批量评估',
        single: 'POST /api/evaluation/single - 单规则评估',
        duplicate: 'POST /api/evaluation/duplicate - 去重检测',
        health: 'GET /api/evaluation/health - 健康检查',
        stats: 'GET /api/evaluation/stats - 统计信息',
        cache: 'DELETE /api/evaluation/cache - 清理缓存',
        config: 'GET /api/evaluation/config - 获取配置'
      }
    };

    return c.json(formatSuccessResponse(config, '配置信息获取成功'));

  } catch (error: any) {
    console.error('获取配置API错误:', error);
    return c.json(
      formatErrorResponse(
        error.message || '配置获取失败',
        error.status || 500,
        error.code || 'CONFIG_ERROR'
      ),
      error.status || 500
    );
  }
});

/**
 * OPTIONS /api/evaluation/*
 * CORS 预检请求处理
 */
evaluationRoutes.options('*', async (c: Context) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-ID, X-Session-ID');
  c.header('Access-Control-Max-Age', '86400');
  return c.text('');
});

export default evaluationRoutes;