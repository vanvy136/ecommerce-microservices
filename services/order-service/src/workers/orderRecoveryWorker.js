
require("dotenv").config();

const {
  OrderService
} = require("../application/OrderService");

const orderService = new OrderService();

async function recoverOrders() {
  const orders =
    await orderService.orderRepository.listRecoverableOrders(20);

  console.log(
    `[Recovery] Found ${orders.length} orders`
  );

  for (const order of orders) {
    try {
      const result = await orderService.processOrderSaga(
        order.id
      );

      console.log(
        `[Recovery] ${order.id}: ${result?.processing_status}`
      );
    } catch (error) {
      console.error(
        `[Recovery] ${order.id}: ${error.message}`
      );
    }
  }
}

async function main() {
  try {
    await recoverOrders();
  } catch (error) {
    console.error(
      "[Recovery] Failed:",
      error.message
    );
    process.exitCode = 1;
  } finally {
    const pool = require("../infrastructure/database/pool");
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  recoverOrders
};
