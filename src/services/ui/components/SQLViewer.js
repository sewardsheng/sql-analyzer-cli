/**
 * SQLViewer组件 - 显示SQL代码（带语法高亮）
 */

import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';

/**
 * SQL语法高亮
 */
function highlightSQL(sql, database) {
  // SQL关键字列表
  const keywords = [
    'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP',
    'ALTER', 'TABLE', 'INDEX', 'VIEW', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
    'ON', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL',
    'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'AS',
    'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'CASE', 'WHEN', 'THEN',
    'ELSE', 'END', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CONSTRAINT',
    'DEFAULT', 'AUTO_INCREMENT', 'UNIQUE', 'CHECK', 'CASCADE'
  ];

  let highlighted = sql;
  
  // 高亮关键字（不区分大小写）
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    highlighted = highlighted.replace(regex, chalk.cyan.bold(keyword));
  });

  // 高亮字符串
  highlighted = highlighted.replace(/'([^']*)'/g, chalk.green("'$1'"));
  highlighted = highlighted.replace(/"([^"]*)"/g, chalk.green('"$1"'));

  // 高亮数字
  highlighted = highlighted.replace(/\b(\d+)\b/g, chalk.yellow('$1'));

  // 高亮注释
  highlighted = highlighted.replace(/--([^\n]*)/g, chalk.gray('--$1'));
  highlighted = highlighted.replace(/\/\*[\s\S]*?\*\//g, (match) => chalk.gray(match));

  return highlighted;
}

export default function SQLViewer({ content, database, onBack }) {
  const lines = content.split('\n');
  const highlightedLines = lines.map(line => highlightSQL(line, database));

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
        {highlightedLines.map((line, index) => (
          <Box key={index}>
            <Text color="gray">{String(index + 1).padStart(4, ' ')} | </Text>
            <Text>{line}</Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>按 ESC 返回结果页</Text>
      </Box>
    </Box>
  );
}