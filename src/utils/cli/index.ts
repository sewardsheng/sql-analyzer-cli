/**
 * CLI工具模块
 * 老王我把现代化的CLI功能都封装在这里，SB玩意儿一下就高大上了！
 */

import {
  red,
  green,
  blue,
  yellow,
  cyan,
  magenta,
  gray,
  bgRed,
  bgGreen,
  bgBlue,
  bgYellow,
  hex
} from 'ansis'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import duration from 'dayjs/plugin/duration'
import inquirer from 'inquirer'
// import { $ } from 'tinyexec' // 暂时注释，后续修复
import { resolve, join, dirname, extname, basename, isAbsolute } from 'pathe'

// 配置dayjs插件
dayjs.extend(relativeTime)
dayjs.extend(duration)

/**
 * 颜色工具
 */
export const colors = {
  red,
  green,
  blue,
  yellow,
  cyan,
  magenta,
  gray,
  bgRed,
  bgGreen,
  bgBlue,
  bgYellow,
  hex
}

/**
 * 时间工具
 */
export const time = {
  dayjs,
  format: (timestamp: number | Date, format = 'YYYY-MM-DD HH:mm:ss') =>
    dayjs(timestamp).format(format),
  humanize: (timestamp: number | Date) =>
    dayjs(timestamp).fromNow(),
  duration: (ms: number) =>
    dayjs.duration(ms).humanize(),
  formatDuration: (ms: number) => {
    const d = dayjs.duration(ms)
    return d.hours() > 0
      ? d.format('H小时m分s秒')
      : d.minutes() > 0
        ? d.format('m分s秒')
        : d.format('S秒')
  }
}

/**
 * 路径工具
 */
export const paths = {
  resolve,
  join,
  dirname,
  extname,
  basename,
  isAbsolute
}

/**
 * 交互工具
 */
export const prompt = {
  /**
   * 确认对话框
   */
  confirm: async (message: string, defaultValue = true) => {
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message,
        default: defaultValue
      }
    ])
    return confirmed
  },

  /**
   * 输入对话框
   */
  input: async (message: string, defaultValue = '') => {
    const { value } = await inquirer.prompt([
      {
        type: 'input',
        name: 'value',
        message,
        default: defaultValue
      }
    ])
    return value
  },

  /**
   * 选择列表
   */
  select: async (message: string, choices: Array<{name: string, value: any}>) => {
    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message,
        choices
      }
    ])
    return selected
  },

  /**
   * 多选列表
   */
  checkbox: async (message: string, choices: Array<{name: string, value: any, checked?: boolean}>) => {
    const { selected } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selected',
        message,
        choices
      }
    ])
    return selected
  },

  /**
   * 密码输入
   */
  password: async (message: string) => {
    const { value } = await inquirer.prompt([
      {
        type: 'password',
        name: 'value',
        message,
        mask: '*'
      }
    ])
    return value
  }
}

/**
 * 命令执行工具 - 暂时简化实现
 */
export const exec = {
  /**
   * 安全执行命令 - 暂时使用Node.js child_process
   */
  run: async (command: string, args?: string[]) => {
    const { exec: cpExec } = await import('child_process')
    return new Promise((resolve: any) => {
      const cmd = args ? `${command} ${args.join(' ')}` : command
      cpExec(cmd, (error: any, stdout: string, stderr: string) => {
        if (error) {
          resolve({
            success: false,
            stdout: stdout || '',
            stderr: stderr || error.message,
            error: error.message
          })
        } else {
          resolve({
            success: true,
            stdout: stdout || '',
            stderr: stderr || ''
          })
        }
      })
    })
  },

  /**
   * 获取文件信息
   */
  fileInfo: async (filePath: string) => {
    return await exec.run('file', [filePath])
  },

  /**
   * 统计行数
   */
  countLines: async (filePath: string) => {
    const result = await exec.run('wc', ['-l', filePath]) as any
    return result.success ? parseInt(result.stdout.trim()) : 0
  }
}

/**
 * 日志工具 - 美化的控制台输出
 */
export const log = {
  /**
   * 信息日志
   */
  info: (message: string, ...args: any[]) => {
    console.log(blue`ℹ️  ${message}`, ...args)
  },

  /**
   * 成功日志
   */
  success: (message: string, ...args: any[]) => {
    console.log(green`✅ ${message}`, ...args)
  },

  /**
   * 警告日志
   */
  warn: (message: string, ...args: any[]) => {
    console.log(yellow`⚠️  ${message}`, ...args)
  },

  /**
   * 错误日志
   */
  error: (message: string, ...args: any[]) => {
    console.error(red`❌ ${message}`, ...args)
  },

  /**
   * 调试日志
   */
  debug: (message: string, ...args: any[]) => {
    console.log(gray`🔧 ${message}`, ...args)
  },

  /**
   * 进度日志
   */
  progress: (message: string, ...args: any[]) => {
    console.log(cyan`🔄 ${message}`, ...args)
  },

  /**
   * 分析日志
   */
  analysis: (message: string, ...args: any[]) => {
    console.log(magenta`🔍 ${message}`, ...args)
  },

  /**
   * 配置日志
   */
  config: (message: string, ...args: any[]) => {
    console.log(yellow`⚙️  ${message}`, ...args)
  },

  /**
   * 统计日志
   */
  stats: (message: string, ...args: any[]) => {
    console.log(cyan`📊 ${message}`, ...args)
  },

  /**
   * 带时间戳的日志
   */
  timestamp: (message: string, ...args: any[]) => {
    const timestamp = time.format(new Date())
    console.log(gray`[${timestamp}] ${message}`, ...args)
  }
}

/**
 * CLI工具集合
 */
export const cli = {
  colors,
  time,
  paths,
  prompt,
  exec,
  log
}

export default cli