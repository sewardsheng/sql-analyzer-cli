/**
 * HistoryViewer组件 - 历史记录查看器
 * 支持列表查看、详情查看、删除和统计
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { getHistoryService } from '../../history/historyService.js';
import { createInkSQLDisplayData } from '../../../utils/sqlHighlight.js';

const historyService = getHistoryService();

/**
 * 历史记录视图状态
 */
const VIEWS = {
  LIST: 'list',
  DETAIL: 'detail',
  STATS: 'stats',
  CONFIRM_DELETE: 'confirm_delete',
  CONFIRM_CLEAR: 'confirm_clear'
};

/**
 * 获取分析类型标签
 */
function getTypeLabel(type) {
  const labels = {
    'command': '命令输入',
    'file': '文件输入',
    'single': '单个分析',
    'batch': '批量分析',
    'followup': '追问'
  };
  return labels[type] || type;
}

/**
 * 获取数据库类型标签
 */
import { getDatabaseLabel } from '../../../config/databases.js';

/**
 * 历史记录查看器组件
 */
export default function HistoryViewer({ onBack }) {
  const [view, setView] = useState(VIEWS.LIST);
  const [historyList, setHistoryList] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [stats, setStats] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);

  // 加载历史记录列表
  useEffect(() => {
    loadHistoryList();
  }, []);

  const loadHistoryList = async () => {
    try {
      const list = await historyService.getAllHistory();
      setHistoryList(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('加载历史记录失败:', error);
      setHistoryList([]);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await historyService.getHistoryStats();
      setStats(statsData);
    } catch (error) {
      console.error('加载统计信息失败:', error);
      setStats(null);
    }
  };

  // 键盘快捷键
  useInput((input, key) => {
    // ESC 返回
    if (key.escape) {
      if (view === VIEWS.LIST) {
        onBack();
      } else if (view === VIEWS.DETAIL || view === VIEWS.STATS) {
        setView(VIEWS.LIST);
      } else if (view === VIEWS.CONFIRM_DELETE || view === VIEWS.CONFIRM_CLEAR) {
        setView(VIEWS.LIST);
      }
    }
  });

  /**
   * 渲染列表视图
   */
  const renderList = () => {
    if (historyList.length === 0) {
      return (
        <Box flexDirection="column" paddingY={1}>
          <Text color="yellow">📝 暂无历史记录</Text>
          <Box marginTop={1}>
            <Text dimColor>按 ESC 返回主菜单</Text>
          </Box>
        </Box>
      );
    }

    const items = [
      ...historyList.map(record => ({
        label: `[${record.id.substring(0, 8)}] ${record.date} ${record.time} | ${getDatabaseLabel(record.databaseType)} | ${record.sqlPreview}`,
        value: record.id
      })),
      { label: '───────────────────────────────', value: 'separator', disabled: true },
      { label: '📊 查看统计信息', value: 'stats' },
      { label: '🗑️  清空所有记录', value: 'clear' },
      { label: '◀️  返回主菜单', value: 'back' }
    ];

    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">历史记录列表 (共 {historyList.length} 条)</Text>
        </Box>
        <SelectInput
          items={items}
          onSelect={async (item) => {
            if (item.value === 'back') {
              onBack();
            } else if (item.value === 'stats') {
              await loadStats();
              setView(VIEWS.STATS);
            } else if (item.value === 'clear') {
              setView(VIEWS.CONFIRM_CLEAR);
            } else if (item.value !== 'separator') {
              try {
                const record = await historyService.getHistoryById(item.value);
                setSelectedRecord(record);
                setView(VIEWS.DETAIL);
              } catch (error) {
                console.error('获取历史记录详情失败:', error);
              }
            }
          }}
        />
        <Box marginTop={1}>
          <Text dimColor>使用 ↑↓ 选择，Enter 查看详情，ESC 返回</Text>
        </Box>
      </Box>
    );
  };

  /**
   * 渲染详情视图
   */
  const renderDetail = () => {
    if (!selectedRecord) return null;

    const items = [
      { label: '🗑️  删除此记录', value: 'delete' },
      { label: '◀️  返回列表', value: 'back' }
    ];

    // 提取分析结果数据
    const result = selectedRecord.result;
    const analysisResults = result?.data?.analysisResults || {};
    const report = result?.data?.report || {};
    
    // 提取评分信息
    const scores = {
      overall: report?.overallAssessment?.score,
      security: analysisResults?.securityAudit?.data?.securityScore,
      performance: analysisResults?.performanceAnalysis?.data?.performanceScore,
      standards: analysisResults?.standardsCheck?.data?.standardsScore
    };

    // 统计问题数量
    const allIssues = [];
    if (analysisResults?.securityAudit?.data?.vulnerabilities) {
      allIssues.push(...analysisResults.securityAudit.data.vulnerabilities);
    }
    if (analysisResults?.performanceAnalysis?.data?.bottlenecks) {
      allIssues.push(...analysisResults.performanceAnalysis.data.bottlenecks);
    }
    if (analysisResults?.standardsCheck?.data?.violations) {
      allIssues.push(...analysisResults.standardsCheck.data.violations);
    }

    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">━━━━ 历史记录详情 ━━━━</Text>
        </Box>
        
        {/* 基本信息 */}
        <Box flexDirection="column" marginBottom={1}>
          <Text color="gray">ID: <Text color="white">{selectedRecord.id}</Text></Text>
          <Text color="gray">时间: <Text color="white">{new Date(selectedRecord.timestamp).toLocaleString('zh-CN')}</Text></Text>
          <Text color="gray">数据库: <Text color="blue">{getDatabaseLabel(selectedRecord.databaseType)}</Text></Text>
          <Text color="gray">类型: <Text color="magenta">{getTypeLabel(selectedRecord.type)}</Text></Text>
          {selectedRecord.parentId && (
            <Text color="gray">父记录: <Text color="yellow">{selectedRecord.parentId}</Text></Text>
          )}
        </Box>

        {/* SQL语句 */}
        <Box marginBottom={1}>
          <Text bold color="cyan">SQL语句:</Text>
        </Box>
        <Box marginBottom={1}>
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
              selectedRecord.sql,
              selectedRecord.databaseType || 'generic'
            );
            return displayData.map((item, index) => (
              <Box key={index}>
                <Text>{item.content}</Text>
              </Box>
            ));
          })()}
        </Box>
        <Box marginBottom={1}>
          <Text dimColor>━━━━━━━━━━━ 结束 ━━━━━━━━━━━</Text>
        </Box>

        {/* 分析结果状态 */}
        <Box marginBottom={1}>
          <Text bold color="cyan">分析结果:</Text>
        </Box>
        <Box marginBottom={1} paddingLeft={2}>
          <Text color={selectedRecord.result.success ? 'green' : 'red'}>
            {selectedRecord.result.success ? '✓ 分析成功' : '✗ 分析失败'}
          </Text>
          {!selectedRecord.result.success && selectedRecord.result.error && (
            <Text color="red">错误: {selectedRecord.result.error}</Text>
          )}
        </Box>

        {/* 评分信息 */}
        {selectedRecord.result.success && Object.values(scores).some(s => typeof s === 'number') && (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold color="cyan">评分信息:</Text>
            <Box paddingLeft={2} flexDirection="column">
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
        )}

        {/* 问题统计 */}
        {selectedRecord.result.success && allIssues.length > 0 && (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold color="cyan">发现问题 (共 {allIssues.length} 个):</Text>
            <Box paddingLeft={2} flexDirection="column" marginTop={1}>
              {allIssues.map((issue, index) => (
                <Box key={index} flexDirection="column" marginBottom={index < allIssues.length - 1 ? 1 : 0}>
                  <Text>
                    <Text color={issue.severity === 'high' || issue.severity === '高' || issue.severity === 'critical' || issue.severity === '严重' ? 'red' : issue.severity === 'medium' || issue.severity === '中' ? 'yellow' : 'green'}>
                      • [{issue.category || issue.type || '未知'}]
                    </Text>
                    <Text color="gray"> {issue.description?.substring(0, 60) || issue.type || '未知问题'}{issue.description?.length > 60 ? '...' : ''}</Text>
                  </Text>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* 优化建议 */}
        {selectedRecord.result.success && report?.optimizedSql?.optimizedSql && (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold color="cyan">优化后的SQL:</Text>
            <Box marginTop={0}>
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
                  selectedRecord.databaseType || 'generic'
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
          </Box>
        )}

        <SelectInput
          items={items}
          onSelect={(item) => {
            if (item.value === 'delete') {
              setRecordToDelete(selectedRecord.id);
              setView(VIEWS.CONFIRM_DELETE);
            } else {
              setView(VIEWS.LIST);
            }
          }}
        />
        <Box marginTop={1}>
          <Text dimColor>ESC 返回列表</Text>
        </Box>
      </Box>
    );
  };

  /**
   * 渲染统计视图
   */
  const renderStats = () => {
    if (!stats) return null;

    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">━━━━ 历史记录统计 ━━━━</Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="blue">总体统计:</Text>
          <Text color="gray">总记录数: <Text color="white">{stats.total}</Text></Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="blue">按分析类型:</Text>
          {Object.entries(stats.byType).length === 0 ? (
            <Text color="gray">  暂无数据</Text>
          ) : (
            Object.entries(stats.byType).map(([type, count]) => {
              const percentage = ((count / stats.total) * 100).toFixed(1);
              return (
                <Text key={type} color="gray">
                  {getTypeLabel(type)}: <Text color="white">{count}</Text> 条 (<Text color="yellow">{percentage}%</Text>)
                </Text>
              );
            })
          )}
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="blue">按数据库类型:</Text>
          {Object.entries(stats.byDatabase).length === 0 ? (
            <Text color="gray">  暂无数据</Text>
          ) : (
            Object.entries(stats.byDatabase).map(([db, count]) => {
              const percentage = ((count / stats.total) * 100).toFixed(1);
              return (
                <Text key={db} color="gray">
                  {getDatabaseLabel(db)}: <Text color="white">{count}</Text> 条 (<Text color="yellow">{percentage}%</Text>)
                </Text>
              );
            })
          )}
        </Box>

        <Box marginTop={1}>
          <Text dimColor>按 ESC 返回列表</Text>
        </Box>
      </Box>
    );
  };

  /**
   * 渲染删除确认视图
   */
  const renderConfirmDelete = () => {
    const items = [
      { label: '✓ 确认删除', value: 'confirm' },
      { label: '✗ 取消', value: 'cancel' }
    ];

    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="red">确定要删除这条记录吗？</Text>
        </Box>
        <SelectInput
          items={items}
          onSelect={async (item) => {
            if (item.value === 'confirm') {
              try {
                await historyService.deleteHistory(recordToDelete);
                await loadHistoryList();
                setRecordToDelete(null);
              } catch (error) {
                console.error('删除历史记录失败:', error);
              }
            }
            setView(VIEWS.LIST);
          }}
        />
        <Box marginTop={1}>
          <Text dimColor>ESC 取消</Text>
        </Box>
      </Box>
    );
  };

  /**
   * 渲染清空确认视图
   */
  const renderConfirmClear = () => {
    const items = [
      { label: '✓ 确认清空所有记录', value: 'confirm' },
      { label: '✗ 取消', value: 'cancel' }
    ];

    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="red">确定要清空所有 {historyList.length} 条历史记录吗？</Text>
          <Text color="yellow">此操作不可恢复！</Text>
        </Box>
        <SelectInput
          items={items}
          onSelect={async (item) => {
            if (item.value === 'confirm') {
              try {
                await historyService.clearAllHistory();
                await loadHistoryList();
              } catch (error) {
                console.error('清空历史记录失败:', error);
              }
            }
            setView(VIEWS.LIST);
          }}
        />
        <Box marginTop={1}>
          <Text dimColor>ESC 取消</Text>
        </Box>
      </Box>
    );
  };

  // 根据当前视图渲染内容
  switch (view) {
    case VIEWS.LIST:
      return renderList();
    case VIEWS.DETAIL:
      return renderDetail();
    case VIEWS.STATS:
      return renderStats();
    case VIEWS.CONFIRM_DELETE:
      return renderConfirmDelete();
    case VIEWS.CONFIRM_CLEAR:
      return renderConfirmClear();
    default:
      return null;
  }
}