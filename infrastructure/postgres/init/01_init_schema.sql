-- SkateStock Database Schema
-- PostgreSQL schema for product data, analytics, and time-series data

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- ==========================================
-- CORE TABLES
-- ==========================================

-- Products table - normalized product data
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id VARCHAR(255) UNIQUE NOT NULL,
    source_product_id VARCHAR(255),
    sku VARCHAR(100),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    brand VARCHAR(100),
    category VARCHAR(50),
    
    -- Pricing
    original_price DECIMAL(10, 2),
    sale_price DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    discount_percentage DECIMAL(5, 2),
    
    -- Media
    image_url TEXT,
    additional_images TEXT[],
    
    -- Source & Linking
    source VARCHAR(50) NOT NULL,
    product_url TEXT NOT NULL,
    
    -- Availability
    availability VARCHAR(50) DEFAULT 'unknown',
    stock_quantity INTEGER,
    
    -- Metadata
    color VARCHAR(100),
    size VARCHAR(50),
    width DECIMAL(6, 2),
    length DECIMAL(6, 2),
    weight DECIMAL(8, 2),
    wheel_size INTEGER,
    truck_size VARCHAR(20),
    
    -- Data Quality
    confidence_score DECIMAL(3, 2) DEFAULT 1.0,
    validation_errors TEXT[],
    
    -- Timestamps
    scraped_at TIMESTAMP WITH TIME ZONE NOT NULL,
    normalized_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT positive_price CHECK (original_price IS NULL OR original_price >= 0),
    CONSTRAINT positive_sale_price CHECK (sale_price IS NULL OR sale_price >= 0)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_products_source ON products(source);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_availability ON products(availability);
