const express = require('express');
const router = express.Router();
const dataService = require('../services/dataService');

/**
 * 按时间段统计风险分布
 * GET /api/stats/risk-distribution?start=2025-02-01&end=2025-02-13
 * 
 * 返回示例:
 * {
 *   "data": [
 *     { "date": "2025-02-01", "high": 5, "medium": 12, "low": 30, "total": 47 },
 *     { "date": "2025-02-02", "high": 3, "medium": 8, "low": 25, "total": 36 }
 *   ]
 * }
 */
router.get('/risk-distribution', (req, res) => {
  try {
    let { start, end } = req.query;
    
    // 默认查最近 7 天
    if (!end) {
      end = new Date().toISOString().split('T')[0];
    }
    if (!start) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      start = startDate.toISOString().split('T')[0];
    }
    
    const distribution = dataService.getRiskDistribution(start, end);
    
    res.json({
      success: true,
      data: {
        start_date: start,
        end_date: end,
        distribution
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 设备违规次数排名
 * GET /api/stats/device-ranking?limit=10
 * 
 * 返回示例:
 * {
 *   "data": [
 *     { "device_id": "PC-001", "total": 50, "high": 10, "medium": 20, "low": 20 },
 *     { "device_id": "PC-002", "total": 35, "high": 5, "medium": 15, "low": 15 }
 *   ]
 * }
 */
router.get('/device-ranking', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    
    const ranking = dataService.getDeviceRanking(limit);
    
    res.json({
      success: true,
      data: {
        limit,
        ranking
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 获取概览统计
 * GET /api/stats/overview
 */
router.get('/overview', (req, res) => {
  try {
    // 获取今日数据
    const today = new Date().toISOString().split('T')[0];
    const todayStats = dataService.getRiskDistribution(today, today);
    
    // 获取总体设备排名
    const topDevices = dataService.getDeviceRanking(5);
    
    // 计算今日总数
    const todayTotal = todayStats.length > 0 ? todayStats[0] : { high: 0, medium: 0, low: 0, total: 0 };
    
    res.json({
      success: true,
      data: {
        today: {
          date: today,
          ...todayTotal
        },
        top_devices: topDevices
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
