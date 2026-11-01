
const express = require("express");

const {
  createOrder,
  verifyOrderForShipment
} = require("../controllers/OrderController");

const authenticateInternal = require(
  "../middlewares/authenticateInternal"
);

const router = express.Router();

// API tao don hang hien tai
router.post("/", createOrder);

// API xac minh don hang cho service noi bo
router.get(
  "/internal/:orderId/shipment-verification",
  authenticateInternal,
  verifyOrderForShipment
);

module.exports = router;
