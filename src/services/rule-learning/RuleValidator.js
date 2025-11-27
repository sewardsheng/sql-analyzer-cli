/**
 * 统一规则验证器
 * 消除QualityEvaluator和AutoApprover中的验证逻辑冗余
 */

import { getValidationConfig, updateValidationConfig } from '../../config/ConfigAdapters.js';

/**
 * 规则验证器类
 */
export class RuleValidator {
  constructor() {
    // 使用统一配置管理器
    this.validationConfig = getValidationConfig();
  }

  /**
   * 执行基础验证 - 用于QualityEvaluator
   * @param {Object} rule - 规则对象
   * @returns {Object} 验证结果
   */
  performBasicValidation(rule) {
    const issues = [];
    let score = 100;

    try {
      // 1. 检查必需字段
      const missingFields = this.checkRequiredFields(rule, this.validationConfig.requiredFields.basic);
      if (missingFields.length > 0) {
        issues.push(`缺少必需字段: ${missingFields.join(', ')}`);
        score -= missingFields.length * 20;
      }

      // 2. 检查字段长度
      const lengthIssues = this.validateFieldLengths(rule, this.validationConfig.fieldLengths);
      issues.push(...lengthIssues.issues);
      score -= lengthIssues.penalty;

      // 3. 检查数值范围
      const rangeIssues = this.validateRanges(rule, this.validationConfig.ranges);
      issues.push(...rangeIssues.issues);
      score -= rangeIssues.penalty;

      // 4. 检查有效值
      const valueIssues = this.validateValues(rule, this.validationConfig.validValues);
      issues.push(...valueIssues.issues);
      score -= valueIssues.penalty;

      // 5. 检查示例和触发条件
      if (!rule.example || rule.example.trim() === '') {
        issues.push('缺少示例代码');
        score -= 10;
      }

      if (!rule.condition || rule.condition.trim() === '') {
        issues.push('缺少触发条件');
        score -= 10;
      }

      score = Math.max(0, score);

      return {
        passed: issues.length === 0,
        score,
        issues,
        basicScore: score,
        validationType: 'basic'
      };
      
    } catch (error) {
      console.error(`[RuleValidator] 基础验证失败: ${error.message}`);
      return {
        passed: false,
        score: 0,
        issues: [`验证过程出错: ${error.message}`],
        basicScore: 0,
        validationType: 'basic'
      };
    }
  }

  /**
   * 执行完整性验证 - 用于AutoApprover
   * @param {Object} rule - 规则对象
   * @returns {Object} 验证结果
   */
  performCompletenessValidation(rule) {
    const issues = [];
    let score = 100;

    try {
      // 1. 检查完整必需字段
      const missingFields = this.checkRequiredFields(rule, this.validationConfig.requiredFields.complete);
      if (missingFields.length > 0) {
        issues.push(`缺少必需字段: ${missingFields.join(', ')}`);
        score -= missingFields.length * 15;
      }

      // 2. 严格的字段长度检查
      const strictLengthIssues = this.validateFieldLengthsStrict(rule);
      issues.push(...strictLengthIssues.issues);
      score -= strictLengthIssues.penalty;

      // 3. SQL示例验证
      const sqlValidation = this.validateSQLExample(rule.example);
      if (!sqlValidation.valid) {
        issues.push(sqlValidation.reason);
        score -= 15;
      }

      // 4. 置信度严格检查
      if (rule.confidence < 0.8) {
        issues.push(`置信度过低，需要 >= 0.8: ${rule.confidence}`);
        score -= 20;
      }

      score = Math.max(0, score);

      return {
        passed: issues.length === 0,
        score,
        issues,
        completenessScore: score,
        validationType: 'completeness',
        reason: issues.length > 0 ? issues.join('; ') : '验证通过'
      };
      
    } catch (error) {
      return {
        passed: false,
        score: 0,
        issues: [`完整性检查出错: ${error.message}`],
        completenessScore: 0,
        validationType: 'completeness',
        reason: `验证过程出错: ${error.message}`
      };
    }
  }

