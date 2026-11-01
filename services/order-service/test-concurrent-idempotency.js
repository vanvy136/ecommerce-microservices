
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
    console.log("Testing concurrent requests...");

    const results = await Promise.allSettled([
      repository.createOrder(orderData),
      repository.createOrder(orderData)
    ]);

    for (let i = 0; i < results.length; i++) {
      const result = results[i];

      if (result.status === "fulfilled") {
        console.log(
          `Request ${i + 1}:`,
          result.value.id,
          "alreadyExists:",
          result.value.alreadyExists
        );
      } else {
        console.log(
          `Request ${i + 1} failed:`,
          result.reason.message
        );
      }
    }

    const countResult = await pool.query(
      `SELECT COUNT(*)::integer AS total
       FROM orders
       WHERE customer_id = $1
         AND idempotency_key = $2`,
      [customerId, idempotencyKey]
    );

    const total = countResult.rows[0].total;

    console.log("Orders with same key:", total);

    const successful = results.filter(
      (result) => result.status === "fulfilled"
    );

    const uniqueIds = new Set(
      successful.map((result) => result.value.id)
    );

    const passed =
      total === 1 &&
      successful.length === 2 &&
      uniqueIds.size === 1;

    console.log(
      "Concurrent idempotency test:",
      passed ? "PASS" : "FAIL"
    );

    if (!passed) {
      process.exitCode = 1;
    }

    // Chi xoa don do bai test nay tao ra.
    if (total === 1) {
      const cleanup = await pool.query(
        `DELETE FROM orders
         WHERE customer_id = $1
           AND idempotency_key = $2
           AND status = 'pending'
         RETURNING id`,
        [customerId, idempotencyKey]
      );

      console.log(
        "Test orders cleaned:",
        cleanup.rowCount
      );
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Test failed:", error.message);
  process.exitCode = 1;
});
