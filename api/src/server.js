/**
 * SkateStock REST API Server
 * E-commerce Data Intelligence Platform
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const winston = require('winston');
require('dotenv').config();

// Import route handlers
const productsRouter = require('./routes/products');
const analyticsRouter = require('./routes/analytics');
const alertsRouter = require('./routes/alerts');
const healthRouter = require('./routes/health');

// Import database connections for graceful shutdown
const { pool } = require('./config/database');
const redisClient = require('./config/redis');
const { producer, kafka } = require('./config/kafka');

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'skatestock-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Create logs directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    query: req.query
  });
  next();
});

// Swagger documentation setup
const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'SkateStock API',
    description: 'E-commerce Data Intelligence Platform API',
    version: '1.0.0',
    contact: {
      name: 'SkateStock Support'
    }
  },
  servers: [
    {
      url: process.env.API_BASE_URL || `http://localhost:${PORT}`,
      description: 'API Server'
    }
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health check endpoint',
        tags: ['Health'],
        responses: {
          200: { description: 'Service is healthy' }
        }
      }
    },
    '/health/ready': {
      get: {
        summary: 'Readiness probe',
        tags: ['Health'],
        responses: {
          200: { description: 'Service is ready' },
          503: { description: 'Service is not ready' }
        }
      }
    },
    '/products': {
      get: {
        summary: 'List products with pagination and filtering',
        tags: ['Products'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'shop', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'brand', in: 'query', schema: { type: 'string' } },
          { name: 'min_discount', in: 'query', schema: { type: 'number' } },
          { name: 'search', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'List of products' }
        }
      }
    },
    '/products/{id}': {
      get: {
        summary: 'Get a single product by ID',
        tags: ['Products'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          200: { description: 'Product details' },
          404: { description: 'Product not found' }
        }
      }
    },
    '/products/{id}/price-history': {
      get: {
        summary: 'Get price history for a product',
        tags: ['Products'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'days', in: 'query', schema: { type: 'integer', default: 30 } }
        ],
        responses: {
          200: { description: 'Price history data' }
        }
      }
    },
    '/analytics/trends': {
      get: {
        summary: 'Get price trends analytics',
        tags: ['Analytics'],
        parameters: [
          { name: 'days', in: 'query', schema: { type: 'integer', default: 30 } },
          { name: 'group_by', in: 'query', schema: { type: 'string', enum: ['category', 'brand', 'shop'] } }
        ],
        responses: {
          200: { description: 'Trends data' }
        }
      }
    },
    '/analytics/discount-patterns': {
      get: {
        summary: 'Get discount patterns',
        tags: ['Analytics'],
        parameters: [
          { name: 'pattern_type', in: 'query', schema: { type: 'string', enum: ['flash_sale', 'gradual_discount', 'all'] } }
        ],
        responses: {
          200: { description: 'Discount patterns data' }
        }
      }
    },
    '/analytics/metrics': {
      get: {
        summary: 'Get pipeline metrics',
        tags: ['Analytics'],
        responses: {
          200: { description: 'Pipeline metrics' }
        }
      }
    },
    '/alerts': {
      get: {
        summary: 'List alerts',
        tags: ['Alerts'],
        parameters: [
          { name: 'unread_only', in: 'query', schema: { type: 'boolean', default: false } }
        ],
        responses: {
          200: { description: 'List of alerts' }
        }
      }
    },
    '/alerts/{id}/read': {
      patch: {
        summary: 'Mark alert as read',
        tags: ['Alerts'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          200: { description: 'Alert marked as read' },
          404: { description: 'Alert not found' }
        }
      }
    }
  }
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Mount routes
app.use('/products', productsRouter);
app.use('/analytics', analyticsRouter);
app.use('/alerts', alertsRouter);
app.use('/health', healthRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'SkateStock API',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    path: req.path
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Don't leak error details in production
  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    ...(isDev && { stack: err.stack })
  });
});

// Graceful shutdown handling
async function gracefulShutdown(signal) {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
  });

  try {
    // Close database connections
    await pool.end();
    logger.info('PostgreSQL connection pool closed');

    // Close Redis connection
    await redisClient.quit();
    logger.info('Redis connection closed');

    // Close Kafka producer
    await producer.disconnect();
    logger.info('Kafka producer disconnected');

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message });
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  gracefulShutdown('unhandledRejection');
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`SkateStock API server running on port ${PORT}`);
  logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
});

module.exports = { app, server, logger };
