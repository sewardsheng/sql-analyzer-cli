/**
 * ProgressBar组件 - 使用CLI-Progress显示进度
 */

import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';

export default function ProgressBar({ progress, label }) {
  const barLength = 40;
  const filledLength = Math.round((progress / 100) * barLength);
  const emptyLength = barLength - filledLength;

  const filledBar = '█'.repeat(filledLength);
  const emptyBar = '░'.repeat(emptyLength);

  const getColor = () => {
    if (progress < 30) return 'red';
    if (progress < 70) return 'yellow';
    return 'green';
  };

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text color="gray">{label || '处理中...'}</Text>
      </Box>
      <Box>
        <Text color={getColor()}>
          {filledBar}
        </Text>
        <Text color="gray">
          {emptyBar}
        </Text>
        <Text color={getColor()} bold>
          {' '}{progress}%
        </Text>
      </Box>
    </Box>
  );
}