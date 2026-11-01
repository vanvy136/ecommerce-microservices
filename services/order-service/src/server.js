
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const pool = require("./infrastructure/database/pool");
const orderRoutes = require("./interfaces/http/routes/orderRoutes");

const {
  startOutboxPublisher,
  stopOutboxPublisher
} = require("./infrastructure/messaging/OutboxPublisher");

const {
  disconnectProducer
} = require("./infrastructure/messaging/KafkaProducer");

const app = express();
const PORT = Number(process.env.PORT || 3105);

app.disable("x-powered-by");

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Health check
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    return res.json({
      status: "ok",
      service: "order-service",
      database: "connected"
    });
  } catch (error) {
    console.error("Health check failed:", error.message);

    return res.status(503).json({
      status: "error",
      service: "order-service",
      database: "disconnected"
    });
  }
});

// Order API
app.use("/orders", orderRoutes);

// Route khong ton tai
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

// Xu ly loi chung
app.use((err, req, res, next) => {
  console.error("Order Service error:", err.message);

  return res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});

let httpServer = null;
let shuttingDown = false;

async function start() {
  try {
    await pool.query("SELECT 1");

    console.log("PostgreSQL connected successfully");

    httpServer = app.listen(PORT, "127.0.0.1", () => {
      console.log(
        `Order Service running on http://127.0.0.1:${PORT}`
      );

      startOutboxPublisher();
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`${signal}: shutting down Order Service`);

  stopOutboxPublisher();

  if (httpServer) {
    await new Promise((resolve) => {
      httpServer.close(resolve);
    });
  }

  try {
    await disconnectProducer();
    await pool.end();

    console.log("Order Service stopped");
    process.exit(0);
  } catch (error) {
    console.error("Shutdown failed:", error.message);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

start();
