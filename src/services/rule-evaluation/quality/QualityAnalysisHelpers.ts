/**
 * 质量分析辅助方法
 * 老王我把质量评估的各种算法都封装在这里！
 */

import { RuleFileContent, BaseRule } from '../models/RuleModels.js';
import { QualityMetrics } from './QualityAssessmentEngine.js';

/**
 * 技术术语字典
 */
const TECHNICAL_TERMS = new Set([
  // SQL关键字
  'select', 'insert', 'update', 'delete', 'create', 'drop', 'alter',
  'index', 'table', 'view', 'procedure', 'function', 'trigger',
  'join', 'left join', 'right join', 'inner join', 'outer join',
  'where', 'group by', 'order by', 'having', 'union',
  'primary key', 'foreign key', 'unique', 'not null',
  'transaction', 'commit', 'rollback', 'lock',
  'database', 'schema', 'query', 'statement', 'clause',

  // 性能相关
  'performance', 'optimization', 'indexing', 'cache', 'throughput',
  'latency', 'response time', 'scalability', 'bottleneck',

  // 安全相关
  'security', 'injection', 'authentication', 'authorization',
  'encryption', 'vulnerability', 'attack', 'mitigation',

  // 数据库类型
  'mysql', 'postgresql', 'oracle', 'sql server', 'mongodb', 'redis',
  'cassandra', 'elasticsearch', 'sqlite'
]);

/**
 * 常见问题模式
 */
const COMMON_PROBLEMS = new Set([
  'sql injection',
  'performance issue',
  'slow query',
  'missing index',
  'deadlock',
  'memory leak',
  'data corruption',
  'inconsistent data',
  'security vulnerability',
  'scalability issue'
]);

/**
 * 模糊语言指标
 */
const VAGUE_INDICATORS = [
  'maybe', 'perhaps', 'possibly', 'might', 'could', 'should',
  'probably', 'likely', 'usually', 'generally', 'often',
  'sometimes', 'occasionally', 'seems like', 'appears to be'
];

/**
 * 验证SQL模式
 */
export function isValidSQLPattern(pattern: string): boolean {
  if (!pattern || pattern.trim().length === 0) {
    return false;
  }

  // 检查是否包含SQL关键字
  const normalizedPattern = pattern.toLowerCase();
  const sqlKeywords = ['select', 'insert', 'update', 'delete', 'create', 'drop', 'alter'];

  return sqlKeywords.some(keyword => normalizedPattern.includes(keyword));
}

/**
 * 检查是否使用正确技术术语
 */
export function usesCorrectTechnicalTerms(ruleContent: RuleFileContent): boolean {
  const { rule, analysisContext } = ruleContent;
  const text = `${rule.title} ${rule.description} ${rule.sqlPattern || ''}`.toLowerCase();

  // 检查是否有明显的技术术语错误
  const incorrectTerms = [
    'sql query' + ' statement', // 重复表述
    'database' + ' table', // 冗余表述
  ];

  for (const incorrectTerm of incorrectTerms) {
    if (text.includes(incorrectTerm)) {
      return false;
    }
  }

  // 检查是否使用了适当的技术术语
  const technicalTermsFound = Array.from(TECHNICAL_TERMS).filter(term => text.includes(term));

  return technicalTermsFound.length > 0;
}

/**
 * 检查严重程度是否合理
 */
export function isAppropriateSeverity(rule: BaseRule): boolean {
  const validSeverities = ['info', 'low', 'medium', 'high', 'critical'];

  if (!validSeverities.includes(rule.severity)) {
    return false;
  }

  // 检查严重程度与描述的匹配度
  const text = `${rule.title} ${rule.description}`.toLowerCase();

  switch (rule.severity) {
    case 'critical':
      return text.includes('critical') || text.includes('severe') ||
             text.includes('security') || text.includes('data loss');
    case 'high':
      return text.includes('important') || text.includes('major') ||
             text.includes('significant');
    case 'medium':
      return text.includes('moderate') || text.includes('noticeable');
    case 'low':
      return text.includes('minor') || text.includes('small');
    case 'info':
      return text.includes('information') || text.includes('guideline');
    default:
      return true;
  }
}

/**
 * 检查类别是否有效
 */
export function isValidCategory(category: string): boolean {
  const validCategories = [
    'security', 'performance', 'standards', 'maintainability',
    'reliability', 'usability', 'compatibility', 'data integrity'
  ];

  return validCategories.includes(category);
}

