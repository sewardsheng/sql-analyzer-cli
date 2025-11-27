/**
 * 规则生成器
 * 基于分析结果和现有提示词体系生成SQL审核规则
 */

import { buildPrompt } from '../../utils/format/prompt-loader.js';
import { llmJsonParser } from '../../core/llm-json-parser.js';

/**
 * 规则生成器类
 */
export class RuleGenerator {
  constructor(llmService) {
    this.llmService = llmService;
  }

  /**
   * 生成规则
   * @param {Object} learningContext - 学习上下文
   * @returns {Promise<Array>} 生成的规则数组
   */
  async generateRules(learningContext) {
    try {
      console.log(`[RuleGenerator] 开始生成规则: ${learningContext.sql.substring(0, 50)}...`);

      // 1. 使用规则生成提示词
      const rules = await this.generateFromRulePrompt(learningContext);
      
      // 2. 如果没有生成规则，尝试使用深度学习提示词
      if (!rules || rules.length === 0) {
        console.log(`[RuleGenerator] 规则生成为空，尝试深度学习模式...`);
        const deepLearningRules = await this.generateFromDeepLearning(learningContext);
        
        // 3. 如果深度学习也失败，使用fallback规则生成
        if (!deepLearningRules || deepLearningRules.length === 0) {
          console.log(`[RuleGenerator] 深度学习也失败，使用fallback规则生成...`);
          const fallbackRules = await this.generateFallbackRules(learningContext);
          return fallbackRules;
        }
        
        return deepLearningRules;
      }

      console.log(`[RuleGenerator] 规则生成完成: ${rules.length}条规则`);
      return rules;
      
    } catch (error) {
      console.error(`[RuleGenerator] 规则生成失败: ${error.message}`);
      // 即使出错也尝试生成fallback规则
      try {
        return await this.generateFallbackRules(learningContext);
      } catch (fallbackError) {
        console.error(`[RuleGenerator] Fallback规则生成也失败: ${fallbackError.message}`);
        return [];
      }
    }
  }

