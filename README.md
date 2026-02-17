# 大模型安全防泄漏 - 配置管理服务

管理与配置终端后端服务，提供配置管理、数据接收、统计查询等功能。

## 快速开始

```bash
# 安装依赖
npm install

# 启动服务
npm start

# 开发模式（自动重启）
npm run dev
```

服务默认运行在 `http://localhost:3000`

---

## 系统架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   数据采集端     │────▶│   本服务（你）   │◀────│   前端管理门户   │
│                 │     │                 │     │                 │
│ - 读取配置      │     │ - 配置管理      │     │ - 修改配置      │
│ - 上报检测数据  │     │ - 数据存储      │     │ - 查看统计      │
└─────────────────┘     │ - 统计查询      │     │ - 查看日志      │
                        └─────────────────┘     └─────────────────┘
```

---

## 接口权限说明

| 类型 | 说明 |
|------|------|
| 🔓 公开 | 无需登录，采集端可直接调用 |
| 🔐 需登录 | 需要在 Header 中携带 Token |

Token 获取方式：调用登录接口后返回

Header 格式：`Authorization: Bearer <token>`

---

## 接口列表

### 一、认证接口

#### 🔓 POST /api/auth/login - 登录

**请求：**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "token": "a1b2c3d4e5f6g7h8...",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin"
    }
  },
  "message": "登录成功"
}
```

#### 🔓 POST /api/auth/logout - 登出

**Header：** `Authorization: Bearer <token>`

**响应：**
```json
{
  "success": true,
  "message": "已登出"
}
```

---

### 二、配置管理接口

#### 🔓 GET /api/config/sensitivity - 获取敏感度配置

**说明：** 采集端启动时调用，获取敏感度阈值配置

**响应：**
```json
{
  "success": true,
  "data": {
    "version": 1,
    "updated_at": "2025-02-13T10:00:00Z",
    "levels": {
      "high": {
        "threshold": 0.9,
        "action": "block",
        "description": "高风险 - 直接拦截"
      },
      "medium": {
        "threshold": 0.6,
        "action": "warn",
        "description": "中风险 - 警告用户"
      },
      "low": {
        "threshold": 0.3,
        "action": "log",
        "description": "低风险 - 仅记录"
      }
    }
  }
}
```

#### 🔐 POST /api/config/sensitivity - 更新敏感度配置

**请求：**
```json
{
  "levels": {
    "high": { "threshold": 0.95, "action": "block" },
    "medium": { "threshold": 0.7, "action": "warn" },
    "low": { "threshold": 0.4, "action": "log" }
  }
}
```

#### 🔓 GET /api/config/keywords - 获取关键词配置

**说明：** 采集端调用，获取敏感词库

**响应：**
```json
{
  "success": true,
  "data": {
    "version": 3,
    "updated_at": "2025-02-13T10:00:00Z",
    "categories": {
      "personal_info": {
        "name": "个人信息",
        "keywords": ["身份证", "手机号", "银行卡", "家庭住址"]
      },
      "credentials": {
        "name": "凭证信息",
        "keywords": ["密码", "password", "token", "api_key"]
      },
      "business": {
        "name": "商业机密",
        "keywords": ["机密", "内部资料", "薪资", "客户名单"]
      }
    }
  }
}
```

#### 🔐 POST /api/config/keywords/add - 添加关键词

**请求：**
```json
{
  "category": "personal_info",
  "keyword": "护照号"
}
```

#### 🔐 POST /api/config/keywords/remove - 删除关键词

**请求：**
```json
{
  "category": "personal_info",
  "keyword": "护照号"
}
```

#### 🔐 POST /api/config/keywords/category - 添加新分类

**请求：**
```json
{
  "categoryId": "medical",
  "categoryName": "医疗信息"
}
```

---

### 三、数据上报接口（供采集端使用）

#### 🔓 POST /api/data/upload - 单条数据上报

**说明：** 采集端检测到风险后，调用此接口上报

