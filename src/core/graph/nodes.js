/**
 * SQL分析器节点模块
 * 实现LangGraph状态图中的各个节点
 */

import { retrieveDocuments } from './vectorStore.js';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { updateState, completeStep } from './states.js';
import { readConfig } from '../../utils/config.js';

/**
 * 系统提示词
 */
const SYSTEM_PROMPT = `你是一个专业的SQL分析专家，负责分析SQL查询并提供优化建议。

你的任务是分析给定的SQL查询，从以下维度进行评估：
1. 性能优化 - 识别潜在的性能瓶颈和优化机会
2. 安全性 - 检查SQL注入风险和其他安全问题
3. 规范性 - 评估SQL代码是否符合最佳实践和编码规范

对于每个分析维度，请提供：
- 发现的问题（如果有）
- 具体的改进建议
- 相关的解释和理由

请使用以下JSON格式返回分析结果：
{
  "summary": "整体分析摘要",
  "issues": [
    {
      "type": "问题类型",
      "severity": "严重程度（高/中/低）",
      "description": "问题描述",
      "location": "问题位置（行号或具体代码片段）",
      "recommendation": "修复建议"
    }
  ],
  "suggestions": [
    {
      "category": "建议类别",
      "description": "建议描述",
      "example": "示例代码（可选）"
    }
  ],
  "metrics": {
    "complexity": "查询复杂度（低/中/高）",
    "estimatedExecutionTime": "预估执行时间",
    "resourceUsage": "资源使用评估"
  }
}`;

/**
 * 输入验证模式
 */
const inputSchema = z.object({
  sqlQuery: z.string().min(1, "SQL查询不能为空"),
  analysisDimensions: z.array(z.string()).optional().default(['performance', 'security', 'standards'])
});

/**
 * 节点1: 初始化和验证
 * 验证输入并准备分析环境
 * @param {Object} state - 当前状态
 * @returns {Promise<Object>} 更新后的状态
 */
async function initializeAndValidate(state) {
  try {
    console.log("节点1: 初始化和验证");
    
    // 验证输入
    const validatedInput = inputSchema.parse({
      sqlQuery: state.sqlQuery,
      analysisDimensions: state.config.analysisDimensions
    });
    
    // 更新状态
    const updatedState = updateState(state, {
      sqlQuery: validatedInput.sqlQuery,
      config: {
        ...state.config,
        analysisDimensions: validatedInput.analysisDimensions
      }
    });
    
    console.log("输入验证通过");
    return completeStep(updatedState, 1);
  } catch (error) {
    console.error("输入验证失败:", error.message);
    return {
      ...state,
      error: `输入验证失败: ${error.message}`,
      completed: true
    };
  }
}

/**
 * 节点2: 文档检索
 * 从向量存储中检索相关文档
 * @param {Object} state - 当前状态
 * @returns {Promise<Object>} 更新后的状态
 */
async function retrieveRelevantDocuments(state) {
  try {
    console.log("节点2: 检索相关文档");
    
    // 构建检索查询
    const query = `分析以下SQL查询的${state.config.analysisDimensions.join('、')}方面: ${state.sqlQuery}`;
    
    // 使用标准文档检索
    const documents = await retrieveDocuments(query, 3);
    
    // 更新状态
    const updatedState = updateState(state, {
      retrievedDocuments: documents
    });
    
    console.log(`检索到 ${documents.length} 个相关文档`);
    return completeStep(updatedState, 2);
  } catch (error) {
    console.error("文档检索失败:", error);
    return {
      ...state,
      error: `文档检索失败: ${error.message}`,
      completed: true
    };
  }
}

/**
 * 节点3: SQL分析
 * 使用LLM分析SQL查询
 * @param {Object} state - 当前状态
 * @returns {Promise<Object>} 更新后的状态
 */
async function analyzeSql(state) {
  try {
    console.log("节点3: 执行SQL分析");
    
    // 读取配置
    const config = await readConfig();
    
    // 初始化LLM，使用环境配置
    const llm = new ChatOpenAI({
    modelName: state.config.model || config.model,
    temperature: state.config.temperature,
    maxTokens: state.config.maxTokens,
    configuration: {
      apiKey: config.apiKey,
      baseURL: config.baseURL
    }
  });
    
    // 构建上下文
    let contextText = "";
    if (state.retrievedDocuments.length > 0) {
      contextText = "\n\n参考文档:\n" + 
        state.retrievedDocuments.map(doc => 
          `源文件: ${doc.metadata.source}\n内容: ${doc.pageContent}`
        ).join("\n\n");
    }
    
    // 构建消息
    const messages = [
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(`请分析以下SQL查询:\n\n${state.sqlQuery}${contextText}`)
    ];
    
    // 调用LLM
    const response = await llm.invoke(messages);
    
    // 解析响应
    let analysisResult;
    try {
      analysisResult = JSON.parse(response.content);
    } catch (parseError) {
      console.warn("无法解析JSON响应，使用原始内容");
      analysisResult = {
        summary: response.content,
        issues: [],
        suggestions: [],
        metrics: {}
      };
    }
    
    // 更新状态
    const updatedState = updateState(state, {
      analysisResult
    });
    
    console.log("SQL分析完成");
    return completeStep(updatedState, 3);
  } catch (error) {
    console.error("SQL分析失败:", error);
    return {
      ...state,
      error: `SQL分析失败: ${error.message}`,
      completed: true
    };
  }
}

/**
 * 节点4: 结果后处理
 * 格式化和优化分析结果
 * @param {Object} state - 当前状态
 * @returns {Promise<Object>} 更新后的状态
 */
async function postProcessResults(state) {
  try {
    console.log("节点4: 结果后处理");
    
    // 确保所有字段都存在
    const analysisResult = {
      summary: state.analysisResult.summary || "分析完成，未发现明显问题",
      issues: state.analysisResult.issues || [],
      suggestions: state.analysisResult.suggestions || [],
      metrics: {
        complexity: state.analysisResult.metrics?.complexity || "中",
        estimatedExecutionTime: state.analysisResult.metrics?.estimatedExecutionTime || "未知",
        resourceUsage: state.analysisResult.metrics?.resourceUsage || "中等",
        ...state.analysisResult.metrics
      }
    };
    
    // 添加元数据
    analysisResult.analyzedAt = new Date().toISOString();
    analysisResult.sqlQuery = state.sqlQuery;
    analysisResult.analysisDimensions = state.config.analysisDimensions;
    
    // 更新状态
    const updatedState = updateState(state, {
      analysisResult,
      completed: true
    });
    
    console.log("结果后处理完成");
    return completeStep(updatedState, 4);
  } catch (error) {
    console.error("结果后处理失败:", error);
    return {
      ...state,
      error: `结果后处理失败: ${error.message}`,
      completed: true
    };
  }
}

export {
  initializeAndValidate,
  retrieveRelevantDocuments,
  analyzeSql,
  postProcessResults
};