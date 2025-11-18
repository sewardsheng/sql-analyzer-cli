/**
 * 智能规则学习子代理
 * 负责从分析结果中学习并生成规则文档，维护知识库
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { buildPrompt, validateRequiredVariables } from '../../utils/promptLoader.js';
import JSONCleaner from '../../utils/jsonCleaner.js';
import BaseAnalyzer from './BaseAnalyzer.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * 智能规则学习子代理
 */
class IntelligentRuleLearner extends BaseAnalyzer {
  constructor(config = {}) {
    super(config);
    
    // 确保配置对象存在
    config = config || {};
    
    // 设置基础目录
    const baseDir = config.rulesDirectory || path.join(process.cwd(), 'rules', 'learning-rules');
    this.baseLearningRulesDirectory = baseDir;
    this.baseRulesDirectory = path.join(baseDir, 'issues');
  }

  /**
   * 初始化LLM并确保规则目录存在
   */
  async initialize() {
    await super.initialize();
    if (!this.rulesDirectory) {
      await this.ensureRulesDirectory();
    }
  }

  /**
   * 确保规则目录存在，创建年-月份目录结构
   * @param {string} type - 目录类型: 'issues', 'approved', 'archived'
   */
  async ensureRulesDirectory(type = 'issues') {
    try {
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      
      if (type === 'archived') {
        // archived 目录使用日期格式 YYYY-MM-DD
        const day = now.getDate().toString().padStart(2, '0');
        this.rulesDirectory = path.join(this.baseLearningRulesDirectory, 'archived', `${year}-${month}-${day}`);
      } else {
        // issues 和 approved 目录使用年-月格式
        this.rulesDirectory = path.join(this.baseLearningRulesDirectory, type, `${year}-${month}`);
      }
      
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
      validateRequiredVariables(
        { sqlQuery, databaseType, analysisResults },
        ['sqlQuery', 'databaseType', 'analysisResults']
      );
      
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

      // 调用LLM
      const response = await this.getLLM().invoke(messages);
      const content = response.content;
      
      // 使用共享的JSONCleaner解析响应
      const result = JSONCleaner.parse(content);
      
      // 验证结果结构
      this.validateRuleStructure(result);
      
      // 验证生成的规则质量(在保存前)
      try {
        this.validateRuleQualityBeforeSave(result);
      } catch (validationError) {
        // 如果验证失败,记录详细错误并抛出
        console.error('❌ 规则质量验证失败:', validationError.message);
        throw new Error(`规则质量不符合要求: ${validationError.message}`);
      }
      
      // 保存学习到的规则
      const savedFiles = await this.saveLearnedRules(
        result,
        databaseType,
        sqlQuery,
        analysisResults
      );
      
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
      return this.handleError('规则学习', error);
    }
  }

  /**
   * 验证规则结构
   * @param {Object} rules - 学习到的规则
   */
  validateRuleStructure(rules) {
    if (!rules || typeof rules !== 'object') {
      throw new Error('规则结果必须是一个对象');
    }

    // 确保必要的数组字段存在
    const requiredArrayFields = ['learnedRules', 'patterns', 'antiPatterns', 'bestPractices'];
    requiredArrayFields.forEach(field => {
      if (!rules[field]) {
        rules[field] = [];
      } else if (!Array.isArray(rules[field])) {
        throw new Error(`${field} 必须是一个数组`);
      }
    });
  }

