# SkateStock Interview Guide

> **Purpose**: Pre-written talking points connecting code to resume bullets

---

## Quick Reference: Resume Bullets to Code Evidence

| Resume Bullet                      | Code Evidence                                          | Key Talking Point                                                                              |
| ---------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| "5,000+ products daily"            | `scripts/generate_demo_data.py` + `docker-compose.yml` | "I can show you the Kafka consumer lag staying near zero as we process ~3.5 records/minute..." |
| "Apache Kafka for event streaming" | `data-pipeline/kafka/`                                 | "Exactly-once semantics with idempotent producers, Avro schema validation..."                  |
| "40% latency reduction"            | `benchmarks/latency_comparison.py`                     | "Before: synchronous file I/O. After: async batch processing with Redis..."                    |
| "Kubernetes and Terraform"         | `infrastructure/terraform/` + `infrastructure/k8s/`    | "ECS Fargate for cost reasons, but K8s manifests are EKS-ready..."                             |
| "BI Dashboard with Tableau/Plotly" | `dashboard/`                                           | "Real-time price trend charts with Plotly Dash..."                                             |
| "Data Mining & Analytics"          | `analytics/engine/`                                    | "Time-series analysis detecting discount patterns..."                                          |

---

## The 5-Minute Elevator Pitch

### Opening (30 seconds)

> "SkateStock is a production-grade e-commerce data aggregator that tracks prices across 5+ skate shops. It processes 5,000+ products daily using Apache Kafka for event streaming, with real-time analytics and a cost-optimized AWS architecture designed for ephemeral deployment."

### Technical Highlights (2 minutes)

> "The architecture uses a Lambda pattern with Kafka producers scraping data from retailer APIs, consumers normalizing and deduplicating with Redis bloom filters, and a FastAPI backend serving a Plotly Dash dashboard. Everything is infrastructure-as-code with Terraform, and I've optimized costs to about 28 cents for a 4-hour interview session using ECS Fargate Spot instead of EKS."

### Why This Matters (30 seconds)

> "For skateboarders, this means finding the best deals on gear like Independent trucks or Spitfire wheels. For me as a developer, it demonstrates production-grade data engineering, stream processing, and cost-conscious cloud architecture."

---

## Deep Dive Topics

### 1. Data Pipeline Architecture

**Q: Walk me through your data pipeline.**

**A:**

1. **Ingestion**: 5 scrapers (Python/Node.js) pull from retailer APIs
2. **Event Streaming**: Kafka producers publish to `product-events` topic with Avro schemas
3. **Partitioning**: Partitioned by retailer source for ordered processing
4. **Consumption**: Multi-consumer groups handle validation, normalization, deduplication
5. **Storage**: PostgreSQL for products, Redis for caching, S3 for raw data lake
6. **API**: FastAPI with automatic OpenAPI docs, rate limiting
7. **Dashboard**: Plotly Dash with real-time WebSocket updates

**Show**: `docker-compose.yml` + `data-pipeline/kafka/producers/product_producer.py`

### 2. Kafka Implementation

**Q: Why Kafka over SQS?**

**A:**

> "At 5,000 messages/day, SQS would be more cost-effective. I chose Kafka because:
>
> 1. It's on my resume and interviewers ask about it
> 2. It provides valuable experience with partitioning and stream processing
> 3. The concepts transfer to higher-scale systems
> 4. Local development is free with Docker
>
> In production at this scale, I'd honestly use SQS. But the Kafka implementation shows I understand the architecture."

**Technical Details**:

- 6 partitions on `product-events` topic (can scale to 6 parallel consumers)
- Exactly-once semantics with idempotent producers
- Avro schema validation via Schema Registry
- Dead letter queue for failed records

**Show**: `data-pipeline/schemas/avro_schemas.py`

### 3. Cost Optimization Strategy

**Q: How did you optimize costs?**

**A:**

> "The resume mentions Kubernetes and Terraform, so I built production-ready infrastructure that's cost-optimized for a personal project:
>
> 1. **ECS Fargate Spot** instead of EKS ($0 vs $73/month control plane fee)
> 2. **RDS db.t3.micro** (free tier eligible)
> 3. **ElastiCache cache.t3.micro** (minimal cost)
> 4. **Self-hosted Kafka** in Docker (free locally)
> 5. **Auto-destroy** after 4 hours to prevent bill shock
> 6. **Budget alarms** at $8/day
>
> A 4-hour interview session costs about 28 cents. The EKS manifests are in `/infrastructure/k8s/` if they want to see Kubernetes knowledge."

**Show**: `COSTS.md` + `infrastructure/terraform/main.tf`

### 4. Deduplication Logic

**Q: How do you handle duplicate products?**

**A:**

