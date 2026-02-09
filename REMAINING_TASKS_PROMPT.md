# SkateStock - Remaining Tasks Engineered Prompt

## Project Status Overview

**Repository:** SkateStock E-commerce Data Intelligence Platform  
**Transformation:** Complete architecture overhaul from simple scraper to production-grade data platform  
**Completion:** ~75% (Core infrastructure implemented, documentation and final polish remaining)

---

## ✅ COMPLETED COMPONENTS

### Phase 1: Repository Structure & Analysis

- [x] Gap Analysis Report (`docs/GAP_ANALYSIS.md`)
- [x] Directory structure reorganization3
- [x] Architecture documentation

### Phase 2: Data Pipeline Infrastructure

- [x] Docker Compose with 11 services (Kafka, Zookeeper, PostgreSQL, Redis, Schema Registry, Kafka UI, Grafana, Prometheus)
- [x] PostgreSQL schema with 15+ tables including:
  - Core: products, shops, brands, categories
  - Pipeline: kafka_consumer_offsets, dead_letter_queue, product_fingerprints
  - Analytics: price_trends, discount_patterns, availability_forecasts, pipeline_metrics
  - Alerts: alerts table
- [x] Kafka Avro schemas (product-event.avsc, error-event.avsc)
- [x] Producer service (Node.js) with:
  - Multi-source scraping (5 shops: Seasons, Premier, Labor, NJ, BlackSheep)
  - SHA-256 fingerprint deduplication
  - Exactly-once semantics with idempotent producers
  - Rate limiting (2s between requests)
  - Batch processing (100 messages)
- [x] Consumer service (Node.js) with:
  - Exactly-once processing with PostgreSQL offset tracking
  - Idempotency via Redis
  - Dead Letter Queue for failed records
  - Auto-rebalancing

### Phase 3: Analytics Engine

- [x] Python analytics engine with:
  - PriceTrendAnalyzer (time-series aggregation)
  - DiscountPatternDetector (flash sales, gradual discounts using Isolation Forest)
  - AvailabilityForecaster (heuristic-based predictions)
  - Automated scheduling (15-minute intervals)

### Phase 4: Visualization Layer

- [x] Plotly Dash BI Dashboard with:
  - Real-time KPI cards (total products, on-sale count, avg/max discount)
  - Discount heatmaps by category
  - Shop comparison charts
  - Price trend line charts (30-day)
  - Alerts panel
  - Auto-refresh (30-second intervals)
  - Dark theme (Bootstrap Darkly)

### Phase 5: Infrastructure as Code

- [x] Terraform configurations:
  - EKS cluster with managed node groups (t3.medium)
  - MSK (Managed Kafka) with 3 brokers
  - RDS PostgreSQL (db.t3.micro)
  - ElastiCache Redis
  - S3 data lake with lifecycle policies
  - Security groups and IAM roles
  - Cost estimates (~$300/month dev environment)

### Phase 6: API Layer

- [x] OpenAPI 3.0 specification (`api/openapi/openapi.yaml`)
- [x] Complete endpoint documentation:
  - `/products` (list with pagination, filtering)
  - `/products/{id}` (detail)
  - `/products/{id}/price-history`
  - `/analytics/trends`
  - `/analytics/discount-patterns`
  - `/analytics/metrics`
  - `/alerts`
  - `/health`, `/health/ready`

### Phase 7: Documentation

- [x] `docs/DATA_SOURCES.md` - 5+ e-commerce sources documented
- [x] `docs/PERFORMANCE.md` - Benchmarks proving 40% latency reduction
- [x] `docs/ARCHITECTURE.md` - Updated with new architecture

---

## 📋 REMAINING TASKS

### CRITICAL PRIORITY

#### Task 1: Rewrite README.md

**Current State:** Basic README with simple scraper description  
**Target State:** Interview-ready technical showcase supporting all resume claims

**Requirements:**

1. Professional header with ASCII architecture diagram
2. Clear positioning as "Production-Grade E-commerce Data Intelligence Platform"
3. Technical capabilities section with specific metrics:
   - Data Ingestion: 5,000+ products daily from 5+ sources
   - Kafka event streaming with exactly-once semantics
   - 40% latency reduction achieved
   - Real-time analytics with ML pattern detection
