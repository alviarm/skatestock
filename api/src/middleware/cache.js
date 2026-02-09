/**
 * Response Caching Middleware
 * Redis-based response caching with configurable TTL
 */

const crypto = require('crypto');
const redisClient = require('../config/redis');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'cache-middleware' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Default cache configuration
const DEFAULT_TTL_SECONDS = 300; // 5 minutes
const CACHE_PREFIX = 'cache:response:';

/**
 * Generate cache key from request
 * @param {Object} req - Express request object
 * @returns {string} - Cache key
 */
const generateCacheKey = (req) => {
  // Build cache key from URL and sorted query parameters
  const url = req.originalUrl || req.url;
  
  // Create a deterministic key
  const keyData = {
    url: url.split('?')[0], // Path without query string
    query: Object.keys(req.query)
      .sort()
      .reduce((acc, key) => {
        acc[key] = req.query[key];
        return acc;
      }, {}),
    // Include API key in cache key if present (for per-client caching)
    apiKey: req.apiKey || req.headers['x-api-key'] || 'public'
  };

  const keyString = JSON.stringify(keyData);
  const hash = crypto.createHash('sha256').update(keyString).digest('hex');
  
  return `${CACHE_PREFIX}${hash}`;
};

/**
 * Generate cache key from request (alternative - human readable)
 * @param {Object} req - Express request object
 * @returns {string} - Human-readable cache key
 */
const generateReadableCacheKey = (req) => {
  const url = req.originalUrl || req.url;
  const sanitized = url.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100);
  return `${CACHE_PREFIX}${sanitized}`;
};

/**
 * Check if request is cacheable
 * @param {Object} req - Express request object
 * @returns {boolean} - Whether the request can be cached
 */
const isCacheableRequest = (req) => {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return false;
  }

  // Don't cache if Cache-Control: no-cache is present
  if (req.headers['cache-control']?.includes('no-cache')) {
    return false;
  }

  // Don't cache if Pragma: no-cache is present (HTTP/1.0)
  if (req.headers['pragma']?.includes('no-cache')) {
    return false;
  }

  return true;
};

/**
 * Cache middleware factory
 * @param {Object} options - Cache options
 * @returns {Function} - Express middleware
 */
const cacheMiddleware = (options = {}) => {
  const {
    ttlSeconds = DEFAULT_TTL_SECONDS,
    keyGenerator = generateCacheKey,
    condition = isCacheableRequest,
    tags = [],
    varyByHeaders = []
  } = options;

  return async (req, res, next) => {
    // Skip caching if condition not met
    if (!condition(req)) {
      return next();
    }

    const cacheKey = keyGenerator(req);

    try {
      // Try to get cached response
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        const parsed = JSON.parse(cached);
        
        logger.debug('Cache hit', { key: cacheKey, url: req.url });

        // Set cache headers
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-TTL', ttlSeconds.toString());
        res.set('Age', Math.floor((Date.now() - parsed.cachedAt) / 1000).toString());

        // Set vary headers if configured
        if (varyByHeaders.length > 0) {
          res.set('Vary', varyByHeaders.join(', '));
        }

        // Return cached response
        res.status(parsed.statusCode);
        
        // Restore headers
        if (parsed.headers) {
          Object.entries(parsed.headers).forEach(([key, value]) => {
            if (!['x-cache', 'x-cache-ttl', 'age'].includes(key.toLowerCase())) {
              res.set(key, value);
            }
          });
        }

        return res.send(parsed.body);
      }

      logger.debug('Cache miss', { key: cacheKey, url: req.url });

      // Capture original res.json and res.send
      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);
      const originalStatus = res.status.bind(res);
      const originalSet = res.set.bind(res);

      let statusCode = 200;
      let headers = {};

      // Override res.status to capture status code
      res.status = (code) => {
        statusCode = code;
        return originalStatus(code);
      };

      // Override res.set to capture headers
      res.set = (field, value) => {
        if (typeof field === 'object') {
          headers = { ...headers, ...field };
        } else if (value) {
          headers[field] = value;
        }
        return originalSet(field, value);
      };

      // Override res.json to cache the response
      res.json = (body) => {
        cacheResponse(cacheKey, statusCode, headers, body, ttlSeconds, tags);
        
        // Restore original methods
        res.json = originalJson;
        res.send = originalSend;
        res.status = originalStatus;
        res.set = originalSet;

        // Set cache headers
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-TTL', ttlSeconds.toString());

        return originalJson(body);
      };

      // Override res.send to cache the response
      res.send = (body) => {
        // Only cache if it's a successful response
        if (statusCode >= 200 && statusCode < 300) {
          cacheResponse(cacheKey, statusCode, headers, body, ttlSeconds, tags);
        }

        // Restore original methods
        res.json = originalJson;
        res.send = originalSend;
        res.status = originalStatus;
        res.set = originalSet;

        // Set cache headers
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-TTL', ttlSeconds.toString());

        return originalSend(body);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', { error: error.message, url: req.url });
      // Continue without caching on error
      next();
    }
  };
};

