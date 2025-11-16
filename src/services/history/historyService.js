/**
 * 历史记录服务
 * 负责管理SQL分析历史记录的存储和检索
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// 获取当前文件的目录路径（Bun项目中的优雅方式）
// 在Bun中，我们可以直接使用import.meta.path来获取当前文件路径
const __filename = import.meta.path;
const __dirname = path.dirname(__filename);

class HistoryService {
  constructor() {
    // 使用项目根目录的绝对路径，确保历史记录始终保存在项目目录的history文件夹中
    this.baseHistoryDir = path.resolve(__dirname, '../../../history');
    this.ensureHistoryDir();
  }

  /**
   * 确保历史记录目录存在
   */
  ensureHistoryDir() {
    if (!fs.existsSync(this.baseHistoryDir)) {
      fs.mkdirSync(this.baseHistoryDir, { recursive: true });
    }
  }

  /**
   * 获取当前月份的历史记录目录
   * 格式: history/YYYY-MM/
   * @param {Date} [date] - 日期对象，默认为当前日期
   * @returns {string} 月份目录路径
   */
  getMonthDir(date = new Date()) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const monthDir = path.join(this.baseHistoryDir, `${year}-${month}`);
    
    // 确保月份目录存在
    if (!fs.existsSync(monthDir)) {
      fs.mkdirSync(monthDir, { recursive: true });
    }
    
    return monthDir;
  }

  /**
   * 生成历史记录文件名
   * 格式: YYYYMMDDHHMM-随机值.json
   * @returns {string} 文件名
   */
  generateFileName() {
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
                  (now.getMonth() + 1).toString().padStart(2, '0') +
                  now.getDate().toString().padStart(2, '0') +
                  now.getHours().toString().padStart(2, '0') +
                  now.getMinutes().toString().padStart(2, '0');
    
    // 生成4位随机十六进制值
    const randomStr = crypto.randomBytes(2).toString('hex');
    
    return `${dateStr}-${randomStr}.json`;
  }

  /**
   * 保存分析结果到历史记录
   * @param {Object} analysisData - 分析数据
   * @param {string} analysisData.sql - SQL语句
   * @param {Object} analysisData.result - 分析结果
   * @param {string} [analysisData.type='single'] - 分析类型 (single, file, batch, followup)
   * @param {string} [analysisData.parentId] - 父记录ID (用于追问)
   * @returns {string} 历史记录ID
   */
  saveAnalysis(analysisData) {
    const fileName = this.generateFileName();
    const monthDir = this.getMonthDir();
    const filePath = path.join(monthDir, fileName);
    const recordId = path.basename(fileName, '.json');
    
    // 从分析结果中提取数据库类型（由agent自动分析得出）
    let databaseType = null;
    const result = analysisData.result;
    
    // 优先从data.databaseType提取（coordinator返回的标准位置）
    if (result && result.data && result.data.databaseType) {
      databaseType = result.data.databaseType;
    }
    // 其次从子代理分析结果中提取
    else if (result && result.subagentsData && result.subagentsData.data && result.subagentsData.data.databaseType) {
      databaseType = result.subagentsData.data.databaseType;
    }
    // 再次从传统分析结果中提取
    else if (result && result.databaseType) {
      databaseType = result.databaseType;
    }
    // 最后从结果的其他可能位置提取
    else if (result && result.metadata && result.metadata.databaseType) {
      databaseType = result.metadata.databaseType;
    }
    
    // 创建历史记录对象
    const historyRecord = {
      id: recordId,
      timestamp: new Date().toISOString(),
      sql: analysisData.sql,
      type: analysisData.type || 'single',
      result: analysisData.result,
      parentId: analysisData.parentId || null,
      databaseType: databaseType // 使用agent分析得出的数据库类型
    };
    
    // 写入文件
    fs.writeFileSync(filePath, JSON.stringify(historyRecord, null, 2), 'utf8');
    
    return recordId;
  }

  /**
   * 获取所有历史记录
   * @returns {Array} 历史记录列表
   */
  getAllHistory() {
    try {
      const allRecords = [];
      
      // 遍历所有月份目录
      if (fs.existsSync(this.baseHistoryDir)) {
        const monthDirs = fs.readdirSync(this.baseHistoryDir)
          .filter(dir => {
            const fullPath = path.join(this.baseHistoryDir, dir);
            return fs.statSync(fullPath).isDirectory() && /^\d{4}-\d{2}$/.test(dir);
          })
          .sort((a, b) => b.localeCompare(a)); // 按月份倒序
        
        // 收集所有月份的历史记录文件
        monthDirs.forEach(monthDir => {
          const monthPath = path.join(this.baseHistoryDir, monthDir);
          const files = fs.readdirSync(monthPath)
            .filter(file => file.endsWith('.json'));
          
          files.forEach(file => {
            allRecords.push({
              file,
              monthDir,
              fullPath: path.join(monthPath, file)
            });
          });
        });
      }
      
      // 按文件名排序（日期倒序）
      allRecords.sort((a, b) => b.file.localeCompare(a.file));
      
      return allRecords.map(({ fullPath }) => {
        const content = fs.readFileSync(fullPath, 'utf8');
        const record = JSON.parse(content);
        
        // 返回简化的记录信息，用于列表显示
        return {
          id: record.id,
          timestamp: record.timestamp,
          date: new Date(record.timestamp).toLocaleDateString('zh-CN'),
          time: new Date(record.timestamp).toLocaleTimeString('zh-CN'),
          type: record.type,
          sqlPreview: record.sql ? record.sql.substring(0, 50) + (record.sql.length > 50 ? '...' : '') : '',
          parentId: record.parentId,
          databaseType: record.databaseType // 添加agent分析得出的数据库类型
        };
      });
    } catch (error) {
      console.error('获取历史记录失败:', error);
      return [];
    }
  }

  /**
   * 根据ID获取历史记录详情
   * @param {string} id - 历史记录ID
   * @returns {Object|null} 历史记录详情
   */
  getHistoryById(id) {
    try {
      // 从ID中提取日期信息 (格式: YYYYMMDDHHMM-xxxx)
      const dateStr = id.substring(0, 8); // YYYYMMDD
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const monthDir = path.join(this.baseHistoryDir, `${year}-${month}`);
      
      const filePath = path.join(monthDir, `${id}.json`);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('获取历史记录详情失败:', error);
      return null;
    }
  }

  /**
   * 删除历史记录
   * @param {string} id - 历史记录ID
   * @returns {boolean} 是否删除成功
   */
  deleteHistory(id) {
    try {
      // 从ID中提取日期信息
      const dateStr = id.substring(0, 8);
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const monthDir = path.join(this.baseHistoryDir, `${year}-${month}`);
      
      const filePath = path.join(monthDir, `${id}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('删除历史记录失败:', error);
      return false;
    }
  }

  /**
   * 清空所有历史记录
   * @returns {boolean} 是否清空成功
   */
  clearAllHistory() {
    try {
      // 遍历所有月份目录
      if (fs.existsSync(this.baseHistoryDir)) {
        const monthDirs = fs.readdirSync(this.baseHistoryDir)
          .filter(dir => {
            const fullPath = path.join(this.baseHistoryDir, dir);
            return fs.statSync(fullPath).isDirectory() && /^\d{4}-\d{2}$/.test(dir);
          });
        
        monthDirs.forEach(monthDir => {
          const monthPath = path.join(this.baseHistoryDir, monthDir);
          const files = fs.readdirSync(monthPath)
            .filter(file => file.endsWith('.json'));
          
          files.forEach(file => {
            fs.unlinkSync(path.join(monthPath, file));
          });
          
          // 删除空的月份目录
          if (fs.readdirSync(monthPath).length === 0) {
            fs.rmdirSync(monthPath);
          }
        });
      }
      
      return true;
    } catch (error) {
      console.error('清空历史记录失败:', error);
      return false;
    }
  }

  /**
   * 获取历史记录统计信息
   * @returns {Object} 统计信息
   */
  getHistoryStats() {
    try {
      const files = this.getAllHistoryFiles();
      
      const stats = {
        total: files.length,
        byType: {},
        byDatabase: {}
      };
      
      files.forEach(filePath => {
        const content = fs.readFileSync(filePath, 'utf8');
        const record = JSON.parse(content);
        
        // 按类型统计
        stats.byType[record.type] = (stats.byType[record.type] || 0) + 1;
        
        // 按数据库类型统计（仅统计有databaseType的记录）
        if (record.databaseType) {
          stats.byDatabase[record.databaseType] = (stats.byDatabase[record.databaseType] || 0) + 1;
        }
      });
      
      return stats;
    } catch (error) {
      console.error('获取历史记录统计失败:', error);
      return { total: 0, byType: {}, byDatabase: {} };
    }
  }

  /**
   * 获取所有历史记录文件（内部辅助方法）
   * @returns {Array} 文件路径列表
   */
  getAllHistoryFiles() {
    const allFiles = [];
    
    if (fs.existsSync(this.baseHistoryDir)) {
      const monthDirs = fs.readdirSync(this.baseHistoryDir)
        .filter(dir => {
          const fullPath = path.join(this.baseHistoryDir, dir);
          return fs.statSync(fullPath).isDirectory() && /^\d{4}-\d{2}$/.test(dir);
        });
      
      monthDirs.forEach(monthDir => {
        const monthPath = path.join(this.baseHistoryDir, monthDir);
        const files = fs.readdirSync(monthPath)
          .filter(file => file.endsWith('.json'))
          .map(file => path.join(monthPath, file));
        
        allFiles.push(...files);
      });
    }
    
    return allFiles;
  }

  /**
   * 搜索历史记录
   * @param {Object} criteria - 搜索条件
   * @param {string} [criteria.keyword] - SQL关键词
   * @param {string} [criteria.databaseType] - 数据库类型
   * @param {string} [criteria.type] - 分析类型
   * @param {string} [criteria.fromDate] - 开始日期 (YYYY-MM-DD)
   * @param {string} [criteria.toDate] - 结束日期 (YYYY-MM-DD)
   * @returns {Array} 符合条件的历史记录列表
   */
  searchHistory(criteria = {}) {
    try {
      const allHistory = this.getAllHistory();
      
      // 如果没有任何搜索条件，返回所有记录
      if (!criteria.keyword && !criteria.databaseType && !criteria.type && !criteria.fromDate && !criteria.toDate) {
        return allHistory;
      }
      
      return allHistory.filter(record => {
        // 获取完整记录以访问SQL内容
        const fullRecord = this.getHistoryById(record.id);
        if (!fullRecord) return false;
        
        // 关键词搜索（不区分大小写）
        if (criteria.keyword) {
          const keyword = criteria.keyword.toLowerCase();
          const sql = (fullRecord.sql || '').toLowerCase();
          if (!sql.includes(keyword)) {
            return false;
          }
        }
        
        // 数据库类型筛选
        if (criteria.databaseType) {
          if (record.databaseType !== criteria.databaseType) {
            return false;
          }
        }
        
        // 分析类型筛选
        if (criteria.type) {
          if (record.type !== criteria.type) {
            return false;
          }
        }
        
        // 日期范围筛选
        if (criteria.fromDate || criteria.toDate) {
          const recordDate = new Date(record.timestamp);
          
          if (criteria.fromDate) {
            const fromDate = new Date(criteria.fromDate);
            if (recordDate < fromDate) {
              return false;
            }
          }
          
          if (criteria.toDate) {
            const toDate = new Date(criteria.toDate);
            toDate.setHours(23, 59, 59, 999); // 包含当天结束时间
            if (recordDate > toDate) {
              return false;
            }
          }
        }
        
        return true;
      });
    } catch (error) {
      console.error('搜索历史记录失败:', error);
      return [];
    }
  }
}

export default HistoryService;