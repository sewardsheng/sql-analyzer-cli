/**
 * 初始化路由模块
 * 提供系统初始化相关的API端点
 */

import chalk from 'chalk';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { formatSuccessResponse, formatErrorResponse } from '../../../utils/responseHandler.js';
import { createValidationError } from '../../../utils/apiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 注册初始化相关路由
 * @param {Object} app - Hono应用实例
 */
export function registerInitRoutes(app) {
  /**
   * POST /api/init - 初始化系统
   * 初始化SQL分析器系统，创建必要的目录和配置文件
   *
   * Request Body (可选):
   * {
   *   "force": true,  // 是否强制重新初始化
   *   "config": {     // 自定义初始配置
   *     "knowledgeBase": {
   *       "enabled": true
   *     }
   *   }
   * }
   */
  app.post('/api/init', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const { force = false, config: customConfig = {} } = body;
      
      // 检查系统是否已初始化
      const { readConfig } = await import('../../config/index.js');
      const config = await readConfig();
      
      if (config.initialized && !force) {
        throw createValidationError('系统已经初始化。如需重新初始化，请设置 force 参数为 true');
      }
      
      // 创建必要的目录
      const { ensureDirectories } = await import('../../utils/fileUtils.js');
      await ensureDirectories();
      
      // 初始化配置
      const { initializeConfig } = await import('../../config/index.js');
      const newConfig = await initializeConfig(customConfig);
      
      // 初始化知识库（如果启用）
      if (newConfig.knowledgeBase?.enabled) {
        try {
          const { initializeKnowledgeBase } = await import('../../services/knowledgeService.js');
          await initializeKnowledgeBase();
          console.log(chalk.green('[API] 知识库初始化完成'));
        } catch (error) {
          console.warn(chalk.yellow(`[API] 知识库初始化警告: ${error.message}`));
        }
      }
      
      console.log(chalk.green('[API] 系统初始化完成'));
      
      return c.json(formatSuccessResponse({
        initialized: true,
        config: newConfig,
        directories: [
          'data',
          'data/history',
          'data/knowledge',
          'data/config',
          'logs'
        ]
      }, '系统初始化成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 系统初始化失败: ${error.message}`));
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });
  
  /**
   * GET /api/init/status - 获取初始化状态
   * 检查系统是否已初始化以及各组件的状态
   */
  app.get('/api/init/status', async (c) => {
    try {
      const { readConfig } = await import('../../config/index.js');
      const config = await readConfig();
      
      // 检查必要目录是否存在
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
      
      // 检查配置文件状态
      const configExists = existsSync(join(projectRoot, 'data/config/config.json'));
      
      // 检查知识库状态
      let knowledgeBaseStatus = 'not_initialized';
      if (config.knowledgeBase?.enabled) {
        try {
          const { getKnowledgeBaseStatus } = await import('../../services/knowledgeService.js');
          const status = await getKnowledgeBaseStatus();
          knowledgeBaseStatus = status.initialized ? 'initialized' : 'not_initialized';
        } catch (error) {
          knowledgeBaseStatus = 'error';
        }
      }
      
      const allDirsExist = Object.values(dirStatus).every(Boolean);
      const isInitialized = config.initialized && allDirsExist && configExists;
      
      return c.json(formatSuccessResponse({
        initialized: isInitialized,
        config: {
          initialized: config.initialized,
          fileExists: configExists
        },
        directories: dirStatus,
        allDirectoriesExist: allDirsExist,
        knowledgeBase: {
          enabled: config.knowledgeBase?.enabled || false,
          status: knowledgeBaseStatus
        }
      }, '获取初始化状态成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 获取初始化状态失败: ${error.message}`));
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });
  
  /**
   * POST /api/init/directories - 创建必要的目录结构
   * 仅创建目录，不进行其他初始化操作
   */
  app.post('/api/init/directories', async (c) => {
    try {
      const { ensureDirectories } = await import('../../utils/fileUtils.js');
      const createdDirs = await ensureDirectories();
      
      console.log(chalk.green('[API] 目录结构创建完成'));
      
      return c.json(formatSuccessResponse({
        directories: [
          {
            name: 'data',
            path: dataDir,
            created: existsSync(dataDir)
          },
          {
            name: 'data/history',
            path: historyDir,
            created: existsSync(historyDir)
          },
          {
            name: 'data/knowledge',
            path: knowledgeDir,
            created: existsSync(knowledgeDir)
          },
          {
            name: 'data/config',
            path: configDir,
            created: existsSync(configDir)
          },
          {
            name: 'logs',
            path: logsDir,
            created: existsSync(logsDir)
          }
        ],
        allCreated: allCreated
      }, '创建目录结构成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 创建目录结构失败: ${error.message}`));
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });
  
  /**
   * POST /api/init/config - 初始化配置文件
   * 仅初始化配置文件，不进行其他初始化操作
   *
   * Request Body (可选):
   * {
   *   "config": {  // 自定义初始配置
   *     "knowledgeBase": {
   *       "enabled": true
   *     }
   *   }
   * }
   */
  app.post('/api/init/config', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const { config: customConfig = {} } = body;
      
      const { initializeConfig } = await import('../../config/index.js');
      const config = await initializeConfig(customConfig);
      
      console.log(chalk.green('[API] 配置文件初始化完成'));
      
      return c.json(formatSuccessResponse({
        config
      }, '配置文件初始化成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 配置文件初始化失败: ${error.message}`));
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });
}