  /**
   * 检查必需字段
   * @param {Object} rule - 规则对象
   * @param {Array} requiredFields - 必需字段列表
   * @returns {Array} 缺失字段列表
   */
  checkRequiredFields(rule, requiredFields) {
    return requiredFields.filter(field => 
      !rule[field] || (typeof rule[field] === 'string' && rule[field].trim() === '')
    );
  }

  /**
   * 验证字段长度
   * @param {Object} rule - 规则对象
   * @param {Object} lengthConfig - 长度配置
   * @returns {Object} 验证结果
   */
  validateFieldLengths(rule, lengthConfig) {
    const issues = [];
    let penalty = 0;

    Object.entries(lengthConfig).forEach(([field, config]) => {
      if (rule[field] && rule[field].length < config.min) {
        issues.push(`${field}过短 (最少${config.min}字符)`);
        penalty += 10;
      }
    });

    return { issues, penalty };
  }

  /**
   * 严格的字段长度验证
   * @param {Object} rule - 规则对象
   * @returns {Object} 验证结果
   */
  validateFieldLengthsStrict(rule) {
    const issues = [];
    let penalty = 0;

    // 标题严格检查
    if (rule.title && rule.title.length < 10) {
      issues.push('规则标题过短 (建议最少10字符)');
      penalty += 10;
    }

    // 描述严格检查
    if (rule.description && rule.description.length < 30) {
      issues.push('规则描述过短 (建议最少30字符)');
      penalty += 10;
    }

    // 触发条件严格检查
    if (rule.condition && rule.condition.length < 15) {
      issues.push('触发条件描述过短 (建议最少15字符)');
      penalty += 10;
    }

    return { issues, penalty };
  }

  /**
   * 验证数值范围
   * @param {Object} rule - 规则对象
   * @param {Object} rangeConfig - 范围配置
   * @returns {Object} 验证结果
   */
  validateRanges(rule, rangeConfig) {
    const issues = [];
    let penalty = 0;

    Object.entries(rangeConfig).forEach(([field, config]) => {
      if (rule[field] !== undefined) {
        const value = parseFloat(rule[field]);
        
        if (isNaN(value)) {
          issues.push(`${field}不是有效数字`);
          penalty += 15;
        } else if (value < config.min || value > config.max) {
          issues.push(`${field}超出有效范围 [${config.min}, ${config.max}]`);
          penalty += 15;
        } else if (config.recommended && value < config.recommended) {
          issues.push(`${field}低于推荐值 ${config.recommended}`);
          penalty += 10;
        }
      }
    });

    return { issues, penalty };
  }

  /**
   * 验证有效值
   * @param {Object} rule - 规则对象
   * @param {Object} validConfig - 有效值配置
   * @returns {Object} 验证结果
   */
  validateValues(rule, validConfig) {
    const issues = [];
    let penalty = 0;

    Object.entries(validConfig).forEach(([field, validValues]) => {
      if (rule[field] && !validValues.includes(rule[field])) {
        issues.push(`无效的${field}: ${rule[field]} (有效值: ${validValues.join(', ')})`);
        penalty += 15;
      }
    });

    return { issues, penalty };
  }

  /**
   * 验证SQL示例
   * @param {string} example - SQL示例
   * @returns {Object} 验证结果
   */
  validateSQLExample(example) {
    if (!example || typeof example !== 'string') {
      return { valid: false, reason: '示例SQL为空或不是字符串' };
    }

    const trimmed = example.trim();
    
    // 基本SQL关键字检查
    const hasSQLKeyword = this.validationConfig.sqlKeywords.some(keyword => 
      trimmed.toUpperCase().includes(keyword)
    );

    if (!hasSQLKeyword) {
      return { valid: false, reason: '示例SQL不包含有效的SQL关键字' };
    }

    // 检查是否包含明显的占位符（这是好的）
    const hasPlaceholders = /\{[^}]+\}|\$\d+|:\w+/.test(trimmed);
    
