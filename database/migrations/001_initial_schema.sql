-- SkateStock Database Schema
-- PostgreSQL 15
-- Supports: 5,000+ products/day, real-time analytics, price history tracking

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Shops/Retailers table
CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    base_url VARCHAR(255) NOT NULL,
    api_endpoint VARCHAR(255),
    location VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    scraping_enabled BOOLEAN DEFAULT true,
    scrape_frequency_minutes INTEGER DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Product Categories (skate industry specific)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(50) NOT NULL,
    parent_category_id UUID REFERENCES categories(id),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brands table
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    is_skater_owned BOOLEAN DEFAULT false,
    website_url VARCHAR(255),
    logo_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table (normalized and indexed for fast queries)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id),
    brand_id UUID REFERENCES brands(id),
    
    -- Core product data
    external_id VARCHAR(100) NOT NULL,  -- Original ID from shop
    title VARCHAR(500) NOT NULL,
    description TEXT,
    sku VARCHAR(100),
    
    -- URLs
    product_url TEXT NOT NULL,
    image_url TEXT,
    
    -- Pricing (stored as integers to avoid floating point issues)
    original_price_cents INTEGER,
    sale_price_cents INTEGER NOT NULL,
    currency_code VARCHAR(3) DEFAULT 'USD',
    
    -- Availability tracking
    in_stock BOOLEAN DEFAULT true,
    stock_quantity INTEGER,
    availability_status VARCHAR(50) DEFAULT 'in_stock',
    
    -- Product attributes (flexible JSONB for different product types)
    attributes JSONB DEFAULT '{}',
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    is_on_sale BOOLEAN DEFAULT false,
    discount_percentage DECIMAL(5,2),
    
    -- Data quality tracking
    data_quality_score DECIMAL(3,2) DEFAULT 1.0,
    last_scraped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_prices CHECK (sale_price_cents >= 0),
    CONSTRAINT valid_discount CHECK (discount_percentage IS NULL OR (discount_percentage >= 0 AND discount_percentage <= 100))
);

-- Create unique constraint on shop_id + external_id (deduplication)
CREATE UNIQUE INDEX idx_products_shop_external ON products(shop_id, external_id);

-- ============================================================================
-- PRICE HISTORY & ANALYTICS TABLES
-- ============================================================================

-- Price history tracking (time-series data)
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    original_price_cents INTEGER,
    sale_price_cents INTEGER NOT NULL,
    in_stock BOOLEAN,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    event_type VARCHAR(50) DEFAULT 'price_check'  -- price_check, sale_started, sale_ended, restock
);

-- Price trends (pre-aggregated for fast dashboard queries)
CREATE TABLE price_trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    avg_price_cents INTEGER,
    min_price_cents INTEGER,
    max_price_cents INTEGER,
    price_volatility DECIMAL(10,4),  -- Standard deviation
    trend_direction VARCHAR(20),  -- rising, falling, stable
    UNIQUE(product_id, date)
);

-- Discount patterns (for analytics)
CREATE TABLE discount_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id),
    brand_id UUID REFERENCES brands(id),
    pattern_type VARCHAR(50) NOT NULL,  -- flash_sale, seasonal, clearance, etc.
    avg_discount_percentage DECIMAL(5,2),
    frequency VARCHAR(20),  -- weekly, monthly, quarterly
    typical_start_day INTEGER,  -- 0-6 for day of week
    typical_duration_days INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- DEDUPLICATION & DATA QUALITY
-- ============================================================================

-- Product fingerprints for deduplication
CREATE TABLE product_fingerprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fingerprint_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 hash
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    title_normalized TEXT,
    brand_normalized VARCHAR(100),
    price_range_cents INTEGER,  -- Bucketed price for fuzzy matching
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days'
);

-- Data quality issues tracking
CREATE TABLE data_quality_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    issue_type VARCHAR(50) NOT NULL,  -- missing_image, invalid_price, duplicate, etc.
    severity VARCHAR(20) NOT NULL,  -- low, medium, high, critical
    description TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    is_resolved BOOLEAN DEFAULT false
);

-- ============================================================================
-- ALERTS & NOTIFICATIONS
-- ============================================================================

