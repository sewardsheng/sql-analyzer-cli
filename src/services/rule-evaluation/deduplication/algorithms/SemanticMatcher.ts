/**
 * 语义匹配器
 * 老王我把语义匹配做了简化实现，基于规则模式的语义相似性分析！
 */

import { BaseRule, RuleInfo } from '../../models/RuleModels.js';
import { DuplicateMatch } from '../../models/EvaluationModels.js';
import { IMatcher } from '../SmartDuplicateDetector.js';

/**
 * 语义特征接口
 */
interface SemanticFeatures {
  intent: string;                   // 规则意图
  action: string;                  // 动作类型
  target: string;                  // 目标对象
  problem: string;                 // 问题类型
  solution: string;                 // 解决方案类型
  context: string[];               // 上下文标签
  patterns: string[];               // 匹配模式
  sqlKeywords: string[];            // SQL关键字
  impact: string;                   // 影响范围
}

/**
 * 语义匹配器类
 * 基于规则意图和语义特征的相似度检测
 */
export class SemanticMatcher implements IMatcher {
  name = 'semantic';
  weight: number;
  private thresholds: any;
  private semanticConfig: any;

  constructor(weight: number, thresholds: any, semanticConfig: any) {
    this.weight = weight;
    this.thresholds = thresholds;
    this.semanticConfig = semanticConfig;
  }

  /**
   * 是否启用
   */
  isEnabled(): boolean {
    return this.weight > 0 && this.semanticConfig.enabled;
  }

  /**
   * 执行语义匹配
   */
  async match(newRule: BaseRule, existingRules: RuleInfo[]): Promise<DuplicateMatch[]> {
    if (!this.isEnabled()) {
      return [];
    }

    const newFeatures = this.extractSemanticFeatures(newRule);
    const matches: DuplicateMatch[] = [];

    for (const existingRule of existingRules) {
      const existingFeatures = this.extractSemanticFeaturesFromInfo(existingRule);
      const similarity = this.calculateSemanticSimilarity(newFeatures, existingFeatures);

      if (similarity >= this.thresholds.semantic) {
        matches.push({
          ruleId: existingRule.id,
          title: existingRule.title,
          category: existingRule.category,
          similarity,
          matchType: 'semantic',
          filePath: existingRule.metadata?.filePath || 'N/A'
        });
      }
    }

    // 按相似度排序并返回
    return matches.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * 提取语义特征
   */
  private extractSemanticFeatures(rule: BaseRule): SemanticFeatures {
    const title = (rule.title || '').toLowerCase();
    const description = (rule.description || '').toLowerCase();
    const sqlPattern = (rule.sqlPattern || '').toLowerCase();
    const combinedText = `${title} ${description} ${sqlPattern}`;

    return {
      intent: this.detectIntent(combinedText),
      action: this.detectAction(combinedText),
      target: this.detectTarget(combinedText),
      problem: this.detectProblem(combinedText),
      solution: this.detectSolution(combinedText),
      context: this.detectContext(combinedText),
      patterns: this.detectPatterns(combinedText),
      sqlKeywords: this.extractSQLKeywords(combinedText),
      impact: this.detectImpact(combinedText)
    };
  }

  /**
   * 从规则信息提取语义特征
   */
  private extractSemanticFeaturesFromInfo(ruleInfo: RuleInfo): SemanticFeatures {
    const title = (ruleInfo.title || '').toLowerCase();
    const description = (ruleInfo.description || '').toLowerCase();
    const sqlPattern = (ruleInfo.sqlPattern || '').toLowerCase();
    const combinedText = `${title} ${description} ${sqlPattern}`;

    return {
      intent: this.detectIntent(combinedText),
      action: this.detectAction(combinedText),
      target: this.detectTarget(combinedText),
      problem: this.detectProblem(combinedText),
      solution: this.detectSolution(combinedText),
      context: this.detectContext(combinedText),
      patterns: this.detectPatterns(combinedText),
      sqlKeywords: this.extractSQLKeywords(combinedText),
      impact: this.detectImpact(combinedText)
    };
  }

  /**
   * 计算语义相似度
   */
  private calculateSemanticSimilarity(features1: SemanticFeatures, features2: SemanticFeatures): number {
    let totalScore = 0;
    let totalWeight = 0;

    // 1. 意图相似度 (权重: 0.3)
    const intentSimilarity = features1.intent === features2.intent ? 1.0 : 0.0;
    totalScore += intentSimilarity * 0.3;
    totalWeight += 0.3;

    // 2. 动作相似度 (权重: 0.25)
    const actionSimilarity = features1.action === features2.action ? 1.0 : 0.5;
    totalScore += actionSimilarity * 0.25;
    totalWeight += 0.25;

    // 3. 目标相似度 (权重: 0.2)
    const targetSimilarity = features1.target === features2.target ? 1.0 : 0.0;
    totalScore += targetSimilarity * 0.2;
    totalWeight += 0.2;

    // 4. 问题相似度 (权重: 0.15)
    const problemSimilarity = features1.problem === features2.problem ? 1.0 : 0.7;
    totalScore += problemSimilarity * 0.15;
    totalWeight += 0.15;

    // 5. 解决方案相似度 (权重: 0.1)
    const solutionSimilarity = features1.solution === features2.solution ? 1.0 : 0.8;
    totalScore += solutionSimilarity * 0.1;
    totalWeight += 0.1;

    return totalWeight > 0 ? totalScore / totalWeight : 0.0;
  }

  /**
   * 检测规则意图
   */
  private detectIntent(text: string): string {
    const intentPatterns: { [intent: string]: string[] } = {
      'prevent': ['避免', '禁止', '防止', '预防', '防备'],
      'optimize': ['优化', '改进', '提升', '增强', '改善'],
      'detect': ['检测', '发现', '识别', '检查', '验证'],
      'recommend': ['建议', '推荐', '应该', '必须', '需要'],
      'fix': ['修复', '解决', '纠正', '处理', '应对']
    };

    for (const [intent, keywords] of Object.entries(intentPatterns)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return intent;
      }
    }

    return 'general';
  }

