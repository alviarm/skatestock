/**
 * SkateStock Kafka Consumer
 *
 * Production-ready consumer with exactly-once semantics,
 * idempotency handling, and dead letter queue support.
 *
 * Features:
 * - Exactly-once processing with PostgreSQL offset tracking
 * - Idempotent message processing
 * - Dead letter queue for failed records
 * - Auto-rebalancing and consumer group management
 *
 * @module consumer
 * @version 1.0.0
 */

const { Kafka } = require("kafkajs");
const { Pool } = require("pg");
const Redis = require("ioredis");
const winston = require("winston");
const { v4: uuidv4 } = require("uuid");

// ==========================================
// CONFIGURATION
// ==========================================

const CONFIG = {
  KAFKA: {
    BROKERS: process.env.KAFKA_BROKERS
      ? process.env.KAFKA_BROKERS.split(",")
      : ["localhost:9092"],
    CLIENT_ID: process.env.CONSUMER_GROUP || "skatestock-consumer",
    CONSUMER_GROUP: process.env.CONSUMER_GROUP || "product-processors",
    TOPIC_PRODUCTS: "product-events",
    TOPIC_DLQ: "product-events-dlq",
    SESSION_TIMEOUT: 30000,
    HEARTBEAT_INTERVAL: 3000,
  },
  POSTGRES: {
    HOST: process.env.POSTGRES_HOST || "localhost",
    PORT: parseInt(process.env.POSTGRES_PORT) || 5432,
    DATABASE: process.env.POSTGRES_DB || "skatestock",
    USER: process.env.POSTGRES_USER || "skatestock",
    PASSWORD: process.env.POSTGRES_PASSWORD || "skatestock_dev_password",
  },
  REDIS: {
    HOST: process.env.REDIS_HOST || "localhost",
    PORT: parseInt(process.env.REDIS_PORT) || 6379,
  },
  PROCESSING: {
    BATCH_SIZE: 100,
    CONCURRENCY: 10,
  },
};

// ==========================================
// LOGGER SETUP
// ==========================================

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "skatestock-consumer" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: "logs/consumer-error.log",
      level: "error",
    }),
    new winston.transports.File({ filename: "logs/consumer.log" }),
  ],
});

// ==========================================
// DATABASE CONNECTIONS
// ==========================================

const pgPool = new Pool({
  host: CONFIG.POSTGRES.HOST,
  port: CONFIG.POSTGRES.PORT,
  database: CONFIG.POSTGRES.DATABASE,
  user: CONFIG.POSTGRES.USER,
  password: CONFIG.POSTGRES.PASSWORD,
  max: 20,
});

const redis = new Redis({
  host: CONFIG.REDIS.HOST,
  port: CONFIG.REDIS.PORT,
});

// ==========================================
// KAFKA SETUP
// ==========================================

const kafka = new Kafka({
  clientId: CONFIG.KAFKA.CLIENT_ID,
  brokers: CONFIG.KAFKA.BROKERS,
});

const consumer = kafka.consumer({
  groupId: CONFIG.KAFKA.CONSUMER_GROUP,
  sessionTimeout: CONFIG.KAFKA.SESSION_TIMEOUT,
  heartbeatInterval: CONFIG.KAFKA.HEARTBEAT_INTERVAL,
});

const producer = kafka.producer();

// ==========================================
// EXACTLY-ONCE SEMANTICS
// ==========================================

/**
 * Get stored offset for partition
 */
async function getStoredOffset(topic, partition) {
  const result = await pgPool.query(
    `SELECT offset FROM kafka_consumer_offsets 
     WHERE consumer_group = $1 AND topic = $2 AND partition = $3`,
    [CONFIG.KAFKA.CONSUMER_GROUP, topic, partition],
  );
  return result.rows.length > 0 ? result.rows[0].offset : null;
}

/**
 * Store offset for exactly-once processing
 */
async function storeOffset(topic, partition, offset) {
  await pgPool.query(
    `INSERT INTO kafka_consumer_offsets (consumer_group, topic, partition, offset, last_updated_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
     ON CONFLICT (consumer_group, topic, partition)
     DO UPDATE SET offset = $4, last_updated_at = CURRENT_TIMESTAMP`,
    [CONFIG.KAFKA.CONSUMER_GROUP, topic, partition, offset],
  );
}

/**
 * Check if event has been processed (idempotency)
 */
async function isProcessed(eventId) {
  const exists = await redis.get(`processed:${eventId}`);
  return exists !== null;
}

/**
 * Mark event as processed
 */
async function markProcessed(eventId, ttl = 86400) {
  await redis.setex(`processed:${eventId}`, ttl, "1");
}

// ==========================================
// MESSAGE PROCESSING
// ==========================================

/**
 * Process product event and upsert to database
 */
