const express = require('express');
const router = express.Router();
const configService = require('../services/configService');
const logService = require('../services/logService');

// ==================== 敏感度配置 ====================

/**
 * 获取敏感度配置
 * GET /api/config/sensitivity
 */
router.get('/sensitivity', (req, res) => {
  try {
    const config = configService.getSensitivity();
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 更新敏感度配置
 * POST /api/config/sensitivity
 * Body: { levels: { high: {...}, medium: {...}, low: {...} } }
 */
router.post('/sensitivity', (req, res) => {
  try {
    const { levels } = req.body;
    const username = req.user?.username || 'unknown';
    
    if (!levels) {
      return res.status(400).json({ success: false, message: '缺少 levels 参数' });
    }
    
    const updated = configService.updateSensitivity(levels);
    
    // 记录操作日志
    logService.logInfo(username, '更新敏感度配置', `更新为: ${JSON.stringify(levels)}`);
    
    res.json({ success: true, data: updated, message: '敏感度配置已更新' });
  } catch (error) {
    // 记录异常日志
    logService.logError(req.user?.username || 'unknown', '更新敏感度配置失败', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 关键词配置 ====================

/**
 * 获取关键词配置
 * GET /api/config/keywords
 */
router.get('/keywords', (req, res) => {
  try {
    const config = configService.getKeywords();
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 更新整个关键词配置
 * POST /api/config/keywords
 * Body: { categories: {...} }
 */
router.post('/keywords', (req, res) => {
  try {
    const { categories } = req.body;
    
    if (!categories) {
      return res.status(400).json({ success: false, message: '缺少 categories 参数' });
    }
    
    const updated = configService.updateKeywords(categories);
    res.json({ success: true, data: updated, message: '关键词配置已更新' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 添加单个关键词
 * POST /api/config/keywords/add
 * Body: { category: "personal_info", keyword: "护照号" }
 */
router.post('/keywords/add', (req, res) => {
  try {
    const { category, keyword } = req.body;
    const username = req.user?.username || 'unknown';
    
    if (!category || !keyword) {
      return res.status(400).json({ success: false, message: '缺少 category 或 keyword 参数' });
    }
    
    const updated = configService.addKeyword(category, keyword);
    
    // 记录操作日志
    logService.logInfo(username, '添加关键词', `分类: ${category}, 关键词: ${keyword}`);
    
    res.json({ success: true, data: updated, message: `已添加关键词: ${keyword}` });
  } catch (error) {
    // 记录异常日志
    logService.logError(req.user?.username || 'unknown', '添加关键词失败', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 删除单个关键词
 * POST /api/config/keywords/remove
 * Body: { category: "personal_info", keyword: "护照号" }
 */
router.post('/keywords/remove', (req, res) => {
  try {
    const { category, keyword } = req.body;
    const username = req.user?.username || 'unknown';
    
    if (!category || !keyword) {
      return res.status(400).json({ success: false, message: '缺少 category 或 keyword 参数' });
    }
    
    const updated = configService.removeKeyword(category, keyword);
    
    // 记录操作日志
    logService.logInfo(username, '删除关键词', `分类: ${category}, 关键词: ${keyword}`);
    
    res.json({ success: true, data: updated, message: `已删除关键词: ${keyword}` });
  } catch (error) {
    // 记录异常日志
    logService.logError(req.user?.username || 'unknown', '删除关键词失败', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 添加新分类
 * POST /api/config/keywords/category
 * Body: { categoryId: "medical", categoryName: "医疗信息" }
 */
router.post('/keywords/category', (req, res) => {
  try {
    const { categoryId, categoryName } = req.body;
    const username = req.user?.username || 'unknown';
    
    if (!categoryId || !categoryName) {
      return res.status(400).json({ success: false, message: '缺少 categoryId 或 categoryName 参数' });
    }
    
    const updated = configService.addCategory(categoryId, categoryName);
    
    // 记录操作日志
    logService.logInfo(username, '添加关键词分类', `ID: ${categoryId}, 名称: ${categoryName}`);
    
    res.json({ success: true, data: updated, message: `已添加分类: ${categoryName}` });
  } catch (error) {
    // 记录异常日志
    logService.logError(req.user?.username || 'unknown', '添加分类失败', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
