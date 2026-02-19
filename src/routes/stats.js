const express = require('express');
const router = express.Router();
const dataService = require('../services/dataService');

router.get('/risk-distribution', async (req, res) => {
  try {
    let { start, end } = req.query;
    
    if (!end) {
      end = new Date().toISOString().split('T')[0];
    }
    if (!start) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      start = startDate.toISOString().split('T')[0];
    }
    
    const distribution = await dataService.getRiskDistribution(start, end);
    
    res.json({
      success: true,
      data: { start_date: start, end_date: end, distribution }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/device-ranking', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const ranking = await dataService.getDeviceRanking(limit);
    
    res.json({
      success: true,
      data: { limit, ranking }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/overview', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const todayStats = await dataService.getRiskDistribution(today, today);
    const topDevices = await dataService.getDeviceRanking(5);
    
    const todayTotal = todayStats.length > 0 ? todayStats[0] : { high: 0, medium: 0, low: 0, total: 0 };
    
    res.json({
      success: true,
      data: {
        today: { date: today, ...todayTotal },
        top_devices: topDevices
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;