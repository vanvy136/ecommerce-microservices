
const { Kafka, logLevel } = require("kafkajs");

const brokers = (
  process.env.KAFKA_BROKERS || "127.0.0.1:9094"
)
  .split(",")
  .map((broker) => broker.trim())
  .filter(Boolean);

const kafka = new Kafka({
  clientId: "order-service",
  brokers,
  logLevel: logLevel.ERROR,
  retry: {
    initialRetryTime: 300,
    retries: 5
  }
});

const producer = kafka.producer({
  allowAutoTopicCreation: false
});

let connected = false;

async function connectProducer() {
  if (connected) return;

  await producer.connect();
  connected = true;

  console.log("Order Kafka Producer connected");
}

async function publishEvent(topic, event) {
  if (!connected) {
    await connectProducer();
  }

  await producer.send({
    topic,
    messages: [
      {
        key: String(event.orderId),
        value: JSON.stringify(event)
      }
    ],
    acks: -1
  });
}

async function disconnectProducer() {
  if (!connected) return;

  await producer.disconnect();
  connected = false;
}

module.exports = {
  connectProducer,
  publishEvent,
  disconnectProducer
};
