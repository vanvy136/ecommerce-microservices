require("dotenv").config();

const express = require("express");
const { connectRedis, redisClient } = require("./infrastructure/redis/client");
const cartRoutes = require("./interfaces/http/routes/cartRoutes");

const app = express();
const PORT = Number(process.env.PORT || 3104);

app.disable("x-powered-by");

// Chỉ sử dụng X-User-Id từ Gateway đáng tin cậy.
// Cart Service không được công khai trực tiếp trên Internet.
app.use(express.json());

app.get("/health", async (req, res) => {
  try {
    await redisClient.ping();

    res.json({
      status: "ok",
      service: "cart-service",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      service: "cart-service"
    });
  }
});

app.use("/cart", cartRoutes);

app.use((err, req, res, next) => {
  console.error(err);

  res.status(400).json({
    success: false,
    message: "Invalid request"
  });
});

async function start() {
  try {
    await connectRedis();

    app.listen(PORT, "127.0.0.1", () => {
      console.log(`Cart Service running on http://127.0.0.1:${PORT}`);
    });
  } catch (error) {
    console.error("Cart Service startup failed:", error.message);
    process.exit(1);
  }
}

start();