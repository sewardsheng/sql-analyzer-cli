/**
 * 测试统一配置管理器
 * 验证配置整合和适配器功能
 */

import { UnifiedConfigManager, getUnifiedConfigManager, getConfig, setConfig } from './src/config/UnifiedConfigManager.js';
import { 
  getLLMConfig, 
  getServerConfig, 
  getApiConfig,
  getRuleLearningConfig,
  ConfigFactory,
  ConfigMigrator
} from './src/config/ConfigAdapters.js';

async function testUnifiedConfigManager() {
  console.log('🧪 开始测试统一配置管理器...\n');
  
  // 1. 测试基本配置获取
  console.log('📋 测试基本配置获取:');
  console.log('=' .repeat(50));
  
  const manager = getUnifiedConfigManager();
  
  console.log('🔧 服务器配置:');
  const serverConfig = manager.getModule('server');
  console.log(`  端口: ${serverConfig.port}`);
  console.log(`  主机: ${serverConfig.host}`);
  console.log(`  环境: ${serverConfig.nodeEnv}`);
  
  console.log('\n🔧 LLM配置:');
  const llmConfig = manager.getModule('llm');
  console.log(`  模型: ${llmConfig.model}`);
  console.log(`  基础URL: ${llmConfig.baseUrl}`);
  console.log(`  API密钥: ${llmConfig.apiKey ? '已配置' : '未配置'}`);
  
  console.log('\n🔧 规则学习配置:');
  const ruleLearningConfig = manager.getModule('ruleLearning');
  console.log(`  学习启用: ${ruleLearningConfig.learning.enabled}`);
  console.log(`  最小置信度: ${ruleLearningConfig.learning.minConfidence}`);
  console.log(`  自动审批阈值: ${ruleLearningConfig.evaluation.autoApprovalThreshold}`);
  
  // 2. 测试配置适配器
  console.log('\n\n📋 测试配置适配器:');
  console.log('=' .repeat(50));
  
  console.log('🔧 LLM配置适配器:');
  const adaptedLLMConfig = getLLMConfig();
  console.log(`  模型: ${adaptedLLMConfig.model}`);
  console.log(`  温度: ${adaptedLLMConfig.temperature}`);
  
  console.log('\n🔧 服务器配置适配器:');
  const adaptedServerConfig = getServerConfig();
  console.log(`  端口: ${adaptedServerConfig.port}`);
  console.log(`  CORS: ${adaptedServerConfig.cors}`);
  
  console.log('\n🔧 API配置适配器:');
  const adaptedApiConfig = getApiConfig();
  console.log(`  端口: ${adaptedApiConfig.port}`);
  console.log(`  CORS启用: ${adaptedApiConfig.corsEnabled}`);
  
  console.log('\n🔧 规则学习配置适配器:');
  const adaptedRuleLearningConfig = getRuleLearningConfig();
  console.log(`  学习启用: ${adaptedRuleLearningConfig.get('learning.enabled')}`);
  console.log(`  最小置信度: ${adaptedRuleLearningConfig.get('learning.minConfidence')}`);
  
  // 3. 测试配置工厂
  console.log('\n\n📋 测试配置工厂:');
  console.log('=' .repeat(50));
  
  const factoryLLMConfig = ConfigFactory.createLLMConfig({ temperature: 0.5 });
  console.log(`🏭 工厂创建LLM配置 - 温度: ${factoryLLMConfig.temperature}`);
  
  const factoryServerConfig = ConfigFactory.createServerConfig({ port: 8080 });
  console.log(`🏭 工厂创建服务器配置 - 端口: ${factoryServerConfig.port}`);
  
  // 4. 测试配置更新和监听
  console.log('\n\n📋 测试配置更新和监听:');
  console.log('=' .repeat(50));
  
  let changeCount = 0;
  const unwatch = manager.watch('ruleLearning.learning.minConfidence', (newValue, oldValue, path) => {
    changeCount++;
    console.log(`🔔 配置变化监听 ${changeCount}: ${path} 从 ${oldValue} 变为 ${newValue}`);
  });
  
  console.log(`📊 原始最小置信度: ${manager.get('ruleLearning.learning.minConfidence')}`);
  
  setConfig('ruleLearning.learning.minConfidence', 0.85);
  console.log(`📊 更新后最小置信度: ${manager.get('ruleLearning.learning.minConfidence')}`);
  
  setConfig('ruleLearning.learning.minConfidence', 0.9);
  console.log(`📊 再次更新后最小置信度: ${manager.get('ruleLearning.learning.minConfidence')}`);
  
  console.log(`🔔 总共触发了 ${changeCount} 次配置变化监听`);
  
  // 取消监听
  unwatch();
  
  // 5. 测试配置验证
  console.log('\n\n📋 测试配置验证:');
  console.log('=' .repeat(50));
  
  try {
    // 测试有效配置更新
    manager.set('server.port', 3000);
    console.log('✅ 有效配置更新成功');
    
    // 测试无效配置更新
    manager.set('server.port', 99999);
    console.log('❌ 无效配置更新应该失败');
  } catch (error) {
    console.log(`✅ 配置验证正常工作: ${error.message}`);
  }
  
  // 6. 测试配置统计
  console.log('\n\n📋 测试配置统计:');
  console.log('=' .repeat(50));
  
  const stats = manager.getStats();
  console.log(`📊 配置统计:`);
  console.log(`  总键数: ${stats.totalKeys}`);
  console.log(`  模块数: ${stats.modules.length}`);
  console.log(`  模块列表: ${stats.modules.join(', ')}`);
  console.log(`  监听器数: ${stats.watchers.length}`);
  console.log(`  版本: ${stats.version}`);
  
  // 7. 测试环境变量导出
  console.log('\n\n📋 测试环境变量导出:');
  console.log('=' .repeat(50));
  
  const envVars = manager.exportToEnv();
  const serverPort = envVars['SERVER_PORT'];
  const llmModel = envVars['LLM_MODEL'];
  
  console.log(`🌍 环境变量导出:`);
  console.log(`  SERVER_PORT: ${serverPort}`);
  console.log(`  LLM_MODEL: ${llmModel}`);
  console.log(`  总环境变量数: ${Object.keys(envVars).length}`);
  
  // 8. 测试配置迁移
  console.log('\n\n📋 测试配置迁移:');
  console.log('=' .repeat(50));
  
  const oldConfig = {
    learning: {
      enabled: true,
      minConfidence: 0.75,
      minBatchSize: 10
    },
    evaluation: {
      autoApprovalThreshold: 80,
      autoApprovalConfidence: 0.85
    }
  };
  
  const migratedConfig = ConfigMigrator.migrateRuleLearningConfig(oldConfig);
  console.log(`🔄 配置迁移结果:`);
  console.log(`  学习启用: ${migratedConfig.ruleLearning.learning.enabled}`);
  console.log(`  最小置信度: ${migratedConfig.ruleLearning.learning.minConfidence}`);
  console.log(`  最小批次大小: ${migratedConfig.ruleLearning.learning.minBatchSize}`);
  console.log(`  自动审批阈值: ${migratedConfig.ruleLearning.evaluation.autoApprovalThreshold}`);
  
  // 9. 测试配置文件操作
  console.log('\n\n📋 测试配置文件操作:');
  console.log('=' .repeat(50));
  
  const testConfigPath = 'test-config.json';
  
  try {
    // 保存配置到文件
    await manager.saveToFile(testConfigPath);
    console.log(`✅ 配置已保存到 ${testConfigPath}`);
    
    // 修改配置
    const originalPort = manager.get('server.port');
    manager.set('server.port', 9999);
    console.log(`📊 临时修改端口为: ${manager.get('server.port')}`);
    
    // 从文件加载配置
    await manager.loadFromFile(testConfigPath);
    console.log(`📊 从文件恢复后端口为: ${manager.get('server.port')}`);
    
    // 验证恢复
    if (manager.get('server.port') === originalPort) {
      console.log('✅ 配置文件加载和恢复正常');
    } else {
      console.log('❌ 配置文件恢复失败');
    }
    
    // 清理测试文件
    const fs = await import('fs/promises');
    await fs.unlink(testConfigPath);
    console.log(`🧹 清理测试文件: ${testConfigPath}`);
    
  } catch (error) {
    console.error(`❌ 配置文件操作失败: ${error.message}`);
  }
  
  console.log('\n✅ 统一配置管理器测试完成!');
}

// 运行测试
testUnifiedConfigManager().catch(console.error);