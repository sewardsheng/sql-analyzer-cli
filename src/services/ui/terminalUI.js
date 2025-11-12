// 在 ES 模块中使用 inquirer 的正确方式
import inquirer from 'inquirer';
// 在 ES 模块中使用 chalk 的正确方式
import chalk from 'chalk';
// 在 ES 模块中使用 ora 的正确方式
import ora from 'ora';
import readline from 'readline';
import { analyzeSqlWithGraph } from '../../core/graph/graphAnalyzer.js';
import { readConfig } from '../../utils/config.js';
import fs from 'fs/promises';
import { initEnvironment } from '../../utils/env.js';
import { configureSettings } from '../../utils/config.js';
import { learnDocuments, showKnowledgeStatus } from '../knowledge/learn.js';
import HistoryService from '../history/historyService.js';

/**
 * 显示欢迎信息
 */
function showWelcome() {
  console.log(chalk.cyan(`
╔═════════════════════════════════════════════════════════════╗
║                                                              ║
║                                                              ║
║     ▄▄▄▄▄     ▄▄▄▄▄▄▄▄     ▄▄▄▄   ▄▄▄▄▄▄▄▄                   ║
║     ██▀▀▀██   ██▀▀▀▀▀▀   ██▀▀▀▀█  ▀▀▀██▀▀▀                   ║
║     ██    ██  ██        ██▀          ██                      ║
║     ██    ██  ███████   ██           ██                      ║
║     ██    ██  ██        ██▄          ██                      ║
║     ██▄▄▄██   ██         ██▄▄▄▄█     ██                      ║
║     ▀▀▀▀▀     ▀▀           ▀▀▀▀      ▀▀                      ║
║                                                              ║
║       SQL语句智能分析扫描工具                                ║
║                                                              ║
╚════════════════════════════════════════════════════════════╝
  `));
}

/**
 * 显示主菜单
 */
async function showMainMenu(graphConfig) {
  console.log(chalk.cyan('\n请选择要执行的操作：\n'));
  
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '请选择功能:',
      choices: [
        { name: '1. 分析SQL语句', value: 'analyze' },
        { name: '2. 初始化环境配置', value: 'init' },
        { name: '3. 配置API密钥和模型设置', value: 'config' },
        { name: '4. 加载规则文档到知识库', value: 'learn' },
        { name: '5. 显示知识库状态', value: 'status' },
        { name: '6. 退出程序', value: 'exit' }
      ],
      pageSize: 10
    }
  ]);
  
  return action;
}

/**
 * 处理用户选择
 */
async function handleAction(action, graphConfig) {
  try {
    switch (action) {
        case 'analyze':
          await handleAnalyze(graphConfig);
          break;
        case 'init':
          await handleInit();
          break;
        case 'config':
          await handleConfig();
          break;
        case 'learn':
          await handleLearn();
          break;
        case 'status':
          await handleStatus();
          break;
        case 'exit':
          // 清屏
          console.clear();
          // 显示感谢信息
          console.log(chalk.green('\n感谢使用SQL分析器，再见！'));
          return false; // 返回false表示退出循环
        default:
          console.log(chalk.red('\n无效的选择，请重试'));
      }
  } catch (error) {
    console.error(chalk.red('\n操作过程中发生错误:'), error.message);
  }
  
  return true; // 返回true表示继续循环
}

/**
 * 处理初始化功能
 */
async function handleInit() {
  await initEnvironment();
}

/**
 * 处理配置功能
 */
async function handleConfig() {
  await configureSettings();
}

/**
 * 处理学习功能
 */
async function handleLearn(graphConfig) {
  console.log(chalk.blue('\n加载规则文档到知识库\n'));
  
  const rulesDir = await inquirer.prompt([
    {
      type: 'input',
      name: 'rulesDir',
      message: '请输入rules目录路径:',
      default: './rules'
    }
  ]);
  
  const reset = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'reset',
      message: '是否重置知识库?',
      default: false
    }
  ]);
  
  const options = {
    rulesDir: rulesDir.rulesDir,
    reset: reset.reset
  };
  
  await learnDocuments(options);
  return true;
}

/**
 * 处理状态查询功能
 */
/**
 * 处理知识库状态
 */
