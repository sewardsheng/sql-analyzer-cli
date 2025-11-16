/**
 * ConfigViewer组件 - 配置设置查看器
 * 支持查看、修改和重置配置
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { readConfig, setConfig, DEFAULT_CONFIG } from '../../config/index.js';

/**
 * 配置视图状态
 */
const VIEWS = {
  LIST: 'list',
  EDIT: 'edit',
  CONFIRM_RESET: 'confirm_reset'
};

/**
 * 配置键描述
 */
const CONFIG_DESC = {
  apiKey: 'API密钥',
  baseURL: 'API基础URL',
  model: '模型名称',
  embeddingModel: '嵌入模型名称',
  apiPort: 'API服务器端口',
  apiHost: 'API服务器主机',
  apiCorsEnabled: '是否启用CORS',
  apiCorsOrigin: 'CORS允许的源',
  enableAISummary: '是否启用AI摘要',
  enableColors: '是否启用颜色输出',
  summaryOutputFormat: '摘要输出格式'
};

/**
 * 配置设置查看器组件
 */
export default function ConfigViewer({ onBack }) {
  const [view, setView] = useState(VIEWS.LIST);
  const [config, setConfigState] = useState({});
  const [editingKey, setEditingKey] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [message, setMessage] = useState('');

  // 加载配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const cfg = await readConfig();
    setConfigState(cfg);
  };

  // 键盘快捷键
  useInput((input, key) => {
    // ESC 返回
    if (key.escape) {
      if (view === VIEWS.LIST) {
        onBack();
      } else if (view === VIEWS.EDIT || view === VIEWS.CONFIRM_RESET) {
        setMessage('');
        setView(VIEWS.LIST);
      }
    }
  });

  /**
   * 渲染列表视图
   */
  const renderList = () => {
    const configItems = Object.keys(DEFAULT_CONFIG).map(key => ({
      label: `${CONFIG_DESC[key] || key}: ${config[key] === '' ? '(未设置)' : config[key]}`,
      value: key
    }));

    const items = [
      ...configItems,
      { label: '───────────────────────────────', value: 'separator', disabled: true },
      { label: '🔄 重置为默认值', value: 'reset' },
      { label: '◀️  返回主菜单', value: 'back' }
    ];

    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">系统配置</Text>
        </Box>
        {message && (
          <Box marginBottom={1}>
            <Text color={message.startsWith('✓') ? 'green' : 'red'}>{message}</Text>
          </Box>
        )}
        <SelectInput
          items={items}
          onSelect={(item) => {
            if (item.value === 'back') {
              onBack();
            } else if (item.value === 'reset') {
              setView(VIEWS.CONFIRM_RESET);
            } else if (item.value !== 'separator') {
              setEditingKey(item.value);
              setEditingValue(String(config[item.value]));
              setMessage('');
              setView(VIEWS.EDIT);
            }
          }}
        />
        <Box marginTop={1}>
          <Text dimColor>选择配置项进行编辑，ESC 返回</Text>
        </Box>
      </Box>
    );
  };

  /**
   * 渲染编辑视图
   */
  const renderEdit = () => {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">编辑配置: {CONFIG_DESC[editingKey] || editingKey}</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="gray">当前值: {config[editingKey] === '' ? '(未设置)' : config[editingKey]}</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="cyan">新值:</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="gray">{'> '}</Text>
          <TextInput
            value={editingValue}
            onChange={setEditingValue}
            onSubmit={async (value) => {
              const success = await setConfig(editingKey, value);
              if (success) {
                await loadConfig();
                setMessage(`✓ ${CONFIG_DESC[editingKey]} 已更新`);
              } else {
                setMessage(`✗ 更新失败`);
              }
              setView(VIEWS.LIST);
            }}
          />
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Enter 确认，ESC 取消</Text>
        </Box>
      </Box>
    );
  };

  /**
   * 渲染重置确认视图
   */
  const renderConfirmReset = () => {
    const items = [
      { label: '✓ 确认重置为默认值', value: 'confirm' },
      { label: '✗ 取消', value: 'cancel' }
    ];

    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="red">确定要重置所有配置为默认值吗？</Text>
        </Box>
        <SelectInput
          items={items}
          onSelect={async (item) => {
            if (item.value === 'confirm') {
              // 重置所有配置
              for (const key of Object.keys(DEFAULT_CONFIG)) {
                await setConfig(key, String(DEFAULT_CONFIG[key]));
              }
              await loadConfig();
              setMessage('✓ 配置已重置为默认值');
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
    case VIEWS.EDIT:
      return renderEdit();
    case VIEWS.CONFIRM_RESET:
      return renderConfirmReset();
    default:
      return null;
  }
}