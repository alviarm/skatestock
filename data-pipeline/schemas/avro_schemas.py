"""
Avro Schema Definitions for Kafka Topics
Ensures data consistency and enables schema evolution
"""

import json
from typing import Dict, Any


class AvroSchemaRegistry:
    """Central registry for all Avro schemas used in the pipeline"""

    PRODUCT_EVENT_V1 = {
        "type": "record",
        "name": "ProductEvent",
        "namespace": "com.skatestock.events.v1",
        "doc": "Schema for raw product events from scrapers",
        "fields": [
            {
                "name": "event_id",
                "type": "string",
                "doc": "Unique event identifier (UUID)",
            },
            {
                "name": "event_timestamp",
                "type": "long",
                "logicalType": "timestamp-millis",
                "doc": "Unix timestamp in milliseconds when event was created",
            },
            {"name": "source", "type": "string", "doc": "Source shop identifier"},
            {
                "name": "source_product_id",
                "type": ["null", "string"],
                "default": None,
                "doc": "Original product ID from source system",
            },
            {"name": "title", "type": "string", "doc": "Product title/name"},
            {"name": "description", "type": ["null", "string"], "default": None},
            {"name": "brand", "type": ["null", "string"], "default": None},
            {"name": "category", "type": "string", "default": "unknown"},
            {
                "name": "original_price",
                "type": ["null", "string"],
                "default": None,
                "doc": "Original/MSRP price as string to preserve precision",
            },
            {
                "name": "sale_price",
                "type": ["null", "string"],
                "default": None,
                "doc": "Current sale price as string",
            },
            {"name": "currency", "type": "string", "default": "USD"},
            {
                "name": "discount_percentage",
                "type": ["null", "double"],
                "default": None,
            },
            {"name": "image_url", "type": ["null", "string"], "default": None},
            {
                "name": "additional_images",
                "type": {"type": "array", "items": "string"},
                "default": [],
            },
            {"name": "product_url", "type": "string"},
            {"name": "availability", "type": "string", "default": "unknown"},
            {"name": "stock_quantity", "type": ["null", "int"], "default": None},
            {"name": "color", "type": ["null", "string"], "default": None},
            {"name": "size", "type": ["null", "string"], "default": None},
            {"name": "scraped_at", "type": "long", "logicalType": "timestamp-millis"},
            {
                "name": "raw_attributes",
                "type": {"type": "map", "values": "string"},
                "default": {},
            },
        ],
    }

    NORMALIZED_PRODUCT_V1 = {
        "type": "record",
        "name": "NormalizedProduct",
        "namespace": "com.skatestock.products.v1",
        "doc": "Schema for normalized and validated products",
        "fields": [
            {
                "name": "product_id",
                "type": "string",
                "doc": "Canonical product identifier",
            },
            {"name": "source_product_id", "type": ["null", "string"], "default": None},
            {"name": "sku", "type": ["null", "string"], "default": None},
            {"name": "title", "type": "string"},
            {"name": "description", "type": ["null", "string"], "default": None},
            {"name": "brand", "type": "string", "default": "unknown"},
            {"name": "category", "type": "string"},
            {"name": "original_price", "type": ["null", "string"]},
            {"name": "sale_price", "type": ["null", "string"]},
            {"name": "currency", "type": "string"},
            {"name": "discount_percentage", "type": ["null", "double"]},
            {"name": "image_url", "type": ["null", "string"]},
            {"name": "product_url", "type": "string"},
            {"name": "source", "type": "string"},
            {"name": "availability", "type": "string"},
            {"name": "stock_quantity", "type": ["null", "int"], "default": None},
            {
                "name": "dimensions",
                "type": [
                    "null",
                    {
                        "type": "record",
                        "name": "Dimensions",
                        "fields": [
                            {
                                "name": "width",
                                "type": ["null", "double"],
                                "default": None,
                            },
                            {
                                "name": "length",
                                "type": ["null", "double"],
                                "default": None,
                            },
                            {
                                "name": "weight",
                                "type": ["null", "double"],
                                "default": None,
                            },
                            {
                                "name": "wheel_size",
                                "type": ["null", "int"],
                                "default": None,
                            },
                            {
                                "name": "truck_size",
                                "type": ["null", "string"],
                                "default": None,
                            },
                        ],
                    },
                ],
                "default": None,
            },
            {"name": "color", "type": ["null", "string"], "default": None},
            {"name": "size", "type": ["null", "string"], "default": None},
            {
                "name": "normalized_at",
                "type": "long",
                "logicalType": "timestamp-millis",
            },
            {"name": "confidence_score", "type": "double", "default": 1.0},
        ],
    }

    DEAD_LETTER_EVENT_V1 = {
        "type": "record",
        "name": "DeadLetterEvent",
        "namespace": "com.skatestock.errors.v1",
        "doc": "Schema for failed events that couldn't be processed",
        "fields": [
            {"name": "event_id", "type": "string"},
            {"name": "original_topic", "type": "string"},
            {"name": "original_partition", "type": "int"},
            {"name": "original_offset", "type": "long"},
            {"name": "original_event", "type": "bytes"},
            {"name": "error_message", "type": "string"},
            {"name": "error_type", "type": "string"},
            {"name": "error_stack_trace", "type": ["null", "string"], "default": None},
            {"name": "failed_at", "type": "long", "logicalType": "timestamp-millis"},
            {"name": "retry_count", "type": "int", "default": 0},
            {
                "name": "processing_stage",
                "type": "string",
                "doc": "Which stage failed: validation, normalization, enrichment",
            },
        ],
    }

    PRICE_UPDATE_V1 = {
        "type": "record",
        "name": "PriceUpdate",
        "namespace": "com.skatestock.pricing.v1",
        "doc": "Schema for price change events",
        "fields": [
            {"name": "product_id", "type": "string"},
            {"name": "source", "type": "string"},
            {"name": "previous_price", "type": ["null", "string"]},
            {"name": "new_price", "type": "string"},
            {"name": "price_change_percentage", "type": "double"},
            {"name": "timestamp", "type": "long", "logicalType": "timestamp-millis"},
            {"name": "is_discount", "type": "boolean"},
        ],
    }

    ANALYTICS_METRIC_V1 = {
        "type": "record",
        "name": "AnalyticsMetric",
        "namespace": "com.skatestock.analytics.v1",
        "doc": "Schema for pipeline metrics and KPIs",
        "fields": [
            {"name": "metric_name", "type": "string"},
            {"name": "metric_value", "type": "double"},
            {"name": "timestamp", "type": "long", "logicalType": "timestamp-millis"},
            {
                "name": "dimensions",
                "type": {"type": "map", "values": "string"},
                "default": {},
            },
        ],
    }

    @classmethod
    def get_schema(cls, schema_name: str) -> Dict[str, Any]:
        """Get a schema by name"""
        schemas = {
            "product_event_v1": cls.PRODUCT_EVENT_V1,
            "normalized_product_v1": cls.NORMALIZED_PRODUCT_V1,
            "dead_letter_v1": cls.DEAD_LETTER_EVENT_V1,
            "price_update_v1": cls.PRICE_UPDATE_V1,
            "analytics_metric_v1": cls.ANALYTICS_METRIC_V1,
        }
        return schemas.get(schema_name)

    @classmethod
    def get_schema_json(cls, schema_name: str) -> str:
        """Get a schema as JSON string"""
        schema = cls.get_schema(schema_name)
        return json.dumps(schema) if schema else None


