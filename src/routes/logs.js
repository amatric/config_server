const express = require('express');
const router = express.Router();
const logService = require('../services/logService');

/**
 * 获取日志列表
 * GET /api/logs
 * Query: type=error&unreadOnly=true&limit=50
 */
router.get('/', (req, res) => {
  try {
    const { type, unreadOnly, limit } = req.query;
    
    const logs = logService.getLogs({
      type,
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit) : 100
    });
    
    const unreadCount = logService.getUnreadCount();
    
    res.json({
      success: true,
      data: {
        logs,
        unreadCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 获取未读数量
 * GET /api/logs/unread-count
 */
router.get('/unread-count', (req, res) => {
  try {
    const count = logService.getUnreadCount();
    res.json({ success: true, data: { count } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 标记已读
 * POST /api/logs/mark-read
 * Body: { logId: 123 }  // 不传 logId 则标记全部已读
 */
router.post('/mark-read', (req, res) => {
  try {
    const { logId } = req.body;
    
    logService.markAsRead(logId);
    
    res.json({
      success: true,
      message: logId ? '已标记为已读' : '已全部标记为已读'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