async function handleStatus() {
  try {
    // 使用ES模块导入方式调用showKnowledgeStatus函数
    const { showKnowledgeStatus } = await import('../knowledge/learn.js');
    await showKnowledgeStatus();
    return true;
    
  } catch (error) {
    console.error(chalk.red('检查状态过程中发生错误:'), error.message);
    return true;
  }
}

/**
 * Terminal UI模式
 */
async function terminalUIMode(options = {}) {
  // 显示欢迎信息和SZFZ宣传栏
  showWelcome();
  
  console.log(chalk.gray('使用方向键选择菜单，按回车确认\n'));
  
  // 读取配置
  const config = await readConfig();
  
  // 合并命令行选项和配置文件
  const apiKey = options.apiKey || config.apiKey;
  const baseURL = options.baseURL || config.baseURL;
  const model = options.model || config.model;
  
  // 检查API密钥
  if (!apiKey) {
    console.log(chalk.red('未配置API密钥，请先运行 "sql-analyzer config" 进行配置'));
    return;
  }
  
  // 准备LangGraph配置
  const graphConfig = {
    apiKey,
    baseURL,
    model,
    analysisDimensions: ['performance', 'security', 'standards']
  };
  
  // 初始化历史记录服务
  const historyService = new HistoryService();
  
  // 存储分析历史，用于连续分析和追问
  const analysisHistory = [];
  
  // 主循环
  while (true) {
    try {
      // 使用标准的inquirer提示
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: '请选择操作:',
          choices: [
            { name: '1. 分析SQL语句', value: 'analyze' },
            { name: '2. 从文件分析SQL', value: 'analyzeFile' },
            { name: '3. 连续分析多个SQL', value: 'batchAnalyze' },
            { name: '4. 管理历史记录', value: 'history' },
            { name: '5. 加载规则文档到知识库', value: 'learn' },
            { name: '6. 显示知识库状态', value: 'status' },
            { name: '7. 退出', value: 'exit' }
          ]
        }
      ]);
      
       switch (action) {
        case 'analyze':
          await handleAnalyze(graphConfig, analysisHistory, historyService);
          break;
        case 'analyzeFile':
          await handleAnalyzeFile(graphConfig, analysisHistory, historyService);
          break;
        case 'batchAnalyze':
          await handleBatchAnalyze(graphConfig, analysisHistory, historyService);
          break;
        case 'history':
          const shouldContinueHistory = await handleHistory(historyService);
          if (!shouldContinueHistory) {
            // 清屏
            console.clear();
            // 显示感谢信息
            console.log(chalk.blue('感谢使用SQL分析器，再见！'));
            // 退出程序
            process.exit(0);
            return;
          }
          break;
        case 'learn':
          const shouldContinueLearn = await handleLearn(graphConfig);
          if (!shouldContinueLearn) {
            // 清屏
            console.clear();
            // 显示感谢信息
            console.log(chalk.blue('感谢使用SQL分析器，再见！'));
            // 退出程序
            process.exit(0);
            return;
          }
          break;
        case 'status':
          const shouldContinueStatus = await handleStatus();
          if (!shouldContinueStatus) {
            // 清屏
            console.clear();
            // 显示感谢信息
            console.log(chalk.blue('感谢使用SQL分析器，再见！'));
            // 退出程序
            process.exit(0);
            return;
          }
          break;
        case 'exit':
          // 清屏
          console.clear();
          // 显示感谢信息
          console.log(chalk.blue('感谢使用SQL分析器，再见！'));
          // 退出程序
          process.exit(0);
          return;
      }
      
      console.log(); // 添加空行分隔
      
    } catch (error) {
      if (error.isTtyError) {
        console.log(chalk.red('无法运行Terminal UI模式，当前环境不支持'));
        return;
      } else {
        console.error(chalk.red('发生错误:'), error.message);
      }
    }
  }
}

/**
 * 处理SQL分析
 */