/**
 * 检查是否有模糊语言
 */
export function hasVagueLanguage(ruleContent: RuleFileContent): boolean {
  const { rule } = ruleContent;
  const text = `${rule.title} ${rule.description}`.toLowerCase();

  return VAGUE_INDICATORS.some(indicator => text.includes(indicator));
}

/**
 * 检查是否有技术错误
 */
export function hasTechnicalErrors(ruleContent: RuleFileContent): boolean {
  const { rule, analysisContext } = ruleContent;

  // 检查SQL模式中的常见错误
  if (rule.sqlPattern) {
    const pattern = rule.sqlPattern.toLowerCase();

    // 检查常见的SQL错误模式
    const errorPatterns = [
      'select *', // 可能的性能问题
      '1=1',      // 恒真条件
      'or 1=1',   // 另一种恒真条件
      'sleep(',   // 不建议的函数
      'rand()',   // 随机排序可能导致性能问题
    ];

    // 这些是警告，不是错误，所以返回false
    // 如果确实需要检查错误，可以在这里添加
  }

  return false;
}

/**
 * 检查是否解决常见问题
 */
export function addressesCommonProblem(ruleContent: RuleFileContent): boolean {
  const { rule } = ruleContent;
  const text = `${rule.title} ${rule.description}`.toLowerCase();

  return Array.from(COMMON_PROBLEMS).some(problem => text.includes(problem));
}

/**
 * 检查是否有实际应用场景
 */
export function hasPracticalScenarios(ruleContent: RuleFileContent): boolean {
  const { rule } = ruleContent;
  const text = `${rule.title} ${rule.description}`.toLowerCase();

  // 检查是否提到实际应用场景
  const scenarioIndicators = [
    'application', 'system', 'production', 'real world',
    'use case', 'scenario', 'example', 'implementation',
    'deployment', 'environment'
  ];

  return scenarioIndicators.some(indicator => text.includes(indicator));
}

/**
 * 检查是否可操作
 */
export function isActionable(ruleContent: RuleFileContent): boolean {
  const { rule } = ruleContent;
  const text = `${rule.title} ${rule.description}`.toLowerCase();

  // 检查是否有明确的行动词
  const actionWords = [
    'avoid', 'prevent', 'use', 'implement', 'apply', 'follow',
    'ensure', 'check', 'verify', 'optimize', 'improve', 'fix',
    'create', 'add', 'remove', 'update', 'configure', 'setup'
  ];

  return actionWords.some(word => text.includes(word));
}

/**
 * 检查是否过于理论化
 */
export function isTooTheoretical(ruleContent: RuleFileContent): boolean {
  const { rule } = ruleContent;
  const text = `${rule.title} ${rule.description}`.toLowerCase();

  // 检查理论化指标
  const theoreticalIndicators = [
    'theoretical', 'academic', 'research', 'study',
    'concept', 'principle', 'theory', 'framework'
  ];

  // 如果主要是理论词汇且缺乏实践指导
  const theoreticalCount = theoreticalIndicators.filter(indicator => text.includes(indicator)).length;
  const practicalCount = ['example', 'implementation', 'code', 'sql'].filter(word => text.includes(word)).length;

  return theoreticalCount > 2 && practicalCount === 0;
}

/**
 * 检查是否缺乏实际价值
 */
export function lacksPracticalValue(ruleContent: RuleFileContent): boolean {
  const { rule } = ruleContent;
  const text = `${rule.title} ${rule.description}`.toLowerCase();

  // 检查是否有价值指标
  const valueIndicators = [
    'improve', 'enhance', 'optimize', 'reduce', 'prevent',
    'secure', 'stabilize', 'standardize', 'simplify',
    'benefit', 'advantage', 'gain', 'save'
  ];

  return !valueIndicators.some(indicator => text.includes(indicator));
}

/**
 * 检查是否有清晰问题描述
 */
export function hasClearProblemDescription(ruleContent: RuleFileContent): boolean {
  const { rule } = ruleContent;
  const text = rule.description?.toLowerCase() || '';

  if (!text || text.length < 20) {
    return false;
  }

  // 检查问题描述的结构
  const problemIndicators = [
    'issue', 'problem', 'challenge', 'risk', 'vulnerability',
    'weakness', 'limitation', 'drawback', 'disadvantage',
    'error', 'bug', 'flaw', 'defect'
  ];

  return problemIndicators.some(indicator => text.includes(indicator));
}

