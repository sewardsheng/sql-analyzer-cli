/**
 * 文件移动工具类
 * 老王我专门搞自动化文件分类移动！规则评估完自动分类到对应目录
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { EvaluationResult } from '../models/EvaluationModels';
import { RuleInfo } from '../models/RuleModels';
import { getConfig } from '../../../config/AppConstants.js';

/**
 * 文件移动工具类
 */
export class FileMover {
  /**
   * 根据评估结果移动规则文件到对应目录
   */
  static async moveRuleFile(result: EvaluationResult, dryRun: boolean = false): Promise<{
    success: boolean;
    sourcePath?: string;
    targetPath?: string;
    action: string;
    error?: string;
  }> {
    try {
      // 从evaluationMetadata或rule metadata中获取文件路径
      const sourcePath = (result as any).evaluationMetadata?.filePath ||
                         (result as any).rule?.metadata?.filePath ||
                         (result as any).filePath;

      if (!sourcePath || !(await fs.access(sourcePath).then(() => true).catch(() => false))) {
        return {
          success: false,
          action: 'none',
          error: '源文件路径不存在'
        };
      }

      // 根据评估结果确定目标目录
      const targetDirectory = this.determineTargetDirectory(result);
      const fileName = path.basename(sourcePath);
      const targetPath = path.join(targetDirectory, fileName);

      // 确保目标目录存在
      if (!dryRun) {
        await fs.mkdir(targetDirectory, { recursive: true });
      }

      // 构建操作描述
      const action = this.buildActionDescription(result, sourcePath, targetPath);

      if (dryRun) {
        return {
          success: true,
          sourcePath,
          targetPath,
          action: `🔍 预演: ${action}`
        };
      }

      // 执行文件移动
      await fs.rename(sourcePath, targetPath);

      console.log(`✅ 文件移动成功: ${fileName} -> ${targetDirectory}`);

      return {
        success: true,
        sourcePath,
        targetPath,
        action: `✅ 已移动: ${action}`
      };

    } catch (error) {
      console.error('文件移动失败:', error);
      return {
        success: false,
        action: 'none',
        error: `文件移动失败: ${error.message}`
      };
    }
  }

  /**
   * 批量移动规则文件
   */
  static async moveRuleFiles(
    results: EvaluationResult[],
    dryRun: boolean = false
  ): Promise<Array<{
    success: boolean;
    sourcePath?: string;
    targetPath?: string;
    action: string;
    error?: string;
  }>> {
    const moveResults = [];

    for (const result of results) {
      const moveResult = await this.moveRuleFile(result, dryRun);
      moveResults.push(moveResult);
    }

    return moveResults;
  }

  /**
   * 根据评估结果确定目标目录
   */
  private static determineTargetDirectory(result: EvaluationResult): string {
    const { qualityEvaluation, duplicateCheck, classification, overallStatus } = result;

    // 优先级：重复 > 质量 > 格式
    if (duplicateCheck.isDuplicate) {
      return 'rules/learning-rules/issues';
    }

    if (overallStatus === 'rejected') {
      return 'rules/learning-rules/issues';
    }

    // 使用RuleEvaluationEngine的分类结果
    if (classification && classification.category) {
      switch (classification.category) {
        case 'approved':
          return 'rules/learning-rules/approved';
        case 'manual_review':
          return 'rules/learning-rules/manual_review';
        case 'low_quality':
          return 'rules/learning-rules/low_quality';
        case 'duplicate':
          return 'rules/learning-rules/duplicates';
        case 'invalid_format':
          return 'rules/learning-rules/issues';
        default:
          // 兜底逻辑：基于质量分数分类
          return this.classifyByQualityScore(qualityEvaluation.qualityScore);
      }
    }

    // 兜底逻辑：基于质量分数分类
    return this.classifyByQualityScore(qualityEvaluation.qualityScore);
  }

  /**
   * 基于质量分数的分类兜底逻辑
   */
  private static classifyByQualityScore(qualityScore: number): string {
    // 使用配置化的分类阈值
    const approvedThreshold = getConfig('RULE_MANAGEMENT.CLASSIFICATION_THRESHOLDS.APPROVED', 85);
    const manualReviewThreshold = getConfig('RULE_MANAGEMENT.CLASSIFICATION_THRESHOLDS.MANUAL_REVIEW', 65);

    if (qualityScore >= approvedThreshold) {
      // 高质量规则，建议批准
      return 'rules/learning-rules/approved';
    } else if (qualityScore >= manualReviewThreshold) {
      // 良好质量，需要人工审核
      return 'rules/learning-rules/manual_review';
    } else {
      // 低质量规则
      return 'rules/learning-rules/low_quality';
    }
  }

