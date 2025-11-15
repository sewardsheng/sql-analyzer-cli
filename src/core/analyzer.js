import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { createAgent, tool } from "langchain";
import { z } from "zod";
import fs from 'fs/promises';
import chalk from 'chalk';
import { handleError, logInfo, logError, createError } from '../utils/logger.js';
import { retrieveDocuments, isVectorStoreInitialized, loadVectorStoreFromDisk } from './graph/vectorStore.js';
import { readConfig } from '../services/config/index.js';

/**
 * 系统提示词
 */
const SYSTEM_PROMPT = ` 
## Role: SQL语句智能规则分析与扫描工具 
## Profile 
### Author: 盛威 
### Language: 中文 
### Description: 你是一个专业的SQL语句智能分析与扫描工具。你能够深度解析多种主流数据库类型（如MySQL, PostgreSQL, Oracle, SQL Server等）的SQL语句，从性能、安全、规范等多个维度进行全面扫描，并提供精准的风险提示和可执行的优化建议。 
## Skill-1: 多类型SQL解析 
能够准确识别并解析MySQL, PostgreSQL, Oracle, SQL Server等主流数据库的SQL语法。 
理解不同数据库类型在函数、数据类型、语法特性上的差异。 
## Skill-2: 深度语义分析 
性能分析：能够预测SQL执行计划，识别全表扫描、索引缺失、隐式类型转换、临时表使用、排序（filesort）等性能瓶颈。 
安全审计：能够检测SQL注入漏洞、权限越权风险、以及对敏感数据（如身份证、手机号、密码）的非安全访问。 
规范检查：能够根据预设的编码规范（如命名约定、缩进风格、注释要求）检查SQL代码质量。 
## Skill-3: 知识库检索与引用 
当分析SQL语句时，必须使用 retrieve 工具从知识库中检索相关的规则、最佳实践和示例代码。 
知识库中包含了各种数据库的优化技巧、安全规范和编码标准。 
在分析结果中，必须明确标注引用的知识库来源，例如：
- "根据知识库《MySQL性能优化指南》中的建议..."
- "按照知识库《SQL安全规范》第3.2节的要求..."
- "知识库《SQL编码标准》中提到..."
## Skill-4: 优化建议生成 
对识别出的每个问题，能够评定其风险等级（如：高、中、低）。 
能够提供清晰、具体、可操作的优化建议。 
在可能的情况下，能够直接生成优化后的SQL语句。 
## Rules 
- 数据库类型优先：在分析前，必须先确认或让用户指定SQL语句的数据库类型。如果未指定，应主动询问。 
- 知识库辅助：在分析过程中，如果需要参考特定规则或最佳实践，应使用retrieve工具检索相关知识。 
- 明确引用：所有使用知识库内容的分析结果，必须明确标注引用来源。 
- 结构化输出：所有分析结果必须以结构化的格式（如Markdown表格或列表）呈现，包含问题类别、风险等级、问题描述、优化建议和优化后SQL（如果适用）。 
- 客观中立：分析结果应基于事实和最佳实践，避免主观臆断。 
- 安全第一：对于安全风险，必须立即标记为"高"风险，并提供最优先的修复建议。 
- 建议可执行：所有优化建议必须是具体且可执行的，避免使用模糊不清的描述。 
- 保护隐私：严禁在分析过程中存储或泄露用户提供的任何SQL语句或数据。 
## Workflow 
- 接收与确认：接收用户提交的SQL语句，并确认其对应的数据库方言（<Database_Dialect>）。 
- 语法解析：对SQL语句进行语法解析，构建抽象语法树（AST）。 
- 执行多维度扫描： 
- 性能扫描：分析AST，模拟执行计划，识别性能瓶颈点。 
- 安全扫描：检查SQL结构和上下文，寻找注入点、越权操作和敏感数据访问。 
- 规范扫描：对照编码规范，检查命名、格式、注释等。 
- 知识库检索：在需要时，使用retrieve工具从知识库中获取相关规则和最佳实践。 
- 汇总分析结果：将所有扫描发现的问题进行分类、评级和汇总。 
- 生成优化建议：针对每个问题，生成具体的优化建议，并尝试重写SQL。 
- 输出报告：按照结构化格式，输出完整的分析报告，包含原始SQL、问题列表、优化建议和优化后的SQL，并明确标注引用的知识库内容。 
## Initialization 
作为 <Role>，你必须严格遵守 <Rules>，使用默认 <Language> 与用户交流,按照 <Workflow> 开始工作。
`;

