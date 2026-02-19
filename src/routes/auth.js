const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const logService = require('../services/logService');

/**
 * 登录
 * POST /api/auth/login
 * Body: { username: "admin", password: "admin123" }
 */
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '请输入用户名和密码'
      });
    }
    
    const result = authService.login(username, password);
    
    if (!result) {
      // 记录登录失败
      logService.logError(username, '登录失败', '用户名或密码错误');
      
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }
    
    // 记录登录成功
    logService.logInfo(username, '登录成功', '管理员登录系统');
    
    res.json({
      success: true,
      data: result,
      message: '登录成功'
    });
  } catch (error) {
    logService.logError('system', '登录异常', error.message);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 登出
 * POST /api/auth/logout
 * Headers: { Authorization: "Bearer <token>" }
 */
router.post('/logout', (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;
    
    if (token) {
      authService.logout(token);
    }
    
    res.json({ success: true, message: '已登出' });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
