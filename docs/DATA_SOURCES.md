# SkateStock Data Sources

This document details the 5+ independent e-commerce sources integrated into the SkateStock data pipeline, supporting 5,000+ products daily.

## Overview

SkateStock aggregates product data from independent skate shops across North America. Our data pipeline processes real-time updates from each source using Apache Kafka for event streaming.

## Data Sources

### 1. Seasons Skate Shop

| Attribute            | Value                                  |
| -------------------- | -------------------------------------- |
| **Location**         | Albany, NY                             |
| **Website**          | https://seasonsskateshop.com           |
| **Shop ID**          | 1                                      |
| **Products**         | 500-800 active                         |
| **Update Frequency** | Every 30 minutes                       |
| **Data Points**      | Title, price, image, URL, product type |

**Scraping Strategy:**

- Target: `/collections/sale-items` endpoint
- Method: Shopify HTML scraping with meta JSON extraction
- Pagination: Up to 20 pages
- Rate Limit: 2 seconds between requests

**Data Schema:**

```json
{
  "productId": "string (Shopify ID)",
  "title": "string",
  "salePrice": "decimal",
  "originalPrice": "decimal (nullable)",
  "image": "URL",
  "link": "URL",
  "productType": "enum: [Beanies, T-Shirts, Shoes, Decks, ...]"
}
```

---

### 2. Premier Store

| Attribute            | Value                              |
| -------------------- | ---------------------------------- |
| **Location**         | Virginia Beach, VA                 |
| **Website**          | https://thepremierstore.com        |
| **Shop ID**          | 2                                  |
| **Products**         | 400-600 active                     |
| **Update Frequency** | Every 30 minutes                   |
| **Data Points**      | Title, price, image, URL, category |

**Scraping Strategy:**

- Target: `/collections/sale` endpoint
- Method: Generic Shopify scraper
- Pagination: Up to 20 pages
- Rate Limit: 2 seconds between requests

---

### 3. Labor Skate Shop

| Attribute            | Value                      |
| -------------------- | -------------------------- |
| **Location**         | New York, NY               |
| **Website**          | https://laborskateshop.com |
| **Shop ID**          | 3                          |
| **Products**         | 300-500 active             |
| **Update Frequency** | Every 30 minutes           |
| **Data Points**      | Title, price, image, URL   |

**Scraping Strategy:**

- Target: `/collections/sale` endpoint
- Method: Generic Shopify scraper
- Pagination: Up to 15 pages
- Rate Limit: 2 seconds between requests

---

### 4. NJ Skate Shop

| Attribute            | Value                    |
| -------------------- | ------------------------ |
| **Location**         | New Jersey               |
| **Website**          | https://njskateshop.com  |
| **Shop ID**          | 4                        |
| **Products**         | 250-400 active           |
| **Update Frequency** | Every 30 minutes         |
| **Data Points**      | Title, price, image, URL |

**Scraping Strategy:**

- Target: `/collections/sale` endpoint
- Method: Generic Shopify scraper
- Pagination: Up to 15 pages
- Rate Limit: 2 seconds between requests

---

### 5. Black Sheep Skate Shop

| Attribute            | Value                           |
| -------------------- | ------------------------------- |
| **Location**         | Charlotte, NC                   |
| **Website**          | https://blacksheepskateshop.com |
| **Shop ID**          | 5                               |
| **Products**         | 300-450 active                  |
| **Update Frequency** | Every 30 minutes                |
| **Data Points**      | Title, price, image, URL        |

**Scraping Strategy:**

- Target: `/collections/sale` endpoint
- Method: Generic Shopify scraper
- Pagination: Up to 15 pages
- Rate Limit: 2 seconds between requests

---

## Data Pipeline Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Data Sources  │───▶│  Kafka Producers │───▶│  Kafka Topics    │
│   (5+ Shops)    │    │  (Rate Limited)  │    │  (Partitioned)   │
└─────────────────┘    └──────────────────┘    └──────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   PostgreSQL    │◀───│  Kafka Consumers │◀───│  Consumer Groups │
│   (Products)    │    │  (Exactly-once)  │    │  (Auto-scaling)  │
└─────────────────┘    └──────────────────┘    └──────────────────┘
```

## Throughput Statistics

| Metric                 | Value                |
| ---------------------- | -------------------- |
| **Total Sources**      | 5 shops              |
| **Daily Products**     | 5,000+               |
| **Sustained Rate**     | ~3.5 products/minute |
| **Burst Capacity**     | 100 products/minute  |
| **Processing Latency** | <100ms (avg)         |
| **Data Freshness**     | Every 30 minutes     |

## Data Normalization

### Price Standardization

- All prices converted to USD
- Decimal format: `XX.XX`
- Null handling for missing prices

### Category Mapping

```python
CATEGORY_MAP = {
    't-shirts': 'T-Shirts',
    'shirts': 'Shirts',
    'hoodies': 'Sweatshirts',
    'sweatshirts': 'Sweatshirts',
    'shoes': 'Shoes',
    'sneakers': 'Shoes',
    'decks': 'Decks',
    'trucks': 'Trucks',
    'wheels': 'Wheels',
    'bearings': 'Bearings',
    'hats': 'Hats',
    'beanies': 'Beanies',
    'pants': 'Pants',
    'shorts': 'Pants',
    'videos': 'Videos',
    'dvd': 'Videos'
}
```

### Brand Extraction

Brands are extracted from product titles using pattern matching:

- Nike SB, Nike
- Vans
- Adidas
- Converse/Cons
- New Balance
- ASICS
- DC Shoes
- Baker
- Thrasher
- Independent
- Spitfire
- Polar
- Dime
- Supreme

## Deduplication Strategy

### Fingerprinting

SHA-256 hash of: `shop_id:external_id:title:sale_price`

### Bloom Filter (Redis)

- TTL: 7 days
- False positive rate: <0.1%
- Memory efficient for large datasets

## Error Handling

### Retry Logic

- Max retries: 3
- Backoff: Exponential (1s, 2s, 4s)

### Dead Letter Queue

Failed records are sent to `product-events-dlq` topic for later processing.

### Monitoring

- Failed scrape rate tracked per source
- Alert threshold: >10% failure rate
- Automatic source disable on persistent failures

## Adding New Sources

To add a new shop to the pipeline:

1. **Add configuration to `SCRAPERS` in producer.js:**

```javascript
newshop: {
  name: 'New Shop Name',
  shopId: 6,
  baseUrl: 'https://newshop.com',
  saleUrl: 'https://newshop.com/collections/sale',
  maxPages: 20
}
```

2. **Add shop to database:**

```sql
INSERT INTO shops (name, display_name, website_url, location)
VALUES ('newshop', 'New Shop Name', 'https://newshop.com', 'City, State');
```

3. **Deploy updated producer:**

```bash
docker-compose up -d --build kafka-producer
```

## Compliance & Ethics

- Respect robots.txt
- Rate limiting: 2s between requests
- No authentication bypass
- Public sale data only
- Attribution maintained

---

_Last Updated: 2026-02-09_
_Data Pipeline Version: 1.0.0_
