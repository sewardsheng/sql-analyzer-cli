/**
* 系统状态路由模块
* 合并健康检查和状态查询功能
*/

import chalk from 'chalk';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createValidationError } from '../../utils/api/api-error.js';
import { formatSuccessResponse, formatErrorResponse } from '../../utils/api/response-formatter.js';
import { config } from '../../config/index.js';
import { ServiceContainer } from '../../services/factories/ServiceContainer.js';

// 使用ServiceContainer统一管理服务
const serviceContainer = ServiceContainer.getInstance();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
* 注册系统状态相关路由
* @param {Object} app - Hono应用实例
*/
export function registerSystemRoutes(app) {
/**
* GET /api/health - 系统健康检查
* 执行完整的系统健康检查
*/
app.get('/health', async (c: any) => {
try {
const healthService = serviceContainer.getHealthService();
const results = await healthService.performAllChecks();
const report = healthService.generateReport(results);

// 设置HTTP状态码基于健康状态
let statusCode = 200;
if (results.status === 'unhealthy') {
statusCode = 503; // Service Unavailable
} else if (results.status === 'degraded') {
statusCode = 200; // Still OK but with warnings
}

return c.json(formatSuccessResponse({
status: results.status,
timestamp: results.timestamp,
summary: results.summary,
checks: results.checks,
recommendations: report.recommendations
}, '系统健康检查完成'), statusCode);

} catch (error) {
// 错误会被中间件处理，这里重新抛出
throw error;
}
});

/**
* GET /api/health/ping - 简单ping检查
* 用于服务可用性测试
*/
app.get('/health/ping', (c) => {
return c.json(formatSuccessResponse({
message: 'pong',
uptime: process.uptime()
}, '服务可用性检查'));
});

/**
* GET /api/health/check/:type - 特定类型健康检查
* 执行指定类型的健康检查
*/
app.get('/health/check/:type', async (c: any) => {
try {
const { type } = c.req.param();
const healthService = serviceContainer.getHealthService();

// 验证检查类型
const validChecks = [
'core-modules',
'configuration',
'rules',
'prompts',
'dependencies',
'memory',
'disk-space',
'cpu-usage',
'network',
'external-services',
'api-performance'
];

if (!validChecks.includes(type)) {
throw createValidationError(`无效的检查类型: ${type}`);
}

const check =  (healthService as any).checks.get(type);
if (!check) {
throw createValidationError(`检查项不存在: ${type}`);
}

const result = await check.check();

return c.json(formatSuccessResponse({
type: type,
name: check.name,
status: result.status,
message: result.message,
details: result.details,
duration: result.duration
}, `健康检查完成: ${type}`));

} catch (error) {
// 错误会被中间件处理，这里重新抛出
throw error;
}
});

/**
* GET /api/status - 获取系统状态
* 返回系统各组件的状态信息
*
* Query Parameters:
* - interactive: 是否返回交互式格式的状态信息
*/
app.get('/status', async (c: any) => {
try {
const interactive = c.req.query('interactive') === 'true';

// 获取配置信息
const configData = config.getAll();

// 获取知识库状态
let knowledgeBaseStatus: { enabled: boolean; initialized: boolean; rulesCount: number; error?: string } = { enabled: false, initialized: false, rulesCount: 0 };
if ( (config as any).knowledgeBase?.enabled) {
try {
const { KnowledgeService } = await import('../../services/knowledge-service.js');
const knowledgeService = new KnowledgeService();
knowledgeBaseStatus = await knowledgeService.getStatus();
} catch (error: any) {
knowledgeBaseStatus.error = error.message;
}
}

// 获取历史记录统计
let historyStats: { total: number; recent: number; databaseTypes: Record<string, number>; types: Record<string, number>; dateRange: { start: string; end: string }; averageDuration: number; error?: string } = {
total: 0,
recent: 0,
databaseTypes: {},
types: {},
dateRange: { start: '', end: '' },
averageDuration: 0
};
try {
const { getHistoryService } = await import('../../services/history-service-impl.js');
const historyService = await getHistoryService();
const result = await historyService.getHistoryStats();
historyStats = {
total: result.total || 0,
recent: 0, // 暂时设为0，因为getHistoryStats没有返回recent属性
databaseTypes: result.databaseTypes || {},
types: result.types || {},
dateRange: result.dateRange || { start: '', end: '' },
averageDuration: result.averageDuration || 0
};
} catch (error: any) {
historyStats.error = error.message;
}

// 检查必要目录
const projectRoot = join(__dirname, '../../../..');
const requiredDirs = [
'data',
'data/history',
'data/knowledge',
'data/config',
'logs'
];

const dirStatus = {};
for (const dir of requiredDirs) {
dirStatus[dir] = existsSync(join(projectRoot, dir));
}

// 检查配置文件
const configExists = existsSync(join(projectRoot, 'data/config/config.json'));

// 系统信息
const systemInfo = {
version: (config as any).version || '1.0.0',
nodeVersion: process.version,
platform: process.platform,
uptime: process.uptime(),
memoryUsage: process.memoryUsage(),
initialized: (config as any).initialized && configExists
};

const statusData = {
system: systemInfo,
config: {
initialized: (config as any).initialized,
fileExists: configExists,
knowledgeBase:  (config as any).knowledgeBase || {}
},
directories: dirStatus,
knowledgeBase: knowledgeBaseStatus,
history: historyStats,
timestamp: new Date().toISOString()
};

// 如果请求交互式格式，返回格式化的状态信息
if (interactive) {
const statusLines = [];

statusLines.push(chalk.bold.blue('SQL分析器系统状态'));
statusLines.push('');

// 系统信息
statusLines.push(chalk.bold('系统信息:'));
statusLines.push(`  版本: ${systemInfo.version}`);
statusLines.push(`  Node.js版本: ${systemInfo.nodeVersion}`);
statusLines.push(`  平台: ${systemInfo.platform}`);
statusLines.push(`  运行时间: ${Math.floor(systemInfo.uptime / 60)}分钟`);
statusLines.push(`  内存使用: ${Math.round(systemInfo.memoryUsage.heapUsed / 1024 / 1024)}MB`);
statusLines.push(`  初始化状态: ${systemInfo.initialized ? chalk.green('已初始化') : chalk.red('未初始化')}`);
statusLines.push('');

// 知识库状态
statusLines.push(chalk.bold('知识库状态:'));
statusLines.push(`  启用状态: ${knowledgeBaseStatus.enabled ? chalk.green('已启用') : chalk.red('未启用')}`);
if (knowledgeBaseStatus.enabled) {
statusLines.push(`  初始化状态: ${knowledgeBaseStatus.initialized ? chalk.green('已初始化') : chalk.red('未初始化')}`);
statusLines.push(`  规则数量: ${knowledgeBaseStatus.rulesCount || 0}`);
}
statusLines.push('');

// 历史记录状态
statusLines.push(chalk.bold('历史记录状态:'));
statusLines.push(`  总记录数: ${historyStats.total || 0}`);
statusLines.push(`  最近记录数: ${historyStats.recent || 0}`);
statusLines.push('');

// 目录状态
statusLines.push(chalk.bold('目录状态:'));
for (const [dir, exists] of Object.entries(dirStatus)) {
statusLines.push(`  ${dir}: ${exists ? chalk.green('存在') : chalk.red('不存在')}`);
}

return c.json(formatSuccessResponse({
formatted: statusLines.join('\n'),
raw: statusData
}, '获取系统状态成功'));
}

// 默认返回JSON格式的状态信息
return c.json(formatSuccessResponse(statusData, '获取系统状态成功'));
} catch (error) {
console.error(chalk.red(`[API] 获取系统状态失败: ${error.message}`));

// 错误会被中间件处理，这里重新抛出
throw error;
}
});

}