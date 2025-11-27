/**
 * 自动审批器
 * 负责自动审批高质量规则并移动到approved目录
 */

import fs from 'fs/promises';
import path from 'path';
import { RuleValidator } from './rule-validator.js';
import { unifiedConfigManager } from '../../config/config-manager.js';

/**
 * 自动审批器类
 */
export class AutoApprover {
  constructor() {
    // 使用统一配置管理器
    this.config = unifiedConfigManager.getApprovalConfig();
    
    this.approvalStats = {
      totalProcessed: 0,
      autoApproved: 0,
      manualReview: 0,
      rejected: 0
    };
    
    this.validator = new RuleValidator();
  }

  /**
   * 处理规则审批
   * @param {Array} evaluatedRules - 已评估的规则数组
   * @returns {Promise<Array>} 自动审批的规则数组
   */
  async process(evaluatedRules) {
    try {
      console.log(`[AutoApprover] 开始处理 ${evaluatedRules.length} 条规则的审批...`);

      const approvedRules = [];
      const manualReviewRules = [];
      const rejectedRules = [];

      for (const rule of evaluatedRules) {
        const decision = await this.evaluateRuleForApproval(rule);
        
        switch (decision.action) {
          case 'approve':
            approvedRules.push(rule);
            break;
          case 'manual_review':
            manualReviewRules.push(rule);
            break;
          case 'reject':
            rejectedRules.push(rule);
            break;
        }
      }

      // 去重处理
      const deduplicatedApproved = await this.deduplicateRules(approvedRules);
      
      // 移动到approved目录
      const finalApproved = await this.moveToApproved(deduplicatedApproved);
      
      // 移动需要人工审核的规则到manual_review目录（如果存在）
      if (manualReviewRules.length > 0) {
        await this.moveToManualReview(manualReviewRules);
      }

      // 更新统计
      this.updateStats(evaluatedRules.length, finalApproved.length, manualReviewRules.length, rejectedRules.length);

      console.log(`[AutoApprover] 审批完成: 自动审批${finalApproved.length}条，人工审核${manualReviewRules.length}条，拒绝${rejectedRules.length}条`);
      
      return finalApproved;
      
    } catch (error) {
      console.error(`[AutoApprover] 规则审批处理失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 评估单个规则是否应该自动审批
   * @param {Object} rule - 规则对象
   * @returns {Promise<Object>} 审批决策
   */
  async evaluateRuleForApproval(rule) {
    try {
      const evaluation = rule.evaluation;
      
      // 1. 检查基础条件
      if (!evaluation.shouldKeep) {
        return { action: 'reject', reason: '评估结果不建议保留' };
      }

      // 2. 检查质量分数
      if (evaluation.qualityScore < this.config.minQualityScore) {
        return { action: 'manual_review', reason: `质量分数过低: ${evaluation.qualityScore}` };
      }

      // 3. 检查置信度 - 使用统一配置
      const confidenceThreshold = this.config.completenessConfidenceThreshold || this.config.autoApproveThreshold;
      if (rule.confidence < confidenceThreshold) {
        return { action: 'manual_review', reason: `置信度过低: ${rule.confidence}` };
      }

      // 4. 检查基础验证问题
      if (evaluation.basicValidation?.issues?.length > 2) {
        return { action: 'manual_review', reason: '基础验证问题过多' };
      }

      // 5. 检查规则完整性 - 使用统一验证器
      const completenessCheck = this.validator.performCompletenessValidation(rule);
      if (!completenessCheck.passed) {
        return { action: 'manual_review', reason: completenessCheck.reason };
      }

      // 6. 检查安全相关规则的严格性 - 使用统一验证器
      const securityValidation = this.validator.validateSecurityRule(rule);
      if (!securityValidation.valid) {
        return { action: 'manual_review', reason: securityValidation.reason };
      }

      // 7. 检查是否与现有规则重复
      const isDuplicate = await this.checkDuplicate(rule);
      if (isDuplicate) {
        return { action: 'reject', reason: '与现有规则重复' };
      }

      // 8. 通过所有检查，自动审批
      return { action: 'approve', reason: '满足自动审批条件' };
      
    } catch (error) {
      console.error(`[AutoApprover] 规则审批评估失败: ${error.message}`);
      return { action: 'manual_review', reason: '评估过程出错' };
    }
  }


  /**
   * 检查规则是否与现有规则重复
   * @param {Object} rule - 规则对象
   * @returns {Promise<boolean>} 是否重复
   */
  async checkDuplicate(rule) {
    try {
      const approvedDir = path.join(process.cwd(), 'rules', 'learning-rules', 'approved');
      
      // 检查approved目录是否存在
      try {
        await fs.access(approvedDir);
      } catch {
        return false; // 目录不存在，不可能有重复
      }

      // 读取所有已审批的规则文件
      const existingRules = await this.loadExistingRules(approvedDir);
      
      // 计算相似度
      for (const existingRule of existingRules) {
        const similarity = this.calculateRuleSimilarity(rule, existingRule);
        if (similarity >= this.config.duplicateThreshold) {
          console.log(`[AutoApprover] 发现重复规则: ${rule.title} 与 ${existingRule.title} 相似度 ${similarity}`);
          return true;
        }
      }

      return false;
      
    } catch (error) {
      console.warn(`[AutoApprover] 重复检查失败: ${error.message}`);
      return false; // 出错时不拒绝
    }
  }

  /**
   * 加载现有规则
   * @param {string} approvedDir - approved目录路径
   * @returns {Promise<Array>} 现有规则数组
   */
  async loadExistingRules(approvedDir) {
    const existingRules = [];
    
    try {
      const monthDirs = await fs.readdir(approvedDir);
      
      for (const monthDir of monthDirs) {
        const monthPath = path.join(approvedDir, monthDir);
        const stat = await fs.stat(monthPath);
        
        if (stat.isDirectory()) {
          const files = await fs.readdir(monthPath);
          
          for (const file of files) {
            if (file.endsWith('.md')) {
              try {
                const filePath = path.join(monthPath, file);
                const content = await fs.readFile(filePath, 'utf8');
                const rule = this.parseRuleFromFile(content);
                if (rule) {
                  existingRules.push(rule);
                }
              } catch (error) {
                console.warn(`[AutoApprover] 读取规则文件失败 ${file}: ${error.message}`);
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn(`[AutoApprover] 加载现有规则失败: ${error.message}`);
    }
    
    return existingRules;
  }

  /**
   * 从文件内容解析规则
   * @param {string} content - 文件内容
   * @returns {Object|null} 解析的规则对象
   */
  parseRuleFromFile(content) {
    try {
      // 简单的规则解析逻辑
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const categoryMatch = content.match(/\*\*规则类别\*\*:\s*(.+)$/m);
      const typeMatch = content.match(/\*\*类型\*\*:\s*(.+)$/m);
      const descriptionMatch = content.match(/\*\*描述\*\*:\s*(.+)$/m);
      
      if (!titleMatch || !categoryMatch || !typeMatch || !descriptionMatch) {
        return null;
      }

      return {
        title: titleMatch[1].trim(),
        category: categoryMatch[1].trim(),
        type: typeMatch[1].trim(),
        description: descriptionMatch[1].trim()
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 计算规则相似度
   * @param {Object} rule1 - 规则1
   * @param {Object} rule2 - 规则2
   * @returns {number} 相似度 (0-1)
   */
  calculateRuleSimilarity(rule1, rule2) {
    try {
      let similarity = 0;
      let factors = 0;

      // 标题相似度
      if (rule1.title && rule2.title) {
        const titleSim = this.calculateStringSimilarity(rule1.title, rule2.title);
        similarity += titleSim * 0.4;
        factors += 0.4;
      }

      // 描述相似度
      if (rule1.description && rule2.description) {
        const descSim = this.calculateStringSimilarity(rule1.description, rule2.description);
        similarity += descSim * 0.3;
        factors += 0.3;
      }

      // 类别匹配
      if (rule1.category && rule2.category) {
        const categoryMatch = rule1.category === rule2.category ? 1 : 0;
        similarity += categoryMatch * 0.2;
        factors += 0.2;
      }

      // 类型匹配
      if (rule1.type && rule2.type) {
        const typeMatch = rule1.type === rule2.type ? 1 : 0;
        similarity += typeMatch * 0.1;
        factors += 0.1;
      }

      return factors > 0 ? similarity / factors : 0;
      
    } catch (error) {
      console.warn(`[AutoApprover] 相似度计算失败: ${error.message}`);
      return 0;
    }
  }

  /**
   * 计算字符串相似度
   * @param {string} str1 - 字符串1
   * @param {string} str2 - 字符串2
   * @returns {number} 相似度 (0-1)
   */
  calculateStringSimilarity(str1, str2) {
    try {
      const s1 = str1.toLowerCase().trim();
      const s2 = str2.toLowerCase().trim();
      
      if (s1 === s2) return 1;
      if (s1.length === 0 || s2.length === 0) return 0;

      // 简单的编辑距离算法
      const matrix = Array(s1.length + 1).fill(null).map(() => Array(s2.length + 1).fill(null));
      
      for (let i = 0; i <= s1.length; i++) {
        matrix[i][0] = i;
      }
      
      for (let j = 0; j <= s2.length; j++) {
        matrix[0][j] = j;
      }

      for (let i = 1; i <= s1.length; i++) {
        for (let j = 1; j <= s2.length; j++) {
          const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,     // deletion
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j - 1] + cost // substitution
          );
        }
      }

      const distance = matrix[s1.length][s2.length];
      const maxLength = Math.max(s1.length, s2.length);
      
      return 1 - (distance / maxLength);
      
    } catch (error) {
      return 0;
    }
  }

  /**
   * 规则去重
   * @param {Array} rules - 规则数组
   * @returns {Promise<Array>} 去重后的规则数组
   */
  async deduplicateRules(rules) {
    try {
      const deduplicated = [];
      const seen = new Set();

      for (const rule of rules) {
        // 生成唯一标识
        const identifier = `${rule.category}-${rule.type}-${rule.title}`;
        
        if (!seen.has(identifier)) {
          seen.add(identifier);
          deduplicated.push(rule);
        } else {
          console.log(`[AutoApprover] 去重: 移除重复规则 ${rule.title}`);
        }
      }

      console.log(`[AutoApprover] 去重完成: ${rules.length} -> ${deduplicated.length}`);
      return deduplicated;
      
    } catch (error) {
      console.error(`[AutoApprover] 去重失败: ${error.message}`);
      return rules;
    }
  }

  /**
   * 移动规则到approved目录
   * @param {Array} rules - 规则数组
   * @returns {Promise<Array>} 成功移动的规则数组
   */
  async moveToApproved(rules) {
    try {
      const approvedDir = path.join(process.cwd(), 'rules', 'learning-rules', 'approved');
      const monthDir = path.join(approvedDir, new Date().toISOString().substring(0, 7));
      
      // 确保目录存在
      await fs.mkdir(monthDir, { recursive: true });
      
      const movedRules = [];
      
      for (const rule of rules) {
        try {
          const fileName = this.generateRuleFileName(rule);
          const filePath = path.join(monthDir, fileName);
          
          // 构建规则文件内容
          const content = this.buildApprovedRuleContent(rule);
          
          // 写入文件
          await fs.writeFile(filePath, content, 'utf8');
          
          movedRules.push({
            ...rule,
            approvedPath: filePath,
            approvedAt: new Date().toISOString()
          });
          
          console.log(`[AutoApprover] 规则已审批: ${filePath}`);
          
        } catch (error) {
          console.error(`[AutoApprover] 移动规则失败 ${rule.title}: ${error.message}`);
        }
      }

      return movedRules;
      
    } catch (error) {
      console.error(`[AutoApprover] 移动到approved目录失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 移动规则到manual_review目录
   * @param {Array} rules - 规则数组
   */
  async moveToManualReview(rules) {
    try {
      const manualReviewDir = path.join(process.cwd(), 'rules', 'learning-rules', 'manual_review');
      const monthDir = path.join(manualReviewDir, new Date().toISOString().substring(0, 7));
      
      // 确保目录存在
      await fs.mkdir(monthDir, { recursive: true });
      
      for (const rule of rules) {
        try {
          const fileName = this.generateRuleFileName(rule);
          const filePath = path.join(monthDir, fileName);
          
          // 构建规则文件内容
          const content = this.buildManualReviewRuleContent(rule);
          
          // 写入文件
          await fs.writeFile(filePath, content, 'utf8');
          
          console.log(`[AutoApprover] 规则已移至人工审核: ${filePath}`);
          
        } catch (error) {
          console.error(`[AutoApprover] 移动到manual_review失败 ${rule.title}: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.error(`[AutoApprover] 移动到manual_review目录失败: ${error.message}`);
    }
  }

  /**
   * 生成规则文件名
   * @param {Object} rule - 规则对象
   * @returns {string} 文件名
   */
  generateRuleFileName(rule) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeTitle = rule.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-').substring(0, 50);
    return `${safeTitle}-${timestamp}.md`;
  }

  /**
   * 构建已审批规则内容
   * @param {Object} rule - 规则对象
   * @returns {string} 文件内容
   */
  buildApprovedRuleContent(rule) {
    const content = `# ${rule.title}

**自动审批时间**: ${new Date().toISOString()}
**规则类别**: ${rule.category}
**规则类型**: ${rule.type}
**严重程度**: ${rule.severity}
**置信度**: ${rule.confidence}

## 规则描述

${rule.description}

## 触发条件

${rule.condition}

## 示例代码

\`\`\`sql
${rule.example}
\`\`\`

## 质量评估

- **质量分数**: ${rule.evaluation.qualityScore}
- **质量等级**: ${rule.evaluation.qualityLevel}
- **评估摘要**: ${rule.evaluation.evaluationSummary}

### 评估维度

${rule.evaluation.llmEvaluation?.dimensionScores ? 
  Object.entries(rule.evaluation.llmEvaluation.dimensionScores)
    .map(([dimension, score]) => `- **${dimension}**: ${score}`)
    .join('\n') : '无详细维度评分'}

### 优势

${rule.evaluation.llmEvaluation?.strengths?.length > 0 ? 
  rule.evaluation.llmEvaluation.strengths.map(strength => `- ${strength}`).join('\n') : '无特别优势'}

### 改进建议

${rule.evaluation.llmEvaluation?.issues?.length > 0 ? 
  rule.evaluation.llmEvaluation.issues.map(issue => `- ${issue}`).join('\n') : '无改进建议'}

---

*此规则由智能规则学习器自动生成并审批*
`;

    return content;
  }

  /**
   * 构建人工审核规则内容
   * @param {Object} rule - 规则对象
   * @returns {string} 文件内容
   */
  buildManualReviewRuleContent(rule) {
    const content = `# ${rule.title}

**提交时间**: ${new Date().toISOString()}
**规则类别**: ${rule.category}
**规则类型**: ${rule.type}
**严重程度**: ${rule.severity}
**置信度**: ${rule.confidence}

## 规则描述

${rule.description}

## 触发条件

${rule.condition}

## 示例代码

\`\`\`sql
${rule.example}
\`\`\`

## 质量评估

- **质量分数**: ${rule.evaluation.qualityScore}
- **质量等级**: ${rule.evaluation.qualityLevel}
- **是否建议保留**: ${rule.evaluation.shouldKeep ? '是' : '否'}
- **评估摘要**: ${rule.evaluation.evaluationSummary}

## 需要人工审核的原因

${this.getManualReviewReasons(rule)}

## 审核建议

请审核以下方面：
1. 规则的准确性和实用性
2. 触发条件的合理性
3. 示例代码的正确性
4. 严重程度的适当性

---

*此规则由智能规则学习器生成，等待人工审核*
`;

    return content;
  }

  /**
   * 获取人工审核原因
   * @param {Object} rule - 规则对象
   * @returns {string} 审核原因
   */
  getManualReviewReasons(rule) {
    const reasons = [];
    
    if (rule.evaluation.qualityScore < this.config.minQualityScore) {
      reasons.push(`质量分数低于阈值 (${rule.evaluation.qualityScore} < ${this.config.minQualityScore})`);
    }
    
    if (rule.confidence < this.config.autoApproveThreshold) {
      reasons.push(`置信度低于阈值 (${rule.confidence} < ${this.config.autoApproveThreshold})`);
    }
    
    if (rule.evaluation.basicValidation?.issues?.length > 2) {
      reasons.push(`基础验证问题过多 (${rule.evaluation.basicValidation.issues.length}个)`);
    }
    
    if (rule.category === 'security' && rule.severity !== 'critical' && rule.severity !== 'high') {
      reasons.push('安全规则严重程度可能不足');
    }
    
    return reasons.length > 0 ? reasons.join('\n') : '其他原因需要人工审核';
  }

  /**
   * 更新统计信息
   * @param {number} total - 总数
   * @param {number} approved - 审批数
   * @param {number} manualReview - 人工审核数
   * @param {number} rejected - 拒绝数
   */
  updateStats(total, approved, manualReview, rejected) {
    this.approvalStats.totalProcessed += total;
    this.approvalStats.autoApproved += approved;
    this.approvalStats.manualReview += manualReview;
    this.approvalStats.rejected += rejected;
  }

  /**
   * 获取审批统计
   * @returns {Object} 统计信息
   */
  getApprovalStats() {
    return { ...this.approvalStats };
  }

  /**
   * 重置统计
   */
  resetStats() {
    this.approvalStats = {
      totalProcessed: 0,
      autoApproved: 0,
      manualReview: 0,
      rejected: 0
    };
    console.log(`[AutoApprover] 统计信息已重置`);
  }

  /**
   * 配置更新
   * @param {Object} newConfig - 新配置
   */
  updateConfig(newConfig) {
    unifiedConfigManager.updateApprovalConfig(newConfig);
    this.config = unifiedConfigManager.getApprovalConfig();
    console.log(`[AutoApprover] 配置已更新:`, this.config);
  }
}

export default AutoApprover;