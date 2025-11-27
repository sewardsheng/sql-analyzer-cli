/**
 * 配置适配器
 * 直接使用UnifiedConfigManager，移除向后兼容层
 */

import { unifiedConfigManager } from './UnifiedConfigManager.js';

// 直接导出统一配置管理器的实例和方法
export const config = unifiedConfigManager;

// 导出常用的配置获取方法
export const getConfig = () => unifiedConfigManager.getConfig();
export const getLLMConfig = () => unifiedConfigManager.getLLMConfig();
export const getServerConfig = () => unifiedConfigManager.getServerConfig();
export const getAPIConfig = () => unifiedConfigManager.getAPIConfig();
export const getDatabaseConfig = () => unifiedConfigManager.getDatabaseConfig();
export const getKnowledgeConfig = () => unifiedConfigManager.getKnowledgeConfig();
export const getLearningConfig = () => unifiedConfigManager.getLearningConfig();
export const getGenerationConfig = () => unifiedConfigManager.getGenerationConfig();
export const getEvaluationConfig = () => unifiedConfigManager.getEvaluationConfig();
export const getApprovalConfig = () => unifiedConfigManager.getApprovalConfig();
export const getStorageConfig = () => unifiedConfigManager.getStorageConfig();
export const getPerformanceConfig = () => unifiedConfigManager.getPerformanceConfig();
export const getLoggingConfig = () => unifiedConfigManager.getLoggingConfig();
export const getMiddlewareConfig = () => unifiedConfigManager.getMiddlewareConfig();
export const getValidationConfig = () => unifiedConfigManager.getValidationConfig();

// 导出配置更新方法
export const updateLLMConfig = (updates) => unifiedConfigManager.updateLLMConfig(updates);
export const updateServerConfig = (updates) => unifiedConfigManager.updateServerConfig(updates);
export const updateAPIConfig = (updates) => unifiedConfigManager.updateAPIConfig(updates);
export const updateLearningConfig = (updates) => unifiedConfigManager.updateLearningConfig(updates);
export const updateGenerationConfig = (updates) => unifiedConfigManager.updateGenerationConfig(updates);
export const updateEvaluationConfig = (updates) => unifiedConfigManager.updateEvaluationConfig(updates);
export const updateApprovalConfig = (updates) => unifiedConfigManager.updateApprovalConfig(updates);
export const updateValidationConfig = (updates) => unifiedConfigManager.updateValidationConfig(updates);

// 导出配置管理方法
export const resetConfig = () => unifiedConfigManager.resetConfig();
export const saveConfig = () => unifiedConfigManager.saveConfig();
export const loadConfig = () => unifiedConfigManager.loadConfig();
export const validateConfig = () => unifiedConfigManager.validateConfig();