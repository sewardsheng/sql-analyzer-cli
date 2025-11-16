/**
 * UI服务入口
 * 启动Ink可视化终端界面
 */

import React from 'react';
import { render } from 'ink';
import App from './components/App.js';

/**
 * 启动UI界面
 * @param {Object} options - 启动选项
 * @param {Object} options.config - 配置对象
 * @param {string} options.file - SQL文件路径
 * @param {string} options.database - 数据库类型
 */
export async function startUI(options) {
  const { waitUntilExit } = render(
    React.createElement(App, {
      config: options.config,
      file: options.file,
      database: options.database
    })
  );

  await waitUntilExit();
}