# Topic configurations with partitioning strategy
TOPIC_CONFIGURATIONS = {
    "product-events": {
        "partitions": 6,
        "replication_factor": 1,
        "config": {"retention.ms": "604800000", "cleanup.policy": "delete"},  # 7 days
        "partitioning_strategy": "source",  # Partition by shop source for ordered processing
        "schema": "product_event_v1",
    },
    "normalized-products": {
        "partitions": 6,
        "replication_factor": 1,
        "config": {
            "retention.ms": "604800000",
            "cleanup.policy": "compact,delete",
            "min.compaction.lag.ms": "86400000",  # 1 day
        },
        "partitioning_strategy": "product_id",
        "schema": "normalized_product_v1",
    },
    "price-updates": {
        "partitions": 3,
        "replication_factor": 1,
        "config": {"retention.ms": "2592000000"},  # 30 days
        "partitioning_strategy": "product_id",
        "schema": "price_update_v1",
    },
    "dead-letter-queue": {
        "partitions": 1,
        "replication_factor": 1,
        "config": {"retention.ms": "1209600000"},  # 14 days
        "partitioning_strategy": "round_robin",
        "schema": "dead_letter_v1",
    },
    "analytics-metrics": {
        "partitions": 1,
        "replication_factor": 1,
        "config": {"retention.ms": "2592000000"},  # 30 days
        "partitioning_strategy": "round_robin",
        "schema": "analytics_metric_v1",
    },
}


def get_partition_key(event: Dict[str, Any], strategy: str) -> str:
    """
    Calculate partition key based on strategy

    Strategies:
    - source: Use the source field for partitioning (ensures ordered processing per shop)
    - product_id: Use product_id for partitioning (groups same product together)
    - round_robin: Returns None for even distribution
    """
    if strategy == "source":
        return event.get("source", "unknown")
    elif strategy == "product_id":
        return event.get("product_id") or event.get("source_product_id", "unknown")
    elif strategy == "round_robin":
        return None
    return str(hash(str(event)))
