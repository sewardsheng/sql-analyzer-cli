/**
 * API文档模块
 * 使用Swagger/OpenAPI提供API文档
 */

import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { z } from 'zod';

// 创建OpenAPI应用
export const docsApp = new OpenAPIHono();

// 定义通用响应模式
const ErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  type: z.string(),
  statusCode: z.number(),
  timestamp: z.string(),
  details: z.any().optional()
});

const SuccessSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  timestamp: z.string()
});

// 定义分析请求模式
const AnalyzeRequestSchema = z.object({
  sql: z.string().describe('要分析的SQL语句'),
  options: z.object({
    performance: z.boolean().default(true).describe('是否进行性能分析'),
    security: z.boolean().default(true).describe('是否进行安全审计'),
    standards: z.boolean().default(true).describe('是否进行编码规范检查'),
    learn: z.boolean().default(false).describe('是否学习新的规则'),
    database: z.string().optional().describe('数据库类型'),
    context: z.string().optional().describe('上下文信息')
  }).optional().describe('分析选项')
});

// 定义批量分析请求模式
const BatchAnalyzeRequestSchema = z.object({
  sqls: z.array(z.object({
    sql: z.string(),
    id: z.string().optional()
  })).describe('SQL语句数组'),
  options: z.object({
    performance: z.boolean().default(true),
    security: z.boolean().default(true),
    standards: z.boolean().default(true),
    learn: z.boolean().default(false),
    database: z.string().optional(),
    context: z.string().optional()
  }).optional().describe('分析选项')
});

// 定义知识库搜索请求模式
const KnowledgeSearchRequestSchema = z.object({
  query: z.string().describe('搜索查询'),
  type: z.enum(['rule', 'example', 'pattern']).optional().describe('搜索类型'),
  database: z.string().optional().describe('数据库类型'),
  limit: z.number().default(10).describe('返回结果数量限制')
});

// 定义知识库学习请求模式
const KnowledgeLearnRequestSchema = z.object({
  type: z.enum(['rule', 'example', 'pattern']).describe('学习内容类型'),
  content: z.string().describe('学习内容'),
  database: z.string().optional().describe('数据库类型'),
  category: z.string().optional().describe('分类'),
  tags: z.array(z.string()).optional().describe('标签')
});

// 注册API文档路由
docsApp.doc('/doc', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'SQL Analyzer API',
    description: 'SQL语句智能分析与扫描API服务',
    contact: {
      name: 'API Support',
      email: 'support@example.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: '开发服务器'
    },
    {
      url: 'https://api.sql-analyzer.com',
      description: '生产服务器'
    }
  ],
  tags: [
    {
      name: 'health',
      description: '健康检查相关接口'
    },
    {
      name: 'analyze',
      description: 'SQL分析相关接口'
    },
    {
      name: 'config',
      description: '配置管理相关接口'
    },
    {
      name: 'history',
      description: '历史记录相关接口'
    },
    {
      name: 'knowledge',
      description: '知识库相关接口'
    },
    {
      name: 'status',
      description: '系统状态相关接口'
    }
  ]
});

// 健康检查接口文档
docsApp.openapi('/health', {
  method: 'get',
  path: '/health',
  tags: ['health'],
  summary: '健康检查',
  description: '检查API服务的健康状态',
  responses: {
    200: {
      description: '服务健康',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('healthy'),
            timestamp: z.string(),
            responseTime: z.string(),
            service: z.string(),
            version: z.string(),
            uptime: z.number()
          })
        }
      }
    }
  }
}, (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    responseTime: '10ms',
    service: 'sql-analyzer-api',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// SQL分析接口文档
docsApp.openapi('/analyze', {
  method: 'post',
  path: '/analyze',
  tags: ['analyze'],
  summary: 'SQL分析',
  description: '对单个SQL语句进行智能分析',
  requestBody: {
    content: {
      'application/json': {
        schema: AnalyzeRequestSchema
      }
    }
  },
  responses: {
    200: {
      description: '分析成功',
      content: {
        'application/json': {
          schema: SuccessSchema
        }
      }
    },
    400: {
      description: '请求参数错误',
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      }
    },
    500: {
      description: '服务器内部错误',
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      }
    }
  }
}, (c) => {
  return c.json({
    success: true,
    data: {
      message: '这是一个示例响应，实际分析结果请调用真实的分析接口'
    },
    timestamp: new Date().toISOString()
  });
});

