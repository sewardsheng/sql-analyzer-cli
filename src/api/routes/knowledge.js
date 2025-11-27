/**
 * 知识库路由模块
 * 提供知识库管理和学习相关的API端点
 */

import chalk from 'chalk';
import { createValidationError } from '../../utils/api/api-error.js';

import { formatSuccessResponse, formatErrorResponse } from '../../utils/api/response-formatter.js';

/**
 * 注册知识库相关路由
 * @param {Object} app - Hono应用实例
 */
export function registerKnowledgeRoutes(app) {
  /**
   * GET /api/knowledge - 获取知识库状态
   * 返回知识库的初始化状态和统计信息
   */
  app.get('/api/knowledge', async (c) => {
    try {
      const { getKnowledgeService } = await import('../../services/knowledge-service.js');
      const knowledgeService = getKnowledgeService();
      const result = await knowledgeService.getKnowledgeStatus();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return c.json(formatSuccessResponse(result.data, '获取知识库状态成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 获取知识库状态失败: ${error.message}`));
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });
  
  /**
   * POST /api/knowledge/search - 搜索知识库
   * 根据查询字符串搜索相关文档
   *
   * Request Body:
   * {
   *   "query": "SQL注入",
   *   "k": 4  // 可选，返回文档数量
   * }
   */
  app.post('/api/knowledge/search', async (c) => {
    try {
      const body = await c.req.json();
      
      if (!body.query || typeof body.query !== 'string') {
        throw createValidationError('请求体必须包含 "query" 字段，且为字符串类型');
      }
      
      const k = body.k || 4;
      const { getKnowledgeService } = await import('../../services/knowledge-service.js');
      const knowledgeService = getKnowledgeService();
      const result = await knowledgeService.searchKnowledge(body.query, k);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      console.log(chalk.blue(`[API] 搜索知识库: "${body.query}"`));
      
      return c.json(formatSuccessResponse({
        query: body.query,
        results: result.data.documents.map(doc => ({
          content: doc.pageContent,
          metadata: doc.metadata
        })),
        count: result.data.documents.length
      }, '搜索知识库成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 搜索知识库失败: ${error.message}`));
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });
  
  /**
   * POST /api/knowledge/learn - 学习新文档
   * 触发知识库学习流程（需要提供rules目录路径）
   *
   * Request Body:
   * {
   *   "rulesDir": "./rules",  // 可选，默认为./rules
   *   "reset": false,         // 可选，是否重置知识库
   *   "apiKey": "...",        // 可选，API密钥
   *   "baseURL": "...",       // 可选，API基础URL
   *   "model": "...",         // 可选，模型名称
   *   "embeddingModel": "...", // 可选，嵌入模型
   *   "priorityApproved": false // 可选，优先级批准
   * }
   */
  app.post('/api/knowledge/learn', async (c) => {
    try {
      const body = await c.req.json();
      
      const options = {
        rulesDir: body.rulesDir || './rules',
        reset: body.reset || false,
        apiKey: body.apiKey,
        baseURL: body.baseURL,
        model: body.model,
        embeddingModel: body.embeddingModel,
        priorityApproved: body.priorityApproved || false
      };
      
      console.log(chalk.blue(`[API] 开始学习文档，目录: ${options.rulesDir}`));
      
      const { getKnowledgeService } = await import('../../services/knowledge-service.js');
      const knowledgeService = getKnowledgeService();
      
      // 在后台执行学习任务
      knowledgeService.learnDocuments(options).then((result) => {
        if (result.success) {
          console.log(chalk.green('[API] 文档学习完成'));
        } else {
          console.error(chalk.red('[API] 文档学习失败:'), result.error);
        }
      }).catch(error => {
        console.error(chalk.red('[API] 启动知识库学习失败:'), error.message);
      });
      
      return c.json(formatSuccessResponse(null, '知识库学习任务已启动'));
    } catch (error) {
      console.error(chalk.red(`[API] 启动知识库学习失败: ${error.message}`));
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });
  
  /**
   * POST /api/knowledge/reset - 重置知识库
   * 清空知识库中的所有文档
   */
  app.post('/api/knowledge/reset', async (c) => {
    try {
      console.log(chalk.blue('[API] 正在重置知识库...'));
      
      const { getKnowledgeService } = await import('../../services/knowledge-service.js');
      const knowledgeService = getKnowledgeService();
      const result = await knowledgeService.resetKnowledge();
      
      if (result.success) {
        console.log(chalk.green('[API] 知识库已重置'));
        return c.json(formatSuccessResponse(null, '知识库已重置'));
      } else {
        console.log(chalk.red('[API] 重置知识库失败'));
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(chalk.red(`[API] 重置知识库失败: ${error.message}`));
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });
  
  /**
   * GET /api/knowledge/export - 导出知识库
   * 导出知识库中的文档数据
   *
   * Query Parameters:
   * - format: 导出格式 (json|csv)，默认为json
   * - includeContent: 是否包含文档内容 (true|false)，默认为false
   */
  app.get('/api/knowledge/export', async (c) => {
    try {
      const format = c.req.query('format') || 'json';
      const includeContent = c.req.query('includeContent') === 'true';
      
      console.log(chalk.blue(`[API] 导出知识库，格式: ${format}`));
      
      const { getKnowledgeService } = await import('../../services/knowledge-service.js');
      const knowledgeService = getKnowledgeService();
      const result = await knowledgeService.exportKnowledge({ format, includeContent });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      if (format === 'csv') {
        c.header('Content-Type', 'text/csv');
        c.header('Content-Disposition', 'attachment; filename="knowledge.csv"');
        return c.text(result.data);
      } else {
        return c.json(formatSuccessResponse(result.data, '导出知识库成功'));
      }
    } catch (error) {
      console.error(chalk.red(`[API] 导出知识库失败: ${error.message}`));
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });
  
  /**
   * POST /api/knowledge/cleanup - 评估并清理低质量规则
   * 评估并清理所有低质量规则
   *
   * Request Body:
   * {
   *   "score": 60,           // 可选，质量分数阈值(0-100)
   *   "backup": false,       // 可选，是否备份低质量规则
   *   "rulesDir": "./rules"  // 可选，规则目录
   * }
   */
  // 临时注释掉此路由，因为 cleanup.js 文件不存在
  /*
  app.post('/api/knowledge/cleanup', async (c) => {
    try {
      const body = await c.req.json();
      
      const { cleanupRules } = await import('../../services/cleanup.js');
      
      const options = {
        score: body.score || 60,
        backup: body.backup || false,
        rulesDir: body.rulesDir || './rules/learning-rules'
      };
      
      console.log(chalk.blue(`[API] 开始清理规则，阈值: ${options.score}`));
      
      // 在后台执行清理任务
      cleanupRules(options).then(() => {
        console.log(chalk.green('[API] 规则清理完成'));
      }).catch(error => {
        console.error(chalk.red('[API] 规则清理失败:'), error.message);
      });
      
      return c.json(formatSuccessResponse(null, '规则清理任务已启动'));
    } catch (error) {
      console.error(chalk.red(`[API] 启动规则清理失败: ${error.message}`));
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });
  */
  
  /**
   * POST /api/knowledge/evaluate - 评估所有规则质量
   * 评估所有规则文件的质量
   *
   * Request Body:
   * {
   *   "report": false,        // 可选，是否生成详细评估报告
   *   "rulesDir": "./rules"   // 可选，规则目录
   * }
   */
  // 临时注释掉此路由，因为 evaluate.js 文件不存在
  /*
  app.post('/api/knowledge/evaluate', async (c) => {
    try {
      const body = await c.req.json();
      
      const { evaluateRules } = await import('../../services/evaluate.js');
      
      const options = {
        report: body.report || false,
        rulesDir: body.rulesDir || './rules/learning-rules',
        all: true  // API调用默认评估所有文件
      };
      
      console.log(chalk.blue(`[API] 开始评估规则质量`));
      
      // 在后台执行评估任务
      evaluateRules(options).then(() => {
        console.log(chalk.green('[API] 规则评估完成'));
      }).catch(error => {
        console.error(chalk.red('[API] 规则评估失败:'), error.message);
      });
      
      return c.json(formatSuccessResponse(null, '规则评估任务已启动'));
    } catch (error) {
      console.error(chalk.red(`[API] 启动规则评估失败: ${error.message}`));
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });
  */
}