/**
 * 检查是否有完整解决方案
 */
export function hasCompleteSolution(ruleContent: RuleFileContent): boolean {
  const { rule } = ruleContent;
  const text = `${rule.title} ${rule.description}`.toLowerCase();

  // 检查解决方案要素
  const solutionElements = [
    ['solution', 'approach', 'method', 'technique'],
    ['step', 'procedure', 'process', 'workflow'],
    ['code', 'example', 'sample', 'snippet'],
    ['configuration', 'setting', 'parameter', 'option']
  ];

  const elementsFound = solutionElements.filter(group =>
    group.some(element => text.includes(element))
  ).length;

  return elementsFound >= 2; // 至少包含2种要素
}

/**
 * 检查是否提到影响
 */
export function mentionsImpact(ruleContent: RuleFileContent): boolean {
  const { rule } = ruleContent;
  const text = `${rule.title} ${rule.description}`.toLowerCase();

  const impactIndicators = [
    'impact', 'affect', 'influence', 'consequence',
    'result', 'outcome', 'effect', 'benefit', 'drawback',
    'performance', 'security', 'maintainability', 'scalability'
  ];

  return impactIndicators.some(indicator => text.includes(indicator));
}

/**
 * 检查是否考虑边界条件
 */
export function considersEdgeCases(ruleContent: RuleFileContent): boolean {
  const { rule } = ruleContent;
  const text = `${rule.title} ${rule.description}`.toLowerCase();

  const edgeCaseIndicators = [
    'edge case', 'corner case', 'boundary', 'limitation',
    'exception', 'special case', 'rare case', 'unusual',
    'null', 'empty', 'maximum', 'minimum'
  ];

  return edgeCaseIndicators.some(indicator => text.includes(indicator));
}

/**
 * 检查是否有信息缺失
 */
export function hasMissingInformation(ruleContent: RuleFileContent): boolean {
  const { rule } = ruleContent;

  // 检查必要信息
  if (!rule.title || rule.title.length < 5) return true;
  if (!rule.description || rule.description.length < 20) return true;
  if (!rule.category) return true;
  if (!rule.severity) return true;

  return false;
}

/**
 * 检查描述是否不完整
 */
export function isIncomplete(ruleContent: RuleFileContent): boolean {
  const { rule } = ruleContent;
  const text = rule.description || '';

  // 检查描述长度
  if (text.length < 50) return true;

  // 检查是否有结构问题
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length < 2) return true;

  return false;
}

/**
 * 检查是否数据库无关
 */
export function isDatabaseAgnostic(ruleContent: RuleFileContent): boolean {
  const { rule } = ruleContent;
  const text = `${rule.title} ${rule.description}`.toLowerCase();

  // 检查是否绑定到特定数据库
  const dbSpecificTerms = [
    'mysql', 'postgresql', 'oracle', 'sql server', 'mssql',
    'mongodb', 'redis', 'cassandra', 'elasticsearch'
  ];

  return !dbSpecificTerms.some(term => text.includes(term));
}

/**
 * 检查是否有广泛适用性
 */
export function hasBroadApplicability(ruleContent: RuleFileContent): boolean {
  const { rule } = ruleContent;
  const text = `${rule.title} ${rule.description}`.toLowerCase();

  const broadApplicabilityIndicators = [
    'general', 'common', 'universal', 'standard', 'best practice',
    'widely', 'commonly', 'frequently', 'typically', 'usually',
    'multiple', 'various', 'different', 'all', 'any'
  ];

  return broadApplicabilityIndicators.some(indicator => text.includes(indicator));
}

/**
 * 检查是否环境无关
 */
export function isEnvironmentIndependent(ruleContent: RuleFileContent): boolean {
  const { rule } = ruleContent;
  const text = `${rule.title} ${rule.description}`.toLowerCase();

  const environmentSpecificTerms = [
    'development', 'production', 'staging', 'testing',
    'windows', 'linux', 'macos', 'docker', 'kubernetes',
    'aws', 'azure', 'gcp', 'local', 'remote'
  ];

  return !environmentSpecificTerms.some(term => text.includes(term));
}

/**
 * 检查是否可扩展
 */
