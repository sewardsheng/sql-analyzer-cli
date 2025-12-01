/**
 * SQL分析路由模块
 * 使用新的SQLAnalyzer
 */

import { Context } from 'hono';
import { Hono } from 'hono';
import { getGlobalLogger } from '../../utils/logger.js';
import { llmJsonParser } from '../../core/llm-json-parser.js';
import { ServiceContainer } from '../../services/factories/ServiceContainer.js';
import { DatabaseIdentifier } from '../../core/identification/db-identifier.js';

// 使用ServiceContainer获取SQL分析器实例
const serviceContainer = ServiceContainer.getInstance();
const sqlAnalyzer = serviceContainer.getSQLAnalyzer();

// 初始化数据库识别器
const dbIdentifier = new DatabaseIdentifier();

import { createValidationError } from '../../utils/api/api-error.js';
import { formatSuccessResponse, formatErrorResponse } from '../../utils/api/response-formatter.js';
// @ts-ignore
import { config } from '../../config/index.js';
import { warn as logWarn, error as logError, LogCategory } from '../../utils/logger.js';

// 分析选项接口
interface AnalysisOptions {
  performance?: boolean;
  security?: boolean;
  standards?: boolean;
  learn?: boolean;
  databaseType?: string;
}

// 批量分析请求体接口
interface BatchAnalysisRequest {
  sqls: (string | { sql: string })[];
  options?: AnalysisOptions;
}

// 分析结果接口
interface AnalysisResult {
  success: boolean;
  data: any;
  metadata?: any;
  sql?: string;
}

// 从配置管理器获取学习配置
function getLearningConfig() {
  return config.getRuleLearningConfig();
}

/**
 * 注册分析相关路由
 * @param app - Hono应用实例
 */
