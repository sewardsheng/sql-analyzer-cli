/**
 * 配置管理API路由
 * 提供配置管理的RESTful API接口
 */

import { Hono } from 'hono';
import { readConfig, setConfig } from '../../../utils/config.js';
import { validationMiddleware, errorHandlerMiddleware } from '../middleware/apiMiddleware.js';

// 创建配置管理API路由
const configApi = new Hono();

// 应用错误处理中间件
configApi.use('*', errorHandlerMiddleware());

/**
 * 获取当前配置
 * GET /api/config
 */
configApi.get('/', async (c) => {
  try {
    // 获取当前配置
    const config = await readConfig();
    
    // 返回配置，但不包含敏感信息如API密钥
    const safeConfig = {
      baseURL: config.baseURL,
      model: config.model,
      defaultDatabaseType: config.defaultDatabaseType,
      embeddingModel: config.embeddingModel,
      // API服务器配置
      apiPort: config.apiPort,
      apiHost: config.apiHost,
      apiCorsEnabled: config.apiCorsEnabled,
      apiCorsOrigin: config.apiCorsOrigin,
      // 标记API密钥是否已配置，但不返回实际值
      apiKeyConfigured: !!config.apiKey
    };

    return c.json({
      success: true,
      data: safeConfig
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '获取配置失败'
      }
    }, 500);
  }
});

/**
 * 更新配置
 * PUT /api/config
 * 请求体:
 *   - baseURL: API基础URL (可选)
 *   - apiKey: API密钥 (可选)
 *   - model: 模型名称 (可选)
 *   - defaultDatabaseType: 默认数据库类型 (可选)
 *   - embeddingModel: 嵌入模型名称 (可选)
 *   - apiPort: API服务器端口 (可选)
 *   - apiHost: API服务器主机 (可选)
 *   - apiCorsEnabled: 是否启用CORS (可选)
 *   - apiCorsOrigin: CORS允许的源 (可选)
 */
configApi.put('/', async (c) => {
  try {
    // 获取请求体
    const body = await c.req.json();
    
    // 验证至少有一个配置项
    if (Object.keys(body).length === 0) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '至少需要提供一个配置项'
        }
      }, 400);
    }

    // 验证配置项
    const validKeys = [
      'baseURL', 'apiKey', 'model', 'defaultDatabaseType', 
      'embeddingModel', 'apiPort', 'apiHost', 'apiCorsEnabled', 'apiCorsOrigin'
    ];
    
    const invalidKeys = Object.keys(body).filter(key => !validKeys.includes(key));
    if (invalidKeys.length > 0) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: `无效的配置项: ${invalidKeys.join(', ')}`
        }
      }, 400);
    }

    // 验证数据库类型
    if (body.defaultDatabaseType && 
        !['mysql', 'postgresql', 'oracle', 'sqlserver'].includes(body.defaultDatabaseType)) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '无效的数据库类型，支持的类型: mysql, postgresql, oracle, sqlserver'
        }
      }, 400);
    }

    // 验证API端口
    if (body.apiPort && (isNaN(body.apiPort) || body.apiPort < 1 || body.apiPort > 65535)) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '无效的端口号，必须是1-65535之间的数字'
        }
      }, 400);
    }

    // 更新配置
    for (const [key, value] of Object.entries(body)) {
      await setConfig(key, value);
    }

    // 获取更新后的配置
    const updatedConfig = await readConfig();
    
    // 返回安全的配置信息
    const safeConfig = {
      baseURL: updatedConfig.baseURL,
      model: updatedConfig.model,
      defaultDatabaseType: updatedConfig.defaultDatabaseType,
      embeddingModel: updatedConfig.embeddingModel,
      // API服务器配置
      apiPort: updatedConfig.apiPort,
      apiHost: updatedConfig.apiHost,
      apiCorsEnabled: updatedConfig.apiCorsEnabled,
      apiCorsOrigin: updatedConfig.apiCorsOrigin,
      // 标记API密钥是否已配置，但不返回实际值
      apiKeyConfigured: !!updatedConfig.apiKey
    };

    return c.json({
      success: true,
      data: safeConfig,
      message: '配置更新成功'
    });
  } catch (error) {
    console.error('更新配置失败:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '更新配置失败'
      }
    }, 500);
  }
});

