/**
 * SQL分析器条件边模块
 * 实现LangGraph状态图中的条件路由逻辑
 */

/**
 * 决定是否需要检索文档
 * @param {Object} state - 当前状态
 * @returns {string} 下一个节点的名称
 */
function shouldRetrieveDocuments(state) {
  // 如果已经发生错误，直接结束
  if (state.error) {
    return "end";
  }
  
  // 如果配置中禁用了文档检索，跳过检索步骤
  if (state.config.skipDocumentRetrieval) {
    console.log("跳过文档检索步骤");
    return "analyze";
  }
  
  // 否则执行文档检索
  return "retrieve";
}

/**
 * 决定是否需要进一步分析
 * @param {Object} state - 当前状态
 * @returns {string} 下一个节点的名称
 */
function shouldAnalyze(state) {
  // 如果已经发生错误，直接结束
  if (state.error) {
    return "end";
  }
  
  // 如果没有SQL查询，无法分析
  if (!state.sqlQuery || state.sqlQuery.trim() === '') {
    return {
      ...state,
      error: "没有提供有效的SQL查询",
      completed: true
    };
  }
  
  // 否则执行分析
  return "analyze";
}

/**
 * 决定是否需要后处理
 * @param {Object} state - 当前状态
 * @returns {string} 下一个节点的名称
 */
function shouldPostProcess(state) {
  // 如果已经发生错误，直接结束
  if (state.error) {
    return "end";
  }
  
  // 如果没有分析结果或分析结果为空，无法后处理
  if (!state.analysisResult || 
      (!state.analysisResult.summary && 
       (!state.analysisResult.issues || state.analysisResult.issues.length === 0) && 
       (!state.analysisResult.suggestions || state.analysisResult.suggestions.length === 0))) {
    return {
      ...state,
      error: "分析结果为空",
      completed: true
    };
  }
  
  // 否则执行后处理
  return "postProcess";
}

/**
 * 决定分析流程是否完成
 * @param {Object} state - 当前状态
 * @returns {boolean} 是否完成
 */
function isAnalysisComplete(state) {
  return state.completed === true || state.error !== null;
}

/**
 * 根据错误类型决定错误处理方式
 * @param {Object} state - 当前状态
 * @returns {string} 错误处理策略
 */
function decideErrorHandling(state) {
  if (!state.error) {
    return "no_error";
  }
  
  // 根据错误类型决定处理策略
  if (state.error.includes("网络") || state.error.includes("超时")) {
    return "retry";
  } else if (state.error.includes("API") || state.error.includes("密钥")) {
    return "config_error";
  } else if (state.error.includes("解析") || state.error.includes("格式")) {
    return "parse_error";
  } else {
    return "unknown_error";
  }
}

/**
 * 根据分析结果复杂度决定是否需要额外分析
 * @param {Object} state - 当前状态
 * @returns {string} 下一步操作
 */
function decideNextAnalysisStep(state) {
  // 如果没有分析结果或分析结果为空，无法决定下一步
  if (!state.analysisResult || 
      (!state.analysisResult.summary && 
       (!state.analysisResult.issues || state.analysisResult.issues.length === 0) && 
       (!state.analysisResult.suggestions || state.analysisResult.suggestions.length === 0))) {
    return "no_analysis";
  }
  
  // 如果发现了高风险问题，可能需要更深入的分析
  const highRiskIssues = state.analysisResult.issues?.filter(
    issue => issue.severity === "高"
  );
  
  if (highRiskIssues && highRiskIssues.length > 0) {
    return "deep_analysis";
  }
  
  // 如果查询复杂度高，可能需要性能专项分析
  if (state.analysisResult.metrics?.complexity === "高") {
    return "performance_analysis";
  }
  
  // 否则完成分析
  return "complete";
}

module.exports = {
  shouldRetrieveDocuments,
  shouldAnalyze,
  shouldPostProcess,
  isAnalysisComplete,
  decideErrorHandling,
  decideNextAnalysisStep
};