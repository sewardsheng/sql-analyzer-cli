/**
 * 知识库搜索命令模块
 * 提供知识库内容搜索功能
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import { retrieveKnowledge } from '../../core/knowledgeBase.js';

/**
 * 注册search命令
 * @param {Object} program - commander程序对象
 */
function register(program) {
  program
    .command('search <query>')
    .description('搜索知识库中的规则和最佳实践')
    .option('-k, --count <number>', '返回结果数量', '5')
    .action(async (query, options) => {
      try {
        await searchKnowledge(query, options);
        process.exit(0);
      } catch (error) {
        console.error(chalk.red('❌ 搜索失败:'), error.message);
        process.exit(1);
      }
    });
}

/**
 * 搜索知识库
 * @param {string} query - 搜索查询
 * @param {Object} options - 搜索选项
 */
async function searchKnowledge(query, options) {
  const k = parseInt(options.count) || 5;
  
  console.log(chalk.blue('\n🔍 正在搜索知识库...'));
  console.log(chalk.gray(`查询: "${query}"`));
  console.log(chalk.gray(`返回数量: ${k}\n`));
  
  // 调用知识库检索
  const result = await retrieveKnowledge(query, k);
  
  if (!result.success) {
    console.log(chalk.yellow('⚠️ 搜索失败:'), result.error);
    console.log(chalk.gray('\n💡 提示: 请确保知识库已初始化\n'));
    return;
  }
  
  const documents = result.data.documents;
  
  if (documents.length === 0) {
    console.log(chalk.yellow('📝 未找到相关内容\n'));
    return;
  }
  
  // 显示搜索结果
  displaySearchResults(documents, query);
}

/**
 * 显示搜索结果
 * @param {Array} documents - 文档列表
 * @param {string} query - 搜索查询
 */
function displaySearchResults(documents, query) {
  console.log(chalk.cyan('╔═════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║                    知识库搜索结果                           ║'));
  console.log(chalk.cyan('╚═════════════════════════════════════════════════════════════╝'));
  console.log('');
  
  console.log(chalk.green(`✓ 找到 ${documents.length} 条相关内容\n`));
  
  documents.forEach((doc, index) => {
    console.log(chalk.blue(`[${index + 1}] ${getSourceLabel(doc.metadata)}`));
    console.log(chalk.gray('─'.repeat(60)));
    
    // 显示文档内容（高亮关键词）
    const content = doc.pageContent;
    const highlightedContent = highlightKeywords(content, query);
    
    // 限制显示长度
    const maxLength = 300;
    let displayContent = highlightedContent;
    if (content.length > maxLength) {
      displayContent = highlightedContent.substring(0, maxLength) + '...';
    }
    
    console.log(displayContent);
    
    // 显示元数据
    if (doc.metadata) {
      console.log('');
      console.log(chalk.gray(`来源: ${doc.metadata.source || '未知'}`));
      if (doc.metadata.title) {
        console.log(chalk.gray(`标题: ${doc.metadata.title}`));
      }
      if (doc.metadata.section) {
        console.log(chalk.gray(`章节: ${doc.metadata.section}`));
      }
    }
    
    console.log('');
  });
}

/**
 * 获取来源标签
 * @param {Object} metadata - 元数据
 * @returns {string} 来源标签
 */
function getSourceLabel(metadata) {
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
}

/**
 * 高亮显示关键词
 * @param {string} text - 文本内容
 * @param {string} keywords - 关键词
 * @returns {string} 高亮后的文本
 */
function highlightKeywords(text, keywords) {
  if (!keywords || !text) return text;
  
  // 将关键词分割成单词
  const words = keywords.toLowerCase().split(/\s+/);
  
  let result = text;
  words.forEach(word => {
    if (word.length > 2) { // 忽略太短的词
      // 使用正则表达式进行不区分大小写的替换
      const regex = new RegExp(`(${escapeRegExp(word)})`, 'gi');
      result = result.replace(regex, chalk.yellow.bold('$1'));
    }
  });
  
  return result;
}

/**
 * 转义正则表达式特殊字符
 * @param {string} string - 字符串
 * @returns {string} 转义后的字符串
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default {
  register
};