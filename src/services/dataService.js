const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(__dirname, '../../config');
const DATA_FILE = path.join(CONFIG_DIR, 'detection_data.json');

// 数据缓冲区（用于批量写入）
let dataBuffer = [];
let lastFlushTime = Date.now();

// 配置
const BUFFER_SIZE = 100;        // 缓冲区满 100 条就写入
const FLUSH_INTERVAL = 10000;   // 或者每 10 秒写入一次

/**
 * 初始化数据文件
 */
function initDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ records: [] }, null, 2));
  }
}

/**
 * 读取所有检测数据
 */
function readData() {
  initDataFile();
  const content = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(content).records;
}

/**
 * 写入数据到文件
 */
function writeData(records) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ records }, null, 2));
}

/**
 * 刷新缓冲区，将数据写入文件
 */
function flushBuffer() {
  if (dataBuffer.length === 0) return;
  
  const records = readData();
  records.push(...dataBuffer);
  
  // 只保留最近 10000 条（防止文件过大，生产环境用 ClickHouse）
  const trimmed = records.slice(-10000);
  writeData(trimmed);
  
  console.log(`[数据服务] 已写入 ${dataBuffer.length} 条数据`);
  dataBuffer = [];
  lastFlushTime = Date.now();
}

/**
 * 接收单条检测数据
 */
function addRecord(record) {
  const newRecord = {
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    device_id: record.device_id,
    risk_level: record.risk_level,        // high / medium / low
    risk_content: record.risk_content,    // 风险内容摘要
    hit_keywords: record.hit_keywords || [],  // 命中的关键词
    engine_type: record.engine_type || 'unknown',  // 引擎类型
    created_at: record.timestamp || new Date().toISOString()
  };
  
  dataBuffer.push(newRecord);
  
  // 检查是否需要刷新
  if (dataBuffer.length >= BUFFER_SIZE || Date.now() - lastFlushTime > FLUSH_INTERVAL) {
    flushBuffer();
  }
  
  return newRecord;
}

/**
 * 批量接收检测数据
 */
function addRecords(records) {
  const results = records.map(r => addRecord(r));
  flushBuffer(); // 批量写入后立即刷新
  return results;
}

/**
 * 按时间段统计风险分布
 * @param {string} startDate - 开始日期 YYYY-MM-DD
 * @param {string} endDate - 结束日期 YYYY-MM-DD
 */
function getRiskDistribution(startDate, endDate) {
  const records = readData();
  
  // 筛选时间范围
  const filtered = records.filter(r => {
    const date = r.created_at.split('T')[0];
    return date >= startDate && date <= endDate;
  });
  
  // 按日期和风险等级分组统计
  const distribution = {};
  
  filtered.forEach(r => {
    const date = r.created_at.split('T')[0];
    const level = r.risk_level;
    
    if (!distribution[date]) {
      distribution[date] = { high: 0, medium: 0, low: 0, total: 0 };
    }
    
    distribution[date][level] = (distribution[date][level] || 0) + 1;
    distribution[date].total += 1;
  });
  
  // 转换为数组格式，方便前端图表使用
  const result = Object.entries(distribution)
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  return result;
}

/**
 * 设备违规次数排名
 * @param {number} limit - 返回前 N 名
 */
function getDeviceRanking(limit = 10) {
  const records = readData();
  
  // 按设备统计
  const deviceCounts = {};
  
  records.forEach(r => {
    const deviceId = r.device_id;
    if (!deviceCounts[deviceId]) {
      deviceCounts[deviceId] = { 
        device_id: deviceId, 
        total: 0, 
        high: 0, 
        medium: 0, 
        low: 0,
        last_violation: null
      };
    }
    
    deviceCounts[deviceId].total += 1;
    deviceCounts[deviceId][r.risk_level] += 1;
    
    // 记录最后一次违规时间
    if (!deviceCounts[deviceId].last_violation || 
        r.created_at > deviceCounts[deviceId].last_violation) {
      deviceCounts[deviceId].last_violation = r.created_at;
    }
  });
  
  // 排序并返回 Top N
  const ranking = Object.values(deviceCounts)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
  
  return ranking;
}

/**
 * 获取数据列表（支持筛选）
 */
function getRecords({ device_id, risk_level, engine_type, start_date, end_date, page = 1, page_size = 20 }) {
  let records = readData();
  
  // 筛选条件
  if (device_id) {
    records = records.filter(r => r.device_id.includes(device_id));
  }
  if (risk_level) {
    records = records.filter(r => r.risk_level === risk_level);
  }
  if (engine_type) {
    records = records.filter(r => r.engine_type === engine_type);
  }
  if (start_date) {
    records = records.filter(r => r.created_at.split('T')[0] >= start_date);
  }
  if (end_date) {
    records = records.filter(r => r.created_at.split('T')[0] <= end_date);
  }
  
  // 按时间倒序
  records.sort((a, b) => b.created_at.localeCompare(a.created_at));
  
  // 分页
  const total = records.length;
  const start = (page - 1) * page_size;
  const paged = records.slice(start, start + page_size);
  
  return {
    records: paged,
    pagination: {
      page,
      page_size,
      total,
      total_pages: Math.ceil(total / page_size)
    }
  };
}

// 定时刷新缓冲区
setInterval(flushBuffer, FLUSH_INTERVAL);

// 进程退出时刷新
process.on('beforeExit', flushBuffer);

module.exports = {
  addRecord,
  addRecords,
  getRiskDistribution,
  getDeviceRanking,
  getRecords,
  flushBuffer
};
