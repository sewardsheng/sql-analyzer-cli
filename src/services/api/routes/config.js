/**
 * 配置管理路由模块
 * 提供配置管理相关的API端点
 */

import chalk from 'chalk';
import { formatSuccessResponse, formatErrorResponse } from '../../../utils/apiResponseFormatter.js';

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
      const { readConfig } = await import('../../config/index.js');
      const config = await readConfig();
      
      return c.json(formatSuccessResponse(config, '获取配置成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 获取配置失败: ${error.message}`));
      
      return c.json(formatErrorResponse('获取配置失败', error.message), 500);
    }
  });
  
  /**
   * GET /api/config/:key - 获取指定配置项
   * 返回指定键名的配置值
   */
  app.get('/api/config/:key', async (c) => {
    try {
      const key = c.req.param('key');
      const { readConfig } = await import('../../config/index.js');
      const config = await readConfig();
      
      if (!(key in config)) {
        return c.json(formatErrorResponse(`配置项 "${key}" 不存在`), 404);
      }
      
      return c.json(formatSuccessResponse({
        key,
        value: config[key]
      }, '获取配置项成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 获取配置项失败: ${error.message}`));
      
      return c.json(formatErrorResponse('获取配置项失败', error.message), 500);
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
        return c.json(formatErrorResponse('请求体必须包含 "value" 字段'), 400);
      }
      
      const { setConfigValue } = await import('../../config/index.js');
      await setConfigValue(key, body.value);
      
      console.log(chalk.green(`[API] 配置项 "${key}" 已更新为: ${body.value}`));
      
      return c.json(formatSuccessResponse({
        key,
        value: body.value
      }, `配置项 "${key}" 已更新`));
    } catch (error) {
      console.error(chalk.red(`[API] 设置配置项失败: ${error.message}`));
      
      return c.json(formatErrorResponse('设置配置项失败', error.message), 500);
    }
  });
  
  /**
   * DELETE /api/config/:key - 删除配置项
   * 删除指定键名的配置项（恢复为默认值）
   */
  app.delete('/api/config/:key', async (c) => {
    try {
      const key = c.req.param('key');
      const { resetConfigValue } = await import('../../config/index.js');
      
      await resetConfigValue(key);
      
      console.log(chalk.green(`[API] 配置项 "${key}" 已重置`));
      
      return c.json(formatSuccessResponse(null, `配置项 "${key}" 已重置为默认值`));
    } catch (error) {
      console.error(chalk.red(`[API] 重置配置项失败: ${error.message}`));
      
      return c.json(formatErrorResponse('重置配置项失败', error.message), 500);
    }
  });
  
  /**
   * POST /api/config/reset - 重置所有配置
   * 将所有配置项重置为默认值
   */
  app.post('/api/config/reset', async (c) => {
    try {
      const { resetAllConfig } = await import('../../config/index.js');
      
      await resetAllConfig();
      
      console.log(chalk.green('[API] 所有配置已重置为默认值'));
      
      return c.json(formatSuccessResponse(null, '所有配置已重置为默认值'));
    } catch (error) {
      console.error(chalk.red(`[API] 重置所有配置失败: ${error.message}`));
      
      return c.json(formatErrorResponse('重置所有配置失败', error.message), 500);
    }
  });
  
  /**
   * GET /api/config/list - 列出所有配置项
   * 返回所有可用的配置项及其描述
   */
  app.get('/api/config/list', async (c) => {
    try {
      const { getAllConfigOptions } = await import('../../config/index.js');
      const configOptions = getAllConfigOptions();
      
      return c.json(formatSuccessResponse(configOptions, '获取配置项列表成功'));
    } catch (error) {
      console.error(chalk.red(`[API] 获取配置选项列表失败: ${error.message}`));
      
      return c.json(formatErrorResponse('获取配置选项列表失败', error.message), 500);
    }
  });
}