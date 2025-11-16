/**
 * 知识库路由模块
 * 提供知识库管理和学习相关的API端点
 */

import chalk from 'chalk';
import { formatSuccessResponse, formatErrorResponse } from '../../../utils/apiResponseFormatter.js';

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
      const { isVectorStoreInitialized, isVectorStorePersisted } = await import('../../../core/vectorStore.js');
      const fs = await import('fs');
      const path = await import('path');
      
      const isInitialized = isVectorStoreInitialized();
      const isPersisted = isVectorStorePersisted();
      
      const status = {
        initialized: isInitialized,
        persisted: isPersisted,
        documents: null,
        statistics: null
      };
      
      // 如果知识库已初始化，获取详细信息
      if (isInitialized && isPersisted) {
        try {
          const VECTOR_STORE_PATH = path.join(process.cwd(), '.vector-store');
          const docsPath = path.join(VECTOR_STORE_PATH, 'documents.json');
          
          if (fs.existsSync(docsPath)) {
            const serializedDocs = JSON.parse(fs.readFileSync(docsPath, 'utf8'));
            
            // 统计文档信息
            const sourceFiles = new Set();
            const fileTypes = new Map();
            
            serializedDocs.forEach(doc => {
              if (doc.metadata && doc.metadata.source) {
                sourceFiles.add(doc.metadata.source);
                const ext = path.extname(doc.metadata.source).substring(1);
                if (ext) {
                  fileTypes.set(ext, (fileTypes.get(ext) || 0) + 1);
                }
              }
            });
            
            status.documents = {
              total: serializedDocs.length,
              files: Array.from(sourceFiles),
              fileCount: sourceFiles.size
            };
            
            status.statistics = {
              byFileType: Object.fromEntries(fileTypes)
            };
          }
        } catch (error) {
          console.warn('获取知识库详细信息失败:', error.message);
        }
      }
      
      return c.json(formatSuccessResponse(status, '获取知识库状态成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 获取知识库状态失败: ${error.message}`));
      
      return c.json(formatErrorResponse('获取知识库状态失败', error.message), 500);
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
        return c.json(formatErrorResponse('请求体必须包含 "query" 字段，且为字符串类型'), 400);
      }
      
      const { retrieveKnowledge } = await import('../../../core/knowledgeBase.js');
      const k = body.k || 4;
      
      const result = await retrieveKnowledge(body.query, k);
      
      if (!result.success) {
        return c.json(formatErrorResponse(result.error), 503);
      }
      
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
      
      return c.json(formatErrorResponse('搜索知识库失败', error.message), 500);
    }
  });
  
  /**
   * POST /api/knowledge/learn - 学习新文档
   * 触发知识库学习流程（需要提供rules目录路径）
   *
   * Request Body:
   * {
   *   "rulesDir": "./rules",  // 可选，默认为./rules
   *   "reset": false          // 可选，是否重置知识库
   * }
   */
  app.post('/api/knowledge/learn', async (c) => {
    try {
      const body = await c.req.json();
      
      const { learnDocuments } = await import('../../knowledge/learn.js');
      
      const options = {
        rulesDir: body.rulesDir || './rules',
        reset: body.reset || false
      };
      
      console.log(chalk.blue(`[API] 开始学习文档，目录: ${options.rulesDir}`));
      
      // 在后台执行学习任务
      learnDocuments(options).then(() => {
        console.log(chalk.green('[API] 文档学习完成'));
      }).catch(error => {
        console.error(chalk.red('[API] 文档学习失败:'), error.message);
      });
      
      return c.json(formatSuccessResponse(null, '知识库学习任务已启动'));
    } catch (error) {
      console.error(chalk.red(`[API] 启动知识库学习失败: ${error.message}`));
      
      return c.json(formatErrorResponse('启动知识库学习失败', error.message), 500);
    }
  });
  
  /**
   * POST /api/knowledge/reset - 重置知识库
   * 清空知识库中的所有文档
   */
  app.post('/api/knowledge/reset', async (c) => {
    try {
      const { resetVectorStore } = await import('../../../core/vectorStore.js');
      
      console.log(chalk.blue('[API] 正在重置知识库...'));
      
      const success = await resetVectorStore();
      
      if (success) {
        console.log(chalk.green('[API] 知识库已重置'));
        return c.json(formatSuccessResponse(null, '知识库已重置'));
      } else {
        console.log(chalk.red('[API] 重置知识库失败'));
        return c.json(formatErrorResponse('重置知识库失败'), 500);
      }
    } catch (error) {
      console.error(chalk.red(`[API] 重置知识库失败: ${error.message}`));
      
      return c.json(formatErrorResponse('重置知识库失败', error.message), 500);
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
  app.post('/api/knowledge/cleanup', async (c) => {
    try {
      const body = await c.req.json();
      
      const { cleanupRules } = await import('../../knowledge/cleanup.js');
      
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
      
      return c.json(formatErrorResponse('启动规则清理失败', error.message), 500);
    }
  });
  
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
  app.post('/api/knowledge/evaluate', async (c) => {
    try {
      const body = await c.req.json();
      
      const { evaluateRules } = await import('../../knowledge/evaluate.js');
      
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
      
      return c.json(formatErrorResponse('启动规则评估失败', error.message), 500);
    }
  });
}