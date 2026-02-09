# Kafka Configuration
# Centralized configuration for all Kafka-related settings

import os
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class KafkaConfig:
    """Kafka configuration settings."""

    # Bootstrap servers
    bootstrap_servers: str = "localhost:9092"

    # Producer settings
    producer_acks: str = "all"
    producer_retries: int = 3
    producer_batch_size: int = 16384
    producer_linger_ms: int = 5
    producer_compression_type: str = "lz4"

    # Consumer settings
    consumer_group_id: str = "skatestock-consumers"
    consumer_auto_offset_reset: str = "earliest"
    consumer_enable_auto_commit: bool = False
    consumer_max_poll_records: int = 500
    consumer_session_timeout_ms: int = 30000
    consumer_heartbeat_interval_ms: int = 10000

    # Topic configurations
    topic_replication_factor: int = 1
    topic_num_partitions: int = 6
    topic_min_insync_replicas: int = 1

    # Schema Registry
    schema_registry_url: Optional[str] = None

    # Security (for production)
    security_protocol: str = "PLAINTEXT"
    sasl_mechanism: Optional[str] = None
    sasl_username: Optional[str] = None
    sasl_password: Optional[str] = None

    @classmethod
    def from_env(cls) -> "KafkaConfig":
        """Create configuration from environment variables."""
        return cls(
            bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"),
            producer_acks=os.getenv("KAFKA_PRODUCER_ACKS", "all"),
            producer_retries=int(os.getenv("KAFKA_PRODUCER_RETRIES", "3")),
            producer_batch_size=int(os.getenv("KAFKA_PRODUCER_BATCH_SIZE", "16384")),
            producer_linger_ms=int(os.getenv("KAFKA_PRODUCER_LINGER_MS", "5")),
            producer_compression_type=os.getenv("KAFKA_PRODUCER_COMPRESSION", "lz4"),
            consumer_group_id=os.getenv(
                "KAFKA_CONSUMER_GROUP_ID", "skatestock-consumers"
            ),
            consumer_auto_offset_reset=os.getenv(
                "KAFKA_CONSUMER_AUTO_OFFSET_RESET", "earliest"
            ),
            consumer_enable_auto_commit=os.getenv(
                "KAFKA_CONSUMER_ENABLE_AUTO_COMMIT", "False"
            ).lower()
            == "true",
            consumer_max_poll_records=int(
                os.getenv("KAFKA_CONSUMER_MAX_POLL_RECORDS", "500")
            ),
            schema_registry_url=os.getenv("KAFKA_SCHEMA_REGISTRY_URL"),
            security_protocol=os.getenv("KAFKA_SECURITY_PROTOCOL", "PLAINTEXT"),
            sasl_mechanism=os.getenv("KAFKA_SASL_MECHANISM"),
            sasl_username=os.getenv("KAFKA_SASL_USERNAME"),
            sasl_password=os.getenv("KAFKA_SASL_PASSWORD"),
        )


# Kafka Topics Configuration
TOPICS = {
    "product-events": {
        "name": "product-events",
        "partitions": 6,
        "replication_factor": 1,
        "config": {
            "retention.ms": "604800000",  # 7 days
            "cleanup.policy": "delete",
            "compression.type": "lz4",
        },
    },
    "product-raw": {
        "name": "product-raw",
        "partitions": 6,
        "replication_factor": 1,
        "config": {
            "retention.ms": "86400000",  # 1 day
            "cleanup.policy": "delete",
        },
    },
    "price-updates": {
        "name": "price-updates",
        "partitions": 6,
        "replication_factor": 1,
        "config": {
            "retention.ms": "2592000000",  # 30 days
            "cleanup.policy": "compact",
            "min.compaction.lag.ms": "86400000",
        },
    },
    "inventory-updates": {
        "name": "inventory-updates",
        "partitions": 3,
        "replication_factor": 1,
        "config": {
            "retention.ms": "604800000",  # 7 days
            "cleanup.policy": "delete",
        },
    },
    "alerts": {
        "name": "alerts",
        "partitions": 3,
        "replication_factor": 1,
        "config": {
            "retention.ms": "2592000000",  # 30 days
            "cleanup.policy": "delete",
        },
    },
    "dead-letter-queue": {
        "name": "dead-letter-queue",
        "partitions": 1,
        "replication_factor": 1,
        "config": {
            "retention.ms": "604800000",  # 7 days
            "cleanup.policy": "delete",
        },
    },
}

# Consumer Group Configurations
CONSUMER_GROUPS = {
    "validation-consumers": {
        "group_id": "skatestock-validation",
        "topics": ["product-raw"],
        "concurrency": 3,
    },
    "normalization-consumers": {
        "group_id": "skatestock-normalization",
        "topics": ["product-events"],
        "concurrency": 3,
    },
    "analytics-consumers": {
        "group_id": "skatestock-analytics",
        "topics": ["price-updates", "inventory-updates"],
        "concurrency": 2,
    },
    "alert-consumers": {
        "group_id": "skatestock-alerts",
        "topics": ["alerts"],
        "concurrency": 2,
    },
}

# Partitioning Strategy
# Products are partitioned by shop_id to ensure ordering within a shop
PARTITIONING_STRATEGY = {
    "key_extractor": "shop_id",
    "partition_count": 6,
    "partition_assignment": {
        # Consistent hashing for shop distribution
        "seasons": [0, 1],
        "premier": [2, 3],
        "labor": [4],
        "nj": [5],
        "blacksheep": [0, 2],
        "default": [0, 1, 2, 3, 4, 5],
    },
}