4. Architecture diagram showing complete data flow
5. Tech stack table with versions (Kafka 3.5, PostgreSQL 15, etc.)
6. Quick start guide with Docker Compose (one command)
7. AWS deployment section with Terraform
8. Performance benchmarks summary
9. Links to detailed documentation
10. Directory structure overview

**Acceptance Criteria:**

- [ ] 200-300 lines of professional documentation
- [ ] All resume claims are verifiable
- [ ] Architecture diagram included
- [ ] Setup instructions tested and working
- [ ] Screenshots/dashboard images referenced

---

#### Task 2: Kubernetes Manifests

**Location:** `infrastructure/kubernetes/`  
**Purpose:** Production deployment on EKS

**Required Files:**

1. **namespace.yaml**
   - Create `skatestock` namespace
   - Labels for environment, managed-by

2. **configmap.yaml**
   - Non-sensitive configuration
   - Kafka brokers, database host, Redis host
   - Scraper intervals, log levels

3. **secret.yaml** (template)
   - Database credentials
   - API keys
   - JWT secret
   - Use `stringData` for easy editing

4. **kafka-producer-deployment.yaml**
   - Deployment with 2 replicas
   - Resource requests: 100m CPU, 256Mi memory
   - Resource limits: 500m CPU, 512Mi memory
   - Environment variables from ConfigMap/Secret
   - Liveness probe: HTTP or exec
   - Readiness probe: Check Kafka connectivity

5. **kafka-consumer-deployment.yaml**
   - Deployment with 2 replicas (different consumer group)
   - Same resource specs as producer
   - Consumer group: `product-processors`

6. **analytics-deployment.yaml**
   - Single replica (scheduled job runner)
   - Resource requests: 250m CPU, 512Mi memory
   - Resource limits: 1000m CPU, 1Gi memory

7. **api-deployment.yaml**
   - Deployment with 2 replicas
   - Service: ClusterIP on port 3001
   - Resource requests: 200m CPU, 512Mi memory
   - Resource limits: 1000m CPU, 1Gi memory

8. **dashboard-deployment.yaml**
   - Deployment with 1 replica
   - Service: ClusterIP on port 8050
   - Resource requests: 100m CPU, 256Mi memory

9. **hpa.yaml** (Horizontal Pod Autoscaler)
   - API service: min 2, max 10, target CPU 70%
   - Producer: min 1, max 5
   - Consumer: min 2, max 10

10. **ingress.yaml**
    - NGINX ingress controller
    - TLS with cert-manager
    - Routes: /api/_ → api-service, /dashboard/_ → dashboard-service
    - Rate limiting annotations

**Acceptance Criteria:**

- [ ] All 10 manifest files created
- [ ] Valid YAML syntax
- [ ] Resource limits appropriate for t3.medium nodes
- [ ] Health checks configured
- [ ] HPA configured for key services

---

#### Task 3: Enhanced API Implementation

**Location:** `api/src/`  
**Purpose:** Complete RESTful API matching OpenAPI spec

**Required Files:**

1. **package.json**

   ```json
   {
     "dependencies": {
       "express": "^4.18.2",
       "pg": "^8.11.3",
       "ioredis": "^5.3.2",
       "kafkajs": "^2.2.4",
       "swagger-ui-express": "^5.0.0",
       "jsonwebtoken": "^9.0.2",
       "express-rate-limit": "^7.1.0",
       "winston": "^3.11.0",
       "joi": "^17.11.0",
       "cors": "^2.8.5",
       "helmet": "^7.1.0"
     }
   }
   ```

2. **server.js** - Main entry point
   - Express app configuration
   - Middleware stack (helmet, cors, rate limiting, auth)
   - Route mounting
   - Swagger UI at `/docs`
   - Graceful shutdown handling
   - Port: 3001

3. **config/database.js** - PostgreSQL connection
   - Pool configuration (max 20 connections)
   - Connection retry logic
   - Query logging in development

4. **config/redis.js** - Redis client
   - Connection configuration
   - Retry strategy
   - Event handlers

5. **config/kafka.js** - Kafka producer
   - Producer for async operations (alerts, metrics)
   - Idempotent configuration

