# SkateStock Cost Transparency

> **Philosophy:** "Infrastructure that proves you can build it, without paying to keep it running 24/7"

This document provides complete cost transparency for the SkateStock architecture. All costs are estimates based on AWS us-east-1 pricing as of 2024.

---

## 💰 Cost Summary

| Environment                    | Cost/Hour  | Cost/Day   | Cost/Month |
| ------------------------------ | ---------- | ---------- | ---------- |
| **Local Docker**               | **$0.00**  | **$0.00**  | **$0.00**  |
| **Interview Mode (Ephemeral)** | **~$0.07** | **~$1.68** | **~$50\*** |
| Full Production (EKS)          | ~$0.50     | ~$12       | ~$350-400  |

\* Only if left running continuously (not recommended)

---

## 🏠 Local Development (Docker Compose)

**Cost: $0.00**

Everything runs locally on your machine:

- Kafka (single broker)
- PostgreSQL
- Redis
- API (FastAPI)
- Dashboard (Plotly Dash)

### Resource Requirements

- RAM: 4GB minimum, 8GB recommended
- Disk: 10GB for containers and data
- CPU: 2 cores minimum

### When to Use

- ✅ Daily development
- ✅ Demo recordings
- ✅ Integration testing
- ✅ Portfolio showcases

---

## ☁️ Interview Mode (Ephemeral Cloud)

**Cost: ~$0.07/hour (~$1.68/day)**

Optimized for 4-hour interview sessions. Auto-destroys after 4 hours to prevent bill shock.

### Cost Breakdown

| Component                      | Instance Type        | Hourly Cost      |
| ------------------------------ | -------------------- | ---------------- |
| **ECS Fargate Spot** (2 tasks) | 0.25 vCPU, 0.5GB RAM | ~$0.015          |
| **RDS PostgreSQL**             | db.t3.micro          | ~$0.017          |
| **ElastiCache Redis**          | cache.t3.micro       | ~$0.013          |
| **VPC & Networking**           | -                    | ~$0.005          |
| **CloudWatch Logs**            | Minimal retention    | ~$0.002          |
| **Data Transfer**              | Minimal              | ~$0.001          |
| **TOTAL**                      |                      | **~$0.053/hour** |

### 4-Hour Interview Session

```
4 hours × $0.07 = ~$0.28 per interview
```

### What You Get

- ✅ Live API endpoint (`http://<alb-dns>:8000`)
- ✅ Live Dashboard (`http://<alb-dns>:8050`)
- ✅ Real PostgreSQL database
- ✅ Redis caching layer
- ✅ Auto-destroy after 4 hours
- ✅ Budget alarm at $8 (80% of $10 limit)

### How to Deploy

```bash
# One-time setup
cd infrastructure/terraform
terraform init

# Spin up for interview
terraform apply -var="environment=demo"

# Destroy when done (or auto-destroys in 4 hours)
terraform destroy
```

---

## 🚀 Production Architecture (Reference Only)

**Estimated Cost: ~$350-400/month**

If you were to deploy this for real production use (not recommended for portfolio projects):

### High-Availability Setup

| Component                     | Instance Type              | Monthly Cost    |
| ----------------------------- | -------------------------- | --------------- |
| **EKS Control Plane**         | Managed                    | $73.00          |
| **EKS Nodes** (3×)            | m5.large Spot              | ~$90.00         |
| **RDS PostgreSQL**            | db.r5.large                | ~$150.00        |
| **ElastiCache Redis**         | cache.r5.large             | ~$65.00         |
| **MSK Kafka**                 | kafka.m5.large (3 brokers) | ~$250.00        |
| **Application Load Balancer** | -                          | ~$22.00         |
| **Data Transfer**             | -                          | ~$50.00         |
| **CloudWatch**                | Detailed monitoring        | ~$30.00         |
| **S3**                        | Data lake storage          | ~$10.00         |
| **TOTAL**                     |                            | **~$740/month** |

