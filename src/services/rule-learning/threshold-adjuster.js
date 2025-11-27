/**
 * 智能阈值调整器
 * 根据规则生成质量动态调整审批阈值
 */

export class SmartThresholdAdjuster {
  constructor() {
    this.qualityHistory = [];
    this.adjustmentHistory = [];
    this.config = {
      enabled: true,
      windowSize: 20, // 考虑最近20条规则的质量
      targetAutoApproveRate: 0.3, // 目标自动审批率30%
      minThreshold: 0.6,
      maxThreshold: 0.85,
      adjustmentStep: 0.05,
      qualityWeight: 0.7,
      approvalRateWeight: 0.3
    };
  }

  /**
   * 记录规则质量数据
   * @param {Array} rules - 生成的规则数组
   * @param {Array} approvedRules - 审批通过的规则数组
   */
  recordQualityData(rules, approvedRules) {
    if (!this.config.enabled || rules.length === 0) return;

    const qualityData = {
      timestamp: new Date().toISOString(),
      totalRules: rules.length,
      approvedRules: approvedRules.length,
      autoApproveRate: approvedRules.length / rules.length,
      avgQualityScore: this.calculateAverageQuality(rules),
      avgConfidence: this.calculateAverageConfidence(rules),
      avgApprovedQuality: approvedRules.length > 0 ? this.calculateAverageQuality(approvedRules) : 0,
      avgApprovedConfidence: approvedRules.length > 0 ? this.calculateAverageConfidence(approvedRules) : 0
    };

    this.qualityHistory.push(qualityData);
    
    // 保持窗口大小
    if (this.qualityHistory.length > this.config.windowSize) {
      this.qualityHistory.shift();
    }

    console.log(`[SmartThreshold] 记录质量数据: 生成${rules.length}条, 审批${approvedRules.length}条, 自动审批率${(qualityData.autoApproveRate * 100).toFixed(1)}%`);
  }

  /**
   * 计算平均质量分数
   * @param {Array} rules - 规则数组
   * @returns {number} 平均质量分数
   */
  calculateAverageQuality(rules) {
    if (rules.length === 0) return 0;
    
    const totalScore = rules.reduce((sum, rule) => {
      return sum + (rule.evaluation?.qualityScore || 0);
    }, 0);
    
    return totalScore / rules.length;
  }

  /**
   * 计算平均置信度
   * @param {Array} rules - 规则数组
   * @returns {number} 平均置信度
   */
  calculateAverageConfidence(rules) {
    if (rules.length === 0) return 0;
    
    const totalConfidence = rules.reduce((sum, rule) => {
      return sum + (rule.confidence || 0);
    }, 0);
    
    return totalConfidence / rules.length;
  }

  /**
   * 计算推荐的阈值调整
   * @param {number} currentThreshold - 当前阈值
   * @returns {Object} 调整建议
   */
  calculateRecommendedAdjustment(currentThreshold) {
    if (!this.config.enabled || this.qualityHistory.length < 5) {
      return { adjustment: 0, reason: '数据不足，无法调整' };
    }

    const recentData = this.qualityHistory.slice(-10); // 最近10条数据
    const avgAutoApproveRate = recentData.reduce((sum, data) => sum + data.autoApproveRate, 0) / recentData.length;
    const avgQualityScore = recentData.reduce((sum, data) => sum + data.avgQualityScore, 0) / recentData.length;
    const avgConfidence = recentData.reduce((sum, data) => sum + data.avgConfidence, 0) / recentData.length;

    // 计算质量指标（0-1范围）
    const qualityScore = (avgQualityScore / 100) * this.config.qualityWeight;
    const confidenceScore = avgConfidence * this.config.qualityWeight;
    const qualityIndex = (qualityScore + confidenceScore) / 2;

    // 计算审批率指标
    const approvalRateScore = Math.abs(avgAutoApproveRate - this.config.targetAutoApproveRate) * this.config.approvalRateWeight;

    // 综合评分（越低越好）
    const compositeScore = qualityIndex + approvalRateScore;

    let adjustment = 0;
    let reason = '';

    // 基于目标审批率调整
    if (avgAutoApproveRate < this.config.targetAutoApproveRate * 0.8) {
      // 审批率过低，降低阈值
      adjustment = -this.config.adjustmentStep;
      reason = `自动审批率过低(${(avgAutoApproveRate * 100).toFixed(1)}% < ${(this.config.targetAutoApproveRate * 100).toFixed(1)}%)`;
    } else if (avgAutoApproveRate > this.config.targetAutoApproveRate * 1.2) {
      // 审批率过高，提高阈值
      adjustment = this.config.adjustmentStep;
      reason = `自动审批率过高(${(avgAutoApproveRate * 100).toFixed(1)}% > ${(this.config.targetAutoApproveRate * 100).toFixed(1)}%)`;
    } else if (avgQualityScore > 75 && avgConfidence > 0.75) {
      // 质量很高但审批率正常，可以稍微降低阈值
      adjustment = -this.config.adjustmentStep * 0.5;
      reason = '规则质量优秀，可适当放宽审批条件';
    }

    // 确保调整后的阈值在合理范围内
    const newThreshold = Math.max(this.config.minThreshold, 
                                 Math.min(this.config.maxThreshold, currentThreshold + adjustment));

    return {
      currentThreshold,
      recommendedThreshold: newThreshold,
      adjustment: newThreshold - currentThreshold,
      reason,
      metrics: {
        avgAutoApproveRate,
        avgQualityScore,
        avgConfidence,
        compositeScore
      }
    };
  }

