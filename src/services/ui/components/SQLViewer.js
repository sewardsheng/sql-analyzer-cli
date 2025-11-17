/**
 * SQLViewer组件 - 显示SQL代码（带语法高亮）
 */

import React from 'react';
import { Box, Text } from 'ink';
import { createInkSQLDisplayData } from '../../../utils/sqlHighlight.js';

export default function SQLViewer({ content, database, onBack }) {
  const displayData = createInkSQLDisplayData(content, database);

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">SQL 代码预览:</Text>
      </Box>
      
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="gray"
        paddingX={2}
        paddingY={1}
        maxHeight={20}
      >
        {displayData.map((item, index) => (
          <Box key={index}>
            <Text>{item.content}</Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>按 ESC 返回结果页</Text>
      </Box>
    </Box>
  );
}