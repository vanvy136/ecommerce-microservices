const { Kafka } = require("kafkajs");

const kafka = new Kafka({
    clientId: "auth-service",
    brokers: [
        process.env.KAFKA_BROKER || "127.0.0.1:9094"
    ],
    connectionTimeout: 10000
});

const producer = kafka.producer();

let connected = false;

async function connect() {
    if (!connected) {
        await producer.connect();
        connected = true;
        console.log("Auth Kafka Producer connected");
    }
}

async function publish(topic, event) {
    if (!connected) {
        await connect();
    }

    await producer.send({
        topic,
        messages: [
            {
                key: event.userId || event.eventId,
                value: JSON.stringify(event)
            }
        ]
    });
}

async function disconnect() {
    if (connected) {
        await producer.disconnect();
        connected = false;
    }
}

module.exports = {
    connect,
    publish,
    disconnect
};