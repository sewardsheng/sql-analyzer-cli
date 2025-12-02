import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SQLAnalyzer } from '../../../core/SQLAnalyzer';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('SQLAnalyzer', () => {
  let analyzer: SQLAnalyzer;

  beforeEach(() => {
    analyzer = new SQLAnalyzer();
  });

  describe('基础SQL解析功能', () => {
    it('应该正确解析简单的SELECT语句', async () => {
      const sql = 'SELECT id, name FROM users WHERE status = "active"';
      const result = await analyzer.analyze(sql);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.sql).toBe(sql);
      expect(result.allIssues).toBeInstanceOf(Array);
    });

    it('应该处理不包含SELECT的语句', async () => {
      const sql = 'INSERT INTO users (name, email) VALUES ("John", "john@example.com")';
      const result = await analyzer.analyze(sql);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.allIssues).toBeInstanceOf(Array);
    });

    it('应该处理空字符串输入', async () => {
      const sql = '';
      const result = await analyzer.analyze(sql);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.allIssues).toHaveLength(0);
    });

    it('应该处理无效SQL语法', async () => {
      const sql = 'INVALID SQL SYNTAX';
      const result = await analyzer.analyze(sql);

      expect(result).toBeDefined();
      expect(result.allIssues).toBeInstanceOf(Array);
      // 应该包含语法错误相关的问题
      expect(result.allIssues.some(issue =>
        issue.type === 'syntax' || issue.category.includes('syntax')
      )).toBe(true);
    });
  });

  describe('性能问题检测', () => {
    it('应该检测SELECT * 性能问题', async () => {
      const sql = 'SELECT * FROM large_table WHERE condition = "value"';
      const result = await analyzer.analyze(sql);

      expect(result.allIssues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'performance',
            category: expect.stringContaining('select'),
            severity: expect.stringMatching(/medium|high/)
          })
        ])
      );
    });

    it('应该检测缺少索引的查询', async () => {
      const sql = 'SELECT * FROM users WHERE email = "test@example.com"';
      const result = await analyzer.analyze(sql);

      expect(result.allIssues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'performance',
            category: expect.stringContaining('index')
          })
        ])
      );
    });

    it('应该检测深度分页问题', async () => {
      const sql = 'SELECT * FROM orders ORDER BY created_at LIMIT 10000, 10';
      const result = await analyzer.analyze(sql);

      expect(result.allIssues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'performance',
            category: expect.stringContaining('pagination')
          })
        ])
      );
    });

    it('应该检测JOIN性能问题', async () => {
      const sql = 'SELECT * FROM users u, orders o';
      const result = await analyzer.analyze(sql);

      expect(result.allIssues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'performance',
            category: expect.stringContaining('join')
          })
        ])
      );
    });
  });

  describe('安全问题检测', () => {
    it('应该检测SQL注入风险', async () => {
      const sql = "SELECT * FROM users WHERE name = '" + userInput + "'";
      const result = await analyzer.analyze(sql);

      expect(result.allIssues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'security',
            category: expect.stringContaining('injection'),
            severity: 'high'
          })
        ])
      );
    });

    it('应该检测敏感数据暴露', async () => {
      const sql = 'SELECT password, credit_card FROM users';
      const result = await analyzer.analyze(sql);

      expect(result.allIssues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'security',
            category: expect.stringContaining('sensitive'),
            severity: 'critical'
          })
        ])
      );
    });

    it('应该检测权限问题', async () => {
      const sql = 'SELECT * FROM admin_table';
      const result = await analyzer.analyze(sql);

      expect(result.allIssues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'security',
            category: expect.stringContaining('privilege')
          })
        ])
      );
    });
  });

  describe('规范问题检测', () => {
    it('应该检测命名规范问题', async () => {
      const sql = 'SELECT * FROM User_Data WHERE Name = "John"';
      const result = await analyzer.analyze(sql);

      expect(result.allIssues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'standards',
            category: expect.stringContaining('naming')
          })
        ])
      );
    });

    it('应该检测代码风格问题', async () => {
      const sql = 'select name,email from   users  where id= 1';
      const result = await analyzer.analyze(sql);

      expect(result.allIssues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'standards',
            category: expect.stringContaining('style')
          })
        ])
      );
    });
  });

  describe('建议生成功能', () => {
    it('应该为检测到的问题生成建议', async () => {
      const sql = 'SELECT * FROM large_table';
      const result = await analyzer.analyze(sql);

      expect(result.allRecommendations).toBeInstanceOf(Array);
      expect(result.allRecommendations.length).toBeGreaterThan(0);

      // 检查建议的结构
      result.allRecommendations.forEach(rec => {
        expect(rec).toHaveProperty('title');
        expect(rec).toHaveProperty('description');
        expect(rec).toHaveProperty('impact');
      });
    });

    it('建议应该包含优先级信息', async () => {
      const sql = 'SELECT password, credit_card FROM users';
      const result = await analyzer.analyze(sql);

      result.allRecommendations.forEach(rec => {
        expect(rec).toHaveProperty('priority');
        expect(typeof rec.priority).toBe('string');
        expect(['high', 'medium', 'low']).toContain(rec.priority);
      });
    });
  });

  describe('复杂查询分析', () => {
    it('应该分析窗口函数查询', async () => {
      const sql = `
        SELECT
          employee_id,
          salary,
          ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) as rank
        FROM employees
      `;

      const result = await analyzer.analyze(sql);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.allIssues).toBeInstanceOf(Array);
    });

    it('应该分析CTE查询', async () => {
      const sql = `
        WITH dept_stats AS (
          SELECT department_id, COUNT(*) as count
          FROM employees
          GROUP BY department_id
        )
        SELECT * FROM dept_stats
      `;

      const result = await analyzer.analyze(sql);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.allIssues).toBeInstanceOf(Array);
    });
  });

  describe('错误处理', () => {
    it('应该处理超长SQL语句', async () => {
      const longSql = 'SELECT ' + 'a'.repeat(1000000) + ' FROM table';
      const result = await analyzer.analyze(longSql);

      expect(result).toBeDefined();
      expect(result.allIssues).toBeInstanceOf(Array);
    });

    it('应该处理特殊字符', async () => {
      const sql = "SELECT * FROM users WHERE name = 'Joãoñ\\'s test中文'";
      const result = await analyzer.analyze(sql);

      expect(result).toBeDefined();
      expect(result.allIssues).toBeInstanceOf(Array);
    });

    it('应该处理Unicode字符', async () => {
      const sql = 'SELECT * FROM 产品表 WHERE 名称 = "测试商品"';
      const result = await analyzer.analyze(sql);

      expect(result).toBeDefined();
      expect(result.allIssues).toBeInstanceOf(Array);
    });
  });

  describe('批量分析功能', () => {
    it('应该支持批量SQL分析', async () => {
      const sqlQueries = [
        'SELECT * FROM users',
        'SELECT id, name FROM products',
        'INSERT INTO logs (message) VALUES ("test")'
      ];

      const results = await analyzer.analyzeBatch(sqlQueries);

      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(3);

      results.forEach(result => {
        expect(result).toHaveProperty('sql');
        expect(result).toHaveProperty('success');
        expect(result.allIssues).toBeInstanceOf(Array);
      });
    });
  });

  describe('使用测试用例数据', () => {
    it('应该正确分析性能问题测试用例', async () => {
      const performanceSql = readFileSync(
        resolve(__dirname, '../../fixtures/sql/performance-problems/index-issues.sql'),
        'utf8'
      );

      const result = await analyzer.analyze(performanceSql);

      expect(result).toBeDefined();
      expect(result.allIssues.length).toBeGreaterThan(0);

      // 应该检测到性能问题
      const performanceIssues = result.allIssues.filter(issue => issue.type === 'performance');
      expect(performanceIssues.length).toBeGreaterThan(0);
    });

    it('应该正确分析安全问题测试用例', async () => {
      const securitySql = readFileSync(
        resolve(__dirname, '../../fixtures/sql/security-issues/sql-injection.sql'),
        'utf8'
      );

      const result = await analyzer.analyze(securitySql);

      expect(result).toBeDefined();
      expect(result.allIssues.length).toBeGreaterThan(0);

      // 应该检测到安全问题
      const securityIssues = result.allIssues.filter(issue => issue.type === 'security');
      expect(securityIssues.length).toBeGreaterThan(0);
    });

    it('应该正确分析规范问题测试用例', async () => {
      const standardsSql = readFileSync(
        resolve(__dirname, '../../fixtures/sql/standards-violations/naming-conventions.sql'),
        'utf8'
      );

      const result = await analyzer.analyze(standardsSql);

      expect(result).toBeDefined();
      expect(result.allIssues.length).toBeGreaterThan(0);

      // 应该检测到规范问题
      const standardsIssues = result.allIssues.filter(issue => issue.type === 'standards');
      expect(standardsIssues.length).toBeGreaterThan(0);
    });
  });

  describe('评分系统', () => {
    it('应该生成整体评分', async () => {
      const sql = 'SELECT id, name FROM users WHERE status = "active"';
      const result = await analyzer.analyze(sql);

      expect(result).toHaveProperty('overallScore');
      expect(typeof result.overallScore).toBe('number');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('问题越多评分越低', async () => {
      const goodSql = 'SELECT id, name FROM users WHERE id = ?';
      const badSql = 'SELECT * FROM large_table WHERE name = "' + userInput + '"';

      const goodResult = await analyzer.analyze(goodSql);
      const badResult = await analyzer.analyze(badSql);

      expect(goodResult.overallScore).toBeGreaterThan(badResult.overallScore);
    });
  });

  describe('配置选项', () => {
    it('应该支持自定义配置', async () => {
      const customConfig = {
        enablePerformanceCheck: true,
        enableSecurityCheck: true,
        enableStandardsCheck: false, // 关闭规范检查
        severityThreshold: 'medium'
      };

      const analyzerWithConfig = SQLAnalyzer.getInstance(customConfig);
      const sql = 'select name,email from users where id= 1'; // 有规范问题的SQL

      const result = await analyzerWithConfig.analyze(sql);

      expect(result).toBeDefined();
      // 由于关闭了规范检查，应该没有规范问题
      const standardsIssues = result.allIssues.filter(issue => issue.type === 'standards');
      expect(standardsIssues.length).toBe(0);
    });
  });
});