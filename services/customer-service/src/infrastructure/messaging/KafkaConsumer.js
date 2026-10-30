const { Kafka, logLevel } = require("kafkajs");

const CreateCustomer = require("../../application/use-cases/CreateCustomer");
const PostgresCustomerRepository = require("../repositories/PostgresCustomerRepository");

const kafka = new Kafka({
    clientId: "customer-service",
    brokers: [
        process.env.KAFKA_BROKER || "127.0.0.1:9094"
    ],
    logLevel: logLevel.ERROR
});

const consumer = kafka.consumer({
    groupId: "customer-service-user-registered-v3"
});

const repository = new PostgresCustomerRepository();
const createCustomer = new CreateCustomer(repository);

async function startConsumer() {
    await consumer.connect();

    console.log("Customer Kafka Consumer connected");

    await consumer.subscribe({
        topic: "user.registered",
        fromBeginning: true
    });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            let event;

            try {
                event = JSON.parse(message.value.toString());
            } catch (error) {
                console.error("Invalid JSON event:", error.message);
                return;
            }

            if (event.test === true) {
                console.log("Skipping test event:", event.eventId);
                return;
            }

            if (
                event.eventType !== "UserRegistered" ||
                typeof event.userId !== "string" ||
                !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(event.userId)
            ) {
                console.error("Invalid UserRegistered event:", {
    eventId: event.eventId,
    eventType: event.eventType,
    userId: event.userId,
    test: event.test
});
                return;
            }

            try {
                const existing = await repository.findByAuthUserId(
                    event.userId
                );

                if (existing) {
                    console.log(
                        "Customer already exists, skipping:",
                        event.userId
                    );
                    return;
                }

                const customer = await createCustomer.execute({
                    authUserId: event.userId,
                    fullName: event.fullName || "New Customer",
                    phone: null
                });

                console.log("Customer created from Kafka:", {
                    customerId: customer.id,
                    authUserId: customer.authUserId
                });

            } catch (error) {
                if (
                    error.message === "Customer already exists" ||
                    error.code === "23505"
                ) {
                    console.log(
                        "Duplicate customer event, skipping:",
                        event.userId
                    );
                    return;
                }

                console.error(
                    "Customer creation failed:",
                    error.message
                );

                // Ném lỗi để KafkaJS không coi xử lý là thành công.
                throw error;
            }
        }
    });
}

async function stopConsumer() {
    await consumer.disconnect();
}

module.exports = {
    startConsumer,
    stopConsumer
};