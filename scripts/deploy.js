#!/usr/bin/env bun
/**
 * 部署脚本
 * 支持多种部署方式：Docker、PM2、Systemd
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// 颜色输出函数
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`
};

function log(message, color = 'white') {
  console.log(colors[color] ? colors[color](message) : message);
}

function logStep(step) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(`🚀 ${step}`, 'cyan');
  log(`${'='.repeat(60)}\n`, 'blue');
}

function runCommand(command, description) {
  log(`📋 执行: ${description}`, 'yellow');
  try {
    execSync(command, { stdio: 'inherit' });
    log(`✅ 成功: ${description}`, 'green');
  } catch (error) {
    log(`❌ 失败: ${description}`, 'red');
    log(`错误信息: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 读取配置
let config;
try {
  const configPath = resolve(process.cwd(), 'deploy.config.json');
  config = JSON.parse(readFileSync(configPath, 'utf8'));
} catch (error) {
  log('⚠️  未找到deploy.config.json，使用默认配置', 'yellow');
  config = {
    deploymentType: 'docker',
    environment: 'production',
    port: 3000,
    host: '0.0.0.0'
  };
}

// 部署类型
const deploymentType = process.argv[2] || config.deploymentType;

logStep('开始部署 SQL Analyzer API');
log(`部署类型: ${deploymentType}`, 'cyan');
log(`环境: ${config.environment}`, 'cyan');

switch (deploymentType.toLowerCase()) {
  case 'docker':
    deployDocker();
    break;
  case 'pm2':
    deployPM2();
    break;
  case 'systemd':
    deploySystemd();
    break;
  case 'build':
    buildOnly();
    break;
  default:
    log(`❌ 不支持的部署类型: ${deploymentType}`, 'red');
    log('支持的类型: docker, pm2, systemd, build', 'yellow');
    process.exit(1);
}

function deployDocker() {
  logStep('Docker 部署');
  
  // 构建镜像
  runCommand('docker build -t sql-analyzer-api .', '构建Docker镜像');
  
  // 停止现有容器
  try {
    execSync('docker stop sql-analyzer-api 2>/dev/null || true');
    execSync('docker rm sql-analyzer-api 2>/dev/null || true');
    log('🗑️  清理现有容器', 'yellow');
  } catch (error) {
    // 忽略错误
  }
  
  // 启动新容器
  const dockerRunCmd = [
    'docker run -d',
    '--name sql-analyzer-api',
    `-p ${config.port}:3000`,
    '--restart unless-stopped',
    '-e NODE_ENV=production',
    '-e API_HOST=0.0.0.0',
    '-e API_PORT=3000',
    '-v $(pwd)/logs:/app/logs',
    'sql-analyzer-api'
  ].join(' ');
  
  runCommand(dockerRunCmd, '启动Docker容器');
  
  logStep('部署完成');
  log(`🌐 API服务地址: http://localhost:${config.port}`, 'green');
  log(`📖 API文档: http://localhost:${config.port}/api/docs/swagger`, 'green');
}

function deployPM2() {
  logStep('PM2 部署');
  
  // 检查PM2是否安装
  try {
    execSync('pm2 --version', { stdio: 'pipe' });
  } catch (error) {
    log('❌ PM2未安装，请先安装PM2', 'red');
    log('安装命令: npm install -g pm2', 'yellow');
    process.exit(1);
  }
  
  // 构建项目
  runCommand('bun run build', '构建项目');
  
  // 停止现有进程
  try {
    execSync('pm2 stop sql-analyzer-api 2>/dev/null || true');
    execSync('pm2 delete sql-analyzer-api 2>/dev/null || true');
    log('🗑️  清理现有PM2进程', 'yellow');
  } catch (error) {
    // 忽略错误
  }
  
  // 启动新进程
  const pm2Cmd = [
    'pm2 start',
    'dist/server.js',
    '--name sql-analyzer-api',
    '--env production',
    `-- ${config.port} ${config.host}`
  ].join(' ');
  
  runCommand(pm2Cmd, '启动PM2进程');
  
  // 保存PM2配置
  runCommand('pm2 save', '保存PM2配置');
  runCommand('pm2 startup', '设置PM2开机自启');
  
  logStep('部署完成');
  log(`🌐 API服务地址: http://localhost:${config.port}`, 'green');
  log(`📊 PM2监控: pm2 monit`, 'cyan');
}

function deploySystemd() {
  logStep('Systemd 部署');
  
  // 构建项目
  runCommand('bun run build', '构建项目');
  
  // 创建systemd服务文件
  const serviceContent = `[Unit]
Description=SQL Analyzer API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${process.cwd()}
Environment=NODE_ENV=production
Environment=API_HOST=${config.host}
Environment=API_PORT=${config.port}
ExecStart=/usr/bin/bun run dist/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target`;

  const servicePath = '/etc/systemd/system/sql-analyzer-api.service';
  
  try {
    execSync(`echo '${serviceContent}' | sudo tee ${servicePath}`, { stdio: 'inherit' });
    log('✅ 创建systemd服务文件', 'green');
  } catch (error) {
    log('❌ 创建systemd服务文件失败，请使用sudo权限运行', 'red');
    process.exit(1);
  }
  
  // 重新加载systemd
  runCommand('sudo systemctl daemon-reload', '重新加载systemd');
  
  // 启用并启动服务
  runCommand('sudo systemctl enable sql-analyzer-api', '启用服务');
  runCommand('sudo systemctl start sql-analyzer-api', '启动服务');
  
  logStep('部署完成');
  log(`🌐 API服务地址: http://localhost:${config.port}`, 'green');
  log(`📊 服务状态: sudo systemctl status sql-analyzer-api`, 'cyan');
}

function buildOnly() {
  logStep('仅构建项目');
  runCommand('bun run build', '构建项目');
  log('✅ 构建完成', 'green');
  log(`📁 输出目录: ${process.cwd()}/dist`, 'cyan');
}

logStep('部署验证');
runCommand('curl -s http://localhost:3000/api/health/ping', '验证服务健康状态');

log('\n🎉 部署完成！', 'green');
log('📋 有用的命令:', 'cyan');
log('  - 查看日志: docker logs sql-analyzer-api', 'yellow');
log('  - 健康检查: bun run healthcheck', 'yellow');
log('  - 重启服务: docker restart sql-analyzer-api', 'yellow');