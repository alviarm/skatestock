/**
 * Analytics Routes
 * Handles price trends, discount patterns, and pipeline metrics
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
  defaultMeta: { service: 'analytics-route' },
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
const trendsSchema = Joi.object({
  days: Joi.number().integer().min(1).max(365).default(30),
  group_by: Joi.string().valid('category', 'brand', 'shop').optional()
});

const discountPatternsSchema = Joi.object({
  pattern_type: Joi.string().valid('flash_sale', 'gradual_discount', 'all').default('all')
});

/**
 * @route GET /analytics/trends
 * @desc Get price trends with optional grouping
 */
router.get('/trends', async (req, res, next) => {
  try {
    const { error, value } = trendsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    const { days, group_by } = value;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let trendsQuery;
    let params = [startDate.toISOString()];

    if (group_by === 'category') {
      trendsQuery = `
        SELECT 
          DATE(ph.recorded_at) as date,
          p.category,
          AVG(ph.original_price)::numeric(10,2) as avg_original_price,
          AVG(ph.sale_price)::numeric(10,2) as avg_sale_price,
          AVG(ph.discount_percentage)::numeric(5,2) as avg_discount_percentage,
          COUNT(DISTINCT ph.product_id) as product_count
        FROM price_history ph
        JOIN products p ON ph.product_id = p.id
        WHERE ph.recorded_at >= $1
        GROUP BY DATE(ph.recorded_at), p.category
        ORDER BY date DESC, p.category
      `;
    } else if (group_by === 'brand') {
      trendsQuery = `
        SELECT 
          DATE(ph.recorded_at) as date,
          p.brand,
          AVG(ph.original_price)::numeric(10,2) as avg_original_price,
          AVG(ph.sale_price)::numeric(10,2) as avg_sale_price,
          AVG(ph.discount_percentage)::numeric(5,2) as avg_discount_percentage,
          COUNT(DISTINCT ph.product_id) as product_count
        FROM price_history ph
        JOIN products p ON ph.product_id = p.id
        WHERE ph.recorded_at >= $1
          AND p.brand IS NOT NULL
        GROUP BY DATE(ph.recorded_at), p.brand
        ORDER BY date DESC, p.brand
      `;
    } else if (group_by === 'shop') {
      trendsQuery = `
        SELECT 
          DATE(ph.recorded_at) as date,
          s.name as shop_name,
          AVG(ph.original_price)::numeric(10,2) as avg_original_price,
          AVG(ph.sale_price)::numeric(10,2) as avg_sale_price,
          AVG(ph.discount_percentage)::numeric(5,2) as avg_discount_percentage,
          COUNT(DISTINCT ph.product_id) as product_count
        FROM price_history ph
        JOIN products p ON ph.product_id = p.id
        LEFT JOIN shops s ON p.shop_id = s.id
        WHERE ph.recorded_at >= $1
        GROUP BY DATE(ph.recorded_at), s.name
        ORDER BY date DESC, s.name
      `;
    } else {
      // Overall trends without grouping
      trendsQuery = `
        SELECT 
          DATE(recorded_at) as date,
          AVG(original_price)::numeric(10,2) as avg_original_price,
          AVG(sale_price)::numeric(10,2) as avg_sale_price,
          AVG(discount_percentage)::numeric(5,2) as avg_discount_percentage,
          COUNT(DISTINCT product_id) as product_count
        FROM price_history
        WHERE recorded_at >= $1
        GROUP BY DATE(recorded_at)
        ORDER BY date DESC
      `;
    }

    const result = await query(trendsQuery, params);

    // Calculate summary statistics
    const summaryQuery = `
      SELECT 
        AVG(discount_percentage)::numeric(5,2) as overall_avg_discount,
        MAX(discount_percentage) as max_discount,
        COUNT(DISTINCT product_id) as total_products_tracked
      FROM price_history
      WHERE recorded_at >= $1
    `;
    const summaryResult = await query(summaryQuery, params);

    logger.info('Trends retrieved', { days, group_by, records: result.rows.length });

    res.json({
      days,
      group_by: group_by || 'none',
      data: result.rows,
      summary: summaryResult.rows[0]
    });
  } catch (error) {
    logger.error('Error retrieving trends', { error: error.message });
    next(error);
  }
});

/**
 * @route GET /analytics/discount-patterns
 * @desc Get discount patterns analysis
 */
