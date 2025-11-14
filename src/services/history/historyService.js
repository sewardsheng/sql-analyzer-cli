/**
 * 历史记录服务
 * 负责管理SQL分析历史记录的存储和检索
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

class HistoryService {
  constructor() {
    this.historyDir = path.join(process.cwd(), 'history');
    this.ensureHistoryDir();
  }

  /**
   * 确保历史记录目录存在
   */
  ensureHistoryDir() {
    if (!fs.existsSync(this.historyDir)) {
      fs.mkdirSync(this.historyDir, { recursive: true });
    }
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
    const filePath = path.join(this.historyDir, fileName);
    const recordId = path.basename(fileName, '.json');
    
    // 从分析结果中提取数据库类型（由agent自动分析得出）
    let databaseType = null;
    const result = analysisData.result;
    
    // 优先从子代理分析结果中提取
    if (result && result.subagentsData && result.subagentsData.data && result.subagentsData.data.databaseType) {
      databaseType = result.subagentsData.data.databaseType;
    }
    // 其次从传统分析结果中提取
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
      const files = fs.readdirSync(this.historyDir)
        .filter(file => file.endsWith('.json'))
        .sort((a, b) => {
          // 按文件名排序（日期倒序）
          return b.localeCompare(a);
        });
      
      return files.map(file => {
        const filePath = path.join(this.historyDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
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
      const filePath = path.join(this.historyDir, `${id}.json`);
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
      const filePath = path.join(this.historyDir, `${id}.json`);
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
      const files = fs.readdirSync(this.historyDir)
        .filter(file => file.endsWith('.json'));
      
      files.forEach(file => {
        const filePath = path.join(this.historyDir, file);
        fs.unlinkSync(filePath);
      });
      
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
      const files = fs.readdirSync(this.historyDir)
        .filter(file => file.endsWith('.json'));
      
      const stats = {
        total: files.length,
        byType: {},
        byDatabase: {} // 添加按数据库类型统计
      };
      
      files.forEach(file => {
        const filePath = path.join(this.historyDir, file);
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
}

export default HistoryService;