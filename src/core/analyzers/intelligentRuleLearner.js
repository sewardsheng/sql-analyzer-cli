/**
 * 智能规则学习子代理
 * 负责从分析结果中学习并生成规则文档，维护知识库
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { readConfig } from '../../services/config/index.js';
import { buildPrompt, validateRequiredVariables } from '../../utils/promptLoader.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * 智能规则学习子代理
 */
class IntelligentRuleLearner {
  constructor(config = {}) {
    this.config = config;
    this.llm = null;
    this.initialized = false;
    // 更新规则目录路径，指向年-月份目录结构
    this.baseRulesDirectory = config.rulesDirectory || path.join(process.cwd(), 'rules', 'learning-rules', 'issues');
  }

  /**
   * 初始化LLM
   */
  async initialize() {
    if (this.initialized) return;
    
    const envConfig = await readConfig();
    this.llm = new ChatOpenAI({
      modelName: this.config.model || envConfig.model,
      temperature: 0.1,
      maxTokens: 99999,
      configuration: {
        apiKey: this.config.apiKey || envConfig.apiKey,
        baseURL: this.config.baseURL || envConfig.baseURL
      }
    });
    
    // 确保规则目录存在
    await this.ensureRulesDirectory();
    
    this.initialized = true;
  }

  /**
   * 确保规则目录存在，创建年-月份目录结构
   */
  async ensureRulesDirectory() {
    try {
      // 获取当前日期，创建年-月份目录结构
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      
      // 创建年-月份目录路径，格式为 YYYY-MM
      this.rulesDirectory = path.join(this.baseRulesDirectory, `${year}-${month}`);
      
      // 确保目录存在
      await fs.mkdir(this.rulesDirectory, { recursive: true });
    } catch (error) {
      console.error("创建规则目录失败:", error);
      throw error;
    }
  }

  /**
   * 从分析结果中学习并生成规则
   * @param {Object} input - 输入参数
   * @param {string} input.sqlQuery - SQL查询语句
   * @param {string} input.databaseType - 数据库类型
   * @param {Object} input.analysisResults - 完整分析结果
   * @returns {Promise<Object>} 学习结果
   */
  async learnFromAnalysis(input) {
    await this.initialize();
    
    const { sqlQuery, databaseType, analysisResults } = input;
    
    try {
      // 验证必需的变量
      validateRequiredVariables({ sqlQuery, databaseType, analysisResults },
        ['sqlQuery', 'databaseType', 'analysisResults']);
      
      // 构建分析结果摘要
      const analysisResultsSummary = this.buildAnalysisResultsSummary(analysisResults);
      
      // 使用prompt模板构建消息
      const { systemPrompt, userPrompt } = await buildPrompt('rule-generation.md', {
        databaseType: databaseType || '未知',
        sqlQuery,
        analysisResults: analysisResultsSummary
      });
      
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
      ];

      const response = await this.llm.invoke(messages);
      let content = response.content;
      
      // 处理可能的代码块包装
      if (content.includes('```')) {
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          content = codeBlockMatch[1];
        }
      }
      
      // 更健壮的JSON内容清理
      let cleanedContent = content;
      
      // 移除JavaScript风格的注释
      cleanedContent = cleanedContent.replace(/\/\/.*$/gm, '');
      cleanedContent = cleanedContent.replace(/\/\*[\s\S]*?\*\//g, '');
      
      // 移除可能的变量声明和赋值
      cleanedContent = cleanedContent.replace(/(?:const|let|var)\s+\w+\s*=\s*/g, '');
      
      // 移除错误的字符串连接符
      cleanedContent = cleanedContent.replace(/"\s*\+\s*"/g, '');
      cleanedContent = cleanedContent.replace(/\n\s*\+\s*/g, '');
      
      // 移除可能的前后缀非JSON内容
      cleanedContent = cleanedContent.trim();
      
      // 尝试找到JSON对象的开始和结束
      const jsonStart = cleanedContent.indexOf('{');
      const jsonEnd = cleanedContent.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
      }
      
