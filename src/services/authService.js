const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG_DIR = path.join(__dirname, '../../config');
const USERS_FILE = path.join(CONFIG_DIR, 'users.json');

// 简易 token 存储（生产环境建议用 Redis）
const tokens = new Map();

/**
 * 生成随机 token
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 读取用户数据
 */
function getUsers() {
  const content = fs.readFileSync(USERS_FILE, 'utf-8');
  return JSON.parse(content).users;
}

/**
 * 登录验证
 * @param {string} username 用户名
 * @param {string} password 密码
 * @returns {object|null} 成功返回 {token, user}，失败返回 null
 */
function login(username, password) {
  const users = getUsers();
  
  // 查找用户
  const user = users.find(u => u.username === username && u.password === password);
  
  if (!user) {
    return null;
  }
  
  // 生成 token
  const token = generateToken();
  
  // 存储 token（1小时过期）
  tokens.set(token, {
    userId: user.id,
    username: user.username,
    role: user.role,
    expiresAt: Date.now() + 60 * 60 * 1000  // 1小时后过期
  });
  
  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  };
}

/**
 * 验证 token
 * @param {string} token 
 * @returns {object|null} 有效返回用户信息，无效返回 null
 */
function verifyToken(token) {
  const session = tokens.get(token);
  
  if (!session) {
    return null;
  }
  
  // 检查是否过期
  if (Date.now() > session.expiresAt) {
    tokens.delete(token);
    return null;
  }
  
  return {
    userId: session.userId,
    username: session.username,
    role: session.role
  };
}

/**
 * 登出
 */
function logout(token) {
  tokens.delete(token);
}

module.exports = {
  login,
  verifyToken,
  logout
};
