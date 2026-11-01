
require("dotenv").config();

const crypto = require("node:crypto");
const pool = require("./src/infrastructure/database/pool");
const {
  OrderRepository
} = require("./src/infrastructure/repositories/OrderRepository");

async function main() {
  const repository = new OrderRepository();

  const customerId =
    "95593264-c6c6-4c74-90d0-16405a6f1bde";

  const idempotencyKey = crypto.randomUUID();

  const requestHash = crypto
    .createHash("sha256")
    .update(JSON.stringify({
      version: 1,
      customerId,
      operation: "create-order",
      body: {}
    }))
    .digest("hex");

  const orderData = {
    customerId,
    idempotencyKey,
    requestHash,
    totalAmount: 18500000,
    items: [
      {
        productId: "6ae4c200cb400bf315866293",
        productName: "Laptop Dell Admin Test",
        quantity: 1,
        unitPrice: 18500000,
        subtotal: 18500000
      }
    ]
  };

  try {
    const first = await repository.createOrder(orderData);

    const second = await repository.createOrder(orderData);

    console.log("First order ID:", first.id);
    console.log("Second order ID:", second.id);

    console.log(
      "Same order:",
      first.id === second.id
    );

    console.log(
      "First alreadyExists:",
      first.alreadyExists
    );

    console.log(
      "Second alreadyExists:",
      second.alreadyExists
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::integer AS total
       FROM orders
       WHERE customer_id = $1
         AND idempotency_key = $2`,
      [customerId, idempotencyKey]
    );

    console.log(
      "Orders with same key:",
      countResult.rows[0].total
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Test failed:", error.message);
  process.exitCode = 1;
});
