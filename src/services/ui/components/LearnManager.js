/**
 * LearnManager组件 - 知识库学习管理器
 * 支持加载文档、重置知识库、清理规则、评估规则
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import { learnDocuments } from '../../knowledge/learn.js';
import { resetVectorStore } from '../../../core/vectorStore.js';
import { cleanupRules } from '../../knowledge/cleanup.js';
import { evaluateRules } from '../../knowledge/evaluate.js';

/**
 * 学习管理视图状态
 */
const VIEWS = {
  MENU: 'menu',
  LOAD_CONFIG: 'load_config',
  LOADING: 'loading',
  RESETTING: 'resetting',
  CLEANUP_CONFIG: 'cleanup_config',
  CLEANING: 'cleaning',
  EVALUATING: 'evaluating',
  RESULT: 'result',
  CONFIRM_RESET: 'confirm_reset'
};

/**
 * 知识库学习管理器组件
 */
export default function LearnManager({ onBack }) {
  const [view, setView] = useState(VIEWS.MENU);
  const [rulesDir, setRulesDir] = useState('./rules');
  const [scoreThreshold, setScoreThreshold] = useState('60');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 键盘快捷键
  useInput((input, key) => {
    // ESC 返回
    if (key.escape) {
      if (view === VIEWS.MENU) {
        onBack();
      } else if (view === VIEWS.RESULT) {
        setView(VIEWS.MENU);
      } else if (view === VIEWS.LOAD_CONFIG || view === VIEWS.CLEANUP_CONFIG || view === VIEWS.CONFIRM_RESET) {
        setMessage('');
        setView(VIEWS.MENU);
      }
    }
  });

  /**
   * 加载文档到知识库
   */
  const handleLoadDocuments = async () => {
    try {
      setView(VIEWS.LOADING);
      setIsLoading(true);
      
      await learnDocuments({ rulesDir });
      
      setMessage('✓ 文档已成功加载到知识库');
      setIsLoading(false);
      setView(VIEWS.RESULT);
    } catch (error) {
      setMessage(`✗ 加载失败: ${error.message}`);
      setIsLoading(false);
      setView(VIEWS.RESULT);
    }
  };

  /**
   * 重置知识库
   */
  const handleReset = async () => {
    try {
      setView(VIEWS.RESETTING);
      setIsLoading(true);
      
      const success = await resetVectorStore();
      
      if (success) {
        setMessage('✓ 知识库已重置');
      } else {
        setMessage('✗ 重置知识库失败');
      }
      
      setIsLoading(false);
      setView(VIEWS.RESULT);
    } catch (error) {
      setMessage(`✗ 重置失败: ${error.message}`);
      setIsLoading(false);
      setView(VIEWS.RESULT);
    }
  };

  /**
   * 清理低质量规则
   */
  const handleCleanup = async () => {
    try {
      setView(VIEWS.CLEANING);
      setIsLoading(true);
      
      await cleanupRules({
        score: scoreThreshold,
        backup: true,
        rulesDir: './rules/learning-rules'
      });
      
      setMessage('✓ 规则清理完成');
      setIsLoading(false);
      setView(VIEWS.RESULT);
    } catch (error) {
      setMessage(`✗ 清理失败: ${error.message}`);
      setIsLoading(false);
      setView(VIEWS.RESULT);
    }
  };

  /**
   * 评估规则质量
   */
  const handleEvaluate = async () => {
    try {
      setView(VIEWS.EVALUATING);
      setIsLoading(true);
      
      await evaluateRules({
        report: true,
        all: true,
        rulesDir: './rules/learning-rules'
      });
      
      setMessage('✓ 规则评估完成');
      setIsLoading(false);
      setView(VIEWS.RESULT);
    } catch (error) {
      setMessage(`✗ 评估失败: ${error.message}`);
      setIsLoading(false);
      setView(VIEWS.RESULT);
    }
  };

  /**
   * 渲染主菜单
   */
  const renderMenu = () => {
    const items = [
      { label: '📚 加载文档到知识库', value: 'load' },
      { label: '🔄 重置知识库', value: 'reset' },
      { label: '🧹 清理低质量规则', value: 'cleanup' },
      { label: '📊 评估规则质量', value: 'evaluate' },
      { label: '◀️  返回主菜单', value: 'back' }
    ];

    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">知识库学习管理</Text>
        </Box>
        <SelectInput
          items={items}
          onSelect={(item) => {
            if (item.value === 'back') {
              onBack();
            } else if (item.value === 'load') {
              setView(VIEWS.LOAD_CONFIG);
            } else if (item.value === 'reset') {
              setView(VIEWS.CONFIRM_RESET);
            } else if (item.value === 'cleanup') {
              setView(VIEWS.CLEANUP_CONFIG);
            } else if (item.value === 'evaluate') {
              handleEvaluate();
            }
          }}
        />
        <Box marginTop={1}>
          <Text dimColor>选择操作，ESC 返回</Text>
        </Box>
      </Box>
    );
  };

  /**
   * 渲染加载配置
   */
  const renderLoadConfig = () => {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">加载文档到知识库</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="gray">规则目录路径:</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="gray">{'> '}</Text>
          <TextInput
            value={rulesDir}
            onChange={setRulesDir}
            onSubmit={() => handleLoadDocuments()}
            placeholder="./rules"
          />
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Enter 开始加载 | ESC 取消</Text>
        </Box>
      </Box>
    );
  };

  /**
   * 渲染清理配置
   */
  const renderCleanupConfig = () => {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">清理低质量规则</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="gray">质量分数阈值 (0-100):</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="gray">{'> '}</Text>
          <TextInput
            value={scoreThreshold}
            onChange={setScoreThreshold}
            onSubmit={() => handleCleanup()}
            placeholder="60"
          />
        </Box>
        <Box marginTop={1}>
          <Text dimColor>低于此分数的规则将被清理</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Enter 开始清理 | ESC 取消</Text>
        </Box>
      </Box>
    );
  };

  /**
   * 渲染确认重置
   */
  const renderConfirmReset = () => {
    const items = [
      { label: '✓ 确认重置知识库', value: 'confirm' },
      { label: '✗ 取消', value: 'cancel' }
    ];

    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="red">确定要重置知识库吗？</Text>
          <Text color="yellow">此操作将清空所有已学习的内容！</Text>
        </Box>
        <SelectInput
          items={items}
          onSelect={(item) => {
            if (item.value === 'confirm') {
              handleReset();
            } else {
              setView(VIEWS.MENU);
            }
          }}
        />
        <Box marginTop={1}>
          <Text dimColor>ESC 取消</Text>
        </Box>
      </Box>
    );
  };

  /**
   * 渲染加载中
   */
  const renderLoading = (action) => {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="yellow">
            <Spinner type="dots" />
          </Text>
          <Text color="yellow"> {action}...</Text>
        </Box>
      </Box>
    );
  };

  /**
   * 渲染结果
   */
  const renderResult = () => {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color={message.startsWith('✓') ? 'green' : 'red'}>{message}</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>按 ESC 返回菜单</Text>
        </Box>
      </Box>
    );
  };

  // 根据当前视图渲染内容
  switch (view) {
    case VIEWS.MENU:
      return renderMenu();
    case VIEWS.LOAD_CONFIG:
      return renderLoadConfig();
    case VIEWS.CLEANUP_CONFIG:
      return renderCleanupConfig();
    case VIEWS.CONFIRM_RESET:
      return renderConfirmReset();
    case VIEWS.LOADING:
      return renderLoading('正在加载文档');
    case VIEWS.RESETTING:
      return renderLoading('正在重置知识库');
    case VIEWS.CLEANING:
      return renderLoading('正在清理规则');
    case VIEWS.EVALUATING:
      return renderLoading('正在评估规则');
    case VIEWS.RESULT:
      return renderResult();
    default:
      return null;
  }
}