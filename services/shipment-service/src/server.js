
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const shipmentRoutes = require(
  "./interfaces/http/routes/shipmentRoutes"
);

const app = express();

const SERVICE_NAME = "shipment-service";
const PORT = Number(process.env.PORT || 3106);

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

// Tam thoi chi mo health check.
// Shipment APIs se duoc kich hoat sau khi bo sung bao mat.
if (process.env.ENABLE_SHIPMENT_API === "true") {
  app.use("/shipments", shipmentRoutes);
}

app.listen(PORT, () => {
  console.log(`${SERVICE_NAME} running on port ${PORT}`);
});

module.exports = app;