-- Alert configurations
CREATE TABLE alert_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,  -- price_drop, restock, low_stock, new_product
    filters JSONB NOT NULL,  -- {brands: [], categories: [], shops: [], min_discount: 20}
    notification_channels JSONB DEFAULT '["email"]',  -- email, webhook, slack
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alert history
CREATE TABLE alert_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_config_id UUID REFERENCES alert_configs(id),
    product_id UUID REFERENCES products(id),
    triggered_value TEXT,  -- e.g., "Price dropped from $100 to $75"
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    channel VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending'  -- pending, sent, failed
);

-- ============================================================================
-- EVENT TRACKING (for Kafka consumers)
-- ============================================================================

-- Kafka event offset tracking (for exactly-once semantics)
CREATE TABLE kafka_consumer_offsets (
    consumer_group VARCHAR(100) NOT NULL,
    topic VARCHAR(100) NOT NULL,
    partition INTEGER NOT NULL,
    offset BIGINT NOT NULL,
    last_processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (consumer_group, topic, partition)
);

-- Event processing log
CREATE TABLE event_processing_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(100) NOT NULL UNIQUE,
    topic VARCHAR(100) NOT NULL,
    partition INTEGER NOT NULL,
    offset BIGINT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    payload_hash VARCHAR(64),  -- For idempotency
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_time_ms INTEGER,
    status VARCHAR(20) DEFAULT 'success',  -- success, failed, skipped
    error_message TEXT
);

-- ============================================================================
-- PERFORMANCE METRICS
-- ============================================================================

-- System performance metrics
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    unit VARCHAR(20),  -- ms, req/s, percent, count
    tags JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scraping metrics
CREATE TABLE scraping_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES shops(id),
    run_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    run_completed_at TIMESTAMP WITH TIME ZONE,
    products_scraped INTEGER DEFAULT 0,
    products_new INTEGER DEFAULT 0,
    products_updated INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    duration_seconds INTEGER,
    status VARCHAR(20) DEFAULT 'running'  -- running, completed, failed
);

-- ============================================================================
-- INDICES FOR PERFORMANCE
-- ============================================================================

