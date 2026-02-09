"""
Kafka Producer for Product Events
Publishes scraped product data to Kafka topics with Avro serialization
"""

import json
import logging
import os
import time
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional, Any

from confluent_kafka import Producer, KafkaError
from confluent_kafka.avro import AvroProducer
from confluent_kafka.avro.cached_schema_registry_client import (
    CachedSchemaRegistryClient,
)
from tenacity import retry, stop_after_attempt, wait_exponential

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class ProductProducer:
    """
    Kafka producer for publishing product events.

    Features:
    - Avro schema validation
    - Exactly-once semantics (idempotent producer)
    - Automatic retries with exponential backoff
    - Dead letter queue for failed messages
    """

    def __init__(
        self,
        bootstrap_servers: str = "localhost:9092",
        schema_registry_url: str = "http://localhost:8081",
        topic: str = "product-events",
    ):
        self.bootstrap_servers = bootstrap_servers
        self.schema_registry_url = schema_registry_url
        self.topic = topic
        self.dlq_topic = "dead-letter-queue"

        # Initialize schema registry client
        self.schema_registry = CachedSchemaRegistryClient(url=schema_registry_url)

        # Load Avro schema
        self.value_schema = self._load_schema()

        # Initialize producer with exactly-once settings
        self.producer = AvroProducer(
            {
                "bootstrap.servers": bootstrap_servers,
                "schema.registry.url": schema_registry_url,
                "client.id": f"product-producer-{uuid.uuid4()}",
                # Exactly-once semantics
                "enable.idempotence": True,
                "acks": "all",
                "retries": 10,
                "retry.backoff.ms": 1000,
                # Performance tuning for 5k+ items/day
                "batch.size": 16384,
                "linger.ms": 100,
                "compression.type": "lz4",
                # Buffer settings
                "queue.buffering.max.messages": 100000,
                "queue.buffering.max.kbytes": 1048576,
            },
            default_value_schema=self.value_schema,
        )

        # Fallback plain producer for DLQ
        self.dlq_producer = Producer(
            {
                "bootstrap.servers": bootstrap_servers,
                "client.id": f"dlq-producer-{uuid.uuid4()}",
            }
        )

        logger.info(
            f"ProductProducer initialized - bootstrap: {bootstrap_servers}, "
            f"topic: {topic}"
        )

    def _load_schema(self) -> Dict:
        """Load Avro schema from schema registry or local definition"""
        from data_pipeline.schemas.avro_schemas import (
            AvroSchemaRegistry,
        )

        schema_dict = AvroSchemaRegistry.get_schema("product_event_v1")
        return schema_dict

    def _delivery_callback(self, err, msg):
        """Callback for message delivery reports"""
        if err is not None:
            logger.error(f"Message delivery failed: {err}")
        else:
            logger.debug(
                f"Message delivered to {msg.topic()}[{msg.partition()}] at offset {msg.offset()}"
            )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    def produce_event(
        self,
        event_data: Dict[str, Any],
        partition_key: Optional[str] = None,
    ) -> bool:
        """
        Produce a single product event to Kafka.

        Args:
            event_data: Product event dictionary
            partition_key: Optional key for partitioning

        Returns:
            True if message was queued successfully
        """
        try:
            # Enrich event with metadata
            event = self._enrich_event(event_data)

            # Validate event
            self._validate_event(event)

            # Calculate partition key if not provided
            if partition_key is None:
                partition_key = event.get("source", "unknown")

            # Produce message
            self.producer.produce(
                topic=self.topic,
                key=partition_key,
                value=event,
                callback=self._delivery_callback,
            )

            # Poll for delivery confirmation
            self.producer.poll(0)

            logger.debug(f"Produced event: {event['event_id']}")
            return True

        except Exception as e:
            logger.error(f"Failed to produce event: {e}")
            self._send_to_dlq(event_data, str(e), "production_error")
            raise

    def produce_batch(
        self,
        events: List[Dict[str, Any]],
        batch_size: int = 100,
    ) -> Dict[str, int]:
        """
        Produce multiple events in batches for efficiency.

        Args:
            events: List of product event dictionaries
            batch_size: Number of events to batch together

        Returns:
            Dict with success and failure counts
        """
        results = {"success": 0, "failed": 0, "dlq": 0}

        for i in range(0, len(events), batch_size):
            batch = events[i : i + batch_size]

            for event in batch:
                try:
                    if self.produce_event(event):
                        results["success"] += 1
                except Exception as e:
                    results["failed"] += 1
                    logger.error(f"Batch item failed: {e}")

            # Flush after each batch
            self.flush()
            logger.info(
                f"Batch {i//batch_size + 1}/{(len(events)-1)//batch_size + 1} "
                f"processed - Success: {results['success']}, Failed: {results['failed']}"
            )

        return results

    def _enrich_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich event with required metadata"""
        event = event_data.copy()

        # Add event metadata if not present
        if "event_id" not in event:
            event["event_id"] = str(uuid.uuid4())

        if "event_timestamp" not in event:
            event["event_timestamp"] = int(datetime.utcnow().timestamp() * 1000)

        # Convert datetime objects to timestamps
        for key in ["scraped_at", "normalized_at"]:
            if key in event and isinstance(event[key], datetime):
                event[key] = int(event[key].timestamp() * 1000)

        # Convert Decimal to string for Avro
        for key in ["original_price", "sale_price"]:
            if key in event and isinstance(event[key], Decimal):
                event[key] = str(event[key])

        # Ensure raw_attributes is a dict of strings
        if "raw_attributes" not in event:
            event["raw_attributes"] = {}

        return event

    def _validate_event(self, event: Dict[str, Any]) -> None:
        """Validate event data before production"""
        required_fields = ["event_id", "source", "title", "scraped_at"]

        missing = [f for f in required_fields if f not in event or event[f] is None]
        if missing:
            raise ValueError(f"Missing required fields: {missing}")

    def _send_to_dlq(
        self,
        event: Dict[str, Any],
        error_message: str,
        error_type: str,
    ) -> None:
        """Send failed event to dead letter queue"""
        try:
            dlq_event = {
                "event_id": str(uuid.uuid4()),
                "original_event": json.dumps(event, default=str),
                "error_message": error_message,
                "error_type": error_type,
                "failed_at": int(datetime.utcnow().timestamp() * 1000),
                "retry_count": event.get("retry_count", 0),
                "source": event.get("source", "unknown"),
            }

            self.dlq_producer.produce(
                topic=self.dlq_topic,
                key=str(uuid.uuid4()),
                value=json.dumps(dlq_event),
            )
            self.dlq_producer.poll(0)
            logger.warning(f"Event sent to DLQ: {dlq_event['event_id']}")

        except Exception as e:
            logger.error(f"Failed to send to DLQ: {e}")

    def flush(self, timeout: float = 30.0) -> int:
        """Flush all pending messages"""
        remaining = self.producer.flush(timeout)
        if remaining > 0:
            logger.warning(f"{remaining} messages still in queue after flush")
        return remaining

    def close(self):
        """Close the producer and cleanup resources"""
        logger.info("Closing producer...")
        self.flush(timeout=60.0)
        self.producer.close()
        self.dlq_producer.flush(timeout=10.0)
        logger.info("Producer closed")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


def create_producer_from_env() -> ProductProducer:
    """Create a ProductProducer from environment variables"""
    bootstrap_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    schema_registry_url = os.getenv("SCHEMA_REGISTRY_URL", "http://localhost:8081")
    topic = os.getenv("KAFKA_TOPIC", "product-events")

    return ProductProducer(
        bootstrap_servers=bootstrap_servers,
        schema_registry_url=schema_registry_url,
        topic=topic,
    )


if __name__ == "__main__":
    # Example usage
    producer = create_producer_from_env()

    # Sample event
    sample_event = {
        "source": "seasons_skateshop",
        "source_product_id": "12345",
        "title": "Independent Stage 11 Trucks",
        "brand": "Independent",
        "category": "trucks",
        "original_price": "55.00",
        "sale_price": "45.00",
        "currency": "USD",
        "image_url": "https://example.com/image.jpg",
        "product_url": "https://example.com/product",
        "availability": "in_stock",
        "scraped_at": int(datetime.utcnow().timestamp() * 1000),
    }

    try:
        producer.produce_event(sample_event)
        print("Event produced successfully")
    finally:
        producer.close()