CREATE INDEX IF NOT EXISTS idx_products_scraped_at ON products(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_sale_price ON products(sale_price) WHERE sale_price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_title_trgm ON products USING gin (title gin_trgm_ops);

-- ==========================================
-- PRICE HISTORY
-- ==========================================

-- Time-series table for price tracking
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id VARCHAR(255) NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL,
    
    original_price DECIMAL(10, 2),
    sale_price DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    discount_percentage DECIMAL(5, 2),
    
    availability VARCHAR(50),
    stock_quantity INTEGER,
    
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Partition by time for performance
    CONSTRAINT price_history_pkey PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

-- Create monthly partitions
CREATE TABLE IF NOT EXISTS price_history_2024_01 PARTITION OF price_history
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE IF NOT EXISTS price_history_2024_02 PARTITION OF price_history
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE IF NOT EXISTS price_history_2024_03 PARTITION OF price_history
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
CREATE TABLE IF NOT EXISTS price_history_2024_04 PARTITION OF price_history
    FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');
CREATE TABLE IF NOT EXISTS price_history_2024_05 PARTITION OF price_history
    FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');
CREATE TABLE IF NOT EXISTS price_history_2024_06 PARTITION OF price_history
    FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');
CREATE TABLE IF NOT EXISTS price_history_2024_07 PARTITION OF price_history
    FOR VALUES FROM ('2024-07-01') TO ('2024-08-01');
CREATE TABLE IF NOT EXISTS price_history_2024_08 PARTITION OF price_history
    FOR VALUES FROM ('2024-08-01') TO ('2024-09-01');
CREATE TABLE IF NOT EXISTS price_history_2024_09 PARTITION OF price_history
    FOR VALUES FROM ('2024-09-01') TO ('2024-10-01');
CREATE TABLE IF NOT EXISTS price_history_2024_10 PARTITION OF price_history
    FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');
CREATE TABLE IF NOT EXISTS price_history_2024_11 PARTITION OF price_history
    FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
CREATE TABLE IF NOT EXISTS price_history_2024_12 PARTITION OF price_history
    FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded ON price_history(recorded_at DESC);

-- ==========================================
-- DISCOUNT PATTERNS
-- ==========================================

CREATE TABLE IF NOT EXISTS discount_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id VARCHAR(255) NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    pattern_type VARCHAR(50) NOT NULL,  -- flash_sale, seasonal, clearance, etc.
    discount_percentage DECIMAL(5, 2) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    confidence DECIMAL(3, 2),
    features JSONB,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_patterns_product ON discount_patterns(product_id);
CREATE INDEX IF NOT EXISTS idx_discount_patterns_type ON discount_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_discount_patterns_detected ON discount_patterns(detected_at DESC);

-- ==========================================
-- AVAILABILITY FORECASTS
-- ==========================================

CREATE TABLE IF NOT EXISTS availability_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id VARCHAR(255) NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    predicted_availability VARCHAR(50) NOT NULL,
    confidence DECIMAL(3, 2) NOT NULL,
    prediction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    features JSONB,
    actual_availability VARCHAR(50),  -- For model validation
    accuracy DECIMAL(3, 2),  -- Calculated after actual outcome
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_availability_forecasts_product ON availability_forecasts(product_id);
CREATE INDEX IF NOT EXISTS idx_availability_forecasts_date ON availability_forecasts(prediction_date);

-- ==========================================
-- DATA SOURCES TRACKING
-- ==========================================

CREATE TABLE IF NOT EXISTS data_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_name VARCHAR(100) UNIQUE NOT NULL,
    source_type VARCHAR(50) NOT NULL,  -- scraper, api, webhook
    base_url TEXT,
    api_endpoint TEXT,
    scraping_strategy JSONB,
    
    -- Status tracking
    is_active BOOLEAN DEFAULT true,
    last_scrape_at TIMESTAMP WITH TIME ZONE,
    last_successful_scrape_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    error_count INTEGER DEFAULT 0,
    
    -- Performance metrics
    avg_scrape_duration_ms INTEGER,
    products_per_scrape INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert known sources
INSERT INTO data_sources (source_name, source_type, base_url, scraping_strategy)
VALUES 
    ('seasons_skateshop', 'scraper', 'https://seasonsskateshop.com', '{"method": "cheerio", "pagination": true}'),
    ('premier_store', 'scraper', 'https://thepremierstore.com', '{"method": "json_api", "pagination": true}'),
    ('labor_skateshop', 'scraper', 'https://laborskateshop.com', '{"method": "json_api", "pagination": true}'),
    ('nj_skateshop', 'scraper', 'https://njskateshop.com', '{"method": "json_api", "pagination": true}'),
    ('blacksheep_skateshop', 'scraper', 'https://blacksheepskateshop.com', '{"method": "json_api", "pagination": true}'),
    ('tactics', 'scraper', 'https://tactics.com', '{"method": "cheerio", "pagination": true}'),
    ('ccs', 'scraper', 'https://shop.ccs.com', '{"method": "cheerio", "pagination": true}')
ON CONFLICT (source_name) DO NOTHING;

-- ==========================================
-- PIPELINE METRICS
-- ==========================================

CREATE TABLE IF NOT EXISTS pipeline_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15, 4) NOT NULL,
    metric_type VARCHAR(20) DEFAULT 'gauge',  -- gauge, counter, histogram
    dimensions JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_name ON pipeline_metrics(metric_name, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_recorded ON pipeline_metrics(recorded_at DESC);

-- ==========================================
-- DEAD LETTER QUEUE
-- ==========================================

CREATE TABLE IF NOT EXISTS dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(255),
    original_topic VARCHAR(100),
    original_partition INTEGER,
    original_offset BIGINT,
    original_event JSONB,
    error_message TEXT,
    error_type VARCHAR(100),
    error_stack_trace TEXT,
    processing_stage VARCHAR(50),
    retry_count INTEGER DEFAULT 0,
    failed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dlq_failed_at ON dead_letter_queue(failed_at DESC);
CREATE INDEX IF NOT EXISTS idx_dlq_event_id ON dead_letter_queue(event_id);

-- ==========================================
-- VIEWS
-- ==========================================

-- Active deals view
CREATE OR REPLACE VIEW active_deals AS
SELECT 
    p.*,
    ph.sale_price as previous_sale_price,
    CASE 
        WHEN ph.sale_price IS NOT NULL AND p.sale_price < ph.sale_price 
        THEN 'price_drop'
        WHEN ph.sale_price IS NULL AND p.sale_price IS NOT NULL
        THEN 'new_sale'
        ELSE 'ongoing'
    END as deal_status
FROM products p
LEFT JOIN LATERAL (
    SELECT sale_price 
    FROM price_history 
    WHERE product_id = p.product_id 
    ORDER BY recorded_at DESC 
    LIMIT 1 OFFSET 1
) ph ON true
WHERE p.sale_price IS NOT NULL 
  AND p.availability = 'in_stock'
  AND p.sale_price < COALESCE(p.original_price, p.sale_price * 1.2);

-- Daily aggregation view
CREATE OR REPLACE VIEW daily_product_stats AS
SELECT 
    DATE_TRUNC('day', scraped_at) as date,
    source,
    COUNT(*) as product_count,
    COUNT(DISTINCT brand) as brand_count,
    COUNT(DISTINCT category) as category_count,
    AVG(discount_percentage) as avg_discount,
    MAX(discount_percentage) as max_discount,
    COUNT(*) FILTER (WHERE sale_price IS NOT NULL) as deals_count
FROM products
GROUP BY DATE_TRUNC('day', scraped_at), source
ORDER BY date DESC;

-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_data_sources_updated_at 
    BEFORE UPDATE ON data_sources 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-archive price history trigger
CREATE OR REPLACE FUNCTION archive_price_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only insert if price changed
    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.sale_price IS DISTINCT FROM NEW.sale_price OR 
            OLD.original_price IS DISTINCT FROM NEW.original_price OR
            OLD.availability IS DISTINCT FROM NEW.availability) THEN
            
            INSERT INTO price_history (
                product_id, source, original_price, sale_price, 
                currency, discount_percentage, availability, stock_quantity
            ) VALUES (
                NEW.product_id, NEW.source, NEW.original_price, NEW.sale_price,
                NEW.currency, NEW.discount_percentage, NEW.availability, NEW.stock_quantity
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER price_change_archive
    AFTER UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION archive_price_change();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO skatestock;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO skatestock;
