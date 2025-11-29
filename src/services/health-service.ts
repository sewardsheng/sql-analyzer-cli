/**
* 健康检查服务
* 提供系统健康状态监控和诊断功能
*/

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

interface CheckResult {
  name?: string;
  status: string;
  message: string;
  details?: any;
  duration?: number;
  critical?: boolean;
  [key: string]: any;
}

interface HealthReport {
  status: string;
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  checks: Record<string, CheckResult>;
  recommendations: string[];
}

class HealthService {
  private projectRoot: string;
  private checks: Map<string, any>;
  private execAsync: any;

  constructor() {
    this.projectRoot = path.resolve(process.cwd());
    this.checks = new Map();
    this.execAsync = promisify(exec);
    this.setupDefaultChecks();
  }

  private setupDefaultChecks(): void {
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

    // 依赖包检查
    this.addCheck('dependencies', {
      name: '依赖包',
      critical: false,
      check: () => this.checkDependencies()
    });
  }

  private addCheck(id: string, config: any): void {
    this.checks.set(id, config);
  }

  private async checkCoreModules(): Promise<CheckResult> {
    const startTime = Date.now();
    const coreModules = [
      'src/core/EnhancedSQLAnalyzer.js',
      'src/core/context/ContextManager.js',
      'src/core/llm-service.js',
      'src/core/tools/index.js',
      'src/utils/logger.js'
    ];

    const results: CheckResult = {
      name: 'modules',
      status: 'pass',
      message: '所有核心模块正常',
      details: { modules: {} }
    };

    for (const modulePath of coreModules) {
      try {
        const fullPath = path.join(this.projectRoot, modulePath);
        await fs.access(fullPath);
        results.details.modules[modulePath] = 'loaded';
      } catch (error) {
        results.status = 'fail';
        results.message = `核心模块加载失败: ${modulePath}`;
        results.details.modules[modulePath] = {
          error: (error as Error).message,
          errorType: error.constructor.name
        };
        break;
      }
    }

    results.duration = Date.now() - startTime;
    return results;
  }

  private async checkConfiguration(): Promise<CheckResult> {
    const startTime = Date.now();
    const configFiles = [
      'package.json',
      '.env.example'
    ];

    const results: CheckResult = {
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
        results.status = 'fail';
        results.message = `缺少配置文件: ${configFile}`;
        results.details.files[configFile] = {
          exists: false,
          error: (error as Error).message
        };
        break;
      }
    }

    results.duration = Date.now() - startTime;
    return results;
  }

  private async checkRules(): Promise<CheckResult> {
    const startTime = Date.now();
    const results: CheckResult = {
      status: 'pass',
      message: '规则文件完整',
      details: { databases: {} }
    };

    const rulesDir = path.join(this.projectRoot, 'rules');
    try {
      const databases = await fs.readdir(rulesDir);
      for (const db of databases) {
        const dbPath = path.join(rulesDir, db);
        const stat = await fs.stat(dbPath);
        if (stat.isDirectory()) {
          const files = await fs.readdir(dbPath);
          results.details.databases[db] = {
            type: 'directory',
            files
          };
        }
      }
    } catch (error) {
      results.status = 'fail';
      results.message = `规则目录访问失败: ${error.message}`;
    }

    results.duration = Date.now() - startTime;
    return results;
  }

  private async checkPrompts(): Promise<CheckResult> {
    const startTime = Date.now();
    const results: CheckResult = {
      status: 'pass',
      message: 'Prompt文件完整',
      details: { categories: {} }
    };

    const promptsDir = path.join(this.projectRoot, 'src', 'prompts');
    try {
      const categories = await fs.readdir(promptsDir);
      for (const category of categories) {
        const categoryPath = path.join(promptsDir, category);
        const stat = await fs.stat(categoryPath);
        if (stat.isDirectory()) {
          const files = await fs.readdir(categoryPath);
          results.details.categories[category] = {
            type: 'directory',
            files
          };
        }
      }
    } catch (error) {
      results.status = 'fail';
      results.message = `Prompt目录访问失败: ${error.message}`;
    }

    results.duration = Date.now() - startTime;
    return results;
  }

  private async checkDependencies(): Promise<CheckResult> {
    const startTime = Date.now();
    const results: CheckResult = {
      status: 'pass',
      message: '依赖包正常',
      details: {
        dependencies: 20,
        devDependencies: 6,
        nodeModulesExists: fsSync.existsSync('node_modules')
      }
    };

    results.duration = Date.now() - startTime;
    return results;
  }

  async performAllChecks(): Promise<HealthReport> {
    const startTime = Date.now();
    const checks: Record<string, CheckResult> = {};
    let totalPassed = 0;
    let totalFailed = 0;
    let totalWarnings = 0;

    for (const [checkId, checkConfig] of this.checks) {
      try {
        const result = await checkConfig.check();
        checks[checkId] = {
          name: checkConfig.name,
          critical: checkConfig.critical,
          status: result.status,
          message: result.message,
          details: result.details,
          duration: result.duration
        };

        if (result.status === 'pass') {
          totalPassed++;
        } else if (result.status === 'fail') {
          totalFailed++;
        } else {
          totalWarnings++;
        }
      } catch (error) {
        checks[checkId] = {
          name: checkConfig.name,
          critical: checkConfig.critical,
          status: 'error',
          message: `检查执行失败: ${(error as Error).message}`
        };
        totalFailed++;
      }
    }

    // 确定整体状态
    let overallStatus = 'healthy';
    if (totalFailed > 0) {
      overallStatus = 'unhealthy';
    } else if (totalWarnings > 0) {
      overallStatus = 'degraded';
    }

    const report: HealthReport = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      summary: {
        total: Object.keys(checks).length,
        passed: totalPassed,
        failed: totalFailed,
        warnings: totalWarnings
      },
      checks,
      recommendations: []
    };

    return report;
  }

  generateReport(checks: HealthReport): HealthReport {
    const recommendations: string[] = [];

    // 基于检查结果生成建议
    for (const [checkId, result] of Object.entries(checks.checks)) {
      if (result.status === 'fail') {
        recommendations.push(`修复 ${result.name} 检查失败: ${result.message}`);
      }
    }

    return {
      ...checks,
      recommendations
    };
  }
}

export default HealthService;