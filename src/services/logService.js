const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(__dirname, '../../config');
const LOGS_FILE = path.join(CONFIG_DIR, 'logs.json');

/**
 * 日志类型
 */
const LogType = {
  INFO: 'info',       // 普通操作
  WARNING: 'warning', // 警告
  ERROR: 'error'      // 错误/异常
};

/**
 * 读取所有日志
 */
function readLogs() {
  const content = fs.readFileSync(LOGS_FILE, 'utf-8');
  return JSON.parse(content).logs;
}

/**
 * 写入日志
 */
function writeLogs(logs) {
  fs.writeFileSync(LOGS_FILE, JSON.stringify({ logs }, null, 2), 'utf-8');
}

/**
 * 添加日志
 * @param {object} options
 * @param {string} options.username - 操作用户
 * @param {string} options.action - 操作类型（如 "添加关键词"）
 * @param {string} options.detail - 操作详情
 * @param {string} options.type - 日志类型（info/warning/error）
 * @param {boolean} options.unread - 是否未读（异常日志默认未读）
 */
function addLog({ username, action, detail, type = LogType.INFO, unread = false }) {
  const logs = readLogs();
  
  const newLog = {
    id: Date.now(),  // 用时间戳作为 ID
    username,
    action,
    detail,
    type,
    unread: type === LogType.ERROR ? true : unread,  // 异常日志默认未读
    created_at: new Date().toISOString()
  };
  
  logs.unshift(newLog);  // 新日志放在最前面
  
  // 只保留最近 1000 条日志
  if (logs.length > 1000) {
    logs.pop();
  }
  
  writeLogs(logs);
  
  return newLog;
}

/**
 * 记录普通操作日志
 */
function logInfo(username, action, detail) {
  return addLog({ username, action, detail, type: LogType.INFO });
}

/**
 * 记录异常日志（自动标记未读）
 */
function logError(username, action, detail) {
  return addLog({ username, action, detail, type: LogType.ERROR, unread: true });
}

/**
 * 获取所有日志（支持筛选）
 * @param {object} options
 * @param {string} options.type - 按类型筛选
 * @param {boolean} options.unreadOnly - 只看未读
 * @param {number} options.limit - 返回条数
 */
function getLogs({ type, unreadOnly, limit = 100 } = {}) {
  let logs = readLogs();
  
  // 按类型筛选
  if (type) {
    logs = logs.filter(log => log.type === type);
  }
  
  // 只看未读
  if (unreadOnly) {
    logs = logs.filter(log => log.unread === true);
  }
  
  // 限制条数
  return logs.slice(0, limit);
}

/**
 * 获取未读日志数量
 */
function getUnreadCount() {
  const logs = readLogs();
  return logs.filter(log => log.unread === true).length;
}

/**
 * 标记日志为已读
 * @param {number} logId - 日志 ID，不传则标记全部已读
 */
function markAsRead(logId) {
  const logs = readLogs();
  
  if (logId) {
    // 标记单条
    const log = logs.find(l => l.id === logId);
    if (log) {
      log.unread = false;
    }
  } else {
    // 标记全部已读
    logs.forEach(log => {
      log.unread = false;
    });
  }
  
  writeLogs(logs);
}

module.exports = {
  LogType,
  logInfo,
  logError,
  getLogs,
  getUnreadCount,
  markAsRead
};