export function registerAnalyzeRoutes(app: Hono): void {
  try {
  /**
   * POST /api/analyze - SQL分析接口
   * 分析单条SQL语句
   */
  app.post('/analyze', async (c: any) => {
    const startTime = Date.now();

    try {
      const rawText = await c.req.text();
      let body;
      try {
        body = JSON.parse(rawText);
      } catch (jsonError) {
        console.error('JSON解析失败:', jsonError);
        throw createValidationError('无效的JSON请求体');
      }

      // 验证请求体
      if (!body.sql || typeof body.sql !== 'string') {
        throw createValidationError('请求体必须包含 "sql" 字段，且为字符串类型');
      }

      const sqlQuery = body.sql.trim();
      if (!sqlQuery) {
        throw createValidationError('SQL语句不能为空');
      }

      // 识别数据库类型
      const identificationResult = dbIdentifier.identify(sqlQuery);
      const databaseType = identificationResult.type || 'unknown';

      // 准备分析选项
      const options: AnalysisOptions = {
        performance: body.options?.performance !== false,
        security: body.options?.security !== false,
        standards: body.options?.standards !== false,
        databaseType: databaseType  // 传递识别的数据库类型
      };


      // 执行SQL分析
      const result = await sqlAnalyzer.analyzeSQL(sqlQuery, options);

      const responseTime = Date.now() - startTime;

      // 异步历史记录保存 + 智能规则学习 - 不阻塞响应
      setImmediate(async () => {
        try {
          const historyService = await serviceContainer.getHistoryService();

          // 使用统一的JSON解析器提取维度分析结果，添加安全检查
          const analysisData = result.data || result; // 如果data不存在，使用result本身
          const dimensionAnalysis = llmJsonParser.extractDimensionAnalysis(analysisData);

        // 保存历史记录（与CLI保持一致格式）
        const recordId = await historyService.saveAnalysis({
          id: `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          databaseType: databaseType,
          type: 'api',
          sql: sqlQuery, // 添加原始SQL字段
          input: {
            content: sqlQuery.length > 500 ? sqlQuery.substring(0, 500) + '...' : sqlQuery,
            path: 'api-request',
            name: 'API请求'
          },
          result: {
            success: result.success !== false, // 添加成功标志
            summary: dimensionAnalysis.summary,
            confidence: 0.85, // 移除置信度依赖，使用固定默认值
            issues: dimensionAnalysis.allIssues || [],
            recommendations: dimensionAnalysis.allRecommendations || [],
            sqlFix: dimensionAnalysis.sqlFixData || null
          },
          metadata: {
            processingTime: result.metadata?.processingTime || 0,
            analyzer: 'api',
            version: '1.0.0'
          }
        });

          // 触发测试驱动规则学习（新的简化架构）
          if (body.options?.learn !== false) {
            try {
              const { generateRulesFromAnalysis } = await import('../../services/rule-learning/rule-generator.js');

              // 构建测试用例
              const testCase = {
                sql: sqlQuery,
                analysisResult: result.data || result,
                databaseType: databaseType,
                timestamp: new Date().toISOString(),
                context: {
                  performance: dimensionAnalysis.performance || {},
                  security: dimensionAnalysis.security || {},
                  standards: dimensionAnalysis.standards || {}
                }
              };

              // 异步执行规则生成，直接保存到manual_review
              generateRulesFromAnalysis(
                sqlQuery,
                testCase.analysisResult,
                databaseType,
                'rules/learning-rules/manual_review'
              ).catch((error: any) => {
                logWarn(LogCategory.RULE_LEARNING, `测试驱动规则生成失败: ${error.message}`, {
                  sql: sqlQuery,
                  error: error.stack
                });
              });

              const logger = getGlobalLogger();
              logger.info('测试驱动规则生成已触发', {
                sql: sqlQuery.substring(0, 100)
              });
            } catch (learnError: any) {
              const logger = getGlobalLogger();
              logger.error(`测试驱动规则学习初始化失败: ${learnError.message}`, learnError, {
                sql: sqlQuery
              });
            }
          }
        } catch (historyError: any) {
          const logger = getGlobalLogger();
          logger.error(`异步保存失败: ${historyError.message}`, historyError, {
            sql: sqlQuery
          });
        }
      });

      // 使用响应格式化工具
      return c.json(formatSuccessResponse(result, {
        ...result.metadata,
        responseTime
      }));

    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      // 返回错误响应
      return c.json(formatErrorResponse(error.message, {
        responseTime,
        timestamp: new Date().toISOString()
      }), 400);
    }
  });

  /**
   * POST /api/analyze/batch - 批量SQL分析接口
   * 分析多条SQL语句
   */
  app.post('/analyze/batch', async (c: Context) => {
    const startTime = Date.now();

    try {
      const rawText = await c.req.text();
      let body;
      try {
        body = JSON.parse(rawText) as BatchAnalysisRequest;
      } catch (jsonError) {
        console.error('JSON解析失败:', jsonError);
        throw createValidationError('无效的JSON请求体');
      }

      // 验证请求体
      if (!body.sqls || !Array.isArray(body.sqls) || body.sqls.length === 0) {
        throw createValidationError('请求体必须包含 "sqls" 数组字段，且不能为空');
      }

      if (body.sqls.length > 50) {
        throw createValidationError('批量分析最多支持50条SQL语句');
      }

      // 准备分析选项
      const options: AnalysisOptions = {
        performance: body.options?.performance !== false,
        security: body.options?.security !== false,
        standards: body.options?.standards !== false
      };

      // 使用新的批量分析方法
      const results = await sqlAnalyzer.analyzeBatch(
        body.sqls.map(item => typeof item === 'string' ? item : item.sql),
        options
      );

      const responseTime = Date.now() - startTime;
      const succeeded = results.filter(r => r.success).length;
      const failed = results.length - succeeded;

      // 异步批量历史记录保存 + 智能规则学习 - 不阻塞响应
      setImmediate(async () => {
        try {
          const historyService = await serviceContainer.getHistoryService();

          // 为每条成功的SQL保存历史记录
          for (const result of results) {
            if (result.success && result.sql) {
              try {
                await historyService.saveAnalysis({
                  sql: result.sql,
                  result: result,
                  type: 'batch'
                });

                // 触发测试驱动规则学习（新的简化架构）
                if (body.options?.learn !== false) {
                  try {
                    const { generateRulesFromAnalysis } = await import('../../services/rule-learning/rule-generator.js');
                    const llmJsonParser = await import('../../core/llm-json-parser.js');

                    // 提取维度分析结果
                    const analysisData = result.data || result;
                    const dimensionAnalysis = llmJsonParser.extractDimensionAnalysis(analysisData);

                    // 构建测试用例
                    const testCase = {
                      sql: result.sql,
                      analysisResult: analysisData,
                      databaseType: 'unknown', // 批量处理时暂不识别具体类型
                      timestamp: new Date().toISOString(),
                      context: {
                        performance: dimensionAnalysis.performance || {},
                        security: dimensionAnalysis.security || {},
                        standards: dimensionAnalysis.standards || {}
                      }
                    };

                    // 异步执行规则生成，直接保存到manual_review
                    generateRulesFromAnalysis(
                      result.sql,
                      testCase.analysisResult,
                      testCase.databaseType,
                      'rules/learning-rules/manual_review'
                    ).catch((error: any) => {
                      logWarn(LogCategory.RULE_LEARNING, `批量测试驱动规则生成失败: ${error.message}`, {
                        sql: result.sql,
                        error: error.stack
                      });
                    });
                  } catch (learnError: any) {
                    logError(LogCategory.RULE_LEARNING, `批量测试驱动规则学习初始化失败: ${learnError.message}`, learnError);
                  }
                }
              } catch (err: any) {
                logError(LogCategory.HISTORY, `异步保存批量历史记录失败: ${err.message}`, err);
              }
            }
          }
        } catch (historyError: any) {
          logError(LogCategory.HISTORY, `异步保存批量历史记录失败: ${historyError.message}`, historyError);
        }
      });

      // 使用响应格式化工具
      return c.json(formatSuccessResponse(results, {
        total: results.length,
        succeeded,
        failed,
        responseTime,
        timestamp: new Date().toISOString()
      }));

    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      // 返回错误响应
      return c.json(formatErrorResponse(error.message, {
        responseTime,
        timestamp: new Date().toISOString()
      }), 400);
    }
  });

  /**
   * GET /api/analyze/status - 获取分析器状态
   */
  app.get('/analyze/status', async (c: Context) => {
    try {
      const status = sqlAnalyzer.getStats();

      return c.json(formatSuccessResponse(status, {
        timestamp: new Date().toISOString()
      }));

    } catch (error: any) {

      return c.json(formatErrorResponse(error.message, {
        timestamp: new Date().toISOString()
      }), 500);
    }
  });
  } catch (error: any) {
    throw error;
  }
}

/**
 * 计算平均置信度
 * @param analysisResult - 分析结果
 * @returns 平均置信度
 */
function calculateAverageConfidence(analysisResult: any): number {
  const confidences: number[] = [];

  // 兼容新旧两种格式
  const data = analysisResult.data || analysisResult;

  if (data?.performance?.metadata?.confidence) {
    confidences.push(data.performance.metadata.confidence);
  }
  if (data?.security?.metadata?.confidence) {
    confidences.push(data.security.metadata.confidence);
  }
  if (data?.standards?.metadata?.confidence) {
    confidences.push(data.standards.metadata.confidence);
  }

  return confidences.length > 0
    ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
    : 0;
}