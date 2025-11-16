/**
 * Menu组件 - 主菜单选择
 */

import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

export default function Menu({ onSelect }) {
  const items = [
    {
      label: '📝 分析SQL',
      value: 'analyze'
    },
    {
      label: '📊 历史记录',
      value: 'history'
    },
    {
      label: '📚 知识库学习',
      value: 'learn'
    },
    {
      label: '🔍 知识库搜索',
      value: 'search'
    },
    {
      label: '⚙️  配置设置',
      value: 'config'
    },
    {
      label: '🚪 退出',
      value: 'exit'
    }
  ];

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">请选择操作:</Text>
      </Box>
      <SelectInput
        items={items}
        onSelect={(item) => onSelect(item.value)}
      />
      <Box marginTop={1}>
        <Text dimColor>使用 ↑↓ 键选择，Enter 确认</Text>
      </Box>
    </Box>
  );
}