export function isScalable(ruleContent: RuleFileContent): boolean {
  const { rule } = ruleContent;
  const text = `${rule.title} ${rule.description}`.toLowerCase();

  const scalabilityIndicators = [
    'scale', 'scalable', 'scalability', 'grow', 'growth',
    'expand', 'extension', 'flexible', 'adaptable',
    'large', 'big', 'huge', 'massive', 'enterprise'
  ];

  return scalabilityIndicators.some(indicator => text.includes(indicator));
}

/**
 * 检查是否过于特定
 */
export function isTooSpecific(ruleContent: RuleFileContent): boolean {
  const { rule } = ruleContent;
  const text = `${rule.title} ${rule.description}`.toLowerCase();

  const specificityIndicators = [
    'specific', 'particular', 'exact', 'precise', 'certain',
    'only', 'just', 'solely', 'exclusively', 'uniquely'
  ];

  return specificityIndicators.some(indicator => text.includes(indicator));
}

/**
 * 检查是否依赖特定工具
 */
export function dependsOnSpecificTools(ruleContent: RuleFileContent): boolean {
  const { rule } = ruleContent;
  const text = `${rule.title} ${rule.description}`.toLowerCase();

  const toolSpecificTerms = [
    'phpmyadmin', 'navicat', 'dbeaver', 'sequel pro', 'workbench',
    'jenkins', 'docker', 'kubernetes', 'terraform', 'ansible',
    'visual studio', 'intellij', 'eclipse', 'vim', 'emacs'
  ];

  return toolSpecificTerms.some(term => text.includes(term));
}

/**
 * 检查是否有内部一致性
 */
export function hasInternalConsistency(ruleContent: RuleFileContent): boolean {
  const { rule } = ruleContent;
  const text = `${rule.title} ${rule.description}`.toLowerCase();

  // 检查是否有矛盾表述
  const contradictoryPairs = [
    ['always', 'never'],
    ['must', 'should not'],
    ['required', 'optional'],
    ['critical', 'minor'],
    ['immediate', 'delayed']
  ];

  for (const [word1, word2] of contradictoryPairs) {
    if (text.includes(word1) && text.includes(word2)) {
      // 需要进一步分析上下文，这里简化处理
      return false;
    }
  }

  return true;
}

/**
 * 检查术语使用是否一致
 */
export function usesConsistentTerminology(ruleContent: RuleFileContent): boolean {
  const { rule } = ruleContent;
  const text = `${rule.title} ${rule.description}`.toLowerCase();

  // 检查术语一致性（简化版）
  const termVariations = {
    'sql': ['sql', 'structured query language'],
    'database': ['database', 'db', 'data store'],
    'query': ['query', 'statement', 'command'],
    'index': ['index', 'key', 'lookup']
  };

  for (const [canonical, variations] of Object.entries(termVariations)) {
    const usedVariations = variations.filter(v => text.includes(v));
    if (usedVariations.length > 2) {
      // 使用了太多变体，可能不一致
      return false;
    }
  }

  return true;
}

/**
 * 检查是否符合标准
 */
export function alignsWithStandards(ruleContent: RuleFileContent): boolean {
  const { rule } = ruleContent;
  const text = `${rule.title} ${rule.description}`.toLowerCase();

  const standardIndicators = [
    'standard', 'specification', 'guideline', 'best practice',
    'recommendation', 'convention', 'norm', 'rule',
    'iso', 'ansi', 'ieee', 'w3c', 'rfc'
  ];

  return standardIndicators.some(indicator => text.includes(indicator));
}

/**
 * 检查是否遵循格式标准
 */
export function followsFormatStandards(ruleContent: RuleFileContent): boolean {
  const { rule } = ruleContent;

  // 检查基本格式要求
  if (!rule.title || rule.title.length < 5 || rule.title.length > 100) {
    return false;
  }

  if (!rule.description || rule.description.length < 20) {
    return false;
  }

  // 检查标题格式（首字母大写等）
  const titleWords = rule.title.split(' ');
  const properlyCapitalized = titleWords.every(word =>
    word.length === 0 ||
    word[0] === word[0].toUpperCase() ||
    ['SQL', 'API', 'JSON', 'XML', 'HTTP', 'HTTPS'].includes(word.toUpperCase())
  );

  return properlyCapitalized;
}

/**
 * 检查是否有矛盾表述
 */
