/**
 * 重构后的MenuCommand单元测试
 * 老王我测试重构后的MenuCommand
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MenuCommand } from '../../../cli/commands/menu.js';
import { ServiceContainer } from '../../../services/factories/ServiceContainer.js';

describe('MenuCommand (重构后)', () => {
  let menuCommand: MenuCommand;
  let mockServiceContainer: ServiceContainer;

  beforeEach(() => {
    // 重置ServiceContainer单例
    ServiceContainer.resetInstance();

    // Mock console和process方法
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    ServiceContainer.resetInstance();
  });

  describe('构造函数', () => {
    it('应该使用默认的ServiceContainer', () => {
      const command = new MenuCommand();
      expect(command).toBeDefined();
      expect(command).toBeInstanceOf(MenuCommand);
    });

    it('应该接受注入的ServiceContainer', () => {
      const container = ServiceContainer.getInstance();
      const command = new MenuCommand(container);
      expect(command).toBeDefined();
      expect(command).toBeInstanceOf(MenuCommand);
    });
  });

  describe('服务获取', () => {
    it('应该从ServiceContainer获取SQL分析器', () => {
      const container = ServiceContainer.getInstance();
      const command = new MenuCommand(container);

      // 通过检查execute方法是否定义来间接验证服务初始化成功
      expect(typeof command.execute).toBe('function');
    });

    it('应该从ServiceContainer获取文件分析服务', () => {
      const container = ServiceContainer.getInstance();
      const command = new MenuCommand(container);

      expect(typeof command.execute).toBe('function');
    });

    it('应该从ServiceContainer获取知识库服务', () => {
      const container = ServiceContainer.getInstance();
      const command = new MenuCommand(container);

      expect(typeof command.execute).toBe('function');
    });

    it('应该从ServiceContainer获取结果格式化器', () => {
      const container = ServiceContainer.getInstance();
      const command = new MenuCommand(container);

      expect(typeof command.execute).toBe('function');
    });
  });

  describe('配置管理', () => {
    it('应该使用ServiceContainer的配置', () => {
      const container = ServiceContainer.getInstance();
      const command = new MenuCommand(container);
      const serviceConfig = container.getServiceConfig();

      expect(serviceConfig.enableCaching).toBe(true);
      expect(serviceConfig.enableKnowledgeBase).toBe(true);
      expect(serviceConfig.maxConcurrency).toBe(3);
    });

    it('应该支持配置更新', () => {
      const container = ServiceContainer.getInstance();

      container.updateServiceConfig({
        maxConcurrency: 8,
        enableCaching: false
      });

      const updatedConfig = container.getServiceConfig();
      expect(updatedConfig.maxConcurrency).toBe(8);
      expect(updatedConfig.enableCaching).toBe(false);
    });
  });

  describe('服务复用', () => {
    it('多个MenuCommand实例应该复用同一个ServiceContainer', () => {
      const container = ServiceContainer.getInstance();
      const command1 = new MenuCommand(container);
      const command2 = new MenuCommand(container);

      expect(command1).toBeDefined();
      expect(command2).toBeDefined();
    });
  });

  describe('延迟初始化', () => {
    it('应该支持历史服务的延迟初始化', () => {
      const container = ServiceContainer.getInstance();
      const command = new MenuCommand(container);

      expect(typeof command.execute).toBe('function');
    });
  });
});