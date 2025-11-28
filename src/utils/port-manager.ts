/**
 * 端口管理工具
 * 自动检测端口占用并寻找可用端口
 */

import { createServer } from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 检查端口是否被占用
 * @param port - 端口号
 * @returns Promise<boolean> - true表示端口被占用
 */
export async function isPortOccupied(port: number): Promise<boolean> {
  try {
    // 使用系统命令检查端口占用
    const command = process.platform === 'win32'
      ? `netstat -ano | findstr :${port}`
      : `lsof -i :${port} || netstat -tlnp | grep :${port}`;

    const { stdout } = await execAsync(command);

    // 如果输出包含端口号且包含LISTEN或LISTENING，则认为端口被占用
    return stdout.includes(`${port}`) && (stdout.includes('LISTEN') || stdout.includes('LISTENING'));

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