  /**
   * 应用阈值调整
   * @param {number} currentThreshold - 当前阈值
   * @returns {Object} 调整结果
   */
  applyAdjustment(currentThreshold) {
    const adjustment = this.calculateRecommendedAdjustment(currentThreshold);
    
    if (Math.abs(adjustment.adjustment) > 0.001) {
      this.adjustmentHistory.push({
        timestamp: new Date().toISOString(),
        oldThreshold: currentThreshold,
        newThreshold: adjustment.recommendedThreshold,
        adjustment: adjustment.adjustment,
        reason: adjustment.reason,
        metrics: adjustment.metrics
      });

      console.log(`[SmartThreshold] 阈值调整: ${currentThreshold} -> ${adjustment.recommendedThreshold}`);
      console.log(`[SmartThreshold] 调整原因: ${adjustment.reason}`);
      console.log(`[SmartThreshold] 当前指标: 自动审批率${(adjustment.metrics.avgAutoApproveRate * 100).toFixed(1)}%, 平均质量${adjustment.metrics.avgQualityScore.toFixed(1)}, 平均置信度${adjustment.metrics.avgConfidence.toFixed(3)}`);
    }

    return adjustment;
  }

  /**
   * 获取调整历史
   * @returns {Array} 调整历史
   */
  getAdjustmentHistory() {
    return [...this.adjustmentHistory];
  }

  /**
   * 获取质量统计
   * @returns {Object} 质量统计
   */
  getQualityStats() {
    if (this.qualityHistory.length === 0) {
      return { message: '暂无质量数据' };
    }

    const recent = this.qualityHistory.slice(-10);
    const totalRules = this.qualityHistory.reduce((sum, data) => sum + data.totalRules, 0);
    const totalApproved = this.qualityHistory.reduce((sum, data) => sum + data.approvedRules, 0);

    return {
      totalBatches: this.qualityHistory.length,
      totalRules,
      totalApproved,
      overallAutoApproveRate: totalApproved / totalRules,
      recentAvgQualityScore: recent.reduce((sum, data) => sum + data.avgQualityScore, 0) / recent.length,
      recentAvgConfidence: recent.reduce((sum, data) => sum + data.avgConfidence, 0) / recent.length,
      recentAutoApproveRate: recent.reduce((sum, data) => sum + data.autoApproveRate, 0) / recent.length
    };
  }

  /**
   * 重置调整器
   */
  reset() {
    this.qualityHistory = [];
    this.adjustmentHistory = [];
    console.log('[SmartThreshold] 智能阈值调整器已重置');
  }

  /**
   * 更新配置
   * @param {Object} newConfig - 新配置
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('[SmartThreshold] 配置已更新:', this.config);
  }
}

// 创建全局实例
export const smartThresholdAdjuster = new SmartThresholdAdjuster();

export default SmartThresholdAdjuster;