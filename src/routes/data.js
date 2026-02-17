const express = require('express');
const router = express.Router();
const dataService = require('../services/dataService');
const logService = require('../services/logService');

/**
 * 上报单条检测数据
 * POST /api/data/upload
 * Body: {
 *   device_id: "PC-001",
 *   risk_level: "high",
 *   risk_content: "检测到身份证号",
 *   hit_keywords: ["身份证"],
 *   engine_type: "keyword",
 *   timestamp: "2025-02-13T10:30:00Z"
 * }
 */
router.post('/upload', (req, res) => {
  try {
    const { device_id, risk_level, risk_content, hit_keywords, engine_type, timestamp } = req.body;
    
    // 参数校验
    if (!device_id || !risk_level) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数: device_id, risk_level'
      });
    }
    
    // 校验 risk_level
    if (!['high', 'medium', 'low'].includes(risk_level)) {
      return res.status(400).json({
        success: false,
        message: 'risk_level 必须是 high/medium/low 之一'
      });
    }
    
    const record = dataService.addRecord({
      device_id,
      risk_level,
      risk_content,
      hit_keywords,
      engine_type,
      timestamp
    });
    
    res.json({
      success: true,
      data: record,
      message: '数据上报成功'
    });
  } catch (error) {
    logService.logError('system', '数据上报失败', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 批量上报检测数据
 * POST /api/data/upload/batch
 * Body: {
 *   records: [
 *     { device_id: "PC-001", risk_level: "high", ... },
 *     { device_id: "PC-002", risk_level: "low", ... }
 *   ]
 * }
 */
router.post('/upload/batch', (req, res) => {
  try {
    const { records } = req.body;
    
    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供 records 数组'
      });
    }
    
    // 限制单次批量上报数量
    if (records.length > 1000) {
      return res.status(400).json({
        success: false,
        message: '单次最多上报 1000 条数据'
      });
    }
    
    const results = dataService.addRecords(records);
    
    res.json({
      success: true,
      data: {
        count: results.length
      },
      message: `成功上报 ${results.length} 条数据`
    });
  } catch (error) {
    logService.logError('system', '批量数据上报失败', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 获取检测数据列表（支持筛选和分页）
 * GET /api/data/list?device_id=PC-001&risk_level=high&page=1&page_size=20
 */
router.get('/list', (req, res) => {
  try {
    const { device_id, risk_level, engine_type, start_date, end_date, page, page_size } = req.query;
    
    const result = dataService.getRecords({
      device_id,
      risk_level,
      engine_type,
      start_date,
      end_date,
      page: page ? parseInt(page) : 1,
      page_size: page_size ? parseInt(page_size) : 20
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
