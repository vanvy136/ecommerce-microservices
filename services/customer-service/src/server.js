
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const customerRoutes = require("./interfaces/http/routes/customerRoutes");
const internalCustomerRoutes = require(
    "./interfaces/http/routes/internalCustomerRoutes"
);
const {
    startConsumer,
    stopConsumer
} = require("./infrastructure/messaging/KafkaConsumer");

const app = express();

const SERVICE_NAME = "customer-service";
const PORT = Number(process.env.PORT || 3102);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Health Check
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        service: SERVICE_NAME,
        timestamp: new Date().toISOString()
    });
});

// Customer REST API
app.use("/customers", customerRoutes);
app.use("/internal/customers", internalCustomerRoutes);
// Start Customer Service
const server = app.listen(PORT, () => {
    console.log(`${SERVICE_NAME} running on port ${PORT}`);

    startConsumer().catch((error) => {
        console.error("Kafka Consumer startup failed:", error);
    });
});

// Graceful Shutdown
let shuttingDown = false;

async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`${signal} received. Shutting down...`);

    server.close();

    try {
        await stopConsumer();
        console.log("Kafka Consumer stopped");
    } catch (error) {
        console.error("Kafka Consumer shutdown error:", error.message);
    }

    process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
