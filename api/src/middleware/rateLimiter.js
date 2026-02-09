/**
 * Rate Limiting Middleware
 * Redis-based rate limiting with sliding window
 */

const redisClient = require('../config/redis');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'rate-limiter' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Rate limit configuration
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX_REQUESTS = 100;

// Get configuration from environment
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || DEFAULT_WINDOW_MS;
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || DEFAULT_MAX_REQUESTS;

/**
 * Get rate limit key for a request
 * @param {Object} req - Express request object
 * @returns {string} - Redis key for rate limiting
 */
const getRateLimitKey = (req) => {
  // Use API key if available, otherwise use IP address
  const identifier = req.apiKey || req.headers['x-api-key'] || req.ip || 'unknown';
  const key = identifier.toString().replace(/:/g, '_'); // Sanitize for Redis key
  return `ratelimit:${key}`;
};

/**
 * Rate limiting middleware factory
 * @param {Object} options - Rate limit options
 * @returns {Function} - Express middleware
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = RATE_LIMIT_WINDOW_MS,
    maxRequests = RATE_LIMIT_MAX_REQUESTS,
    keyGenerator = getRateLimitKey,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    skip = () => false
  } = options;

  return async (req, res, next) => {
    try {
      // Skip rate limiting if configured
      if (skip(req)) {
        return next();
      }

      const key = keyGenerator(req);
      const now = Date.now();
      const windowStart = now - windowMs;

      // Use Redis sorted set for sliding window rate limiting
      // Remove old entries outside the window
      await redisClient.zremrangebyscore(key, 0, windowStart);

      // Count current requests in window
      const currentCount = await redisClient.zcard(key);

      if (currentCount >= maxRequests) {
        // Get the oldest request in the window for Retry-After header
        const oldestRequest = await redisClient.zrange(key, 0, 0, 'WITHSCORES');
        const retryAfter = oldestRequest.length > 1 
          ? Math.ceil((parseInt(oldestRequest[1]) + windowMs - now) / 1000)
          : Math.ceil(windowMs / 1000);

        logger.warn('Rate limit exceeded', {
          key: key.split(':')[1], // Log identifier without full prefix
          path: req.path,
          currentCount
        });

        res.set('Retry-After', retryAfter.toString());
        res.set('X-RateLimit-Limit', maxRequests.toString());
        res.set('X-RateLimit-Remaining', '0');
        res.set('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retryAfter
        });
      }

      // Add current request to the window
      await redisClient.zadd(key, now, `${now}-${Math.random().toString(36).substr(2, 9)}`);
      
      // Set expiration on the key to auto-cleanup
      await redisClient.pexpire(key, windowMs);

      // Calculate remaining requests
      const remainingRequests = Math.max(0, maxRequests - currentCount - 1);

      // Set rate limit headers
      res.set('X-RateLimit-Limit', maxRequests.toString());
      res.set('X-RateLimit-Remaining', remainingRequests.toString());
      res.set('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

      // Log successful rate limit check
      logger.debug('Rate limit check passed', {
        key: key.split(':')[1],
        remaining: remainingRequests
      });

      // Handle response to track successful/failed requests if needed
      if (skipSuccessfulRequests || skipFailedRequests) {
        res.on('finish', async () => {
          const statusCode = res.statusCode;
          const isSuccess = statusCode >= 200 && statusCode < 300;
          const isError = statusCode >= 400;

          if ((skipSuccessfulRequests && isSuccess) || (skipFailedRequests && isError)) {
            // Remove this request from the rate limit counter
            try {
              await redisClient.zremrangebyrank(key, -1, -1);
            } catch (err) {
              logger.error('Failed to adjust rate limit counter', { error: err.message });
            }
          }
        });
      }

      next();
    } catch (error) {
      logger.error('Rate limiting error', { error: error.message });
      
      // Fail open - allow request if Redis is unavailable
      if (process.env.RATE_LIMIT_FAIL_OPEN === 'true') {
        return next();
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Rate limiting service unavailable'
      });
    }
  };
};

/**
 * Standard rate limiter (100 requests per 15 minutes)
 */
const rateLimiter = createRateLimiter();

/**
 * Strict rate limiter (10 requests per minute) for sensitive endpoints
 */
const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10
});

/**
 * Lax rate limiter (1000 requests per 15 minutes) for high-traffic endpoints
 */
const laxRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 1000
});

/**
 * Reset rate limit for a specific identifier
 * @param {string} identifier - API key or IP address
 */
const resetRateLimit = async (identifier) => {
  try {
    const key = `ratelimit:${identifier}`;
    await redisClient.del(key);
    logger.info('Rate limit reset', { identifier });
    return true;
  } catch (error) {
    logger.error('Failed to reset rate limit', { error: error.message, identifier });
    return false;
  }
};

/**
 * Get current rate limit status for an identifier
 * @param {string} identifier - API key or IP address
 * @returns {Promise<Object>} - Rate limit status
 */
const getRateLimitStatus = async (identifier) => {
  try {
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    // Remove old entries and count current
    await redisClient.zremrangebyscore(key, 0, windowStart);
    const currentCount = await redisClient.zcard(key);

    // Get oldest request for reset time calculation
    const oldestRequest = await redisClient.zrange(key, 0, 0, 'WITHSCORES');
    const resetTime = oldestRequest.length > 1
      ? new Date(parseInt(oldestRequest[1]) + RATE_LIMIT_WINDOW_MS).toISOString()
      : new Date(now + RATE_LIMIT_WINDOW_MS).toISOString();

    return {
      limit: RATE_LIMIT_MAX_REQUESTS,
      remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - currentCount),
      used: currentCount,
      resetTime
    };
  } catch (error) {
    logger.error('Failed to get rate limit status', { error: error.message, identifier });
    throw error;
  }
};

module.exports = {
  createRateLimiter,
  rateLimiter,
  strictRateLimiter,
  laxRateLimiter,
  resetRateLimit,
  getRateLimitStatus
};
