/**
 * 性能优化初始化模块
 * 在应用启动时初始化性能优化功能
 */

const { startCacheCleanup, stopCacheCleanup } = require('./performance');

// 全局定时器引用
let cleanupTimer = null;

/**
 * 初始化性能优化功能
 */
function initializePerformance() {
  // 启动定期缓存清理（每10分钟清理一次过期缓存）
  cleanupTimer = startCacheCleanup(10 * 60 * 1000);
  // 移除控制台输出，保持静默初始化
}

/**
 * 停止性能优化功能
 */
function stopPerformance() {
  if (cleanupTimer) {
    cleanupTimer.stop();
    cleanupTimer = null;
    console.log('性能优化功能已停止');
  } else {
    stopCacheCleanup();
  }
}

module.exports = {
  initializePerformance,
  stopPerformance
};