### Cost Optimizations for Real Production

If you actually needed to run this in production:

1. **Reserved Instances**: 30-60% savings with 1-year commitment
2. **Savings Plans**: Flexible compute savings
3. **Spot Instances**: 70-90% savings for fault-tolerant workloads
4. **Graviton (ARM)**: 20% cheaper than x86
5. **Right-sizing**: Start small, scale based on metrics

**Optimized Production Estimate: ~$400-500/month**

---

## 🎯 Interview Strategy

### The "Ephemeral Production" Pitch

> "I've designed this architecture to be **production-capable** while remaining **cost-effective for a personal project**. The Terraform configurations use ECS Fargate Spot instead of EKS to eliminate the $73/month control plane fee, and the auto-destroy mechanism ensures I never get surprised by a bill. During a 4-hour technical interview, this costs about 28 cents to run live."

### Key Talking Points

1. **Architecture Knowledge**: "I know how to build EKS clusters, but chose ECS Fargate for this use case because..."
2. **Cost Consciousness**: "I implemented budget alarms and auto-destroy as safeguards"
3. **Real-World Trade-offs**: "MSK would be ideal for production Kafka, but for demo purposes..."
4. **Scalability Path**: "The architecture is designed to migrate to EKS/MSK when needed"

### When Interviewers Ask About Production

**Q: "Why not use EKS?"**
**A:** "For a portfolio project, the $73/month control plane fee doesn't add value. ECS Fargate provides the same container orchestration capabilities without the fixed cost. If this were a production system with multiple services and complex networking, EKS would be worth it."

**Q: "What about MSK for Kafka?"**
**A:** "MSK starts at around $250/month for a minimal 3-broker cluster. For 5,000 products/day, a single Kafka broker on EC2 or even Amazon MQ (RabbitMQ) would be more cost-effective. I've included Terraform configurations for both approaches."

**Q: "How would you scale this?"**
**A:** "The architecture is designed for horizontal scaling. The API is stateless, the database can scale vertically or use read replicas, and Kafka partitions allow parallel processing. Moving to EKS would be straightforward—I've kept the Kubernetes manifests compatible."

---

## 📊 AWS Calculator Links

- [ECS Fargate Pricing](https://aws.amazon.com/fargate/pricing/)
- [RDS PostgreSQL Pricing](https://aws.amazon.com/rds/postgresql/pricing/)
- [ElastiCache Pricing](https://aws.amazon.com/elasticache/pricing/)
- [EKS Pricing](https://aws.amazon.com/eks/pricing/)
- [MSK Pricing](https://aws.amazon.com/msk/pricing/)

---

## 🛡️ Safeguards

### Budget Alarms

- Daily budget: $10
- Alert at 80% ($8)
- Forecasted alert at 100%

### Auto-Destroy

- CloudWatch Event triggers after 4 hours
- Terraform destroy runs automatically
- Prevents "forgot to turn it off" bills

### AWS Free Tier

- RDS db.t3.micro: 750 hours/month free (12 months)
- ElastiCache: Not included in free tier
- ECS Fargate: 750 vCPU-hours, 750 GB-hours free (always)

---

## 💡 Cost Optimization Checklist

- [ ] Always use `terraform destroy` after interviews
- [ ] Enable auto-destroy (enabled by default)
- [ ] Set up budget alerts with your email
- [ ] Use Spot instances when possible
- [ ] Monitor CloudWatch logs retention
- [ ] Delete unused ECR images
- [ ] Release unused Elastic IPs

---

## 📝 Architecture Decision Records

See `/docs/adr/` for detailed explanations of cost-related decisions:

- [ADR-001: Why ECS over EKS](/docs/adr/001-why-ecs-over-eks.md)
- [ADR-002: Kafka vs SQS](/docs/adr/002-kafka-vs-sqs.md)
- [ADR-003: Ephemeral Infrastructure Strategy](/docs/adr/003-ephemeral-infrastructure.md)
