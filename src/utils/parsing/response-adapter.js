/**
 * 响应适配器 - 统一处理不同LLM SDK的响应格式
 * 
 * 支持的格式：
 * - LangChain AIMessage
 * - OpenAI ChatCompletion
 * - Anthropic Claude
 * - 原始字符串
 */

/**
 * @typedef {Object} AdaptedResponse
 * @property {string} content - 提取的文本内容
 * @property {Object} metadata - 响应元数据
 * @property {string} metadata.responseType - 响应类型（langchain/openai/anthropic/raw）
 * @property {number} metadata.confidence - 提取置信度（0-1）
 * @property {Object} metadata.rawStructure - 原始响应结构信息
 * @property {boolean} success - 是否成功提取
 * @property {string|null} error - 错误信息
 */

/**
 * 响应适配器类
 */
class ResponseAdapter {
  /**
   * 适配LLM响应，提取content和元数据
   * @param {*} rawResponse - 原始LLM响应
   * @returns {AdaptedResponse} 标准化的响应对象
   */
  static adapt(rawResponse) {
    const logger = console; // 可以后续替换为统一的logger

    logger.log('\n=== Response Adapter: Start ===');
    
    // 检测响应类型
    const responseType = this.detectResponseType(rawResponse);
    logger.log(`Detected type: ${responseType}`);
    
    let content = null;
    let confidence = 0;
    let error = null;
    
    try {
      // 根据类型选择提取策略
      switch (responseType) {
        case 'langchain':
          content = this.extractLangChainContent(rawResponse);
          confidence = 0.95;
          break;
        case 'openai':
          content = this.extractOpenAIContent(rawResponse);
          confidence = 0.95;
          break;
        case 'anthropic':
          content = this.extractAnthropicContent(rawResponse);
          confidence = 0.95;
          break;
        case 'raw':
          content = String(rawResponse);
          confidence = 0.5;
          break;
        default:
          content = String(rawResponse);
          confidence = 0.3;
      }
      
      // 验证提取的内容
      if (!content || typeof content !== 'string') {
        throw new Error('提取的content无效或为空');
      }
      
      logger.log(`✅ Content extracted: ${content.length} chars`);
      logger.log('=== Response Adapter: Success ===\n');
      
      return {
        content,
        metadata: {
          responseType,
          confidence,
          rawStructure: {
            type: typeof rawResponse,
            constructor: rawResponse?.constructor?.name,
            keys: Object.keys(rawResponse || {})
          }
        },
        success: true,
        error: null
      };
      
    } catch (err) {
      error = err.message;
      logger.error('❌ Response Adapter failed:', error);
      logger.log('=== Response Adapter: Failed ===\n');
      
      return {
        content: null,
        metadata: {
          responseType,
          confidence: 0,
          rawStructure: {
            type: typeof rawResponse,
            constructor: rawResponse?.constructor?.name,
            keys: Object.keys(rawResponse || {})
          }
        },
        success: false,
        error
      };
    }
  }

  /**
   * 检测响应类型
   * @param {*} response - 原始响应
   * @returns {string} 响应类型
   */
  static detectResponseType(response) {
    // 检测 LangChain AIMessage
    if (this.isLangChainMessage(response)) {
      return 'langchain';
    }
    
    // 检测 OpenAI ChatCompletion
    if (this.isOpenAIResponse(response)) {
      return 'openai';
    }
    
    // 检测 Anthropic Claude
    if (this.isAnthropicResponse(response)) {
      return 'anthropic';
    }
    
    // 检测是否为原始字符串
    if (typeof response === 'string') {
      return 'raw';
    }
    
    // 默认为未知类型，按原始字符串处理
    return 'raw';
  }

  /**
   * 检测是否为 LangChain AIMessage
   * @param {*} response - 响应对象
   * @returns {boolean} 是否为 LangChain 格式
   */
  static isLangChainMessage(response) {
    if (!response || typeof response !== 'object') {
      return false;
    }
    
    // 检查构造函数名称
    const constructorName = response.constructor?.name;
    if (constructorName === 'AIMessage') {
      return true;
    }
    
    // 检查特有的结构特征
    // LangChain AIMessage 通常有 kwargs.content 或 content 字段
    const hasKwargsContent = response?.kwargs && 'content' in response.kwargs;
    const hasDirectContent = 'content' in response;
    const hasAdditionalKwargs = response?.additional_kwargs;
    
    return (hasKwargsContent || hasDirectContent) && hasAdditionalKwargs !== undefined;
  }

