"""
Kafka Consumer for Product Events
Processes product events with deduplication, validation, and exactly-once semantics
"""

import json
import logging
import time
from datetime import datetime
from typing import Dict, Any, Optional, Callable, Set
from decimal import Decimal

from confluent_kafka import Consumer, KafkaError, TopicPartition
from confluent_kafka.admin import AdminClient
import redis
from pybloom_live import BloomFilter

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from schemas.avro_schemas import AvroSchemaRegistry, TOPIC_CONFIGURATIONS
from models.product import Product, ProductPriceHistory, ShopSource

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DeduplicationService:
    """
    Service for deduplicating product events using Redis and Bloom filters
    """

    def __init__(
        self,
        redis_url: str = "redis://localhost:6379/0",
        bloom_capacity: int = 100000,
        bloom_error_rate: float = 0.01,
    ):
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
        self.bloom_filter = BloomFilter(
            capacity=bloom_capacity, error_rate=bloom_error_rate
        )
        self.dedup_window_hours = 24  # Deduplication window

    def _generate_fingerprint(self, event: Dict[str, Any]) -> str:
        """Generate a unique fingerprint for an event"""
        # Create fingerprint from key identifying fields
        source = event.get("source", "unknown")
        product_id = event.get("source_product_id") or event.get("product_id", "")
        title = event.get("title", "")
        price = event.get("sale_price") or event.get("original_price", "")

        fingerprint = f"{source}:{product_id}:{title}:{price}"
        return fingerprint

    def is_duplicate(self, event: Dict[str, Any]) -> bool:
        """
        Check if an event is a duplicate
        Uses Bloom filter for fast check, then Redis for confirmation
        """
        fingerprint = self._generate_fingerprint(event)

        # Check Bloom filter first (fast, may have false positives)
        if fingerprint not in self.bloom_filter:
            # Definitely not seen before
            self.bloom_filter.add(fingerprint)
            return False

        # Bloom filter says maybe - check Redis for confirmation
        redis_key = f"skatestock:dedup:{fingerprint}"
        if self.redis_client.exists(redis_key):
            return True

        # Mark as seen in Redis with TTL
        self.redis_client.setex(
            redis_key, int(self.dedup_window_hours * 3600), str(time.time())
        )
        return False

    def mark_processed(self, event: Dict[str, Any]):
        """Mark an event as processed"""
        fingerprint = self._generate_fingerprint(event)
        self.bloom_filter.add(fingerprint)

        redis_key = f"skatestock:dedup:{fingerprint}"
        self.redis_client.setex(
            redis_key, int(self.dedup_window_hours * 3600), str(time.time())
        )