6. **middleware/auth.js**
   - JWT verification
   - API key validation
   - Role-based access (optional)
   - Public paths whitelist (/health, /docs)

7. **middleware/rateLimiter.js**
   - Redis-backed rate limiting
   - 100 requests per 15 minutes per API key
   - Custom key generator

8. **middleware/cache.js**
   - Redis response caching
   - 5-minute TTL
   - Cache key generation
   - Cache invalidation hooks

9. **middleware/errorHandler.js**
   - Centralized error handling
   - Structured error responses
   - Logging integration

10. **routes/products.js**
    - `GET /products` - List with pagination, filtering (shop, category, brand, min_discount, search)
    - `GET /products/:id` - Product detail
    - `GET /products/:id/price-history` - Historical prices
    - Implement full-text search using PostgreSQL tsvector

11. **routes/analytics.js**
    - `GET /analytics/trends` - Aggregated price trends
    - `GET /analytics/discount-patterns` - ML-detected patterns
    - `GET /analytics/metrics` - Pipeline performance metrics
    - Support grouping by category, brand, shop

12. **routes/alerts.js**
    - `GET /alerts` - List alerts with unread filter
    - `PATCH /alerts/:id/read` - Mark alert as read

13. **routes/health.js**
    - `GET /health` - Full health check (DB, Redis, Kafka)
    - `GET /health/ready` - Kubernetes readiness probe
    - `GET /health/live` - Kubernetes liveness probe

**Acceptance Criteria:**

- [ ] All 13 files implemented
- [ ] Passes OpenAPI validation
- [ ] All endpoints tested with curl/httpie
- [ ] Rate limiting working
- [ ] Caching working (verified via Redis)
- [ ] JWT authentication working
- [ ] Error handling comprehensive

---

### HIGH PRIORITY

#### Task 4: Setup Script

**Location:** `scripts/setup.sh`  
**Purpose:** One-command local development setup

**Requirements:**

```bash
#!/bin/bash
set -e

echo "🔧 SkateStock Setup Script"

# 1. Check prerequisites
check_prerequisites() {
  command -v docker >/dev/null 2>&1 || { echo "Docker required"; exit 1; }
  command -v docker-compose >/dev/null 2>&1 || { echo "Docker Compose required"; exit 1; }
}

# 2. Create .env if not exists
create_env_file() {
  if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env file - please edit with your values"
  fi
}

# 3. Build Docker images
build_images() {
  docker-compose build
}

# 4. Start infrastructure services first
start_infrastructure() {
  docker-compose up -d zookeeper kafka postgres redis schema-registry
  # Wait for health checks
  sleep 10
}

# 5. Run database migrations
run_migrations() {
  docker-compose exec postgres psql -U skatestock -d skatestock -f /docker-entrypoint-initdb.d/01-init.sql
}

# 6. Seed initial data
seed_data() {
  # Insert 5 shops, categories, brands
  docker-compose exec postgres psql -U skatestock -c "..."
}

# 7. Start all services
start_services() {
  docker-compose up -d
}

# 8. Wait for health checks and print URLs
wait_for_health() {
  echo "⏳ Waiting for services..."
  # Health check loop
  echo "✅ All services ready!"
  echo ""
  echo "📊 Services:"
  echo "  Frontend:    http://localhost:3000"
  echo "  API:         http://localhost:3001"
  echo "  Dashboard:   http://localhost:8050"
  echo "  Kafka UI:    http://localhost:8080"
  echo "  Grafana:     http://localhost:3003"
  echo "  Prometheus:  http://localhost:9090"
}

main() {
  check_prerequisites
  create_env_file
  build_images
  start_infrastructure
  run_migrations
  seed_data
  start_services
  wait_for_health
}

main "$@"
```

**Acceptance Criteria:**

- [ ] Script is executable (`chmod +x`)
- [ ] Runs without errors on fresh clone
- [ ] Creates .env from template
- [ ] Builds all images
- [ ] Starts services in correct order
- [ ] Seeds database with initial data
- [ ] Prints access URLs
- [ ] Includes error handling

---

#### Task 5: Demo Data Generator

**Location:** `scripts/generate_demo_data.py`  
**Purpose:** Generate 5,000+ synthetic products for demo/testing

**Requirements:**

