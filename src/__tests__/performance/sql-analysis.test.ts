import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SQLAnalyzer } from '../../core/SQLAnalyzer';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('SQL分析性能测试', () => {
  let analyzer: SQLAnalyzer;

  beforeAll(async () => {
    analyzer = new SQLAnalyzer();
    // 预热分析器
    await analyzer.analyze('SELECT 1');
  });

  describe('响应时间测试', () => {
    it('简单SQL查询分析时间应小于1秒', async () => {
      const simpleSQL = 'SELECT id, name FROM users WHERE status = "active"';

      const startTime = performance.now();
      const result = await analyzer.analyze(simpleSQL);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // 小于1秒
    });

    it('复杂SQL查询分析时间应小于5秒', async () => {
      const complexSQL = `
        WITH dept_stats AS (
          SELECT
            department_id,
            COUNT(*) as employee_count,
            AVG(salary) as avg_salary,
            SUM(salary) as total_salary
          FROM employees
          GROUP BY department_id
        ),
        high_salary_depts AS (
          SELECT department_id
          FROM dept_stats
          WHERE avg_salary > 50000
        )
        SELECT
          d.name,
          ds.avg_salary,
          ds.employee_count
        FROM departments d
        JOIN dept_stats ds ON d.id = ds.department_id
        JOIN high_salary_depts hsd ON d.id = hsd.department_id
        WHERE ds.employee_count > 10
        ORDER BY ds.avg_salary DESC
      `;

      const startTime = performance.now();
      const result = await analyzer.analyze(complexSQL);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // 小于5秒
    });

    it('窗口函数查询分析时间应小于3秒', async () => {
      const windowFunctionSQL = `
        SELECT
          employee_id,
          department_id,
          salary,
          ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) as rank_in_dept,
          LAG(salary, 1) OVER (ORDER BY salary DESC) as prev_salary,
          SUM(salary) OVER (PARTITION BY department_id) as dept_total
        FROM employees
        WHERE department_id IN (1, 2, 3, 4, 5)
      `;

      const startTime = performance.now();
      const result = await analyzer.analyze(windowFunctionSQL);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(3000); // 小于3秒
    });
  });

  describe('批量处理性能测试', () => {
    it('10个SQL查询批量处理时间应小于30秒', async () => {
      const sqlQueries = Array.from({ length: 10 }, (_, i) =>
        `SELECT id, name FROM table_${i} WHERE status = 'active'`
      );

      const startTime = performance.now();
      const results = await analyzer.analyzeBatch(sqlQueries);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(30000); // 小于30秒
    });

    it('100个简单查询批量处理时间应小于60秒', async () => {
      const sqlQueries = Array.from({ length: 100 }, (_, i) =>
        `SELECT id FROM users WHERE id = ${i + 1}`
      );

      const startTime = performance.now();
      const results = await analyzer.analyzeBatch(sqlQueries);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(60000); // 小于60秒
    });
  });

  describe('内存使用测试', () => {
    it('基础内存占用应小于100MB', async () => {
      const initialMemory = process.memoryUsage();

      // 执行几次分析
      for (let i = 0; i < 10; i++) {
        await analyzer.analyze(`SELECT * FROM table_${i} WHERE id = ${i}`);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      expect(memoryIncreaseMB).toBeLessThan(100); // 小于100MB
    });

    it('大文件处理内存峰值应小于1GB', async () => {
      // 创建一个大的SQL查询
      const largeSQL = Array.from({ length: 1000 }, (_, i) =>
        `SELECT col${i} FROM large_table WHERE id = ${i} UNION ALL `
      ).join('') + 'SELECT 1';

      const initialMemory = process.memoryUsage();

      await analyzer.analyze(largeSQL);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      expect(memoryIncreaseMB).toBeLessThan(1024); // 小于1GB
    });
  });

  describe('并发性能测试', () => {
    it('10个并发请求处理时间应合理', async () => {
      const sqlQueries = Array.from({ length: 10 }, (_, i) =>
        `SELECT id, name FROM users WHERE id = ${i + 1}`
      );

      const startTime = performance.now();

      // 并发执行
      const promises = sqlQueries.map(sql => analyzer.analyze(sql));
      const results = await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(5000); // 并发应该比串行快
    });

    it('50个并发请求不应崩溃', async () => {
      const sqlQueries = Array.from({ length: 50 }, (_, i) =>
        `SELECT id FROM table_${i % 10} WHERE status = 'active'`
      );

      const startTime = performance.now();

      try {
        const promises = sqlQueries.map(sql => analyzer.analyze(sql));
        const results = await Promise.all(promises);
        const endTime = performance.now();
        const duration = endTime - startTime;

        expect(results).toHaveLength(50);
        expect(duration).toBeLessThan(15000); // 15秒内完成
      } catch (error) {
        fail(`并发处理失败: ${error.message}`);
      }
    });
  });

  describe('吞吐量测试', () => {
    it('单实例处理速度应大于10查询/秒', async () => {
      const sqlQueries = Array.from({ length: 50 }, (_, i) =>
        'SELECT id, name FROM users WHERE id = ?'
      );

      const startTime = performance.now();

      for (const sql of sqlQueries) {
        await analyzer.analyze(sql);
      }

      const endTime = performance.now();
      const durationSeconds = (endTime - startTime) / 1000;
      const queriesPerSecond = sqlQueries.length / durationSeconds;

      expect(queriesPerSecond).toBeGreaterThan(10);
    });
  });

  describe('实际测试用例性能', () => {
    it('性能问题测试用例分析时间合理', async () => {
      const performanceSql = readFileSync(
        resolve(__dirname, '../fixtures/sql/performance-problems/index-issues.sql'),
        'utf8'
      );

      const startTime = performance.now();
      const result = await analyzer.analyze(performanceSql);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // 小于5秒
    });

    it('安全问题测试用例分析时间合理', async () => {
      const securitySql = readFileSync(
        resolve(__dirname, '../fixtures/sql/security-issues/sql-injection.sql'),
        'utf8'
      );

      const startTime = performance.now();
      const result = await analyzer.analyze(securitySql);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // 小于5秒
    });

    it('复杂查询测试用例分析时间合理', async () => {
      const complexSql = readFileSync(
        resolve(__dirname, '../fixtures/sql/complex-queries/window-functions.sql'),
        'utf8'
      );

      const startTime = performance.now();
      const result = await analyzer.analyze(complexSql);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(8000); // 小于8秒（复杂查询允许更长时间）
    });
  });

  describe('长时间运行稳定性测试', () => {
    it('连续运行10分钟不应出现内存泄漏', async () => {
      const initialMemory = process.memoryUsage();
      const runTime = 10 * 60 * 1000; // 10分钟
      const startTime = Date.now();

      let operationCount = 0;

      while (Date.now() - startTime < runTime) {
        await analyzer.analyze(`
          SELECT id, name, email, created_at
          FROM users
          WHERE status = 'active'
          AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        operationCount++;

        // 每100次操作检查一次内存
        if (operationCount % 100 === 0) {
          const currentMemory = process.memoryUsage();
          const memoryGrowth = currentMemory.heapUsed - initialMemory.heapUsed;
          const memoryGrowthMB = memoryGrowth / 1024 / 1024;

          // 内存增长不应超过200MB
          expect(memoryGrowthMB).toBeLessThan(200);
        }
      }

      expect(operationCount).toBeGreaterThan(0);
    });
  });

  describe('性能基准测试', () => {
    it('性能基准测试记录', async () => {
      const benchmarks = [
        {
          name: '简单SELECT查询',
          sql: 'SELECT id, name FROM users WHERE status = "active"',
          expectedMaxTime: 1000
        },
        {
          name: '复杂JOIN查询',
          sql: 'SELECT u.*, o.* FROM users u JOIN orders o ON u.id = o.user_id WHERE o.amount > 100',
          expectedMaxTime: 2000
        },
        {
          name: '聚合查询',
          sql: 'SELECT department_id, COUNT(*), AVG(salary) FROM employees GROUP BY department_id',
          expectedMaxTime: 1500
        }
      ];

      const results = [];

      for (const benchmark of benchmarks) {
        const startTime = performance.now();
        const result = await analyzer.analyze(benchmark.sql);
        const endTime = performance.now();
        const duration = endTime - startTime;

        results.push({
          name: benchmark.name,
          duration,
          passed: duration <= benchmark.expectedMaxTime,
          expectedMaxTime: benchmark.expectedMaxTime
        });

        expect(duration).toBeLessThan(benchmark.expectedMaxTime);
      }

      // 输出基准测试结果（实际项目中可以写入日志或数据库）
      console.log('=== 性能基准测试结果 ===');
      results.forEach(result => {
        console.log(`${result.name}: ${result.duration.toFixed(2)}ms ${result.passed ? '✓' : '✗'} (期望: <${result.expectedMaxTime}ms)`);
      });
    });
  });
});