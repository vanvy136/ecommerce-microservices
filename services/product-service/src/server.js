require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");

const connectMongoDB = require("./infrastructure/database/mongodb");
const productRoutes = require("./interfaces/http/routes/productRoutes");

const app = express();
const PORT = Number(process.env.PORT || 3103);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        service: "product-service",
        timestamp: new Date().toISOString()
    });
});

app.use("/products", productRoutes);

async function start() {
    await connectMongoDB();

    const server = app.listen(PORT, () => {
        console.log(`product-service running on port ${PORT}`);
    });

    async function shutdown(signal) {
        console.log(`${signal} received`);
        server.close(async () => {
            await mongoose.disconnect();
            process.exit(0);
        });
    }

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch(error => {
    console.error("Product Service startup failed:", error.message);
    process.exit(1);
});