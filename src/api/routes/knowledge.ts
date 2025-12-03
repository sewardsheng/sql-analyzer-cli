/**
 * 知识库路由模块
 * 提供知识库管理和学习相关的API端点
 */

import { Context } from 'hono';
import { Hono } from 'hono';
import chalk from 'chalk';
import { createValidationError } from '../../utils/api/api-error.js';
import { formatSuccessResponse, formatErrorResponse } from '../../utils/api/response-formatter.js';

/**
 * 注册知识库相关路由
 * @param app - Hono应用实例
 */
export function registerKnowledgeRoutes(app: Hono): void {
  /**
   * GET /api/knowledge - 获取知识库状态
   * 返回知识库的初始化状态和统计信息
   */
  app.get('/knowledge', async (c: Context) => {
    try {
      const { ServiceContainer } = await import('../../services/factories/ServiceContainer.js');
      const container = ServiceContainer.getInstance();
      const knowledgeService = container.getKnowledgeService();
      const result = await knowledgeService.getStatus();

      return c.json(formatSuccessResponse(result, '获取知识库状态成功'));
    } catch (error: any) {
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
  app.post('/knowledge/search', async (c: Context) => {
    try {
      const body = await c.req.json();

      if (!body.query || typeof body.query !== 'string') {
        throw createValidationError('请求体必须包含 "query" 字段，且为字符串类型');
      }

      const k = body.k || 4;
      const { ServiceContainer } = await import('../../services/factories/ServiceContainer.js');
      const container = ServiceContainer.getInstance();
      const knowledgeService = container.getKnowledgeService();
      const result = await knowledgeService.searchKnowledge(body.query, k);

      console.log(chalk.blue(`[API] 搜索知识库: "${body.query}"`));

      // result直接是数组，不需要包装对象
      const documents = Array.isArray(result) ? result : [];

      return c.json(formatSuccessResponse({
        query: body.query,
        results: documents.map((doc: any) => ({
          content: doc.pageContent,
          metadata: doc.metadata
        })),
        count: documents.length
      }, '搜索知识库成功'));
    } catch (error: any) {
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
  app.post('/knowledge/learn', async (c: Context) => {
    try {
      const rawText = await c.req.text();
      let body;
      try {
        body = JSON.parse(rawText);
      } catch (jsonError) {
        console.error('JSON解析失败:', jsonError);
        throw createValidationError('无效的JSON请求体');
      }

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

      const { ServiceContainer } = await import('../../services/factories/ServiceContainer.js');
      const container = ServiceContainer.getInstance();
      const knowledgeService = container.getKnowledgeService();

      // 在后台执行学习任务
      knowledgeService.learnDocuments(options).then((result: any) => {
        if (result.success) {
          console.log(chalk.green('[API] 文档学习完成'));
        } else {
          console.error(chalk.red('[API] 文档学习失败:'), result.error);
        }
      }).catch((error: any) => {
        console.error(chalk.red('[API] 启动知识库学习失败:'), error.message);
      });

      return c.json(formatSuccessResponse(null, '知识库学习任务已启动'));
    } catch (error: any) {
      console.error(chalk.red(`[API] 启动知识库学习失败: ${error.message}`));

      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });

  /**
   * POST /api/knowledge/reset - 重置知识库
   * 清空知识库中的所有文档
   */
  app.post('/knowledge/reset', async (c: Context) => {
    try {
      console.log(chalk.blue('[API] 正在重置知识库...'));

      const { ServiceContainer } = await import('../../services/factories/ServiceContainer.js');
      const container = ServiceContainer.getInstance();
      const knowledgeService = container.getKnowledgeService();
      const result = await knowledgeService.resetKnowledge();

      if (result.success) {
        console.log(chalk.green('[API] 知识库已重置'));
        return c.json(formatSuccessResponse(null, '知识库已重置'));
      } else {
        console.log(chalk.red('[API] 重置知识库失败'));
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error(chalk.red(`[API] 重置知识库失败: ${error.message}`));

      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });

  
  }