**请求：**
```json
{
  "device_id": "PC-001",
  "risk_level": "high",
  "risk_content": "检测到身份证号: 310***1234",
  "hit_keywords": ["身份证"],
  "engine_type": "keyword",
  "timestamp": "2025-02-13T10:30:00Z"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| device_id | string | ✅ | 设备唯一标识 |
| risk_level | string | ✅ | 风险等级：high/medium/low |
| risk_content | string | ❌ | 风险内容摘要（脱敏后） |
| hit_keywords | array | ❌ | 命中的关键词列表 |
| engine_type | string | ❌ | 检测引擎类型 |
| timestamp | string | ❌ | ISO 时间，不传则使用服务器时间 |

**响应：**
```json
{
  "success": true,
  "data": {
    "id": "1707820200000abc123",
    "device_id": "PC-001",
    "risk_level": "high",
    "created_at": "2025-02-13T10:30:00Z"
  },
  "message": "数据上报成功"
}
```

#### 🔓 POST /api/data/upload/batch - 批量数据上报

**说明：** 批量上报，单次最多 1000 条

**请求：**
```json
{
  "records": [
    {
      "device_id": "PC-001",
      "risk_level": "high",
      "risk_content": "检测到身份证号",
      "hit_keywords": ["身份证"],
      "engine_type": "keyword"
    },
    {
      "device_id": "PC-002",
      "risk_level": "low",
      "risk_content": "检测到邮箱地址",
      "hit_keywords": ["邮箱"],
      "engine_type": "regex"
    }
  ]
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "count": 2
  },
  "message": "成功上报 2 条数据"
}
```

#### 🔓 GET /api/data/list - 查询检测数据

**Query 参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| device_id | string | 按设备筛选（模糊匹配） |
| risk_level | string | 按风险等级筛选 |
| engine_type | string | 按引擎类型筛选 |
| start_date | string | 开始日期 YYYY-MM-DD |
| end_date | string | 结束日期 YYYY-MM-DD |
| page | number | 页码，默认 1 |
| page_size | number | 每页条数，默认 20 |

**示例：**
```
GET /api/data/list?device_id=PC-001&risk_level=high&page=1&page_size=20
```

**响应：**
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "1707820200000abc123",
        "device_id": "PC-001",
        "risk_level": "high",
        "risk_content": "检测到身份证号",
        "hit_keywords": ["身份证"],
        "engine_type": "keyword",
        "created_at": "2025-02-13T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 156,
      "total_pages": 8
    }
  }
}
```

---

### 四、统计查询接口（供前端使用）

#### 🔐 GET /api/stats/risk-distribution - 风险分布统计

**说明：** 按时间段统计每日风险数量，用于图表展示

**Query 参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| start | string | 开始日期 YYYY-MM-DD，默认 7 天前 |
| end | string | 结束日期 YYYY-MM-DD，默认今天 |

**示例：**
```
GET /api/stats/risk-distribution?start=2025-02-01&end=2025-02-13
```

**响应：**
```json
{
  "success": true,
  "data": {
    "start_date": "2025-02-01",
    "end_date": "2025-02-13",
    "distribution": [
      { "date": "2025-02-01", "high": 5, "medium": 12, "low": 30, "total": 47 },
      { "date": "2025-02-02", "high": 3, "medium": 8, "low": 25, "total": 36 },
      { "date": "2025-02-03", "high": 7, "medium": 15, "low": 28, "total": 50 }
    ]
  }
}
```

#### 🔐 GET /api/stats/device-ranking - 设备违规排名

**说明：** 获取违规次数最多的设备排名

**Query 参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| limit | number | 返回前 N 名，默认 10 |

**示例：**
```
GET /api/stats/device-ranking?limit=10
```

**响应：**
```json
{
  "success": true,
  "data": {
    "limit": 10,
    "ranking": [
      {
        "device_id": "PC-001",
        "total": 50,
        "high": 10,
        "medium": 20,
        "low": 20,
        "last_violation": "2025-02-13T15:30:00Z"
      },
      {
        "device_id": "PC-002",
        "total": 35,
        "high": 5,
        "medium": 15,
        "low": 15,
        "last_violation": "2025-02-13T14:20:00Z"
      }
    ]
  }
}
```

#### 🔐 GET /api/stats/overview - 概览统计

**说明：** 获取今日统计和 Top 设备，用于首页展示

**响应：**
```json
{
  "success": true,
  "data": {
    "today": {
      "date": "2025-02-13",
      "high": 8,
      "medium": 23,
      "low": 45,
      "total": 76
    },
    "top_devices": [
      { "device_id": "PC-001", "total": 15 },
      { "device_id": "PC-002", "total": 12 }
    ]
  }
}
```

---

### 五、操作日志接口