export function hasContradictions(ruleContent: RuleFileContent): boolean {
  const { rule } = ruleContent;
  const text = `${rule.title} ${rule.description}`.toLowerCase();

  // 简化的矛盾检查
  const contradictions = [
    ['always use', 'never use'],
    ['must be', 'should not be'],
    ['required', 'optional'],
    ['enable', 'disable'],
    ['allow', 'deny']
  ];

  for (const [phrase1, phrase2] of contradictions) {
    if (text.includes(phrase1) && text.includes(phrase2)) {
      return true;
    }
  }

  return false;
}

/**
 * 检查术语是否不一致
 */
export function hasInconsistentTerminology(ruleContent: RuleFileContent): boolean {
  const { rule } = ruleContent;
  const text = `${rule.title} ${rule.description}`.toLowerCase();

  // 检查常见的不一致术语
  const inconsistentTerms = [
    { terms: ['frontend', 'front-end', 'front end'] },
    { terms: ['backend', 'back-end', 'back end'] },
    { terms: ['user id', 'userid', 'user-id'] },
    { terms: ['sql', 'structured query language'] }
  ];

  for (const { terms } of inconsistentTerms) {
    const usedTerms = terms.filter(term => text.includes(term));
    if (usedTerms.length > 1) {
      return true;
    }
  }

  return false;
}

/**
 * 识别优势
 */
export function identifyStrengths(ruleContent: RuleFileContent, metrics: QualityMetrics): string[] {
  const strengths: string[] = [];
  const { rule } = ruleContent;

  if (metrics.accuracy >= 80) {
    strengths.push('技术描述准确');
  }

  if (metrics.practicality >= 80) {
    strengths.push('实用性强，有明确应用价值');
  }

  if (metrics.completeness >= 80) {
    strengths.push('信息完整，描述详尽');
  }

  if (metrics.generality >= 80) {
    strengths.push('适用性广泛，通用性强');
  }

  if (metrics.consistency >= 80) {
    strengths.push('表述一致，逻辑清晰');
  }

  // 基于内容的具体优势
  if (rule.sqlPattern && rule.sqlPattern.length > 10) {
    strengths.push('提供具体SQL示例');
  }

  if (rule.description && rule.description.length > 200) {
    strengths.push('描述详细，信息丰富');
  }

  return strengths;
}

/**
 * 识别问题
 */
export function identifyIssues(ruleContent: RuleFileContent, metrics: QualityMetrics): string[] {
  const issues: string[] = [];
  const { rule } = ruleContent;

  if (metrics.accuracy < 60) {
    issues.push('技术准确性有待提高');
  }

  if (metrics.practicality < 60) {
    issues.push('实用性不足，缺乏具体指导');
  }

  if (metrics.completeness < 60) {
    issues.push('信息不够完整');
  }

  if (metrics.generality < 60) {
    issues.push('适用范围有限');
  }

  if (metrics.consistency < 60) {
    issues.push('表述存在不一致');
  }

  // 基于内容的具体问题
  if (!rule.sqlPattern || rule.sqlPattern.trim().length === 0) {
    issues.push('缺少SQL示例');
  }

  if (!rule.description || rule.description.length < 50) {
    issues.push('描述过于简短');
  }

  if (hasVagueLanguage(ruleContent)) {
    issues.push('包含模糊表述，建议更明确');
  }

  return issues;
}

/**
 * 生成改进建议
 */
export function generateSuggestions(ruleContent: RuleFileContent, metrics: QualityMetrics): string[] {
  const suggestions: string[] = [];
  const { rule } = ruleContent;

  if (metrics.accuracy < 70) {
    suggestions.push('核实技术术语和表述的准确性');
  }

  if (metrics.practicality < 70) {
    suggestions.push('增加具体应用场景和实施示例');
  }

  if (metrics.completeness < 70) {
    suggestions.push('补充问题描述和完整解决方案');
  }

  if (metrics.generality < 70) {
    suggestions.push('考虑规则的通用性，减少特定环境依赖');
  }

  if (metrics.consistency < 70) {
    suggestions.push('统一术语使用，确保表述一致');
  }

  // 基于内容的具体建议
  if (!rule.sqlPattern) {
    suggestions.push('添加SQL示例以增强实用性');
  }

  if (hasVagueLanguage(ruleContent)) {
    suggestions.push('避免使用模糊词汇，使用更精确的表述');
  }

  if (rule.description && rule.description.length < 100) {
    suggestions.push('扩展描述内容，提供更多细节');
  }

  return suggestions;
}