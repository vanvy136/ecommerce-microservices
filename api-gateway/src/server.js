
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/customerRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const shipmentRoutes = require("./routes/shipmentRoutes");
const authenticate = require("./middlewares/authenticate");
const authorize = require("./middlewares/authorize");
const {
    generalLimiter,
    authLimiter
} = require("./middlewares/rateLimiter");

const redisClient = require("./redis/client");
const cacheResponse = require("./middlewares/cacheResponse");

const app = express();
const PORT = Number(process.env.PORT || 3100);

app.disable("x-powered-by");

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        service: "api-gateway",
        timestamp: new Date().toISOString()
    });
});

// Rate limiting cho các API
app.use(generalLimiter);

// Proxy phải được đặt trước express.json()
// để giữ nguyên body khi chuyển tiếp POST request.
app.use("/auth", authLimiter, authRoutes);
// Customer Service Proxy
app.use("/customers", customerRoutes);
app.use("/products", productRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", orderRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", orderRoutes);
app.use("/shipments", shipmentRoutes);
// JWT Authentication
app.get("/gateway/me", authenticate, (req, res) => {
    res.json({
        success: true,
        data: req.user
    });
});

// Authorization: chỉ admin
app.get(
    "/gateway/admin",
    authenticate,
    authorize("admin"),
    (req, res) => {
        res.json({
            success: true,
            message: "Admin access granted"
        });
    }
);

// Public endpoint dùng Redis Cache
app.get("/gateway/public-info", cacheResponse, (req, res) => {
    res.json({
        success: true,
        service: "api-gateway",
        generatedAt: new Date().toISOString()
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

async function start() {
    try {
        await redisClient.connect();
        console.log("Redis connected");
    } catch (error) {
        console.error("Redis unavailable:", error.message);
    }

    app.listen(PORT, () => {
        console.log(`api-gateway running on port ${PORT}`);
    });
}

start();