async function handleAnalyze(graphConfig, analysisHistory, historyService) {
  const { sql } = await inquirer.prompt([
    {
      type: 'input',
      name: 'sql',
      message: '请输入要分析的SQL语句:',
      validate: (input) => input.trim() !== '' || 'SQL语句不能为空'
    }
  ]);
  
  const dbTypeResponse = await inquirer.prompt([
    {
      type: 'list',
      name: 'dbType',
      message: '选择数据库类型:',
      choices: ['mysql', 'postgresql', 'oracle', 'sqlserver'],
      default: 'mysql'
    }
  ]);
  
  const dbTypeSelected = dbTypeResponse.dbType;
  
  // 分析SQL
  const spinner = ora('正在分析SQL语句...').start();
  
  try {
    const result = await analyzeSqlWithGraph(sql, null, { ...graphConfig, databaseType: dbTypeSelected });
    spinner.succeed('分析完成');
    
    // 显示结果
    displayResult(result);
    
    // 保存到持久化历史记录
    const recordId = historyService.saveAnalysis({
      sql: sql,
      databaseType: dbTypeSelected,
      result,
      type: 'single'
    });
    
    // 添加到内存历史记录
    const analysisRecord = {
      id: recordId,
      sql: sql,
      databaseType: dbTypeSelected,
      result,
      timestamp: new Date().toISOString(),
      type: 'single'
    };
    analysisHistory.push(analysisRecord);
    
    // 询问是否需要继续追问
    await handleFollowUpAfterAnalysis(graphConfig, analysisHistory, analysisRecord, historyService);
    
  } catch (error) {
    spinner.fail('分析失败');
    console.error(chalk.red('错误:'), error.message);
  }
}

/**
 * 处理文件分析
 */
async function handleAnalyzeFile(graphConfig, analysisHistory, historyService) {
  const filePath = await inquirer.prompt([
    {
      type: 'input',
      name: 'filePath',
      message: '请输入SQL文件路径:',
      validate: async (input) => {
        if (input.trim() === '') return '文件路径不能为空';
        
        try {
          await fs.access(input);
          return true;
        } catch {
          return '文件不存在或无法访问';
        }
      }
    }
  ]);
  
  const databaseType = await inquirer.prompt([
    {
      type: 'list',
      name: 'databaseType',
      message: '选择数据库类型:',
      choices: ['mysql', 'postgresql', 'oracle', 'sqlserver'],
      default: 'mysql'
    }
  ]);
  
  // 读取文件内容
  const spinner = ora('正在读取文件...').start();
  
  try {
    const sql = await fs.readFile(filePath.filePath, 'utf8');
    spinner.succeed('文件读取完成');
    
    // 分析SQL
    spinner.start('正在分析SQL语句...');
    const result = await analyzeSqlWithGraph(sql, filePath.filePath, { ...graphConfig, databaseType: databaseType.databaseType });
    spinner.succeed('分析完成');
    
    // 显示结果
    displayResult(result);
    
    // 保存到持久化历史记录
    const recordId = historyService.saveAnalysis({
      sql,
      databaseType: databaseType.databaseType,
      result,
      type: 'file',
      filePath: filePath.filePath
    });
    
    // 添加到内存历史记录
    const analysisRecord = {
      id: recordId,
      sql,
      databaseType: databaseType.databaseType,
      filePath: filePath.filePath,
      result,
      timestamp: new Date().toISOString(),
      type: 'file'
    };
    analysisHistory.push(analysisRecord);
    
    // 询问是否需要继续追问
    await handleFollowUpAfterAnalysis(graphConfig, analysisHistory, analysisRecord, historyService);
    
  } catch (error) {
    spinner.fail('分析失败');
    console.error(chalk.red('错误:'), error.message);
  }
}

/**
 * 处理批量分析
 */