> "Two layers:
>
> 1. **Redis Bloom Filters**: Fast probabilistic dedup at ingestion (O(1), minimal memory)
> 2. **Database Constraints**: Unique constraints on (title, normalized_price, source)
>
> The bloom filter catches ~99% of duplicates before they hit the database, reducing write load."

**Show**: `data-pipeline/utils/deduplication.py`

### 5. Analytics & Data Mining

**Q: What analytics do you perform?**

**A:**

> "Three main areas:
>
> 1. **Price Trends**: Time-series analysis tracking MSRP vs street price over time
> 2. **Discount Patterns**: Detecting flash sales, seasonal trends, clearance events
> 3. **Availability Forecasting**: ML-based prediction of stockouts using sklearn
>
> The dashboard shows real-time price charts and discount heatmaps by brand."

**Show**: `analytics/engine/pricing_analytics.py` + `dashboard/app.py`

### 6. The 40% Latency Reduction

**Q: You mentioned 40% latency reduction. How?**

**A:**

> "Baseline: synchronous file I/O with JSON files
> Optimized: async architecture with:
>
> 1. **Redis caching** for frequently accessed aggregates
> 2. **Database connection pooling**
> 3. **Batch inserts** instead of individual writes
> 4. **Async API** with FastAPI
>
> Benchmarks are in `benchmarks/latency_comparison.py`. The key insight was moving from file I/O to in-memory caching with Redis."

**Show**: `benchmarks/latency_comparison.py` results

---

## Handling Tough Questions

### "Why not use managed services?"

**A:**

> "I actually do for RDS and ElastiCache. For Kafka, managed MSK is $250/month which doesn't make sense for a portfolio project. The self-hosted Kafka in Docker demonstrates the same architectural concepts. In production, I'd use MSK or Confluent Cloud."

### "Is this over-engineered for the scale?"

**A:**

> "Absolutely. A simple Python script with SQLite would handle 5k products/day. But that's not the point—this demonstrates production patterns: event streaming, schema validation, deduplication, caching layers, infrastructure-as-code. It's intentionally architected to show I can build scalable systems, even if the current scale doesn't require it."

### "Why skateboarding?"

**A:**

> "I'm a street skateboarder—I actually know the difference between Independent Stage 11 and Thunder Hollow Lights. Using domain data I understand makes the project authentic. The interviewer sees real product names (Baker decks, Spitfire wheels) instead of generic widgets."

---

## Live Demo Script

### Pre-Demo Checklist

- [ ] Run `make demo` (takes ~2 minutes)
- [ ] Verify all services healthy: `make verify`
- [ ] Open Dashboard in browser
- [ ] Have terminal ready for logs

### Demo Flow (10 minutes)

1. **Architecture Overview** (2 min)
   - Show `docs/images/architecture_diagram.png`
   - Explain data flow: Scrapers → Kafka → Consumers → DB → API → Dashboard

2. **Live Data Flow** (3 min)
   - Show Kafka UI at localhost:8080
   - Point out topics: `product-events`, `normalized-products`, `dead-letter-queue`
   - Show consumer lag metrics

3. **Dashboard Demo** (3 min)
   - Show price trend charts
   - Filter by brand (Independent, Spitfire)
   - Show discount heatmap
   - Point out "Products tracked today" counter

4. **API Demo** (2 min)
   - Show OpenAPI docs at /docs
   - Run a query: `/products?brand=Independent&discount_min=20`
   - Show health endpoint with Kafka lag metrics

---

## Red Flags to Avoid

❌ Don't claim this runs 24/7 in production
✅ Do say "designed for ephemeral deployment, costs 28 cents per interview"

❌ Don't oversell the scale (5k/day is small)
✅ Do emphasize "designed to scale to 500k+/day with partitioning"

❌ Don't pretend ECS is EKS
✅ Do explain "ECS for cost, K8s manifests show I know K8s"

❌ Don't claim Kafka is cheaper than SQS
✅ Do acknowledge "SQS would be cheaper at this scale, Kafka for learning"

---

## Quick Command Reference

```bash
# Start everything
make demo

# Check health
make verify

# View logs
make logs

# Generate fresh data
make seed-db

# Cloud deploy (interview only!)
make interview-setup  # terraform apply
make interview-teardown  # terraform destroy
```

---

## Final Tips

1. **Be Honest About Trade-offs**: Interviewers respect cost-conscious decisions
2. **Show the Code**: Have files open and ready to navigate
3. **Demonstrate Live**: Nothing beats seeing data flow in real-time
4. **Know When to Stop**: Don't over-explain—let them ask follow-ups
5. **Have Fun**: Enthusiasm for the domain (skateboarding) is contagious

**Remember**: The goal is to prove you _can_ build production systems, not that this is a production system.
