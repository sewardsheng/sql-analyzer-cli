/**
 * CI/CD格式化工具
 * 提供CI/CD平台所需的输出格式，包括JSON、JUnit、GitHub PR等
 */

import { writeFileSync } from 'fs';

interface AnalysisResult {
  file?: string;
  sql?: string;
  success?: boolean;
  allIssues?: any[];
  summary?: any;
  overallScore?: number;
}

interface ScanSummary {
  filesScanned: number;
  totalIssues: number;
  issuesBySeverity: Record<string, number>;
  issuesByCategory: Record<string, number>;
  criticalIssues: number;
  highIssues: number;
}

/**
 * CI/CD格式化器
 */
export class CIFormatter {
  /**
   * 格式化为JSON格式（用于程序处理）
   */
  formatAsJSON(results: AnalysisResult[], startTime: number): string {
    const summary = this.generateSummary(results);
    const scanInfo = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      duration: Date.now() - startTime,
      scanInfo: summary
    };

    return JSON.stringify({
      scanInfo,
      results: results.map(result => ({
        file: result.file,
        success: result.success,
        issues: result.allIssues || [],
        score: result.overallScore,
        summary: result.summary
      }))
    }, null, 2);
  }

  /**
   * 格式化为JUnit XML格式（用于测试工具集成）
   */
  formatAsJUnit(results: AnalysisResult[]): string {
    const summary = this.generateSummary(results);
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<testsuites>\n';
    xml += `  <testsuite name="SQL Analysis" tests="${summary.filesScanned}" failures="${summary.totalIssues}" time="0">\n`;

    results.forEach((result, index) => {
      const issues = result.allIssues || [];
      const fileSafeName = (result.file || `query_${index}`).replace(/[^a-zA-Z0-9._-]/g, '_');

      if (issues.length === 0) {
        xml += `    <testcase classname="SQL Analysis" name="${fileSafeName}" time="0"/>\n`;
      } else {
        xml += `    <testcase classname="SQL Analysis" name="${fileSafeName}" time="0">\n`;
        issues.forEach(issue => {
          xml += `      <failure message="${this.escapeXml(issue.message || 'SQL issue detected')}">\n`;
          xml += `        File: ${result.file}\n`;
          xml += `        Category: ${issue.category || 'unknown'}\n`;
          xml += `        Severity: ${issue.severity || 'medium'}\n`;
          xml += `        Rule: ${issue.rule || 'unknown'}\n`;
          if (issue.code) {
            xml += `        Code: ${this.escapeXml(issue.code)}\n`;
          }
          xml += `        Suggestion: ${this.escapeXml(issue.suggestion || 'No suggestion')}\n`;
          xml += `      </failure>\n`;
        });
        xml += `    </testcase>\n`;
      }
    });

    xml += '  </testsuite>\n';
    xml += '</testsuites>\n';

    return xml;
  }

  /**
   * 格式化为GitHub PR评论格式
   */
  formatAsGitHubPR(results: AnalysisResult[]): string {
    const summary = this.generateSummary(results);

    let markdown = '## 🔍 SQL Security Scan Results\n\n';

    // 概览统计
    markdown += '### 📊 Summary\n\n';
    markdown += '- **Files Scanned**: ' + summary.filesScanned + '\n';
    markdown += '- **Issues Found**: ' + summary.totalIssues + '\n';
    markdown += `- **Issues By Severity**: ${summary.criticalIssues} Critical, ${summary.highIssues} High, ${summary.issuesBySeverity.medium || 0} Medium, ${summary.issuesBySeverity.low || 0} Low\n\n`;

    // 严重问题
    if (summary.criticalIssues > 0 || summary.highIssues > 0) {
      markdown += '### 🚨 Critical & High Issues\n\n';

      results.forEach(result => {
        const issues = result.allIssues || [];
        const criticalIssues = issues.filter(i => i.severity === 'critical' || i.severity === 'high');

        if (criticalIssues.length > 0) {
          markdown += `**${result.file}**\n\n`;

          criticalIssues.forEach((issue, index) => {
            const emoji = issue.severity === 'critical' ? '🚨' : '⚠️';
            markdown += `${index + 1}. **${emoji} ${issue.category || 'Unknown'}** - ${issue.message || 'Issue detected'}\n`;
            if (issue.code) {
              markdown += `   \`\`\`sql\n${issue.code}\n   \`\`\`\n`;
            }
            if (issue.suggestion) {
              markdown += `   **💡 Suggestion**: ${issue.suggestion}\n`;
            }
            markdown += '\n';
          });
        }
      });
    }

    // 详细结果
    markdown += '### 📋 Detailed Results\n\n';
    markdown += '<details>\n<summary>Click to expand full results</summary>\n\n';
    markdown += '| File | Line | Category | Severity | Message |\n';
    markdown += '|------|-----|----------|----------|---------|\n';

    results.forEach(result => {
      const issues = result.allIssues || [];
      issues.forEach(issue => {
        const file = result.file || 'unknown';
        const line = issue.line || '-';
        const category = issue.category || 'unknown';
        const severity = issue.severity || 'medium';
        const message = (issue.message || 'Issue detected').substring(0, 100);

        markdown += `| ${file} | ${line} | ${category} | ${severity} | ${message} |\n`;
      });
    });

    markdown += '\n</details>\n\n';

    // 操作建议
    markdown += '### ✅ Actions Required\n\n';
    if (summary.criticalIssues > 0) {
      markdown += '- [ ] **URGENT**: Fix all critical issues before merge\n';
    }
    if (summary.highIssues > 0) {
      markdown += '- [ ] Review all high severity issues\n';
    }
    if (summary.totalIssues === 0) {
      markdown += '🎉 **Great job!** No SQL issues detected.\n';
    } else {
      markdown += '- [ ] Consider addressing medium/low issues to improve code quality\n';
    }

    return markdown;
  }

  /**
   * 格式化为SonarQube通用格式
   */
  formatAsSonar(results: AnalysisResult[]): string {
    const summary = this.generateSummary(results);

    let report = '## SonarQube Issues Report\n\n';
    report += `Total Issues: ${summary.totalIssues}\n`;
    report += `Files Analyzed: ${summary.filesScanned}\n\n`;

    results.forEach(result => {
      const issues = result.allIssues || [];
      issues.forEach(issue => {
        const severity = this.mapSeverityToSonar(issue.severity);
        const type = this.mapCategoryToSonarType(issue.category);

        report += `${result.file}:${issue.line || 1}: ${severity} - ${type}: ${issue.message || 'SQL issue'}\n`;
        if (issue.suggestion) {
          report += `  Suggestion: ${issue.suggestion}\n`;
        }
      });
    });

    return report;
  }

  /**
   * 保存结果到文件
   */
  saveResults(results: AnalysisResult[], format: string, outputPath: string, startTime: number): void {
    let content: string;

    switch (format.toLowerCase()) {
      case 'json':
        content = this.formatAsJSON(results, startTime);
        break;
      case 'junit':
        content = this.formatAsJUnit(results);
        break;
      case 'github':
        content = this.formatAsGitHubPR(results);
        break;
      case 'sonar':
        content = this.formatAsSonar(results);
        break;
      default:
        content = this.formatAsJSON(results, startTime);
    }

    writeFileSync(outputPath, content);
  }

  /**
   * 生成扫描摘要
   */
  private generateSummary(results: AnalysisResult[]): ScanSummary {
    const summary: ScanSummary = {
      filesScanned: results.length,
      totalIssues: 0,
      issuesBySeverity: {},
      issuesByCategory: {},
      criticalIssues: 0,
      highIssues: 0
    };

    results.forEach(result => {
      const issues = result.allIssues || [];
      summary.totalIssues += issues.length;

      issues.forEach(issue => {
        // 统计严重性
        const severity = issue.severity || 'medium';
        summary.issuesBySeverity[severity] = (summary.issuesBySeverity[severity] || 0) + 1;

        if (severity === 'critical') {
          summary.criticalIssues++;
        } else if (severity === 'high') {
          summary.highIssues++;
        }

        // 统计类别
        const category = issue.category || 'unknown';
        summary.issuesByCategory[category] = (summary.issuesByCategory[category] || 0) + 1;
      });
    });

    return summary;
  }

  /**
   * 转义XML特殊字符
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * 映射严重性到SonarQube格式
   */
  private mapSeverityToSonar(severity: string): string {
    const mapping: Record<string, string> = {
      'critical': 'BLOCKER',
      'high': 'CRITICAL',
      'medium': 'MAJOR',
      'low': 'MINOR'
    };
    return mapping[severity] || 'MAJOR';
  }

  /**
   * 映射类别到SonarQube类型
   */
  private mapCategoryToSonarType(category: string): string {
    const mapping: Record<string, string> = {
      'security': 'VULNERABILITY',
      'performance': 'CODE_SMELL',
      'standards': 'CODE_SMELL',
      'syntax': 'BUG'
    };
    return mapping[category] || 'CODE_SMELL';
  }
}

// 导出单例
export const ciFormatter = new CIFormatter();