  /**
   * 在保存前验证规则质量
   * @param {Object} rules - 学习到的规则
   * @throws {Error} 如果规则质量不符合要求
   */
  validateRuleQualityBeforeSave(rules) {
    // 检查是否至少有一条规则
    if (!rules.learnedRules || rules.learnedRules.length === 0) {
      throw new Error('规则生成失败：未生成任何规则。请检查分析结果是否包含足够的信息。');
    }

    // 验证每条规则的完整性
    rules.learnedRules.forEach((rule, index) => {
      const requiredFields = ['category', 'type', 'title', 'description', 'condition', 'severity'];
      const missingFields = requiredFields.filter(field => !rule[field] || rule[field].trim() === '');
      
      if (missingFields.length > 0) {
        throw new Error(`规则 ${index + 1} "${rule.title || '未命名'}" 缺少必需字段: ${missingFields.join(', ')}`);
      }

      // 验证描述长度（至少20个字符）
      if (rule.description.length < 20) {
        throw new Error(`规则 ${index + 1} "${rule.title}" 的描述过于简短，至少需要20个字符`);
      }

      // 验证示例是否存在（可选但推荐）
      if (!rule.example || rule.example.trim() === '') {
        console.warn(`⚠️ 警告: 规则 "${rule.title}" 缺少示例代码`);
      }
    });

    // 推荐至少有2条规则
    if (rules.learnedRules.length < 2) {
      console.warn(`⚠️ 警告: 仅生成了 ${rules.learnedRules.length} 条规则，建议至少生成2条规则`);
    }

    console.log(`✅ 规则验证通过：共 ${rules.learnedRules.length} 条规则`);
  }

  /**
   * 构建分析结果摘要
   * @param {Object} analysisResults - 完整分析结果
   * @returns {string} 格式化的分析结果摘要
   */
  buildAnalysisResultsSummary(analysisResults) {
    if (!analysisResults) {
      return "无分析结果";
    }

    const sections = [];
    
    // 基本信息
    sections.push("=== 分析结果概览 ===");
    sections.push(`整体评分: ${analysisResults.overallScore || '未知'}`);
    sections.push(`性能分析: ${analysisResults.performanceAnalysis ? '✓' : '✗'}`);
    sections.push(`安全审计: ${analysisResults.securityAudit ? '✓' : '✗'}`);
    sections.push(`编码规范: ${analysisResults.standardsCheck ? '✓' : '✗'}`);
    sections.push(`优化建议: ${analysisResults.optimizationSuggestions ? '✓' : '✗'}`);
    sections.push("");

    // 性能分析详情
    if (analysisResults.performanceAnalysis?.data) {
      const perf = analysisResults.performanceAnalysis.data;
      sections.push("=== 性能分析详情 ===");
      sections.push(`评分: ${perf.performanceScore || '未知'}`);
      sections.push(`复杂度: ${perf.complexityLevel || '未知'}`);
      sections.push(`瓶颈数量: ${perf.bottlenecks?.length || 0}`);
      
      if (perf.bottlenecks?.length > 0) {
        sections.push("主要瓶颈:");
        perf.bottlenecks.slice(0, 3).forEach((b, i) => {
          sections.push(`  ${i + 1}. [${b.severity || '未知'}] ${b.description || '未知'}`);
        });
      }
      sections.push("");
    }

    // 安全审计详情
    if (analysisResults.securityAudit?.data) {
      const sec = analysisResults.securityAudit.data;
      sections.push("=== 安全审计详情 ===");
      sections.push(`评分: ${sec.securityScore || '未知'}`);
      sections.push(`风险等级: ${sec.riskLevel || '未知'}`);
      sections.push(`漏洞数量: ${sec.vulnerabilities?.length || 0}`);
      
      if (sec.vulnerabilities?.length > 0) {
        sections.push("主要漏洞:");
        sec.vulnerabilities.slice(0, 3).forEach((v, i) => {
          sections.push(`  ${i + 1}. [${v.severity || '未知'}] ${v.description || '未知'}`);
        });
      }
      sections.push("");
    }

    // 编码规范检查详情
    if (analysisResults.standardsCheck?.data) {
      const std = analysisResults.standardsCheck.data;
      sections.push("=== 编码规范详情 ===");
      sections.push(`评分: ${std.standardsScore || '未知'}`);
      sections.push(`合规等级: ${std.complianceLevel || '未知'}`);
      sections.push(`违规数量: ${std.violations?.length || 0}`);
      
      if (std.violations?.length > 0) {
        sections.push("主要违规:");
        std.violations.slice(0, 3).forEach((v, i) => {
          sections.push(`  ${i + 1}. [${v.severity || '未知'}] ${v.description || '未知'}`);
        });
      }
      sections.push("");
    }

    return sections.join('\n');
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
    
    const sections = [];
    
    // 标题和元信息
    sections.push(`# ${databaseType} 数据库规则学习结果\n`);
    sections.push(`**生成时间**: ${timestamp}\n`);
    
    // 原始SQL查询
    sections.push(`## 原始SQL查询\n`);
    sections.push(`\`\`\`sql\n${sqlQuery}\n\`\`\`\n`);
    
    // 性能问题分析
    if (analysisResults.performanceAnalysis?.data) {
      sections.push(this.formatPerformanceSection(analysisResults.performanceAnalysis.data));
    }
    
    // 安全问题分析
    if (analysisResults.securityAudit?.data) {
      sections.push(this.formatSecuritySection(analysisResults.securityAudit.data));
    }
    
    // 编码规范问题分析
    if (analysisResults.standardsCheck?.data) {
      sections.push(this.formatStandardsSection(analysisResults.standardsCheck.data));
    }
    
    // 学习到的规则
    if (rules.learnedRules?.length > 0) {
      sections.push(this.formatLearnedRules(rules.learnedRules));
    }
    
    // 识别的模式
    if (rules.patterns?.length > 0) {
      sections.push(this.formatPatterns(rules.patterns));
    }
    
    // 识别的反模式
    if (rules.antiPatterns?.length > 0) {
      sections.push(this.formatAntiPatterns(rules.antiPatterns));
    }
    
    // 最佳实践
    if (rules.bestPractices?.length > 0) {
      sections.push(this.formatBestPractices(rules.bestPractices));
    }
    
    return sections.join('\n');
  }