async function handleBatchAnalyze(graphConfig, analysisHistory, historyService) {
  console.log(chalk.blue('\n连续分析模式'));
  console.log(chalk.gray('您可以连续输入多个SQL语句进行分析，输入"完成"结束分析\n'));
  
  const databaseType = await inquirer.prompt([
    {
      type: 'list',
      name: 'databaseType',
      message: '选择数据库类型:',
      choices: ['mysql', 'postgresql', 'oracle', 'sqlserver'],
      default: 'mysql'
    }
  ]);
  
  const dbTypeSelected = databaseType.databaseType;
  
  let continueAnalysis = true;
  let sqlCount = 0;
  
  while (continueAnalysis) {
    const { sql } = await inquirer.prompt([
      {
        type: 'input',
        name: 'sql',
        message: `请输入第 ${sqlCount + 1} 个SQL语句 (输入"完成"结束):`,
        validate: (input) => {
          if (input.trim() === '') return 'SQL语句不能为空';
          if (input.trim() === '完成') return true;
          return true;
        }
      }
    ]);
    
    // 检查是否要结束
    if (sql && sql.trim() === '完成') {
      continueAnalysis = false;
      break;
    }
    
    // 分析SQL
    const spinner = ora(`正在分析第 ${sqlCount + 1} 个SQL语句...`).start();
    
    try {
      const result = await analyzeSqlWithGraph(sql, null, { ...graphConfig, databaseType: dbTypeSelected });
      spinner.succeed(`第 ${sqlCount + 1} 个SQL分析完成`);
      
      // 显示结果
      console.log(chalk.blue(`\n第 ${sqlCount + 1} 个SQL分析结果\n`));
      displayResult(result);
      
      // 保存到持久化历史记录
      const recordId = historyService.saveAnalysis({
        sql: sql,
        databaseType: dbTypeSelected,
        result,
        type: 'batch',
        batchId: new Date().getTime()
      });
      
      // 添加到内存历史记录
      analysisHistory.push({
        id: recordId,
        sql: sql,
        databaseType: dbTypeSelected,
        result,
        timestamp: new Date().toISOString(),
        type: 'batch',
        batchId: new Date().getTime() // 用于标识同一批次的分析
      });
      
      sqlCount++;
      
    } catch (error) {
      spinner.fail(`第 ${sqlCount + 1} 个SQL分析失败`);
      console.error(chalk.red('错误:'), error.message);
    }
    
    console.log(); // 添加空行分隔
  }
  
  console.log(chalk.green(`连续分析完成，共分析了 ${sqlCount} 个SQL语句`));
}

/**
 * 处理追问的特殊分析函数
 */
async function processFollowUp(question, originalAnalysis, config) {
  // 使用ES模块导入方式
  const { ChatOpenAI } = await import('@langchain/openai');
  const { HumanMessage, SystemMessage } = await import('@langchain/core/messages');
  
  // 读取配置
  const appConfig = await readConfig();
  
  // 初始化LLM
  const llm = new ChatOpenAI({
    modelName: config.model || appConfig.model,
    temperature: 0.1,
    maxTokens: 2000,
    configuration: {
      apiKey: config.apiKey,
      baseURL: config.baseURL
    }
  });
  
  // 构建追问的系统提示
  const followUpSystemPrompt = `
你是一个专业的SQL分析专家，负责回答用户关于SQL分析结果的进一步问题。

请基于以下原始SQL和分析结果，回答用户的问题。回答应该：
1. 针对用户的具体问题提供准确、专业的回答
2. 如果问题涉及优化建议，请提供具体的代码示例
3. 如果问题涉及性能问题，请提供详细的解释和改进方案
4. 保持回答简洁明了，重点突出

原始SQL: ${originalAnalysis.sql}
数据库类型: ${originalAnalysis.databaseType}
原始分析结果: ${JSON.stringify(originalAnalysis.result.analysisResult, null, 2)}
  `;
  
  // 构建消息
  const messages = [
    new SystemMessage(followUpSystemPrompt),
    new HumanMessage(question)
  ];
  
  // 调用LLM
  const response = await llm.invoke(messages);
  
  // 返回结果
  return {
    question,
    answer: response.content,
    originalAnalysis: originalAnalysis.result
  };
}

/**
 * 处理查看历史记录
 */
/**
 * 处理历史记录管理
 */
async function handleHistory(historyService) {
  while (true) {
    console.log(chalk.blue('\n历史记录管理\n'));
    
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '请选择操作:',
        choices: [
          { name: '1. 查看历史记录列表', value: 'list' },
          { name: '2. 查看历史记录详情', value: 'detail' },
          { name: '3. 删除历史记录', value: 'delete' },
          { name: '4. 清空所有历史记录', value: 'clear' },
          { name: '5. 查看历史记录统计', value: 'stats' },
          { name: '6. 返回主菜单', value: 'back' }
        ]
      }
    ]);
    
    switch (action) {
      case 'list':
        await handleHistoryList(historyService);
        break;
      case 'detail':
        await handleHistoryDetail(historyService);
        break;
      case 'delete':
        await handleHistoryDelete(historyService);
        break;
      case 'clear':
        await handleHistoryClear(historyService);
        break;
      case 'stats':
        await handleHistoryStats(historyService);
        break;
      case 'back':
        return true; // 返回主菜单
    }
  }
}