```python
#!/usr/bin/env python3
"""
Generate synthetic demo data for SkateStock
Creates 5,000+ realistic skateboarding products
"""

import random
from datetime import datetime, timedelta
import psycopg2
from faker import Faker

# Configuration
SHOPS = [
    (1, 'Seasons Skate Shop'),
    (2, 'Premier Store'),
    (3, 'Labor Skate Shop'),
    (4, 'NJ Skate Shop'),
    (5, 'Black Sheep Skate Shop')
]

CATEGORIES = ['Decks', 'Trucks', 'Wheels', 'Bearings', 'Shoes', 'T-Shirts',
              'Sweatshirts', 'Pants', 'Hats', 'Beanies', 'Videos']

BRANDS = ['Nike SB', 'Vans', 'Adidas', 'Converse', 'New Balance', 'ASICS',
          'DC', 'Baker', 'Thrasher', 'Independent', 'Spitfire', 'Polar',
          'Dime', 'Supreme', 'Hockey', 'FA']

def generate_product_name(brand, category):
    """Generate realistic product name"""
    templates = {
        'Decks': ['{brand} {model} Deck 8.0', '{brand} {pro} Pro Deck 8.25'],
        'Shoes': ['{brand} {model} Skate Shoe', '{brand} {pro} Pro Model'],
        # ... more templates
    }
    # Implementation

def generate_price_history(product_id, base_price, days=30):
    """Generate 30 days of price history"""
    # Create realistic price fluctuations
    # Include occasional discounts

def main():
    # Connect to database
    # Generate 5,000 products distributed across shops
    # Generate price history for each product
    # Insert into database in batches
    print(f"Generated {count} products")

if __name__ == '__main__':
    main()
```

**Features:**

- Realistic product names (e.g., "Nike SB Dunk Low Pro Skate Shoe - Black/White")
- Prices in $20-$200 range
- Realistic discount patterns (10-50% off)
- Time-series data (30 days)
- Batch inserts (1000 at a time)
- Progress bar

**Acceptance Criteria:**

- [ ] Generates 5,000+ products
- [ ] Products distributed across 5 shops
- [ ] Realistic names, prices, discounts
- [ ] Creates price history
- [ ] Runs in under 60 seconds
- [ ] Idempotent (can run multiple times)

---

### MEDIUM PRIORITY

#### Task 6: Monitoring Stack

**Location:** `infrastructure/monitoring/`

**prometheus.yml:**

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]

  - job_name: "api"
    static_configs:
      - targets: ["api:3001"]
    metrics_path: "/metrics"

  - job_name: "kafka"
    static_configs:
      - targets: ["kafka:9092"]

  - job_name: "postgres-exporter"
    static_configs:
      - targets: ["postgres-exporter:9187"]
```

**Grafana Datasources:**

- Prometheus configuration
- Default dashboards for:
  - System metrics (CPU, memory, disk)
  - Kafka metrics (throughput, lag, partitions)
  - API metrics (request rate, latency, errors)
  - Business metrics (products added, discounts detected)

#### Task 7: GitHub Actions CI/CD

**Location:** `.github/workflows/`

**ci.yml:**

- Run on PR
- Lint JavaScript/Python
- Run unit tests
- Build Docker images
- Validate Kubernetes manifests

**deploy-staging.yml:**

- Run on merge to main
- Deploy to staging EKS cluster
- Run smoke tests
- Notify on success/failure

---

## TECHNICAL SPECIFICATIONS

### Resource Requirements (per service)

| Service   | CPU Request | CPU Limit | Memory Request | Memory Limit |
| --------- | ----------- | --------- | -------------- | ------------ |
| Producer  | 100m        | 500m      | 256Mi          | 512Mi        |
| Consumer  | 100m        | 500m      | 256Mi          | 512Mi        |
| API       | 200m        | 1000m     | 512Mi          | 1Gi          |
| Analytics | 250m        | 1000m     | 512Mi          | 1Gi          |
| Dashboard | 100m        | 500m      | 256Mi          | 512Mi        |

### Environment Variables

```bash
# Database
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=skatestock
POSTGRES_USER=skatestock
POSTGRES_PASSWORD=<secret>

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Kafka
KAFKA_BROKERS=kafka:29092

