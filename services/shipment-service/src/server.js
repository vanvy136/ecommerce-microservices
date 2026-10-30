require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();

const SERVICE_NAME = "shipment-service";
const PORT = Number(process.env.PORT || 3105);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        service: SERVICE_NAME,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`${SERVICE_NAME} running on port ${PORT}`);
});
