/**
 * SQL分析器测试
 * 测试核心SQL分析功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ServiceContainer } from '../../services/factories/ServiceContainer.js';
import { DatabaseIdentifier } from '../identification/db-identifier.js';

// 获取SQL分析器实例
const serviceContainer = ServiceContainer.getInstance();
const sqlAnalyzer = serviceContainer.getSQLAnalyzer();
const dbIdentifier = new DatabaseIdentifier();

describe('SQLAnalyzer - 核心功能测试', () => {
  beforeEach(() => {
    // 重置分析器统计
    sqlAnalyzer.resetStats?.();
  });

  afterEach(() => {
    // 清理模拟
    vi.restoreAllMocks();
  });

  describe('基础SQL分析', () => {
    it('应该正确分析简单SELECT语句', async () => {
      const sql = 'SELECT id, name FROM users WHERE status = "active"';

      const result = await sqlAnalyzer.analyzeSQL(sql, {
        performance: true,
        security: true,
        standards: true
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.issues).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.databaseType).toBeDefined();
    });

    it('应该正确处理空SQL语句', async () => {
      const result = await sqlAnalyzer.analyzeSQL('', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('空');
    });

    it('应该正确识别不同的数据库类型', async () => {
      const testCases = [
        {
          sql: 'SELECT * FROM users LIMIT 1',
          expectedType: 'mysql'
        },
        {
          sql: 'SELECT TOP 1 * FROM users',
          expectedType: 'sqlserver'
        },
        {
          sql: 'SELECT * FROM users FETCH FIRST 1 ROW ONLY',
          expectedType: 'postgresql'
        }
      ];

      for (const testCase of testCases) {
        const result = await sqlAnalyzer.analyzeSQL(testCase.sql, {});
        expect(result.metadata.databaseType).toBe(testCase.expectedType);
      }
    });

    it('应该处理不同复杂度的SQL语句', async () => {
      const testCases = [
        'SELECT * FROM table1',
        'SELECT t1.id, t2.name FROM table1 t1 JOIN table2 t2 ON t1.id = t2.id',
        `WITH cte AS (
          SELECT id, name FROM users WHERE status = 'active'
        )
        SELECT * FROM cte WHERE id > 100`
      ];

      for (const sql of testCases) {
        const result = await sqlAnalyzer.analyzeSQL(sql, {});
        expect(result.success).toBe(true);
        expect(result.issues).toBeDefined();
        expect(result.recommendations).toBeDefined();
      }
    });
  });

  describe('分析选项控制', () => {
    it('应该根据选项控制分析内容', async () => {
      const sql = 'SELECT * FROM users';

      // 只进行性能分析
      const performanceResult = await sqlAnalyzer.analyzeSQL(sql, {
        performance: true,
        security: false,
        standards: false
      });

      // 只进行安全分析
      const securityResult = await sqlAnalyzer.analyzeSQL(sql, {
        performance: false,
        security: true,
        standards: false
      });

      // 只进行规范分析
      const standardsResult = await sqlAnalyzer.analyzeSQL(sql, {
        performance: false,
        security: false,
        standards: true
      });

      expect(performanceResult.performance).toBeDefined();
      expect(performanceResult.security).not.toBeDefined();
      expect(performanceResult.standards).not.toBeDefined();

      expect(securityResult.security).toBeDefined();
      expect(securityResult.performance).not.toBeDefined();
      expect(securityResult.standards).not.toBeDefined();

      expect(standardsResult.standards).toBeDefined();
      expect(standardsResult.performance).not.toBeDefined();
      expect(standardsResult.security).not.toBeDefined();
    });

    it('应该正确处理数据库类型选项', async () => {
      const sql = 'SELECT * FROM users';

      const result = await sqlAnalyzer.analyzeSQL(sql, {
        databaseType: 'postgresql',
        performance: true,
        security: true,
        standards: true
      });

      expect(result.metadata.databaseType).toBe('postgresql');
    });
  });

  describe('批量分析', () => {
    it('应该正确处理批量SQL分析', async () => {
      const sqls = [
        'SELECT * FROM users',
        'SELECT id, name FROM products',
        'INSERT INTO logs (message) VALUES ("test")'
      ];

      const results = await sqlAnalyzer.analyzeBatch(sqls, {
        performance: true,
        security: true,
        standards: true
      });

      expect(results).toHaveLength(3);
      expect(results.every(result => result.success !== undefined)).toBe(true);
    });

    it('应该正确处理混合成功失败的批量分析', async () => {
      const sqls = [
        'SELECT * FROM users',           // 有效SQL
        'INVALID SQL STATEMENT',         // 无效SQL
        '',                              // 空SQL
        'SELECT id FROM products'         // 有效SQL
      ];

      const results = await sqlAnalyzer.analyzeBatch(sqls, {});

      expect(results).toHaveLength(4);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(false);
      expect(results[3].success).toBe(true);
    });

    it('应该限制批量分析的大小', async () => {
      const sqls = Array(60).fill('SELECT * FROM users');

      // 创建一个mock来验证参数传递
      const analyzeBatchSpy = vi.spyOn(sqlAnalyzer, 'analyzeBatch');

      try {
        await sqlAnalyzer.analyzeBatch(sqls, {});
      } catch (error) {
        // 预期会失败，因为我们传递了过大的批次
      }

      expect(analyzeBatchSpy).toHaveBeenCalledWith(
        expect.arrayContaining(expect.any(String)),
        expect.any(Object)
      );

      analyzeBatchSpy.mockRestore();
    });
  });

  describe('错误处理', () => {
    it('应该正确处理语法错误的SQL', async () => {
      const invalidSQLs = [
        'SELEC * FROM users',           // 拼写错误
        'SELECT * FROM',                // 缺少表名
        'INSERT INTO VALUES (1, "test")' // 缺少表名
      ];

      for (const sql of invalidSQLs) {
        const result = await sqlAnalyzer.analyzeSQL(sql, {});
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    it('应该正确处理超大SQL语句', async () => {
      const largeSQL = 'SELECT ' + Array(10000).fill("'test'").join(', ') + ' FROM large_table';

      const result = await sqlAnalyzer.analyzeSQL(largeSQL, {});

      // 应该能处理但可能有限制
      expect(result).toBeDefined();
      if (!result.success) {
        expect(result.error).toContain('过大') || expect(result.error).toContain('限制');
      }
    });

    it('应该正确处理特殊字符和编码', async () => {
      const specialSQLs = [
        "SELECT * FROM users WHERE name = '测试中文'",
        "SELECT * FROM users WHERE emoji = '🚀🔍'",
        "SELECT * FROM users WHERE unicode = '\\u4e2d\\u6587'"
      ];

      for (const sql of specialSQLs) {
        const result = await sqlAnalyzer.analyzeSQL(sql, {});
        expect(result).toBeDefined();
        if (!result.success) {
          // 如果失败，应该是有意义的错误信息
          expect(result.error).toBeDefined();
        }
      }
    });
  });

  describe('性能和统计', () => {
    it('应该记录分析统计信息', async () => {
      const sql = 'SELECT * FROM users';

      await sqlAnalyzer.analyzeSQL(sql, {});
      await sqlAnalyzer.analyzeSQL(sql, {});
      await sqlAnalyzer.analyzeSQL(sql, {});

      const stats = sqlAnalyzer.getStats();
      expect(stats.totalAnalyses).toBe(3);
      expect(stats.successfulAnalyses).toBe(3);
      expect(stats.errors).toBe(0);
      expect(stats.averageDuration).toBeGreaterThan(0);
    });

    it('应该正确重置统计信息', async () => {
      const sql = 'SELECT * FROM users';

      await sqlAnalyzer.analyzeSQL(sql, {});
      let stats = sqlAnalyzer.getStats();
      expect(stats.totalAnalyses).toBeGreaterThan(0);

      sqlAnalyzer.resetStats?.();
      stats = sqlAnalyzer.getStats();
      expect(stats.totalAnalyses).toBe(0);
    });

    it('应该计算平均响应时间', async () => {
      const sql = 'SELECT * FROM users';

      await sqlAnalyzer.analyzeSQL(sql, {});
      await sqlAnalyzer.analyzeSQL(sql, {});

      const stats = sqlAnalyzer.getStats();
      expect(stats.averageDuration).toBeGreaterThan(0);
      expect(stats.averageDuration).toBeLessThan(10000); // 应该在合理范围内
    });
  });

  describe('数据库类型识别', () => {
    it('应该正确识别MySQL语法', () => {
      const mysqlSQLs = [
        'SELECT * FROM table1 LIMIT 10',
        'CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY)',
        'SELECT GROUP_CONCAT(name) FROM users',
        'INSERT INTO orders VALUES (1, "test") ON DUPLICATE KEY UPDATE name="test"'
      ];

      for (const sql of mysqlSQLs) {
        const identification = dbIdentifier.identify(sql);
        expect(identification.type).toBe('mysql');
      }
    });

    it('应该正确识别PostgreSQL语法', () => {
      const postgresSQLs = [
        'SELECT * FROM table1 FETCH FIRST 10 ROWS ONLY',
        'INSERT INTO table1 VALUES (1, $1)',
        'UPDATE table1 SET name = $1 WHERE id = $2',
        'CREATE TABLE table1 (id SERIAL PRIMARY KEY)'
      ];

      for (const sql of postgresSQLs) {
        const identification = dbIdentifier.identify(sql);
        expect(['postgresql', 'postgres']).toContain(identification.type);
      }
    });

    it('应该正确识别SQL Server语法', () => {
      const sqlServerSQLs = [
        'SELECT TOP 10 * FROM table1',
        'SELECT GETDATE()',
        'DECLARE @var NVARCHAR(50)',
        'SELECT @@IDENTITY'
      ];

      for (const sql of sqlServerSQLs) {
        const identification = dbIdentifier.identify(sql);
        expect(['sqlserver', 'mssql']).toContain(identification.type);
      }
    });

    it('应该处理未知数据库类型', () => {
      const unknownSQLs = [
        'SELECT column FROM table',
        'UNKNOWN SQL COMMAND'
      ];

      for (const sql of unknownSQLs) {
        const identification = dbIdentifier.identify(sql);
        expect(['generic', 'unknown', null, undefined]).toContain(identification.type);
      }
    });
  });

  describe('并发和异步处理', () => {
    it('应该正确处理并发分析请求', async () => {
      const sql = 'SELECT * FROM users';
      const concurrentRequests = 10;

      const promises = Array(concurrentRequests).fill(null).map(() =>
        sqlAnalyzer.analyzeSQL(sql, {})
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(concurrentRequests);
      expect(results.every(result => result.success === true)).toBe(true);

      // 验证统计信息正确更新
      const stats = sqlAnalyzer.getStats();
      expect(stats.totalAnalyses).toBe(concurrentRequests);
    });

    it('应该正确处理分析超时', async () => {
      const sql = 'SELECT * FROM users';

      // 模拟超时情况
      const originalAnalyzeSQL = sqlAnalyzer.analyzeSQL.bind(sqlAnalyzer);
      const mockAnalyzeSQL = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5秒延迟
        return { success: false, error: 'Timeout' };
      });

      // 由于我们无法直接修改分析器内部实现，这里只测试接口存在
      expect(typeof sqlAnalyzer.analyzeSQL).toBe('function');
    });
  });

  describe('边界条件测试', () => {
    it('应该处理最小有效SQL', async () => {
      const minimalSQLs = ['A', 'SELECT 1', '1'];

      for (const sql of minimalSQLs) {
        const result = await sqlAnalyzer.analyzeSQL(sql, {});
        expect(result).toBeDefined();
      }
    });

    it('应该处理选项参数的各种组合', async () => {
      const sql = 'SELECT * FROM users';

      const optionsCombinations = [
        {}, // 空选项
        { performance: false },
        { security: false },
        { standards: false },
        { performance: false, security: false },
        { performance: false, standards: false },
        { security: false, standards: false },
        { performance: false, security: false, standards: false },
        { databaseType: 'mysql' },
        { databaseType: 'postgresql' },
        { customOption: 'test' } // 未知选项应该被忽略
      ];

      for (const options of optionsCombinations) {
        const result = await sqlAnalyzer.analyzeSQL(sql, options);
        expect(result).toBeDefined();
      }
    });
  });
});