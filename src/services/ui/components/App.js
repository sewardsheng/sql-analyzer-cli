/**
 * Ink主应用组件
 * 可视化终端UI的入口组件
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import Header from './Header.js';
import SQLViewer from './SQLViewer.js';
import AnalysisResults from './AnalysisResults.js';
import Menu from './Menu.js';
import ProgressBar from './ProgressBar.js';
import HistoryViewer from './HistoryViewer.js';
import ConfigViewer from './ConfigViewer.js';
import LearnManager from './LearnManager.js';
import SearchKnowledge from './SearchKnowledge.js';
import { readFile } from 'fs/promises';
import { analyzeSql } from '../../../services/analysis/index.js';

/**
 * 应用状态
 */
const STATES = {
  MENU: 'menu',
  ANALYZE_CHOICE: 'analyze_choice',
  FILE_INPUT: 'file_input',
  SQL_INPUT: 'sql_input',
  ANALYZING: 'analyzing',
  RESULTS: 'results',
  SQL_VIEW: 'sql_view',
  HISTORY: 'history',
  CONFIG: 'config',
  LEARN: 'learn',
  SEARCH: 'search',
  ERROR: 'error'
};

/**
 * 主应用组件
 */
export default function App({ config, file, database }) {
  const { exit } = useApp();
  const [state, setState] = useState(file ? STATES.ANALYZING : STATES.MENU);
  const [sqlFile, setSqlFile] = useState(file || '');
  const [sqlInput, setSqlInput] = useState('');
  const [sqlContent, setSqlContent] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [currentAnalyzer, setCurrentAnalyzer] = useState('');

  // 如果提供了文件，自动开始分析
  useEffect(() => {
    if (file && state === STATES.ANALYZING) {
      handleAnalyzeFile(file);
    }
  }, [file]);

  // 键盘快捷键
  useInput((input, key) => {
    // ESC 退出
    if (key.escape) {
      if (state === STATES.RESULTS || state === STATES.SQL_VIEW ||
          state === STATES.HISTORY || state === STATES.CONFIG ||
          state === STATES.LEARN || state === STATES.SEARCH ||
          state === STATES.ANALYZE_CHOICE) {
        setState(STATES.MENU);
      } else {
        exit();
      }
    }

    // Ctrl+C 强制退出
    if (key.ctrl && input === 'c') {
      exit();
    }
  });

  /**
   * 处理SQL文件分析
   */
  const handleAnalyzeFile = async (filePath) => {
    try {
      setState(STATES.ANALYZING);
      setProgress(10);
      setCurrentAnalyzer('读取SQL文件');

      // 读取SQL文件
      const content = await readFile(filePath, 'utf-8');
      setSqlContent(content);
      setProgress(20);

      // 执行分析
      setCurrentAnalyzer('执行多维度分析');
      setProgress(30);
      
      const result = await analyzeSql({
        file: filePath,
        learn: true,
        performance: true,
        security: true,
        standards: true
      });

      setProgress(100);
      setAnalysisResult(result);
      setState(STATES.RESULTS);

    } catch (err) {
      setError(err.message);
      setState(STATES.ERROR);
    }
  };

  /**
   * 处理SQL语句分析
   */
  const handleAnalyzeSql = async (sql) => {
    try {
      setState(STATES.ANALYZING);
      setProgress(10);
      setCurrentAnalyzer('准备分析SQL语句');
      
      setSqlContent(sql);
      setProgress(20);

      // 执行分析
      setCurrentAnalyzer('执行多维度分析');
      setProgress(30);
      
      const result = await analyzeSql({
        sql: sql,
        learn: true,
        performance: true,
        security: true,
        standards: true
      });

      setProgress(100);
      setAnalysisResult(result);
      setState(STATES.RESULTS);

    } catch (err) {
      setError(err.message);
      setState(STATES.ERROR);
    }
  };

  /**
   * 渲染不同状态的UI
   */
  const renderContent = () => {
    switch (state) {
      case STATES.MENU:
        return (
          <Menu
            onSelect={(action) => {
              if (action === 'analyze') {
                setState(STATES.ANALYZE_CHOICE);
              } else if (action === 'history') {
                setState(STATES.HISTORY);
              } else if (action === 'config') {
                setState(STATES.CONFIG);
              } else if (action === 'learn') {
                setState(STATES.LEARN);
              } else if (action === 'search') {
                setState(STATES.SEARCH);
              } else if (action === 'exit') {
                exit();
              }
            }}
          />
        );

      case STATES.ANALYZE_CHOICE:
        return (
          <Box flexDirection="column" paddingY={1}>
            <Box marginBottom={1}>
              <Text bold color="cyan">选择分析方式:</Text>
            </Box>
            <Box marginBottom={1}>
              <Text color="yellow">1. 从文件读取SQL</Text>
            </Box>
            <Box marginBottom={1}>
              <Text color="yellow">2. 直接输入SQL语句</Text>
            </Box>
            <Box marginTop={1}>
              <Text dimColor>按 1 选择文件 | 按 2 输入SQL | ESC 返回</Text>
            </Box>
          </Box>
        );

      case STATES.FILE_INPUT:
        return (
          <Box flexDirection="column" paddingY={1}>
            <Text color="cyan">请输入SQL文件路径:</Text>
            <Box marginTop={1}>
              <Text color="gray">{'> '}</Text>
              <TextInput
                value={sqlFile}
                onChange={setSqlFile}
                onSubmit={(value) => {
                  handleAnalyzeFile(value);
                }}
                placeholder="例如: ./test.sql"
              />
            </Box>
            <Box marginTop={1}>
              <Text dimColor>按 ESC 返回</Text>
            </Box>
          </Box>
        );

      case STATES.SQL_INPUT:
        return (
          <Box flexDirection="column" paddingY={1}>
            <Text color="cyan">请输入SQL语句 (多行，Ctrl+D完成):</Text>
            <Box marginTop={1}>
              <Text color="gray">{'> '}</Text>
              <TextInput
                value={sqlInput}
                onChange={setSqlInput}
                onSubmit={(value) => {
                  if (value.trim()) {
                    handleAnalyzeSql(value);
                  }
                }}
                placeholder="输入SQL语句..."
              />
            </Box>
            <Box marginTop={1}>
              <Text dimColor>Enter 提交 | ESC 返回</Text>
            </Box>
          </Box>
        );

      case STATES.ANALYZING:
        return (
          <Box flexDirection="column" paddingY={1}>
            <Box marginBottom={1}>
              <Text color="yellow">
                <Spinner type="dots" />
              </Text>
              <Text color="yellow"> 正在分析SQL...</Text>
            </Box>
            <ProgressBar
              progress={progress}
              label={currentAnalyzer}
            />
          </Box>
        );

      case STATES.RESULTS:
        return (
          <AnalysisResults
            result={analysisResult}
            onViewSQL={() => setState(STATES.SQL_VIEW)}
            onBack={() => setState(STATES.MENU)}
          />
        );

      case STATES.SQL_VIEW:
        return (
          <SQLViewer
            content={sqlContent}
            database={database}
            onBack={() => setState(STATES.RESULTS)}
          />
        );

      case STATES.HISTORY:
        return (
          <HistoryViewer
            onBack={() => setState(STATES.MENU)}
          />
        );

      case STATES.CONFIG:
        return (
          <ConfigViewer
            onBack={() => setState(STATES.MENU)}
          />
        );

      case STATES.LEARN:
        return (
          <LearnManager
            onBack={() => setState(STATES.MENU)}
          />
        );

      case STATES.SEARCH:
        return (
          <SearchKnowledge
            onBack={() => setState(STATES.MENU)}
          />
        );

      case STATES.ERROR:
        return (
          <Box flexDirection="column" paddingY={1}>
            <Box marginBottom={1}>
              <Text color="red">✗ 错误</Text>
            </Box>
            <Box marginBottom={1}>
              <Text>{error}</Text>
            </Box>
            <Box>
              <Text dimColor>按 ESC 返回菜单</Text>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  // 处理分析方式选择的输入
  useInput((input) => {
    if (state === STATES.ANALYZE_CHOICE) {
      if (input === '1') {
        setState(STATES.FILE_INPUT);
      } else if (input === '2') {
        setState(STATES.SQL_INPUT);
      }
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Header />
      <Box marginTop={1}>
        {renderContent()}
      </Box>
    </Box>
  );
}