  /**
   * 格式化性能分析部分
   */
  formatPerformanceSection(perf) {
    const lines = [];
    lines.push(`## 性能问题分析\n`);
    lines.push(`- **性能评分**: ${perf.performanceScore || '未知'}`);
    lines.push(`- **复杂度级别**: ${perf.complexityLevel || '未知'}`);
    lines.push(`- **预估执行时间**: ${perf.estimatedExecutionTime || '未知'}`);
    lines.push(`- **资源使用**: ${perf.resourceUsage || '未知'}\n`);
    
    if (perf.bottlenecks?.length > 0) {
      lines.push(`### 性能瓶颈\n`);
      perf.bottlenecks.forEach((bottleneck, index) => {
        lines.push(`${index + 1}. ${bottleneck.description}`);
        lines.push(`   - **严重程度**: ${bottleneck.severity || '未知'}`);
        if (bottleneck.recommendation) {
          lines.push(`   - **建议**: ${bottleneck.recommendation}`);
        }
        lines.push('');
      });
    }
    
    return lines.join('\n');
  }

  /**
   * 格式化安全审计部分
   */
  formatSecuritySection(security) {
    const lines = [];
    lines.push(`## 安全问题分析\n`);
    lines.push(`- **安全评分**: ${security.securityScore || '未知'}`);
    lines.push(`- **风险等级**: ${security.riskLevel || '未知'}\n`);
    
    if (security.vulnerabilities?.length > 0) {
      lines.push(`### 安全漏洞\n`);
      security.vulnerabilities.forEach((vuln, index) => {
        lines.push(`${index + 1}. ${vuln.description}`);
        lines.push(`   - **严重程度**: ${vuln.severity || '未知'}`);
        if (vuln.recommendation) {
          lines.push(`   - **建议**: ${vuln.recommendation}`);
        }
        lines.push('');
      });
    }
    
    return lines.join('\n');
  }

