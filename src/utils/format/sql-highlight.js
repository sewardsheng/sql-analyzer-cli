/**
 * SQL语法高亮和格式化工具
 * 支持终端输出和Ink组件两种模式
 */

import chalk from 'chalk';

/**
 * SQL关键字列表
 */
const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP',
  'ALTER', 'TABLE', 'INDEX', 'VIEW', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
  'ON', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL',
  'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'AS',
  'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'CASE', 'WHEN', 'THEN',
  'ELSE', 'END', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CONSTRAINT',
  'DEFAULT', 'AUTO_INCREMENT', 'UNIQUE', 'CHECK', 'CASCADE', 'WITH',
  'OVER', 'PARTITION', 'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'LAG', 'LEAD',
  'WINDOW', 'FIRST_VALUE', 'LAST_VALUE', 'NTILE', 'CUME_DIST', 'PERCENT_RANK'
];

/**
 * SQL语法高亮 - 适用于终端输出
 * @param {string} sql - SQL语句
 * @param {string} database - 数据库类型
 * @returns {string} 带颜色标记的SQL字符串
 */
export function highlightSQLForTerminal(sql, database = 'generic') {
  let highlighted = sql;
  
  // 高亮关键字（不区分大小写）
  SQL_KEYWORDS.forEach(keyword => {
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

/**
 * SQL语法高亮 - 适用于Ink组件
 * @param {string} sql - SQL语句
 * @param {string} database - 数据库类型
 * @returns {string} 带chalk标记的SQL字符串（Ink会自动处理）
 */
export function highlightSQLForInk(sql, database = 'generic') {
  // Ink组件中使用chalk的方式与终端相同，因为Ink会自动处理chalk标记
  return highlightSQLForTerminal(sql, database);
}

/**
 * 格式化SQL显示
 * @param {string} sql - 原始SQL语句
 * @returns {string} 格式化后的SQL语句
 */
export function formatSQLForDisplay(sql) {
  // 将SQL按行分割，并移除多余的空白
  const lines = sql.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // 如果只有一行且是复杂SQL，进行智能分割
  if (lines.length === 1 && isComplexSQL(lines[0])) {
    return formatComplexSQL(lines[0]);
  }
  
  // 重新组织SQL，确保适当的缩进和换行
  let formattedSQL = '';
  let indentLevel = 0;
  let needsExtraNewline = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();
    
    // 减少缩进的关键字
    if (upperLine.startsWith(')') || upperLine.startsWith('END') || upperLine.startsWith('ELSE')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }
    
    // 添加当前行（避免连续空行）
    if (formattedSQL.length > 0) {
      // 检查前一行是否已经添加了额外换行
      if (!needsExtraNewline) {
        formattedSQL += '\n';
      } else {
        needsExtraNewline = false;
      }
    }
    formattedSQL += '  '.repeat(indentLevel) + line;
    
    // 增加缩进的关键字
    if (upperLine.includes('(') && !upperLine.includes(')')) {
      indentLevel++;
    }
    
    // 判断是否需要在当前行后添加额外换行
    const needsNewlineAfter = (
      upperLine.startsWith('SELECT') || upperLine.startsWith('FROM') ||
      upperLine.startsWith('WHERE') || upperLine.startsWith('GROUP BY') ||
      upperLine.startsWith('ORDER BY') || upperLine.startsWith('HAVING') ||
      upperLine.startsWith('LIMIT') || upperLine.startsWith('OFFSET') ||
      upperLine.startsWith('WITH') || upperLine.startsWith('CASE') ||
      upperLine.startsWith('WHEN') || upperLine.startsWith('THEN')
    ) && i < lines.length - 1;
    
    // 处理逗号后的换行
    const endsWithComma = line.endsWith(',') && i < lines.length - 1;
    
    if (needsNewlineAfter || endsWithComma) {
      formattedSQL += '\n';
      needsExtraNewline = true;
    }
  }
  
  // 移除末尾的多余换行
  return formattedSQL.trim();
}

/**
 * 判断是否为复杂SQL
 * @param {string} sql - SQL语句
 * @returns {boolean} 是否为复杂SQL
 */
function isComplexSQL(sql) {
  const upperSQL = sql.toUpperCase();
  const complexityIndicators = [
    'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN',
    'CASE WHEN', 'SUBSTRING', 'EXISTS', 'IN (', 'GROUP BY', 'ORDER BY',
    'HAVING', 'UNION', 'WITH', 'OVER ('
  ];
  
  return complexityIndicators.some(indicator => upperSQL.includes(indicator)) && sql.length > 80;
}

/**
 * 格式化复杂SQL
 * @param {string} sql - 单行复杂SQL
 * @returns {string} 格式化后的SQL
 */
function formatComplexSQL(sql) {
  let formatted = sql;
  
  // 在主要关键字前添加换行
  const mainKeywords = [
    { pattern: /\bFROM\b/gi, replacement: '\nFROM' },
    { pattern: /\bJOIN\b/gi, replacement: '\nJOIN' },
    { pattern: /\bLEFT JOIN\b/gi, replacement: '\nLEFT JOIN' },
    { pattern: /\bRIGHT JOIN\b/gi, replacement: '\nRIGHT JOIN' },
    { pattern: /\bINNER JOIN\b/gi, replacement: '\nINNER JOIN' },
    { pattern: /\bWHERE\b/gi, replacement: '\nWHERE' },
    { pattern: /\bGROUP BY\b/gi, replacement: '\nGROUP BY' },
    { pattern: /\bORDER BY\b/gi, replacement: '\nORDER BY' },
    { pattern: /\bHAVING\b/gi, replacement: '\nHAVING' },
    { pattern: /\bLIMIT\b/gi, replacement: '\nLIMIT' },
    { pattern: /\bOFFSET\b/gi, replacement: '\nOFFSET' }
  ];
  
  mainKeywords.forEach(({ pattern, replacement }) => {
    formatted = formatted.replace(pattern, replacement);
  });
  
  // 处理CASE语句
  formatted = formatted.replace(/\bCASE\b/gi, '\nCASE');
  formatted = formatted.replace(/\bWHEN\b/gi, '\n  WHEN');
  formatted = formatted.replace(/\bTHEN\b/gi, ' THEN');
  formatted = formatted.replace(/\bELSE\b/gi, '\n  ELSE');
  formatted = formatted.replace(/\bEND\b/gi, '\nEND');
  
  // 处理IN子查询
  formatted = formatted.replace(/\bIN\s*\(/gi, 'IN (');
  
  // 清理多余空格和换行
  const lines = formatted.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // 重新组合，添加适当的缩进
  let result = '';
  let indentLevel = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();
    
    // 减少缩进
    if (upperLine.startsWith(')') || upperLine.startsWith('END') || upperLine.startsWith('ELSE')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }
    
    if (result.length > 0) {
      result += '\n';
    }
    result += '  '.repeat(indentLevel) + line;
    
    // 增加缩进
    if (upperLine.includes('(') && !upperLine.includes(')')) {
      indentLevel++;
    } else if (upperLine.startsWith('CASE') || upperLine.startsWith('WHEN') || upperLine.startsWith('ELSE')) {
      if (upperLine.startsWith('CASE')) indentLevel++;
    }
  }
  
  return result.trim();
}

/**
 * 格式化并高亮SQL - 终端模式
 * @param {string} sql - SQL语句
 * @param {string} database - 数据库类型
 * @returns {string} 格式化并高亮的SQL
 */
export function formatAndHighlightSQLForTerminal(sql, database = 'generic') {
  const formatted = formatSQLForDisplay(sql);
  return highlightSQLForTerminal(formatted, database);
}

/**
 * 格式化并高亮SQL - Ink模式
 * @param {string} sql - SQL语句
 * @param {string} database - 数据库类型
 * @returns {string} 格式化并高亮的SQL
 */
export function formatAndHighlightSQLForInk(sql, database = 'generic') {
  const formatted = formatSQLForDisplay(sql);
  return highlightSQLForInk(formatted, database);
}

/**
 * 为终端输出创建SQL显示（无行号）
 * @param {string} sql - SQL语句
 * @param {string} database - 数据库类型
 * @returns {string} 高亮的SQL
 */
export function createTerminalSQLDisplay(sql, database = 'generic') {
  const formattedSQL = formatSQLForDisplay(sql);
  return highlightSQLForTerminal(formattedSQL, database);
}

/**
 * 为Ink组件创建SQL显示数据（无行号）
 * @param {string} sql - SQL语句
 * @param {string} database - 数据库类型
 * @returns {Array} 包含高亮SQL的数组
 */
export function createInkSQLDisplayData(sql, database = 'generic') {
  const formattedSQL = formatSQLForDisplay(sql);
  const lines = formattedSQL.split('\n');
  
  return lines.map(line => ({
    content: highlightSQLForInk(line, database)
  }));
}

// 默认导出主要函数
export default {
  highlightSQLForTerminal,
  highlightSQLForInk,
  formatSQLForDisplay,
  formatAndHighlightSQLForTerminal,
  formatAndHighlightSQLForInk,
  createTerminalSQLDisplay,
  createInkSQLDisplayData
};