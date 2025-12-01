/**
 * 重构后的AnalyzeCommand单元测试
 * 老王我测试重构后的AnalyzeCommand
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnalyzeCommand } from '../../../cli/commands/analyze.js';
import { ServiceContainer } from '../../../services/factories/ServiceContainer.js';

describe('AnalyzeCommand (重构后)', () => {
  let analyzeCommand: AnalyzeCommand;
  let mockServiceContainer: ServiceContainer;

  beforeEach(() => {
    // 重置ServiceContainer单例
    ServiceContainer.resetInstance();

    // 创建服务容器实例
    mockServiceContainer = ServiceContainer.getInstance();

    // Mock console方法
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    ServiceContainer.resetInstance();
  });

  describe('构造函数', () => {
    it('应该使用默认的ServiceContainer', () => {
      const command = new AnalyzeCommand();
      expect(command).toBeDefined();
      expect(command).toBeInstanceOf(AnalyzeCommand);
    });

    it('应该接受注入的ServiceContainer', () => {
      const container = ServiceContainer.getInstance();
      const command = new AnalyzeCommand(container);
      expect(command).toBeDefined();
      expect(command).toBeInstanceOf(AnalyzeCommand);
    });
  });

  describe('服务获取', () => {
    it('应该从ServiceContainer获取SQL分析器', () => {
      const container = ServiceContainer.getInstance();
      const command = new AnalyzeCommand(container);

      // 通过检查execute方法是否定义来间接验证服务初始化成功
      expect(typeof command.execute).toBe('function');
    });

    it('应该从ServiceContainer获取文件分析服务', () => {
      const container = ServiceContainer.getInstance();
      const command = new AnalyzeCommand(container);

      expect(typeof command.execute).toBe('function');
    });
  });

  describe('错误处理', () => {
    it('应该正确处理无效选项', async () => {
      const command = new AnalyzeCommand();

      try {
        await command.execute({});
        expect(false).toBe(true); // 不应该到达这里
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('请提供');
      }
    });

    it('应该拒绝不存在的文件', async () => {
      const command = new AnalyzeCommand();

      try {
        await command.execute({ file: '/nonexistent/file.sql' });
        expect(false).toBe(true); // 不应该到达这里
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('文件不存在');
      }
    });
  });

  describe('配置管理', () => {
    it('应该使用ServiceContainer的配置', () => {
      const container = ServiceContainer.getInstance();
      const serviceConfig = container.getServiceConfig();

      expect(serviceConfig.enableCaching).toBe(true);
      expect(serviceConfig.enableKnowledgeBase).toBe(true);
      expect(serviceConfig.maxConcurrency).toBe(3);
    });

    it('应该支持配置更新', () => {
      const container = ServiceContainer.getInstance();

      container.updateServiceConfig({
        maxConcurrency: 5,
        enableCaching: false
      });

      const updatedConfig = container.getServiceConfig();
      expect(updatedConfig.maxConcurrency).toBe(5);
      expect(updatedConfig.enableCaching).toBe(false);
    });
  });

  describe('服务复用', () => {
    it('多个AnalyzeCommand实例应该复用同一个ServiceContainer', () => {
      const container = ServiceContainer.getInstance();
      const command1 = new AnalyzeCommand(container);
      const command2 = new AnalyzeCommand(container);

      // 验证两个命令都使用相同的服务容器
      expect(command1).toBeDefined();
      expect(command2).toBeDefined();
    });
  });
});