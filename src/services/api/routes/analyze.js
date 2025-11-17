/**
 * SQL分析路由模块
 * 提供SQL分析相关的API端点
 */

import { getAnalysisService } from '../../../services/analysis/index.js';
import { getConfigManager } from '../../config/index.js';
import chalk from 'chalk';
import { formatAnalysisResult, formatBatchAnalysisResults, formatErrorResponse, formatSuccessResponse } from '../../../utils/responseHandler.js';

/**
 * 注册分析相关路由
 * @param {Object} app - Hono应用实例
 */
export function registerAnalyzeRoutes(app) {
  /**
   * POST /api/analyze - SQL分析接口
   * 分析单条SQL语句
   */
  app.post('/api/analyze', async (c) => {
    const startTime = Date.now();
    
    try {
      const body = await c.req.json();
      
      // 验证请求体
      if (!body.sql || typeof body.sql !== 'string') {
        return c.json(formatErrorResponse('请求体必须包含 "sql" 字段，且为字符串类型'), 400);
      }
      
      const sqlQuery = body.sql.trim();
      if (!sqlQuery) {
        return c.json(formatErrorResponse('SQL语句不能为空'), 400);
      }
      
      // 准备分析选项
      const analysisOptions = {
        performance: body.options?.performance !== false,
        security: body.options?.security !== false,
        standards: body.options?.standards !== false,
        learn: body.options?.learn === true
      };
      
      // 执行SQL分析
      console.log(chalk.blue(`\n[API] 收到分析请求: ${sqlQuery.substring(0, 50)}...`));
      
      const analysisService = getAnalysisService();
      const result = await analysisService.analyzeSql({
        sql: sqlQuery,
        ...analysisOptions
      });
      
      const responseTime = Date.now() - startTime;
      console.log(chalk.green(`[API] 分析完成，用时: ${responseTime}ms`));
      
      // 保存到历史记录
      try {
        const { default: HistoryService } = await import('../../history/historyService.js');
        const historyService = new HistoryService();
        const historyId = historyService.saveAnalysis({
          sql: sqlQuery,
          result: result,
          type: 'command' // API调用统一标记为command类型
        });
        console.log(chalk.gray(`[API] 历史记录已保存: ${historyId}`));
      } catch (historyError) {
        console.warn(chalk.yellow(`[API] 保存历史记录失败: ${historyError.message}`));
      }
      
      // 返回结果
      return c.json(formatAnalysisResult(result));
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(chalk.red(`[API] 分析失败: ${error.message}`));
      
      return c.json(formatErrorResponse('分析失败', error.message), 500);
    }
  });

  /**
   * POST /api/analyze/batch - 批量SQL分析接口
   * 分析多条SQL语句
   */
  app.post('/api/analyze/batch', async (c) => {
    const startTime = Date.now();
    
    try {
      const body = await c.req.json();
      
      // 验证请求体
      if (!body.sqls || !Array.isArray(body.sqls) || body.sqls.length === 0) {
        return c.json(formatErrorResponse('请求体必须包含 "sqls" 数组字段，且不能为空'), 400);
      }
      
      if (body.sqls.length > 50) {
        return c.json(formatErrorResponse('批量分析最多支持50条SQL语句'), 400);
      }
      
      // 准备分析选项
      const analysisOptions = {
        performance: body.options?.performance !== false,
        security: body.options?.security !== false,
        standards: body.options?.standards !== false,
        learn: body.options?.learn === true
      };
      
      console.log(chalk.blue(`\n[API] 收到批量分析请求，共 ${body.sqls.length} 条SQL`));
      
      const analysisService = getAnalysisService();
      
      // 并行分析所有SQL
      const analysisPromises = body.sqls.map(async (item, index) => {
        try {
          if (!item.sql || typeof item.sql !== 'string') {
            return {
              index,
              success: false,
              error: 'SQL语句不能为空或格式错误'
            };
          }
          
          const result = await analysisService.analyzeSql({
            sql: item.sql.trim(),
            ...analysisOptions
          });
          
          return {
            index,
            sql: item.sql,
            ...result
          };
        } catch (error) {
          return {
            index,
            sql: item.sql,
            success: false,
            error: error.message
          };
        }
      });
      
      const results = await Promise.all(analysisPromises);
      
      const responseTime = Date.now() - startTime;
      const succeeded = results.filter(r => r.success).length;
      const failed = results.length - succeeded;
      
      console.log(chalk.green(`[API] 批量分析完成，用时: ${responseTime}ms，成功: ${succeeded}，失败: ${failed}`));
      
      // 保存到历史记录
      try {
        const { default: HistoryService } = await import('../../history/historyService.js');
        const historyService = new HistoryService();
        
        // 为每条成功的SQL保存历史记录
        results.forEach(result => {
          if (result.success && result.sql) {
            try {
              historyService.saveAnalysis({
                sql: result.sql,
                result: result,
                type: 'batch'
              });
            } catch (err) {
              console.warn(chalk.yellow(`[API] 保存批量历史记录失败: ${err.message}`));
            }
          }
        });
        
        console.log(chalk.gray(`[API] 批量历史记录已保存: ${succeeded} 条`));
      } catch (historyError) {
        console.warn(chalk.yellow(`[API] 保存历史记录失败: ${historyError.message}`));
      }
      
      // 返回结果
      return c.json(formatBatchAnalysisResults(results));
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(chalk.red(`[API] 批量分析失败: ${error.message}`));
      
      return c.json(formatErrorResponse('批量分析失败', error.message), 500);
    }
  });
}