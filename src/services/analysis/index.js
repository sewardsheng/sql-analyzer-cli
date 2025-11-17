/**
 * SQL分析服务
 * 提供SQL分析功能的业务编排层
 */

import { createCoordinator } from '../../core/coordinator.js';
import { getConfigManager } from '../config/index.js';
import { getHistoryService } from '../history/historyService.js';
import { displayEnhancedSummary } from '../../utils/summaryDisplay.js';
import { readSqlFromFile } from '../../utils/fileReader.js';
import chalk from 'chalk';

/**
 * SQL分析服务类
 */
class AnalysisService {
  constructor() {
    this.coordinator = null;
    this.historyService = getHistoryService();
    this.configManager = getConfigManager();
  }

  /**
   * 获取或创建协调器实例
   * @returns {Promise<Object>} 协调器实例
   */
  async getCoordinator() {
    if (!this.coordinator) {
      const config = await this.configManager.getConfig();
      this.coordinator = createCoordinator(config);
    }
    return this.coordinator;
  }

  /**
   * 验证分析输入
   * @param {Object} options - 分析选项
   * @returns {Object} 验证结果
   */
  validateInput(options) {
    const { sql, file } = options;
    
    if (!sql && !file) {
      throw new Error('必须提供 --sql 或 --file 参数');
    }
    
    if (sql && file) {
      throw new Error('不能同时提供 --sql 和 --file 参数');
    }
    
    return { valid: true };
  }

  /**
   * 准备SQL查询和元数据
   * @param {Object} options - 分析选项
   * @returns {Promise<Object>} SQL查询和元数据
   */
  async prepareSqlQuery(options) {
    const { sql, file } = options;
    let sqlQuery;
    let inputType;
    let sourceInfo;

    if (sql) {
      sqlQuery = sql;
      inputType = 'command';
      sourceInfo = '命令行输入';
      console.log(chalk.blue('\n正在分析SQL语句...'));
    } else {
      sqlQuery = await readSqlFromFile(file);
      inputType = 'file';
      sourceInfo = `文件: ${file}`;
      console.log(chalk.blue(`\n正在从文件读取SQL: ${file}`));
      console.log(chalk.green('✓ 文件读取成功'));
    }

    return {
      sqlQuery,
      inputType,
      sourceInfo
    };
  }

  /**
   * 执行核心分析
   * @param {string} sqlQuery - SQL查询
   * @param {Object} analysisOptions - 分析选项
   * @returns {Promise<Object>} 分析结果
   */
  async executeCoreAnalysis(sqlQuery, analysisOptions) {
    const coordinator = await this.getCoordinator();
    
    // 检查是否为快速模式
    if (analysisOptions.quick) {
      console.log(chalk.blue('\n开始执行快速SQL分析...\n'));
      console.log('='.repeat(60));
      console.log(chalk.gray('调用协调器进行快速分析...'));
      
      // 获取配置管理器
      const configManager = this.configManager;
      const config = await configManager.getConfig();
      
      // 如果是CI/CD模式，设置环境变量
      if (analysisOptions.cicdMode) {
        process.env.CICD_MODE = 'true';
        if (config.cicd?.enableJsonOutput) {
          process.env.CI = 'true'; // 触发JSON输出
        }
      }
      
      const result = await coordinator.quickAnalysis({
        sqlQuery,
        options: {
          ...analysisOptions,
          cicd: config.cicd
        }
      });
      
      console.log('='.repeat(60));
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // CI/CD模式：如果检查失败，设置退出码
      if (analysisOptions.cicdMode && result.data?.analysisResults?.quickAnalysis?.data?.cicdMetadata) {
        const metadata = result.data.analysisResults.quickAnalysis.data.cicdMetadata;
        if (!metadata.passed) {
          console.error(chalk.red(`\n❌ CI/CD检查失败: 评分 ${metadata.scoreThreshold ? result.data.analysisResults.quickAnalysis.data.quickScore + '/' + metadata.scoreThreshold : '不足'}`));
          process.exitCode = 1;
        }
      }
      
      return result;
    } else {
      console.log(chalk.blue('\n开始执行多维度SQL分析...\n'));
      console.log('='.repeat(60));
      console.log(chalk.gray('调用协调器进行分析...'));
      
      const result = await coordinator.coordinateAnalysis({
        sqlQuery,
        options: analysisOptions
      });
      
      console.log('='.repeat(60));
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result;
    }
  }