/**
 * 处理查看历史记录列表
 */
async function handleHistoryList(historyService) {
  try {
    const historyList = historyService.getAllHistory();
    
    if (historyList.length === 0) {
      console.log(chalk.yellow('📝 暂无历史记录'));
      return;
    }
    
    // 创建表格
    // 使用ES模块导入方式
    const cliTable3 = await import('cli-table3');
    const Table = cliTable3.default || cliTable3;
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
    
    console.log(chalk.green('📋 SQL分析历史记录列表'));
    console.log(table.toString());
    console.log(chalk.gray(`\n共 ${historyList.length} 条记录`));
    
  } catch (error) {
    console.error(chalk.red('❌ 获取历史记录失败:'), error.message);
  }
}

/**
 * 处理查看历史记录详情
 */
async function handleHistoryDetail(historyService) {
  try {
    // 获取历史记录列表
    const historyList = historyService.getAllHistory();
    
    if (historyList.length === 0) {
      console.log(chalk.yellow('📝 暂无历史记录'));
      return;
    }
    
    // 让用户选择要查看的历史记录
    const { selectedId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedId',
        message: '请选择要查看详情的历史记录:',
        choices: historyList.map(record => ({
          name: `${record.id} - ${record.date} ${record.time} - ${record.sqlPreview}`,
          value: record.id
        }))
      }
    ]);
    
    // 获取历史记录详情
    const record = historyService.getHistoryById(selectedId);
    
    if (!record) {
      console.log(chalk.red(`❌ 未找到ID为 ${selectedId} 的历史记录`));
      return;
    }
    
    console.log(chalk.green('📋 历史记录详情'));
    console.log(chalk.cyan('────────────────────────────────────'));
    console.log(`${chalk.blue('ID:')} ${record.id}`);
    console.log(`${chalk.blue('时间:')} ${new Date(record.timestamp).toLocaleString('zh-CN')}`);
    console.log(`${chalk.blue('数据库类型:')} ${getDatabaseLabel(record.databaseType)}`);
    console.log(`${chalk.blue('分析类型:')} ${getTypeLabel(record.type)}`);
    
    if (record.parentId) {
      console.log(`${chalk.blue('父记录ID:')} ${record.parentId}`);
    }
    
    console.log(chalk.cyan('\n────────────────────────────────────'));
    console.log(chalk.blue('SQL语句:'));
    console.log(record.sql);
    
    console.log(chalk.cyan('\n────────────────────────────────────'));
    console.log(chalk.blue('分析结果:'));
    console.log(JSON.stringify(record.result, null, 2));
    
  } catch (error) {
    console.error(chalk.red('❌ 获取历史记录详情失败:'), error.message);
  }
}

/**
 * 处理删除历史记录
 */
async function handleHistoryDelete(historyService) {
  try {
    // 获取历史记录列表
    const historyList = historyService.getAllHistory();
    
    if (historyList.length === 0) {
      console.log(chalk.yellow('📝 暂无历史记录'));
      return;
    }
    
    // 让用户选择要删除的历史记录
    const { selectedId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedId',
        message: '请选择要删除的历史记录:',
        choices: historyList.map(record => ({
          name: `${record.id} - ${record.date} ${record.time} - ${record.sqlPreview}`,
          value: record.id
        }))
      }
    ]);
    
    // 确认删除
    const { confirmDelete } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmDelete',
        message: `确定要删除ID为 ${selectedId} 的历史记录吗？此操作不可恢复`,
        default: false
      }
    ]);
    
    if (!confirmDelete) {
      console.log(chalk.gray('操作已取消'));
      return;
    }
    
    // 删除历史记录
    const success = historyService.deleteHistory(selectedId);
    
    if (success) {
      console.log(chalk.green(`✅ 已成功删除ID为 ${selectedId} 的历史记录`));
    } else {
      console.log(chalk.red(`❌ 删除失败，未找到ID为 ${selectedId} 的历史记录`));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ 删除历史记录失败:'), error.message);
  }
}

