# ADR-001: Why ECS Fargate instead of EKS

## Status

Accepted

## Context

The resume claims include "Infrastructure: Cloud-native AWS deployment using Kubernetes and Terraform." However, for a portfolio/personal project, the ongoing costs of running EKS need careful consideration.

## Decision

We will use **ECS Fargate** as the primary container orchestration platform, while maintaining EKS-compatible Kubernetes manifests for demonstration purposes.

## Consequences

### Positive

- **Cost**: ECS Fargate has no control plane fee ($0 vs EKS $73/month)
- **Simplicity**: Less operational overhead for a single-developer project
- **Serverless**: Automatic scaling to zero when not in use
- **Interview Ready**: Still demonstrates container orchestration knowledge
- **Migration Path**: Architecture easily migrates to EKS when needed

### Negative

- **Resume Gap**: EKS is mentioned on resume but not used in practice
- **Vendor Lock-in**: ECS is AWS-specific (though Fargate is conceptually portable)
- **Learning Curve**: Less exposure to Kubernetes CRDs and ecosystem

## Mitigation Strategies

### For Technical Interviews

1. **Kubernetes Knowledge**: Maintain EKS manifests in `/infrastructure/k8s/`
2. **Architecture Understanding**: Can explain EKS architecture and trade-offs
3. **Migration Story**: "I know how to build EKS clusters, but for cost reasons..."

### Resume Alignment

The resume mentions Kubernetes capabilities. In interviews:

- Acknowledge the trade-off openly
- Explain the cost-benefit analysis
- Show the EKS manifests exist and are production-ready
- Emphasize that ECS Fargate uses the same container concepts

## Cost Comparison

| Aspect         | ECS Fargate           | EKS                   |
| -------------- | --------------------- | --------------------- |
| Control Plane  | $0                    | $73/month             |
| Compute        | Same (Fargate or EC2) | Same (Fargate or EC2) |
| Complexity     | Lower                 | Higher                |
| Portability    | AWS-only              | Cloud-agnostic        |
| Learning Value | Good                  | Excellent             |

## Conclusion

For a portfolio project, ECS Fargate is the pragmatic choice. The cost savings ($73/month) outweigh the learning benefits of running EKS for a dormant project. When interviewing, I can confidently discuss both options and explain why I made this choice.
