/**
 * Health Routes
 * Handles health checks and readiness probes
 */

const express = require('express');
const { checkHealth: checkDbHealth } = require('../config/database');
const redisClient = require('../config/redis');
const { checkHealth: checkKafkaHealth } = require('../config/kafka');
const winston = require('winston');

const router = express.Router();

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'health-route' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * @route GET /health
 * @desc Comprehensive health check endpoint
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  // Check all services in parallel
  const [dbHealth, redisHealth, kafkaHealth] = await Promise.allSettled([
    checkDbHealth(),
    redisClient.checkHealth(),
    checkKafkaHealth()
  ]);

  const services = {
    database: dbHealth.status === 'fulfilled' ? dbHealth.value : { status: 'unhealthy', error: dbHealth.reason?.message },
    redis: redisHealth.status === 'fulfilled' ? redisHealth.value : { status: 'unhealthy', error: redisHealth.reason?.message },
    kafka: kafkaHealth.status === 'fulfilled' ? kafkaHealth.value : { status: 'unhealthy', error: kafkaHealth.reason?.message }
  };

  // Determine overall health
  const isHealthy = Object.values(services).every(s => s.status === 'healthy');
  const responseTime = Date.now() - startTime;

  const response = {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    response_time: `${responseTime}ms`,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services
  };

  const statusCode = isHealthy ? 200 : 503;
  
  logger[isHealthy ? 'info' : 'warn']('Health check completed', {
    status: response.status,
    responseTime: `${responseTime}ms`
  });

  res.status(statusCode).json(response);
});

/**
 * @route GET /health/ready
 * @desc Readiness probe for Kubernetes/Docker
 */
router.get('/ready', async (req, res) => {
  try {
    // Check critical dependencies
    const [dbResult, redisResult] = await Promise.allSettled([
      checkDbHealth(),
      redisClient.checkHealth()
    ]);

    const isReady = 
      dbResult.status === 'fulfilled' && dbResult.value.status === 'healthy' &&
      redisResult.status === 'fulfilled' && redisResult.value.status === 'healthy';

    if (isReady) {
      logger.debug('Readiness probe passed');
      res.status(200).json({
        ready: true,
        timestamp: new Date().toISOString()
      });
    } else {
      const failures = [];
      if (dbResult.status === 'rejected' || dbResult.value?.status !== 'healthy') {
        failures.push('database');
      }
      if (redisResult.status === 'rejected' || redisResult.value?.status !== 'healthy') {
        failures.push('redis');
      }

      logger.warn('Readiness probe failed', { failures });
      res.status(503).json({
        ready: false,
        timestamp: new Date().toISOString(),
        failures
      });
    }
  } catch (error) {
    logger.error('Readiness probe error', { error: error.message });
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @route GET /health/live
 * @desc Liveness probe for Kubernetes
 */
router.get('/live', (req, res) => {
  // Simple liveness check - if this endpoint responds, the app is alive
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * @route GET /health/detailed
 * @desc Detailed health check with system information
 */
router.get('/detailed', async (req, res) => {
  const startTime = Date.now();
  
  // Check all services
  const [dbHealth, redisHealth, kafkaHealth] = await Promise.allSettled([
    checkDbHealth(),
    redisClient.checkHealth(),
    checkKafkaHealth()
  ]);

  const services = {
    database: dbHealth.status === 'fulfilled' ? dbHealth.value : { status: 'unhealthy', error: dbHealth.reason?.message },
    redis: redisHealth.status === 'fulfilled' ? redisHealth.value : { status: 'unhealthy', error: redisHealth.reason?.message },
    kafka: kafkaHealth.status === 'fulfilled' ? kafkaHealth.value : { status: 'unhealthy', error: kafkaHealth.reason?.message }
  };

  // System information
  const sysInfo = {
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB'
    },
    cpu: process.cpuUsage(),
    pid: process.pid
  };

  const isHealthy = Object.values(services).every(s => s.status === 'healthy');
  const responseTime = Date.now() - startTime;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    response_time: `${responseTime}ms`,
    services,
    system: sysInfo
  });
});

module.exports = router;
