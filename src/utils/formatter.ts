/**
 * 结果格式化工具
 * 老王我把格式化逻辑也抽出来了！
 */

import { colors } from './cli/index.js';

/**
 * 获取维度显示名称
 */
function getDimensionDisplayName(dimension: string): string {
  const nameMap: Record<string, string> = {
    'performance': '性能',
    'security': '安全',
    'standards': '规范'
  };
  return nameMap[dimension] || dimension;
}

/**
 * 获取维度对应的颜色
 */
function getDimensionColor(dimension: string): any {
  const colorMap: Record<string, any> = {
    'performance': colors.yellow,
    'security': colors.red,
    'standards': colors.blue
  };
  return colorMap[dimension] || colors.gray;
}

/**
 * 结果格式化工具类
 */
export class ResultFormatter {
  /**
   * 显示分析结果摘要
   */
  displaySummary(result: any): void {
    console.log(colors.cyan('\n📄 文件分析结果'));
    console.log(colors.gray('=================================================='));

    console.log(`文件: ${colors.cyan(result.fileInfo.fileName)}`);
    console.log(`路径: ${colors.gray(result.fileInfo.filePath)}`);
    console.log(`SQL语句数: ${colors.yellow(result.stats.totalStatements)}`);
    console.log(`成功分析: ${colors.green(result.stats.successfulAnalyses)}`);

    if (result.stats.overallScore !== undefined) {
      let scoreColor = colors.green;
      if (result.stats.overallScore < 60) scoreColor = colors.red;
      else if (result.stats.overallScore < 80) scoreColor = colors.yellow;

      console.log(`总体评分: ${scoreColor(result.stats.overallScore + '分')}`);
    }
  }

  /**
   * 显示SQL修复信息
   */
  displaySQLFix(sqlFix: any): void {
    console.log(colors.green('\n🔧 SQL修复:'));
    console.log(colors.gray('=============================='));

    if (sqlFix?.fixedSql) {
      console.log(colors.cyan('修复后的SQL:'));
      console.log(colors.blue(sqlFix.fixedSql));
    }

    if (sqlFix?.fixDetails) {
      console.log(colors.cyan('修复详情:'));
      console.log(`✅ 语法正确: ${sqlFix.fixDetails.syntaxCorrect ? colors.green('是') : colors.red('否')}`);
      console.log(`🛡️  安全执行: ${sqlFix.fixDetails.safeToExecute ? colors.green('是') : colors.red('否')}`);

      if (sqlFix.fixDetails.changes && sqlFix.fixDetails.changes.length > 0) {
        console.log(colors.cyan('修复变更:'));
        sqlFix.fixDetails.changes.forEach((change: any, index: number) => {
          console.log(colors.green(`${index + 1}. ${change.type}: ${change.description}`));
        });
      }
    }
  }

  /**
   * 显示问题分析
   */
  displayIssues(issuesByDimension: any): void {
    if (!issuesByDimension || Object.keys(issuesByDimension).length === 0) {
      console.log(colors.green('\n🎉 太棒了！没有发现任何问题！'));
      return;
    }

    Object.keys(issuesByDimension).forEach(dimension => {
      const dimensionName = getDimensionDisplayName(dimension);
      const dimensionColor = getDimensionColor(dimension);

      console.log(dimensionColor(`⚠️  ${dimensionName}问题:`));

      const issues = Array.isArray(issuesByDimension[dimension]) ? issuesByDimension[dimension] : [];
      issues.forEach((issue: any, index: number) => {
        const severity = issue.severity?.toUpperCase() || 'MEDIUM';
        let severityColor = colors.yellow;

        if (severity === 'HIGH' || severity === 'CRITICAL') {
          severityColor = colors.red;
        }

        console.log(dimensionColor(`${index + 1}. [${severityColor(severity)}] ${issue.title}`));
        console.log(colors.gray(`   ${issue.description}`));
      });
    });
  }

  /**
   * 显示建议信息
   */
  displayRecommendations(recommendationsByDimension: any): void {
    if (!recommendationsByDimension || Object.keys(recommendationsByDimension).length === 0) {
      return;
    }

    Object.keys(recommendationsByDimension).forEach(dimension => {
      const dimensionName = getDimensionDisplayName(dimension);
      const dimensionColor = getDimensionColor(dimension);

      console.log(dimensionColor(`💡 ${dimensionName}建议:`));

      const recommendations = Array.isArray(recommendationsByDimension[dimension]) ? recommendationsByDimension[dimension] : [];
      recommendations.forEach((rec: any, index: number) => {
        const priority = rec.priority?.toUpperCase() || 'MEDIUM';
        let priorityColor = colors.yellow;

        if (priority === 'HIGH') {
          priorityColor = colors.red;
        }

        console.log(dimensionColor(`${index + 1}. [${priorityColor(priority)}] ${rec.title}`));
        console.log(colors.gray(`   ${rec.description}`));
      });
    });
  }

  /**
   * 显示总结信息
   */
  displaySummaryInfo(analysis: any): void {
    if (analysis.summary) {
      console.log(colors.cyan('\n📋 分析总结:'));
      console.log(colors.gray(analysis.summary));
    }

    if (analysis.confidence) {
      console.log(colors.blue('\n🎯 分析置信度: ') + colors.green(`${analysis.confidence}%`));
    }
  }

  /**
   * 显示完成信息
   */
  displayCompletionInfo(startTime: number): void {
    const duration = Date.now() - startTime;
    console.log(colors.green(`✅ 分析完成，耗时: ${duration}ms`));
    console.log(colors.blue(`💡 完成时间: ${new Date().toLocaleString()}`));
  }
}

// 导出单例
export const resultFormatter = new ResultFormatter();