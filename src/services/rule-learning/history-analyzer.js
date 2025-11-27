/**
 * 历史数据分析器
 * 负责分析历史记录，提取可学习的模式和规律
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * 历史数据分析器类
 */
export class HistoryAnalyzer {
  constructor(historyService) {
    this.historyService = historyService;
  }

  /**
   * 获取高质量历史记录
   * @param {number} minConfidence - 最小置信度
   * @returns {Promise<Array>} 高质量历史记录
   */
  async getQualityHistory(minConfidence = 0.7) {
    try {
      const allHistory = await this.historyService.getAllHistory();
      
      const qualityHistory = allHistory.filter(record => {
        // 1. 检查分析成功
        if (!record.result?.success) {
          return false;
        }
        
        // 2. 检查置信度
        const avgConfidence = this.calculateAverageConfidence(record.result);
        if (avgConfidence < minConfidence) {
          return false;
        }
        
        // 3. 检查数据完整性
        const hasIssues = this.hasIdentifiableIssues(record.result);
        if (!hasIssues) {
          return false;
        }
        
        // 4. 检查SQL有效性
        if (!record.sql || record.sql.trim().length === 0) {
          return false;
        }
        
        return true;
      });

      console.log(`[HistoryAnalyzer] 筛选高质量记录: ${allHistory.length} -> ${qualityHistory.length}`);
      return qualityHistory;
      
    } catch (error) {
      console.error(`[HistoryAnalyzer] 获取高质量历史记录失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 按SQL模式分组
   * @param {Array} historyRecords - 历史记录数组
   * @returns {Promise<Map>} 分组结果
   */
  async groupBySQLPattern(historyRecords) {
    try {
      const groups = new Map();
      
      for (const record of historyRecords) {
        // 提取SQL模式（去除具体值，保留结构）
        const pattern = this.extractSQLPattern(record.sql);
        
        if (!groups.has(pattern)) {
          groups.set(pattern, []);
        }
        groups.get(pattern).push(record);
      }

      console.log(`[HistoryAnalyzer] SQL模式分组: ${historyRecords.length}条记录 -> ${groups.size}个模式`);
      return groups;
      
    } catch (error) {
      console.error(`[HistoryAnalyzer] SQL模式分组失败: ${error.message}`);
      return new Map();
    }
  }

  /**
   * 按问题类型分组
   * @param {Array} historyRecords - 历史记录数组
   * @returns {Promise<Object>} 按问题类型分组的结果
   */
  async groupByIssueType(historyRecords) {
    try {
      const issueGroups = {
        performance: {},
        security: {},
        standards: {}
      };

      for (const record of historyRecords) {
        const patterns = this.extractPatterns(record.result);
        
        // 性能问题分组
        if (patterns.performance && patterns.performance.length > 0) {
          patterns.performance.forEach(issue => {
            const key = `${issue.type}-${issue.severity}`;
            if (!issueGroups.performance[key]) {
              issueGroups.performance[key] = {
                type: issue.type,
                severity: issue.severity,
                count: 0,
                records: []
              };
            }
            issueGroups.performance[key].count++;
            issueGroups.performance[key].records.push(record);
          });
        }

        // 安全问题分组
        if (patterns.security && patterns.security.length > 0) {
          patterns.security.forEach(issue => {
            const key = `${issue.type}-${issue.severity}`;
            if (!issueGroups.security[key]) {
              issueGroups.security[key] = {
                type: issue.type,
                severity: issue.severity,
                count: 0,
                records: []
              };
            }
            issueGroups.security[key].count++;
            issueGroups.security[key].records.push(record);
          });
        }

        // 规范问题分组
        if (patterns.standards && patterns.standards.length > 0) {
          patterns.standards.forEach(issue => {
            const key = `${issue.type}-${issue.severity}`;
            if (!issueGroups.standards[key]) {
              issueGroups.standards[key] = {
                type: issue.type,
                severity: issue.severity,
                count: 0,
                records: []
              };
            }
            issueGroups.standards[key].count++;
            issueGroups.standards[key].records.push(record);
          });
        }
      }

      console.log(`[HistoryAnalyzer] 问题类型分组完成`);
      return issueGroups;
      
    } catch (error) {
      console.error(`[HistoryAnalyzer] 问题类型分组失败: ${error.message}`);
      return { performance: {}, security: {}, standards: {} };
    }
  }

  /**
   * 分析学习趋势
   * @param {Array} historyRecords - 历史记录数组
   * @returns {Promise<Object>} 学习趋势分析
   */
  async analyzeLearningTrends(historyRecords) {
    try {
      const trends = {
        timeDistribution: {},
        confidenceTrend: [],
        issueFrequency: {},
        databaseDistribution: {}
      };

      // 按时间分布分析
      historyRecords.forEach(record => {
        const date = new Date(record.timestamp).toISOString().substring(0, 10); // YYYY-MM-DD
        trends.timeDistribution[date] = (trends.timeDistribution[date] || 0) + 1;
      });

      // 置信度趋势分析
      const sortedRecords = historyRecords.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      trends.confidenceTrend = sortedRecords.map(record => ({
        timestamp: record.timestamp,
        confidence: this.calculateAverageConfidence(record.result)
      }));

      // 问题频率分析
      historyRecords.forEach(record => {
        const patterns = this.extractPatterns(record.result);
        Object.values(patterns).flat().forEach(issue => {
          const key = issue.type;
          trends.issueFrequency[key] = (trends.issueFrequency[key] || 0) + 1;
        });
      });

      // 数据库分布分析
      historyRecords.forEach(record => {
        const dbType = record.databaseType || 'unknown';
        trends.databaseDistribution[dbType] = (trends.databaseDistribution[dbType] || 0) + 1;
      });

      console.log(`[HistoryAnalyzer] 学习趋势分析完成`);
      return trends;
      
    } catch (error) {
      console.error(`[HistoryAnalyzer] 学习趋势分析失败: ${error.message}`);
      return { timeDistribution: {}, confidenceTrend: [], issueFrequency: {}, databaseDistribution: {} };
    }
  }

  /**
   * 识别高频问题模式
   * @param {Array} historyRecords - 历史记录数组
   * @param {number} minFrequency - 最小频率
   * @returns {Promise<Array>} 高频问题模式
   */
  async identifyHighFrequencyPatterns(historyRecords, minFrequency = 3) {
    try {
      const patternFrequency = {};

      // 统计问题模式频率
      historyRecords.forEach(record => {
        const patterns = this.extractPatterns(record.result);
        Object.values(patterns).flat().forEach(issue => {
          const key = `${issue.category || 'unknown'}-${issue.type}-${issue.severity}`;
          patternFrequency[key] = (patternFrequency[key] || 0) + 1;
        });
      });

      // 筛选高频模式
      const highFrequencyPatterns = Object.entries(patternFrequency)
        .filter(([_, frequency]) => frequency >= minFrequency)
        .map(([key, frequency]) => {
          const [category, type, severity] = key.split('-');
          return {
            category,
            type,
            severity,
            frequency,
            priority: this.calculatePatternPriority(category, severity, frequency)
          };
        })
        .sort((a, b) => b.priority - a.priority);

      console.log(`[HistoryAnalyzer] 识别高频模式: ${highFrequencyPatterns.length}个`);
      return highFrequencyPatterns;
      
    } catch (error) {
      console.error(`[HistoryAnalyzer] 识别高频模式失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 提取SQL模式
   * @param {string} sql - SQL语句
   * @returns {string} SQL模式
   */
  extractSQLPattern(sql) {
    if (!sql || typeof sql !== 'string') {
      return 'invalid_sql';
    }

    try {
      return sql
        .replace(/\b\d+\b/g, '{id}')                    // 数字替换为{id}
        .replace(/'[^']*'/g, '{value}')                 // 字符串替换为{value}
        .replace(/"[^"]*"/g, '{value}')                 // 双引号字符串替换为{value}
        .replace(/\b\d+\.\d+\b/g, '{number}')           // 小数替换为{number}
        .replace(/\s+/g, ' ')                           // 标准化空格
        .replace(/\s*,\s*/g, ', ')                      // 标准化逗号
        .replace(/\s*\(\s*/g, ' ( ')                    // 标准化左括号
        .replace(/\s*\)\s*/g, ' ) ')                    // 标准化右括号
        .trim();
    } catch (error) {
      console.warn(`[HistoryAnalyzer] SQL模式提取失败: ${error.message}`);
      return 'extraction_failed';
    }
  }

  /**
   * 计算平均置信度
   * @param {Object} analysisResult - 分析结果
   * @returns {number} 平均置信度
   */
  calculateAverageConfidence(analysisResult) {
    try {
      const confidences = [];
      
      // 尝试从多个位置获取置信度
      if (analysisResult.data?.performance?.data?.confidence) {
        confidences.push(analysisResult.data.performance.data.confidence);
      } else if (analysisResult.data?.performance?.metadata?.confidence) {
        confidences.push(analysisResult.data.performance.metadata.confidence);
      }
      
      if (analysisResult.data?.security?.data?.confidence) {
        confidences.push(analysisResult.data.security.data.confidence);
      } else if (analysisResult.data?.security?.metadata?.confidence) {
        confidences.push(analysisResult.data.security.metadata.confidence);
      }
      
      if (analysisResult.data?.standards?.data?.confidence) {
        confidences.push(analysisResult.data.standards.data.confidence);
      } else if (analysisResult.data?.standards?.metadata?.confidence) {
        confidences.push(analysisResult.data.standards.metadata.confidence);
      }
      
      if (confidences.length === 0) {
        console.warn(`[HistoryAnalyzer] 未找到置信度数据`);
        return 0;
      }
      
      const avgConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
      console.log(`[HistoryAnalyzer] 置信度计算: ${confidences.join(', ')} -> ${avgConfidence.toFixed(3)}`);
      return avgConfidence;
    } catch (error) {
      console.warn(`[HistoryAnalyzer] 置信度计算失败: ${error.message}`);
      return 0;
    }
  }

  /**
   * 检查是否有可识别的问题
   * @param {Object} analysisResult - 分析结果
   * @returns {boolean} 是否有可识别的问题
   */
  hasIdentifiableIssues(analysisResult) {
    try {
      // 检查是否有性能问题
      if (analysisResult.data?.performance?.data?.issues?.length > 0) {
        return true;
      }
      
      // 检查是否有安全问题
      if (analysisResult.data?.security?.data?.vulnerabilities?.length > 0) {
        return true;
      }
      
      // 检查是否有规范问题
      if (analysisResult.data?.standards?.data?.violations?.length > 0) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn(`[HistoryAnalyzer] 问题检查失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 提取分析模式
   * @param {Object} analysisResult - 分析结果
   * @returns {Object} 提取的模式
   */
  extractPatterns(analysisResult) {
    const patterns = {
      performance: [],
      security: [],
      standards: []
    };

    try {
      // 提取性能问题模式
      if (analysisResult.data?.performance?.data?.issues) {
        patterns.performance = analysisResult.data.performance.data.issues.map(issue => ({
          category: 'performance',
          type: issue.type,
          severity: issue.severity,
          description: issue.description,
          location: issue.location
        }));
      }

      // 提取安全问题模式
      if (analysisResult.data?.security?.data?.vulnerabilities) {
        patterns.security = analysisResult.data.security.data.vulnerabilities.map(vuln => ({
          category: 'security',
          type: vuln.type,
          severity: vuln.severity,
          cwe: vuln.cwe,
          description: vuln.description
        }));
      }

      // 提取规范问题模式
      if (analysisResult.data?.standards?.data?.violations) {
        patterns.standards = analysisResult.data.standards.data.violations.map(violation => ({
          category: 'standards',
          type: violation.type,
          severity: violation.severity,
          rule: violation.rule,
          description: violation.description
        }));
      }
    } catch (error) {
      console.warn(`[HistoryAnalyzer] 模式提取失败: ${error.message}`);
    }

    return patterns;
  }

  /**
   * 计算模式优先级
   * @param {string} category - 问题类别
   * @param {string} severity - 严重程度
   * @param {number} frequency - 频率
   * @returns {number} 优先级分数
   */
  calculatePatternPriority(category, severity, frequency) {
    const categoryWeights = {
      security: 3,
      performance: 2,
      standards: 1
    };

    const severityWeights = {
      critical: 5,
      high: 4,
      medium: 3,
      low: 2,
      info: 1
    };

    const categoryWeight = categoryWeights[category] || 1;
    const severityWeight = severityWeights[severity] || 1;
    
    return categoryWeight * severityWeight * frequency;
  }

  /**
   * 获取学习建议
   * @param {Array} historyRecords - 历史记录数组
   * @returns {Promise<Object>} 学习建议
   */
  async getLearningRecommendations(historyRecords) {
    try {
      const recommendations = {
        priorityPatterns: [],
        learningStrategies: [],
        qualityImprovements: []
      };

      // 识别高频模式
      const highFrequencyPatterns = await this.identifyHighFrequencyPatterns(historyRecords);
      recommendations.priorityPatterns = highFrequencyPatterns.slice(0, 10); // 取前10个

      // 生成学习策略建议
      if (highFrequencyPatterns.length > 0) {
        recommendations.learningStrategies.push('优先学习高频出现的安全问题模式');
        recommendations.learningStrategies.push('关注性能问题的重复模式');
        recommendations.learningStrategies.push('建立规范问题的自动化检测');
      }

      // 分析质量改进建议
      const avgConfidence = historyRecords.reduce((sum, record) => 
        sum + this.calculateAverageConfidence(record.result), 0) / historyRecords.length;
      
      if (avgConfidence < 0.8) {
        recommendations.qualityImprovements.push('提高分析置信度阈值，确保学习质量');
      }
      
      if (historyRecords.length < 50) {
        recommendations.qualityImprovements.push('积累更多历史数据以提高学习效果');
      }

      console.log(`[HistoryAnalyzer] 学习建议生成完成`);
      return recommendations;
      
    } catch (error) {
      console.error(`[HistoryAnalyzer] 学习建议生成失败: ${error.message}`);
      return { priorityPatterns: [], learningStrategies: [], qualityImprovements: [] };
    }
  }

  /**
   * 导出分析报告
   * @param {Array} historyRecords - 历史记录数组
   * @returns {Promise<Object>} 分析报告
   */
  async exportAnalysisReport(historyRecords) {
    try {
      const report = {
        summary: {
          totalRecords: historyRecords.length,
          dateRange: {
            start: historyRecords[0]?.timestamp,
            end: historyRecords[historyRecords.length - 1]?.timestamp
          },
          averageConfidence: historyRecords.reduce((sum, record) => 
            sum + this.calculateAverageConfidence(record.result), 0) / historyRecords.length
        },
        patterns: await this.identifyHighFrequencyPatterns(historyRecords),
        trends: await this.analyzeLearningTrends(historyRecords),
        recommendations: await this.getLearningRecommendations(historyRecords)
      };

      console.log(`[HistoryAnalyzer] 分析报告导出完成`);
      return report;
      
    } catch (error) {
      console.error(`[HistoryAnalyzer] 分析报告导出失败: ${error.message}`);
      return null;
    }
  }
}

export default HistoryAnalyzer;