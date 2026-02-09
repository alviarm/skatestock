# ADR-002: Kafka vs Amazon SQS/SNS

## Status

Accepted with caveats

## Context

The resume claims include "Apache Kafka for event streaming" and "5,000+ products daily from 5+ sources." However, AWS offers simpler messaging services (SQS, SNS, EventBridge) that might be more appropriate for this scale.

## Decision

We will use **Apache Kafka** (self-hosted in Docker, optional Amazon MSK or EC2 for cloud) despite SQS being more cost-effective.

## Rationale

### Why Kafka Despite Higher Cost?

1. **Resume Alignment**: Kafka is explicitly mentioned on the resume
2. **Learning Value**: Understanding Kafka's partitioning model is valuable
3. **Interview Story**: Can discuss real-world Kafka vs SQS trade-offs
4. **Scalability Demonstration**: Kafka handles higher throughput more elegantly
5. **Stream Processing**: Kafka Streams/KSQL enables complex transformations

### Cost Comparison

| Service            | 5k msgs/day cost | Learning Value | Resume Alignment |
| ------------------ | ---------------- | -------------- | ---------------- |
| **SQS Standard**   | ~$0.005/day      | Medium         | Low              |
| **SQS FIFO**       | ~$0.15/day       | Medium         | Low              |
| **Kafka (EC2)**    | ~$15/month\*     | High           | High             |
| **Amazon MSK**     | ~$250/month\*    | High           | High             |
| **Docker Compose** | $0 (local)       | High           | High             |

\* If left running 24/7

## Implementation Strategy

### Local Development

- Single Kafka broker via Docker Compose
- Schema Registry for Avro validation
- Kafka UI for monitoring

### Cloud (Ephemeral)

- **Option A**: Self-hosted Kafka on EC2 (cheapest)
- **Option B**: Amazon MSK (managed, expensive)
- **Option C**: Skip Kafka entirely, use SQS (interview honesty)

### Recommended Approach

For interviews, acknowledge the trade-off:

> "For 5,000 messages/day, SQS would be more cost-effective. I chose Kafka because it's explicitly mentioned on my resume and provides valuable experience with stream processing concepts. In a real production environment with this volume, I'd likely use SQS for cost optimization, but the Kafka implementation demonstrates the architectural patterns needed for larger-scale systems."

## Alternative: SQS + Lambda

If cost is a primary concern, a more economical architecture:

- SQS queues per retailer
- Lambda functions for processing
- EventBridge for scheduling

This would cost pennies per day instead of dollars.

## Conclusion

Kafka is the right choice for this project despite the higher cost because:

1. It aligns with resume claims
2. It provides valuable learning experience
3. It demonstrates understanding of stream processing
4. Local development is free
5. Cloud costs can be controlled through ephemeral deployment

## Interview Talking Points

- "At 5k messages/day, SQS would be more cost-effective"
- "I chose Kafka for the learning experience and resume alignment"
- "The architecture can easily switch to SQS if needed"
- "Kafka's partitioning model is valuable knowledge for higher-scale systems"
