const authService = require('../services/authService');

/**
 * 认证中间件
 * 检查请求头中的 token，验证用户是否已登录
 */
function authMiddleware(req, res, next) {
  // 从请求头获取 token
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: '未提供认证信息，请先登录'
    });
  }
  
  // 格式: "Bearer <token>"
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : authHeader;
  
  // 验证 token
  const user = authService.verifyToken(token);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'token 无效或已过期，请重新登录'
    });
  }
  
  // 把用户信息挂到 req 上，后续接口可以用
  req.user = user;
  
  next();
}

module.exports = authMiddleware;