  /**
   * 构建操作描述
   */
  private static buildActionDescription(
    result: EvaluationResult,
    sourcePath: string,
    targetPath: string
  ): string {
    const { qualityEvaluation, duplicateCheck, overallStatus } = result;
    const fileName = path.basename(sourcePath);
    const targetDir = path.dirname(targetPath);

    let description = `${fileName} -> ${targetDir}`;

    if (duplicateCheck.isDuplicate) {
      description += ` (重复规则，相似度: ${(duplicateCheck.similarity * 100).toFixed(1)}%)`;
    } else if (overallStatus === 'rejected') {
      description += ` (格式错误)`;
    } else {
      description += ` (质量分数: ${qualityEvaluation.qualityScore}, 等级: ${qualityEvaluation.qualityLevel})`;
    }

    return description;
  }

  /**
   * 撤销移动（回滚操作）
   */
  static async undoMove(moveResult: {
    sourcePath: string;
    targetPath: string;
  }): Promise<{
    success: boolean;
    action: string;
    error?: string;
  }> {
    try {
      if (!moveResult.targetPath || !(await fs.access(moveResult.targetPath).then(() => true).catch(() => false))) {
        return {
          success: false,
          action: 'none',
          error: '目标文件不存在'
        };
      }

      // 确保源目录存在
      const sourceDir = path.dirname(moveResult.sourcePath);
      await fs.mkdir(sourceDir, { recursive: true });

      // 移回原位置
      await fs.rename(moveResult.targetPath, moveResult.sourcePath);

      console.log(`↩️ 文件回滚成功: ${moveResult.targetPath} -> ${moveResult.sourcePath}`);

      return {
        success: true,
        action: `↩️ 已回滚: ${moveResult.targetPath} -> ${moveResult.sourcePath}`
      };

    } catch (error) {
      console.error('文件回滚失败:', error);
      return {
        success: false,
        action: 'none',
        error: `文件回滚失败: ${error.message}`
      };
    }
  }

  /**
   * 验证移动操作的安全性
   */
  static async validateMoveSafety(sourcePath: string, targetPath: string): Promise<{
    safe: boolean;
    warnings: string[];
    errors: string[];
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    // 检查源文件
    if (!sourcePath) {
      errors.push('源文件路径为空');
    } else {
      try {
        await fs.access(sourcePath);
      } catch {
        errors.push('源文件不存在');
      }
    }

    // 检查目标路径
    if (!targetPath) {
      errors.push('目标路径为空');
    } else {
      const targetDir = path.dirname(targetPath);
      const targetFile = path.basename(targetPath);

      // 检查目标目录是否在规则目录内
      if (!targetDir.startsWith('rules/learning-rules/')) {
        errors.push('目标目录不在规则目录范围内');
      }

      // 检查目标文件是否已存在
      try {
        await fs.access(targetPath);
        warnings.push(`目标文件已存在: ${targetFile}`);
      } catch {
        // 文件不存在是正常的
      }
    }

    return {
      safe: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * 生成移动操作报告
   */
  static generateMoveReport(moveResults: Array<{
    success: boolean;
    sourcePath?: string;
    targetPath?: string;
    action: string;
    error?: string;
  }>): {
    summary: {
      total: number;
      successful: number;
      failed: number;
      duplicates: number;
      approved: number;
      manualReview: number;
      issues: number;
    };
    details: Array<{
      fileName: string;
      action: string;
      success: boolean;
      error?: string;
    }>;
  } {
    const summary = {
      total: moveResults.length,
      successful: moveResults.filter(r => r.success).length,
      failed: moveResults.filter(r => !r.success).length,
      duplicates: 0,
      approved: 0,
      manualReview: 0,
      issues: 0
    };

    const details = moveResults.map(result => {
      const fileName = result.sourcePath ? path.basename(result.sourcePath) : 'unknown';

      // 统计分类
      if (result.targetPath?.includes('duplicates')) summary.duplicates++;
      else if (result.targetPath?.includes('approved')) summary.approved++;
      else if (result.targetPath?.includes('manual_review')) summary.manualReview++;
      else if (result.targetPath?.includes('issues')) summary.issues++;

      return {
        fileName,
        action: result.action,
        success: result.success,
        error: result.error
      };
    });

    return { summary, details };
  }
}