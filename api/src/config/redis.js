/**
 * Redis Configuration
 * Uses ioredis for Redis connection management
 */

const Redis = require('ioredis');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'redis' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Parse REDIS_URL if provided
const parseRedisUrl = (url) => {
  if (!url) return null;
  
  try {
    const redisUrl = new URL(url);
    return {
      host: redisUrl.hostname,
      port: parseInt(redisUrl.port, 10) || 6379,
      password: redisUrl.password || undefined,
      db: redisUrl.pathname ? parseInt(redisUrl.pathname.slice(1), 10) || 0 : 0
    };
  } catch (error) {
    logger.error('Failed to parse REDIS_URL', { error: error.message });
    return null;
  }
};

const redisUrlConfig = parseRedisUrl(process.env.REDIS_URL);

// Redis configuration
const redisConfig = {
  host: redisUrlConfig?.host || process.env.REDIS_HOST || 'localhost',
  port: redisUrlConfig?.port || parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: redisUrlConfig?.password || process.env.REDIS_PASSWORD || undefined,
  db: redisUrlConfig?.db || parseInt(process.env.REDIS_DB, 10) || 0,
  
  // Connection settings
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  
  // Retry strategy
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  
  // Reconnect strategy
  reconnectOnError(err) {
    const targetErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET'];
    if (targetErrors.some(e => err.message.includes(e))) {
      return true;
    }
    return false;
  },
  
  // TLS for production
  ...(process.env.REDIS_TLS === 'true' && {
    tls: {}
  })
};

// Create Redis client
const redisClient = new Redis(redisConfig);

// Event handlers
redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('ready', () => {
  logger.info('Redis client ready');
});

redisClient.on('error', (err) => {
  logger.error('Redis client error', { error: err.message });
});

redisClient.on('reconnecting', (delay) => {
  logger.warn('Redis client reconnecting', { delay });
});

redisClient.on('end', () => {
  logger.info('Redis client connection closed');
});

/**
 * Check Redis health
 * @returns {Promise<Object>} - Health status
 */
const checkHealth = async () => {
  try {
    const start = Date.now();
    const result = await redisClient.ping();
    const responseTime = Date.now() - start;
    
    return {
      status: result === 'PONG' ? 'healthy' : 'unhealthy',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Get Redis server info
 * @returns {Promise<Object>} - Server information
 */
const getInfo = async () => {
  try {
    const info = await redisClient.info();
    return info;
  } catch (error) {
    logger.error('Failed to get Redis info', { error: error.message });
    throw error;
  }
};

/**
 * Flush all data from Redis (use with caution)
 * @returns {Promise<string>}
 */
const flushAll = async () => {
  try {
    const result = await redisClient.flushall();
    logger.warn('Redis flushed');
    return result;
  } catch (error) {
    logger.error('Failed to flush Redis', { error: error.message });
    throw error;
  }
};

// Attach helper functions to client
redisClient.checkHealth = checkHealth;
redisClient.getInfo = getInfo;
redisClient.flushAll = flushAll;

module.exports = redisClient;
