/**
 * API使用示例
 * 
 * 这个示例展示了如何使用SQL分析器的API服务器
 */

const http = require('http');

// API服务器配置
const API_HOST = 'localhost';
const API_PORT = 3000;

// 发送HTTP请求的辅助函数
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: JSON.parse(body)
          };
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// 示例1: 健康检查
async function healthCheck() {
  console.log('\n=== 健康检查 ===');
  try {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: '/health',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    console.log(`状态码: ${response.statusCode}`);
    console.log('响应:', JSON.stringify(response.body, null, 2));
  } catch (error) {
    console.error('健康检查失败:', error.message);
  }
}

// 示例2: API文档
async function getApiDocs() {
  console.log('\n=== API文档 ===');
  try {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: '/api/docs',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    console.log(`状态码: ${response.statusCode}`);
    console.log('响应:', JSON.stringify(response.body, null, 2));
  } catch (error) {
    console.error('获取API文档失败:', error.message);
  }
}

// 示例3: SQL分析
async function analyzeSql() {
  console.log('\n=== SQL分析 ===');
  try {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: '/api/analyze',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const data = {
      sql: "SELECT * FROM users WHERE name LIKE '%admin%'",
      database: "mysql",
      apiKey: process.env.CUSTOM_API_KEY || "your-api-key",
      baseUrl: process.env.CUSTOM_BASE_URL || "https://api.openai.com/v1",
      model: process.env.CUSTOM_MODEL || "gpt-3.5-turbo"
    };
    
    console.log('请求数据:', JSON.stringify(data, null, 2));
    
    const response = await makeRequest(options, data);
    console.log(`状态码: ${response.statusCode}`);
    console.log('响应:', JSON.stringify(response.body, null, 2));
  } catch (error) {
    console.error('SQL分析失败:', error.message);
  }
}

// 示例4: 错误处理
async function handleError() {
  console.log('\n=== 错误处理示例 ===');
  try {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: '/api/analyze',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    // 故意发送无效数据
    const data = {
      sql: "", // 空SQL语句
      database: "invalid_db", // 无效数据库类型
    };
    
    console.log('请求数据:', JSON.stringify(data, null, 2));
    
    const response = await makeRequest(options, data);
    console.log(`状态码: ${response.statusCode}`);
    console.log('响应:', JSON.stringify(response.body, null, 2));
  } catch (error) {
    console.error('错误处理示例失败:', error.message);
  }
}

// 主函数
async function main() {
  console.log('SQL分析器API使用示例');
  console.log(`API服务器地址: http://${API_HOST}:${API_PORT}`);
  
  // 检查API服务器是否运行
  try {
    await healthCheck();
    await getApiDocs();
    await analyzeSql();
    await handleError();
  } catch (error) {
    console.error('示例运行失败:', error.message);
    console.log('\n请确保API服务器正在运行:');
    console.log('sql-analyzer api');
  }
}

// 运行示例
if (require.main === module) {
  main();
}

module.exports = {
  healthCheck,
  getApiDocs,
  analyzeSql,
  handleError
};