/**
 * 获取单个配置项
 * GET /api/config/:key
 */
configApi.get('/:key', async (c) => {
  try {
    const key = c.req.param('key');
    
    // 验证配置项名称
    const validKeys = [
      'baseURL', 'model', 'defaultDatabaseType', 
      'embeddingModel', 'apiPort', 'apiHost', 'apiCorsEnabled', 'apiCorsOrigin'
    ];
    
    if (!validKeys.includes(key)) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '无效的配置项名称'
        }
      }, 400);
    }

    // 获取配置
    const config = await readConfig();
    const value = config[key];
    
    // 特殊处理API密钥
    if (key === 'apiKey') {
      return c.json({
        success: true,
        data: {
          configured: !!value
        }
      });
    }

    return c.json({
      success: true,
      data: {
        [key]: value
      }
    });
  } catch (error) {
    console.error('获取配置项失败:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '获取配置项失败'
      }
    }, 500);
  }
});

/**
 * 更新单个配置项
 * PUT /api/config/:key
 * 请求体:
 *   - value: 配置值
 */
configApi.put('/:key', async (c) => {
  try {
    const key = c.req.param('key');
    const body = await c.req.json();
    const { value } = body;
    
    // 验证配置项名称
    const validKeys = [
      'baseURL', 'apiKey', 'model', 'defaultDatabaseType', 
      'embeddingModel', 'apiPort', 'apiHost', 'apiCorsEnabled', 'apiCorsOrigin'
    ];
    
    if (!validKeys.includes(key)) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '无效的配置项名称'
        }
      }, 400);
    }

    // 验证值不为空
    if (value === undefined || value === null || value === '') {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '配置值不能为空'
        }
      }, 400);
    }

    // 验证数据库类型
    if (key === 'defaultDatabaseType' && 
        !['mysql', 'postgresql', 'oracle', 'sqlserver'].includes(value)) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '无效的数据库类型，支持的类型: mysql, postgresql, oracle, sqlserver'
        }
      }, 400);
    }

    // 验证API端口
    if (key === 'apiPort' && (isNaN(value) || value < 1 || value > 65535)) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '无效的端口号，必须是1-65535之间的数字'
        }
      }, 400);
    }

    // 更新配置
    await setConfig(key, value);

    // 获取更新后的配置
    const updatedConfig = await readConfig();
    
    // 返回安全的配置信息
    let responseValue = value;
    
    // 特殊处理API密钥
    if (key === 'apiKey') {
      responseValue = { configured: !!updatedConfig.apiKey };
    }

    return c.json({
      success: true,
      data: {
        [key]: responseValue
      },
      message: '配置项更新成功'
    });
  } catch (error) {
    console.error('更新配置项失败:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '更新配置项失败'
      }
    }, 500);
  }
});

/**
 * 重置配置为默认值
 * POST /api/config/reset
 */
configApi.post('/reset', async (c) => {
  try {
    // 重置所有配置为默认值
    const defaultConfig = {
      baseURL: 'https://api.siliconflow.cn/v1',
      model: 'zai-org/GLM-4.6',
      defaultDatabaseType: 'mysql',
      embeddingModel: 'BAAI/bge-m3',
      apiPort: 3000,
      apiHost: '0.0.0.0',
      apiCorsEnabled: true,
      apiCorsOrigin: '*'
    };

    // 更新所有配置项
    for (const [key, value] of Object.entries(defaultConfig)) {
      await setConfig(key, value);
    }

    return c.json({
      success: true,
      data: defaultConfig,
      message: '配置已重置为默认值'
    });
  } catch (error) {
    console.error('重置配置失败:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '重置配置失败'
      }
    }, 500);
  }
});

// 导出配置API路由
export { configApi as configRouter };