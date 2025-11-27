/**
 * LLM服务
 * LLM调用服务
 */

import { unifiedConfigManager } from '../config/config-manager.js';

/**
 * 信号量实现，用于控制并发数
 */
class Semaphore {
  constructor(maxConcurrency) {
    this.maxConcurrency = maxConcurrency;
    this.currentConcurrency = 0;
    this.queue = [];
  }

  async acquire() {
    return new Promise((resolve) => {
      if (this.currentConcurrency < this.maxConcurrency) {
        this.currentConcurrency++;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release() {
    this.currentConcurrency--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      this.currentConcurrency++;
      next();
    }
  }
}

/**
 * LLM服务类
 * 负责与LLM API的交互
 */
class LLMService {
  constructor(config = {}) {
    this.config = config;
    const defaultConfig = unifiedConfigManager.getLLMConfig();
    
    // 从配置中获取LLM设置
    this.llmConfig = {
      apiKey: config.apiKey || defaultConfig.apiKey,
      model: config.model || defaultConfig.model,
      baseUrl: config.baseURL || defaultConfig.baseUrl,
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 4000,
      topP: config.topP || 1,
      frequencyPenalty: config.frequencyPenalty || 0,
      presencePenalty: config.presencePenalty || 0,
      headers: config.headers || {}
    };
    
    // 验证必要配置
    this.validateConfig();
  }

  /**
   * 验证LLM配置
   */
  validateConfig() {
    if (!this.llmConfig.apiKey) {
      throw new Error('LLM API密钥未配置');
    }
    
    if (!this.llmConfig.model) {
      throw new Error('LLM模型未配置');
    }
  }

  /**
   * 调用LLM API
   * @param {string} prompt - 提示词
   * @param {Object} options - 调用选项
   * @returns {Promise<Object>} LLM响应
   */
  async call(prompt, options = {}) {
    const startTime = Date.now();
    
    try {
      // 构建请求参数
      const requestParams = this.buildRequestParams(prompt, options);
      
      // 发送请求
      const response = await this.makeRequest(requestParams);
      
      // 解析响应
      const result = this.parseResponse(response);
      
      // 记录调用信息
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        content: result.content,
        rawContent: result.rawContent,
        usage: result.usage,
        duration,
        model: this.llmConfig.model,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        error: error.message,
        content: null,
        rawContent: null,
        duration,
        model: this.llmConfig.model,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 构建请求参数
   * @param {string} prompt - 提示词
   * @param {Object} options - 选项
   * @returns {Object} 请求参数
   */
  buildRequestParams(prompt, options) {
    const baseParams = {
      model: this.llmConfig.model,
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt()
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: options.temperature || this.llmConfig.temperature || 0.7,
      max_tokens: options.maxTokens || this.llmConfig.maxTokens || 2000, // 减少到2000
      top_p: options.topP || this.llmConfig.topP || 1,
      frequency_penalty: options.frequencyPenalty || this.llmConfig.frequencyPenalty || 0,
      presence_penalty: options.presencePenalty || this.llmConfig.presencePenalty || 0
    };

    // 如果是流式请求，添加stream参数
    if (options.stream) {
      baseParams.stream = true;
    }

    return baseParams;
  }

  /**
   * 获取系统提示词
   * @returns {string} 系统提示词
   */
  getSystemPrompt() {
    return `你是SQL分析助手。始终返回有效JSON格式：
{
  "summary": "分析总结",
  "issues": ["问题1", "问题2"],
  "recommendations": ["建议1", "建议2"],
  "confidence": 0.8
}`;
  }

  /**
   * 发送HTTP请求
   * @param {Object} params - 请求参数
   * @returns {Promise<Object>} 响应数据
   */
  async makeRequest(params) {
    const baseUrl = this.llmConfig.baseUrl || 'https://api.openai.com/v1';
    const url = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.llmConfig.apiKey}`,
        ...this.llmConfig.headers
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`LLM API请求失败: ${response.status} ${response.statusText} - ${errorData.error?.message || '未知错误'}`);
    }

    return await response.json();
  }

  /**
   * 解析LLM响应
   * @param {Object} response - 原始响应
   * @returns {Object} 解析后的响应
   */
  parseResponse(response) {
    try {
      const choice = response.choices?.[0];
      
      if (!choice) {
        throw new Error('响应中没有找到选择项');
      }

      const content = choice.message?.content;
      
      if (!content) {
        throw new Error('响应中没有找到内容');
      }

      return {
        content: content.trim(),
        rawContent: content,
        usage: response.usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        },
        finishReason: choice.finish_reason || 'unknown'
      };
      
    } catch (error) {
      throw new Error(`解析LLM响应失败: ${error.message}`);
    }
  }

  /**
   * 并行调用多个LLM请求
   * @param {Array<Object>} requests - 请求数组，每个包含prompt和options
   * @param {Object} globalOptions - 全局选项
   * @returns {Promise<Array>} 响应数组
   */
  async callParallel(requests, globalOptions = {}) {
    if (!Array.isArray(requests)) {
      throw new Error('并行调用需要传入请求数组');
    }

    const startTime = Date.now();
    const maxConcurrency = globalOptions.maxConcurrency || 3;
    const timeout = globalOptions.timeout || 60000; // 调整到60秒
    
    console.log(`[LLM并行] 开始 ${requests.length} 个请求，并发: ${maxConcurrency}`);
    
    // 使用信号量控制并发数
    const semaphore = new Semaphore(maxConcurrency);
    
    const promises = requests.map(async (request, index) => {
      await semaphore.acquire();
      
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`请求 ${index} 超时`)), timeout)
        );
        
        const result = await Promise.race([
          this.call(request.prompt, { ...globalOptions, ...request.options }),
          timeoutPromise
        ]);
        
        return { index, ...result };
      } catch (error) {
        return {
          index,
          success: false,
          error: error.message,
          content: null,
          rawContent: null,
          duration: timeout,
          model: this.llmConfig.model,
          timestamp: new Date().toISOString()
        };
      } finally {
        semaphore.release();
      }
    });
    
    const results = await Promise.allSettled(promises);
    const processedResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          index,
          success: false,
          error: result.reason.message,
          content: null,
          rawContent: null,
          duration: 0,
          model: this.llmConfig.model,
          timestamp: new Date().toISOString()
        };
      }
    });
    
    // 按索引排序
    processedResults.sort((a, b) => a.index - b.index);
    
    const totalDuration = Date.now() - startTime;
    const successCount = processedResults.filter(r => r.success).length;
    
    console.log(`[LLM并行] 完成 ${totalDuration}ms，成功: ${successCount}/${requests.length}`);
    
    return processedResults;
  }

  /**
   * 测试LLM连接
   * @returns {Promise<Object>} 测试结果
   */
  async testConnection() {
    try {
      const testPrompt = '请回复"连接测试成功"';
      const result = await this.call(testPrompt, { maxTokens: 50 });
      
      return {
        success: result.success,
        message: result.success ? 'LLM连接正常' : `LLM连接失败: ${result.error}`,
        duration: result.duration,
        model: this.llmConfig.model
      };
      
    } catch (error) {
      return {
        success: false,
        message: `LLM连接测试失败: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * 获取服务状态
   * @returns {Object} 状态信息
   */
  getStatus() {
    return {
      service: 'ready',
      model: this.llmConfig.model,
      baseUrl: this.llmConfig.baseUrl,
      hasApiKey: !!this.llmConfig.apiKey,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 更新配置
   * @param {Object} newConfig - 新配置
   */
  updateConfig(newConfig) {
    this.llmConfig = { ...this.llmConfig, ...newConfig };
    this.validateConfig();
  }
}

// 创建全局实例
const llmService = new LLMService();

/**
 * 获取LLM服务实例
 * @returns {LLMService} LLM服务实例
 */
export function getLLMService() {
  return llmService;
}

// 导出类和实例
export { LLMService, llmService };
export default llmService;