  /**
   * 使用规则生成提示词生成规则
   * @param {Object} learningContext - 学习上下文
   * @returns {Promise<Array>} 生成的规则
   */
  async generateFromRulePrompt(learningContext) {
    try {
      // 1. 准备变量
      const variables = {
        databaseType: learningContext.databaseType,
        sqlQuery: learningContext.sql,
        analysisResults: this.formatAnalysisResults(learningContext.currentAnalysis),
        existingRules: await this.getExistingRulesSummary()
      };

      // 2. 构建提示词（使用优化版本）
      const { systemPrompt, userPrompt } = await buildPrompt('rule-generation-optimized.md', variables, { category: 'rule-learning' });

      // 3. 调用LLM
      const llmResult = await this.llmService.call(`${systemPrompt}\n\n${userPrompt}`);

      // 4. 解析结果
      const result = this.parseLLMResponse(llmResult.content);
      
      if (result.success) {
        // 尝试多种可能的字段名
        const rules = result.learnedRules || result.rules || result.data?.rules || [];
        if (rules.length > 0) {
          return rules;
        }
      }

      console.warn(`[RuleGenerator] 规则生成提示词未返回有效规则`);
      return [];
      
    } catch (error) {
      console.error(`[RuleGenerator] 规则生成提示词失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 使用深度学习提示词生成规则
   * @param {Object} learningContext - 学习上下文
   * @returns {Promise<Array>} 生成的规则
   */
  async generateFromDeepLearning(learningContext) {
    try {
      // 1. 准备深度学习变量
      const variables = {
        DatabaseType: learningContext.databaseType,
        existingRules: await this.getExistingRulesSummary()
      };

      // 2. 构建深度学习上下文
      const contextString = this.buildDeepLearningContext(learningContext);

      // 3. 构建提示词
      const { systemPrompt, userPrompt } = await buildPrompt('intelligent-rule-learner.md', variables, { category: 'analyzers' });

      // 4. 调用LLM
      const llmResult = await this.llmService.call(`${systemPrompt}\n\n请基于以下分析上下文进行深度学习并生成规则：\n\n${contextString}`);

      // 5. 解析结果
      const result = this.parseLLMResponse(llmResult.content);
      
      if (result.success) {
        // 尝试多种可能的字段名
        console.log(`[RuleGenerator] 检查 result.new_rules:`, result.new_rules);
        console.log(`[RuleGenerator] 检查 result.rules:`, result.rules);
        console.log(`[RuleGenerator] 检查 result.data?.rules:`, result.data?.rules);
        console.log(`[RuleGenerator] 检查 result.data?.new_rules:`, result.data?.new_rules);
        
        const rules = result.new_rules || result.rules || result.data?.rules || result.data?.new_rules || [];
        console.log(`[RuleGenerator] 最终提取的规则:`, rules);
        console.log(`[RuleGenerator] 规则数量:`, rules ? rules.length : 0);
        
        if (rules && rules.length > 0) {
          console.log(`[RuleGenerator] 深度学习成功生成 ${rules.length} 条规则`);
          return rules;
        }
        
        // 检查是否有其他可能的规则字段
        console.log(`[RuleGenerator] 深度学习返回的数据字段:`, Object.keys(result));
      }

      console.warn(`[RuleGenerator] 深度学习提示词未返回有效规则`);
      return [];
      
    } catch (error) {
      console.error(`[RuleGenerator] 深度学习失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 批量生成规则
   * @param {Array} learningContexts - 学习上下文数组
   * @returns {Promise<Array>} 生成的规则数组
   */
  async generateRulesBatch(learningContexts) {
    try {
      const allRules = [];
      
      for (const context of learningContexts) {
        const rules = await this.generateRules(context);
        allRules.push(...rules);
      }

      // 去重
      const deduplicatedRules = this.deduplicateRules(allRules);
      
      console.log(`[RuleGenerator] 批量生成完成: ${learningContexts.length}个上下文 -> ${deduplicatedRules.length}条规则`);
      return deduplicatedRules;
      
    } catch (error) {
      console.error(`[RuleGenerator] 批量生成失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 格式化分析结果
   * @param {Object} analysisResult - 分析结果
   * @returns {Object} 格式化后的分析结果
   */
  formatAnalysisResults(analysisResult) {
    const formatted = {
      performance: {},
      security: {},
      standards: {}
    };

    try {
      // 格式化性能分析
      if (analysisResult.data?.performance?.data) {
        const perfData = analysisResult.data.performance.data;
        formatted.performance = {
          summary: perfData.summary || '',
          issues: perfData.issues || [],
          recommendations: perfData.recommendations || [],
          confidence: analysisResult.data.performance.metadata?.confidence || 0
        };
      }

      // 格式化安全分析
      if (analysisResult.data?.security?.data) {
        const secData = analysisResult.data.security.data;
        formatted.security = {
          summary: secData.summary || '',
          vulnerabilities: secData.vulnerabilities || [],
          recommendations: secData.recommendations || [],
          confidence: analysisResult.data.security.metadata?.confidence || 0
        };
      }

      // 格式化规范分析
      if (analysisResult.data?.standards?.data) {
        const stdData = analysisResult.data.standards.data;
        formatted.standards = {
          summary: stdData.summary || '',
          violations: stdData.violations || [],
          recommendations: stdData.recommendations || [],
          confidence: analysisResult.data.standards.metadata?.confidence || 0
        };
      }
    } catch (error) {
      console.warn(`[RuleGenerator] 分析结果格式化失败: ${error.message}`);
    }

    return formatted;
  }

  /**
   * 解析LLM响应
   * @param {string} content - LLM响应内容
   * @returns {Object} 解析结果
   */
  parseLLMResponse(content) {
    try {
      console.log(`[RuleGenerator] 开始解析LLM响应，内容长度: ${content.length}`);
      
      // 使用best-effort-json-parser解析LLM响应，使用通用维度
      const parseResult = llmJsonParser.parse(content, 'generic');
      
      console.log(`[RuleGenerator] 解析器返回结果:`, {
        success: parseResult.success,
        hasData: !!parseResult.data,
        dataType: typeof parseResult.data,
        dataKeys: parseResult.data ? Object.keys(parseResult.data) : [],
        strategy: parseResult.strategy
      });
      
      if (parseResult.success && parseResult.data) {
        // 检查解析器返回的数据结构
        const data = parseResult.data;
        
        // 如果解析器返回的是包装对象，提取实际数据
        let actualData = data;
        if (data.data && typeof data.data === 'object') {
          actualData = data.data;
        }
        
        console.log(`[RuleGenerator] 实际数据字段:`, Object.keys(actualData));
        
        // 检查各种可能的规则字段
        const possibleFields = ['rules', 'new_rules', 'learnedRules', 'data'];
        for (const field of possibleFields) {
          if (actualData[field] && Array.isArray(actualData[field])) {
            console.log(`[RuleGenerator] 找到规则字段: ${field}, 数量: ${actualData[field].length}`);
            return {
              success: true,
              [field]: actualData[field],
              strategy: parseResult.strategy
            };
          }
        }
        
        // 检查嵌套的data字段
        if (actualData.data && actualData.data.rules && Array.isArray(actualData.data.rules)) {
          console.log(`[RuleGenerator] 找到嵌套规则字段: data.rules, 数量: ${actualData.data.rules.length}`);
          return {
            success: true,
            rules: actualData.data.rules,
            strategy: parseResult.strategy
          };
        }
        
        if (actualData.data && actualData.data.new_rules && Array.isArray(actualData.data.new_rules)) {
          console.log(`[RuleGenerator] 找到嵌套规则字段: data.new_rules, 数量: ${actualData.data.new_rules.length}`);
          return {
            success: true,
            new_rules: actualData.data.new_rules,
            strategy: parseResult.strategy
          };
        }
        
        // 如果没有找到规则字段，返回原始数据供进一步检查
        console.log(`[RuleGenerator] 未找到规则字段，返回原始数据`);
        return {
          success: true,
          data: actualData,
          strategy: parseResult.strategy
        };
      }

      console.warn(`[RuleGenerator] 无法解析LLM响应: ${content.substring(0, 100)}...`);
      return { success: false, error: '无法解析响应', strategy: parseResult.strategy };
      
    } catch (error) {
      console.error(`[RuleGenerator] LLM响应解析失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 构建深度学习上下文
   * @param {Object} learningContext - 学习上下文
   * @returns {string} 上下文字符串
   */
  buildDeepLearningContext(learningContext) {
    const context = [];

    context.push(`## 当前分析上下文`);
    context.push(`**SQL查询**: \`\`\`sql\n${learningContext.sql}\n\`\`\``);
    context.push(`**数据库类型**: ${learningContext.databaseType}`);
    context.push(`**分析时间**: ${learningContext.timestamp}`);
    context.push('');

    // 添加分析结果
    context.push(`## 分析结果摘要`);
    const analysis = learningContext.currentAnalysis;
    
    if (analysis.data?.performance?.data?.summary) {
      context.push(`### 性能分析`);
      context.push(analysis.data.performance.data.summary);
      context.push('');
    }

    if (analysis.data?.security?.data?.summary) {
      context.push(`### 安全分析`);
      context.push(analysis.data.security.data.summary);
      context.push('');
    }

    if (analysis.data?.standards?.data?.summary) {
      context.push(`### 规范分析`);
      context.push(analysis.data.standards.data.summary);
      context.push('');
    }

    // 添加模式信息
    if (learningContext.patterns) {
      context.push(`## 识别的模式`);
      Object.entries(learningContext.patterns).forEach(([category, patterns]) => {
        if (patterns && patterns.length > 0) {
          context.push(`### ${category.toUpperCase()} 模式`);
          patterns.forEach(pattern => {
            context.push(`- **${pattern.type}**: ${pattern.description}`);
          });
          context.push('');
        }
      });
    }

    // 添加历史上下文
    if (learningContext.similarAnalyses && learningContext.similarAnalyses.length > 0) {
      context.push(`## 历史相似分析`);
      context.push(`相似分析数量: ${learningContext.similarAnalyses.length}`);
      learningContext.similarAnalyses.forEach((analysis, index) => {
        context.push(`${index + 1}. ${analysis.timestamp} - ${analysis.databaseType}`);
      });
      context.push('');
    }

    return context.join('\n');
  }

  /**
   * 获取现有规则摘要（集成知识库检索）
   * @returns {Promise<string>} 现有规则摘要
   */
  async getExistingRulesSummary() {
    try {
      // 集成知识库服务进行智能规则检索
      const { retrieveKnowledge } = await import('../../core/knowledge/index.js');
      
      // 搜索相关规则
      const searchQueries = [
        'SQL性能优化规则',
        'SQL安全检查规则',
        'SQL编码规范规则'
      ];
      
      let allRules = [];
      for (const query of searchQueries) {
        const result = await retrieveKnowledge(query, 2);
        if (result.success && result.data.documents) {
          allRules.push(...result.data.documents.map(doc => doc.pageContent));
        }
      }
      
      // 如果知识库中有规则，返回智能摘要
      if (allRules.length > 0) {
        const rulesSummary = allRules.slice(0, 5).map(content => {
          // 提取规则标题和关键信息
          const lines = content.split('\n');
          const titleLine = lines.find(line => line.startsWith('# '));
          const title = titleLine ? titleLine.replace('# ', '') : '未知规则';
          return `- ${title}`;
        }).join('\n');
        
        return `基于知识库检索到的现有规则：\n${rulesSummary}\n\n这些规则涵盖了性能优化、安全检查和编码规范等方面。`;
      }
      
      // 知识库中没有规则，返回基本摘要
      return '现有规则包括性能优化、安全检查和编码规范等类别的SQL审核规则。';
      
    } catch (error) {
      console.warn(`[RuleGenerator] 获取现有规则摘要失败: ${error.message}`);
      return '现有规则包括性能优化、安全检查和编码规范等类别的SQL审核规则。';
    }
  }

  /**
   * 规则去重
   * @param {Array} rules - 规则数组
   * @returns {Array} 去重后的规则数组
   */
  deduplicateRules(rules) {
    const seen = new Set();
    const deduplicated = [];

    for (const rule of rules) {
      // 使用标题+类型+类别作为唯一标识
      const key = `${rule.title}-${rule.type}-${rule.category}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(rule);
      }
    }

    return deduplicated;
  }

  /**
   * 验证规则质量
   * @param {Object} rule - 规则对象
   * @returns {boolean} 是否通过验证
   */
  validateRule(rule) {
    try {
      // 检查必需字段
      const requiredFields = ['title', 'description', 'category', 'type', 'severity', 'confidence'];
      for (const field of requiredFields) {
        if (!rule[field] || rule[field] === '') {
          console.warn(`[RuleGenerator] 规则验证失败: 缺少必需字段 ${field}`);
          return false;
        }
      }

      // 检查置信度范围
      if (rule.confidence < 0 || rule.confidence > 1) {
        console.warn(`[RuleGenerator] 规则验证失败: 置信度超出范围 ${rule.confidence}`);
        return false;
      }

      // 检查严重程度
      const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
      if (!validSeverities.includes(rule.severity)) {
        console.warn(`[RuleGenerator] 规则验证失败: 无效严重程度 ${rule.severity}`);
        return false;
      }

      // 检查类别
      const validCategories = ['performance', 'security', 'standards'];
      if (!validCategories.includes(rule.category)) {
        console.warn(`[RuleGenerator] 规则验证失败: 无效类别 ${rule.category}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`[RuleGenerator] 规则验证失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 生成规则模板
   * @param {Array} rules - 规则数组
   * @returns {Promise<Object>} 规则模板
   */
  async generateRuleTemplate(rules) {
    try {
      if (!rules || rules.length === 0) {
        return { success: false, error: '没有规则可用于生成模板' };
      }

      // 1. 准备模板生成变量
      const variables = {
        ruleCollection: JSON.stringify(rules, null, 2),
        databaseType: 'mysql', // 可以从规则中推断
        templateCategory: 'performance' // 可以从规则中推断
      };

      // 2. 构建提示词
      const { systemPrompt, userPrompt } = await buildPrompt('template-generation.md', variables, { category: 'rule-learning' });

      // 3. 调用LLM
      const llmResult = await this.llmService.call(`${systemPrompt}\n\n${userPrompt}`);

      // 4. 解析结果
      const result = this.parseLLMResponse(llmResult.content);
      
      console.log(`[RuleGenerator] 规则模板生成完成`);
      return result;
      
    } catch (error) {
      console.error(`[RuleGenerator] 规则模板生成失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 生成Fallback规则（基于分析结果的简单规则生成）
   * @param {Object} learningContext - 学习上下文
   * @returns {Promise<Array>} 生成的规则数组
   */
  async generateFallbackRules(learningContext) {
    try {
      console.log(`[RuleGenerator] 开始生成fallback规则...`);
      
      const rules = [];
      const analysis = learningContext.currentAnalysis;
      
      // 基于性能分析生成规则
      if (analysis.data?.performance?.data?.issues) {
        const perfIssues = analysis.data.performance.data.issues;
        for (const issue of perfIssues) {
          if (issue.type === '数据访问效率' && issue.description.includes('SELECT *')) {
            rules.push({
              title: '避免使用SELECT *进行查询',
              description: '使用SELECT *会返回所有列，增加网络传输和内存开销',
              category: 'performance',
              type: '数据访问效率',
              severity: issue.severity || 'medium',
              condition: '检测到SELECT *语句',
              example: learningContext.sql,
              confidence: 0.8,
              evaluation: {
                qualityScore: 75,
                qualityLevel: '良好',
                shouldKeep: true,
                evaluationSummary: '基于实际分析结果生成的性能优化规则'
              }
            });
          } else if (issue.type === '索引优化') {
            rules.push({
              title: '为查询条件添加合适索引',
              description: '为WHERE条件中的字段添加索引可以显著提升查询性能',
              category: 'performance',
              type: '索引优化',
              severity: issue.severity || 'high',
              condition: '检测到缺少索引的查询条件',
              example: learningContext.sql,
              confidence: 0.85,
              evaluation: {
                qualityScore: 80,
                qualityLevel: '良好',
                shouldKeep: true,
                evaluationSummary: '基于索引分析生成的性能优化规则'
              }
            });
          }
        }
      }
      
      // 基于安全分析生成规则
      if (analysis.data?.security?.data?.vulnerabilities) {
        const secVulns = analysis.data.security.data.vulnerabilities;
        for (const vuln of secVulns) {
          if (vuln.type === 'SQL注入风险') {
            rules.push({
              title: '使用参数化查询防止SQL注入',
              description: '将用户输入作为参数传递，而不是字符串拼接，防止SQL注入攻击',
              category: 'security',
              type: 'SQL注入防护',
              severity: vuln.severity || 'high',
              condition: '检测到可能的SQL注入风险',
              example: learningContext.sql,
              confidence: 0.9,
              evaluation: {
                qualityScore: 85,
                qualityLevel: '良好',
                shouldKeep: true,
                evaluationSummary: '基于安全分析结果生成的SQL注入防护规则'
              }
            });
          } else if (vuln.type === '权限控制') {
            rules.push({
              title: '实施最小权限原则',
              description: '数据库用户应该只拥有执行其任务所需的最小权限',
              category: 'security',
              type: '权限控制',
              severity: vuln.severity || 'medium',
              condition: '检测到权限配置问题',
              example: learningContext.sql,
              confidence: 0.8,
              evaluation: {
                qualityScore: 78,
                qualityLevel: '良好',
                shouldKeep: true,
                evaluationSummary: '基于权限分析生成的安全规则'
              }
            });
          }
        }
      }
      
      // 基于规范分析生成规则
      if (analysis.data?.standards?.data?.violations) {
        const stdViolations = analysis.data.standards.data.violations;
        for (const violation of stdViolations) {
          if (violation.type === '最佳实践' && violation.description.includes('SELECT *')) {
            rules.push({
              title: '明确指定查询字段而非使用通配符',
              description: '应明确指定需要的字段而非使用SELECT *通配符，提高查询性能和代码可维护性',
              category: 'standards',
              type: '编码规范',
              severity: violation.severity || 'warning',
              condition: '检测到SELECT *使用',
              example: learningContext.sql,
              confidence: 0.7,
              evaluation: {
                qualityScore: 70,
                qualityLevel: '一般',
                shouldKeep: true,
                evaluationSummary: '基于编码规范分析生成的最佳实践规则'
              }
            });
          } else if (violation.type === '格式规范') {
            rules.push({
              title: '遵循SQL代码格式化规范',
              description: 'SQL语句应该有适当的缩进、换行和关键字大写，提高可读性',
              category: 'standards',
              type: '格式规范',
              severity: violation.severity || 'low',
              condition: '检测到SQL格式不规范',
              example: learningContext.sql,
              confidence: 0.6,
              evaluation: {
                qualityScore: 65,
                qualityLevel: '一般',
                shouldKeep: true,
                evaluationSummary: '基于格式分析生成的编码规范规则'
              }
            });
          }
        }
      }
      
      // 如果没有生成任何规则，创建一个通用规则
      if (rules.length === 0) {
        rules.push({
          title: 'SQL查询需要进一步优化',
          description: '基于分析结果，此SQL查询存在优化空间，建议进一步分析和优化',
          category: 'performance',
          type: '通用优化',
          severity: 'low',
          condition: '检测到SQL查询性能问题',
          example: learningContext.sql,
          confidence: 0.5,
          evaluation: {
            qualityScore: 60,
            qualityLevel: '一般',
            shouldKeep: true,
            evaluationSummary: '基于通用分析生成的优化建议规则'
          }
        });
      }
      
      console.log(`[RuleGenerator] Fallback规则生成完成: ${rules.length}条规则`);
      return rules;
      
    } catch (error) {
      console.error(`[RuleGenerator] Fallback规则生成失败: ${error.message}`);
      return [];
    }
  }
}

export default RuleGenerator;