/**
 * 处理清空所有历史记录
 */
async function handleHistoryClear(historyService) {
  try {
    // 获取统计信息
    const stats = historyService.getHistoryStats();
    
    if (stats.total === 0) {
      console.log(chalk.yellow('📝 历史记录已经是空的'));
      return;
    }
    
    // 确认清空
    const { confirmClear } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmClear',
        message: `确定要清空所有 ${stats.total} 条历史记录吗？此操作不可恢复`,
        default: false
      }
    ]);
    
    if (!confirmClear) {
      console.log(chalk.gray('操作已取消'));
      return;
    }
    
    // 清空历史记录
    const success = historyService.clearAllHistory();
    
    if (success) {
      console.log(chalk.green('✅ 已成功清空所有历史记录'));
    } else {
      console.log(chalk.red('❌ 清空历史记录失败'));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ 清空历史记录失败:'), error.message);
  }
}

/**
 * 处理查看历史记录统计
 */
async function handleHistoryStats(historyService) {
  try {
    // 获取统计信息
    const stats = historyService.getHistoryStats();
    
    console.log(chalk.green('📊 历史记录统计信息'));
    console.log(chalk.cyan('────────────────────────────────────'));
    console.log(`${chalk.blue('总记录数:')} ${stats.total}`);
    
    // 按类型统计
    console.log(chalk.cyan('\n按分析类型统计:'));
    if (Object.keys(stats.byType).length === 0) {
      console.log(chalk.gray('  暂无数据'));
    } else {
      Object.entries(stats.byType).forEach(([type, count]) => {
        const percentage = ((count / stats.total) * 100).toFixed(1);
        console.log(`  ${getTypeLabel(type)}: ${count} 条 (${percentage}%)`);
      });
    }
    
    // 按数据库类型统计
    console.log(chalk.cyan('\n按数据库类型统计:'));
    if (Object.keys(stats.byDatabase).length === 0) {
      console.log(chalk.gray('  暂无数据'));
    } else {
      Object.entries(stats.byDatabase).forEach(([db, count]) => {
        const percentage = ((count / stats.total) * 100).toFixed(1);
        console.log(`  ${getDatabaseLabel(db)}: ${count} 条 (${percentage}%)`);
      });
    }
    
    console.log(chalk.cyan('────────────────────────────────────'));
    
  } catch (error) {
    console.error(chalk.red('❌ 获取统计信息失败:'), error.message);
  }
}

/**
 * 获取分析类型的显示标签
 * @param {string} type - 分析类型
 * @returns {string} 显示标签
 */
function getTypeLabel(type) {
  const labels = {
    'single': '单个分析',
    'file': '文件分析',
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
    'sqlserver': 'SQL Server'
  };
  return labels[db] || db;
}



/**
 * 显示分析结果
 */
