import { StateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { createInitialState, updateState, completeAnalysis, setError } from './states.js';
import { initializeAndValidate, retrieveRelevantDocuments, analyzeSql, postProcessResults } from './nodes.js';
import { subagentsAnalysisNode, traditionalAnalysisNode, subagentsPostProcessNode, shouldUseSubagents } from './nodes/subagentsNode.js';
import { shouldRetrieveDocuments, shouldAnalyze, shouldPostProcess, isAnalysisComplete, decideErrorHandling, decideNextAnalysisStep } from './edges.js';
import { getCachedAnalysis, cacheAnalysis } from '../performance/performance.js';
import { readConfig } from '../../utils/config.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * 创建SQL分析器的LangGraph状态图
 * @returns {StateGraph} 配置好的状态图
 */
async function createSqlAnalyzerGraph() {
  // 读取环境配置
  const envConfig = await readConfig();
  
  // 定义状态图的状态结构
  const workflow = new StateGraph({
    channels: {
      sqlQuery: {
        value: (x, y) => y ?? x,
        default: () => ''
      },
      sqlFilePath: {
        value: (x, y) => y ?? x,
        default: () => null
      },
      retrievedDocuments: {
        value: (x, y) => y ?? x,
        default: () => []
      },
      analysisResult: {
        value: (x, y) => ({ ...x, ...y }),
        default: () => ({
          summary: '',
          issues: [],
          suggestions: [],
          metrics: {}
        })
      },
      error: {
        value: (x, y) => y ?? x,
        default: () => null
      },
      completed: {
        value: (x, y) => y ?? x,
        default: () => false
      },
      step: {
        value: (x, y) => y ?? x,
        default: () => 0
      },
      metadata: {
        value: (x, y) => ({ ...x, ...y }),
        default: () => ({
          startTime: null,
          endTime: null,
          duration: null,
          analysisType: 'comprehensive'
        })
      },
      options: {
        value: (x, y) => ({ ...x, ...y }),
        default: () => ({})
      },
      subagentsData: {
        value: (x, y) => ({ ...x, ...y }),
        default: () => ({})
      },
      processedResult: {
        value: (x, y) => ({ ...x, ...y }),
        default: () => ({})
      },
      config: {
        value: (x, y) => ({ ...x, ...y }),
        default: () => ({
          model: envConfig.model || 'gpt-3.5-turbo',
          temperature: 0.1,
          maxTokens: 2000,
          analysisDimensions: ['performance', 'security', 'standards']
        })
      }
    }
  });

  // 添加节点
  workflow.addNode("initialize", initializeAndValidate);
  workflow.addNode("retrieve", retrieveRelevantDocuments);
  workflow.addNode("analyze", analyzeSql);
  workflow.addNode("postProcess", postProcessResults);
  
  // 添加子代理节点
  workflow.addNode("subagentsAnalysis", subagentsAnalysisNode);
  workflow.addNode("traditionalAnalysis", traditionalAnalysisNode);
  workflow.addNode("subagentsPostProcess", subagentsPostProcessNode);
  
  // 设置入口点
  workflow.setEntryPoint("initialize");
  
  // 添加条件边
  workflow.addConditionalEdges(
    "initialize",
    shouldUseSubagents,
    {
      "subagentsAnalysis": "subagentsAnalysis",
      "traditionalAnalysis": "traditionalAnalysis",
      "retrieve": "retrieve"
    }
  );
  
  workflow.addConditionalEdges(
    "retrieve",
    shouldAnalyze,
    {
      "analyze": "analyze",
      "end": "__end__"
    }
  );
  
  workflow.addConditionalEdges(
    "analyze",
    shouldPostProcess,
    {
      "postProcess": "postProcess",
      "end": "__end__"
    }
  );
  
  // 子代理分析后处理
  workflow.addEdge("subagentsAnalysis", "subagentsPostProcess");
  workflow.addEdge("traditionalAnalysis", "__end__");
  workflow.addEdge("subagentsPostProcess", "__end__");
  
  // 添加结束边
  workflow.addEdge("postProcess", "__end__");
  
  // 编译图
  return workflow.compile();
}

/**
 * 使用LangGraph分析SQL
 * @param {string} sqlQuery - SQL查询语句
 * @param {Object} [options={}] - 分析选项
 * @returns {Promise<Object>} 分析结果
 */
async function analyzeSqlWithGraph(sqlQuery, options = {}) {
  const startTime = Date.now();
  
  try {
    // 检查缓存
    const cachedResult = getCachedAnalysis(sqlQuery, options);
    if (cachedResult && !options.useSubagents) {
      return {
        ...cachedResult,
        fromCache: true,
        metadata: {
          ...cachedResult.metadata,
          endTime: Date.now(),
          fromCache: true
        }
      };
    }
    
    // 创建初始状态
    const initialState = createInitialState(sqlQuery, null, options);
    // databaseType 将在分析过程中自动检测
    initialState.options = options;
    
    // 创建并运行图
    const graph = await createSqlAnalyzerGraph();
    const result = await graph.invoke(initialState);
    
    // 确保结果包含所有必要字段
    let finalResult = result;
    if (!result.completed && !result.error) {
      finalResult = completeAnalysis(result);
    }
    
    // 添加执行时间
    finalResult.metadata = {
      ...finalResult.metadata,
      duration: Date.now() - startTime,
      analysisType: options.useSubagents ? 'Subagents分析' : 'LangGraph分析'
    };
    
    // 缓存结果（仅缓存非子代理分析结果）
    if (!options.useSubagents) {
      cacheAnalysis(sqlQuery, options, finalResult);
    }
    
    return finalResult;
  } catch (error) {
    console.error("使用LangGraph分析SQL时出错:", error);
    return setError(createInitialState(sqlQuery, null, options), error.message);
  }
}

/**
 * 使用LangGraph流式分析SQL
 * @param {string} sqlQuery - SQL查询语句
 * @param {Object} [options={}] - 分析选项
 * @returns {AsyncGenerator} 流式结果生成器
 */
async function* analyzeSqlWithGraphStream(sqlQuery, options = {}) {
  try {
    // 创建初始状态
    const initialState = createInitialState(sqlQuery, null, options);
    // databaseType 将在分析过程中自动检测
    initialState.options = options;
    
    // 创建图
    const graph = await createSqlAnalyzerGraph();
    
    // 流式执行
    for await (const event of graph.stream(initialState)) {
      yield event;
    }
  } catch (error) {
    console.error("使用LangGraph流式分析SQL时出错:", error);
    yield {
      error: error.message,
      completed: true
    };
  }
}

/**
 * 从文件读取SQL并使用LangGraph分析
 * @param {string} filePath - SQL文件路径
 * @param {Object} [config={}] - 配置参数
 * @returns {Promise<Object>} 分析结果
 */
async function analyzeSqlFileWithGraph(filePath, config = {}) {
  try {
    // 读取文件内容
    const absolutePath = path.resolve(filePath);
    const sqlQuery = await fs.readFile(absolutePath, 'utf8');
    
    // 使用LangGraph分析
    return await analyzeSqlWithGraph(sqlQuery, config);
  } catch (error) {
    console.error(`读取SQL文件 ${filePath} 时出错:`, error);
    return setError(createInitialState('', filePath, config), `读取文件失败: ${error.message}`);
  }
}

export {
  createSqlAnalyzerGraph,
  analyzeSqlWithGraph,
  analyzeSqlWithGraphStream,
  analyzeSqlFileWithGraph
};