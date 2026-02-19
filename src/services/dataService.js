const { createClient } = require('@clickhouse/client');

// ClickHouse 连接配置
const client = createClient({
  host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'admin',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: 'security_db'
});

// 数据缓冲区（用于批量写入）
let dataBuffer = [];
let lastFlushTime = Date.now();

// 配置
const BUFFER_SIZE = 100;
const FLUSH_INTERVAL = 10000;

async function initDatabase() {
  try {
    await client.query({
      query: `CREATE DATABASE IF NOT EXISTS security_db`
    });

    await client.query({
      query: `
        CREATE TABLE IF NOT EXISTS security_db.detection_logs (
          id String,
          device_id String,
          risk_level String,
          risk_content String,
          hit_keywords Array(String),
          engine_type String,
          created_at DateTime DEFAULT now()
        ) ENGINE = MergeTree()
        ORDER BY (created_at, device_id)
      `
    });

    console.log('[ClickHouse] 数据库初始化成功');
  } catch (error) {
    console.error('[ClickHouse] 数据库初始化失败:', error.message);
  }
}

async function flushBuffer() {
  if (dataBuffer.length === 0) return;

  const recordsToInsert = [...dataBuffer];
  dataBuffer = [];
  lastFlushTime = Date.now();

  try {
    await client.insert({
      table: 'detection_logs',
      values: recordsToInsert,
      format: 'JSONEachRow'
    });
    console.log(`[ClickHouse] 已写入 ${recordsToInsert.length} 条数据`);
  } catch (error) {
    console.error('[ClickHouse] 写入失败:', error.message);
    dataBuffer = [...recordsToInsert, ...dataBuffer];
  }
}

function addRecord(record) {
  const newRecord = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    device_id: record.device_id,
    risk_level: record.risk_level,
    risk_content: record.risk_content || '',
    hit_keywords: record.hit_keywords || [],
    engine_type: record.engine_type || 'unknown',
    created_at: record.timestamp 
      ? record.timestamp.slice(0, 19).replace('T', ' ')
      : new Date().toISOString().slice(0, 19).replace('T', ' ')
  };

  dataBuffer.push(newRecord);

  if (dataBuffer.length >= BUFFER_SIZE || Date.now() - lastFlushTime > FLUSH_INTERVAL) {
    flushBuffer();
  }

  return newRecord;
}

async function addRecords(records) {
  const results = records.map(r => {
    const newRecord = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      device_id: r.device_id,
      risk_level: r.risk_level,
      risk_content: r.risk_content || '',
      hit_keywords: r.hit_keywords || [],
      engine_type: r.engine_type || 'unknown',
      created_at: r.timestamp 
        ? r.timestamp.slice(0, 19).replace('T', ' ')
        : new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    dataBuffer.push(newRecord);
    return newRecord;
  });

  await flushBuffer();
  return results;
}

async function getRiskDistribution(startDate, endDate) {
  try {
    const result = await client.query({
      query: `
        SELECT 
          toString(toDate(created_at)) AS date,
          risk_level,
          count() AS count
        FROM security_db.detection_logs
        WHERE toDate(created_at) >= '${startDate}'
          AND toDate(created_at) <= '${endDate}'
        GROUP BY date, risk_level
        ORDER BY date
      `,
      format: 'JSONEachRow'
    });

    const rows = await result.json();

    const distribution = {};
    rows.forEach(row => {
      const date = row.date;
      if (!distribution[date]) {
        distribution[date] = { date, high: 0, medium: 0, low: 0, total: 0 };
      }
      distribution[date][row.risk_level] = Number(row.count);
      distribution[date].total += Number(row.count);
    });

    return Object.values(distribution).sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('[ClickHouse] 查询风险分布失败:', error.message);
    return [];
  }
}

async function getDeviceRanking(limit = 10) {
  try {
    const result = await client.query({
      query: `
        SELECT 
          device_id,
          count() AS total,
          countIf(risk_level = 'high') AS high,
          countIf(risk_level = 'medium') AS medium,
          countIf(risk_level = 'low') AS low,
          max(created_at) AS last_violation
        FROM security_db.detection_logs
        GROUP BY device_id
        ORDER BY total DESC
        LIMIT ${limit}
      `,
      format: 'JSONEachRow'
    });

    const rows = await result.json();
    return rows.map(row => ({
      device_id: row.device_id,
      total: Number(row.total),
      high: Number(row.high),
      medium: Number(row.medium),
      low: Number(row.low),
      last_violation: row.last_violation
    }));
  } catch (error) {
    console.error('[ClickHouse] 查询设备排名失败:', error.message);
    return [];
  }
}

async function getRecords({ device_id, risk_level, engine_type, start_date, end_date, page = 1, page_size = 20 }) {
  try {
    const conditions = ['1=1'];

    if (device_id) conditions.push(`device_id LIKE '%${device_id}%'`);
    if (risk_level) conditions.push(`risk_level = '${risk_level}'`);
    if (engine_type) conditions.push(`engine_type = '${engine_type}'`);
    if (start_date) conditions.push(`toDate(created_at) >= '${start_date}'`);
    if (end_date) conditions.push(`toDate(created_at) <= '${end_date}'`);

    const whereClause = conditions.join(' AND ');
    const offset = (page - 1) * page_size;

    const countResult = await client.query({
      query: `SELECT count() AS total FROM security_db.detection_logs WHERE ${whereClause}`,
      format: 'JSONEachRow'
    });
    const countRows = await countResult.json();
    const total = Number(countRows[0]?.total || 0);

    const result = await client.query({
      query: `
        SELECT *
        FROM security_db.detection_logs
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${page_size} OFFSET ${offset}
      `,
      format: 'JSONEachRow'
    });

    const records = await result.json();

    return {
      records,
      pagination: { page, page_size, total, total_pages: Math.ceil(total / page_size) }
    };
  } catch (error) {
    console.error('[ClickHouse] 查询数据列表失败:', error.message);
    return { records: [], pagination: { page, page_size, total: 0, total_pages: 0 } };
  }
}

setInterval(flushBuffer, FLUSH_INTERVAL);
initDatabase();

module.exports = {
  addRecord,
  addRecords,
  getRiskDistribution,
  getDeviceRanking,
  getRecords,
  flushBuffer,
  client
};