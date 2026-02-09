/**
 * PostgreSQL Database Configuration
 * Uses pg Pool for connection management
 */

const { Pool } = require('pg');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'database' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Parse DATABASE_URL if provided, otherwise use individual env vars
const parseDatabaseUrl = (url) => {
  if (!url) return null;
  
  try {
    const regex = /postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
    const match = url.match(regex);
    
    if (match) {
      return {
        user: match[1],
        password: match[2],
        host: match[3],
        port: parseInt(match[4], 10),
        database: match[5]
      };
    }
  } catch (error) {
    logger.error('Failed to parse DATABASE_URL', { error: error.message });
  }
  return null;
};

const dbUrlConfig = parseDatabaseUrl(process.env.DATABASE_URL);

// Pool configuration
const poolConfig = {
  // Connection parameters
  user: dbUrlConfig?.user || process.env.DB_USER || 'postgres',
  password: dbUrlConfig?.password || process.env.DB_PASSWORD || 'postgres',
  host: dbUrlConfig?.host || process.env.DB_HOST || 'localhost',
  port: dbUrlConfig?.port || parseInt(process.env.DB_PORT, 10) || 5432,
  database: dbUrlConfig?.database || process.env.DB_NAME || 'skatestock',
  
  // Pool settings
  max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  
  // SSL configuration for production
  ...(process.env.DB_SSL === 'true' && {
    ssl: {
      rejectUnauthorized: false
    }
  })
};

// Create connection pool
const pool = new Pool(poolConfig);

// Pool event handlers
pool.on('connect', () => {
  logger.debug('New database connection established');
});

pool.on('acquire', () => {
  logger.debug('Client acquired from pool');
});

pool.on('remove', () => {
  logger.debug('Client removed from pool');
});

pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client', { error: err.message });
});

/**
 * Execute a SQL query with parameters
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise} - Query result
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    logger.debug('Query executed', {
      query: text,
      duration: `${duration}ms`,
      rows: result.rowCount
    });
    
    return result;
  } catch (error) {
    logger.error('Query failed', {
      query: text,
      params,
      error: error.message
    });
    throw error;
  }
};

/**
 * Execute queries within a transaction
 * @param {Function} callback - Async function receiving client
 * @returns {Promise} - Transaction result
 */
const transaction = async (callback) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Check database health
 * @returns {Promise<Object>} - Health status
 */
const checkHealth = async () => {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const responseTime = Date.now() - start;
    
    return {
      status: 'healthy',
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
 * Get pool statistics
 * @returns {Object} - Pool stats
 */
const getPoolStats = () => ({
  totalCount: pool.totalCount,
  idleCount: pool.idleCount,
  waitingCount: pool.waitingCount
});

module.exports = {
  pool,
  query,
  transaction,
  checkHealth,
  getPoolStats
};
