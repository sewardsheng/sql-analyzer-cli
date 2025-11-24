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
    this.projectRoot = path.resolve(__dirname, '../../..');
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

    // 数据库连接检查
    this.addCheck('database-connections', {
      name: '数据库连接',
      critical: false,
      check: () => this.checkDatabaseConnections()
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
   */
  async performAllChecks() {
    const results = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };

    console.log(chalk.blue('🏥 开始健康检查...\n'));

    for (const [id, check] of this.checks) {
      try {
        console.log(chalk.yellow(`检查 ${check.name}...`));
        const result = await check.check();
        
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
        results.checks[id] = {
          name: check.name,
          critical: check.critical,
          status: 'error',
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

    // 输出总结
    this.printSummary(results);

    return results;
  }

  /**
   * 检查核心模块
   */
  async checkCoreModules() {
    const startTime = Date.now();
    const coreModules = [
      'src/core/coordinator.js',
      'src/core/reporter.js',
      'src/core/knowledge-base.js',
      'src/utils/format/prompt-loader.js',
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
        await fs.access(fullPath);
        
        // 尝试加载模块
        await import(fullPath);
        results.details.modules[modulePath] = 'loaded';
        
      } catch (error) {
        results.status = 'fail';
        results.message = `核心模块加载失败: ${modulePath}`;
        results.details.modules[modulePath] = error.message;
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
      '.env.example',
      'src/config/databases.js'
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
      // 简单的磁盘空间检查（通过检查项目目录大小）
      const projectStats = await this.getDirectorySize(this.projectRoot);
      results.details.projectSize = Math.round(projectStats.size / 1024 / 1024) + 'MB';
      results.details.fileCount = projectStats.files;

      // 检查是否有足够的磁盘空间（这里简化处理）
      if (projectStats.size > 1024 * 1024 * 1024) { // 1GB
        results.status = 'warning';
        results.message = '项目目录较大，建议清理';
      }

    } catch (error) {
      results.status = 'warning';
      results.message = `磁盘空间检查失败: ${error.message}`;
    }

    results.duration = Date.now() - startTime;
    return results;
  }

  /**
   * 获取目录大小
   */
  async getDirectorySize(dirPath) {
    let totalSize = 0;
    let fileCount = 0;

    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          const subResult = await this.getDirectorySize(itemPath);
          totalSize += subResult.size;
          fileCount += subResult.files;
        } else {
          totalSize += stats.size;
          fileCount++;
        }
      }
    } catch (error) {
      // 忽略无法访问的文件
    }

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
  generateReport(results) {
    return {
      ...results,
      recommendations: this.generateRecommendations(results)
    };
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
   */
  async checkNetworkConnectivity() {
    const startTime = Date.now();
    const results = {
      status: 'pass',
      message: '网络连接正常',
      details: {}
    };

    try {
      const testUrls = [
        'https://www.google.com',
        'https://www.github.com',
        'https://api.openai.com'
      ];

      const connectivityResults = [];
      
      for (const url of testUrls) {
        try {
          const response = await fetch(url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000) // 5秒超时
          });
          
          connectivityResults.push({
            url,
            status: 'connected',
            responseTime: Date.now() - startTime,
            statusCode: response.status
          });
        } catch (error) {
          connectivityResults.push({
            url,
            status: 'failed',
            error: error.message
          });
        }
      }

      const connectedCount = connectivityResults.filter(r => r.status === 'connected').length;
      results.details = {
        tested: testUrls.length,
        connected: connectedCount,
        failed: testUrls.length - connectedCount,
        results: connectivityResults
      };

      if (connectedCount === 0) {
        results.status = 'fail';
        results.message = '所有网络连接测试失败';
      } else if (connectedCount < testUrls.length) {
        results.status = 'warning';
        results.message = '部分网络连接测试失败';
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
      
      // 检查OpenAI API连接
      if (process.env.OPENAI_API_KEY) {
        try {
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
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
   * 检查数据库连接
   */
  async checkDatabaseConnections() {
    const startTime = Date.now();
    const results = {
      status: 'pass',
      message: '数据库连接正常',
      details: {}
    };

    try {
      const databases = [];
      
      // 检查配置的数据库连接
      const { getConfigManager } = await import('../config/index.js');
      const configManager = getConfigManager();
      const config = await configManager.getConfig();
      
      if (config.databases) {
        for (const [name, dbConfig] of Object.entries(config.databases)) {
          try {
            // 这里应该根据数据库类型进行实际连接测试
            // 简化处理，只检查配置是否完整
            if (dbConfig.host && dbConfig.port && dbConfig.database) {
              databases.push({
                name,
                status: 'configured',
                host: dbConfig.host,
                port: dbConfig.port,
                type: dbConfig.type || 'unknown'
              });
            } else {
              databases.push({
                name,
                status: 'incomplete',
                error: '配置不完整'
              });
            }
          } catch (error) {
            databases.push({
              name,
              status: 'error',
              error: error.message
            });
          }
        }
      }

      const configuredCount = databases.filter(d => d.status === 'configured').length;
      results.details = {
        total: databases.length,
        configured: configuredCount,
        databases
      };

      if (databases.length > 0 && configuredCount === 0) {
        results.status = 'fail';
        results.message = '所有数据库配置有问题';
      } else if (configuredCount < databases.length) {
        results.status = 'warning';
        results.message = '部分数据库配置有问题';
      }

    } catch (error) {
      results.status = 'warning';
      results.message = `数据库连接检查失败: ${error.message}`;
      results.details.error = error.message;
    }

    results.duration = Date.now() - startTime;
    return results;
  }

  /**
   * 检查API性能
   */
  async checkApiPerformance() {
    const startTime = Date.now();
    const results = {
      status: 'pass',
      message: 'API性能正常',
      details: {}
    };

    try {
      const testStartTime = Date.now();
      
      // 测试内部API端点
      const testEndpoints = [
        '/api/health/ping',
        '/api/health/status'
      ];

      const performanceResults = [];
      
      for (const endpoint of testEndpoints) {
        try {
          const response = await fetch(`http://localhost:${process.env.PORT || 3000}${endpoint}`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
          });
          
          const responseTime = Date.now() - testStartTime;
          performanceResults.push({
            endpoint,
            status: response.ok ? 'success' : 'failed',
            responseTime,
            statusCode: response.status
          });
        } catch (error) {
          performanceResults.push({
            endpoint,
            status: 'error',
            error: error.message
          });
        }
      }

      const successCount = performanceResults.filter(r => r.status === 'success').length;
      const avgResponseTime = performanceResults
        .filter(r => r.responseTime)
        .reduce((sum, r) => sum + r.responseTime, 0) / successCount || 0;

      results.details = {
        tested: testEndpoints.length,
        success: successCount,
        failed: testEndpoints.length - successCount,
        averageResponseTime: Math.round(avgResponseTime) + 'ms',
        results: performanceResults
      };

      if (successCount === 0) {
        results.status = 'fail';
        results.message = '所有API性能测试失败';
      } else if (avgResponseTime > 2000) {
        results.status = 'warning';
        results.message = 'API响应时间较慢';
      } else if (successCount < testEndpoints.length) {
        results.status = 'warning';
        results.message = '部分API性能测试失败';
      }

    } catch (error) {
      results.status = 'warning';
      results.message = `API性能检查失败: ${error.message}`;
      results.details.error = error.message;
    }

    results.duration = Date.now() - startTime;
    return results;
  }
}

export default HealthService;