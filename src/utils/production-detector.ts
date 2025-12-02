/**
 * 生产环境SQL安全检测器
 * 专门为生产环境设计，兼顾安全性和实用性
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, basename, extname } from 'path';

export interface DetectionConfig {
  strictMode: boolean;
  ignoreComments: boolean;
  ignoreExamples: boolean;
  filePatterns: {
    strict: string[];
    relaxed: string[];
    ignore: string[];
  };
  severityLevels: {
    critical: string[];
    high: string[];
    medium: string[];
  };
}

export interface DetectionResult {
  file: string;
  severity: 'critical' | 'high' | 'medium' | 'info';
  category: string;
  title: string;
  description: string;
  location: string;
  recommendation: string;
  isActualCode: boolean; // 是否为实际可执行代码
  context: string;       // 代码上下文（注释、示例等）
}

export class ProductionDetector {
  private config: DetectionConfig;
  private defaultConfig: DetectionConfig = {
    strictMode: true,
    ignoreComments: true,
    ignoreExamples: true,
    filePatterns: {
      strict: [
        '**/production/**/*.sql',
        '**/migrations/**/*.sql',
        '**/src/**/*.sql',
        '**/resources/**/*.sql'
      ],
      relaxed: [
        '**/test/**/*_test.sql',
        '**/test/**/*.sql',
        '**/*_test.sql',
        '**/examples/**'
      ],
      ignore: [
        '**/README.md',
        '**/docs/**',
        '**/*.md',
        '**/*.txt',
        '**/.git/**'
      ]
    },
    severityLevels: {
      critical: [
        'sql_injection_executable',
        'hardcoded_credentials_executable',
        'unconditional_delete_executable',
        'unconditional_update_executable',
        'sensitive_data_exposure_executable'
      ],
      high: [
        'performance_risks_production',
        'missing_indexes_critical',
        'select_star_production'
      ],
      medium: [
        'coding_standards',
        'naming_conventions',
        'sql_syntax_issues'
      ]
    }
  };

  constructor(config?: Partial<DetectionConfig>) {
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * 确定文件检测级别
   */
  private determineDetectionLevel(filePath: string): 'strict' | 'relaxed' | 'ignore' {
    const normalizedPath = filePath.replace(/\\/g, '/');

    // 检查忽略列表
    for (const pattern of this.config.filePatterns.ignore) {
      if (this.matchPattern(normalizedPath, pattern)) {
        return 'ignore';
      }
    }

    // 检查严格检查列表
    for (const pattern of this.config.filePatterns.strict) {
      if (this.matchPattern(normalizedPath, pattern)) {
        return 'strict';
      }
    }

    // 检查宽松检查列表
    for (const pattern of this.config.filePatterns.relaxed) {
      if (this.matchPattern(normalizedPath, pattern)) {
        return 'relaxed';
      }
    }

    // 默认为严格检查
    return 'strict';
  }

  /**
   * 简单的glob模式匹配
   */
  private matchPattern(path: string, pattern: string): boolean {
    const regex = new RegExp(
      '^' + pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '[^/]') + '$'
    );
    return regex.test(path);
  }

  /**
   * 预处理SQL内容，提取实际可执行代码
   */
  private preprocessSQL(sql: string): { executableCode: string; comments: string[] } {
    const lines = sql.split('\n');
    const executableLines: string[] = [];
    const comments: string[] = [];
    let inMultilineComment = false;

    for (let line of lines) {
      const trimmedLine = line.trim();

      // 处理多行注释
      if (trimmedLine.startsWith('/*')) {
        inMultilineComment = true;
        if (this.config.ignoreExamples) {
          comments.push(line);
          continue;
        }
      }

      if (trimmedLine.endsWith('*/')) {
        inMultilineComment = false;
        if (this.config.ignoreExamples) {
          comments.push(line);
          continue;
        }
      }

      // 跳过单行注释
      if (trimmedLine.startsWith('--') && this.config.ignoreExamples) {
        comments.push(line);
        continue;
      }

      // 跳过多行注释内容
      if (inMultilineComment && this.config.ignoreExamples) {
        comments.push(line);
        continue;
      }

      // 移除行内注释
      const codeWithoutInlineComment = this.removeInlineComments(line);
      if (codeWithoutInlineComment.trim()) {
        executableLines.push(codeWithoutInlineComment);
      }
    }

    return {
      executableCode: executableLines.join('\n'),
      comments
    };
  }

  /**
   * 移除行内注释
   */
  private removeInlineComments(line: string): string {
    // 简单处理：查找 -- 后面的内容
    const singleLineCommentIndex = line.indexOf('--');
    if (singleLineCommentIndex > 0) {
      // 检查 -- 是否在字符串中
      const beforeComment = line.substring(0, singleLineCommentIndex);
      const singleQuoteCount = (beforeComment.match(/'/g) || []).length;
      const doubleQuoteCount = (beforeComment.match(/"/g) || []).length;

      // 如果引号是成对的，说明 -- 不在字符串中
      if (singleQuoteCount % 2 === 0 && doubleQuoteCount % 2 === 0) {
        return beforeComment;
      }
    }

    return line;
  }

  /**
   * 检测硬编码凭证
   */
  private detectHardcodedCredentials(code: string, filePath: string): DetectionResult[] {
    const results: DetectionResult[] = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // 检测实际可执行代码中的硬编码密码
      const executableCredentialPattern = /(password|pwd|passwd|secret|key)\s*=\s*['"][^'"]*['"]\s*(where|,|\)|;|$)/i;
      if (executableCredentialPattern.test(line)) {
        results.push({
          file: filePath,
          severity: 'critical',
          category: 'security',
          title: '硬编码凭证',
          description: '在实际可执行的SQL语句中发现了硬编码的密码或密钥',
          location: `第${lineNumber}行: ${line.trim()}`,
          recommendation: '使用参数化查询或环境变量，不要在代码中硬编码敏感信息',
          isActualCode: true,
          context: 'executable'
        });
      }

      // 检测示例代码中的硬编码密码（降级为medium）
      const exampleCredentialPattern = /(示例|example|demo|test|sample).*?(password|pwd|secret).*=.*['"][^'"]*['"]/i;
      if (exampleCredentialPattern.test(line)) {
        results.push({
          file: filePath,
          severity: 'medium',
          category: 'security',
          title: '示例中的硬编码凭证',
          description: '在示例或测试代码中发现了硬编码密码',
          location: `第${lineNumber}行: ${line.trim()}`,
          recommendation: '示例代码中的硬编码是可接受的，但生产代码应避免',
          isActualCode: false,
          context: 'example'
        });
      }
    }

    return results;
  }

  /**
   * 检测SQL注入
   */
  private detectSQLInjection(code: string, filePath: string): DetectionResult[] {
    const results: DetectionResult[] = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // 检测实际可执行代码中的字符串拼接
      const executableInjectionPattern = /(where|and|or)\s+[^=]*\s*=\s*['"][^'"]*['"]?\s*[\+]\s*[^;]*/i;
      if (executableInjectionPattern.test(line)) {
        results.push({
          file: filePath,
          severity: 'critical',
          category: 'security',
          title: 'SQL注入风险',
          description: '在实际可执行的SQL语句中发现字符串拼接，存在SQL注入风险',
          location: `第${lineNumber}行: ${line.trim()}`,
          recommendation: '使用参数化查询或预处理语句，避免直接拼接SQL字符串',
          isActualCode: true,
          context: 'executable'
        });
      }
    }

    return results;
  }

  /**
   * 检测无条件的数据操作
   */
  private detectUnconditionalOperations(code: string, filePath: string): DetectionResult[] {
    const results: DetectionResult[] = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // 检测无条件的DELETE
      const deletePattern = /^\s*delete\s+from\s+\w+\s*;?\s*$/i;
      if (deletePattern.test(line)) {
        results.push({
          file: filePath,
          severity: 'critical',
          category: 'security',
          title: '无条件删除操作',
          description: '发现没有WHERE条件的DELETE语句，会删除整个表的数据',
          location: `第${lineNumber}行: ${line.trim()}`,
          recommendation: '为DELETE操作添加明确的WHERE条件，或使用软删除',
          isActualCode: true,
          context: 'executable'
        });
      }

      // 检测无条件UPDATE（修改所有行）
      const updatePattern = /^\s*update\s+\w+\s+set\s+[^;]+;?\s*$/i;
      if (updatePattern.test(line) && !line.toLowerCase().includes('where')) {
        results.push({
          file: filePath,
          severity: 'critical',
          category: 'security',
          title: '无条件更新操作',
          description: '发现没有WHERE条件的UPDATE语句，会修改整个表的数据',
          location: `第${lineNumber}行: ${line.trim()}`,
          recommendation: '为UPDATE操作添加明确的WHERE条件',
          isActualCode: true,
          context: 'executable'
        });
      }
    }

    return results;
  }

  /**
   * 主检测方法
   */
  public detect(filePath: string): DetectionResult[] {
    const detectionLevel = this.determineDetectionLevel(filePath);

    if (detectionLevel === 'ignore') {
      return [];
    }

    if (!existsSync(filePath)) {
      return [];
    }

    const content = readFileSync(filePath, 'utf8');
    const { executableCode, comments } = this.preprocessSQL(content);

    const allResults: DetectionResult[] = [];

    // 只检测实际可执行代码中的严重安全问题
    allResults.push(
      ...this.detectHardcodedCredentials(executableCode, filePath),
      ...this.detectSQLInjection(executableCode, filePath),
      ...this.detectUnconditionalOperations(executableCode, filePath)
    );

    // 根据检测级别过滤结果
    return this.filterResultsByLevel(allResults, detectionLevel);
  }

  /**
   * 根据检测级别过滤结果
   */
  private filterResultsByLevel(results: DetectionResult[], level: 'strict' | 'relaxed'): DetectionResult[] {
    if (level === 'strict') {
      // 严格模式：显示所有问题
      return results;
    } else {
      // 宽松模式：只显示critical和high级别的问题
      return results.filter(r => r.severity === 'critical' || r.severity === 'high');
    }
  }

  /**
   * 从配置文件加载配置
   */
  public loadConfig(configPath: string): void {
    if (existsSync(configPath)) {
      try {
        const configContent = readFileSync(configPath, 'utf8');
        const userConfig = JSON.parse(configContent);
        this.config = { ...this.defaultConfig, ...userConfig };
      } catch (error) {
        console.warn(`无法加载配置文件 ${configPath}: ${error}`);
      }
    }
  }
}