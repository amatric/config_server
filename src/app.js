const express = require('express');
const cors = require('cors');
const path = require('path');

const authMiddleware = require('./middleware/auth');
const configRoutes = require('./routes/config');
const authRoutes = require('./routes/auth');
const logsRoutes = require('./routes/logs');
const dataRoutes = require('./routes/data');
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));  // 支持较大的批量数据

// 请求日志（简单版）
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ========== 公开路由（不需要登录） ==========
app.use('/api/auth', authRoutes);
app.use('/api/config', configRoutes);  // 配置接口公开，供采集端读取
app.use('/api/data', dataRoutes);      // 数据上报接口公开，供采集端写入

// ========== 受保护路由（需要登录） ==========
app.use('/api/stats', authMiddleware, statsRoutes);  // 统计接口需要登录
app.use('/api/logs', authMiddleware, logsRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    name: '大模型安全防泄漏 - 配置管理服务',
    version: '1.0.0',
    doc: '完整文档请查看 README.md',
    endpoints: {
      '认证': {
        '登录': 'POST /api/auth/login',
        '登出': 'POST /api/auth/logout'
      },
      '配置管理（供采集端读取）': {
        '获取敏感度配置': 'GET /api/config/sensitivity',
        '获取关键词配置': 'GET /api/config/keywords'
      },
      '配置管理（需登录修改）': {
        '更新敏感度': 'POST /api/config/sensitivity',
        '更新关键词': 'POST /api/config/keywords',
        '添加关键词': 'POST /api/config/keywords/add',
        '删除关键词': 'POST /api/config/keywords/remove',
        '添加分类': 'POST /api/config/keywords/category'
      },
      '数据上报（供采集端写入）': {
        '单条上报': 'POST /api/data/upload',
        '批量上报': 'POST /api/data/upload/batch',
        '查询数据': 'GET /api/data/list'
      },
      '统计查询（需登录）': {
        '风险分布': 'GET /api/stats/risk-distribution',
        '设备排名': 'GET /api/stats/device-ranking',
        '概览统计': 'GET /api/stats/overview'
      },
      '操作日志（需登录）': {
        '获取日志': 'GET /api/logs',
        '未读数量': 'GET /api/logs/unread-count',
        '标记已读': 'POST /api/logs/mark-read'
      }
    }
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

// 启动服务
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  配置管理服务已启动`);
  console.log(`  地址: http://localhost:${PORT}`);
  console.log(`========================================\n`);
});
