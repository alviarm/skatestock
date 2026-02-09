-- SkateStock Database Schema
-- Production-Grade E-commerce Data Intelligence Platform
-- Supports: 5,000+ products daily, real-time analytics, time-series data

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ==========================================
-- CORE TABLES
-- ==========================================

-- Shops/Retailers table
CREATE TABLE IF NOT EXISTS shops (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    website_url VARCHAR(255),
    location VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    scraping_enabled BOOLEAN DEFAULT true,
    rate_limit_requests_per_minute INTEGER DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Product categories for skate industry
CREATE TABLE IF NOT EXISTS product_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(50) NOT NULL,
    parent_category_id INTEGER REFERENCES product_categories(id),
    description TEXT,
    typical_price_range_min DECIMAL(10,2),
    typical_price_range_max DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Brands table
CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    category VARCHAR(50), -- 'skate', 'streetwear', 'footwear', etc.
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Main products table
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    external_id VARCHAR(255) NOT NULL,
    shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    brand_id INTEGER REFERENCES brands(id),
    category_id INTEGER REFERENCES product_categories(id),
    
    -- Price information
    original_price DECIMAL(10,2),
    sale_price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    discount_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN original_price > 0 AND sale_price > 0 
            THEN ROUND(((original_price - sale_price) / original_price * 100), 2)
            ELSE 0
        END
    ) STORED,
    discount_amount DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE 
            WHEN original_price > 0 AND sale_price > 0 
            THEN original_price - sale_price
            ELSE 0
        END
    ) STORED,
    
    -- Product details
    sku VARCHAR(100),
    upc VARCHAR(50),
    image_url VARCHAR(500),
    product_url VARCHAR(500) NOT NULL,
    
    -- Availability
    availability_status VARCHAR(50) DEFAULT 'in_stock',
    stock_quantity INTEGER,
    
    -- Metadata
    raw_data JSONB,
    is_active BOOLEAN DEFAULT true,
    is_duplicate BOOLEAN DEFAULT false,
    duplicate_of_id BIGINT REFERENCES products(id),
    
    -- Timestamps
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_shop_external_id UNIQUE (shop_id, external_id)
);