-- Product search indices
CREATE INDEX idx_products_title_trgm ON products USING gin (title gin_trgm_ops);
CREATE INDEX idx_products_shop ON products(shop_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_sale ON products(is_on_sale) WHERE is_on_sale = true;
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = true;
CREATE INDEX idx_products_price ON products(sale_price_cents);
CREATE INDEX idx_products_discount ON products(discount_percentage) WHERE discount_percentage IS NOT NULL;
CREATE INDEX idx_products_updated ON products(updated_at);

-- Price history indices
CREATE INDEX idx_price_history_product ON price_history(product_id);
CREATE INDEX idx_price_history_recorded ON price_history(recorded_at);
CREATE INDEX idx_price_history_product_date ON price_history(product_id, recorded_at);

-- Analytics indices
CREATE INDEX idx_price_trends_product_date ON price_trends(product_id, date);
CREATE INDEX idx_price_trends_date ON price_trends(date);

-- Event tracking indices
CREATE INDEX idx_event_log_topic_offset ON event_processing_log(topic, partition, offset);
CREATE INDEX idx_event_log_event_id ON event_processing_log(event_id);
CREATE INDEX idx_event_log_processed ON event_processing_log(processed_at);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert shops (current scrapers)
INSERT INTO shops (name, display_name, base_url, location, scrape_frequency_minutes) VALUES
('seasons', 'Seasons Skate Shop', 'https://seasonsskateshop.com', 'New York, NY', 60),
('premier', 'Premier Store', 'https://thepremierstore.com', 'Michigan', 60),
('labor', 'Labor Skate Shop', 'https://laborskateshop.com', 'New York, NY', 60),
('nj', 'NJ Skate Shop', 'https://njskateshop.com', 'New Jersey', 60),
('blacksheep', 'Black Sheep Skate Shop', 'https://blacksheepskateshop.com', 'North Carolina', 60);

-- Insert skate industry categories
INSERT INTO categories (name, display_name, sort_order) VALUES
('decks', 'Decks', 1),
('trucks', 'Trucks', 2),
('wheels', 'Wheels', 3),
('bearings', 'Bearings', 4),
('hardware', 'Hardware', 5),
('shoes', 'Shoes', 6),
('apparel', 'Apparel', 7),
('accessories', 'Accessories', 8),
('complete', 'Complete Skateboards', 9);

-- Insert popular skate brands
INSERT INTO brands (name, display_name, is_skater_owned) VALUES
('baker', 'Baker', true),
('independent', 'Independent Truck Company', true),
('spitfire', 'Spitfire Wheels', true),
('vans', 'Vans', false),
('nike sb', 'Nike SB', false),
('thrasher', 'Thrasher Magazine', true),
('anti hero', 'Anti Hero', true),
('santa cruz', 'Santa Cruz', false),
('element', 'Element', false),
('thunder', 'Thunder Trucks', true),
('bones', 'Bones Bearings', true),
('mob', 'Mob Grip', true);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Active products with shop info
CREATE VIEW v_active_products AS
SELECT 
    p.*,
    s.name as shop_name,
    s.display_name as shop_display_name,
    c.name as category_name,
    c.display_name as category_display_name,
    b.name as brand_name,
    b.display_name as brand_display_name
FROM products p
JOIN shops s ON p.shop_id = s.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id
WHERE p.is_active = true;

-- Current deals (products on sale)
CREATE VIEW v_current_deals AS
SELECT 
    p.*,
    s.display_name as shop_name,
    (p.original_price_cents - p.sale_price_cents) as discount_cents,
    ROUND((p.original_price_cents - p.sale_price_cents)::numeric / p.original_price_cents * 100, 2) as discount_percent
FROM products p
JOIN shops s ON p.shop_id = s.id
WHERE p.is_on_sale = true 
  AND p.is_active = true
  AND p.in_stock = true;

-- Price change summary (last 24 hours)
CREATE VIEW v_price_changes_24h AS
SELECT 
    p.id,
    p.title,
    s.display_name as shop_name,
    ph_old.sale_price_cents as old_price_cents,
    ph_new.sale_price_cents as new_price_cents,
    (ph_new.sale_price_cents - ph_old.sale_price_cents) as price_change_cents,
    ph_new.recorded_at as changed_at
FROM products p
JOIN shops s ON p.shop_id = s.id
JOIN LATERAL (
    SELECT sale_price_cents, recorded_at 
    FROM price_history 
    WHERE product_id = p.id 
    ORDER BY recorded_at DESC 
    LIMIT 1
) ph_new ON true
JOIN LATERAL (
    SELECT sale_price_cents 
    FROM price_history 
    WHERE product_id = p.id 
    ORDER BY recorded_at DESC 
    OFFSET 1 
    LIMIT 1
) ph_old ON true
WHERE ph_new.recorded_at > NOW() - INTERVAL '24 hours'
  AND ph_new.sale_price_cents != ph_old.sale_price_cents;

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate discount percentage
CREATE OR REPLACE FUNCTION calculate_discount_percentage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.original_price_cents IS NOT NULL AND NEW.original_price_cents > 0 THEN
        NEW.discount_percentage := ROUND(
            ((NEW.original_price_cents - NEW.sale_price_cents)::numeric / NEW.original_price_cents * 100), 
            2
        );
        NEW.is_on_sale := NEW.sale_price_cents < NEW.original_price_cents;
    ELSE
        NEW.discount_percentage := NULL;
        NEW.is_on_sale := false;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-calculate discount
CREATE TRIGGER calculate_product_discount BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION calculate_discount_percentage();

-- Function to log price changes
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.sale_price_cents IS DISTINCT FROM NEW.sale_price_cents OR
           OLD.original_price_cents IS DISTINCT FROM NEW.original_price_cents OR
           OLD.in_stock IS DISTINCT FROM NEW.in_stock THEN
            INSERT INTO price_history (product_id, original_price_cents, sale_price_cents, in_stock)
            VALUES (NEW.id, NEW.original_price_cents, NEW.sale_price_cents, NEW.in_stock);
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO price_history (product_id, original_price_cents, sale_price_cents, in_stock)
        VALUES (NEW.id, NEW.original_price_cents, NEW.sale_price_cents, NEW.in_stock);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-log price history
CREATE TRIGGER log_price_history AFTER INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION log_price_change();

-- ============================================================================
-- PARTITIONING SETUP (for price_history at scale)
-- ============================================================================

-- Create partition for current month
-- Note: In production, you'd set up automatic partition creation
CREATE TABLE IF NOT EXISTS price_history_2024_01 PARTITION OF price_history
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Add comment explaining partitioning strategy
COMMENT ON TABLE price_history IS 'Partitioned by month for efficient time-series queries. Create new partitions monthly.';
