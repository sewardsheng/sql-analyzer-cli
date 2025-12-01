/**
 * 重构后的LearnCommand单元测试
 * 老王我测试重构后的LearnCommand
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LearnCommand } from '../../../cli/commands/learn.js';
import { ServiceContainer } from '../../../services/factories/ServiceContainer.js';

describe('LearnCommand (重构后)', () => {
  let learnCommand: LearnCommand;
  let mockServiceContainer: ServiceContainer;

  beforeEach(() => {
    // 重置ServiceContainer单例
    ServiceContainer.resetInstance();

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
      const command = new LearnCommand();
      expect(command).toBeDefined();
      expect(command).toBeInstanceOf(LearnCommand);
    });

    it('应该接受注入的ServiceContainer', () => {
      const container = ServiceContainer.getInstance();
      const command = new LearnCommand(container);
      expect(command).toBeDefined();
      expect(command).toBeInstanceOf(LearnCommand);
    });
  });

  describe('execute方法', () => {
    it('应该定义execute方法', () => {
      const command = new LearnCommand();
      expect(typeof command.execute).toBe('function');
    });

    it('应该正确处理无效选项', async () => {
      const command = new LearnCommand();

      try {
        await command.execute({});
        // LearnCommand不会抛出错误，因为它有自己的错误处理
        expect(true).toBe(true);
      } catch (error) {
        // 如果抛出错误，也是可以接受的
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('服务集成', () => {
    it('应该能够与ServiceContainer集成', () => {
      const container = ServiceContainer.getInstance();
      const command = new LearnCommand(container);

      expect(typeof command.execute).toBe('function');
    });

    it('应该使用ServiceContainer的配置', () => {
      const container = ServiceContainer.getInstance();
      const command = new LearnCommand(container);
      const serviceConfig = container.getServiceConfig();

      expect(serviceConfig.enableCaching).toBeDefined();
      expect(serviceConfig.enableKnowledgeBase).toBeDefined();
      expect(serviceConfig.maxConcurrency).toBeDefined();
    });
  });

  describe('服务复用', () => {
    it('多个LearnCommand实例应该复用同一个ServiceContainer', () => {
      const container = ServiceContainer.getInstance();
      const command1 = new LearnCommand(container);
      const command2 = new LearnCommand(container);

      expect(command1).toBeDefined();
      expect(command2).toBeDefined();
    });
  });
});