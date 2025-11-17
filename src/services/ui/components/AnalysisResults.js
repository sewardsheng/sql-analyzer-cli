/**
 * AnalysisResults组件 - 显示分析结果
 */

import React from 'react';
import { Box, Text } from 'ink';
import { createInkSQLDisplayData } from '../../../utils/sqlHighlight.js';

/**
 * 获取严重级别颜色
 */
function getSeverityColor(severity) {
  const severityLower = String(severity || '').toLowerCase();
  if (severityLower === 'critical' || severityLower === '严重') return 'red';
  if (severityLower === 'high' || severityLower === '高') return 'red';
  if (severityLower === 'medium' || severityLower === '中') return 'yellow';
  if (severityLower === 'low' || severityLower === '低') return 'green';
  return 'gray';
}

/**
 * 获取严重级别图标
 */
function getSeverityIcon(severity) {
  const severityLower = String(severity || '').toLowerCase();
  if (severityLower === 'critical' || severityLower === '严重') return '🔴';
  if (severityLower === 'high' || severityLower === '高') return '🟠';
  if (severityLower === 'medium' || severityLower === '中') return '🟡';
  if (severityLower === 'low' || severityLower === '低') return '🟢';
  return '⚪';
}


/**
 * 计算风险等级
 */
function calculateRiskLevel(result) {
  if (!result.success || !result.data) return { level: '低', icon: '🟢', color: 'green' };
  
  const { analysisResults } = result.data;
  
  // 收集所有评分
  const scores = [];
  
  if (analysisResults?.securityAudit?.success) {
    const secScore = analysisResults.securityAudit.data?.securityScore;
    if (typeof secScore === 'number') scores.push(secScore);
  }
  
  if (analysisResults?.performanceAnalysis?.success) {
    const perfScore = analysisResults.performanceAnalysis.data?.performanceScore;
    if (typeof perfScore === 'number') scores.push(perfScore);
  }
  
  if (analysisResults?.standardsCheck?.success) {
    const stdScore = analysisResults.standardsCheck.data?.standardsScore;
    if (typeof stdScore === 'number') scores.push(stdScore);
  }
  
  if (scores.length === 0) {
    return { level: '低', icon: '🟢', color: 'green' };
  }
  
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  if (avgScore >= 85) return { level: '低', icon: '🟢', color: 'green' };
  if (avgScore >= 70) return { level: '中', icon: '🟡', color: 'yellow' };
  if (avgScore >= 50) return { level: '高', icon: '🟠', color: 'red' };
  return { level: '严重', icon: '🔴', color: 'red' };
}

