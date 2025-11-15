/**
 * Report Caching System
 * Optimizes report retrieval with caching
 */

const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, 'cache');
const CACHE_CONFIG_FILE = path.join(CACHE_DIR, 'cache-config.json');

// Initialize cache directory
function initCache() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  if (!fs.existsSync(CACHE_CONFIG_FILE)) {
    const config = {
      enabled: true,
      ttl: 3600000, // 1 hour in milliseconds
      maxSize: 100 * 1024 * 1024, // 100 MB
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(CACHE_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  }
}

// Get cache config
function getCacheConfig() {
  initCache();
  try {
    const data = fs.readFileSync(CACHE_CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { enabled: true, ttl: 3600000, maxSize: 100 * 1024 * 1024 };
  }
}

// Get cache key
function getCacheKey(key) {
  return path.join(CACHE_DIR, `${key}.json`);
}

// Get from cache
function getFromCache(key) {
  const config = getCacheConfig();
  if (!config.enabled) {
    return null;
  }

  const cacheFile = getCacheKey(key);
  if (!fs.existsSync(cacheFile)) {
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    
    // Check TTL
    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      fs.unlinkSync(cacheFile);
      return null;
    }

    return data.value;
  } catch (err) {
    console.error(`Cache read error for ${key}:`, err);
    return null;
  }
}

// Set cache
function setCache(key, value, ttl = null) {
  const config = getCacheConfig();
  if (!config.enabled) {
    return;
  }

  const cacheFile = getCacheKey(key);
  const cacheTTL = ttl || config.ttl;
  const expiresAt = new Date(Date.now() + cacheTTL);

  try {
    const cacheData = {
      key,
      value,
      expiresAt: expiresAt.toISOString(),
      cachedAt: new Date().toISOString()
    };

    fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2), 'utf8');
  } catch (err) {
    console.error(`Cache write error for ${key}:`, err);
  }
}

// Clear cache
function clearCache(key = null) {
  if (key) {
    const cacheFile = getCacheKey(key);
    if (fs.existsSync(cacheFile)) {
      fs.unlinkSync(cacheFile);
    }
  } else {
    // Clear all cache
    const files = fs.readdirSync(CACHE_DIR);
    files.forEach(file => {
      if (file.endsWith('.json') && file !== 'cache-config.json') {
        fs.unlinkSync(path.join(CACHE_DIR, file));
      }
    });
  }
}

// Clear expired cache
function clearExpiredCache() {
  const files = fs.readdirSync(CACHE_DIR);
  let cleared = 0;

  files.forEach(file => {
    if (file.endsWith('.json') && file !== 'cache-config.json') {
      try {
        const cacheFile = path.join(CACHE_DIR, file);
        const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        
        if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
          fs.unlinkSync(cacheFile);
          cleared++;
        }
      } catch (err) {
        // Ignore errors
      }
    }
  });

  return cleared;
}

// Get cache stats
function getCacheStats() {
  const files = fs.readdirSync(CACHE_DIR);
  let totalSize = 0;
  let count = 0;

  files.forEach(file => {
    if (file.endsWith('.json') && file !== 'cache-config.json') {
      try {
        const stat = fs.statSync(path.join(CACHE_DIR, file));
        totalSize += stat.size;
        count++;
      } catch (err) {
        // Ignore
      }
    }
  });

  return {
    count,
    totalSize,
    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
  };
}

// Initialize cache on module load
initCache();

// Clean expired cache every hour
setInterval(() => {
  const cleared = clearExpiredCache();
  if (cleared > 0) {
    console.log(`Cleared ${cleared} expired cache entries`);
  }
}, 3600000); // 1 hour

module.exports = {
  getFromCache,
  setCache,
  clearCache,
  clearExpiredCache,
  getCacheStats,
  getCacheConfig
};

