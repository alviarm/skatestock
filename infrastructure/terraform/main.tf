# SkateStock Infrastructure as Code
# Terraform configuration for AWS deployment
# Cost-optimized for demo purposes using t3.medium instances

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
  
  backend "s3" {
    bucket         = "skatestock-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "skatestock-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "skatestock"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# ==========================================
# VPC & NETWORKING
# ==========================================

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"
  
  name = "skatestock-${var.environment}"
  cidr = "10.0.0.0/16"
  
  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway   = true
  single_nat_gateway   = var.environment == "dev" ? true : false
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
    "kubernetes.io/cluster/skatestock-${var.environment}" = "shared"
  }
  
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
    "kubernetes.io/cluster/skatestock-${var.environment}" = "shared"
  }
}

# ==========================================
# EKS CLUSTER (Kubernetes)
# ==========================================

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"
  
  cluster_name    = "skatestock-${var.environment}"
  cluster_version = "1.28"
  
  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  control_plane_subnet_ids       = module.vpc.intra_subnets
  
  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true
  
  # EKS Managed Node Groups
  eks_managed_node_groups = {
    general = {
      desired_size = var.node_desired_size
      min_size     = var.node_min_size
      max_size     = var.node_max_size
      
      instance_types = [var.node_instance_type]
      capacity_type  = var.environment == "prod" ? "ON_DEMAND" : "SPOT"
      
      disk_size = 50
      
      labels = {
        workload = "general"
      }
      
      update_config = {
        max_unavailable_percentage = 25
      }
      
      tags = {
        Name = "skatestock-general"
      }
    }
    
    kafka = {
      desired_size = 3
      min_size     = 3
      max_size     = 5
      
      instance_types = ["t3.medium"]  # For demo; use r5.large for production
      capacity_type  = "ON_DEMAND"
      
      disk_size = 100
      
      labels = {
        workload = "kafka"
      }
      
      taints = [{
        key    = "dedicated"
        value  = "kafka"
        effect = "NO_SCHEDULE"
      }]
      
      tags = {
        Name = "skatestock-kafka"
      }
    }
  }
  
  # Cluster addons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }
  
  tags = {
    Name = "skatestock-${var.environment}"
  }
}

# ==========================================
# MSK (Managed Kafka)
# ==========================================

resource "aws_msk_cluster" "skatestock" {
  cluster_name           = "skatestock-kafka-${var.environment}"
  kafka_version          = "3.5.1"
  number_of_broker_nodes = 3
  
  broker_node_group_info {
    instance_type   = "kafka.t3.small"  # For demo; use kafka.m5.large for production
    client_subnets  = module.vpc.private_subnets
    security_groups = [aws_security_group.msk.id]
    
    storage_info {
      ebs_storage_info {
        volume_size = 100
      }
    }
  }
  
  encryption_info {
    encryption_at_rest_kms_key_arn = aws_kms_key.msk.arn
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }
  
  open_monitoring {
    prometheus {
      jmx_exporter {
        enabled_in_broker = true
      }
      node_exporter {
        enabled_in_broker = true
      }
    }
  }
  
  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = aws_cloudwatch_log_group.msk.name
      }
      s3 {
        enabled = true
        bucket  = aws_s3_bucket.msk_logs.id
        prefix  = "logs/msk-"
      }
    }
  }
  
  tags = {
    Name = "skatestock-kafka"
  }
}

# ==========================================
# RDS (PostgreSQL)
# ==========================================

resource "aws_db_instance" "skatestock" {
  identifier = "skatestock-${var.environment}"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.db_instance_class
  
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true
  
  db_name  = "skatestock"
  username = "skatestock_admin"
  password = random_password.db_password.result
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.skatestock.name
  
  publicly_accessible = false
  skip_final_snapshot = var.environment == "dev" ? true : false
  deletion_protection = var.environment == "prod" ? true : false
  
  backup_retention_period = 7
  maintenance_window      = "Mon:03:00-Mon:04:00"
  backup_window          = "02:00-03:00"
  
  performance_insights_enabled    = true
  performance_insights_retention_period = 7
  
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  
  tags = {
    Name = "skatestock-postgres"
  }
}

# ==========================================
# ELASTICACHE (Redis)
# ==========================================

resource "aws_elasticache_cluster" "skatestock" {
  cluster_id           = "skatestock-${var.environment}"
  engine               = "redis"
  node_type            = var.redis_node_type
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.0"
  port                 = 6379
  
  security_group_ids = [aws_security_group.redis.id]
  subnet_group_name  = aws_elasticache_subnet_group.skatestock.name
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  
  tags = {
    Name = "skatestock-redis"
  }
}

# ==========================================
# S3 BUCKET (Data Lake)
# ==========================================

resource "aws_s3_bucket" "data_lake" {
  bucket = "skatestock-data-lake-${var.environment}-${data.aws_caller_identity.current.account_id}"
  
  tags = {
    Name = "skatestock-data-lake"
  }
}

resource "aws_s3_bucket_versioning" "data_lake" {
  bucket = aws_s3_bucket.data_lake.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "data_lake" {
  bucket = aws_s3_bucket.data_lake.id
  
  rule {
    id     = "transition-to-glacier"
    status = "Enabled"
    
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    
    expiration {
      days = 365
    }
  }
}

# ==========================================
# SECURITY GROUPS
# ==========================================

resource "aws_security_group" "msk" {
  name_prefix = "msk-"
  vpc_id      = module.vpc.vpc_id
  
  ingress {
    from_port = 9092
    to_port   = 9092
    protocol  = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }
  
  ingress {
    from_port = 9094
    to_port   = 9094
    protocol  = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "msk-sg"
  }
}

resource "aws_security_group" "rds" {
  name_prefix = "rds-"
  vpc_id      = module.vpc.vpc_id
  
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.cluster_security_group_id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "rds-sg"
  }
}

resource "aws_security_group" "redis" {
  name_prefix = "redis-"
  vpc_id      = module.vpc.vpc_id
  
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [module.eks.cluster_security_group_id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "redis-sg"
  }
}

# ==========================================
# IAM ROLES & POLICIES
# ==========================================

resource "aws_iam_role" "eks_node_role" {
  name = "skatestock-eks-node-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "eks_node_policy" {
  name = "skatestock-node-policy"
  role = aws_iam_role.eks_node_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.data_lake.arn,
          "${aws_s3_bucket.data_lake.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "cloudwatch:GetMetricStatistics"
        ]
        Resource = "*"
      }
    ]
  })
}

# ==========================================
# OUTPUTS
# ==========================================

output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "msk_brokers" {
  description = "MSK broker endpoints"
  value       = aws_msk_cluster.skatestock.bootstrap_brokers_tls
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.skatestock.endpoint
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = aws_elasticache_cluster.skatestock.cache_nodes[0].address
}
