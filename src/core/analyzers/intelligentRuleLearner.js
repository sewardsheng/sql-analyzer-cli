/**
 * 智能规则学习子代理
 * 负责从分析结果中学习并生成规则文档，维护知识库
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { readConfig } from '../../services/config/index.js';
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
      maxTokens: 2000,
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
      
      // 创建年-月份目录路径
      this.rulesDirectory = path.join(this.baseRulesDirectory, year, month);
      
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
    
    const systemPrompt = `你是一个SQL规则学习专家，能够从SQL分析结果中提取有价值的规则和模式。

你的任务是分析给定的SQL查询及其分析结果，提取有价值的规则和模式，并生成可重用的知识。

请关注以下学习方面：
1. 性能优化规则
2. 安全最佳实践
3. 编码规范规则
4. 数据库特定模式
5. 常见问题和解决方案

请使用以下JSON格式返回结果：
{
  "learnedRules": [
    {
      "category": "规则类别",
      "type": "规则类型",
      "title": "规则标题",
      "description": "规则描述",
      "condition": "触发条件",
      "example": "示例代码",
      "severity": "严重程度",
      "confidence": "置信度"
    }
  ],
  "patterns": [
    {
      "name": "模式名称",
      "description": "模式描述",
      "category": "模式类别",
      "example": "示例代码",
      "frequency": "出现频率"
    }
  ],
  "antiPatterns": [
    {
      "name": "反模式名称",
      "description": "反模式描述",
      "category": "反模式类别",
      "example": "示例代码",
      "consequence": "后果",
      "alternative": "替代方案"
    }
  ],
  "bestPractices": [
    {
      "name": "最佳实践名称",
      "description": "实践描述",
      "category": "实践类别",
      "example": "示例代码",
      "benefit": "好处"
    }
  ]
}`;

    // 构建分析结果信息
    let analysisInfo = "";
    if (analysisResults) {
      analysisInfo = `
分析结果摘要：
- 整体评分: ${analysisResults.overallScore || '未知'}
- 性能分析: ${analysisResults.performanceAnalysis ? '已完成' : '未完成'}
- 安全审计: ${analysisResults.securityAudit ? '已完成' : '未完成'}
- 编码规范检查: ${analysisResults.standardsCheck ? '已完成' : '未完成'}
- 优化建议: ${analysisResults.optimizationSuggestions ? '已完成' : '未完成'}
`;

      if (analysisResults.performanceAnalysis && analysisResults.performanceAnalysis.data) {
        analysisInfo += `
性能分析详情：
- 性能评分: ${analysisResults.performanceAnalysis.data.performanceScore || '未知'}
- 复杂度: ${analysisResults.performanceAnalysis.data.complexityLevel || '未知'}
- 瓶颈数量: ${analysisResults.performanceAnalysis.data.bottlenecks?.length || 0}
`;
      }

      if (analysisResults.securityAudit && analysisResults.securityAudit.data) {
        analysisInfo += `
安全审计详情：
- 安全评分: ${analysisResults.securityAudit.data.securityScore || '未知'}
- 风险等级: ${analysisResults.securityAudit.data.riskLevel || '未知'}
- 漏洞数量: ${analysisResults.securityAudit.data.vulnerabilities?.length || 0}
`;
      }

      if (analysisResults.standardsCheck && analysisResults.standardsCheck.data) {
        analysisInfo += `
编码规范检查详情：
- 规范评分: ${analysisResults.standardsCheck.data.standardsScore || '未知'}
- 合规等级: ${analysisResults.standardsCheck.data.complianceLevel || '未知'}
- 违规数量: ${analysisResults.standardsCheck.data.violations?.length || 0}
`;
      }
    }

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`请从以下${databaseType || '未知'}数据库的SQL查询分析结果中学习规则：

SQL查询:
${sqlQuery}

${analysisInfo}`)
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
      
      // 保存学习到的规则
      const savedFiles = await this.saveLearnedRules(result, databaseType, sqlQuery, analysisResults);
      console.log(`规则已保存到: ${savedFiles.mdFilePath}`);
      
      return {
        success: true,
        data: result,
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
      
      // 保存Markdown格式的规则
      const markdownContent = this.convertRulesToMarkdown(rules, databaseType, sqlQuery, analysisResults);
      await fs.writeFile(mdFilePath, markdownContent, 'utf8');
      console.log(`Markdown规则已保存到: ${mdFilePath}`);
      
      // 更新规则索引
      await this.updateRulesIndex(mdFilePath, databaseType);
      
      return { mdFilePath };
    } catch (error) {
      console.error("保存规则失败:", error);
      throw error;
    }
  }

  /**
   * 更新规则索引
   * @param {string} mdFilePath - Markdown规则文件路径
   * @param {string} databaseType - 数据库类型
   * @param {string} timestamp - 时间戳
   */
  async updateRulesIndex(mdFilePath, databaseType, timestamp) {
    try {
      const indexFile = path.join(this.baseRulesDirectory, 'index.json');
      
      let index = [];
      try {
        const indexData = await fs.readFile(indexFile, 'utf8');
        index = JSON.parse(indexData);
      } catch (error) {
        // 索引文件不存在，创建新的
        console.log("创建新的规则索引文件");
      }
      
      // 获取相对路径
      const mdRelativePath = path.relative(this.baseRulesDirectory, mdFilePath);
      
      // 添加新规则到索引
      index.push({
        id: timestamp,
        databaseType,
        mdPath: mdRelativePath,
        createdAt: new Date().toISOString()
      });
      
      // 保存索引
      await fs.writeFile(indexFile, JSON.stringify(index, null, 2), 'utf8');
      console.log("规则索引已更新");
    } catch (error) {
      console.error("更新规则索引失败:", error);
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
    
    const systemPrompt = `你是一个SQL规则检索专家，能够根据查询条件检索相关的规则和知识。

你的任务是分析给定的查询，从知识库中检索最相关的规则和模式。

请使用以下JSON格式返回结果：
{
  "relevantRules": [
    {
      "category": "规则类别",
      "type": "规则类型",
      "title": "规则标题",
      "description": "规则描述",
      "condition": "触发条件",
      "example": "示例代码",
      "severity": "严重程度",
      "confidence": "置信度",
      "relevance": "相关性评分"
    }
  ],
  "relevantPatterns": [
    {
      "name": "模式名称",
      "description": "模式描述",
      "category": "模式类别",
      "example": "示例代码",
      "relevance": "相关性评分"
    }
  ],
  "relevantBestPractices": [
    {
      "name": "最佳实践名称",
      "description": "实践描述",
      "category": "实践类别",
      "example": "示例代码",
      "relevance": "相关性评分"
    }
  ]
}`;

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