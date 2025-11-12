import fs from 'fs/promises';
import path from 'path';
// 在 ES 模块中使用 chalk 的正确方式
import chalk from 'chalk';

/**
 * 检查.env文件是否存在，如果不存在则创建
 */
async function ensureEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  
  try {
    await fs.access(envPath);
    console.log(chalk.green('✅ .env 文件已存在'));
    return true;
  } catch (error) {
    // .env文件不存在，创建一个
    const envExamplePath = path.join(process.cwd(), '.env.example');
    
    try {
      // 检查是否有.env.example文件
      await fs.access(envExamplePath);
      
      // 复制.env.example为.env
      const envExample = await fs.readFile(envExamplePath, 'utf8');
      await fs.writeFile(envPath, envExample);
      
      console.log(chalk.green('✅ 已根据 .env.example 创建 .env 文件'));
      console.log(chalk.yellow('⚠️  请编辑 .env 文件，填入你的API密钥和配置'));
      return false;
    } catch (exampleError) {
      // 没有.env.example文件，创建一个基本的.env文件
      const basicEnv = `# OpenAI API配置
CUSTOM_API_KEY=your_api_key_here
CUSTOM_BASE_URL=https://api.openai.com/v1
CUSTOM_MODEL=gpt-3.5-turbo

# 默认数据库类型
DEFAULT_DATABASE_TYPE=mysql
`;
      
      await fs.writeFile(envPath, basicEnv);
      console.log(chalk.green('✅ 已创建基本的 .env 文件'));
      console.log(chalk.yellow('⚠️  请编辑 .env 文件，填入你的API密钥和配置'));
      return false;
    }
  }
}

/**
 * 验证环境变量
 */
async function validateEnv() {
  const envPath = path.join(process.cwd(), '.env');
  
  try {
    await fs.access(envPath);
    
    // 读取.env文件
    const envContent = await fs.readFile(envPath, 'utf8');
    
    // 检查必要的环境变量
    const requiredVars = ['CUSTOM_API_KEY'];
    const missingVars = [];
    
    requiredVars.forEach(varName => {
      const regex = new RegExp(`^${varName}=.*$`, 'm');
      if (!regex.test(envContent)) {
        missingVars.push(varName);
      } else {
        const match = envContent.match(regex);
        const value = match[0].split('=')[1];
        if (value === 'your_api_key_here' || value.trim() === '') {
          missingVars.push(varName);
        }
      }
    });
    
    if (missingVars.length > 0) {
      console.log(chalk.red('❌ 以下环境变量未配置或使用默认值:'));
      missingVars.forEach(varName => {
        console.log(chalk.red(`   - ${varName}`));
      });
      console.log(chalk.yellow('请编辑 .env 文件，填入正确的值'));
      return false;
    }
    
    console.log(chalk.green('✅ 环境变量验证通过'));
    return true;
    
  } catch (error) {
    console.log(chalk.red('❌ .env 文件不存在'));
    console.log(chalk.yellow('请运行 "sql-analyzer init" 初始化环境'));
    return false;
  }
}

/**
 * 初始化环境
 */
async function initEnvironment() {
  console.log(chalk.blue('🔧 初始化SQL分析器环境'));
  
  const envExists = await ensureEnvFile();
  
  if (!envExists) {
    console.log(chalk.gray('环境文件已创建，请编辑 .env 文件后重新运行验证'));
    return false;
  }
  
  return await validateEnv();
}

export {
  ensureEnvFile,
  validateEnv,
  initEnvironment
};