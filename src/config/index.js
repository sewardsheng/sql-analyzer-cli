/**
 * 配置模块索引文件
 * 提供配置管理的统一入口，简化配置访问
 */

import { unifiedConfigManager } from './config-manager.js';

// 重新导出配置管理器的主要方法，使用箭头函数保持正确的 this 上下文
export const readConfig = () => unifiedConfigManager.getAll();
export const setConfigValue = (path, value) => unifiedConfigManager.set(path, value);
export const resetAllConfig = () => unifiedConfigManager.reset();
export const getConfigModule = (module) => unifiedConfigManager.getModule(module);
export const getAPIConfig = () => unifiedConfigManager.getAPIConfig();
export const getLLMConfig = () => unifiedConfigManager.getLLMConfig();
export const getServerConfig = () => unifiedConfigManager.getServerConfig();
export const getKnowledgeConfig = () => unifiedConfigManager.getKnowledgeConfig();
export const getLearningConfig = () => unifiedConfigManager.getLearningConfig();
export const getValidationConfig = () => unifiedConfigManager.getValidationConfig();
export const getApprovalConfig = () => unifiedConfigManager.getApprovalConfig();
export const getStorageConfig = () => unifiedConfigManager.getStorageConfig();
export const getMiddlewareConfig = () => unifiedConfigManager.getMiddlewareConfig();

// 简化配置访问方法
export const config = unifiedConfigManager;

export default unifiedConfigManager;