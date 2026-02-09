/**
 * Products Routes
 * Handles product listing, details, and price history
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
  defaultMeta: { service: 'products-route' },
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
const listProductsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  shop: Joi.string().trim().optional(),
  category: Joi.string().trim().optional(),
  brand: Joi.string().trim().optional(),
  min_discount: Joi.number().min(0).max(100).optional(),
  search: Joi.string().trim().optional()
});

const getProductSchema = Joi.object({
  id: Joi.number().integer().positive().required()
});

const priceHistorySchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  days: Joi.number().integer().min(1).max(365).default(30)
});

/**
 * @route GET /products
 * @desc List products with pagination and filtering
 */
router.get('/', async (req, res, next) => {
  try {
    // Validate query parameters
    const { error, value } = listProductsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    const { page, limit, shop, category, brand, min_discount, search } = value;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (shop) {
      conditions.push(`(s.name ILIKE $${paramIndex} OR s.id::text = $${paramIndex})`);
      params.push(`%${shop}%`);
      paramIndex++;
    }

    if (category) {
      conditions.push(`p.category ILIKE $${paramIndex}`);
      params.push(`%${category}%`);
      paramIndex++;
    }

    if (brand) {
      conditions.push(`p.brand ILIKE $${paramIndex}`);
      params.push(`%${brand}%`);
      paramIndex++;
    }

    if (min_discount !== undefined) {
      conditions.push(`p.discount_percentage >= $${paramIndex}`);
      params.push(min_discount);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(p.title ILIKE $${paramIndex} OR p.brand ILIKE $${paramIndex} OR p.category ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total items
    const countQuery = `
      SELECT COUNT(*) 
      FROM products p
      LEFT JOIN shops s ON p.shop_id = s.id
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const totalItems = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalItems / limit);

    // Fetch products
    const productParams = [...params, limit, offset];
    const productsQuery = `
      SELECT 
        p.id,
        p.external_id,
        p.title,
        p.brand,
        p.category,
        p.original_price,
        p.sale_price,
        p.discount_percentage,
        p.currency,
        p.image_url,
        p.product_url,
        p.availability_status,
        p.shop_id,
        s.name as shop_name,
        p.first_seen_at,
        p.last_seen_at
      FROM products p
      LEFT JOIN shops s ON p.shop_id = s.id
      ${whereClause}
      ORDER BY p.last_seen_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const productsResult = await query(productsQuery, productParams);

    logger.info('Products listed', {
      page,
      limit,
      totalItems,
      filters: { shop, category, brand, min_discount, search }
    });

    res.json({
      data: productsResult.rows,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_items: totalItems,
        has_next: page < totalPages,
        has_prev: page > 1
      }
    });
  } catch (error) {
    logger.error('Error listing products', { error: error.message });
    next(error);
  }
});

/**
 * @route GET /products/:id
 * @desc Get a single product by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { error, value } = getProductSchema.validate({ id: req.params.id });
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    const { id } = value;

    const productQuery = `
      SELECT 
        p.id,
        p.external_id,
        p.title,
        p.brand,
        p.category,
        p.original_price,
        p.sale_price,
        p.discount_percentage,
        p.currency,
        p.image_url,
        p.product_url,
        p.availability_status,
        p.shop_id,
        s.name as shop_name,
        p.first_seen_at,
        p.last_seen_at,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN shops s ON p.shop_id = s.id
      WHERE p.id = $1
    `;

    const result = await query(productQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Product with ID ${id} not found`
      });
    }

    logger.info('Product retrieved', { productId: id });
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error retrieving product', { error: error.message, productId: req.params.id });
    next(error);
  }
});

/**
 * @route GET /products/:id/price-history
 * @desc Get price history for a product
 */
router.get('/:id/price-history', async (req, res, next) => {
  try {
    const { error, value } = priceHistorySchema.validate({
      id: req.params.id,
      days: req.query.days
    });
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message
      });
    }

    const { id, days } = value;

    // Check if product exists
    const productCheck = await query('SELECT id FROM products WHERE id = $1', [id]);
    if (productCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Product with ID ${id} not found`
      });
    }

    const historyQuery = `
      SELECT 
        ph.id,
        ph.product_id,
        ph.original_price,
        ph.sale_price,
        ph.discount_percentage,
        ph.availability_status,
        ph.recorded_at,
        ph.created_at
      FROM price_history ph
      WHERE ph.product_id = $1
        AND ph.recorded_at >= NOW() - INTERVAL '${days} days'
      ORDER BY ph.recorded_at ASC
    `;

    const result = await query(historyQuery, [id]);

    // Calculate price statistics
    const statsQuery = `
      SELECT 
        MIN(sale_price) as lowest_price,
        MAX(sale_price) as highest_price,
        AVG(sale_price)::numeric(10,2) as average_price,
        MIN(original_price) as lowest_original,
        MAX(original_price) as highest_original
      FROM price_history
      WHERE product_id = $1
        AND recorded_at >= NOW() - INTERVAL '${days} days'
    `;
    const statsResult = await query(statsQuery, [id]);

    logger.info('Price history retrieved', { productId: id, days, records: result.rows.length });

    res.json({
      product_id: id,
      days,
      data: result.rows,
      statistics: statsResult.rows[0]
    });
  } catch (error) {
    logger.error('Error retrieving price history', { error: error.message, productId: req.params.id });
    next(error);
  }
});

module.exports = router;