export default function AnalysisResults({ result, onViewSQL, onBack }) {
  if (!result) {
    return (
      <Box>
        <Text color="red">没有分析结果</Text>
      </Box>
    );
  }

  if (!result.success || !result.data) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="red">✗ 分析失败</Text>
        <Text>{result.error || '未知错误'}</Text>
        <Box marginTop={1}>
          <Text dimColor>按 ESC 返回菜单</Text>
        </Box>
      </Box>
    );
  }

  const { analysisResults, report } = result.data;
  const risk = calculateRiskLevel(result);
  
  // 收集所有问题
  const allIssues = [];
  
  // 安全问题
  if (analysisResults?.securityAudit?.success) {
    const vulnerabilities = analysisResults.securityAudit.data?.vulnerabilities || [];
    vulnerabilities.forEach(v => {
      allIssues.push({
        category: '安全',
        type: v.type || '未知类型',
        description: v.description,
        severity: v.severity,
        recommendations: v.recommendations
      });
    });
  }
  
  // 性能问题
  if (analysisResults?.performanceAnalysis?.success) {
    const bottlenecks = analysisResults.performanceAnalysis.data?.bottlenecks || [];
    bottlenecks.forEach(b => {
      allIssues.push({
        category: '性能',
        type: b.type || '性能瓶颈',
        description: b.description,
        severity: b.severity || '中',
        recommendations: b.recommendations
      });
    });
  }
  
  // 编码规范问题
  if (analysisResults?.standardsCheck?.success) {
    const violations = analysisResults.standardsCheck.data?.violations || [];
    violations.forEach(v => {
      allIssues.push({
        category: '编码规范',
        type: v.type || '规范违规',
        description: v.description,
        severity: v.severity,
        recommendations: v.recommendations
      });
    });
  }

  // 统计各级别问题数量
  const issueCount = {
    total: allIssues.length,
    high: allIssues.filter(i => {
      const s = String(i.severity || '').toLowerCase();
      return s === 'high' || s === '高' || s === 'critical' || s === '严重';
    }).length,
    medium: allIssues.filter(i => {
      const s = String(i.severity || '').toLowerCase();
      return s === 'medium' || s === '中';
    }).length,
    low: allIssues.filter(i => {
      const s = String(i.severity || '').toLowerCase();
      return s === 'low' || s === '低';
    }).length
  };

  // 获取评分信息
  const scores = {
    security: analysisResults?.securityAudit?.data?.securityScore,
    performance: analysisResults?.performanceAnalysis?.data?.performanceScore,
    standards: analysisResults?.standardsCheck?.data?.standardsScore,
    overall: report?.overallAssessment?.score
  };

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* 标题 */}
      <Box marginBottom={1}>
        <Text bold color="cyan">✓ 分析完成</Text>
      </Box>

      {/* 风险等级 */}
      <Box marginBottom={1}>
        <Text>{risk.icon} 整体风险等级: </Text>
        <Text bold color={risk.color}>{risk.level.toUpperCase()}</Text>
      </Box>

      {/* 评分统计 */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="cyan"
        paddingX={2}
        paddingY={1}
        marginBottom={1}
      >
        <Text bold>📊 评分统计:</Text>
        <Box marginTop={1} flexDirection="column">
          {typeof scores.overall === 'number' && (
            <Text>总体评分: <Text bold color={scores.overall >= 70 ? 'green' : scores.overall >= 50 ? 'yellow' : 'red'}>{scores.overall}/100</Text></Text>
          )}
          {typeof scores.security === 'number' && (
            <Text>安全评分: <Text bold color={scores.security >= 70 ? 'green' : scores.security >= 50 ? 'yellow' : 'red'}>{scores.security}/100</Text></Text>
          )}
          {typeof scores.performance === 'number' && (
            <Text>性能评分: <Text bold color={scores.performance >= 70 ? 'green' : scores.performance >= 50 ? 'yellow' : 'red'}>{scores.performance}/100</Text></Text>
          )}
          {typeof scores.standards === 'number' && (
            <Text>规范评分: <Text bold color={scores.standards >= 70 ? 'green' : scores.standards >= 50 ? 'yellow' : 'red'}>{scores.standards}/100</Text></Text>
          )}
        </Box>
      </Box>

      {/* 问题统计 */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="cyan"
        paddingX={2}
        paddingY={1}
        marginBottom={1}
      >
        <Text bold>问题统计:</Text>
        <Box marginTop={1}>
          <Text>总计: </Text>
          <Text bold>{issueCount.total}</Text>
          <Text> | </Text>
          <Text color="red">高危: {issueCount.high}</Text>
          <Text> | </Text>
          <Text color="yellow">中危: {issueCount.medium}</Text>
          <Text> | </Text>
          <Text color="green">低危: {issueCount.low}</Text>
        </Box>
      </Box>

      {/* 问题列表 */}
      {allIssues.length > 0 ? (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold marginBottom={1}>发现的问题 (共 {allIssues.length} 个):</Text>
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor="gray"
            paddingX={2}
            paddingY={1}
          >
            {allIssues.map((issue, index) => (
              <Box key={index} flexDirection="column" marginBottom={index < allIssues.length - 1 ? 1 : 0}>
                <Box>
                  <Text>{getSeverityIcon(issue.severity)} </Text>
                  <Text color={getSeverityColor(issue.severity)} bold>
                    [{issue.category}]
                  </Text>
                  <Text> {issue.type}</Text>
                </Box>
                <Box marginLeft={3}>
                  <Text color="gray">{issue.description}</Text>
                </Box>
                {issue.recommendations && issue.recommendations.length > 0 && (
                  <Box marginLeft={3}>
                    <Text color="cyan">💡 {issue.recommendations[0]}</Text>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      ) : (
        <Box marginBottom={1}>
          <Text color="green">✓ 未发现问题</Text>
        </Box>
      )}

      {/* 优化建议 */}
      {report?.optimizedSql?.optimizedSql && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="cyan">✨ 优化后的SQL:</Text>
          <Box marginTop={1}>
            <Text dimColor>━━━━━━━━━━━ 开始 ━━━━━━━━━━━</Text>
          </Box>
          <Box
            flexDirection="column"
            borderStyle="single"
            borderColor="gray"
            paddingX={1}
            paddingY={1}
            marginY={1}
          >
            {(() => {
              const displayData = createInkSQLDisplayData(
                report.optimizedSql.optimizedSql,
                result.data?.databaseType || 'generic'
              );
              return displayData.map((item, index) => (
                <Box key={index}>
                  <Text>{item.content}</Text>
                </Box>
              ));
            })()}
          </Box>
          <Box marginTop={0}>
            <Text dimColor>━━━━━━━━━━━ 结束 ━━━━━━━━━━━</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>💡 提示: 请在终端中选择上方SQL文本并复制</Text>
          </Box>
        </Box>
      )}

      {/* 操作提示 */}
      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>按 ESC 返回菜单</Text>
      </Box>
    </Box>
  );
}