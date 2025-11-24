/**
 * 部署功能测试
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DeploymentTester {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.testResults = [];
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log('🧪 开始部署功能测试...\n');

    try {
      await this.testHealthCheckCommand();
      await this.testHealthCheckAPI();
      await this.testDeployScript();
      await this.testBackupCreation();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ 测试执行失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 测试健康检查API
   */
  async testHealthCheckCommand() {
    console.log('📋 测试健康检查API...');
    
    try {
      // 测试基本健康检查API
      const http = require('http');
      
      const result = await new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3000/api/health/ping', (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        });
        
        req.on('error', reject);
        req.setTimeout(5000, () => {
          req.destroy();
          reject(new Error('请求超时'));
        });
      });
      
      if (result.status === 'ok') {
        this.addResult('健康检查API', true, 'API响应正常');
      } else {
        this.addResult('健康检查API', false, 'API响应异常');
      }
      
    } catch (error) {
      this.addResult('健康检查API', false, error.message);
    }
  }

  /**
   * 测试详细健康状态API
   */
  async testHealthCheckAPI() {
    console.log('🌐 测试详细健康状态API...');
    
    try {
      // 测试详细健康状态端点
      const http = require('http');
      
      const statusResult = await new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3000/api/health/status', (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        });
        
        req.on('error', reject);
        req.setTimeout(5000, () => {
          req.destroy();
          reject(new Error('请求超时'));
        });
      });
      
      if (statusResult.status === 'healthy' && statusResult.uptime) {
        this.addResult('详细健康状态API', true, '状态信息完整');
      } else {
        this.addResult('详细健康状态API', false, '状态信息不完整');
      }
      
    } catch (error) {
      this.addResult('详细健康状态API', false, error.message);
    }
  }

  /**
   * 测试部署脚本
   */
  async testDeployScript() {
    console.log('🚀 测试部署脚本...');
    
    try {
      // 检查部署脚本是否存在
      const deployScriptPath = path.join(this.projectRoot, 'scripts', 'deploy.js');
      
      if (!fs.existsSync(deployScriptPath)) {
        this.addResult('部署脚本', false, '部署脚本文件不存在');
        return;
      }
      
      // 测试脚本语法
      const output = execSync('node -c scripts/deploy.js', { 
        cwd: this.projectRoot, 
        encoding: 'utf8' 
      });
      
      this.addResult('部署脚本', true, '脚本语法正确');
      
    } catch (error) {
      this.addResult('部署脚本', false, error.message);
    }
  }

  /**
   * 测试备份创建
   */
  async testBackupCreation() {
    console.log('💾 测试备份创建...');
    
    try {
      const backupDir = path.join(this.projectRoot, '.backup');
      
      // 检查备份目录是否可以创建
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // 测试备份目录权限
      const testFile = path.join(backupDir, 'test.txt');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      
      this.addResult('备份创建', true, '备份目录权限正常');
      
    } catch (error) {
      this.addResult('备份创建', false, error.message);
    }
  }

  /**
   * 添加测试结果
   */
  addResult(testName, success, message) {
    this.testResults.push({
      name: testName,
      success,
      message
    });
    
    const status = success ? '✅' : '❌';
    console.log(`  ${status} ${testName}: ${message}`);
  }

  /**
   * 打印测试结果
   */
  printResults() {
    console.log('\n📊 测试结果总结:');
    
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.success).length;
    const failed = total - passed;
    
    console.log(`  总测试数: ${total}`);
    console.log(`  通过: ${passed}`);
    console.log(`  失败: ${failed}`);
    
    if (failed > 0) {
      console.log('\n❌ 失败的测试:');
      this.testResults
        .filter(r => !r.success)
        .forEach(r => console.log(`  - ${r.name}: ${r.message}`));
    }
    
    console.log(`\n${failed === 0 ? '✅' : '❌'} 测试${failed === 0 ? '通过' : '失败'}`);
    
    if (failed > 0) {
      process.exit(1);
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const tester = new DeploymentTester();
  tester.runAllTests().catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
}

module.exports = DeploymentTester;