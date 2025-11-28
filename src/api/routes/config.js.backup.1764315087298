/**
 * 配置管理路由模块
 * 提供配置管理相关的API端点
 */

import chalk from 'chalk';
import { createValidationError } from '../../utils/api/api-error.js';
import { config } from '../../config/index.js';

import { formatSuccessResponse, formatErrorResponse } from '../../utils/api/response-formatter.js';

/**
 * 注册配置管理相关路由
 * @param {Object} app - Hono应用实例
 */
export function registerConfigRoutes(app) {
  /**
   * GET /api/config - 获取所有配置
   * 返回当前系统的所有配置项
   */
  app.get('/api/config', async (c) => {
    try {
      console.log('[DEBUG] /api/config 路由被调用');
      console.log('[DEBUG] config 类型:', typeof config);
      console.log('[DEBUG] config 实例:', config);

      const configData = config.getAll();
      
      return c.json(formatSuccessResponse(config, '获取配置成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 获取配置失败: ${error.message}`));
      console.error('[DEBUG] 错误堆栈:', error.stack);
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });
  
  /**
   * GET /api/config/modules - 获取配置模块列表
   * 返回所有可用的配置模块
   */
  app.get('/api/config/modules', async (c) => {
    try {
      const configData = config.getAll();
      
      const modules = Object.keys(config);
      
      return c.json(formatSuccessResponse({
        modules,
        count: modules.length
      }, '获取配置模块列表成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 获取配置模块列表失败: ${error.message}`));
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });
  
  /**
   * GET /api/config/:key - 获取指定配置项
   * 返回指定键名的配置值
   */
  app.get('/api/config/:key', async (c) => {
    try {
      const key = c.req.param('key');
      console.log('[DEBUG] /api/config/:key 路由被调用，key =', key);
      console.log('[DEBUG] config 类型:', typeof config);

      const configData = config.getAll();
      
      if (!(key in config)) {
        throw createValidationError(`配置项 "${key}" 不存在`);
      }
      
      return c.json(formatSuccessResponse({
        key,
        value: config[key]
      }, `获取配置项成功`));
    } catch (error) {
      console.error(chalk.red(`[API] 获取配置项失败: ${error.message}`));
      console.error('[DEBUG] 错误堆栈:', error.stack);
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });
  
  /**
   * PUT /api/config/:key - 设置配置项
   * 设置指定键名的配置值
   *
   * Request Body:
   * {
   *   "value": "配置值"
   * }
   */
  app.put('/api/config/:key', async (c) => {
    try {
      const key = c.req.param('key');
      const body = await c.req.json();
      
      if (body.value === undefined) {
        throw createValidationError('请求体必须包含 "value" 字段');
      }
      
      config.set(key, body.value);
      
      console.log(chalk.green(`[API] 配置项 "${key}" 已更新为: ${body.value}`));
      
      return c.json(formatSuccessResponse({
        key,
        value: body.value
      }, `配置项 "${key}" 已更新`));
    } catch (error) {
      console.error(chalk.red(`[API] 设置配置项失败: ${error.message}`));
      
      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });
  
}