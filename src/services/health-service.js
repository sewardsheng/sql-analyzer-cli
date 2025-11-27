/**
 * 健康检查服务
 * 提供系统健康状态监控和诊断功能
 */

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';

class HealthService {
  constructor() {
    this.projectRoot = path.resolve(process.cwd());
    this.checks = new Map();
    this.execAsync = promisify(exec);
    this.setupDefaultChecks();
  }

  /**
   * 设置默认检查项
   */
  setupDefaultChecks() {
    // 核心模块检查
    this.addCheck('core-modules', {
      name: '核心模块',
      critical: true,
      check: () => this.checkCoreModules()
    });

    // 配置文件检查
    this.addCheck('configuration', {
      name: '配置文件',
      critical: true,
      check: () => this.checkConfiguration()
    });

    // 规则文件检查
    this.addCheck('rules', {
      name: '规则文件',
      critical: true,
      check: () => this.checkRules()
    });

    // Prompt文件检查
    this.addCheck('prompts', {
      name: 'Prompt文件',
      critical: true,
      check: () => this.checkPrompts()
    });

    // 依赖检查
    this.addCheck('dependencies', {
      name: '依赖包',
      critical: false,
      check: () => this.checkDependencies()
    });

    // 内存使用检查
    this.addCheck('memory', {
      name: '内存使用',
      critical: false,
      check: () => this.checkMemoryUsage()
    });

    // 磁盘空间检查
    this.addCheck('disk-space', {
      name: '磁盘空间',
      critical: false,
      check: () => this.checkDiskSpace()
    });

    // CPU使用率检查
    this.addCheck('cpu-usage', {
      name: 'CPU使用率',
      critical: false,
      check: () => this.checkCpuUsage()
    });

    // 网络连接检查
    this.addCheck('network', {
      name: '网络连接',
      critical: false,
      check: () => this.checkNetworkConnectivity()
    });

    // 外部服务依赖检查
    this.addCheck('external-services', {
      name: '外部服务依赖',
      critical: false,
      check: () => this.checkExternalServices()
    });

    // API响应时间检查
    this.addCheck('api-performance', {
      name: 'API性能',
      critical: false,
      check: () => this.checkApiPerformance()
    });
  }

  /**
   * 添加检查项
   */
  addCheck(id, config) {
    this.checks.set(id, config);
  }