      // 修复尾随逗号
      cleanedContent = cleanedContent.replace(/,(\s*[}\]])/g, '$1');
      
      // 最终修剪
      cleanedContent = cleanedContent.trim();
      
      let result;
      try {
        result = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error("JSON解析失败，尝试更宽松的解析:", parseError.message);
        console.error("原始内容:", content);
        console.error("清理后内容:", cleanedContent);
        
        // 尝试使用eval作为最后的手段（仅用于开发环境）
        try {
          result = eval(`(${cleanedContent})`);
        } catch (evalError) {
          throw new Error(`无法解析LLM返回的内容为JSON: ${parseError.message}`);
        }
      }
      
      // 保存学习到的规则
      const savedFiles = await this.saveLearnedRules(result, databaseType, sqlQuery, analysisResults);
      
      return {
        success: true,
        data: {
          ...result,
          mdFilePath: savedFiles.mdFilePath
        },
        savedFiles,
        message: `成功从分析结果中学习了 ${result.learnedRules?.length || 0} 条规则`
      };
    } catch (error) {
      console.error("规则学习失败:", error);
      return {
        success: false,
        error: `学习失败: ${error.message}`
      };
    }
  }

  /**
   * 构建分析结果摘要
   * @param {Object} analysisResults - 完整分析结果
   * @returns {string} 格式化的分析结果摘要
   */
  buildAnalysisResultsSummary(analysisResults) {
    let summary = "";
    
    if (!analysisResults) {
      return "无分析结果";
    }
    
    summary += "分析结果摘要：\n";
    summary += `- 整体评分: ${analysisResults.overallScore || '未知'}\n`;
    summary += `- 性能分析: ${analysisResults.performanceAnalysis ? '已完成' : '未完成'}\n`;
    summary += `- 安全审计: ${analysisResults.securityAudit ? '已完成' : '未完成'}\n`;
    summary += `- 编码规范检查: ${analysisResults.standardsCheck ? '已完成' : '未完成'}\n`;
    summary += `- 优化建议: ${analysisResults.optimizationSuggestions ? '已完成' : '未完成'}\n`;
    
    // 性能分析详情
    if (analysisResults.performanceAnalysis && analysisResults.performanceAnalysis.data) {
      const perf = analysisResults.performanceAnalysis.data;
      summary += "\n性能分析详情：\n";
      summary += `- 性能评分: ${perf.performanceScore || '未知'}\n`;
      summary += `- 复杂度: ${perf.complexityLevel || '未知'}\n`;
      summary += `- 瓶颈数量: ${perf.bottlenecks?.length || 0}\n`;
      
      if (perf.bottlenecks && perf.bottlenecks.length > 0) {
        summary += "- 主要瓶颈:\n";
        perf.bottlenecks.slice(0, 3).forEach((b, i) => {
          summary += `  ${i + 1}. ${b.description || '未知'} (严重程度: ${b.severity || '未知'})\n`;
        });
      }
    }
    
    // 安全审计详情
    if (analysisResults.securityAudit && analysisResults.securityAudit.data) {
      const sec = analysisResults.securityAudit.data;
      summary += "\n安全审计详情：\n";
      summary += `- 安全评分: ${sec.securityScore || '未知'}\n`;
      summary += `- 风险等级: ${sec.riskLevel || '未知'}\n`;
      summary += `- 漏洞数量: ${sec.vulnerabilities?.length || 0}\n`;
      
      if (sec.vulnerabilities && sec.vulnerabilities.length > 0) {
        summary += "- 主要漏洞:\n";
        sec.vulnerabilities.slice(0, 3).forEach((v, i) => {
          summary += `  ${i + 1}. ${v.description || '未知'} (严重程度: ${v.severity || '未知'})\n`;
        });
      }
    }
    
    // 编码规范检查详情
    if (analysisResults.standardsCheck && analysisResults.standardsCheck.data) {
      const std = analysisResults.standardsCheck.data;
      summary += "\n编码规范检查详情：\n";
      summary += `- 规范评分: ${std.standardsScore || '未知'}\n`;
      summary += `- 合规等级: ${std.complianceLevel || '未知'}\n`;
      summary += `- 违规数量: ${std.violations?.length || 0}\n`;
      
      if (std.violations && std.violations.length > 0) {
        summary += "- 主要违规:\n";
        std.violations.slice(0, 3).forEach((v, i) => {
          summary += `  ${i + 1}. ${v.description || '未知'} (严重程度: ${v.severity || '未知'})\n`;
        });
      }
    }
    
    return summary;
  }

  /**
   * 将分析结果转换为Markdown格式
   * @param {Object} rules - 学习到的规则
   * @param {string} databaseType - 数据库类型
   * @param {string} sqlQuery - SQL查询
   * @param {Object} analysisResults - 完整的分析结果
   * @returns {string} Markdown格式的规则内容
   */
  convertRulesToMarkdown(rules, databaseType, sqlQuery, analysisResults) {
    const now = new Date();
    const timestamp = now.toISOString();
    
    let markdown = `# ${databaseType} 数据库规则学习结果\n\n`;
    markdown += `**生成时间**: ${timestamp}\n\n`;
    
    // 原始SQL查询
    markdown += `## 原始SQL查询\n\n`;
    markdown += `\`\`\`sql\n${sqlQuery}\n\`\`\`\n\n`;
    
    // 性能问题分析
    if (analysisResults.performanceAnalysis && analysisResults.performanceAnalysis.data) {
      markdown += `## 性能问题分析\n\n`;
      const perf = analysisResults.performanceAnalysis.data;
      markdown += `- **性能评分**: ${perf.performanceScore || '未知'}\n`;
      markdown += `- **复杂度级别**: ${perf.complexityLevel || '未知'}\n`;
      markdown += `- **预估执行时间**: ${perf.estimatedExecutionTime || '未知'}\n`;
      markdown += `- **资源使用**: ${perf.resourceUsage || '未知'}\n\n`;
      
      if (perf.bottlenecks && perf.bottlenecks.length > 0) {
        markdown += `### 性能瓶颈\n\n`;
        perf.bottlenecks.forEach((bottleneck, index) => {
          markdown += `${index + 1}. ${bottleneck.description}\n`;
          markdown += `   - **严重程度**: ${bottleneck.severity || '未知'}\n`;
          if (bottleneck.recommendation) {
            markdown += `   - **建议**: ${bottleneck.recommendation}\n`;
          }
          markdown += `\n`;
        });
      }
    }
    
    // 安全问题分析
    if (analysisResults.securityAudit && analysisResults.securityAudit.data) {
      markdown += `## 安全问题分析\n\n`;
      const security = analysisResults.securityAudit.data;
      markdown += `- **安全评分**: ${security.securityScore || '未知'}\n`;
      markdown += `- **风险等级**: ${security.riskLevel || '未知'}\n\n`;
      
      if (security.vulnerabilities && security.vulnerabilities.length > 0) {
        markdown += `### 安全漏洞\n\n`;
        security.vulnerabilities.forEach((vuln, index) => {
          markdown += `${index + 1}. ${vuln.description}\n`;
          markdown += `   - **严重程度**: ${vuln.severity || '未知'}\n`;
          if (vuln.recommendation) {
            markdown += `   - **建议**: ${vuln.recommendation}\n`;
          }
          markdown += `\n`;
        });
      }
    }
    
    // 编码规范问题分析
    if (analysisResults.standardsCheck && analysisResults.standardsCheck.data) {
      markdown += `## 编码规范问题分析\n\n`;
      const standards = analysisResults.standardsCheck.data;
      markdown += `- **规范评分**: ${standards.standardsScore || '未知'}\n`;
      markdown += `- **合规等级**: ${standards.complianceLevel || '未知'}\n\n`;
      
      if (standards.violations && standards.violations.length > 0) {
        markdown += `### 规范违规\n\n`;
        standards.violations.forEach((violation, index) => {
          markdown += `${index + 1}. ${violation.description}\n`;
          markdown += `   - **严重程度**: ${violation.severity || '未知'}\n`;
          if (violation.recommendation) {
            markdown += `   - **建议**: ${violation.recommendation}\n`;
          }
          markdown += `\n`;
        });
      }
    }
    
    // 添加学习到的规则
    if (rules.learnedRules && rules.learnedRules.length > 0) {
      markdown += `## 学习到的规则\n\n`;
      rules.learnedRules.forEach((rule, index) => {
        markdown += `### ${index + 1}. ${rule.title}\n\n`;
        markdown += `- **类别**: ${rule.category}\n`;
        markdown += `- **类型**: ${rule.type}\n`;
        markdown += `- **描述**: ${rule.description}\n`;
        markdown += `- **触发条件**: ${rule.condition}\n`;
        markdown += `- **严重程度**: ${rule.severity}\n`;
        markdown += `- **置信度**: ${rule.confidence}\n\n`;
        
        if (rule.example) {
          markdown += `**示例**:\n\`\`\`sql\n${rule.example}\n\`\`\`\n\n`;
        }
      });
    }
    
    // 添加模式
    if (rules.patterns && rules.patterns.length > 0) {
      markdown += `## 识别的模式\n\n`;
      rules.patterns.forEach((pattern, index) => {
        markdown += `### ${index + 1}. ${pattern.name}\n\n`;
        markdown += `- **类别**: ${pattern.category}\n`;
        markdown += `- **描述**: ${pattern.description}\n`;
        markdown += `- **出现频率**: ${pattern.frequency}\n\n`;
        
        if (pattern.example) {
          markdown += `**示例**:\n\`\`\`sql\n${pattern.example}\n\`\`\`\n\n`;
        }
      });
    }
    
    // 添加反模式
    if (rules.antiPatterns && rules.antiPatterns.length > 0) {
      markdown += `## 识别的反模式\n\n`;
      rules.antiPatterns.forEach((antiPattern, index) => {
        markdown += `### ${index + 1}. ${antiPattern.name}\n\n`;
        markdown += `- **类别**: ${antiPattern.category}\n`;
        markdown += `- **描述**: ${antiPattern.description}\n`;
        markdown += `- **后果**: ${antiPattern.consequence}\n`;
        markdown += `- **替代方案**: ${antiPattern.alternative}\n\n`;
        
        if (antiPattern.example) {
          markdown += `**示例**:\n\`\`\`sql\n${antiPattern.example}\n\`\`\`\n\n`;
        }
      });
    }
    
    // 添加最佳实践
    if (rules.bestPractices && rules.bestPractices.length > 0) {
      markdown += `## 最佳实践\n\n`;
      rules.bestPractices.forEach((practice, index) => {
        markdown += `### ${index + 1}. ${practice.name}\n\n`;
        markdown += `- **类别**: ${practice.category}\n`;
        markdown += `- **描述**: ${practice.description}\n`;
        markdown += `- **好处**: ${practice.benefit}\n\n`;
        
        if (practice.example) {
          markdown += `**示例**:\n\`\`\`sql\n${practice.example}\n\`\`\`\n\n`;
        }
      });
    }
    
    return markdown;
  }

  /**
   * 保存学习到的规则
   * @param {Object} rules - 学习到的规则
   * @param {string} databaseType - 数据库类型
   * @param {string} sqlQuery - SQL查询
   * @param {Object} analysisResults - 完整的分析结果
   * @returns {Promise<Object>} 保存的文件路径
   */
  async saveLearnedRules(rules, databaseType, sqlQuery, analysisResults) {
    try {
      // 确保规则目录存在
      await this.ensureRulesDirectory();
      
      // 生成带时间戳的文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const mdFileName = `rules-${timestamp}.md`;
      
      const mdFilePath = path.join(this.rulesDirectory, mdFileName);
      
      // 保存Markdown规则文件
    const mdContent = this.convertRulesToMarkdown(rules, databaseType, sqlQuery, analysisResults);
    await fs.writeFile(mdFilePath, mdContent, 'utf8');
      
      return { mdFilePath };
    } catch (error) {
      console.error("保存规则失败:", error);
      throw error;
    }
  }

  /**
   * 检索相关规则
   * @param {Object} input - 输入参数
   * @param {string} input.query - 查询字符串
   * @param {string} input.databaseType - 数据库类型
   * @param {number} input.limit - 返回规则数量限制
   * @returns {Promise<Object>} 检索结果
   */
  async retrieveRules(input) {
    await this.initialize();
    
    const { query, databaseType, limit = 5 } = input;
    
    // 使用提示词模板
    const { systemPrompt } = await buildPrompt(
      'intelligent-rule-learner.md',
      {},
      {
        category: 'analyzers',
        section: '规则检索'
      }
    );

    // 这里可以实现更复杂的规则检索逻辑
    // 目前简化为使用LLM进行规则检索
    
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`请为以下${databaseType || '未知'}数据库的SQL查询检索相关规则：

查询: ${query}`)
    ];

    try {
      const response = await this.llm.invoke(messages);
      let content = response.content;
      
      // 处理可能的代码块包装
      if (content.includes('```')) {
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          content = codeBlockMatch[1];
        }
      }
      
      const result = JSON.parse(content);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error("规则检索失败:", error);
      return {
        success: false,
        error: `检索失败: ${error.message}`
      };
    }
  }
}

/**
 * 创建智能规则学习工具
 * @param {Object} config - 配置参数
 * @returns {Object} 工具对象
 */
export function createIntelligentRuleLearnerTool(config = {}) {
  const agent = new IntelligentRuleLearner(config);
  
  return {
    name: "intelligent_rule_learner",
    description: "从分析结果中学习并生成规则文档，维护知识库",
    parameters: {
      type: "object",
      properties: {
        sqlQuery: {
          type: "string",
          description: "要学习的SQL查询语句"
        },
        databaseType: {
          type: "string",
          description: "数据库类型(mysql, postgresql, oracle, sqlserver, sqlite等)"
        },
        analysisResults: {
          type: "object",
          description: "完整的分析结果"
        }
      },
      required: ["sqlQuery", "databaseType", "analysisResults"]
    },
    func: async (input) => {
      return await agent.learnFromAnalysis(input);
    }
  };
}

export default IntelligentRuleLearner;