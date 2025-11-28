/**
 * 配置验证器
 * 负责验证配置的有效性和一致性
 */
export class ConfigValidator {
  /**
   * 验证完整配置对象
   */
  static validate(config) {
    this.validateServer(config.server);
    this.validateLLM(config.llm);
    this.validateRuleLearning(config.ruleLearning);
    this.validateKnowledge(config.knowledge);
    this.validateLogging(config.logging);
  }

  /**
   * 验证服务器配置
   */
  static validateServer(server) {
    if (server.port < 1 || server.port > 65535) {
      throw new Error('服务器端口必须在 1-65535 之间');
    }
    
    if (!server.host) {
      throw new Error('服务器主机地址不能为空');
    }
    
    if (server.rateLimit.windowMs < 1000) {
      throw new Error('速率限制时间窗口必须大于等于1000毫秒');
    }
    
    if (server.rateLimit.max < 1) {
      throw new Error('速率限制最大请求数必须大于0');
    }
  }

  /**
   * 验证LLM配置
   */
  static validateLLM(llm) {
    if (!llm.apiKey) {
      console.warn('警告: LLM API密钥未配置');
    }
    
    if (llm.temperature < 0 || llm.temperature > 2) {
      throw new Error('LLM温度参数必须在 0-2 之间');
    }
    
    if (llm.maxTokens < 1) {
      throw new Error('LLM最大令牌数必须大于0');
    }
    
    if (llm.timeout < 1000) {
      throw new Error('LLM请求超时时间必须大于等于1000毫秒');
    }
  }

  /**
   * 验证规则学习配置
   */
  static validateRuleLearning(ruleLearning) {
    if (ruleLearning.minConfidence < 0 || ruleLearning.minConfidence > 1) {
      throw new Error('规则学习最小置信度必须在 0-1 之间');
    }
    
    if (ruleLearning.batchSize < 1) {
      throw new Error('规则学习批次大小必须大于0');
    }
    
    if (ruleLearning.maxRulesPerGeneration < 1) {
      throw new Error('每次生成的最大规则数必须大于0');
    }
    
    if (ruleLearning.autoApproval.threshold < 0 || ruleLearning.autoApproval.threshold > 100) {
      throw new Error('自动审批阈值必须在 0-100 之间');
    }
    
    if (ruleLearning.autoApproval.confidenceThreshold < 0 || ruleLearning.autoApproval.confidenceThreshold > 1) {
      throw new Error('自动审批置信度阈值必须在 0-1 之间');
    }
    
    if (ruleLearning.performance.concurrentTasks < 1) {
      throw new Error('并发学习任务数必须大于0');
    }
    
    if (ruleLearning.performance.taskTimeout < 1000) {
      throw new Error('学习任务超时时间必须大于等于1000毫秒');
    }
  }

  /**
   * 验证知识库配置
   */
  static validateKnowledge(knowledge) {
    if (knowledge.maxFileSize < 1024) {
      throw new Error('知识库最大文件大小必须大于等于1024字节');
    }
  }

  /**
   * 验证日志配置
   */
  static validateLogging(logging) {
    const validLevels = ['error', 'warn', 'info', 'debug'];
    if (!validLevels.includes(logging.level)) {
      throw new Error(`日志级别必须是以下之一: ${validLevels.join(', ')}`);
    }
  }
}