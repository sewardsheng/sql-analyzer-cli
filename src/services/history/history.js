/**
 * SQL分析历史记录命令处理模块
 * 实现历史记录的管理功能，包括查看、删除和统计
 */

import chalk from 'chalk';
import HistoryService from './historyService.js';
import Table from 'cli-table3';
import readline from 'readline';

// 创建历史记录服务实例
const historyService = new HistoryService();

/**
 * 显示所有历史记录列表
 */
function listHistory() {
  try {
    const historyList = historyService.getAllHistory();
    
    console.clear();
    console.log(chalk.cyan('╔═════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║                    SQL分析历史记录                          ║'));
    console.log(chalk.cyan('╚═════════════════════════════════════════════════════════════╝'));
    console.log('');
    
    if (historyList.length === 0) {
      console.log(chalk.yellow('📝 暂无历史记录\n'));
      return;
    }
    
    // 创建表格
    const table = new Table({
      head: [
        chalk.cyan('ID'),
        chalk.cyan('日期'),
        chalk.cyan('时间'),
        chalk.cyan('数据库'),
        chalk.cyan('类型'),
        chalk.cyan('SQL预览')
      ],
      colWidths: [20, 12, 10, 12, 10, 40],
      wordWrap: true
    });
    
    // 添加数据行
    historyList.forEach(record => {
      const typeLabel = getTypeLabel(record.type);
      const dbLabel = getDatabaseLabel(record.databaseType);
      
      table.push([
        record.id,
        record.date,
        record.time,
        chalk.blue(dbLabel),
        chalk.magenta(typeLabel),
        record.sqlPreview
      ]);
    });
    
    console.log(table.toString());
    console.log(chalk.gray(`\n共 ${historyList.length} 条记录`));
    console.log(chalk.yellow('\n💡 提示: 使用 "sql-analyzer history detail <id>" 查看详情\n'));
    
  } catch (error) {
    console.error(chalk.red('❌ 获取历史记录失败:'), error.message);
    process.exit(1);
  }
}

/**
 * 显示指定ID的历史记录详情
 * @param {string} id - 历史记录ID
 */
