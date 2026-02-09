/**
 * Kafka Configuration
 * Uses kafkajs for Kafka connection and message production
 */

const { Kafka } = require('kafkajs');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'kafka' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Parse KAFKA_BROKERS from environment
const parseBrokers = (brokersString) => {
  if (!brokersString) {
    return ['localhost:9092'];
  }
  return brokersString.split(',').map(b => b.trim());
};

const brokers = parseBrokers(process.env.KAFKA_BROKERS);
const clientId = process.env.KAFKA_CLIENT_ID || 'skatestock-api';

// Kafka configuration
const kafkaConfig = {
  clientId,
  brokers,
  
  // Connection settings
  connectionTimeout: 3000,
  requestTimeout: 25000,
  retry: {
    initialRetryTime: 100,
    retries: 5,
    maxRetryTime: 30000
  },
  
  // SASL authentication (if configured)
  ...(process.env.KAFKA_SASL_USERNAME && process.env.KAFKA_SASL_PASSWORD && {
    sasl: {
      mechanism: 'plain',
      username: process.env.KAFKA_SASL_USERNAME,
      password: process.env.KAFKA_SASL_PASSWORD
    },
    ssl: process.env.KAFKA_SSL === 'true'
  })
};

// Create Kafka instance
const kafka = new Kafka(kafkaConfig);

// Create producer instance
const producer = kafka.producer({
  allowAutoTopicCreation: true,
  transactionTimeout: 30000,
  idempotent: true,
  maxInFlightRequests: 1
});

// Producer connection state
let isConnected = false;

/**
 * Connect the Kafka producer
 */
const connect = async () => {
  try {
    if (!isConnected) {
      await producer.connect();
      isConnected = true;
      logger.info('Kafka producer connected', { brokers });
    }
  } catch (error) {
    logger.error('Failed to connect Kafka producer', { error: error.message });
    throw error;
  }
};

/**
 * Disconnect the Kafka producer
 */
const disconnect = async () => {
  try {
    if (isConnected) {
      await producer.disconnect();
      isConnected = false;
      logger.info('Kafka producer disconnected');
    }
  } catch (error) {
    logger.error('Failed to disconnect Kafka producer', { error: error.message });
    throw error;
  }
};

/**
 * Send a message to a Kafka topic
 * @param {string} topic - Topic name
 * @param {Object} message - Message object
 * @param {string} key - Optional message key
 * @returns {Promise<Object>} - Send result
 */
const sendMessage = async (topic, message, key = null) => {
  try {
    if (!isConnected) {
      await connect();
    }
    
    const messagePayload = {
      topic,
      messages: [
        {
          value: JSON.stringify(message),
          ...(key && { key }),
          timestamp: Date.now().toString()
        }
      ]
    };
    
    const result = await producer.send(messagePayload);
    
    logger.debug('Message sent to Kafka', {
      topic,
      partition: result[0]?.partition,
      offset: result[0]?.baseOffset
    });
    
    return result;
  } catch (error) {
    logger.error('Failed to send message to Kafka', {
      topic,
      error: error.message
    });
    throw error;
  }
};

/**
 * Send multiple messages to a Kafka topic
 * @param {string} topic - Topic name
 * @param {Array<Object>} messages - Array of message objects
 * @returns {Promise<Object>} - Send result
 */
const sendBatch = async (topic, messages) => {
  try {
    if (!isConnected) {
      await connect();
    }
    
    const batchPayload = {
      topicMessages: [
        {
          topic,
          messages: messages.map(msg => ({
            value: JSON.stringify(msg.value),
            ...(msg.key && { key: msg.key }),
            timestamp: Date.now().toString()
          }))
        }
      ]
    };
    
    const result = await producer.sendBatch(batchPayload);
    
    logger.debug('Batch sent to Kafka', {
      topic,
      messageCount: messages.length
    });
    
    return result;
  } catch (error) {
    logger.error('Failed to send batch to Kafka', {
      topic,
      error: error.message
    });
    throw error;
  }
};

/**
 * Check Kafka health
 * @returns {Promise<Object>} - Health status
 */
const checkHealth = async () => {
  try {
    const admin = kafka.admin();
    await admin.connect();
    const clusterInfo = await admin.describeCluster();
    await admin.disconnect();
    
    return {
      status: 'healthy',
      brokers: clusterInfo.brokers.length,
      clusterId: clusterInfo.clusterId,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Producer event handlers
producer.on('producer.connect', () => {
  logger.info('Producer connected event');
});

producer.on('producer.disconnect', () => {
  logger.info('Producer disconnected event');
  isConnected = false;
});

producer.on('producer.network.request_timeout', (payload) => {
  logger.warn('Producer network request timeout', payload);
});

module.exports = {
  kafka,
  producer,
  connect,
  disconnect,
  sendMessage,
  sendBatch,
  checkHealth
};