function displayResult(result) {
  console.log(chalk.blue('\nSQL分析结果\n'));
  
  // 检查是否有错误
  if (result.error) {
    console.log(chalk.red(`分析失败: ${result.error}`));
    return;
  }
  
  // 显示分析摘要
  if (result.analysisResult && result.analysisResult.summary) {
    console.log(chalk.green('分析摘要:'));
    console.log(result.analysisResult.summary);
    console.log();
  }
  
  // 显示发现的问题
  if (result.analysisResult && result.analysisResult.issues && result.analysisResult.issues.length > 0) {
    console.log(chalk.yellow('发现的问题:'));
    result.analysisResult.issues.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.severity}] ${issue.type}`);
      console.log(`   描述: ${issue.description}`);
      if (issue.location) {
        console.log(`   位置: ${issue.location}`);
      }
      console.log(`   建议: ${issue.recommendation}`);
      console.log();
    });
  } else {
    console.log(chalk.green('未发现明显问题'));
    console.log();
  }
  
  // 显示改进建议
  if (result.analysisResult && result.analysisResult.suggestions && result.analysisResult.suggestions.length > 0) {
    console.log(chalk.blue('改进建议:'));
    result.analysisResult.suggestions.forEach((suggestion, index) => {
      console.log(`${index + 1}. [${suggestion.category}] ${suggestion.description}`);
      if (suggestion.example) {
        console.log(`   示例: ${suggestion.example}`);
      }
      console.log();
    });
  }
  
  // 显示性能指标
  if (result.analysisResult && result.analysisResult.metrics) {
    console.log(chalk.magenta('性能指标:'));
    const metrics = result.analysisResult.metrics;
    console.log(`- 复杂度: ${metrics.complexity || '未知'}`);
    console.log(`- 预估执行时间: ${metrics.estimatedExecutionTime || '未知'}`);
    console.log(`- 资源使用: ${metrics.resourceUsage || '未知'}`);
    console.log();
  }
  
  // 显示执行信息
  if (result.metadata) {
    console.log(chalk.gray('执行信息:'));
    console.log(`- 分析类型: ${result.metadata.analysisType || '综合分析'}`);
    if (result.metadata.duration) {
      console.log(`- 执行时间: ${(result.metadata.duration / 1000).toFixed(2)}秒`);
    }
    console.log();
  }
}

/**
 * 显示追问结果
 */
function displayFollowUpResult(result) {
  console.log(chalk.green('问题:'));
  console.log(result.question);
  console.log();
  
  console.log(chalk.blue('回答:'));
  console.log(result.answer);
  console.log();
}

/**
 * 获取类型显示名称
 */
function getTypeDisplayName(type) {
  switch (type) {
    case 'single':
      return '单次分析';
    case 'file':
      return '文件分析';
    case 'batch':
      return '批量分析';
    case 'followup':
      return '追问分析';
    default:
      return '未知类型';
  }
}

export { terminalUIMode };

/**
 * 处理分析后的追问功能
 */
async function handleFollowUpAfterAnalysis(graphConfig, analysisHistory, analysisRecord, historyService) {
  console.log(chalk.blue('\n您是否需要对此分析结果进行追问？\n'));
  
  const { needFollowUp } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'needFollowUp',
      message: '是否需要对此分析结果进行追问？',
      default: false
    }
  ]);
  
  if (!needFollowUp) {
    return;
  }
  
  // 输入追问
  const { question } = await inquirer.prompt([
    {
      type: 'input',
      name: 'question',
      message: '请输入您的问题:',
      validate: (input) => input.trim() !== '' || '问题不能为空'
    }
  ]);
  
  // 构建追问上下文
  const context = `
原始SQL: ${analysisRecord.sql}
数据库类型: ${analysisRecord.databaseType}
原始分析结果: ${JSON.stringify(analysisRecord.result.analysisResult, null, 2)}

用户问题: ${question}
  `;
  
  // 处理追问
  const spinner = ora('正在处理您的问题...').start();
  
  try {
    // 使用相同的分析器处理追问，但修改系统提示
    const followUpConfig = {
      ...graphConfig,
      databaseType: analysisRecord.databaseType,
      isFollowUp: true,
      context
    };
    
    // 创建一个特殊的分析函数来处理追问
    const result = await processFollowUp(question, analysisRecord, followUpConfig);
    
    spinner.succeed('问题处理完成');
    
    // 显示结果
    console.log(chalk.blue('\n追问结果\n'));
    displayFollowUpResult(result);
    
    // 添加到历史记录
    const recordId = historyService.saveAnalysis({
      sql: analysisRecord.sql,
      databaseType: analysisRecord.databaseType,
      question,
      result,
      type: 'followup',
      parentAnalysis: analysisRecord
    });
    
    analysisHistory.push({
      id: recordId,
      sql: analysisRecord.sql,
      databaseType: analysisRecord.databaseType,
      question,
      result,
      timestamp: new Date().toISOString(),
      type: 'followup',
      parentAnalysis: analysisRecord
    });
    
    // 询问是否需要继续追问
      await handleFollowUpAfterAnalysis(graphConfig, analysisHistory, analysisRecord, historyService);
    
  } catch (error) {
    spinner.fail('问题处理失败');
    console.error(chalk.red('错误:'), error.message);
  }
}