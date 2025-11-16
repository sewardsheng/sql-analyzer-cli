/**
 * Header组件 - 显示应用头部信息
 */

import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';

export default function Header() {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="cyan">
          ╔═══════════════════════════════════════════╗
        </Text>
      </Box>
      <Box justifyContent="center">
        <Text bold color="cyan">
          {'    '}SQL语句智能规则分析与扫描工具{'    '}
        </Text>
      </Box>
      <Box justifyContent="center" marginTop={1}>
        <Text bold color="cyan">
          {'    '}create by 数字抚州团队{'    '}
        </Text>
      </Box>
      <Box justifyContent="center" marginTop={1}>
        <Text bold color="cyan">
          ╚═══════════════════════════════════════════╝
        </Text>
      </Box>
      <Box justifyContent="center" marginTop={1}>
        <Text dimColor>按 ESC 退出 | Ctrl+C 强制退出</Text>
      </Box>
    </Box>
  );
}