// 批量SQL分析接口文档
docsApp.openapi('/analyze/batch', {
  method: 'post',
  path: '/analyze/batch',
  tags: ['analyze'],
  summary: '批量SQL分析',
  description: '对多个SQL语句进行批量分析',
  requestBody: {
    content: {
      'application/json': {
        schema: BatchAnalyzeRequestSchema
      }
    }
  },
  responses: {
    200: {
      description: '分析成功',
      content: {
        'application/json': {
          schema: SuccessSchema
        }
      }
    },
    400: {
      description: '请求参数错误',
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      }
    },
    500: {
      description: '服务器内部错误',
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      }
    }
  }
}, (c) => {
  return c.json({
    success: true,
    data: {
      message: '这是一个示例响应，实际分析结果请调用真实的分析接口'
    },
    timestamp: new Date().toISOString()
  });
});

// 知识库搜索接口文档
docsApp.openapi('/knowledge/search', {
  method: 'post',
  path: '/knowledge/search',
  tags: ['knowledge'],
  summary: '知识库搜索',
  description: '在知识库中搜索相关内容',
  requestBody: {
    content: {
      'application/json': {
        schema: KnowledgeSearchRequestSchema
      }
    }
  },
  responses: {
    200: {
      description: '搜索成功',
      content: {
        'application/json': {
          schema: SuccessSchema
        }
      }
    },
    400: {
      description: '请求参数错误',
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      }
    }
  }
}, (c) => {
  return c.json({
    success: true,
    data: {
      message: '这是一个示例响应，实际搜索结果请调用真实的搜索接口'
    },
    timestamp: new Date().toISOString()
  });
});

// 知识库学习接口文档
docsApp.openapi('/knowledge/learn', {
  method: 'post',
  path: '/knowledge/learn',
  tags: ['knowledge'],
  summary: '知识库学习',
  description: '向知识库添加新的学习内容',
  requestBody: {
    content: {
      'application/json': {
        schema: KnowledgeLearnRequestSchema
      }
    }
  },
  responses: {
    200: {
      description: '学习成功',
      content: {
        'application/json': {
          schema: SuccessSchema
        }
      }
    },
    400: {
      description: '请求参数错误',
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      }
    }
  }
}, (c) => {
  return c.json({
    success: true,
    data: {
      message: '这是一个示例响应，实际学习结果请调用真实的学习接口'
    },
    timestamp: new Date().toISOString()
  });
});

// 添加更多健康检查端点的文档
docsApp.openapi('/health/ping', {
  method: 'get',
  path: '/health/ping',
  tags: ['health'],
  summary: '简单ping检查',
  description: '用于服务可用性测试',
  responses: {
    200: {
      description: '服务可用',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              message: z.string(),
              uptime: z.number()
            }),
            timestamp: z.string()
          })
        }
      }
    }
  }
}, (c) => {
  return c.json({
    success: true,
    data: {
      message: 'pong',
      uptime: process.uptime()
    },
    timestamp: new Date().toISOString()
  });
});

