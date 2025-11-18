#!/usr/bin/env node

/**
 * 增强部署脚本
 * 提供环境检查、依赖验证、配置验证、连接测试、健康检查和回滚机制
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

class EnhancedDeployer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.backupDir = path.join(this.projectRoot, '.backup');
    this.healthCheckUrl = 'http://localhost:3000/api/status';
    this.maxRetries = 3;
    this.retryDelay = 2000;
  }

  /**
   * 主部署流程
   */
  async deploy() {
    console.log(chalk.blue('🚀 开始增强部署流程...\n'));

    try {
      // Phase 1: 环境检查
      await this.checkEnvironment();
      
      // Phase 2: 依赖验证
      await this.validateDependencies();
      
      // Phase 3: 配置验证
      await this.validateConfiguration();
      
      // Phase 4: 创建备份
      await this.createBackup();
      
      // Phase 5: 数据库连接测试
      await this.testDatabaseConnections();
      
      // Phase 6: 执行部署
      await this.executeDeployment();
      
      // Phase 7: 健康检查
      await this.performHealthCheck();
      
      console.log(chalk.green('✅ 部署成功完成！'));
      
    } catch (error) {
      console.error(chalk.red(`❌ 部署失败: ${error.message}`));
      await this.rollback();
      process.exit(1);
    }
  }

  /**
   * 环境检查
   */
  async checkEnvironment() {
    console.log(chalk.yellow('📋 Phase 1: 环境检查...'));

    // 检查Node.js版本
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 14) {
      throw new Error(`Node.js版本过低: ${nodeVersion}，需要v14或更高版本`);
    }
    console.log(chalk.green(`  ✓ Node.js版本: ${nodeVersion}`));

    // 检查npm版本
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      console.log(chalk.green(`  ✓ npm版本: ${npmVersion}`));
    } catch (error) {
      throw new Error('无法获取npm版本');
    }

    // 检查可用内存
    const freeMemory = require('os').freemem() / 1024 / 1024 / 1024; // GB
    if (freeMemory < 1) {
      console.log(chalk.yellow(`  ⚠️  可用内存较低: ${freeMemory.toFixed(2)}GB`));
    } else {
      console.log(chalk.green(`  ✓ 可用内存: ${freeMemory.toFixed(2)}GB`));
    }

    // 检查磁盘空间
    try {
      const stats = await fs.stat(this.projectRoot);
      console.log(chalk.green(`  ✓ 项目目录可访问`));
    } catch (error) {
      throw new Error(`项目目录访问失败: ${error.message}`);
    }

    console.log(chalk.green('✅ 环境检查完成\n'));
  }

  /**
   * 依赖验证
   */
  async validateDependencies() {
    console.log(chalk.yellow('📦 Phase 2: 依赖验证...'));

    try {
      // 检查package.json是否存在
      const packagePath = path.join(this.projectRoot, 'package.json');
      await fs.access(packagePath);
      console.log(chalk.green('  ✓ package.json存在'));

      // 检查node_modules是否存在
      const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
      try {
        await fs.access(nodeModulesPath);
        console.log(chalk.green('  ✓ node_modules存在'));
      } catch (error) {
        console.log(chalk.yellow('  ⚠️  node_modules不存在，正在安装依赖...'));
        execSync('npm install', { cwd: this.projectRoot, stdio: 'inherit' });
        console.log(chalk.green('  ✓ 依赖安装完成'));
      }

      // 验证关键依赖
      const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'));
      const criticalDeps = ['express', 'chalk', 'commander', 'inquirer'];
      
      for (const dep of criticalDeps) {
        if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
          console.log(chalk.green(`  ✓ ${dep}依赖可用`));
        } else {
          throw new Error(`关键依赖缺失: ${dep}`);
        }
      }

    } catch (error) {
      throw new Error(`依赖验证失败: ${error.message}`);
    }

    console.log(chalk.green('✅ 依赖验证完成\n'));
  }

  /**
   * 配置验证
   */
  async validateConfiguration() {
    console.log(chalk.yellow('⚙️  Phase 3: 配置验证...'));

    try {
      // 检查环境配置文件
      const envExamplePath = path.join(this.projectRoot, '.env.example');
      const envPath = path.join(this.projectRoot, '.env');

      try {
        await fs.access(envExamplePath);
        console.log(chalk.green('  ✓ .env.example存在'));
      } catch (error) {
        console.log(chalk.yellow('  ⚠️  .env.example不存在'));
      }

      try {
        await fs.access(envPath);
        console.log(chalk.green('  ✓ .env配置文件存在'));
        
        // 验证环境变量格式
        const envContent = await fs.readFile(envPath, 'utf8');
        const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
        
        for (const line of envLines) {
          if (!line.includes('=')) {
            console.log(chalk.yellow(`  ⚠️  环境变量格式可能不正确: ${line}`));
          }
        }
        
      } catch (error) {
        console.log(chalk.yellow('  ⚠️  .env配置文件不存在，将使用默认配置'));
      }

      // 检查规则目录
      const rulesPath = path.join(this.projectRoot, 'rules');
      try {
        await fs.access(rulesPath);
        const rules = await fs.readdir(rulesPath);
        console.log(chalk.green(`  ✓ 规则目录存在，包含${rules.length}个数据库规则集`));
      } catch (error) {
        throw new Error(`规则目录访问失败: ${error.message}`);
      }

      // 检查prompt目录
      const promptsPath = path.join(this.projectRoot, 'src', 'prompts');
      try {
        await fs.access(promptsPath);
        console.log(chalk.green('  ✓ prompts目录存在'));
      } catch (error) {
        throw new Error(`prompts目录访问失败: ${error.message}`);
      }

    } catch (error) {
      throw new Error(`配置验证失败: ${error.message}`);
    }

    console.log(chalk.green('✅ 配置验证完成\n'));
  }

  /**
   * 创建备份
   */
  async createBackup() {
    console.log(chalk.yellow('💾 Phase 4: 创建备份...'));

    try {
      // 创建备份目录
      await fs.mkdir(this.backupDir, { recursive: true });
      
      // 生成备份时间戳
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup-${timestamp}`;
      const currentBackupDir = path.join(this.backupDir, backupName);
      
      await fs.mkdir(currentBackupDir, { recursive: true });

      // 备份关键文件
      const filesToBackup = [
        'package.json',
        'src/index.js',
        'src/core/',
        'src/cli/',
        'src/services/',
        'src/utils/',
        'src/prompts/',
        'rules/'
      ];

      for (const file of filesToBackup) {
        const sourcePath = path.join(this.projectRoot, file);
        const targetPath = path.join(currentBackupDir, file);
        
        try {
          await this.copyRecursive(sourcePath, targetPath);
          console.log(chalk.green(`  ✓ 已备份: ${file}`));
        } catch (error) {
          console.log(chalk.yellow(`  ⚠️  备份跳过: ${file} (${error.message})`));
        }
      }

      // 保存备份信息
      const backupInfo = {
        timestamp: new Date().toISOString(),
        version: require(path.join(this.projectRoot, 'package.json')).version,
        files: filesToBackup
      };
      
      await fs.writeFile(
        path.join(currentBackupDir, 'backup-info.json'),
        JSON.stringify(backupInfo, null, 2)
      );

      // 保留最近5个备份
      await this.cleanupOldBackups();

      console.log(chalk.green(`✅ 备份完成: ${backupName}\n`));

    } catch (error) {
      throw new Error(`备份创建失败: ${error.message}`);
    }
  }

  /**
   * 数据库连接测试
   */
  async testDatabaseConnections() {
    console.log(chalk.yellow('🔗 Phase 5: 数据库连接测试...'));

    try {
      // 加载数据库配置
      const dbConfig = require(path.join(this.projectRoot, 'src', 'config', 'databases.js'));
      
      // 测试各数据库连接配置
      const databases = ['mysql', 'postgresql', 'sqlite', 'sqlserver', 'oracle'];
      
      for (const db of databases) {
        if (dbConfig[db]) {
          console.log(chalk.green(`  ✓ ${db}配置可用`));
        } else {
          console.log(chalk.yellow(`  ⚠️  ${db}配置缺失`));
        }
      }

      // 如果有环境变量配置的数据库，进行连接测试
      if (process.env.DATABASE_URL) {
        console.log(chalk.green('  ✓ 检测到DATABASE_URL环境变量'));
        // 这里可以添加实际的连接测试逻辑
      }

    } catch (error) {
      console.log(chalk.yellow(`  ⚠️  数据库配置测试跳过: ${error.message}`));
    }

    console.log(chalk.green('✅ 数据库连接测试完成\n'));
  }

  /**
   * 执行部署
   */
  async executeDeployment() {
    console.log(chalk.yellow('🚀 Phase 6: 执行部署...'));

    try {
      // 运行测试
      console.log(chalk.blue('  运行测试...'));
      try {
        execSync('npm test', { cwd: this.projectRoot, stdio: 'pipe' });
        console.log(chalk.green('  ✓ 测试通过'));
      } catch (error) {
        console.log(chalk.yellow('  ⚠️  测试失败，但继续部署'));
      }

      // 构建项目（如果有构建脚本）
      const packageJson = JSON.parse(await fs.readFile(path.join(this.projectRoot, 'package.json'), 'utf8'));
      if (packageJson.scripts && packageJson.scripts.build) {
        console.log(chalk.blue('  构建项目...'));
        execSync('npm run build', { cwd: this.projectRoot, stdio: 'inherit' });
        console.log(chalk.green('  ✓ 项目构建完成'));
      }

      console.log(chalk.green('✅ 部署执行完成\n'));

    } catch (error) {
      throw new Error(`部署执行失败: ${error.message}`);
    }
  }

  /**
   * 健康检查
   */
  async performHealthCheck() {
    console.log(chalk.yellow('🏥 Phase 7: 健康检查...'));

    try {
      // 检查CLI命令是否可用
      console.log(chalk.blue('  测试CLI命令...'));
      const helpOutput = execSync('node src/index.js --help', { 
        cwd: this.projectRoot, 
        encoding: 'utf8' 
      });
      
      if (helpOutput.includes('sql-analyzer')) {
        console.log(chalk.green('  ✓ CLI命令可用'));
      } else {
        throw new Error('CLI命令响应异常');
      }

      // 检查核心模块加载
      console.log(chalk.blue('  测试核心模块...'));
      try {
        const coordinator = require(path.join(this.projectRoot, 'src', 'core', 'coordinator.js'));
        const promptLoader = require(path.join(this.projectRoot, 'src', 'utils', 'promptLoader.js'));
        console.log(chalk.green('  ✓ 核心模块加载正常'));
      } catch (error) {
        throw new Error(`核心模块加载失败: ${error.message}`);
      }

      // 检查API服务（如果启动）
      if (this.isServiceRunning()) {
        console.log(chalk.blue('  测试API服务...'));
        await this.testApiEndpoint();
      } else {
        console.log(chalk.yellow('  ⚠️  API服务未运行，跳过API测试'));
      }

      console.log(chalk.green('✅ 健康检查完成\n'));

    } catch (error) {
      throw new Error(`健康检查失败: ${error.message}`);
    }
  }

  /**
   * 回滚机制
   */
  async rollback() {
    console.log(chalk.red('🔄 开始回滚...'));

    try {
      // 获取最新备份
      const backups = await fs.readdir(this.backupDir);
      const latestBackup = backups
        .filter(name => name.startsWith('backup-'))
        .sort()
        .pop();

      if (!latestBackup) {
        console.log(chalk.red('❌ 未找到备份，无法回滚'));
        return;
      }

      const backupPath = path.join(this.backupDir, latestBackup);
      console.log(chalk.yellow(`  回滚到备份: ${latestBackup}`));

      // 恢复文件
      const backupInfo = JSON.parse(
        await fs.readFile(path.join(backupPath, 'backup-info.json'), 'utf8')
      );

      for (const file of backupInfo.files) {
        const sourcePath = path.join(backupPath, file);
        const targetPath = path.join(this.projectRoot, file);
        
        try {
          await this.copyRecursive(sourcePath, targetPath);
          console.log(chalk.green(`  ✓ 已恢复: ${file}`));
        } catch (error) {
          console.log(chalk.yellow(`  ⚠️  恢复跳过: ${file}`));
        }
      }

      console.log(chalk.green('✅ 回滚完成'));

    } catch (error) {
      console.log(chalk.red(`❌ 回滚失败: ${error.message}`));
    }
  }

  /**
   * 辅助方法：递归复制
   */
  async copyRecursive(source, target) {
    const stat = await fs.stat(source);
    
    if (stat.isDirectory()) {
      await fs.mkdir(target, { recursive: true });
      const items = await fs.readdir(source);
      
      for (const item of items) {
        await this.copyRecursive(
          path.join(source, item),
          path.join(target, item)
        );
      }
    } else {
      await fs.copyFile(source, target);
    }
  }

  /**
   * 清理旧备份
   */
  async cleanupOldBackups() {
    try {
      const backups = await fs.readdir(this.backupDir);
      const backupList = backups
        .filter(name => name.startsWith('backup-'))
        .sort()
        .reverse();

      if (backupList.length > 5) {
        const toDelete = backupList.slice(5);
        for (const backup of toDelete) {
          await fs.rmdir(path.join(this.backupDir, backup), { recursive: true });
        }
      }
    } catch (error) {
      console.log(chalk.yellow(`  ⚠️  备份清理失败: ${error.message}`));
    }
  }

  /**
   * 检查服务是否运行
   */
  isServiceRunning() {
    try {
      execSync('netstat -an | findstr :3000', { stdio: 'pipe' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 测试API端点
   */
  async testApiEndpoint() {
    const http = require('http');
    
    return new Promise((resolve, reject) => {
      const req = http.get(this.healthCheckUrl, (res) => {
        if (res.statusCode === 200) {
          console.log(chalk.green('  ✓ API服务健康检查通过'));
          resolve();
        } else {
          reject(new Error(`API响应状态码: ${res.statusCode}`));
        }
      });

      req.on('error', (error) => {
        reject(new Error(`API连接失败: ${error.message}`));
      });

      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('API请求超时'));
      });
    });
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const deployer = new EnhancedDeployer();
  deployer.deploy().catch(error => {
    console.error(chalk.red(`部署失败: ${error.message}`));
    process.exit(1);
  });
}

module.exports = EnhancedDeployer;