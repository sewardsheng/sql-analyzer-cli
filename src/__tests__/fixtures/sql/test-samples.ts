/**
 * SQL测试样本数据
 * 老王我准备的各种SB SQL语句，用于测试
 */

export const SQL_SAMPLES = {
  // 简单查询
  simple: {
    sql: 'SELECT * FROM users WHERE id = 1',
    description: '简单查询语句'
  },

  // 复杂查询
  complex: {
    sql: `
      SELECT u.id, u.name, u.email, COUNT(o.id) as order_count
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      WHERE u.created_at >= '2023-01-01'
      GROUP BY u.id, u.name, u.email
      HAVING COUNT(o.id) > 5
      ORDER BY order_count DESC
      LIMIT 10
    `,
    description: '复杂的多表连接查询'
  },

  // 性能问题SQL
  performanceIssues: {
    sql: 'SELECT * FROM large_table WHERE LOWER(name) LIKE "%test%" OR description LIKE "%test%"',
    description: '存在性能问题的查询'
  },

  // 安全问题SQL
  securityIssues: {
    sql: 'SELECT * FROM users WHERE id = ' + userInput + '; DROP TABLE users; --',
    description: '存在SQL注入风险的查询'
  },

  // 规范问题SQL
  standardsIssues: {
    sql: 'select * from users u where u.name is null order by u.id desc limit 1',
    description: '不规范的SQL写法'
  },

  // 空查询
  empty: {
    sql: '',
    description: '空SQL语句'
  },

  // 无效SQL
  invalid: {
    sql: 'SELCT * FORM users', // 故意的语法错误
    description: '语法错误的SQL'
  },

  // 带注释的SQL
  withComments: {
    sql: `
      -- 用户订单统计查询
      SELECT
        u.id,          -- 用户ID
        u.name,        -- 用户姓名
        COUNT(o.id)    -- 订单数量
      FROM users u     -- 用户表
      INNER JOIN orders o ON u.id = o.user_id  -- 订单表
      WHERE u.status = 'active'  -- 只统计活跃用户
      GROUP BY u.id, u.name
      ORDER BY COUNT(o.id) DESC
    `,
    description: '带注释的SQL语句'
  }
};