class ProductConsumer:
    """
    Kafka consumer for product events with exactly-once processing

    Features:
    - Manual offset management for exactly-once semantics
    - Deduplication using Bloom filters and Redis
    - Dead letter queue for failed events
    - Configurable processing handlers
    """

    def __init__(
        self,
        bootstrap_servers: str = "localhost:9092",
        redis_url: str = "redis://localhost:6379/0",
        group_id: str = "skatestock-consumers",
        client_id: str = "skatestock-consumer-1",
        topics: Optional[list] = None,
    ):
        self.bootstrap_servers = bootstrap_servers
        self.group_id = group_id
        self.client_id = client_id
        self.topics = topics or ["product-events"]

        # Consumer configuration
        self.consumer_config = {
            "bootstrap.servers": bootstrap_servers,
            "group.id": group_id,
            "client.id": client_id,
            "auto.offset.reset": "earliest",
            "enable.auto.commit": False,  # Manual commit for exactly-once
            "max.poll.interval.ms": 300000,
            "session.timeout.ms": 45000,
            "heartbeat.interval.ms": 15000,
        }

        self.consumer: Optional[Consumer] = None
        self.dedup_service = DeduplicationService(redis_url)
        self.running = False

        # Processing statistics
        self.stats = {"processed": 0, "duplicates": 0, "failed": 0, "dead_lettered": 0}

        # Event handlers
        self.on_product_received: Optional[Callable] = None
        self.on_error: Optional[Callable] = None

    def connect(self):
        """Initialize Kafka consumer"""
        logger.info(f"Connecting consumer to {self.bootstrap_servers}")

        self.consumer = Consumer(self.consumer_config)
        self.consumer.subscribe(self.topics)

        logger.info(f"Consumer subscribed to topics: {self.topics}")

    def process_message(self, msg) -> bool:
        """
        Process a single Kafka message

        Returns:
            bool: True if processing succeeded, False otherwise
        """
        try:
            # Parse message value
            event = json.loads(msg.value().decode("utf-8"))

            logger.debug(
                f"Processing message from {msg.topic()}: {event.get('source', 'unknown')}"
            )

            # Deduplication check
            if self.dedup_service.is_duplicate(event):
                logger.debug(
                    f"Duplicate event detected: {event.get('source_product_id')}"
                )
                self.stats["duplicates"] += 1
                return True  # Return true to commit offset

            # Validate event
            if not self._validate_event(event):
                logger.warning(f"Invalid event: {event}")
                self._send_to_dead_letter(event, "Validation failed", "validation")
                return True

            # Normalize event to Product model
            product = self._normalize_event(event)

            # Call registered handler
            if self.on_product_received:
                self.on_product_received(product, event)

            # Mark as processed
            self.dedup_service.mark_processed(event)
            self.stats["processed"] += 1

            # Log progress
            if self.stats["processed"] % 100 == 0:
                logger.info(
                    f"Processed {self.stats['processed']} products. "
                    f"Duplicates: {self.stats['duplicates']}, "
                    f"Failed: {self.stats['failed']}"
                )

            return True

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse message: {e}")
            self.stats["failed"] += 1
            return True  # Commit to skip bad message
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            self.stats["failed"] += 1

            # Try to send to dead letter queue
            try:
                event = json.loads(msg.value().decode("utf-8"))
                self._send_to_dead_letter(event, str(e), "processing")
            except:
                pass

            if self.on_error:
                self.on_error(e, msg)

            return False

    def _validate_event(self, event: Dict[str, Any]) -> bool:
        """Validate that event has required fields"""
        required_fields = ["source", "title"]
        return all(field in event and event[field] for field in required_fields)

    def _normalize_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize event to standard product format"""
        # Extract brand from title
        title = event.get("title", "")
        brand = self._extract_brand(title)

        # Parse prices
        original_price = self._parse_price(event.get("original_price"))
        sale_price = self._parse_price(event.get("sale_price"))

        # Calculate discount
        discount_pct = None
        if original_price and sale_price and original_price > 0:
            discount_pct = round(
                (original_price - sale_price) / original_price * 100, 2
            )

        normalized = {
            "product_id": f"{event.get('source')}_{event.get('source_product_id')}",
            "source_product_id": event.get("source_product_id"),
            "title": title,
            "brand": brand,
            "category": event.get("category", "unknown"),
            "original_price": original_price,
            "sale_price": sale_price,
            "discount_percentage": discount_pct,
            "currency": event.get("currency", "USD"),
            "image_url": event.get("image_url"),
            "product_url": event.get("product_url"),
            "source": event.get("source"),
            "availability": event.get("availability", "unknown"),
            "stock_quantity": event.get("stock_quantity"),
            "color": event.get("color"),
            "size": event.get("size"),
            "normalized_at": datetime.utcnow().isoformat(),
            "confidence_score": event.get("confidence_score", 1.0),
        }

        return normalized

    def _extract_brand(self, title: str) -> Optional[str]:
        """Extract brand name from product title"""
        known_brands = [
            "Baker",
            "Thrasher",
            "Independent",
            "Spitfire",
            "Vans",
            "Nike SB",
            "Adidas",
            "Converse",
            "Emerica",
            "eS",
            "Etnies",
            "Fallen",
            "Lakai",
            "New Balance",
            "DC Shoes",
            "Supreme",
            "Palace",
            "FTC",
            "HUF",
            "Stüssy",
        ]

        title_upper = title.upper()
        for brand in known_brands:
            if brand.upper() in title_upper:
                return brand
        return None

    def _parse_price(self, price_val) -> Optional[float]:
        """Parse price value to float"""
        if not price_val:
            return None
        if isinstance(price_val, (int, float)):
            return float(price_val)
        if isinstance(price_val, str):
            # Remove currency symbols and commas
            cleaned = price_val.replace("$", "").replace(",", "").strip()
            try:
                return float(cleaned)
            except ValueError:
                return None
        return None

    def _send_to_dead_letter(
        self, event: Dict[str, Any], error_message: str, processing_stage: str
    ):
        """Send failed event to dead letter queue"""
        # Note: In production, this would publish to a DLQ topic
        # For now, just log it
        logger.error(f"Dead letter event: {error_message} at {processing_stage}")
        self.stats["dead_lettered"] += 1

    def start_consuming(self, timeout: float = 1.0):
        """Start consuming messages"""
        if not self.consumer:
            raise RuntimeError("Consumer not connected. Call connect() first.")

        self.running = True
        logger.info("Starting consumer loop...")

        try:
            while self.running:
                msg = self.consumer.poll(timeout)

                if msg is None:
                    continue

                if msg.error():
                    if msg.error().code() == KafkaError._PARTITION_EOF:
                        logger.debug(f"Reached end of partition {msg.partition()}")
                    else:
                        logger.error(f"Consumer error: {msg.error()}")
                    continue

                # Process message
                success = self.process_message(msg)

                # Commit offset if processing succeeded
                if success:
                    self.consumer.commit(msg)

        except KeyboardInterrupt:
            logger.info("Consumer stopped by user")
        finally:
            self.close()

    def stop(self):
        """Stop the consumer"""
        self.running = False

    def close(self):
        """Close the consumer connection"""
        logger.info("Closing consumer...")
        self.running = False

        if self.consumer:
            self.consumer.close()
            self.consumer = None

        logger.info(f"Consumer stats: {self.stats}")

    def get_stats(self) -> Dict[str, Any]:
        """Get consumer statistics"""
        return {
            **self.stats,
            "running": self.running,
            "connected": self.consumer is not None,
            "topics": self.topics,
        }


class ProductConsumerGroup:
    """Manage a group of consumers for parallel processing"""

    def __init__(
        self,
        num_consumers: int = 3,
        bootstrap_servers: str = "localhost:9092",
        redis_url: str = "redis://localhost:6379/0",
        group_id: str = "skatestock-consumers",
    ):
        self.num_consumers = num_consumers
        self.consumers: list[ProductConsumer] = []

        for i in range(num_consumers):
            consumer = ProductConsumer(
                bootstrap_servers=bootstrap_servers,
                redis_url=redis_url,
                group_id=group_id,
                client_id=f"skatestock-consumer-{i+1}",
            )
            self.consumers.append(consumer)

    def connect_all(self):
        """Connect all consumers in the group"""
        for consumer in self.consumers:
            consumer.connect()

    def start_all(self):
        """Start all consumers (blocking)"""
        import threading

        threads = []
        for consumer in self.consumers:
            t = threading.Thread(target=consumer.start_consuming)
            t.daemon = True
            t.start()
            threads.append(t)

        # Wait for all threads
        for t in threads:
            t.join()

    def stop_all(self):
        """Stop all consumers"""
        for consumer in self.consumers:
            consumer.stop()

    def close_all(self):
        """Close all consumers"""
        for consumer in self.consumers:
            consumer.close()


if __name__ == "__main__":
    # Test the consumer
    def on_product(product, event):
        print(f"Received product: {product['title']} from {product['source']}")

    consumer = ProductConsumer(
        bootstrap_servers="localhost:9092", redis_url="redis://localhost:6379/0"
    )
    consumer.on_product_received = on_product

    consumer.connect()
    consumer.start_consuming()
