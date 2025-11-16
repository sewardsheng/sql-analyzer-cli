/**
 * SearchKnowledge组件 - 知识库搜索
 * 支持搜索知识库中的规则和最佳实践
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { retrieveKnowledge } from '../../../core/knowledgeBase.js';

/**
 * 搜索视图状态
 */
const VIEWS = {
  INPUT: 'input',
  SEARCHING: 'searching',
  RESULTS: 'results',
  ERROR: 'error'
};

/**
 * 知识库搜索组件
 */
export default function SearchKnowledge({ onBack }) {
  const [view, setView] = useState(VIEWS.INPUT);
  const [query, setQuery] = useState('');
  const [count, setCount] = useState('5');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [inputMode, setInputMode] = useState('query'); // 'query' 或 'count'

  // 键盘快捷键
  useInput((input, key) => {
    // ESC 返回
    if (key.escape) {
      if (view === VIEWS.INPUT) {
        onBack();
      } else if (view === VIEWS.RESULTS || view === VIEWS.ERROR) {
        setView(VIEWS.INPUT);
        setQuery('');
        setResults([]);
        setError('');
      }
    }
  });

  /**
   * 执行搜索
   */
  const handleSearch = async () => {
    try {
      setView(VIEWS.SEARCHING);
      
      const k = parseInt(count) || 5;
      const result = await retrieveKnowledge(query, k);
      
      if (!result.success) {
        setError(result.error || '搜索失败');
        setView(VIEWS.ERROR);
        return;
      }
      
      const documents = result.data.documents;
      
      if (documents.length === 0) {
        setError('未找到相关内容');
        setView(VIEWS.ERROR);
        return;
      }
      
      setResults(documents);
      setView(VIEWS.RESULTS);
      
    } catch (err) {
      setError(err.message);
      setView(VIEWS.ERROR);
    }
  };

  /**
   * 获取来源标签
   */
  const getSourceLabel = (metadata) => {
    if (!metadata) return '未知来源';
    
    const source = metadata.source || '未知';
    const title = metadata.title || '';
    const section = metadata.section || '';
    
    let label = source;
    if (title) {
      label += ` - ${title}`;
    }
    if (section) {
      label += ` (${section})`;
    }
    
    return label;
  };

  /**
   * 截断文本
   */
  const truncateText = (text, maxLength = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  /**
   * 渲染输入界面
   */
  const renderInput = () => {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">知识库搜索</Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text color="gray">搜索查询:</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="gray">{'> '}</Text>
          <TextInput
            value={query}
            onChange={setQuery}
            onSubmit={() => {
              if (query.trim()) {
                setInputMode('count');
              }
            }}
            placeholder="输入搜索关键词..."
            focus={inputMode === 'query'}
          />
        </Box>
        
        {inputMode === 'count' && (
          <>
            <Box marginBottom={1}>
              <Text color="gray">返回结果数量:</Text>
            </Box>
            <Box marginBottom={1}>
              <Text color="gray">{'> '}</Text>
              <TextInput
                value={count}
                onChange={setCount}
                onSubmit={() => {
                  if (query.trim()) {
                    handleSearch();
                  }
                }}
                placeholder="5"
                focus={inputMode === 'count'}
              />
            </Box>
          </>
        )}
        
        <Box marginTop={1}>
          <Text dimColor>
            {inputMode === 'query' 
              ? 'Enter 继续 | ESC 返回' 
              : 'Enter 搜索 | ESC 返回'}
          </Text>
        </Box>
      </Box>
    );
  };

  /**
   * 渲染搜索中
   */
  const renderSearching = () => {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="yellow">
            <Spinner type="dots" />
          </Text>
          <Text color="yellow"> 正在搜索知识库...</Text>
        </Box>
        <Box>
          <Text color="gray">查询: "{query}"</Text>
        </Box>
      </Box>
    );
  };

  /**
   * 渲染搜索结果
   */
  const renderResults = () => {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">━━━━ 搜索结果 ━━━━</Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text color="green">✓ 找到 {results.length} 条相关内容</Text>
        </Box>
        
        {results.map((doc, index) => (
          <Box key={index} flexDirection="column" marginBottom={1}>
            <Box marginBottom={1}>
              <Text color="blue">[{index + 1}] {getSourceLabel(doc.metadata)}</Text>
            </Box>
            
            <Box marginBottom={1} paddingLeft={2}>
              <Text>{truncateText(doc.pageContent)}</Text>
            </Box>
            
            {doc.metadata && (
              <Box paddingLeft={2}>
                <Text color="gray">来源: {doc.metadata.source || '未知'}</Text>
              </Box>
            )}
            
            {index < results.length - 1 && (
              <Box marginY={1}>
                <Text color="gray">{'─'.repeat(60)}</Text>
              </Box>
            )}
          </Box>
        ))}
        
        <Box marginTop={1}>
          <Text dimColor>按 ESC 返回搜索</Text>
        </Box>
      </Box>
    );
  };

  /**
   * 渲染错误
   */
  const renderError = () => {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="red">✗ 错误</Text>
        </Box>
        <Box marginBottom={1}>
          <Text>{error}</Text>
        </Box>
        {error.includes('知识库') && (
          <Box marginBottom={1}>
            <Text color="yellow">💡 提示: 请先使用 "知识库学习" 功能加载文档</Text>
          </Box>
        )}
        <Box marginTop={1}>
          <Text dimColor>按 ESC 返回搜索</Text>
        </Box>
      </Box>
    );
  };

  // 根据当前视图渲染内容
  switch (view) {
    case VIEWS.INPUT:
      return renderInput();
    case VIEWS.SEARCHING:
      return renderSearching();
    case VIEWS.RESULTS:
      return renderResults();
    case VIEWS.ERROR:
      return renderError();
    default:
      return null;
  }
}