# API
JWT_SECRET=<secret>
API_RATE_LIMIT=100
API_RATE_WINDOW=900

# Scraper
SCRAPE_INTERVAL_MINUTES=30
```

### Ports

| Service            | Port        |
| ------------------ | ----------- |
| Frontend (Next.js) | 3000        |
| API                | 3001        |
| Dashboard (Plotly) | 8050        |
| Grafana            | 3003        |
| Prometheus         | 9090        |
| Kafka UI           | 8080        |
| Schema Registry    | 8081        |
| PostgreSQL         | 5432        |
| Redis              | 6379        |
| Kafka              | 9092, 29092 |
| Zookeeper          | 2181        |

---

## TESTING CHECKLIST

### Local Development

- [ ] `./scripts/setup.sh` runs successfully
- [ ] `docker-compose ps` shows all services healthy
- [ ] Frontend accessible at http://localhost:3000
- [ ] API docs accessible at http://localhost:3001/docs
- [ ] Dashboard accessible at http://localhost:8050
- [ ] Kafka UI shows messages flowing
- [ ] `./scripts/generate_demo_data.py` creates 5,000 products

### API Testing

```bash
# Health check
curl http://localhost:3001/health

# List products
curl "http://localhost:3001/products?page=1&limit=10"

# Search products
curl "http://localhost:3001/products?search=nike&min_discount=20"

# Get analytics
curl http://localhost:3001/analytics/trends?days=30
```

### Kubernetes Testing

```bash
# Apply manifests
kubectl apply -f infrastructure/kubernetes/

# Check deployments
kubectl get deployments -n skatestock

# Check pods
kubectl get pods -n skatestock

# Check HPA
kubectl get hpa -n skatestock

# Port forward API
kubectl port-forward svc/api 3001:3001 -n skatestock
```

---

## DOCUMENTATION REQUIREMENTS

### README.md Structure

1. **Header** - Title, badges, live demo link
2. **Overview** - 2-3 sentence description
3. **Architecture** - ASCII diagram showing data flow
4. **Key Features** - Bullet points with metrics
5. **Tech Stack** - Table with versions
6. **Quick Start** - Docker Compose setup
7. **API Documentation** - Link to OpenAPI spec
8. **Performance** - Benchmark summary
9. **Deployment** - AWS/Terraform instructions
10. **Development** - Local setup, testing
11. **Contributing** - Link to CONTRIBUTING.md
12. **License** - MIT

### Screenshots Needed

- Dashboard overview
- Price trend charts
- Discount heatmap
- API response example
- Kafka UI showing topics

---

## ACCEPTANCE CRITERIA

### Overall Project

- [ ] All resume claims are verifiable in code
- [ ] Docker Compose starts all services with one command
- [ ] API implements all OpenAPI endpoints
- [ ] Kubernetes manifests deploy to EKS
- [ ] Demo data generator creates 5,000+ products
- [ ] README is interview-ready (professional, comprehensive)
- [ ] All documentation is accurate and up-to-date

### Code Quality

- [ ] All JavaScript follows ESLint rules
- [ ] All Python passes flake8/pylint
- [ ] Error handling is comprehensive
- [ ] Logging is structured and useful
- [ ] No hardcoded secrets

---

## ESTIMATED EFFORT

| Task                 | Estimated Time | Complexity |
| -------------------- | -------------- | ---------- |
| README rewrite       | 2 hours        | Medium     |
| Kubernetes manifests | 4 hours        | High       |
| API implementation   | 6 hours        | High       |
| Setup script         | 1.5 hours      | Medium     |
| Demo data generator  | 2 hours        | Medium     |
| Monitoring config    | 2 hours        | Medium     |
| CI/CD pipelines      | 2 hours        | Medium     |
| **Total**            | **19.5 hours** | **High**   |

---

## NOTES FOR IMPLEMENTATION

1. **Consistency:** Use same patterns as existing code (async/await, try/catch, structured logging)
2. **Testing:** Test each component as you build it
3. **Documentation:** Update README as you complete tasks
4. **Git:** Commit frequently with descriptive messages
5. **Verification:** Run full stack test before marking complete

---

**Prepared:** 2026-02-09  
**Version:** 1.0  
**Status:** Ready for implementation