  /**
   * 格式化编码规范部分
   */
  formatStandardsSection(standards) {
    const lines = [];
    lines.push(`## 编码规范问题分析\n`);
    lines.push(`- **规范评分**: ${standards.standardsScore || '未知'}`);
    lines.push(`- **合规等级**: ${standards.complianceLevel || '未知'}\n`);
    
    if (standards.violations?.length > 0) {
      lines.push(`### 规范违规\n`);
      standards.violations.forEach((violation, index) => {
        lines.push(`${index + 1}. ${violation.description}`);
        lines.push(`   - **严重程度**: ${violation.severity || '未知'}`);
        if (violation.recommendation) {
          lines.push(`   - **建议**: ${violation.recommendation}`);
        }
        lines.push('');
      });
    }
    
    return lines.join('\n');
  }

  /**
   * 格式化学习到的规则
   */
  formatLearnedRules(rules) {
    const lines = [];
    lines.push(`## 学习到的规则\n`);
    
    rules.forEach((rule, index) => {
      lines.push(`### ${index + 1}. ${rule.title}\n`);
      lines.push(`- **类别**: ${rule.category}`);
      lines.push(`- **类型**: ${rule.type}`);
      lines.push(`- **描述**: ${rule.description}`);
      lines.push(`- **触发条件**: ${rule.condition}`);
      lines.push(`- **严重程度**: ${rule.severity}`);
      lines.push(`- **置信度**: ${rule.confidence}\n`);
      
      if (rule.example) {
        lines.push(`**示例**:\n\`\`\`sql\n${rule.example}\n\`\`\`\n`);
      }
    });
    
    return lines.join('\n');
  }

  /**
   * 格式化识别的模式
   */
  formatPatterns(patterns) {
    const lines = [];
    lines.push(`## 识别的模式\n`);
    
    patterns.forEach((pattern, index) => {
      lines.push(`### ${index + 1}. ${pattern.name}\n`);
      lines.push(`- **类别**: ${pattern.category}`);
      lines.push(`- **描述**: ${pattern.description}`);
      lines.push(`- **出现频率**: ${pattern.frequency}\n`);
      
      if (pattern.example) {
        lines.push(`**示例**:\n\`\`\`sql\n${pattern.example}\n\`\`\`\n`);
      }
    });
    
    return lines.join('\n');
  }

  /**
   * 格式化识别的反模式
   */
  formatAntiPatterns(antiPatterns) {
    const lines = [];
    lines.push(`## 识别的反模式\n`);
    
    antiPatterns.forEach((antiPattern, index) => {
      lines.push(`### ${index + 1}. ${antiPattern.name}\n`);
      lines.push(`- **类别**: ${antiPattern.category}`);
      lines.push(`- **描述**: ${antiPattern.description}`);
      lines.push(`- **后果**: ${antiPattern.consequence}`);
      lines.push(`- **替代方案**: ${antiPattern.alternative}\n`);
      
      if (antiPattern.example) {
        lines.push(`**示例**:\n\`\`\`sql\n${antiPattern.example}\n\`\`\`\n`);
      }
    });
    
    return lines.join('\n');
  }

