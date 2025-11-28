/**
 * 配置管理路由模块
 * 提供配置管理相关的API端点
 */

import { Context } from 'hono';
import { Hono } from 'hono';
import chalk from 'chalk';
import { createValidationError } from '../../utils/api/api-error.js';
// @ts-ignore
import { config } from '../../config/index.js';
import { formatSuccessResponse, formatErrorResponse } from '../../utils/api/response-formatter.js';

/**
 * 注册配置管理相关路由
 * @param app - Hono应用实例
 */
export function registerConfigRoutes(app: Hono): void {
  /**
   * GET /api/config - 获取所有配置
   * 返回当前系统的所有配置项
   */
  app.get('/config', async (c: Context) => {
    try {
      const configData = config.getAll();

      return c.json(formatSuccessResponse(configData, '获取配置成功'));
    } catch (error: any) {
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
  app.get('/config/modules', async (c: Context) => {
    try {
      const configData = config.getAll();

      const modules = Object.keys(configData);

      return c.json(formatSuccessResponse({
        modules,
        count: modules.length
      }, '获取配置模块列表成功'));
    } catch (error: any) {
      console.error(chalk.red(`[API] 获取配置模块列表失败: ${error.message}`));

      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });

  /**
   * GET /api/config/:key - 获取指定配置项
   * 返回指定键名的配置值
   */
  app.get('/config/:key', async (c: Context) => {
    try {
      const key = c.req.param('key');

      const configData = config.getAll();

      if (!(key in configData)) {
        throw createValidationError(`配置项 "${key}" 不存在`);
      }

      return c.json(formatSuccessResponse({
        key,
        value: configData[key]
      }, `获取配置项成功`));
    } catch (error: any) {
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
  app.put('/config/:key', async (c: Context) => {
    try {
      const key = c.req.param('key');
      const rawText = await c.req.text();
      let body;
      try {
        body = JSON.parse(rawText);
      } catch (jsonError) {
        console.error('JSON解析失败:', jsonError);
        throw createValidationError('无效的JSON请求体');
      }

      if (body.value === undefined) {
        throw createValidationError('请求体必须包含 "value" 字段');
      }

      config.set(key, body.value);

      console.log(chalk.green(`[API] 配置项 "${key}" 已更新为: ${body.value}`));

      return c.json(formatSuccessResponse({
        key,
        value: body.value
      }, `配置项 "${key}" 已更新`));
    } catch (error: any) {
      console.error(chalk.red(`[API] 设置配置项失败: ${error.message}`));

      // 错误会被中间件处理，这里重新抛出
      throw error;
    }
  });
}