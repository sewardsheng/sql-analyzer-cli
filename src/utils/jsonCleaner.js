/**
 * JSON清理和解析工具类
 * 用于处理LLM返回的可能包含非法的JSON内容

/**
 * JSON清理工具类
 */
class JSONCleaner {
  /**
   * 从响应中提取JSON内容
   * @param {string} content - LLM响应内容
   * @returns {string} 清理后的JSON字符串
   */
  static extractJSON(content) {
    let cleaned = content;

    // 1. 移除代码块标记（支持多种语言标识）
    if (cleaned.includes('```')) {
      // 支持常见的代码块语言标识：json, javascript, js, python, py, java, go, rust, typescript, ts, sql, yaml, xml等
      const codeBlockMatch = cleaned.match(/```(?:json|javascript|js|python|py|java|go|rust|typescript|ts|sql|yaml|yml|xml|html|css|shell|bash|sh|c|cpp|csharp|cs|php|ruby|rb|swift|kotlin|dart|scala|r|matlab|perl|lua)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        cleaned = codeBlockMatch[1];
      }
    }

    // 2. 移除多种编程语言的注释
    // JavaScript/Java/C/C++/Go/Rust/TypeScript 风格注释
    cleaned = cleaned.replace(/\/\/.*$/gm, ''); // 单行注释
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, ''); // 多行注释
    
    // Python/Ruby/Shell/YAML 风格注释
    cleaned = cleaned.replace(/^\s*#.*$/gm, ''); // 行首的 # 注释
    
    // SQL 风格注释
    cleaned = cleaned.replace(/--.*$/gm, ''); // SQL 单行注释
    
    // HTML/XML 注释
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

    // 3. 移除多种语言的变量声明和赋值语句
    // JavaScript/TypeScript
    cleaned = cleaned.replace(/(?:const|let|var)\s+\w+\s*=\s*/g, '');
    // Python
    cleaned = cleaned.replace(/^\s*\w+\s*=\s*(?=\{)/gm, '');
    // Java/C#/C++
    cleaned = cleaned.replace(/(?:public|private|protected|static|final)?\s*(?:String|int|float|double|boolean|var|auto|Object|Map|List|Dictionary)\s+\w+\s*=\s*/g, '');
    // Go
    cleaned = cleaned.replace(/(?:var\s+\w+\s*=\s*|:\s*=\s*)/g, '');
    // Rust
    cleaned = cleaned.replace(/let\s+(?:mut\s+)?\w+\s*=\s*/g, '');

    // 4. 处理多种语言的字符串连接符
    // JavaScript/Java/C/C++/Go: + 连接符
    // Python: 空格连接、f-string、.format()
    // Ruby: #{} 插值
    // PHP: . 连接符
    
    // 策略A：JavaScript/Java/C++ 风格的字符串连接
    // 匹配模式："key": "value" + var + "value"
    cleaned = cleaned.replace(
      /"([^"]*?)"\s*\+\s*(\w+)\s*\+\s*"([^"]*?)"/g,
      '"$1{$2}$3"'
    );
    
    // 策略B：迭代处理复杂的字符串连接
    let prevCleaned = '';
    let iterations = 0;
    const maxIterations = 10;
    
    while (prevCleaned !== cleaned && iterations < maxIterations) {
      prevCleaned = cleaned;
      // JavaScript/Java 风格: "text" + variable
      cleaned = cleaned.replace(/"([^"]*?)"\s*\+\s*(\w+)/g, '"$1{$2}"');
      cleaned = cleaned.replace(/(\w+)\s*\+\s*"([^"]*?)"/g, '"{$1}$2"');
      
      // Python f-string: f"text {variable}"
      cleaned = cleaned.replace(/f"([^"]*?)"/g, '"$1"');
      cleaned = cleaned.replace(/f'([^']*?)'/g, '"$1"');
      
      // Python .format(): "text {}".format(var)
      cleaned = cleaned.replace(/"([^"]*?)"\s*\.format\([^)]*\)/g, '"$1"');
      
      // PHP 风格: "text" . $variable
      cleaned = cleaned.replace(/"([^"]*?)"\s*\.\s*\$(\w+)/g, '"$1{$2}"');
      cleaned = cleaned.replace(/\$(\w+)\s*\.\s*"([^"]*?)"/g, '"{$1}$2"');
      
      // Ruby 插值: "text #{variable}"
      cleaned = cleaned.replace(/"([^"]*?)#\{([^}]+)\}([^"]*?)"/g, '"$1{$2}$3"');
      
      iterations++;
    }
    
    // 策略C：处理简单的字符串连接（无变量）
    cleaned = cleaned.replace(/"\s*\+\s*"/g, ''); // JavaScript/Java
    cleaned = cleaned.replace(/'\s*\+\s*'/g, '');
    cleaned = cleaned.replace(/"\s*\.\s*"/g, ''); // PHP
    cleaned = cleaned.replace(/'\s*\.\s*'/g, '');
    
    // 策略D：处理跨行的字符串连接
    cleaned = cleaned.replace(/"\s*\+\s*\n\s*"/g, '');
    cleaned = cleaned.replace(/'\s*\+\s*\n\s*'/g, '');
    cleaned = cleaned.replace(/"\s*\.\s*\n\s*"/g, ''); // PHP
    
    // 策略E：移除 Python 的三引号字符串标记
    cleaned = cleaned.replace(/"""/g, '"');
    cleaned = cleaned.replace(/'''/g, '"');
    
    // 策略E：处理SQL注入中常见的特殊模式
    // 例如：' OR '1'='1 或 " OR "1"="1
    // 这些在JSON字符串中需要正确转义
    cleaned = this.escapeSqlInjectionPatterns(cleaned);

    // 5. 提取JSON对象
    cleaned = cleaned.trim();
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }

    // 6. 修复常见JSON错误
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1'); // 移除尾随逗号
    
    // 为没有引号的属性名添加引号（但要小心不要破坏已经有引号的）
    cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_$][\w$]*)(\s*:)/g, '$1"$2"$3');
    
    // 修复单引号为双引号（JSON 标准要求双引号）
    // 但要小心不要破坏字符串内部的单引号
    cleaned = this.normalizeSingleQuotes(cleaned);
    
    // 移除 Python None/True/False，转换为 JSON null/true/false
    cleaned = cleaned.replace(/:\s*None\b/g, ': null');
    cleaned = cleaned.replace(/:\s*True\b/g, ': true');
    cleaned = cleaned.replace(/:\s*False\b/g, ': false');
    
    // 移除空格和制表符（在键值对中）
    cleaned = cleaned.replace(/\s*:\s*/g, ':');
    cleaned = cleaned.replace(/\s*,\s*/g, ',');

    return cleaned.trim();
  }

  /**
   * 规范化单引号为双引号
   * @param {string} content - JSON内容
   * @returns {string} 处理后的内容
   */
  static normalizeSingleQuotes(content) {
    let result = '';
    let inString = false;
    let stringChar = null;
    let escaped = false;
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const prevChar = i > 0 ? content[i - 1] : '';
      
      if (escaped) {
        result += char;
        escaped = false;
        continue;
      }
      
      if (char === '\\') {
        escaped = true;
        result += char;
        continue;
      }
      
      // 处理字符串边界
      if ((char === '"' || char === "'") && !inString) {
        inString = true;
        stringChar = char;
        result += '"'; // 统一使用双引号
      } else if (char === stringChar && inString) {
        inString = false;
        stringChar = null;
        result += '"'; // 统一使用双引号
      } else if (char === "'" && !inString) {
        // 键名外的单引号也转换为双引号
        result += '"';
      } else {
        result += char;
      }
    }
    
    return result;
  }

  /**
   * 转义SQL注入模式中的特殊字符
   * @param {string} content - JSON内容
   * @returns {string} 处理后的内容
   */
  static escapeSqlInjectionPatterns(content) {
    // 在JSON字符串内部，SQL注入示例可能包含：
    // 1. 单引号和双引号的混合使用
    // 2. 注释符号 -- 或 #
    // 3. 分号和其他SQL特殊字符
    // 4. 逻辑操作符 OR, AND
    // 5. 比较操作符 =, <>, !=
    
    // 这些字符在JSON字符串中都是合法的，但需要确保它们在正确的上下文中
    // 我们主要需要防止的是这些字符破坏JSON结构
    
    // 临时占位符，用于保护已经正确转义的内容
    const protectedPatterns = new Map();
    let protectedIndex = 0;
    
    // 保护已经正确转义的引号
    content = content.replace(/\\"/g, () => {
      const placeholder = `__PROTECTED_QUOTE_${protectedIndex++}__`;
      protectedPatterns.set(placeholder, '\\"');
      return placeholder;
    });
    
    // 保护已经正确转义的反斜杠
    content = content.replace(/\\\\/g, () => {
      const placeholder = `__PROTECTED_BACKSLASH_${protectedIndex++}__`;
      protectedPatterns.set(placeholder, '\\\\');
      return placeholder;
    });
    
    // 还原保护的内容
    protectedPatterns.forEach((original, placeholder) => {
      content = content.replace(new RegExp(placeholder, 'g'), original);
    });
    
    return content;
  }

  /**
   * 尝试解析JSON，如果失败则尝试修复
   * @param {string} content - JSON字符串
   * @param {Object} options - 解析选项
   * @param {boolean} options.verbose - 是否输出详细的调试信息
   * @returns {Object} 解析后的对象
   * @throws {Error} 如果所有解析尝试都失败
   */
  static parse(content, options = {}) {
    const { verbose = false } = options;
    
    // 第一次尝试：直接解析
    try {
      return JSON.parse(content);
    } catch (error) {
      if (verbose) {
        console.warn('首次JSON解析失败，尝试清理后重新解析');
      }
    }

    // 第二次尝试：清理后解析
    const cleaned = this.extractJSON(content);
    try {
      return JSON.parse(cleaned);
    } catch (error) {
      if (verbose) {
        console.warn('清理后JSON解析失败，尝试修复特殊字符');
      }
    }

    // 第三次尝试：转义特殊字符
    const fixed = this.fixSpecialCharacters(cleaned);
    try {
      return JSON.parse(fixed);
    } catch (error) {
      if (verbose) {
        console.error('所有JSON解析尝试均失败');
        this.debugParseError(content, cleaned, fixed, error);
      }
      
      throw new Error(`无法解析LLM返回的JSON内容: ${error.message}`);
    }
  }

  /**
   * 修复JSON字符串中的特殊字符
   * @param {string} content - JSON字符串
   * @returns {string} 修复后的JSON字符串
   */
  static fixSpecialCharacters(content) {
    // 使用临时占位符保护已转义的字符
    const placeholders = {
      '\\n': '___ESCAPED_N___',
      '\\r': '___ESCAPED_R___',
      '\\t': '___ESCAPED_T___',
      '\\"': '___ESCAPED_QUOTE___',
      '\\\\': '___ESCAPED_BACKSLASH___',
      '\\\'': '___ESCAPED_SINGLE_QUOTE___',
      '\\b': '___ESCAPED_BACKSPACE___',
      '\\f': '___ESCAPED_FORMFEED___'
    };

    let fixed = content;

    // 保护已转义的字符
    Object.entries(placeholders).forEach(([escaped, placeholder]) => {
      fixed = fixed.replace(new RegExp(escaped.replace(/\\/g, '\\\\'), 'g'), placeholder);
    });

    // 转义未转义的特殊字符
    fixed = fixed.replace(/\n/g, '\\n');
    fixed = fixed.replace(/\r/g, '\\r');
    fixed = fixed.replace(/\t/g, '\\t');
    fixed = fixed.replace(/\b/g, '\\b');
    fixed = fixed.replace(/\f/g, '\\f');

    // 还原受保护的字符
    Object.entries(placeholders).forEach(([escaped, placeholder]) => {
      fixed = fixed.replace(new RegExp(placeholder, 'g'), escaped);
    });

    return fixed;
  }

  /**
   * 调试JSON解析错误
   * @param {string} original - 原始内容
   * @param {string} cleaned - 清理后的内容
   * @param {string} fixed - 修复后的内容
   * @param {Error} error - 解析错误
   */
  static debugParseError(original, cleaned, fixed, error) {
    console.error('=== JSON解析错误调试信息 ===');
    console.error('错误信息:', error.message);
    
    // 显示原始内容的前500字符
    console.error('\n原始内容（前500字符）:');
    console.error(original.substring(0, 500));
    
    // 显示清理后内容的前500字符
    console.error('\n清理后内容（前500字符）:');
    console.error(cleaned.substring(0, 500));
    
    // 尝试定位特殊字符
    const specialChars = ['+', '\n', '\r', '\t', '"', "'", '\\', ';', '--', '#'];
    specialChars.forEach(char => {
      const pos = fixed.indexOf(char);
      if (pos !== -1 && pos < 1000) { // 只显示前1000个字符内的
        console.error(`\n发现特殊字符 '${char.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')}' 位置: ${pos}`);
        const start = Math.max(0, pos - 50);
        const end = Math.min(fixed.length, pos + 50);
        console.error('附近内容:', fixed.substring(start, end).replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t'));
      }
    });
    
    // 检查SQL注入相关模式
    const sqlInjectionPatterns = [
      /OR\s+['"]1['"]\s*=\s*['"]1['"]/gi,
      /--/g,
      /;.*(?:DROP|DELETE|UPDATE|INSERT)/gi,
      /UNION.*SELECT/gi,
      /'.*OR.*'/gi
    ];
    
    console.error('\n检测到的可能SQL注入模式:');
    sqlInjectionPatterns.forEach((pattern, index) => {
      const matches = fixed.match(pattern);
      if (matches && matches.length > 0) {
        console.error(`  模式 ${index + 1}: 找到 ${matches.length} 个匹配`);
        matches.slice(0, 3).forEach(match => {
          console.error(`    - ${match.substring(0, 50)}`);
        });
      }
    });
    
    console.error('\n=== 调试信息结束 ===');
  }

  /**
   * 安全解析JSON，如果失败返回默认值
   * @param {string} content - JSON字符串
   * @param {*} defaultValue - 解析失败时返回的默认值
   * @param {Object} options - 解析选项
   * @returns {*} 解析结果或默认值
   */
  static safeParse(content, defaultValue = null, options = {}) {
    try {
      return this.parse(content, options);
    } catch (error) {
      console.error('JSON解析失败，返回默认值:', error.message);
      return defaultValue;
    }
  }

  /**
   * 验证JSON字符串的完整性
   * @param {string} content - JSON字符串
   * @returns {Object} 验证结果
   */
  static validateJSON(content) {
    const issues = [];
    
    // 检查括号匹配
    const braceStack = [];
    const bracketStack = [];
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      if (char === '{') braceStack.push(i);
      else if (char === '}') {
        if (braceStack.length === 0) {
          issues.push({ type: 'unmatched_brace', position: i, message: '发现未匹配的右花括号' });
        } else {
          braceStack.pop();
        }
      } else if (char === '[') bracketStack.push(i);
      else if (char === ']') {
        if (bracketStack.length === 0) {
          issues.push({ type: 'unmatched_bracket', position: i, message: '发现未匹配的右方括号' });
        } else {
          bracketStack.pop();
        }
      }
    }
    
    if (braceStack.length > 0) {
      issues.push({ type: 'unclosed_brace', positions: braceStack, message: '存在未闭合的左花括号' });
    }
    
    if (bracketStack.length > 0) {
      issues.push({ type: 'unclosed_bracket', positions: bracketStack, message: '存在未闭合的左方括号' });
    }
    
    // 检查常见的SQL注入模式
    const sqlPatterns = [
      { pattern: /\bOR\b.*['"]\d+['"]\s*=\s*['"]\d+['"]/gi, message: 'SQL注入模式: OR 1=1' },
      { pattern: /--.*$/gm, message: 'SQL注释符号' },
      { pattern: /;.*(?:DROP|DELETE|UPDATE|INSERT)\b/gi, message: '危险SQL操作' }
    ];
    
    sqlPatterns.forEach(({ pattern, message }) => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({ type: 'sql_injection_pattern', count: matches.length, message });
      }
    });
    
    return {
      valid: issues.length === 0,
      issues,
      summary: issues.length === 0 ? 'JSON结构完整' : `发现 ${issues.length} 个问题`
    };
  }

  /**
   * 清理SQL注入示例中的危险字符
   * @param {string} sqlExample - SQL示例字符串
   * @returns {string} 清理后的SQL示例
   */
  static sanitizeSqlExample(sqlExample) {
    // 将常见的SQL注入模式转换为占位符表示
    let sanitized = sqlExample;
    
    // 1. OR '1'='1' -> OR {condition}
    sanitized = sanitized.replace(/OR\s+['"]1['"]\s*=\s*['"]1['"]/gi, 'OR {always_true_condition}');
    
    // 2. ' OR 1=1-- -> {input} OR 1=1--
    sanitized = sanitized.replace(/['"]\s*OR\s+\d+\s*=\s*\d+\s*--/gi, '{malicious_input}');
    
    // 3. UNION SELECT -> UNION SELECT {columns}
    sanitized = sanitized.replace(/UNION\s+SELECT\s+\*/gi, 'UNION SELECT {columns}');
    
    // 4. ; DROP TABLE -> ; DROP TABLE {table}
    sanitized = sanitized.replace(/;\s*DROP\s+TABLE\s+\w+/gi, '; DROP TABLE {table_name}');
    
    return sanitized;
  }
}

export default JSONCleaner;