router.get('/discount-patterns', async (req, res, next) => {
  try {
    const { error, value } = discountPatternsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    const { pattern_type } = value;

    let patternsQuery;
    let params = [];

    if (pattern_type === 'all') {
      patternsQuery = `
        SELECT 
          dp.id,
          dp.product_id,
          p.title as product_title,
          p.brand,
          p.category,
          dp.pattern_type,
          dp.confidence_score,
          dp.start_date,
          dp.end_date,
          dp.price_before,
          dp.price_after,
          dp.created_at,
          s.name as shop_name
        FROM discount_patterns dp
        JOIN products p ON dp.product_id = p.id
        LEFT JOIN shops s ON p.shop_id = s.id
        WHERE dp.confidence_score >= 0.5
        ORDER BY dp.confidence_score DESC, dp.created_at DESC
        LIMIT 100
      `;
    } else {
      patternsQuery = `
        SELECT 
          dp.id,
          dp.product_id,
          p.title as product_title,
          p.brand,
          p.category,
          dp.pattern_type,
          dp.confidence_score,
          dp.start_date,
          dp.end_date,
          dp.price_before,
          dp.price_after,
          dp.created_at,
          s.name as shop_name
        FROM discount_patterns dp
        JOIN products p ON dp.product_id = p.id
        LEFT JOIN shops s ON p.shop_id = s.id
        WHERE dp.pattern_type = $1
          AND dp.confidence_score >= 0.5
        ORDER BY dp.confidence_score DESC, dp.created_at DESC
        LIMIT 100
      `;
      params = [pattern_type];
    }

    const result = await query(patternsQuery, params);

    // Get pattern type distribution
    const distributionQuery = `
      SELECT 
        pattern_type,
        COUNT(*) as count,
        AVG(confidence_score)::numeric(5,2) as avg_confidence
      FROM discount_patterns
      WHERE confidence_score >= 0.5
      GROUP BY pattern_type
      ORDER BY count DESC
    `;
    const distributionResult = await query(distributionQuery);

    logger.info('Discount patterns retrieved', { pattern_type, records: result.rows.length });

    res.json({
      pattern_type,
      data: result.rows,
      distribution: distributionResult.rows,
      total_patterns: result.rows.length
    });
  } catch (error) {
    logger.error('Error retrieving discount patterns', { error: error.message });
    next(error);
  }
});

/**
 * @route GET /analytics/metrics
 * @desc Get pipeline metrics
 */
router.get('/metrics', async (req, res, next) => {
  try {
    // Pipeline execution metrics
    const pipelineMetricsQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as executions,
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at)))::numeric(10,2) as avg_duration_seconds,
        SUM(records_processed) as total_records_processed,
        SUM(error_count) as total_errors,
        status
      FROM pipeline_executions
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at), status
      ORDER BY date DESC, status
    `;

    // Overall statistics
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM products) as total_products,
        (SELECT COUNT(*) FROM products WHERE last_seen_at >= NOW() - INTERVAL '24 hours') as active_products_24h,
        (SELECT COUNT(*) FROM price_history WHERE recorded_at >= NOW() - INTERVAL '24 hours') as price_records_24h,
        (SELECT COUNT(DISTINCT shop_id) FROM products) as total_shops,
        (SELECT COUNT(*) FROM alerts WHERE is_read = false) as unread_alerts,
        (SELECT COUNT(*) FROM discount_patterns WHERE confidence_score >= 0.7) as high_confidence_patterns
    `;

    // Recent pipeline runs
    const recentRunsQuery = `
      SELECT 
        id,
        pipeline_name,
        status,
        records_processed,
        error_count,
        created_at,
        completed_at,
        EXTRACT(EPOCH FROM (completed_at - created_at))::numeric(10,2) as duration_seconds
      FROM pipeline_executions
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const [metricsResult, statsResult, recentRunsResult] = await Promise.all([
      query(pipelineMetricsQuery),
      query(statsQuery),
      query(recentRunsQuery)
    ]);

    // Calculate success rate
    const successRate = metricsResult.rows.length > 0
      ? (metricsResult.rows.filter(r => r.status === 'completed').length / metricsResult.rows.length * 100).toFixed(2)
      : 100;

    logger.info('Metrics retrieved');

    res.json({
      overview: statsResult.rows[0],
      pipeline_metrics: {
        daily: metricsResult.rows,
        success_rate: `${success_rate}%`,
        recent_runs: recentRunsResult.rows
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error retrieving metrics', { error: error.message });
    next(error);
  }
});

module.exports = router;