  /**
   * 执行所有健康检查
   * 添加整体超时控制，防止长时间阻塞
   */
  async performAllChecks() {
    const overallTimeout = 30000; // 30秒总体超时
    const startTime = Date.now();
    
    const results = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      },
      duration: 0
    };

    console.log(chalk.blue('🏥 开始健康检查...\n'));

    try {
      // 创建超时Promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`健康检查总体超时 (${overallTimeout}ms)`));
        }, overallTimeout);
      });

      // 执行所有检查的Promise
      const checksPromise = this._executeAllChecks(results);

      // 使用Promise.race来控制总体超时
      await Promise.race([checksPromise, timeoutPromise]);
      
    } catch (error) {
      if (error.message.includes('超时')) {
        results.status = 'error';
        console.log(chalk.red(`❌ ${error.message}`));
        
        // 标记未完成的检查为超时
        for (const [id, check] of this.checks) {
          if (!results.checks[id]) {
            results.checks[id] = {
              name: check.name,
              critical: check.critical,
              status: 'timeout',
              message: '检查超时',
              details: { error: error.message },
              duration: 0
            };
            results.summary.total++;
            results.summary.failed++;
          }
        }
      } else {
        throw error;
      }
    }

    results.duration = Date.now() - startTime;

    // 输出总结
    this.printSummary(results);

    return results;
  }

  /**
   * 执行所有检查的内部方法
   */
  async _executeAllChecks(results) {
    for (const [id, check] of this.checks) {
      try {
        console.log(chalk.yellow(`检查 ${check.name}...`));
        
        // 为每个检查设置单独的超时
        const checkTimeout = id === 'network' ? 20000 : 5000; // 网络检查20秒，其他5秒
        const checkPromise = check.check();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('检查超时')), checkTimeout);
        });
        
        const result = await Promise.race([checkPromise, timeoutPromise]);
        
        results.checks[id] = {
          name: check.name,
          critical: check.critical,
          status: result.status,
          message: result.message,
          details: result.details || {},
          duration: result.duration || 0
        };

        results.summary.total++;

        if (result.status === 'pass') {
          results.summary.passed++;
          console.log(chalk.green(`  ✓ ${result.message}`));
        } else if (result.status === 'warning') {
          results.summary.warnings++;
          console.log(chalk.yellow(`  ⚠️  ${result.message}`));
          if (check.critical) {
            results.status = 'degraded';
          }
        } else if (result.status === 'fail') {
          results.summary.failed++;
          console.log(chalk.red(`  ❌ ${result.message}`));
          if (check.critical) {
            results.status = 'unhealthy';
          }
        }

      } catch (error) {
        const status = error.message.includes('超时') ? 'timeout' : 'error';
        results.checks[id] = {
          name: check.name,
          critical: check.critical,
          status: status,
          message: `检查执行失败: ${error.message}`,
          details: { error: error.stack }
        };

        results.summary.total++;
        results.summary.failed++;

        console.log(chalk.red(`  ❌ 检查执行失败: ${error.message}`));
        
        if (check.critical) {
          results.status = 'unhealthy';
        }
      }

      console.log('');
    }
  }

  /**
   * 检查核心模块
   */
  async checkCoreModules() {
    const startTime = Date.now();
    const coreModules = [
      'src/core/sql-analyzer.js',
      'src/core/llm-json-parser.js',
      'src/core/llm-service.js',
      'src/core/identification/db-identifier.js',
      'src/core/tools/base-tool.js',
      'src/core/tools/performance-tool.js',
      'src/core/tools/security-tool.js',
      'src/core/tools/standards-tool.js',
      'src/utils/logger.js'
    ];

    const results = {
      status: 'pass',
      message: '所有核心模块正常',
      details: { modules: {} }
    };

    for (const modulePath of coreModules) {
      try {
        const fullPath = path.join(this.projectRoot, modulePath);
        
        // 检查文件是否存在
        await fs.access(fullPath);
        
        // 尝试加载模块 - 使用 file:// URL 格式以兼容 Node.js 和 Bun
        const fileUrl = new URL(`file://${fullPath.replace(/\\/g, '/')}`);
        await import(fileUrl);
        results.details.modules[modulePath] = 'loaded';
        
      } catch (error) {
        results.status = 'fail';
        results.message = `核心模块加载失败: ${modulePath}`;
        results.details.modules[modulePath] = {
          error: error.message,
          errorType: error.constructor.name
        };
        break;
      }
    }

    results.duration = Date.now() - startTime;
    return results;
  }

  /**
   * 检查配置文件
   */
  async checkConfiguration() {
    const startTime = Date.now();
    const configFiles = [
      'package.json',
      '.env.example'
    ];

    const results = {
      status: 'pass',
      message: '配置文件完整',
      details: { files: {} }
    };

    for (const configFile of configFiles) {
      try {
        const fullPath = path.join(this.projectRoot, configFile);
        const stats = await fs.stat(fullPath);
        results.details.files[configFile] = {
          exists: true,
          size: stats.size,
          modified: stats.mtime
        };
      } catch (error) {
        results.details.files[configFile] = { exists: false, error: error.message };
        
        if (configFile === 'package.json') {
          results.status = 'fail';
          results.message = `关键配置文件缺失: ${configFile}`;
        } else {
          results.status = 'warning';
          results.message = `配置文件缺失: ${configFile}`;
        }
      }
    }

    results.duration = Date.now() - startTime;
    return results;
  }

  /**
   * 检查规则文件
   */
  async checkRules() {
    const startTime = Date.now();
    const rulesDir = path.join(this.projectRoot, 'rules');

    const results = {
      status: 'pass',
      message: '规则文件完整',
      details: { databases: {} }
    };

    try {
      const databases = await fs.readdir(rulesDir);
      
      for (const db of databases) {
        const dbPath = path.join(rulesDir, db);
        const stats = await fs.stat(dbPath);
        
        if (stats.isDirectory()) {
          const ruleFiles = await fs.readdir(dbPath);
          results.details.databases[db] = {
            type: 'directory',
            files: ruleFiles.length,
            files: ruleFiles
          };
        }
      }

      if (databases.length === 0) {
        results.status = 'warning';
        results.message = '规则目录为空';
      }

    } catch (error) {
      results.status = 'fail';
      results.message = `规则目录访问失败: ${error.message}`;
      results.details.error = error.message;
    }

    results.duration = Date.now() - startTime;
    return results;
  }

  /**
   * 检查Prompt文件
   */
  async checkPrompts() {
    const startTime = Date.now();
    const promptsDir = path.join(this.projectRoot, 'src', 'prompts');

    const results = {
      status: 'pass',
      message: 'Prompt文件完整',
      details: { categories: {} }
    };

    try {
      const categories = await fs.readdir(promptsDir);
      
      for (const category of categories) {
        const categoryPath = path.join(promptsDir, category);
        const stats = await fs.stat(categoryPath);
        
        if (stats.isDirectory()) {
          const promptFiles = await fs.readdir(categoryPath);
          results.details.categories[category] = {
            type: 'directory',
            files: promptFiles.length,
            files: promptFiles
          };
        }
      }

      // 检查关键prompt文件
      const criticalPrompts = [
        'src/prompts/analyzers/performance-analysis.md',
        'src/prompts/analyzers/security-audit.md',
        'src/prompts/analyzers/coding-standards-check.md'
      ];

      for (const prompt of criticalPrompts) {
        try {
          await fs.access(path.join(this.projectRoot, prompt));
        } catch (error) {
          results.status = 'warning';
          results.message = `关键prompt文件缺失: ${prompt}`;
        }
      }

    } catch (error) {
      results.status = 'fail';
      results.message = `Prompt目录访问失败: ${error.message}`;
      results.details.error = error.message;
    }

    results.duration = Date.now() - startTime;
    return results;
  }

  /**
   * 检查依赖包
   */
  async checkDependencies() {
    const startTime = Date.now();
    const packagePath = path.join(this.projectRoot, 'package.json');
    const nodeModulesPath = path.join(this.projectRoot, 'node_modules');

    const results = {
      status: 'pass',
      message: '依赖包正常',
      details: {}
    };

    try {
      // 检查package.json
      const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'));
      results.details.dependencies = Object.keys(packageJson.dependencies || {}).length;
      results.details.devDependencies = Object.keys(packageJson.devDependencies || {}).length;

      // 检查node_modules
      try {
        const nodeModulesStats = await fs.stat(nodeModulesPath);
        results.details.nodeModulesExists = true;
        results.details.nodeModulesSize = nodeModulesStats.size;
      } catch (error) {
        results.status = 'warning';
        results.message = 'node_modules目录不存在，需要运行npm install';
        results.details.nodeModulesExists = false;
      }

    } catch (error) {
      results.status = 'fail';
      results.message = `依赖检查失败: ${error.message}`;
    }

    results.duration = Date.now() - startTime;
    return results;
  }

  /**
   * 检查内存使用
   */
  async checkMemoryUsage() {
    const startTime = Date.now();
    const memUsage = process.memoryUsage();
    const totalMem = (await import('os')).totalmem();
    const freeMem = (await import('os')).freemem();

    const results = {
      status: 'pass',
      message: '内存使用正常',
      details: {
        process: {
          rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
          external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
        },
        system: {
          total: Math.round(totalMem / 1024 / 1024 / 1024) + 'GB',
          free: Math.round(freeMem / 1024 / 1024 / 1024) + 'GB',
          usage: Math.round(((totalMem - freeMem) / totalMem) * 100) + '%'
        }
      }
    };

    // 检查内存使用率
    const memoryUsagePercent = (totalMem - freeMem) / totalMem;
    if (memoryUsagePercent > 0.9) {
      results.status = 'fail';
      results.message = '系统内存使用率过高';
    } else if (memoryUsagePercent > 0.8) {
      results.status = 'warning';
      results.message = '系统内存使用率较高';
    }

    results.duration = Date.now() - startTime;
    return results;
  }

  /**
   * 检查磁盘空间
   */
  async checkDiskSpace() {
    const startTime = Date.now();
    
    const results = {
      status: 'pass',
      message: '磁盘空间充足',
      details: {}
    };

    try {
      // 只检查关键目录，避免递归遍历整个项目
      const criticalDirs = [
        'src',
        'node_modules',
        'docs',
        'rules'
      ];
      
      let totalSize = 0;
      let fileCount = 0;
      const dirDetails = {};

      for (const dir of criticalDirs) {
        const dirPath = path.join(this.projectRoot, dir);
        try {
          const stats = await this.getDirectorySizeOptimized(dirPath);
          totalSize += stats.size;
          fileCount += stats.files;
          dirDetails[dir] = {
            size: Math.round(stats.size / 1024 / 1024) + 'MB',
            files: stats.files
          };
        } catch (error) {
          // 目录不存在或无法访问
          dirDetails[dir] = {
            error: error.message,
            size: '0MB',
            files: 0
          };
        }
      }

      results.details.projectSize = Math.round(totalSize / 1024 / 1024) + 'MB';
      results.details.fileCount = fileCount;
      results.details.directories = dirDetails;

      // 检查是否有足够的磁盘空间（这里简化处理）
      // 增加更详细的磁盘空间检查逻辑
      const sizeGB = totalSize / (1024 * 1024 * 1024);
      if (sizeGB > 5) { // 5GB
        results.status = 'fail';
        results.message = '项目目录过大，需要立即清理';
      } else if (sizeGB > 2) { // 2GB
        results.status = 'warning';
        results.message = '项目目录较大，建议清理';
      } else if (sizeGB > 1) { // 1GB
        results.status = 'warning';
        results.message = '项目目录大小适中，可考虑优化';
      }
      
      // 添加详细的大小信息
      results.details.sizeGB = Math.round(sizeGB * 100) / 100 + 'GB';

    } catch (error) {
      results.status = 'warning';
      results.message = `磁盘空间检查失败: ${error.message}`;
    }

    results.duration = Date.now() - startTime;
    return results;
  }

  /**
   * 目录大小获取方法
   * 限制递归深度和文件数量，避免性能问题
   */
  async getDirectorySizeOptimized(dirPath, maxDepth = 2, maxFiles = 1000) {
    let totalSize = 0;
    let fileCount = 0;
    let currentDepth = 0;

    const scanDirectory = async (currentPath, depth) => {
      if (depth > maxDepth || fileCount > maxFiles) {
        return;
      }

      try {
        const items = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const item of items) {
          if (fileCount > maxFiles) break;
          
          const itemPath = path.join(currentPath, item.name);
          
          if (item.isDirectory()) {
            if (depth < maxDepth) {
              await scanDirectory(itemPath, depth + 1);
            }
          } else {
            try {
              const stats = await fs.stat(itemPath);
              totalSize += stats.size;
              fileCount++;
            } catch (error) {
              // 忽略无法访问的文件
            }
          }
        }
      } catch (error) {
        // 忽略无法访问的目录
      }
    };

    await scanDirectory(dirPath, currentDepth);
    return { size: totalSize, files: fileCount };
  }

  /**
   * 打印检查总结
   */
  printSummary(results) {
    console.log(chalk.blue('📊 健康检查总结:'));
    console.log(`  总检查项: ${results.summary.total}`);
    console.log(chalk.green(`  通过: ${results.summary.passed}`));
    
    if (results.summary.warnings > 0) {
      console.log(chalk.yellow(`  警告: ${results.summary.warnings}`));
    }
    
    if (results.summary.failed > 0) {
      console.log(chalk.red(`  失败: ${results.summary.failed}`));
    }

    // 整体状态
    let statusColor = chalk.green;
    let statusIcon = '✅';
    
    if (results.status === 'degraded') {
      statusColor = chalk.yellow;
      statusIcon = '⚠️';
    } else if (results.status === 'unhealthy') {
      statusColor = chalk.red;
      statusIcon = '❌';
    }

    console.log(statusColor(`  整体状态: ${statusIcon} ${results.status.toUpperCase()}`));
    console.log(`  检查时间: ${results.timestamp}\n`);
  }

  /**
   * 生成健康报告
   */
  /**
   * 生成报告
   * 为API路由提供格式化的健康检查报告
   */
  generateReport(results) {
    return {
      ...results,
      recommendations: this.generateRecommendations(results),
      report: this.formatHealthReport(results)
    };
  }

  /**
   * 格式化健康检查报告
   * 提供更友好的报告格式
   */
  formatHealthReport(results) {
    const lines = [];
    lines.push(chalk.bold.blue('系统健康检查报告'));
    lines.push(`检查时间: ${new Date(results.timestamp).toLocaleString()}`);
    lines.push(`总体状态: ${this.getStatusColor(results.status)}`);
    lines.push(`检查耗时: ${results.duration}ms`);
    lines.push('');
    
    lines.push(chalk.bold('检查摘要:'));
    lines.push(`  总检查项: ${results.summary.total}`);
    lines.push(`  通过: ${chalk.green(results.summary.passed)}`);
    lines.push(`  失败: ${chalk.red(results.summary.failed)}`);
    lines.push(`  警告: ${chalk.yellow(results.summary.warnings)}`);
    lines.push('');
    
    lines.push(chalk.bold('详细结果:'));
    for (const [id, check] of Object.entries(results.checks)) {
      const statusIcon = this.getStatusIcon(check.status);
      const criticalMark = check.critical ? ' [关键]' : '';
      lines.push(`  ${statusIcon} ${check.name}${criticalMark}: ${check.message}`);
      
      if (check.details && Object.keys(check.details).length > 0) {
        for (const [key, value] of Object.entries(check.details)) {
          if (typeof value === 'object') {
            lines.push(`    ${key}: ${JSON.stringify(value)}`);
          } else {
            lines.push(`    ${key}: ${value}`);
          }
        }
      }
    }
    
    const recommendations = this.generateRecommendations(results);
    if (recommendations.length > 0) {
      lines.push('');
      lines.push(chalk.bold('建议:'));
      recommendations.forEach((rec, index) => {
        lines.push(`  ${index + 1}. ${rec}`);
      });
    }
    
    return lines.join('\n');
  }

  /**
   * 获取状态颜色
   */
  getStatusColor(status) {
    switch (status) {
      case 'healthy':
        return chalk.green('健康');
      case 'degraded':
        return chalk.yellow('降级');
      case 'unhealthy':
        return chalk.red('不健康');
      case 'error':
        return chalk.red('错误');
      default:
        return status;
    }
  }

  /**
   * 获取状态图标
   */
  getStatusIcon(status) {
    switch (status) {
      case 'pass':
        return chalk.green('✓');
      case 'warning':
        return chalk.yellow('⚠️');
      case 'fail':
      case 'error':
        return chalk.red('❌');
      case 'timeout':
        return chalk.red('⏱️');
      default:
        return chalk.gray('?');
    }
  }

  /**
   * 生成建议
   */
  generateRecommendations(results) {
    const recommendations = [];

    for (const [id, check] of Object.entries(results.checks)) {
      if (check.status === 'fail' || check.status === 'warning') {
        switch (id) {
          case 'dependencies':
            recommendations.push('运行 npm install 安装缺失的依赖包');
            break;
          case 'configuration':
            recommendations.push('检查并修复配置文件');
            break;
          case 'rules':
            recommendations.push('确保规则文件完整且可访问');
            break;
          case 'prompts':
            recommendations.push('检查并补充缺失的prompt文件');
            break;
          case 'memory':
            recommendations.push('释放内存或增加系统内存');
            break;
          case 'disk-space':
            recommendations.push('清理不必要的文件以释放磁盘空间');
            break;
        }
      }
    }

    return recommendations;
  }

  /**
   * 检查CPU使用率
   */
  async checkCpuUsage() {
    const startTime = Date.now();
    const results = {
      status: 'pass',
      message: 'CPU使用率正常',
      details: {}
    };

    try {
      const os = await import('os');
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });

      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const usage = 100 - (idle / total) * 100;

      results.details = {
        usage: Math.round(usage * 100) / 100 + '%',
        cores: cpus.length,
        model: cpus[0]?.model || 'Unknown'
      };

      if (usage > 90) {
        results.status = 'fail';
        results.message = 'CPU使用率过高';
      } else if (usage > 80) {
        results.status = 'warning';
        results.message = 'CPU使用率较高';
      }

    } catch (error) {
      results.status = 'warning';
      results.message = `CPU使用率检查失败: ${error.message}`;
      results.details.error = error.message;
    }

    results.duration = Date.now() - startTime;
    return results;
  }

  /**
   * 检查网络连接
   * 改进网络检查逻辑，提高成功率和可靠性
   */
  async checkNetworkConnectivity() {
    const startTime = Date.now();
    const results = {
      status: 'pass',
      message: '网络连接正常',
      details: {}
    };

    try {
      // 使用更适合国内环境的测试URL
      const testUrls = [
        'https://www.baidu.com', // 国内网站，响应最快
        'https://www.taobao.com', // 国内大型网站
      ];

      const connectivityResults = [];
      const timeout = 5000; // 增加到5秒超时，提高成功率
      
      // 使用Promise.allSettled来并行处理，但设置总体超时
      const promises = testUrls.map(async (url) => {
        const urlStartTime = Date.now();
        let retryCount = 0;
        const maxRetries = 2;
        
        while (retryCount <= maxRetries) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            // 使用GET请求而不是HEAD，某些服务器可能不支持HEAD
            const response = await fetch(url, {
              method: 'GET',
              signal: controller.signal,
              headers: {
                'User-Agent': 'SQL-Analyzer-Health-Check/1.0',
                'Accept': 'text/plain,text/html,*/*'
              }
            });
            
            clearTimeout(timeoutId);
            
            return {
              url,
              status: 'connected',
              responseTime: Date.now() - urlStartTime,
              statusCode: response.status,
              retryCount
            };
          } catch (error) {
            retryCount++;
            
            // 如果不是最后一次重试，继续重试
            if (retryCount <= maxRetries) {
              // 等待一段时间再重试
              await new Promise(resolve => setTimeout(resolve, 500));
              continue;
            }
            
            // 最后一次重试失败，返回错误
            return {
              url,
              status: 'failed',
              error: this.getNetworkErrorMessage(error),
              responseTime: Date.now() - urlStartTime,
              retryCount
            };
          }
        }
      });

      // 设置总体超时为25秒，给重试留出时间
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('网络检查总体超时')), 25000);
      });

      try {
        const settledResults = await Promise.race([
          Promise.allSettled(promises),
          timeoutPromise
        ]);
        
        if (Array.isArray(settledResults)) {
          connectivityResults.push(...settledResults.map(result =>
            result.status === 'fulfilled' ? result.value : {
              url: 'unknown',
              status: 'failed',
              error: result.reason.message,
              retryCount: 0
            }
          ));
        }
      } catch (error) {
        // 总体超时，使用已完成的请求结果
        const partialResults = await Promise.allSettled(promises);
        connectivityResults.push(...partialResults.map(result =>
          result.status === 'fulfilled' ? result.value : {
            url: 'unknown',
            status: 'failed',
            error: result.reason.message,
            retryCount: 0
          }
        ));
        results.status = 'warning';
        results.message = '网络检查部分超时';
      }

      const connectedCount = connectivityResults.filter(r => r.status === 'connected').length;
      results.details = {
        tested: testUrls.length,
        connected: connectedCount,
        failed: testUrls.length - connectedCount,
        results: connectivityResults
      };

      // 更宽松的判断标准：只要有1个连接成功就认为网络正常
      if (connectedCount === 0) {
        results.status = 'fail';
        results.message = '所有网络连接测试失败';
      } else if (connectedCount < testUrls.length) {
        results.status = 'warning';
        results.message = `部分网络连接测试失败 (${connectedCount}/${testUrls.length})`;
      } else {
        results.message = `网络连接正常 (${connectedCount}/${testUrls.length})`;
      }

    } catch (error) {
      results.status = 'warning';
      results.message = `网络连接检查失败: ${error.message}`;
      results.details.error = error.message;
    }

    results.duration = Date.now() - startTime;
    return results;
  }

  /**
   * 获取网络错误的友好描述
   */
  getNetworkErrorMessage(error) {
    if (error.name === 'AbortError') {
      return '请求超时';
    } else if (error.code === 'ENOTFOUND') {
      return 'DNS解析失败';
    } else if (error.code === 'ECONNREFUSED') {
      return '连接被拒绝';
    } else if (error.code === 'ECONNRESET') {
      return '连接被重置';
    } else if (error.code === 'ETIMEDOUT') {
      return '连接超时';
    } else if (error.message.includes('fetch failed')) {
      return '网络请求失败';
    } else {
      return error.message || '未知网络错误';
    }
  }

  /**
   * 检查外部服务依赖
   */
  async checkExternalServices() {
    const startTime = Date.now();
    const results = {
      status: 'pass',
      message: '外部服务依赖正常',
      details: {}
    };

    try {
      const services = [];
      
      // 检查API连接（优先使用CUSTOM_API_KEY，回退到OPENAI_API_KEY）
      const apiKey = process.env.CUSTOM_API_KEY || process.env.OPENAI_API_KEY;
      const baseUrl = process.env.CUSTOM_BASE_URL || 'https://api.openai.com/v1';
      
      if (apiKey) {
        try {
          const response = await fetch(`${baseUrl}/models`, {
            headers: {
              'Authorization': `Bearer ${apiKey}`
            },
            signal: AbortSignal.timeout(10000)
          });
          
          services.push({
            name: 'OpenAI API',
            status: response.ok ? 'available' : 'unavailable',
            responseTime: Date.now() - startTime,
            statusCode: response.status
          });
        } catch (error) {
          services.push({
            name: 'OpenAI API',
            status: 'error',
            error: error.message
          });
        }
      }

      // 检查其他外部服务...
      
      const availableCount = services.filter(s => s.status === 'available').length;
      results.details = {
        total: services.length,
        available: availableCount,
        services
      };

      if (services.length > 0 && availableCount === 0) {
        results.status = 'fail';
        results.message = '所有外部服务不可用';
      } else if (availableCount < services.length) {
        results.status = 'warning';
        results.message = '部分外部服务不可用';
      }

    } catch (error) {
      results.status = 'warning';
      results.message = `外部服务检查失败: ${error.message}`;
      results.details.error = error.message;
    }

    results.duration = Date.now() - startTime;
    return results;
  }

  /**
   * 检查API性能
   * 修复循环依赖问题，避免在健康检查中调用自身API
   */
  async checkApiPerformance() {
    const startTime = Date.now();
    const results = {
      status: 'pass',
      message: 'API性能正常',
      details: {}
    };

    try {
      // 避免循环依赖：不调用自身API，而是检查内部状态
      const testStartTime = Date.now();
      
      // 检查内存使用情况作为性能指标
      const memUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      // 检查事件循环延迟
      const eventLoopDelay = await this.measureEventLoopDelay();
      
      // 检查CPU使用情况
      const cpuUsage = process.cpuUsage();
      
      const performanceMetrics = {
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB'
        },
        uptime: Math.round(uptime) + 's',
        eventLoopDelay: Math.round(eventLoopDelay * 100) / 100 + 'ms',
        cpuUsage: {
          user: Math.round(cpuUsage.user / 1000) + 'ms',
          system: Math.round(cpuUsage.system / 1000) + 'ms'
        }
      };

      results.details = {
        metrics: performanceMetrics,
        timestamp: new Date().toISOString()
      };

      // 基于性能指标判断状态
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      const eventLoopDelayMs = eventLoopDelay;
      
      if (heapUsedMB > 500) { // 内存使用超过500MB
        results.status = 'warning';
        results.message = '内存使用较高';
      } else if (eventLoopDelayMs > 10) { // 事件循环延迟超过10ms
        results.status = 'warning';
        results.message = '事件循环延迟较高';
      } else if (uptime < 5) { // 服务刚启动
        results.status = 'pass';
        results.message = 'API服务正在启动中';
      }

    } catch (error) {
      results.status = 'warning';
      results.message = `API性能检查失败: ${error.message}`;
      results.details.error = error.message;
    }

    results.duration = Date.now() - startTime;
    return results;
  }
  /**
   * 测量事件循环延迟
   */
  async measureEventLoopDelay() {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const end = process.hrtime.bigint();
        const delay = Number(end - start) / 1000000; // 转换为毫秒
        resolve(delay);
      });
    });
  }
}

export default HealthService;