  /**
   * 检测动作类型
   */
  private detectAction(text: string): string {
    const actionPatterns: { [action: string]: string[] } = {
      'avoid': ['避免', '不要', '禁用', '防止'],
      'use': ['使用', '采用', '应用', '利用'],
      'check': ['检查', '验证', '审核', '确认'],
      'create': ['创建', '建立', '生成', '添加'],
      'remove': ['删除', '移除', '取消', '清除'],
      'modify': ['修改', '更改', '调整', '更新'],
      'monitor': ['监控', '观察', '跟踪', '记录']
    };

    for (const [action, keywords] of Object.entries(actionPatterns)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return action;
      }
    }

    return 'general';
  }

  /**
   * 检测目标对象
   */
  private detectTarget(text: string): string {
    const targetPatterns: { [target: string]: string[] } = {
      'sql': ['sql', '语句', '查询', '脚本'],
      'table': ['表', 'table', '数据表'],
      'index': ['索引', 'index', 'index'],
      'query': ['查询', 'query', '检索'],
      'connection': ['连接', 'conn', '连接池'],
      'transaction': ['事务', 'transaction', '交易'],
      'security': ['安全', 'security', '安全策略'],
      'performance': ['性能', 'performance', '效率']
    };

    for (const [target, keywords] of Object.entries(targetPatterns)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return target;
      }
    }

    return 'general';
  }

  /**
   * 检测问题类型
   */
  private detectProblem(text: string): string {
    const problemPatterns: { [problem: string]: string[] } = {
      'sql_injection': ['sql注入', '注入攻击', 'injection'],
      'performance': ['性能', '效率', '慢查询', '瓶颈'],
      'security': ['安全', '漏洞', '风险', '威胁'],
      'data_integrity': ['数据完整性', '一致性', '约束', '完整性'],
      'scalability': ['扩展性', '伸缩性', '容量'],
      'maintainability': ['维护性', '可维护', '复杂度', '整洁'],
      'error_handling': ['错误处理', '异常', '容错', '恢复']
    };

    for (const [problem, keywords] of Object.entries(problemPatterns)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return problem;
      }
    }

    return 'general';
  }

  /**
   * 检测解决方案类型
   */
  private detectSolution(text: string): string {
    const solutionPatterns: { [solution: string]: string[] } = {
      'parameterized_query': ['参数化查询', 'prepared statement', '参数绑定'],
      'indexing': ['索引', '创建索引', '优化索引'],
      'optimization': ['优化', '重构', '改进', '提升'],
      'validation': ['验证', '检查', '审核', '确认'],
      'monitoring': ['监控', '日志', '跟踪', '审计'],
      'best_practice': ['最佳实践', '规范', '标准', 'guideline'],
      'design_pattern': ['设计模式', '架构', '模式'],
      'security_measure': ['安全措施', '安全防护', '安全策略']
    };

    for (const [solution, keywords] of Object.entries(solutionPatterns)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return solution;
      }
    }

    return 'general';
  }

  /**
   * 检测上下文标签
   */
  private detectContext(text: string): string[] {
    const contexts: { [context: string]: string[] } = {
      'development': ['开发', 'dev', '编程', '编码'],
      'testing': ['测试', 'test', 'qa', '质量保证'],
      'production': ['生产', 'prod', '线上', '运行环境'],
      'database': ['数据库', 'db', '数据存储'],
      'api': ['api', '接口', 'web服务', 'rest'],
      'frontend': ['前端', 'ui', '用户界面', '页面'],
      'backend': ['后端', '服务端', 'server', '逻辑']
    };

    const detectedContexts: string[] = [];
    for (const [context, keywords] of Object.entries(contexts)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        detectedContexts.push(context);
      }
    }

    return detectedContexts;
  }

  /**
   * 检测匹配模式
   */
  private detectPatterns(text: string): string[] {
    const patterns: string[] = [];

    // 常见的SQL模式
    if (text.includes('select') && text.includes('*')) {
      patterns.push('select_star');
    }
    if (text.includes('where') && text.includes('1=1')) {
      patterns.push('always_true');
    }
    if (text.includes('order by') && text.includes('rand()')) {
      patterns.push('random_order');
    }
    if (text.includes('cursor') && text.includes('fetch')) {
      patterns.push('cursor_fetch');
    }
    if (text.includes('or') && text.includes('1=1')) {
      patterns.push('or_condition');
    }

    return patterns;
  }

  /**
   * 提取SQL关键字
   */
  private extractSQLKeywords(text: string): string[] {
    const sqlKeywords = [
      'select', 'insert', 'update', 'delete', 'create', 'drop', 'alter',
      'join', 'left join', 'right join', 'inner join', 'outer join',
      'where', 'group by', 'order by', 'having', 'union',
      'and', 'or', 'not', 'in', 'exists', 'between', 'like',
      'is', 'null', 'distinct', 'as', 'case', 'when', 'then', 'else', 'end',
      'primary', 'foreign', 'unique', 'key', 'index', 'table', 'view',
      'procedure', 'function', 'trigger', 'cursor'
    ];

    const detectedKeywords: string[] = [];
    const normalizedText = text.toLowerCase();

    sqlKeywords.forEach(keyword => {
      if (normalizedText.includes(keyword)) {
        detectedKeywords.push(keyword);
      }
    });

    return [...new Set(detectedKeywords)];
  }

  /**
   * 检测影响范围
   */
  private detectImpact(text: string): string {
    const impactPatterns: { [impact: string]: string[] } = {
      'critical': ['关键', '重要', '核心', '主要', '严重'],
      'moderate': ['中等', '一般', '普通', '常见'],
      'low': ['轻微', '较小', '次要', '影响小'],
      'system': ['系统', '整体', '全局', '全面'],
      'application': ['应用', '程序', '软件', '功能'],
      'module': ['模块', '组件', '部分', '单元'],
      'function': ['函数', '方法', '功能', '操作']
    };

    for (const [impact, keywords] of Object.entries(impactPatterns)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return impact;
      }
    }

    return 'moderate';
  }

  /**
   * 获取匹配统计
   */
  getMatchStats(): {
    name: string;
    weight: number;
    thresholds: any;
    enabled: boolean;
  } {
    return {
      name: this.name,
      weight: this.weight,
      thresholds: this.thresholds,
      enabled: this.isEnabled()
    };
  }

  /**
   * 计算匹配复杂度
   */
  calculateComplexity(ruleCount: number): {
    timeComplexity: string;
    spaceComplexity: string;
    estimatedTime: number;
  } {
    // 语义匹配的时间复杂度是 O(n)，但由于需要语义分析，单次处理时间较长
    const estimatedTime = ruleCount * 0.1; // 每个规则约0.1ms

    return {
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(1)',
      estimatedTime: Math.round(estimatedTime * 10) / 10
    };
  }

  /**
   * 验证配置
   */
  validateConfig(): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (this.weight < 0 || this.weight > 1) {
      errors.push('权重必须在0-1之间');
    }

    if (!this.thresholds || typeof this.thresholds.semantic !== 'number') {
      errors.push('缺少语义匹配阈值配置');
    }

    if (this.thresholds.semantic < 0 || this.thresholds.semantic > 1) {
      errors.push('语义匹配阈值必须在0-1之间');
    }

    if (this.thresholds.semantic < 0.7) {
      console.warn('语义匹配阈值过低，可能产生误匹配');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 调试信息
   */
  getDebugInfo(): any {
    return {
      name: this.name,
      weight: this.weight,
      thresholds: this.thresholds,
      enabled: this.isEnabled(),
      validation: this.validateConfig(),
      complexity: this.calculateComplexity(1000), // 假设1000个规则
      semanticConfig: this.semanticConfig
    };
  }
}