-- Price history for time-series analysis
CREATE TABLE IF NOT EXISTS price_history (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    original_price DECIMAL(10,2),
    sale_price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    availability_status VARCHAR(50),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create hypertable for price_history (if using TimescaleDB)
-- SELECT create_hypertable('price_history', 'recorded_at');

-- ==========================================
-- DATA PIPELINE TABLES
-- ==========================================

-- Kafka offset tracking for exactly-once semantics
CREATE TABLE IF NOT EXISTS kafka_consumer_offsets (
    consumer_group VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    partition INTEGER NOT NULL,
    offset BIGINT NOT NULL,
    metadata VARCHAR(255),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (consumer_group, topic, partition)
);

-- Dead letter queue for failed records
CREATE TABLE IF NOT EXISTS dead_letter_queue (
    id BIGSERIAL PRIMARY KEY,
    topic VARCHAR(255) NOT NULL,
    partition INTEGER,
    offset BIGINT,
    key VARCHAR(255),
    value JSONB,
    error_message TEXT,
    error_stack TEXT,
    retry_count INTEGER DEFAULT 0,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Deduplication fingerprints using bloom filter equivalent
CREATE TABLE IF NOT EXISTS product_fingerprints (
    id BIGSERIAL PRIMARY KEY,
    fingerprint VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash
    product_id BIGINT REFERENCES products(id),
    shop_id INTEGER NOT NULL,
    title_hash VARCHAR(64),
    price_hash VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
);

-- Create index for fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_fingerprints_lookup ON product_fingerprints(fingerprint, shop_id);

-- ==========================================
-- ANALYTICS TABLES
-- ==========================================

-- Aggregated price trends
CREATE TABLE IF NOT EXISTS price_trends (
    id BIGSERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES product_categories(id),
    brand_id INTEGER REFERENCES brands(id),
    shop_id INTEGER REFERENCES shops(id),
    date DATE NOT NULL,
    avg_original_price DECIMAL(10,2),
    avg_sale_price DECIMAL(10,2),
    avg_discount_percentage DECIMAL(5,2),
    product_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, brand_id, shop_id, date)
);

-- Discount pattern detection results
CREATE TABLE IF NOT EXISTS discount_patterns (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    pattern_type VARCHAR(50) NOT NULL, -- 'flash_sale', 'gradual_discount', 'price_increase', etc.
    confidence_score DECIMAL(4,3), -- 0.000 to 1.000
    start_date DATE NOT NULL,
    end_date DATE,
    price_before DECIMAL(10,2),
    price_after DECIMAL(10,2),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Availability forecasting
CREATE TABLE IF NOT EXISTS availability_forecasts (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    forecast_date DATE NOT NULL,
    predicted_status VARCHAR(50),
    confidence_score DECIMAL(4,3),
    model_version VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, forecast_date)
);

-- Performance metrics
CREATE TABLE IF NOT EXISTS pipeline_metrics (
    id BIGSERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,6),
    metric_unit VARCHAR(20),
    labels JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- ALERTS & NOTIFICATIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL, -- 'price_drop', 'back_in_stock', 'new_product', etc.
    product_id BIGINT REFERENCES products(id),
    shop_id INTEGER REFERENCES shops(id),
    severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'critical'
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Product indexes
CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_discount ON products(discount_percentage) WHERE discount_percentage > 0;
CREATE INDEX IF NOT EXISTS idx_products_last_seen ON products(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at);

-- Full-text search index on product titles
CREATE INDEX IF NOT EXISTS idx_products_title_search ON products USING gin(to_tsvector('english', title));

-- Price history indexes
CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded ON price_history(recorded_at);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_price_trends_date ON price_trends(date);
CREATE INDEX IF NOT EXISTS idx_discount_patterns_product ON discount_patterns(product_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(is_read) WHERE is_read = false;

-- ==========================================
-- SEED DATA
-- ==========================================

-- Insert skate shops
INSERT INTO shops (name, display_name, website_url, location) VALUES
    ('seasons', 'Seasons Skate Shop', 'https://seasonsskateshop.com', 'Albany, NY'),
    ('premier', 'Premier Store', 'https://thepremierstore.com', 'Virginia Beach, VA'),
    ('labor', 'Labor Skate Shop', 'https://laborskateshop.com', 'New York, NY'),
    ('nj', 'NJ Skate Shop', 'https://njskateshop.com', 'New Jersey'),
    ('blacksheep', 'Black Sheep Skate Shop', 'https://blacksheepskateshop.com', 'Charlotte, NC')
ON CONFLICT (name) DO NOTHING;

-- Insert product categories
INSERT INTO product_categories (name, display_name, description) VALUES
    ('decks', 'Decks', 'Skateboard decks from various brands'),
    ('trucks', 'Trucks', 'Skateboard trucks and hardware'),
    ('wheels', 'Wheels', 'Skateboard wheels'),
    ('bearings', 'Bearings', 'Skateboard bearings'),
    ('shoes', 'Shoes', 'Skate shoes and sneakers'),
    ('apparel', 'Apparel', 'Skate clothing and accessories'),
    ('t-shirts', 'T-Shirts', 'Skate t-shirts'),
    ('sweatshirts', 'Sweatshirts & Hoodies', 'Sweatshirts and hoodies'),
    ('pants', 'Pants & Shorts', 'Skate pants and shorts'),
    ('hats', 'Hats & Beanies', 'Hats, caps, and beanies'),
    ('accessories', 'Accessories', 'Skate accessories and misc items'),
    ('videos', 'Videos & DVDs', 'Skate videos and DVDs'),
    ('hardware', 'Hardware', 'Skateboard hardware')
ON CONFLICT (name) DO NOTHING;

-- Insert major skate brands
INSERT INTO brands (name, display_name, category, is_premium) VALUES
    ('nike sb', 'Nike SB', 'footwear', true),
    ('vans', 'Vans', 'footwear', false),
    ('adidas', 'Adidas Skateboarding', 'footwear', true),
    ('cons', 'Converse CONS', 'footwear', false),
    ('new balance', 'New Balance Numeric', 'footwear', true),
    ('asic', 'ASICS', 'footwear', false),
    ('dc', 'DC Shoes', 'footwear', false),
    ('baker', 'Baker', 'skate', false),
    ('thrasher', 'Thrasher', 'skate', false),
    ('independent', 'Independent Trucks', 'skate', false),
    ('spitfire', 'Spitfire Wheels', 'skate', false),
    ('bronson', 'Bronson Bearings', 'skate', false),
    ('mob', 'Mob Grip', 'skate', false),
    ('diamond', 'Diamond Supply Co.', 'skate', false),
    ('polar', 'Polar Skate Co.', 'skate', true),
    ('palace', 'Palace Skateboards', 'skate', true),
    ('supreme', 'Supreme', 'streetwear', true),
    ('dime', 'Dime MTL', 'skate', true),
    ('hockey', 'Hockey', 'skate', false),
    ('fa', 'Fucking Awesome', 'skate', false)
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for shops
DROP TRIGGER IF EXISTS update_shops_updated_at ON shops;
CREATE TRIGGER update_shops_updated_at
    BEFORE UPDATE ON shops
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to record price history
CREATE OR REPLACE FUNCTION record_price_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only record if price has changed
    IF (TG_OP = 'UPDATE' AND (OLD.sale_price IS DISTINCT FROM NEW.sale_price OR 
                               OLD.original_price IS DISTINCT FROM NEW.original_price OR
                               OLD.availability_status IS DISTINCT FROM NEW.availability_status)) THEN
        INSERT INTO price_history (product_id, original_price, sale_price, availability_status)
        VALUES (NEW.id, NEW.original_price, NEW.sale_price, NEW.availability_status);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for price history
DROP TRIGGER IF EXISTS trg_record_price_history ON products;
CREATE TRIGGER trg_record_price_history
    AFTER UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION record_price_history();

-- Function to set last_updated_at
CREATE OR REPLACE FUNCTION set_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_products_last_updated ON products;
CREATE TRIGGER trg_products_last_updated
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION set_last_updated();

-- ==========================================
-- VIEWS FOR COMMON QUERIES
-- ==========================================

-- Active products with latest info
CREATE OR REPLACE VIEW active_products AS
SELECT 
    p.*,
    s.name as shop_name,
    s.display_name as shop_display_name,
    c.display_name as category_name,
    b.display_name as brand_name
FROM products p
JOIN shops s ON p.shop_id = s.id
LEFT JOIN product_categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id
WHERE p.is_active = true;

-- Daily deal summary
CREATE OR REPLACE VIEW daily_deals AS
SELECT 
    DATE(p.created_at) as date,
    s.display_name as shop_name,
    COUNT(*) as new_products,
    COUNT(*) FILTER (WHERE p.discount_percentage > 0) as discounted_products,
    AVG(p.discount_percentage) FILTER (WHERE p.discount_percentage > 0) as avg_discount,
    MAX(p.discount_percentage) as max_discount
FROM products p
JOIN shops s ON p.shop_id = s.id
WHERE p.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(p.created_at), s.display_name
ORDER BY date DESC;

-- Price trend summary
CREATE OR REPLACE VIEW price_trend_summary AS
SELECT 
    c.display_name as category,
    b.display_name as brand,
    s.display_name as shop,
    DATE_TRUNC('day', ph.recorded_at) as date,
    AVG(ph.sale_price) as avg_price,
    COUNT(DISTINCT ph.product_id) as product_count
FROM price_history ph
JOIN products p ON ph.product_id = p.id
LEFT JOIN product_categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN shops s ON p.shop_id = s.id
WHERE ph.recorded_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.display_name, b.display_name, s.display_name, DATE_TRUNC('day', ph.recorded_at)
ORDER BY date DESC;

-- ==========================================
-- COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON TABLE products IS 'Core product catalog with 5,000+ daily updates from 5+ sources';
COMMENT ON TABLE price_history IS 'Time-series price data for trend analysis';
COMMENT ON TABLE kafka_consumer_offsets IS 'Exactly-once semantics tracking';
COMMENT ON TABLE dead_letter_queue IS 'Failed record storage for retry logic';
COMMENT ON TABLE product_fingerprints IS 'Deduplication using SHA-256 fingerprints';
COMMENT ON TABLE price_trends IS 'Aggregated analytics for BI dashboard';
COMMENT ON TABLE discount_patterns IS 'ML-detected discount patterns and flash sales';
COMMENT ON TABLE availability_forecasts IS 'ML predictions for stock availability';
COMMENT ON TABLE pipeline_metrics IS 'Performance benchmarks and latency metrics';
COMMENT ON TABLE alerts IS 'Real-time notifications for price drops and restocks';