  /**
   * 检测是否为 OpenAI ChatCompletion 响应
   * @param {*} response - 响应对象
   * @returns {boolean} 是否为 OpenAI 格式
   */
  static isOpenAIResponse(response) {
    if (!response || typeof response !== 'object') {
      return false;
    }
    
    // OpenAI 响应通常有 choices 数组
    const hasChoices = Array.isArray(response?.choices);
    const hasMessage = response?.choices?.[0]?.message;
    const hasContent = response?.choices?.[0]?.message?.content !== undefined;
    
    return hasChoices && hasMessage && hasContent;
  }

  /**
   * 检测是否为 Anthropic Claude 响应
   * @param {*} response - 响应对象
   * @returns {boolean} 是否为 Anthropic 格式
   */
  static isAnthropicResponse(response) {
    if (!response || typeof response !== 'object') {
      return false;
    }
    
    // Anthropic 响应通常有 content 数组或 completion 字段
    const hasContentArray = Array.isArray(response?.content);
    const hasTextInContent = response?.content?.[0]?.text !== undefined;
    const hasCompletion = 'completion' in response;
    
    return (hasContentArray && hasTextInContent) || hasCompletion;
  }

  /**
   * 提取 LangChain AIMessage 的 content
   * @param {*} response - LangChain 响应
   * @returns {string|null} 提取的内容
   */
  static extractLangChainContent(response) {
    // 优先检查 kwargs.content（LangChain AIMessage 格式）
    if (response?.kwargs?.content !== undefined) {
      return response.kwargs.content;
    }
    
    // 检查直接的 content 字段
    if (response?.content !== undefined) {
      return response.content;
    }
    
    // 尝试从其他可能的位置提取
    if (response?.additional_kwargs?.content) {
      return response.additional_kwargs.content;
    }
    
    return null;
  }

  /**
   * 提取 OpenAI ChatCompletion 的 content
   * @param {*} response - OpenAI 响应
   * @returns {string|null} 提取的内容
   */
  static extractOpenAIContent(response) {
    return response?.choices?.[0]?.message?.content || null;
  }

  /**
   * 提取 Anthropic Claude 的 content
   * @param {*} response - Anthropic 响应
   * @returns {string|null} 提取的内容
   */
  static extractAnthropicContent(response) {
    // 优先从 content[0].text 提取
    if (response?.content?.[0]?.text) {
      return response.content[0].text;
    }
    
    // 尝试从 completion 字段提取
    if (response?.completion) {
      return response.completion;
    }
    
    // 尝试从直接的 content 字段提取
    if (response?.content && typeof response.content === 'string') {
      return response.content;
    }
    
    return null;
  }

  /**
   * 获取响应的详细结构信息（用于调试）
   * @param {*} response - 响应对象
   * @returns {Object} 结构信息
   */
  static getStructureInfo(response) {
    const info = {
      type: typeof response,
      constructor: response?.constructor?.name,
      keys: [],
      properties: {}
    };
    
    if (response && typeof response === 'object') {
      info.keys = Object.keys(response);
      
      // 分析关键属性
      info.properties = {
        hasContent: 'content' in (response || {}),
        hasKwargs: 'kwargs' in (response || {}),
        hasKwargsContent: !!(response?.kwargs?.content),
        hasChoices: Array.isArray(response?.choices),
        hasMessage: !!(response?.choices?.[0]?.message),
        hasMessageContent: response?.choices?.[0]?.message?.content !== undefined,
        hasAnthropicContent: Array.isArray(response?.content),
        hasAnthropicText: !!(response?.content?.[0]?.text),
        hasCompletion: 'completion' in (response || {})
      };
    }
    
    return info;
  }

  /**
   * 验证提取的内容是否有效
   * @param {*} content - 提取的内容
   * @returns {boolean} 是否有效
   */
  static validateContent(content) {
    return content !== null && 
           content !== undefined && 
           typeof content === 'string' && 
           content.trim().length > 0;
  }

  /**
   * 创建错误响应
   * @param {string} error - 错误信息
   * @param {*} rawResponse - 原始响应
   * @param {string} responseType - 响应类型
   * @returns {AdaptedResponse} 错误响应对象
   */
  static createErrorResponse(error, rawResponse, responseType = 'unknown') {
    return {
      content: null,
      metadata: {
        responseType,
        confidence: 0,
        rawStructure: this.getStructureInfo(rawResponse)
      },
      success: false,
      error
    };
  }
}

export default ResponseAdapter;