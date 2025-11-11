#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
require('dotenv').config();

// 设置全局错误处理
const { setupGlobalErrorHandlers, logInfo } = require('../src/utils/logger');
setupGlobalErrorHandlers();

// 记录CLI启动
logInfo(`SQL分析器CLI启动，命令: ${process.argv.join(' ')}`);

// 导入CLI模块
const { analyzeSql } = require('../src/index');

// 配置CLI程序
program
  .name('sql-analyzer')
  .description('SQL语句智能分析与扫描工具')
  .version('1.0.0');

// 分析SQL命令
program
  .command('analyze')
  .description('分析SQL语句的性能、安全性和规范性')
  .option('-s, --sql <sql>', '要分析的SQL语句')
  .option('-f, --file <file>', '包含SQL语句的文件路径')
  .option('-d, --database <type>', '数据库类型 (mysql, postgresql, oracle, sqlserver)', 'mysql')
  .option('--api-key <key>', 'OpenAI API密钥')
  .option('--base-url <url>', 'API基础URL')
  .option('--model <model>', '使用的模型名称')
  .action(async (options) => {
    try {
      await analyzeSql(options);
    } catch (error) {
      console.error('分析过程中发生错误:', error.message);
      process.exit(1);
    }
  });

// 交互式分析命令
program
  .command('interactive')
  .description('进入交互式SQL分析模式')
  .option('--api-key <key>', 'OpenAI API密钥')
  .option('--base-url <url>', 'API基础URL')
  .option('--model <model>', '使用的模型名称')
  .action(async (options) => {
    try {
      const { interactiveMode } = require('../src/services/interactive');
      await interactiveMode(options);
    } catch (error) {
      console.error('交互模式中发生错误:', error.message);
      process.exit(1);
    }
  });

// 初始化命令
program
  .command('init')
  .description('初始化环境配置文件')
  .action(async () => {
    try {
      const { initEnvironment } = require('../src/utils/env');
      await initEnvironment();
    } catch (error) {
      console.error('初始化过程中发生错误:', error.message);
      process.exit(1);
    }
  });

// 配置命令
program
  .command('config')
  .description('配置API密钥和模型设置')
  .action(async () => {
    try {
      const { configureSettings } = require('../src/utils/config');
      await configureSettings();
    } catch (error) {
      console.error('配置过程中发生错误:', error.message);
      process.exit(1);
    }
  });

// 学习命令
program
  .command('learn')
  .description('加载rules目录中的文档到知识库，供Agent使用')
  .option('-r, --rules-dir <dir>', 'rules目录路径', './rules')
  .option('--reset', '重置知识库')
  .option('--api-key <key>', 'OpenAI API密钥')
  .option('--base-url <url>', 'API基础URL')
  .option('--model <model>', '使用的模型名称')
  .option('--embedding-model <model>', '使用的嵌入模型名称')
  .action(async (options) => {
    try {
      const { learnDocuments } = require('../src/services/learn');
      await learnDocuments(options);
    } catch (error) {
      console.error('学习过程中发生错误:', error.message);
      process.exit(1);
    }
  });

// 知识库状态命令
program
  .command('status')
  .description('显示知识库状态')
  .action(async () => {
    try {
      const { showKnowledgeStatus } = require('../src/services/learn');
      await showKnowledgeStatus();
    } catch (error) {
      console.error('检查状态过程中发生错误:', error.message);
      process.exit(1);
    }
  });

// 解析命令行参数
program.parse();