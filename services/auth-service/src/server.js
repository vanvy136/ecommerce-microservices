
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./interfaces/http/routes/authRoutes");

const {
    startOutboxPublisher,
    stopOutboxPublisher
} = require("./infrastructure/messaging/OutboxPublisher");

const app = express();

const SERVICE_NAME = "auth-service";
const PORT = Number(process.env.PORT || 3101);

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

// Auth Routes
app.use("/auth", authRoutes);

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

// Start Auth Service
const server = app.listen(PORT, () => {
    console.log(`${SERVICE_NAME} running on port ${PORT}`);

    // Start Transactional Outbox Publisher
    startOutboxPublisher();
});

// Graceful Shutdown
function shutdown(signal) {
    console.log(`${signal} received. Shutting down...`);

    stopOutboxPublisher();

    server.close(() => {
        console.log("Auth HTTP server stopped");
        process.exit(0);
    });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