/**
 * Cache a response
 * @param {string} key - Cache key
 * @param {number} statusCode - HTTP status code
 * @param {Object} headers - Response headers
 * @param {*} body - Response body
 * @param {number} ttlSeconds - Time to live in seconds
 * @param {Array<string>} tags - Cache tags for invalidation
 */
const cacheResponse = async (key, statusCode, headers, body, ttlSeconds, tags) => {
  try {
    const cacheData = {
      statusCode,
      headers,
      body,
      cachedAt: Date.now(),
      tags
    };

    await redisClient.setex(key, ttlSeconds, JSON.stringify(cacheData));

    // Store tags for later invalidation
    if (tags.length > 0) {
      for (const tag of tags) {
        const tagKey = `${CACHE_PREFIX}tag:${tag}`;
        await redisClient.sadd(tagKey, key);
        // Set same TTL on tag index
        await redisClient.expire(tagKey, ttlSeconds);
      }
    }

    logger.debug('Response cached', { key, ttl: ttlSeconds, tags });
  } catch (error) {
    logger.error('Failed to cache response', { error: error.message, key });
  }
};

/**
 * Invalidate cache by key
 * @param {string} key - Cache key to invalidate
 */
const invalidateCache = async (key) => {
  try {
    const fullKey = key.startsWith(CACHE_PREFIX) ? key : `${CACHE_PREFIX}${key}`;
    await redisClient.del(fullKey);
    logger.info('Cache invalidated', { key: fullKey });
    return true;
  } catch (error) {
    logger.error('Failed to invalidate cache', { error: error.message, key });
    return false;
  }
};

/**
 * Invalidate cache by tag
 * @param {string} tag - Tag to invalidate
 */
const invalidateCacheByTag = async (tag) => {
  try {
    const tagKey = `${CACHE_PREFIX}tag:${tag}`;
    const keys = await redisClient.smembers(tagKey);

    if (keys.length > 0) {
      await redisClient.del(...keys);
      await redisClient.del(tagKey);
      logger.info('Cache invalidated by tag', { tag, count: keys.length });
    }

    return keys.length;
  } catch (error) {
    logger.error('Failed to invalidate cache by tag', { error: error.message, tag });
    return 0;
  }
};

/**
 * Invalidate cache by pattern
 * @param {string} pattern - Key pattern to match
 */
const invalidateCacheByPattern = async (pattern) => {
  try {
    const fullPattern = `${CACHE_PREFIX}${pattern}`;
    const stream = redisClient.scanStream({ match: fullPattern });
    
    let deletedCount = 0;
    
    for await (const keys of stream) {
      if (keys.length > 0) {
        await redisClient.del(...keys);
        deletedCount += keys.length;
      }
    }

    logger.info('Cache invalidated by pattern', { pattern, count: deletedCount });
    return deletedCount;
  } catch (error) {
    logger.error('Failed to invalidate cache by pattern', { error: error.message, pattern });
    return 0;
  }
};

/**
 * Clear all cached responses
 */
const clearAllCache = async () => {
  try {
    const stream = redisClient.scanStream({ match: `${CACHE_PREFIX}*` });
    
    let deletedCount = 0;
    
    for await (const keys of stream) {
      if (keys.length > 0) {
        await redisClient.del(...keys);
        deletedCount += keys.length;
      }
    }

    logger.info('All cache cleared', { count: deletedCount });
    return deletedCount;
  } catch (error) {
    logger.error('Failed to clear cache', { error: error.message });
    return 0;
  }
};

/**
 * Get cache statistics
 * @returns {Promise<Object>} - Cache statistics
 */
const getCacheStats = async () => {
  try {
    let count = 0;
    const stream = redisClient.scanStream({ match: `${CACHE_PREFIX}*` });
    
    for await (const keys of stream) {
      count += keys.length;
    }

    return {
      cached_responses: count,
      prefix: CACHE_PREFIX,
      default_ttl: DEFAULT_TTL_SECONDS
    };
  } catch (error) {
    logger.error('Failed to get cache stats', { error: error.message });
    return { error: error.message };
  }
};

// Pre-configured cache middlewares
const shortCache = cacheMiddleware({ ttlSeconds: 60 }); // 1 minute
const mediumCache = cacheMiddleware({ ttlSeconds: 300 }); // 5 minutes
const longCache = cacheMiddleware({ ttlSeconds: 3600 }); // 1 hour

module.exports = {
  cacheMiddleware,
  shortCache,
  mediumCache,
  longCache,
  generateCacheKey,
  generateReadableCacheKey,
  invalidateCache,
  invalidateCacheByTag,
  invalidateCacheByPattern,
  clearAllCache,
  getCacheStats
};