#### 🔐 GET /api/logs - 获取操作日志

**Query 参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| type | string | 筛选类型：info/warning/error |
| unreadOnly | boolean | 只看未读：true/false |
| limit | number | 返回条数，默认 100 |

**示例：**
```
GET /api/logs?type=error&unreadOnly=true&limit=50
```

**响应：**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1707820200000,
        "username": "admin",
        "action": "添加关键词",
        "detail": "分类: personal_info, 关键词: 护照号",
        "type": "info",
        "unread": false,
        "created_at": "2025-02-13T10:00:00Z"
      },
      {
        "id": 1707820100000,
        "username": "admin",
        "action": "数据上报失败",
        "detail": "数据库连接超时",
        "type": "error",
        "unread": true,
        "created_at": "2025-02-13T09:50:00Z"
      }
    ],
    "unreadCount": 3
  }
}
```

#### 🔐 GET /api/logs/unread-count - 获取未读数量

**响应：**
```json
{
  "success": true,
  "data": {
    "count": 3
  }
}
```

#### 🔐 POST /api/logs/mark-read - 标记已读

**请求（标记单条）：**
```json
{
  "logId": 1707820100000
}
```

**请求（标记全部）：**
```json
{}
```

---

## 采集端对接指南

### 1. 启动时获取配置

```javascript
// 获取敏感度配置
const sensitivityRes = await fetch('http://localhost:3000/api/config/sensitivity');
const sensitivity = await sensitivityRes.json();

// 获取关键词配置
const keywordsRes = await fetch('http://localhost:3000/api/config/keywords');
const keywords = await keywordsRes.json();
```

### 2. 监听配置文件变化

配置文件位于 `config/` 目录下，可使用文件监听实现配置热更新：

```javascript
const fs = require('fs');

fs.watch('./config/keywords.json', (eventType) => {
  if (eventType === 'change') {
    console.log('关键词配置已更新，重新加载...');
    // 重新读取配置
  }
});
```

### 3. 上报检测数据

```javascript
// 单条上报
await fetch('http://localhost:3000/api/data/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    device_id: 'PC-001',
    risk_level: 'high',
    risk_content: '检测到身份证号',
    hit_keywords: ['身份证'],
    engine_type: 'keyword'
  })
});

// 批量上报（建议积攒 10s 或 100 条后批量上报）
await fetch('http://localhost:3000/api/data/upload/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    records: [...]
  })
});
```

---

## 前端对接指南

### 1. 登录获取 Token

```javascript
const res = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
});
const { data } = await res.json();
const token = data.token;

// 保存 token 到 localStorage
localStorage.setItem('token', token);
```

### 2. 携带 Token 请求

```javascript
const token = localStorage.getItem('token');

const res = await fetch('http://localhost:3000/api/stats/overview', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### 3. 数据展示建议

| 接口 | 展示形式 |
|------|----------|
| /api/stats/risk-distribution | 折线图/柱状图 |
| /api/stats/device-ranking | 排行榜表格 |
| /api/stats/overview | 数据卡片 |
| /api/data/list | 数据表格（带筛选） |
| /api/logs | 日志列表（异常标红） |

---

## 文件结构

```
config-server/
├── config/                      # 配置文件目录
│   ├── sensitivity.json         # 敏感度配置
│   ├── keywords.json            # 关键词库
│   ├── users.json               # 用户账号
│   ├── logs.json                # 操作日志
│   └── detection_data.json      # 检测数据
├── src/
│   ├── app.js                   # 应用入口
│   ├── middleware/
│   │   └── auth.js              # 认证中间件
│   ├── routes/
│   │   ├── auth.js              # 认证接口
│   │   ├── config.js            # 配置接口
│   │   ├── data.js              # 数据上报接口
│   │   ├── stats.js             # 统计查询接口
│   │   └── logs.js              # 日志接口
│   └── services/
│       ├── authService.js       # 认证服务
│       ├── configService.js     # 配置服务
│       ├── dataService.js       # 数据服务
│       └── logService.js        # 日志服务
├── package.json
└── README.md                    # 本文档
```

---

## 默认账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |

---

## 注意事项

1. **数据存储**：当前使用 JSON 文件存储，稍后改用 ClickHouse
2. **Token 有效期**：1 小时，过期需重新登录
3. **批量上报限制**：单次最多 1000 条
4. **日志保留**：最多保留 1000 条操作日志
