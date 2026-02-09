"""
Avro Schemas for Kafka Message Validation
Ensures data consistency and enables schema evolution
"""

from typing import Dict, Any

# Product Event Schema (main topic)
PRODUCT_EVENT_SCHEMA = {
    "type": "record",
    "name": "ProductEvent",
    "namespace": "com.skatestock.data",
    "doc": "Schema for product events from scrapers",
    "fields": [
        {"name": "event_id", "type": "string", "doc": "Unique event UUID"},
        {
            "name": "event_type",
            "type": "string",
            "doc": "Event type: created, updated, deleted",
        },
        {
            "name": "event_timestamp",
            "type": "long",
            "logicalType": "timestamp-millis",
            "doc": "Event timestamp in milliseconds",
        },
        {"name": "shop_id", "type": "string", "doc": "Shop identifier"},
        {"name": "shop_name", "type": "string", "doc": "Human-readable shop name"},
        {
            "name": "product",
            "type": {
                "type": "record",
                "name": "Product",
                "fields": [
                    {
                        "name": "external_id",
                        "type": "string",
                        "doc": "Original ID from shop",
                    },
                    {"name": "title", "type": "string", "doc": "Product title"},
                    {
                        "name": "description",
                        "type": ["null", "string"],
                        "default": None,
                    },
                    {"name": "sku", "type": ["null", "string"], "default": None},
                    {"name": "product_url", "type": "string", "doc": "Product URL"},
                    {"name": "image_url", "type": ["null", "string"], "default": None},
                    {"name": "category", "type": ["null", "string"], "default": None},
                    {"name": "brand", "type": ["null", "string"], "default": None},
                    {
                        "name": "original_price_cents",
                        "type": ["null", "int"],
                        "default": None,
                    },
                    {
                        "name": "sale_price_cents",
                        "type": "int",
                        "doc": "Current sale price in cents",
                    },
                    {"name": "currency_code", "type": "string", "default": "USD"},
                    {"name": "in_stock", "type": "boolean", "default": True},
                    {
                        "name": "stock_quantity",
                        "type": ["null", "int"],
                        "default": None,
                    },
                    {
                        "name": "attributes",
                        "type": {"type": "map", "values": "string"},
                        "default": {},
                    },
                ],
            },
        },
        {"name": "scraped_at", "type": "long", "logicalType": "timestamp-millis"},
        {"name": "scraper_version", "type": "string", "default": "1.0.0"},
    ],
}

# Raw Product Schema (unvalidated input)
PRODUCT_RAW_SCHEMA = {
    "type": "record",
    "name": "ProductRaw",
    "namespace": "com.skatestock.data",
    "doc": "Raw product data before validation",
    "fields": [
        {"name": "event_id", "type": "string"},
        {"name": "shop_id", "type": "string"},
        {"name": "shop_name", "type": "string"},
        {
            "name": "raw_data",
            "type": "string",
            "doc": "JSON string of raw product data",
        },
        {"name": "scraped_at", "type": "long", "logicalType": "timestamp-millis"},
        {"name": "scraper_name", "type": "string"},
    ],
}

# Price Update Schema
PRICE_UPDATE_SCHEMA = {
    "type": "record",
    "name": "PriceUpdate",
    "namespace": "com.skatestock.data",
    "doc": "Schema for price change events",
    "fields": [
        {"name": "event_id", "type": "string"},
        {"name": "product_id", "type": "string"},
        {"name": "shop_id", "type": "string"},
        {"name": "external_id", "type": "string"},
        {"name": "previous_price_cents", "type": ["null", "int"]},
        {"name": "new_price_cents", "type": "int"},
        {"name": "previous_original_cents", "type": ["null", "int"]},
        {"name": "new_original_cents", "type": ["null", "int"]},
        {"name": "price_change_cents", "type": "int"},
        {"name": "price_change_percent", "type": "float"},
        {"name": "is_sale", "type": "boolean"},
        {"name": "discount_percent", "type": ["null", "float"]},
        {"name": "updated_at", "type": "long", "logicalType": "timestamp-millis"},
    ],
}

# Inventory Update Schema
INVENTORY_UPDATE_SCHEMA = {
    "type": "record",
    "name": "InventoryUpdate",
    "namespace": "com.skatestock.data",
    "doc": "Schema for inventory/stock change events",
    "fields": [
        {"name": "event_id", "type": "string"},
        {"name": "product_id", "type": "string"},
        {"name": "shop_id", "type": "string"},
        {"name": "external_id", "type": "string"},
        {"name": "previous_stock_status", "type": "string"},
        {"name": "new_stock_status", "type": "string"},
        {"name": "previous_quantity", "type": ["null", "int"]},
        {"name": "new_quantity", "type": ["null", "int"]},
        {"name": "is_restock", "type": "boolean", "default": False},
        {"name": "is_low_stock", "type": "boolean", "default": False},
        {"name": "updated_at", "type": "long", "logicalType": "timestamp-millis"},
    ],
}

# Alert Schema
ALERT_SCHEMA = {
    "type": "record",
    "name": "Alert",
    "namespace": "com.skatestock.data",
    "doc": "Schema for alert notifications",
    "fields": [
        {"name": "alert_id", "type": "string"},
        {
            "name": "alert_type",
            "type": "string",
            "doc": "price_drop, restock, low_stock, new_product",
        },
        {"name": "severity", "type": "string", "doc": "low, medium, high"},
        {"name": "product_id", "type": "string"},
        {"name": "shop_id", "type": "string"},
        {"name": "title", "type": "string", "doc": "Alert title"},
        {"name": "message", "type": "string", "doc": "Alert message"},
        {"name": "data", "type": {"type": "map", "values": "string"}, "default": {}},
        {"name": "created_at", "type": "long", "logicalType": "timestamp-millis"},
    ],
}

# Dead Letter Queue Schema (for failed events)
DEAD_LETTER_SCHEMA = {
    "type": "record",
    "name": "DeadLetterEvent",
    "namespace": "com.skatestock.data",
    "doc": "Schema for failed events",
    "fields": [
        {"name": "original_event_id", "type": "string"},
        {"name": "original_topic", "type": "string"},
        {"name": "error_reason", "type": "string"},
        {"name": "error_message", "type": "string"},
        {"name": "failed_at", "type": "long", "logicalType": "timestamp-millis"},
        {"name": "retry_count", "type": "int", "default": 0},
        {
            "name": "original_payload",
            "type": "string",
            "doc": "JSON string of original event",
        },
    ],
}


# Schema Registry
def get_schema(schema_name: str) -> Dict[str, Any]:
    """Get Avro schema by name."""
    schemas = {
        "product-event": PRODUCT_EVENT_SCHEMA,
        "product-raw": PRODUCT_RAW_SCHEMA,
        "price-update": PRICE_UPDATE_SCHEMA,
        "inventory-update": INVENTORY_UPDATE_SCHEMA,
        "alert": ALERT_SCHEMA,
        "dead-letter": DEAD_LETTER_SCHEMA,
    }
    return schemas.get(schema_name)


def get_all_schemas() -> Dict[str, Dict[str, Any]]:
    """Get all registered schemas."""
    return {
        "product-event": PRODUCT_EVENT_SCHEMA,
        "product-raw": PRODUCT_RAW_SCHEMA,
        "price-update": PRICE_UPDATE_SCHEMA,
        "inventory-update": INVENTORY_UPDATE_SCHEMA,
        "alert": ALERT_SCHEMA,
        "dead-letter": DEAD_LETTER_SCHEMA,
    }
