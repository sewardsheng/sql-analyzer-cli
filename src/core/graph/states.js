/**
 * SQL分析器状态定义模块
 * 定义LangGraph状态图中的状态结构
 */

/**
 * SQL分析流程的状态结构
 * @typedef {Object} SqlAnalysisState
 * @property {string} sqlQuery - 待分析的SQL查询语句
 * @property {string} sqlFilePath - SQL文件路径（如果从文件读取）
 * @property {Array<Object>} retrievedDocuments - 从向量存储检索到的相关文档
 * @property {Object} analysisResult - 分析结果
 * @property {string} analysisResult.summary - 分析摘要
 * @property {Array<Object>} analysisResult.issues - 发现的问题列表
 * @property {Array<Object>} analysisResult.suggestions - 改进建议
 * @property {Object} analysisResult.metrics - 性能指标
 * @property {string} error - 错误信息（如果有）
 * @property {boolean} completed - 分析是否完成
 * @property {number} step - 当前步骤编号
 * @property {Object} metadata - 元数据
 * @property {Date} metadata.startTime - 开始时间
 * @property {Date} metadata.endTime - 结束时间
 * @property {number} metadata.duration - 执行时长（毫秒）
 * @property {string} metadata.analysisType - 分析类型（性能、安全、规范等）
 * @property {Object} config - 配置参数
 * @property {string} config.model - 使用的模型
 * @property {number} config.temperature - 温度参数
 * @property {number} config.maxTokens - 最大令牌数
 * @property {Array<string>} config.analysisDimensions - 分析维度
 */

/**
 * 创建初始状态
 * @param {string} sqlQuery - SQL查询语句
 * @param {string} [sqlFilePath] - SQL文件路径
 * @param {Object} [config={}] - 配置参数
 * @returns {SqlAnalysisState} 初始状态
 */
function createInitialState(sqlQuery, sqlFilePath = null, config = {}) {
  return {
    sqlQuery,
    sqlFilePath,
    retrievedDocuments: [],
    analysisResult: {
      summary: '',
      issues: [],
      suggestions: [],
      metrics: {}
    },
    error: null,
    completed: false,
    step: 0,
    metadata: {
      startTime: new Date(),
      endTime: null,
      duration: null,
      analysisType: config.analysisType || 'comprehensive'
    },
    config: {
      model: config.model || 'gpt-3.5-turbo',
      temperature: config.temperature || 0.1,
      maxTokens: config.maxTokens || 2000,
      analysisDimensions: config.analysisDimensions || ['performance', 'security', 'standards']
    }
  };
}

/**
 * 更新状态
 * @param {SqlAnalysisState} state - 当前状态
 * @param {Object} updates - 要更新的字段
 * @returns {SqlAnalysisState} 更新后的状态
 */
function updateState(state, updates) {
  return {
    ...state,
    ...updates,
    metadata: {
      ...state.metadata,
      ...(updates.metadata || {})
    },
    config: {
      ...state.config,
      ...(updates.config || {})
    },
    analysisResult: {
      ...state.analysisResult,
      ...(updates.analysisResult || {})
    }
  };
}

/**
 * 标记步骤完成
 * @param {SqlAnalysisState} state - 当前状态
 * @param {number} step - 完成的步骤编号
 * @returns {SqlAnalysisState} 更新后的状态
 */
function completeStep(state, step) {
  return updateState(state, { step });
}

/**
 * 标记分析完成
 * @param {SqlAnalysisState} state - 当前状态
 * @returns {SqlAnalysisState} 更新后的状态
 */
function completeAnalysis(state) {
  const endTime = new Date();
  const duration = endTime - state.metadata.startTime;
  
  return updateState(state, {
    completed: true,
    metadata: {
      ...state.metadata,
      endTime,
      duration
    }
  });
}

/**
 * 设置错误状态
 * @param {SqlAnalysisState} state - 当前状态
 * @param {string} error - 错误信息
 * @returns {SqlAnalysisState} 更新后的状态
 */
function setError(state, error) {
  return updateState(state, {
    error,
    completed: true,
    metadata: {
      ...state.metadata,
      endTime: new Date()
    }
  });
}

export {
  createInitialState,
  updateState,
  completeStep,
  completeAnalysis,
  setError
};