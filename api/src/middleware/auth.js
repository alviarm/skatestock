/**
 * Authentication Middleware
 * Handles JWT and API key authentication
 */

const jwt = require('jsonwebtoken');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'auth-middleware' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const API_KEYS = new Set(
  process.env.API_KEYS?.split(',').map(k => k.trim()) || ['dev-api-key']
);

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded payload or null
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Validate API key
 * @param {string} apiKey - API key to validate
 * @returns {boolean} - Whether the key is valid
 */
const validateApiKey = (apiKey) => {
  if (!apiKey) return false;
  return API_KEYS.has(apiKey);
};

/**
 * JWT Authentication Middleware
 * Validates JWT token from Authorization header
 */
const jwtAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      logger.warn('Authentication failed: No authorization header', {
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization header is required'
      });
    }

    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      logger.warn('Authentication failed: Invalid authorization format', {
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization header must be in format: Bearer <token>'
      });
    }

    const token = parts[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      logger.warn('Authentication failed: Invalid token', {
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Attach user info to request
    req.user = decoded;
    
    logger.debug('JWT authentication successful', {
      userId: decoded.id,
      path: req.path
    });

    next();
  } catch (error) {
    logger.error('JWT authentication error', { error: error.message });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication processing failed'
    });
  }
};

/**
 * API Key Authentication Middleware
 * Validates API key from X-API-Key header
 */
const apiKeyAuth = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      logger.warn('API key authentication failed: No API key provided', {
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'X-API-Key header is required'
      });
    }

    if (!validateApiKey(apiKey)) {
      logger.warn('API key authentication failed: Invalid API key', {
        ip: req.ip,
        path: req.path,
        apiKey: apiKey.substring(0, 4) + '...'
      });
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    }

    // Attach API key info to request
    req.apiKey = apiKey;
    
    logger.debug('API key authentication successful', {
      path: req.path,
      apiKeyPrefix: apiKey.substring(0, 4) + '...'
    });

    next();
  } catch (error) {
    logger.error('API key authentication error', { error: error.message });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication processing failed'
    });
  }
};

/**
 * Optional Authentication Middleware
 * Tries to authenticate but doesn't fail if no credentials provided
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'];

    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const decoded = verifyToken(parts[1]);
        if (decoded) {
          req.user = decoded;
        }
      }
    } else if (apiKey && validateApiKey(apiKey)) {
      req.apiKey = apiKey;
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Role-based Authorization Middleware
 * @param {Array<string>} allowedRoles - Roles allowed to access the route
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role || 'user';
    
    if (!allowedRoles.includes(userRole)) {
      logger.warn('Authorization failed: Insufficient permissions', {
        userId: req.user.id,
        role: userRole,
        required: allowedRoles,
        path: req.path
      });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Generate JWT token
 * @param {Object} payload - Token payload
 * @param {Object} options - Token options
 * @returns {string} - JWT token
 */
const generateToken = (payload, options = {}) => {
  const defaultOptions = {
    expiresIn: '24h',
    issuer: 'skatestock-api',
    ...options
  };
  
  return jwt.sign(payload, JWT_SECRET, defaultOptions);
};

/**
 * Generate API key
 * @returns {string} - New API key
 */
const generateApiKey = () => {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
};

module.exports = {
  jwtAuth,
  apiKeyAuth,
  optionalAuth,
  requireRole,
  generateToken,
  generateApiKey,
  verifyToken,
  validateApiKey
};
