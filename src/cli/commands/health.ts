/**
 * health命令模块
 * 老王我把系统健康检查独立出来了！
 */

import HealthService from '../../services/health-service.js';
import { cli as cliTools } from '../../utils/cli/index.js';

/**
 * 系统健康检查命令类
 */
export class HealthCommand {
  private healthService: HealthService;

  constructor() {
    this.healthService = new HealthService();
  }

  /**
   * 处理健康检查命令
   */
  async execute(options: any): Promise<void> {
    cliTools.log.info('🔍 开始系统健康检查...');
    const startTime = Date.now();

    try {
      const healthReport = await this.healthService.performAllChecks();

      // 显示健康检查结果
      this.displayHealthResults(healthReport);

      const duration = Date.now() - startTime;
      console.log(cliTools.colors.green(`✅ 健康检查完成，耗时: ${duration}ms`));

      // 如果有问题，标记为失败但不直接退出，让CLI框架处理退出
      if (!(healthReport as any).healthy) {
        cliTools.log.error('系统健康检查发现问题');
        // 抛出错误而不是直接process.exit，让CLI框架处理
        throw new Error('系统健康检查失败');
      }

    } catch (error: any) {
      cliTools.log.error(`健康检查失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 显示健康检查结果
   */
  private displayHealthResults(report: any): void {
    const reportAny = report as any;
    console.log(cliTools.colors.cyan('\n🏥 系统健康检查报告'));
    console.log(cliTools.colors.gray('=================================================='));

    // 总体状态
    const statusColor = reportAny.healthy ? cliTools.colors.green : cliTools.colors.red;
    const statusText = reportAny.healthy ? '健康' : '不健康';
    console.log(`总体状态: ${statusColor(statusText)}`);
    console.log(`检查时间: ${cliTools.colors.blue(new Date().toLocaleString())}`);

    if (report.score !== undefined) {
      let scoreColor = cliTools.colors.green;
      if (report.score < 60) scoreColor = cliTools.colors.red;
      else if (report.score < 80) scoreColor = cliTools.colors.yellow;
      console.log(`健康评分: ${scoreColor(report.score + '分')}`);
    }

    // 显示各项检查结果
    if (report.checks && report.checks.length > 0) {
      console.log(cliTools.colors.cyan('\n📋 详细检查结果:'));

      report.checks.forEach((check: any, index: number) => {
        const statusColor = check.status === 'pass' ? cliTools.colors.green :
                          check.status === 'warning' ? cliTools.colors.yellow :
                          cliTools.colors.red;
        const statusIcon = check.status === 'pass' ? '✅' :
                          check.status === 'warning' ? '⚠️' : '❌';

        console.log(`\n${cliTools.colors.yellow(`${index + 1}. ${check.name}`)}`);
        console.log(`  状态: ${statusColor(`${statusIcon} ${check.status.toUpperCase()}`)}`);
        console.log(`  描述: ${cliTools.colors.gray(check.description)}`);

        if (check.status !== 'pass') {
          console.log(`  问题: ${cliTools.colors.red(check.error || '检查失败')}`);
        }

        if (check.duration) {
          console.log(`  耗时: ${cliTools.colors.blue(check.duration + 'ms')}`);
        }
      });
    }

    // 显示失败项统计
    if (report.summary) {
      const { passed, warnings, failed, total } = report.summary;
      console.log(cliTools.colors.cyan('\n📊 检查统计:'));
      console.log(`总计: ${cliTools.colors.yellow(total.toString())}`);
      console.log(`通过: ${cliTools.colors.green(passed.toString())}`);
      console.log(`警告: ${cliTools.colors.yellow(warnings.toString())}`);
      console.log(`失败: ${cliTools.colors.red(failed.toString())}`);

      if (total > 0) {
        const successRate = ((passed / total) * 100).toFixed(1);
        console.log(`通过率: ${cliTools.colors.green(successRate + '%')}`);
      }
    }

    // 显示建议
    if (report.recommendations && report.recommendations.length > 0) {
      console.log(cliTools.colors.cyan('\n💡 改进建议:'));
      report.recommendations.forEach((rec: string, index: number) => {
        console.log(`${cliTools.colors.yellow(`${index + 1}.`)} ${rec}`);
      });
    }
  }
}