  /**
   * 格式化最佳实践
   */
  formatBestPractices(bestPractices) {
    const lines = [];
    lines.push(`## 最佳实践\n`);
    
    bestPractices.forEach((practice, index) => {
      lines.push(`### ${index + 1}. ${practice.name}\n`);
      lines.push(`- **类别**: ${practice.category}`);
      lines.push(`- **描述**: ${practice.description}`);
      lines.push(`- **好处**: ${practice.benefit}\n`);
      
      if (practice.example) {
        lines.push(`**示例**:\n\`\`\`sql\n${practice.example}\n\`\`\`\n`);
      }
    });
    
    return lines.join('\n');
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
      await this.ensureRulesDirectory();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const mdFileName = `rules-${timestamp}.md`;
      const mdFilePath = path.join(this.rulesDirectory, mdFileName);
      
      const mdContent = this.convertRulesToMarkdown(
        rules, 
        databaseType, 
        sqlQuery, 
        analysisResults
      );
      
      await fs.writeFile(mdFilePath, mdContent, 'utf8');
      
      return { mdFilePath };
    } catch (error) {
      console.error("保存规则失败:", error);
      throw error;
    }
  }


  /**
   * 评估规则文件质量
   * @param {Object} input - 输入参数
   * @param {string} input.filePath - 规则文件路径
   * @param {string} input.content - 规则文件内容
   * @returns {Promise<Object>} 评估结果
   */
  async evaluateRuleQuality(input) {
    await this.initialize();
    
    const { filePath, content } = input;
    
    try {
      // 使用提示词模板
      const { systemPrompt, userPrompt } = await buildPrompt(
        'rule-evaluation.md',
        {
          filePath,
          fileContent: content
        }
      );
      
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
      ];

      // 调用LLM
      const response = await this.getLLM().invoke(messages);
      const result = JSONCleaner.parse(response.content);
      
      // 验证结果结构
      if (!result.qualityScore || typeof result.qualityScore !== 'number') {
        throw new Error('评估结果缺少质量分数');
      }
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return this.handleError('规则质量评估', error);
    }
  }

  /**
   * 将规则文件移动到指定目录
   * @param {string} sourcePath - 源文件路径
   * @param {string} targetType - 目标类型: 'approved', 'archived'
   * @returns {Promise<string>} 新文件路径
   */
  async moveRuleFile(sourcePath, targetType) {
    try {
      // 验证输入参数
      if (!sourcePath || typeof sourcePath !== 'string') {
        throw new Error('源文件路径无效');
      }
      
      if (!targetType || typeof targetType !== 'string') {
        throw new Error('目标类型无效');
      }
      
      // 确保目标目录存在
      await this.ensureRulesDirectory(targetType);
      
      const fileName = path.basename(sourcePath);
      const targetPath = path.join(this.rulesDirectory, fileName);
      
      // 移动文件
      await fs.rename(sourcePath, targetPath);
      
      console.log(`✅ 规则文件已移动: ${path.basename(sourcePath)} → ${targetType}/`);
      return targetPath;
    } catch (error) {
      console.error("移动规则文件失败:", error);
      throw error;
    }
  }

  /**
   * 批量移动规则文件
   * @param {Array} files - 文件信息数组 [{path, score}]
   * @param {number} threshold - 分数阈值
   * @returns {Promise<Object>} 移动结果统计
   */
  async batchMoveRules(files, threshold = 60) {
    const results = {
      approved: [],
      archived: [],
      failed: []
    };

    for (const file of files) {
      try {
        if (file.score >= threshold) {
          const newPath = await this.moveRuleFile(file.path, 'approved');
          results.approved.push({
            originalPath: file.path,
            newPath: newPath,
            score: file.score
          });
        } else {
          const newPath = await this.moveRuleFile(file.path, 'archived');
          results.archived.push({
            originalPath: file.path,
            newPath: newPath,
            score: file.score
          });
        }
      } catch (error) {
        results.failed.push({
          path: file.path,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 获取指定类型的规则文件列表
   * @param {string} type - 目录类型: 'issues', 'approved', 'archived'
   * @returns {Promise<Array>} 文件路径数组
   */
  async getRuleFilesByType(type = 'issues') {
    const files = [];
    
    try {
      const typeDir = path.join(this.baseLearningRulesDirectory, type);
      
      // 检查目录是否存在
      try {
        await fs.access(typeDir);
      } catch (error) {
        return files; // 目录不存在，返回空数组
      }
      
      const timeDirs = await fs.readdir(typeDir);
      
      for (const timeDir of timeDirs) {
        const timeDirPath = path.join(typeDir, timeDir);
        const stat = await fs.stat(timeDirPath);
        
        if (stat.isDirectory()) {
          const dirFiles = await fs.readdir(timeDirPath);
          for (const file of dirFiles) {
            if (file.endsWith('.md')) {
              files.push(path.join(timeDirPath, file));
            }
          }
        }
      }
    } catch (error) {
      console.error(`读取${type}规则文件时出错:`, error);
    }
    
    return files;
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