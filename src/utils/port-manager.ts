/**
 * 端口管理工具
 * 自动检测端口占用并寻找可用端口
 * 使用安全的spawn方式，避免shell注入
 */

import { createServer } from 'net';
import { spawn } from 'child_process';

/**
 * 安全执行系统命令，避免shell注入
 */
async function safeExec(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false  // 明确禁用shell，避免安全风险
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (code: number) => {
      resolve({ stdout, stderr });
    });

    child.on('error', (error: Error) => {
      resolve({ stdout: '', stderr: error.message });
    });
  });
}

/**
 * 检查端口是否被占用
 * @param port - 端口号
 * @returns Promise<boolean> - true表示端口被占用
 */
export async function isPortOccupied(port: number): Promise<boolean> {
  try {
    let result: { stdout: string; stderr: string };

    if (process.platform === 'win32') {
      // Windows: 使用netstat + findstr组合
      const netstatResult = await safeExec('netstat', ['-ano']);
      const findstrResult = await safeExec('findstr', [`:${port}`]);

      result = {
        stdout: netstatResult.stdout.split('\n')
          .filter(line => line.includes(`:${port}`))
          .join('\n'),
        stderr: netstatResult.stderr + findstrResult.stderr
      };
    } else {
      // Unix/Linux/macOS: 优先使用lsof，备选netstat
      try {
        result = await safeExec('lsof', ['-i', `:${port}`]);
      } catch {
        result = await safeExec('netstat', ['-tlnp']);
        // 过滤特定端口的行
        result.stdout = result.stdout.split('\n')
          .filter(line => line.includes(`:${port}`))
          .join('\n');
      }
    }

    // 如果输出包含端口号且包含LISTEN或LISTENING，则认为端口被占用
    return result.stdout.includes(`${port}`) &&
           (result.stdout.includes('LISTEN') || result.stdout.includes('LISTENING'));

  } catch (error) {
    // 命令执行失败，认为端口未被占用
    return false;
  }
}

/**
 * 查找可用端口
 * @param startPort - 起始端口
 * @param maxAttempts - 最大尝试次数
 * @returns Promise<number> - 可用端口号
 */
export async function findAvailablePort(
  startPort: number,
  maxAttempts: number = 50
): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;

    if (!(await isPortOccupied(port))) {
      return port;
    }
  }

  throw new Error(`无法在 ${startPort}-${startPort + maxAttempts - 1} 范围内找到可用端口`);
}

/**
 * 获取智能端口配置
 * 优先使用环境变量指定的端口，如果被占用则自动递增
 * @returns Promise<number> - 最终使用的端口号
 */
export async function getSmartPort(): Promise<number> {
  const configPort = parseInt(process.env.API_PORT || process.env.PORT || '3000');

  try {
    // 如果指定端口可用，直接使用
    if (!(await isPortOccupied(configPort))) {
            return configPort;
    }

    // 否则寻找下一个可用端口
    const availablePort = await findAvailablePort(configPort);
        return availablePort;

  } catch (error: any) {
    console.error(`❌ 端口检测失败: ${error.message}`);
    throw error;
  }
}

/**
 * 端口信息记录
 */
export interface PortInfo {
  requested: number;    // 请求的端口
  actual: number;       // 实际使用的端口
  autoSwitch: boolean;  // 是否自动切换
}

/**
 * 智能端口管理器
 */
export class SmartPortManager {
  private portInfo: PortInfo;

  constructor(requestedPort: number) {
    this.portInfo = {
      requested: requestedPort,
      actual: requestedPort,
      autoSwitch: false
    };
  }

  /**
   * 获取端口信息
   */
  getPortInfo(): PortInfo {
    return { ...this.portInfo };
  }

  /**
   * 解析可用端口
   */
  async resolvePort(): Promise<number> {
    const requestedPort = this.portInfo.requested;

    try {
      if (!(await isPortOccupied(requestedPort))) {
        this.portInfo.actual = requestedPort;
        this.portInfo.autoSwitch = false;
        return requestedPort;
      }

      const availablePort = await findAvailablePort(requestedPort);
      this.portInfo.actual = availablePort;
      this.portInfo.autoSwitch = true;

      console.log(`📡 端口智能管理:`);
      console.log(`   └─ 请求端口: ${requestedPort}`);
      console.log(`   └─ 实际端口: ${availablePort}`);
      console.log(`   └─ 自动切换: ${this.portInfo.autoSwitch ? '是' : '否'}`);

      return availablePort;

    } catch (error: any) {
      console.error(`❌ 端口解析失败: ${error.message}`);
      throw error;
    }
  }
}