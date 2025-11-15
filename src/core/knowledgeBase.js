/**
 * 知识库检索工具模块
 * 提供知识库检索功能，可集成到分析器中使用
 */

import { tool } from "langchain";
import { z } from "zod";
import { retrieveDocuments, isVectorStoreInitialized } from './vectorStore.js';
import { logError } from '../utils/logger.js';

/**
 * 创建知识库检索工具
 * @returns {Object} 知识库检索工具
 */
export function createRetrieveTool() {
  // 定义检索工具的输入模式
  const retrieveSchema = z.object({
    query: z.string().describe("用于检索相关文档的查询字符串")
  });

  // 创建检索工具
  const retrieve = tool(
    async ({ query }) => {
      try {
        // 检查向量存储是否已初始化
        if (!isVectorStoreInitialized()) {
          return "知识库未初始化，请先运行 'learn' 命令加载文档。";
        }

        // 从向量存储中检索相关文档
        const { text, documents } = await retrieveDocuments(query, 4);

        // 格式化检索结果
        const formattedResult = `检索到 ${documents.length} 个相关文档:\n${text}`;

        return [formattedResult, documents];
      } catch (error) {
        logError('检索文档时出错', error);
        return `检索文档时出错: ${error.message}`;
      }
    },
    {
      name: "retrieve",
      description: "从知识库中检索与查询相关的信息",
      schema: retrieveSchema,
      responseFormat: "content_and_artifact",
    }
  );

  return retrieve;
}

/**
 * 直接检索知识库文档
 * @param {string} query - 查询字符串
 * @param {number} k - 返回文档数量
 * @returns {Promise<Object>} 检索结果
 */
export async function retrieveKnowledge(query, k = 4) {
  try {
    if (!isVectorStoreInitialized()) {
      return {
        success: false,
        error: "知识库未初始化，请先运行 'learn' 命令加载文档。"
      };
    }

    const result = await retrieveDocuments(query, k);
    return {
      success: true,
      data: result
    };
  } catch (error) {
    logError('检索知识库失败', error);
    return {
      success: false,
      error: error.message
    };
  }
}