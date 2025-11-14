/**
 * 子代理集成节点
 * 将Subagents架构集成到LangGraph状态图中
 */

import { createSubagentsCoordinator } from '../../agents/subagentsCoordinator.js';
import { readConfig } from '../../../utils/config.js';

/**
 * 子代理集成节点
 * @param {Object} state - 状态对象
 * @returns {Promise<Object>} 更新后的状态
 */
export async function subagentsAnalysisNode(state) {
  const { sqlQuery, options = {} } = state;
  
  try {
    // 读取配置
    const config = await readConfig();
    
    // 创建子代理协调器
    const coordinator = createSubagentsCoordinator(config);
    
    // 执行协调分析（不提供databaseType，让系统自动检测）
    const result = await coordinator.coordinateAnalysis({
      sqlQuery,
      options
    });
    
    if (!result.success) {
      return {
      ...state,
      subagentsData: {
        success: false,
        error: result.error
      }
    };
    }
    
    // 更新状态
    return {
      ...state,
      subagentsData: {
        success: true,
        data: result.data
      },
      // 更新分析结果以兼容现有状态图
      analysisResult: result.data.report,
      // 保存各个子代理的分析结果
      performanceAnalysis: result.data.analysisResults.performanceAnalysis,
      securityAudit: result.data.analysisResults.securityAudit,
      standardsCheck: result.data.analysisResults.standardsCheck,
      optimizationSuggestions: result.data.analysisResults.optimizationSuggestions
    };
  } catch (error) {
    console.error("子代理分析失败:", error);
    return {
      ...state,
      subagentsData: {
        success: false,
        error: error.message
      }
    };
  }
}

/**
 * 检查是否启用子代理分析
 * @param {Object} state - 状态对象
 * @returns {string} 下一个节点名称
 */
export function shouldUseSubagents(state) {
  const options = state.options || {};
  
  // 如果明确指定不使用子代理，则跳过
  if (options.useSubagents === false) {
    return "traditionalAnalysis";
  }
  
  // 如果明确指定使用子代理，则使用
  if (options.useSubagents === true) {
    return "subagentsAnalysis";
  }
  
  // 默认情况下，使用子代理分析（修改为默认启用）
  return "subagentsAnalysis";
}

/**
 * 传统分析节点（保留原有分析逻辑）
 * @param {Object} state - 状态对象
 * @returns {Promise<Object>} 更新后的状态
 */
export async function traditionalAnalysisNode(state) {
  // 这里保留原有的分析逻辑
  // 实际实现中，可以导入并调用原有的分析节点
  
  return {
    ...state,
    subagentsData: {
      success: false,
      message: "使用传统分析模式"
    }
  };
}

/**
 * 子代理结果后处理节点
 * @param {Object} state - 状态对象
 * @returns {Promise<Object>} 更新后的状态
 */
export async function subagentsPostProcessNode(state) {
  const { subagentsData, options = {} } = state;
  
  if (!subagentsData || !subagentsData.success) {
    return {
      ...state,
      processedResult: {
        success: false,
        error: subagentsData?.error || "子代理分析失败"
      }
    };
  }
  
  // 根据选项决定输出格式
  let processedResult;
  
  // 如果需要简化输出
  if (options.simplifiedOutput) {
    processedResult = {
      success: true,
      summary: subagentsData.data.report?.summary || "无摘要",
      overallScore: subagentsData.data.report?.overallAssessment?.score || "未知",
      recommendations: subagentsData.data.report?.overallAssessment?.recommendations || []
    };
  } else {
    // 完整输出，包含所有子代理的详细结果
    processedResult = {
      success: true,
      subagentsData: subagentsData.data,
      analysisResult: subagentsData.data.report,
      // 使用详细结果
      performanceAnalysis: subagentsData.data.detailedResults?.performanceAnalysis,
      securityAudit: subagentsData.data.detailedResults?.securityAudit,
      standardsCheck: subagentsData.data.detailedResults?.standardsCheck,
      optimizationSuggestions: subagentsData.data.detailedResults?.optimizationSuggestions,
      metadata: {
        analysisType: "Subagents分析",
        duration: state.endTime ? state.endTime - state.startTime : undefined
      }
    };
  }
  
  return {
    ...state,
    processedResult
  };
}