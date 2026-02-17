const fs = require('fs');
const path = require('path');

// 配置文件目录
const CONFIG_DIR = path.join(__dirname, '../../config');

/**
 * 读取配置文件
 */
function readConfig(filename) {
  const filepath = path.join(CONFIG_DIR, filename);
  
  if (!fs.existsSync(filepath)) {
    throw new Error(`配置文件不存在: ${filename}`);
  }
  
  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content);
}

/**
 * 写入配置文件
 */
function writeConfig(filename, data) {
  const filepath = path.join(CONFIG_DIR, filename);
  
  // 读取现有配置，更新版本号
  let currentVersion = 0;
  if (fs.existsSync(filepath)) {
    const current = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    currentVersion = current.version || 0;
  }
  
  // 更新元信息
  const newData = {
    ...data,
    version: currentVersion + 1,
    updated_at: new Date().toISOString()
  };
  
  // 写入文件（格式化便于阅读）
  fs.writeFileSync(filepath, JSON.stringify(newData, null, 2), 'utf-8');
  
  return newData;
}

/**
 * 获取敏感度配置
 */
function getSensitivity() {
  return readConfig('sensitivity.json');
}

/**
 * 更新敏感度配置
 */
function updateSensitivity(levels) {
  const current = getSensitivity();
  return writeConfig('sensitivity.json', {
    ...current,
    levels: levels
  });
}

/**
 * 获取关键词配置
 */
function getKeywords() {
  return readConfig('keywords.json');
}

/**
 * 更新关键词配置
 */
function updateKeywords(categories) {
  const current = getKeywords();
  return writeConfig('keywords.json', {
    ...current,
    categories: categories
  });
}

/**
 * 添加关键词到指定分类
 */
function addKeyword(category, keyword) {
  const config = getKeywords();
  
  if (!config.categories[category]) {
    throw new Error(`分类不存在: ${category}`);
  }
  
  const keywords = config.categories[category].keywords;
  if (!keywords.includes(keyword)) {
    keywords.push(keyword);
    return writeConfig('keywords.json', config);
  }
  
  return config;
}

/**
 * 从指定分类删除关键词
 */
function removeKeyword(category, keyword) {
  const config = getKeywords();
  
  if (!config.categories[category]) {
    throw new Error(`分类不存在: ${category}`);
  }
  
  const keywords = config.categories[category].keywords;
  const index = keywords.indexOf(keyword);
  
  if (index > -1) {
    keywords.splice(index, 1);
    return writeConfig('keywords.json', config);
  }
  
  return config;
}

/**
 * 添加新的关键词分类
 */
function addCategory(categoryId, categoryName) {
  const config = getKeywords();
  
  if (config.categories[categoryId]) {
    throw new Error(`分类已存在: ${categoryId}`);
  }
  
  config.categories[categoryId] = {
    name: categoryName,
    keywords: []
  };
  
  return writeConfig('keywords.json', config);
}

module.exports = {
  getSensitivity,
  updateSensitivity,
  getKeywords,
  updateKeywords,
  addKeyword,
  removeKeyword,
  addCategory
};