/**
 * 创建知识库检索工具
 */
function createRetrieveTool() {
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
 * 创建SQL分析Agent
 */
async function createSqlAnalyzerAgent(options = {}) {
  // 读取配置
  const config = await readConfig();
  
  // LLM模型配置，使用环境配置作为默认值
  const model = new ChatOpenAI({
    modelName: options.model || config.model || 'gpt-3.5-turbo',
    configuration: {
      apiKey: options.apiKey || config.apiKey,
      baseURL: options.baseURL || config.baseURL || 'https://api.openai.com/v1',
    }
  });

  // 创建工具列表
  const tools = [];

  // 尝试从磁盘加载向量存储
  let vectorStoreLoaded = false;
  if (isVectorStoreInitialized()) {
    // 如果向量存储已初始化但不在内存中，尝试从磁盘加载
    try {
      vectorStoreLoaded = await loadVectorStoreFromDisk();
      if (vectorStoreLoaded) {
        logInfo('向量存储已从磁盘加载');
      }
    } catch (error) {
      logError('从磁盘加载向量存储失败', error);
    }
  }

  // 如果向量存储已初始化（在内存中或从磁盘加载成功），添加检索工具
  if (isVectorStoreInitialized()) {
    tools.push(createRetrieveTool());
    logInfo('知识库检索工具已添加到Agent');
  } else {
    logInfo('向量存储未初始化，跳过添加知识库检索工具');
  }

  // 创建Agent
  const agent = createAgent({
    model,
    tools,
    systemPrompt: SYSTEM_PROMPT,
  });

  return agent;
}

/**
 * 使用Agent分析SQL语句
 */
async function analyzeSqlWithAgent(sql, options = {}) {
  const { databaseType = 'mysql' } = options;

  try {
    logInfo(`开始分析SQL语句，数据库类型: ${databaseType}`);

    // 验证SQL语句
    if (!sql || sql.trim() === '') {
      throw createError('VALIDATION', 'SQL语句不能为空');
    }

    // 创建Agent
    const agent = await createSqlAnalyzerAgent(options);

    // 重写query
    const prompt = `请帮我分析以下${databaseType}数据库的SQL语句，从性能、安全性和规范性三个维度进行分析，并提供优化建议：

\`\`\`sql
${sql}
\`\`\`

请按照以下格式输出分析结果：
1. 总体评估
2. 发现的问题（按风险等级从高到低排序）
3. 优化建议
4. 优化后的SQL语句（如果有）

重要：在分析过程中，如果使用了知识库中的内容，请明确标注引用来源。例如：
- 根据知识库《MySQL性能优化指南》中的建议...
- 按照知识库《SQL安全规范》第3.2节的要求...
- 知识库《SQL编码标准》中提到...

请确保在分析结果中明确体现出哪些部分是基于知识库内容的分析。`;

    // 发送请求
    const agentInputs = {
      messages: new HumanMessage(prompt)
    };

    // 流式输出
    const stream = await agent.stream(agentInputs, {
      streamMode: "values",
    });

    let fullResponse = '';

    for await (const step of stream) {
      const lastMessage = step.messages[step.messages.length - 1];
      if (lastMessage && lastMessage.content) {
        fullResponse += lastMessage.content;
      }
    }

    // 直接返回完整的响应内容
    const result = {
      originalSql: sql,
      fullResponse: fullResponse
    };

    logInfo('SQL分析完成');
    return result;
  } catch (error) {
    logError('SQL分析过程中发生错误', error);
    await handleError(error, 'SQL分析');
    throw createError('API', `SQL分析失败: ${error.message}`);
  }
}

/**
 * 从文件读取SQL语句
 */
async function readSqlFromFile(filePath) {
  try {
    logInfo(`读取SQL文件: ${filePath}`);
    const content = await fs.readFile(filePath, 'utf8');
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      throw createError('FILE', `文件 ${filePath} 为空或只包含空白字符`);
    }

    logInfo(`成功读取SQL文件，内容长度: ${trimmedContent.length}`);
    return trimmedContent;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw createError('FILE', `文件不存在: ${filePath}`);
    } else if (error.code === 'EACCES') {
      throw createError('FILE', `没有权限读取文件: ${filePath}`);
    } else if (error instanceof SqlAnalyzerError) {
      throw error;
    } else {
      throw createError('FILE', `无法读取文件 ${filePath}: ${error.message}`);
    }
  }
}

export {
  analyzeSqlWithAgent,
  readSqlFromFile,
  createSqlAnalyzerAgent,
  createRetrieveTool
};