/**
 * 基础分析工具
 * 所有分析工具的基类，定义通用接口
 */

/**
 * 基础分析工具类
 */
class BaseTool {
  constructor(llmService) {
    this.llmService = llmService;
    this.name = this.constructor.name;
  }

  /**
   * 执行分析
   * @param {Object} context - 分析上下文
   * @returns {Promise<Object>} 分析结果
   */
  async execute(context) {
    throw new Error(`子类必须实现execute方法: ${this.name}`);
  }

  /**
   * 构建提示词
   * @param {Object} context - 分析上下文
   * @returns {string} 提示词
   */
  buildPrompt(context) {
    throw new Error(`子类必须实现buildPrompt方法: ${this.name}`);
  }

  /**
   * 验证上下文
   * @param {Object} context - 分析上下文
   * @returns {boolean} 是否有效
   */
  validateContext(context) {
    return context && 
           typeof context === 'object' && 
           typeof context.sql === 'string' && 
           context.sql.trim().length > 0;
  }

  /**
   * 获取工具信息
   * @returns {Object} 工具信息
   */
  getInfo() {
    return {
      name: this.name,
      version: '1.0.0',
      description: this.getDescription(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 获取工具描述
   * @returns {string} 描述
   */
  getDescription() {
    return '基础分析工具';
  }

  /**
   * 处理错误
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文
   * @returns {Object} 错误结果
   */
  handleError(error, context) {
    console.error(`${this.name} 执行错误:`, error);
    
    return {
      success: false,
      error: error.message,
      tool: this.name,
      context: {
        sqlLength: context?.sql?.length || 0,
        databaseType: context?.databaseType || 'unknown'
      }
    };
  }

  /**
   * 格式化分析结果
   * @param {Object} llmResult - LLM结果
   * @param {Object} context - 上下文
   * @returns {Object} 格式化结果
   */
  formatResult(llmResult, context) {
    return {
      success: true,
      tool: this.name,
      rawContent: llmResult.content,
      duration: llmResult.duration,
      usage: llmResult.usage,
      context: {
        databaseType: context.databaseType,
        sqlLength: context.sql.length
      }
    };
  }
}

export { BaseTool };