  /**
   * 保存分析历史
   * @param {string} sqlQuery - SQL查询
   * @param {Object} result - 分析结果
   * @param {string} inputType - 输入类型
   * @returns {Promise<string|null>} 历史记录ID
   */
  async saveAnalysisHistory(sqlQuery, result, inputType) {
    try {
      const historyId = await this.historyService.saveAnalysis({
        sql: sqlQuery,
        result: result,
        type: inputType
      });
      console.log(chalk.gray(`\n历史记录已保存: ${historyId}`));
      return historyId;
    } catch (historyError) {
      console.warn(chalk.yellow(`警告: 保存历史记录失败: ${historyError.message}`));
      return null;
    }
  }

  /**
   * 显示分析结果
   * @param {Object} result - 分析结果
   */
  async displayResult(result) {
    const config = await this.configManager.getConfig();
    displayEnhancedSummary(result, config);
  }

  /**
   * 分析SQL语句（主要业务流程）
   * @param {Object} options - 分析选项
   * @param {string} [options.sql] - 要分析的SQL语句
   * @param {string} [options.file] - 包含SQL语句的文件路径
   * @param {boolean} [options.learn] - 是否启用学习功能
   * @param {boolean} [options.performance] - 是否启用性能分析
   * @param {boolean} [options.security] - 是否启用安全审计
   * @param {boolean} [options.standards] - 是否启用编码规范检查
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeSql(options) {
    try {
      // 1. 验证输入
      this.validateInput(options);
      
      // 2. 准备SQL查询和元数据
      const { sqlQuery, inputType, sourceInfo } = await this.prepareSqlQuery(options);
      
      // 3. 提取分析选项（排除sql和file）
      const { sql, file, ...analysisOptions } = options;
      
      // 4. 执行核心分析
      const result = await this.executeCoreAnalysis(sqlQuery, analysisOptions);
      
      // 5. 保存分析历史
      await this.saveAnalysisHistory(sqlQuery, result, inputType);
      
      // 6. 显示结果
      await this.displayResult(result);
      
      return result;
    } catch (error) {
      console.error(chalk.red(`\n✗ 分析失败: ${error.message}`));
      throw error;
    }
  }

  /**
   * 批量分析SQL语句
   * @param {Array<string>} sqlQueries - SQL查询数组
   * @param {Object} options - 分析选项
   * @returns {Promise<Array>} 分析结果数组
   */
  async analyzeBatch(sqlQueries, options = {}) {
    const results = [];
    
    console.log(chalk.blue(`\n开始批量分析 ${sqlQueries.length} 个SQL语句...\n`));
    
    for (let i = 0; i < sqlQueries.length; i++) {
      const sqlQuery = sqlQueries[i];
      console.log(chalk.cyan(`\n[${i + 1}/${sqlQueries.length}] 分析第 ${i + 1} 个SQL语句...`));
      
      try {
        const result = await this.analyzeSql({ sql: sqlQuery, ...options });
        results.push({ index: i, success: true, result });
      } catch (error) {
        results.push({ index: i, success: false, error: error.message });
        console.error(chalk.red(`第 ${i + 1} 个SQL分析失败: ${error.message}`));
      }
    }
    
    console.log(chalk.green(`\n✅ 批量分析完成，成功: ${results.filter(r => r.success).length}，失败: ${results.filter(r => !r.success).length}\n`));
    
    return results;
  }
}

// 创建服务实例
const analysisService = new AnalysisService();

// ============================================================================
// 导出服务实例
// ============================================================================

/**
 * 获取分析服务实例
 * @returns {AnalysisService} 分析服务实例
 */
export function getAnalysisService() {
  return analysisService;
}

// 导出服务类和实例
export { AnalysisService, analysisService };

// 默认导出服务实例
export default analysisService;