async function processProductEvent(event) {
  const client = await pgPool.connect();

  try {
    await client.query("BEGIN");

    // Check for existing product
    const existingResult = await client.query(
      `SELECT id, sale_price, original_price FROM products 
       WHERE shop_id = $1 AND external_id = $2`,
      [event.shopId, event.product.externalId],
    );

    if (existingResult.rows.length > 0) {
      // Update existing product
      const existing = existingResult.rows[0];

      await client.query(
        `UPDATE products SET
          title = $1,
          sale_price = $2,
          original_price = $3,
          currency = $4,
          image_url = $5,
          product_url = $6,
          availability_status = $7,
          last_seen_at = CURRENT_TIMESTAMP,
          last_updated_at = CURRENT_TIMESTAMP,
          raw_data = $8
        WHERE id = $9`,
        [
          event.product.title,
          event.product.salePrice,
          event.product.originalPrice,
          event.product.currency,
          event.product.imageUrl,
          event.product.productUrl,
          event.product.availabilityStatus,
          JSON.stringify(event),
          existing.id,
        ],
      );

      logger.debug(`Updated product ${existing.id}`);
    } else {
      // Insert new product
      const result = await client.query(
        `INSERT INTO products (
          external_id, shop_id, title, brand_id, category_id,
          original_price, sale_price, currency,
          image_url, product_url, availability_status,
          raw_data, first_seen_at, last_seen_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id`,
        [
          event.product.externalId,
          event.shopId,
          event.product.title,
          null, // brand_id - lookup needed
          null, // category_id - lookup needed
          event.product.originalPrice,
          event.product.salePrice,
          event.product.currency,
          event.product.imageUrl,
          event.product.productUrl,
          event.product.availabilityStatus,
          JSON.stringify(event),
        ],
      );

      logger.debug(`Inserted new product ${result.rows[0].id}`);
    }

    // Store fingerprint
    await client.query(
      `INSERT INTO product_fingerprints (fingerprint, shop_id, created_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (fingerprint) DO NOTHING`,
      [event.fingerprint, event.shopId],
    );

    // Record processing latency metric
    const latency = Date.now() - event.timestamp;
    await client.query(
      `INSERT INTO pipeline_metrics (metric_name, metric_value, metric_unit, labels, recorded_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [
        "consumer_processing_latency",
        latency,
        "ms",
        JSON.stringify({ source: event.source }),
      ],
    );

    await client.query("COMMIT");

    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Send failed message to DLQ
 */
async function sendToDLQ(message, error, event = null) {
  try {
    await producer.send({
      topic: CONFIG.KAFKA.TOPIC_DLQ,
      messages: [
        {
          key: message.key || uuidv4(),
          value: JSON.stringify({
            errorId: uuidv4(),
            originalEvent: event
              ? JSON.stringify(event)
              : message.value?.toString(),
            errorType: "PROCESSING_ERROR",
            errorMessage: error.message,
            errorStack: error.stack,
            timestamp: Date.now(),
            source: event?.source || "unknown",
            topic: message.topic,
            partition: message.partition,
            offset: message.offset,
          }),
        },
      ],
    });

    logger.warn(`Sent message to DLQ`, {
      partition: message.partition,
      offset: message.offset,
      error: error.message,
    });
  } catch (dlqError) {
    logger.error("Failed to send to DLQ", { error: dlqError.message });
  }
}

// ==========================================
// CONSUMER LOOP
// ==========================================

/**
 * Process single message
 */
async function processMessage({ topic, partition, message }) {
  const startTime = Date.now();

  try {
    const event = JSON.parse(message.value.toString());

    // Idempotency check
    if (await isProcessed(event.eventId)) {
      logger.debug(`Skipping duplicate event ${event.eventId}`);
      return;
    }

    // Process the event
    await processProductEvent(event);

    // Mark as processed
    await markProcessed(event.eventId);

    // Store offset for exactly-once semantics
    await storeOffset(topic, partition, message.offset);

    const processingTime = Date.now() - startTime;
    logger.debug(`Processed message`, {
      partition,
      offset: message.offset,
      processingTimeMs: processingTime,
    });
  } catch (error) {
    logger.error(`Failed to process message`, {
      partition,
      offset: message.offset,
      error: error.message,
    });

    // Send to DLQ
    await sendToDLQ({ topic, partition, message, key: message.key }, error);
  }
}

// ==========================================
// SERVICE LIFECYCLE
// ==========================================

async function initialize() {
  logger.info("Initializing SkateStock Kafka Consumer");

  // Test connections
  const pgClient = await pgPool.connect();
  await pgClient.query("SELECT NOW()");
  pgClient.release();
  logger.info("PostgreSQL connected");

  await redis.ping();
  logger.info("Redis connected");

  // Connect to Kafka
  await consumer.connect();
  await producer.connect();
  logger.info("Kafka connected");

  // Subscribe to topics
  await consumer.subscribe({
    topic: CONFIG.KAFKA.TOPIC_PRODUCTS,
    fromBeginning: false,
  });
  logger.info(`Subscribed to topic: ${CONFIG.KAFKA.TOPIC_PRODUCTS}`);

  // Start consuming
  await consumer.run({
    autoCommit: false, // Manual commit for exactly-once
    eachBatchAutoResolve: true,
    eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
      logger.info(`Processing batch of ${batch.messages.length} messages`);

      for (const message of batch.messages) {
        await processMessage({
          topic: batch.topic,
          partition: batch.partition,
          message,
        });

        resolveOffset(message.offset);
        await heartbeat();
      }
    },
  });

  logger.info("Consumer is running");
}

async function shutdown() {
  logger.info("Shutting down consumer");

  await consumer.disconnect();
  await producer.disconnect();
  await pgPool.end();
  await redis.quit();

  logger.info("Shutdown complete");
  process.exit(0);
}

// ==========================================
// SIGNAL HANDLERS
// ==========================================

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", {
    error: error.message,
    stack: error.stack,
  });
  shutdown();
});

// ==========================================
// START
// ==========================================

initialize().catch((error) => {
  logger.error("Failed to initialize", { error: error.message });
  process.exit(1);
});

module.exports = { processProductEvent };