    return { valid: true, reason: 'SQL示例有效' };
  }

  /**
   * 检查安全规则的特殊要求
   * @param {Object} rule - 规则对象
   * @returns {Object} 检查结果
   */
  validateSecurityRule(rule) {
    if (rule.category !== 'security') {
      return { valid: true, reason: '非安全规则，跳过安全验证' };
    }

    const validSecuritySeverities = ['critical', 'high'];
    if (!validSecuritySeverities.includes(rule.severity)) {
      return { 
        valid: false, 
        reason: `安全规则严重程度必须为critical或high，当前为: ${rule.severity}` 
      };
    }

    return { valid: true, reason: '安全规则验证通过' };
  }

  /**
   * 综合验证 - 结合基础验证和完整性验证
   * @param {Object} rule - 规则对象
   * @param {string} validationLevel - 验证级别: 'basic' | 'complete' | 'strict'
   * @returns {Object} 综合验证结果
   */
  validate(rule, validationLevel = 'basic') {
    switch (validationLevel) {
      case 'basic':
        return this.performBasicValidation(rule);
      
      case 'complete':
        const basicResult = this.performBasicValidation(rule);
        const completeResult = this.performCompletenessValidation(rule);
        
        return {
          ...basicResult,
          ...completeResult,
          validationType: 'combined',
          combinedScore: Math.round((basicResult.score + completeResult.score) / 2),
          passed: basicResult.passed && completeResult.passed,
          allIssues: [...basicResult.issues, ...completeResult.issues]
        };
      
      case 'strict':
        const strictBasic = this.performBasicValidation(rule);
        const strictComplete = this.performCompletenessValidation(rule);
        const securityValidation = this.validateSecurityRule(rule);
        
        return {
          ...strictBasic,
          ...strictComplete,
          securityValidation,
          validationType: 'strict',
          combinedScore: Math.round((strictBasic.score + strictComplete.score) / 2),
          passed: strictBasic.passed && strictComplete.passed && securityValidation.valid,
          allIssues: [
            ...strictBasic.issues, 
            ...strictComplete.issues,
            ...(securityValidation.valid ? [] : [securityValidation.reason])
          ]
        };
      
      default:
        throw new Error(`未知的验证级别: ${validationLevel}`);
    }
  }

  /**
   * 批量验证
   * @param {Array} rules - 规则数组
   * @param {string} validationLevel - 验证级别
   * @returns {Array} 验证结果数组
   */
  validateBatch(rules, validationLevel = 'basic') {
    return rules.map(rule => ({
      rule,
      validation: this.validate(rule, validationLevel)
    }));
  }

  /**
   * 获取验证统计
   * @param {Array} validationResults - 验证结果数组
   * @returns {Object} 统计信息
   */
  getValidationStats(validationResults) {
    const stats = {
      total: validationResults.length,
      passed: 0,
      failed: 0,
      averageScore: 0,
      commonIssues: {},
      validationType: validationResults[0]?.validation?.validationType || 'unknown'
    };

    let totalScore = 0;

    validationResults.forEach(result => {
      const validation = result.validation;
      
      if (validation.passed) {
        stats.passed++;
      } else {
        stats.failed++;
      }

      totalScore += validation.score || validation.combinedScore || 0;

      // 统计常见问题
      const issues = validation.allIssues || validation.issues || [];
      issues.forEach(issue => {
        stats.commonIssues[issue] = (stats.commonIssues[issue] || 0) + 1;
      });
    });

    stats.averageScore = stats.total > 0 ? Math.round(totalScore / stats.total) : 0;
    stats.passRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;

    return stats;
  }

  /**
   * 更新验证配置
   * @param {Object} newConfig - 新配置
   */
  updateConfig(newConfig) {
    updateValidationConfig(newConfig);
    this.validationConfig = getValidationConfig();
    console.log(`[RuleValidator] 验证配置已更新`);
  }

  /**
   * 深度合并配置
   * @param {Object} target - 目标配置
   * @param {Object} source - 源配置
   * @returns {Object} 合并后的配置
   */
  mergeConfig(target, source) {
    const result = { ...target };
    
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeConfig(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    });
    
    return result;
  }

  /**
   * 获取当前配置
   * @returns {Object} 当前验证配置
   */
  getConfig() {
    return getValidationConfig();
  }
}

export default RuleValidator;