docsApp.openapi('/health/status', {
  method: 'get',
  path: '/health/status',
  tags: ['health'],
  summary: '服务状态信息',
  description: '返回服务基本状态信息',
  responses: {
    200: {
      description: '状态信息',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              status: z.string(),
              uptime: z.number(),
              version: z.string(),
              environment: z.string(),
              memory: z.object({
                rss: z.string(),
                heapTotal: z.string(),
                heapUsed: z.string(),
                external: z.string()
              }),
              platform: z.string(),
              nodeVersion: z.string()
            }),
            timestamp: z.string()
          })
        }
      }
    }
  }
}, (c) => {
  const memUsage = process.memoryUsage();
  return c.json({
    success: true,
    data: {
      status: 'running',
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
      },
      platform: process.platform,
      nodeVersion: process.version
    },
    timestamp: new Date().toISOString()
  });
});

docsApp.openapi('/health/check/{type}', {
  method: 'get',
  path: '/health/check/{type}',
  tags: ['health'],
  summary: '特定类型健康检查',
  description: '执行指定类型的健康检查',
  parameters: [
    {
      name: 'type',
      in: 'path',
      required: true,
      schema: z.enum([
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
      ]),
      description: '检查类型'
    }
  ],
  responses: {
    200: {
      description: '检查结果',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              type: z.string(),
              name: z.string(),
              status: z.enum(['pass', 'warning', 'fail']),
              message: z.string(),
              details: z.any(),
              duration: z.number()
            }),
            timestamp: z.string()
          })
        }
      }
    },
    400: {
      description: '无效的检查类型',
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      }
    }
  }
}, (c) => {
  const { type } = c.req.param();
  return c.json({
    success: true,
    data: {
      type,
      name: '示例检查',
      status: 'pass',
      message: '这是一个示例响应，实际检查结果请调用真实的健康检查接口',
      details: {},
      duration: 10
    },
    timestamp: new Date().toISOString()
  });
});

// 配置管理接口文档
docsApp.openapi('/config', {
  method: 'get',
  path: '/config',
  tags: ['config'],
  summary: '获取配置信息',
  description: '获取系统配置信息',
  responses: {
    200: {
      description: '配置信息',
      content: {
        'application/json': {
          schema: SuccessSchema
        }
      }
    }
  }
}, (c) => {
  return c.json({
    success: true,
    data: {
      message: '这是一个示例响应，实际配置信息请调用真实的配置接口'
    },
    timestamp: new Date().toISOString()
  });
});

// 历史记录接口文档
docsApp.openapi('/history', {
  method: 'get',
  path: '/history',
  tags: ['history'],
  summary: '获取历史记录',
  description: '获取SQL分析历史记录列表',
  parameters: [
    {
      name: 'page',
      in: 'query',
      required: false,
      schema: z.number().default(1),
      description: '页码'
    },
    {
      name: 'limit',
      in: 'query',
      required: false,
      schema: z.number().default(10),
      description: '每页数量'
    }
  ],
  responses: {
    200: {
      description: '历史记录',
      content: {
        'application/json': {
          schema: SuccessSchema
        }
      }
    }
  }
}, (c) => {
  return c.json({
    success: true,
    data: {
      message: '这是一个示例响应，实际历史记录请调用真实的历史接口'
    },
    timestamp: new Date().toISOString()
  });
});

// 系统状态接口文档
docsApp.openapi('/status', {
  method: 'get',
  path: '/status',
  tags: ['status'],
  summary: '获取系统状态',
  description: '获取系统运行状态和统计信息',
  responses: {
    200: {
      description: '系统状态',
      content: {
        'application/json': {
          schema: SuccessSchema
        }
      }
    }
  }
}, (c) => {
  return c.json({
    success: true,
    data: {
      message: '这是一个示例响应，实际系统状态请调用真实的状态接口'
    },
    timestamp: new Date().toISOString()
  });
});

// Swagger UI路由
docsApp.get('/swagger', swaggerUI({
  url: '/doc',
  theme: 'dark',
  layout: 'BaseLayout',
  docExpansion: 'list'
}));

// 导出文档应用
export function setupDocs(app) {
  app.route('/api/docs', docsApp);
}

export default docsApp;