function showHistoryDetail(id) {
  try {
    const record = historyService.getHistoryById(id);
    
    if (!record) {
      console.log(chalk.red(`❌ 未找到ID为 ${id} 的历史记录`));
      process.exit(1);
    }
    
    console.clear();
    console.log(chalk.cyan('╔═════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║                    历史记录详情                             ║'));
    console.log(chalk.cyan('╚═════════════════════════════════════════════════════════════╝'));
    console.log('');
    
    console.log(chalk.blue('基本信息:'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(`${chalk.cyan('ID:')} ${record.id}`);
    console.log(`${chalk.cyan('时间:')} ${new Date(record.timestamp).toLocaleString('zh-CN')}`);
    console.log(`${chalk.cyan('数据库类型:')} ${getDatabaseLabel(record.databaseType)}`);
    console.log(`${chalk.cyan('分析类型:')} ${getTypeLabel(record.type)}`);
    
    if (record.parentId) {
      console.log(`${chalk.cyan('父记录ID:')} ${record.parentId}`);
    }
    
    console.log(chalk.gray('\n─'.repeat(60)));
    console.log(chalk.blue('SQL语句:'));
    console.log(chalk.white(record.sql));
    
    console.log(chalk.gray('\n─'.repeat(60)));
    console.log(chalk.blue('分析结果:'));
    console.log(JSON.stringify(record.result, null, 2));
    console.log('');
    
  } catch (error) {
    console.error(chalk.red('❌ 获取历史记录详情失败:'), error.message);
    process.exit(1);
  }
}

/**
 * 删除指定ID的历史记录
 * @param {string} id - 历史记录ID
 */
function deleteHistory(id) {
  try {
    const success = historyService.deleteHistory(id);
    
    if (success) {
      console.log(chalk.green(`✅ 已成功删除ID为 ${id} 的历史记录`));
    } else {
      console.log(chalk.red(`❌ 删除失败，未找到ID为 ${id} 的历史记录`));
      process.exit(1);
    }
    
  } catch (error) {
    console.error(chalk.red('❌ 删除历史记录失败:'), error.message);
    process.exit(1);
  }
}

/**
 * 清空所有历史记录
 */
function clearAllHistory() {
  try {
    const stats = historyService.getHistoryStats();
    
    if (stats.total === 0) {
      console.log(chalk.yellow('📝 历史记录已经是空的'));
      return;
    }
    
    // 确认操作
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(
      chalk.yellow(`确定要清空所有 ${stats.total} 条历史记录吗？此操作不可恢复 (y/N): `),
      (answer) => {
        rl.close();
        
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          const success = historyService.clearAllHistory();
          
          if (success) {
            console.log(chalk.green('✅ 已成功清空所有历史记录'));
          } else {
            console.log(chalk.red('❌ 清空历史记录失败'));
            process.exit(1);
          }
        } else {
          console.log(chalk.gray('操作已取消'));
        }
      }
    );
    
  } catch (error) {
    console.error(chalk.red('❌ 清空历史记录失败:'), error.message);
    process.exit(1);
  }
}

/**
 * 显示历史记录统计信息
 */
function showHistoryStats() {
  try {
    const stats = historyService.getHistoryStats();
    
    console.clear();
    console.log(chalk.cyan('╔═════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║                    历史记录统计                             ║'));
    console.log(chalk.cyan('╚═════════════════════════════════════════════════════════════╝'));
    console.log('');
    
    console.log(chalk.blue('总体统计:'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(`${chalk.cyan('总记录数:')} ${chalk.white(stats.total)}`);
    
    // 按类型统计
    console.log('');
    console.log(chalk.gray('─'.repeat(60)));
    console.log(chalk.blue('按分析类型统计:'));
    if (Object.keys(stats.byType).length === 0) {
      console.log(chalk.gray('  暂无数据'));
    } else {
      Object.entries(stats.byType).forEach(([type, count]) => {
        const percentage = ((count / stats.total) * 100).toFixed(1);
        console.log(`  ${chalk.cyan(getTypeLabel(type))}: ${chalk.white(count)} 条 (${chalk.yellow(percentage + '%')})`);
      });
    }
    
    // 按数据库类型统计
    console.log('');
    console.log(chalk.gray('─'.repeat(60)));
    console.log(chalk.blue('按数据库类型统计:'));
    if (Object.keys(stats.byDatabase).length === 0) {
      console.log(chalk.gray('  暂无数据'));
    } else {
      Object.entries(stats.byDatabase).forEach(([db, count]) => {
        const percentage = ((count / stats.total) * 100).toFixed(1);
        console.log(`  ${chalk.cyan(getDatabaseLabel(db))}: ${chalk.white(count)} 条 (${chalk.yellow(percentage + '%')})`);
      });
    }
    
    console.log(chalk.gray('─'.repeat(60)));
    console.log('');
    
  } catch (error) {
    console.error(chalk.red('❌ 获取统计信息失败:'), error.message);
    process.exit(1);
  }
}

/**
 * 获取分析类型的显示标签
 * @param {string} type - 分析类型
 * @returns {string} 显示标签
 */
function getTypeLabel(type) {
  const labels = {
    'command': '命令输入',
    'file': '文件输入',
    'single': '单个分析',
    'batch': '批量分析',
    'followup': '追问'
  };
  return labels[type] || type;
}

/**
 * 获取数据库类型的显示标签
 * @param {string} db - 数据库类型
 * @returns {string} 显示标签
 */
function getDatabaseLabel(db) {
  const labels = {
    'mysql': 'MySQL',
    'postgresql': 'PostgreSQL',
    'oracle': 'Oracle',
    'sqlserver': 'SQL Server',
    'clickhouse': 'ClickHouse',
    'generic': '通用',
    'sqlite': 'SQLite',
    'mongodb': 'MongoDB',
    'redis': 'Redis'
  };
  return labels[db] || db || '未知';
}

export {
  listHistory,
  showHistoryDetail,
  deleteHistory,
  clearAllHistory,
  showHistoryStats
};