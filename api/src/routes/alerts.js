/**
 * Alerts Routes
 * Handles alert listing and management
 */

const express = require('express');
const Joi = require('joi');
const { query } = require('../config/database');
const winston = require('winston');

const router = express.Router();

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'alerts-route' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Validation schemas
const listAlertsSchema = Joi.object({
  unread_only: Joi.boolean().default(false),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
  alert_type: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

const markReadSchema = Joi.object({
  id: Joi.number().integer().positive().required()
});

/**
 * @route GET /alerts
 * @desc List alerts with optional filtering
 */
router.get('/', async (req, res, next) => {
  try {
    const { error, value } = listAlertsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    const { unread_only, severity, alert_type, page, limit } = value;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (unread_only) {
      conditions.push(`is_read = false`);
    }

    if (severity) {
      conditions.push(`severity = $${paramIndex}`);
      params.push(severity);
      paramIndex++;
    }

    if (alert_type) {
      conditions.push(`alert_type ILIKE $${paramIndex}`);
      params.push(`%${alert_type}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total items
    const countQuery = `
      SELECT COUNT(*) 
      FROM alerts
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const totalItems = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalItems / limit);

    // Fetch alerts
    const alertParams = [...params, limit, offset];
    const alertsQuery = `
      SELECT 
        id,
        alert_type,
        severity,
        message,
        product_title,
        product_id,
        triggered_at,
        is_read,
        read_at,
        created_at
      FROM alerts
      ${whereClause}
      ORDER BY 
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        triggered_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await query(alertsQuery, alertParams);

    // Get summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE is_read = false) as unread_count,
        COUNT(*) FILTER (WHERE is_read = false AND severity = 'critical') as critical_unread,
        COUNT(*) FILTER (WHERE is_read = false AND severity = 'high') as high_unread,
        COUNT(*) FILTER (WHERE triggered_at >= NOW() - INTERVAL '24 hours') as alerts_24h
      FROM alerts
    `;
    const summaryResult = await query(summaryQuery);

    logger.info('Alerts listed', { 
      unread_only, 
      severity, 
      page, 
      limit, 
      totalItems 
    });

    res.json({
      data: result.rows,
      summary: summaryResult.rows[0],
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_items: totalItems,
        has_next: page < totalPages,
        has_prev: page > 1
      }
    });
  } catch (error) {
    logger.error('Error listing alerts', { error: error.message });
    next(error);
  }
});

/**
 * @route PATCH /alerts/:id/read
 * @desc Mark an alert as read
 */
router.patch('/:id/read', async (req, res, next) => {
  try {
    const { error, value } = markReadSchema.validate({ id: req.params.id });
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    const { id } = value;

    const updateQuery = `
      UPDATE alerts
      SET 
        is_read = true,
        read_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING 
        id,
        alert_type,
        severity,
        message,
        product_title,
        triggered_at,
        is_read,
        read_at,
        updated_at
    `;

    const result = await query(updateQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Alert with ID ${id} not found`
      });
    }

    logger.info('Alert marked as read', { alertId: id });

    res.json({
      message: 'Alert marked as read',
      alert: result.rows[0]
    });
  } catch (error) {
    logger.error('Error marking alert as read', { error: error.message, alertId: req.params.id });
    next(error);
  }
});

/**
 * @route PATCH /alerts/mark-all-read
 * @desc Mark all unread alerts as read (optional bulk action)
 */
router.patch('/mark-all-read', async (req, res, next) => {
  try {
    const { severity } = req.query;
    
    let updateQuery;
    let params = [];

    if (severity) {
      updateQuery = `
        UPDATE alerts
        SET 
          is_read = true,
          read_at = NOW(),
          updated_at = NOW()
        WHERE is_read = false AND severity = $1
        RETURNING id
      `;
      params = [severity];
    } else {
      updateQuery = `
        UPDATE alerts
        SET 
          is_read = true,
          read_at = NOW(),
          updated_at = NOW()
        WHERE is_read = false
        RETURNING id
      `;
    }

    const result = await query(updateQuery, params);

    logger.info('All alerts marked as read', { 
      count: result.rows.length,
      severity: severity || 'all'
    });

    res.json({
      message: `${result.rows.length} alert(s) marked as read`,
      marked_count: result.rows.length,
      severity: severity || 'all'
    });
  } catch (error) {
    logger.error('Error marking all alerts as read', { error: error.message });
    next(error);
  }
});

module.exports = router;
