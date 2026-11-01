
const pool = require("./pool");

class OrderSagaLock {
  async withLock(orderId, callback) {
    if (typeof callback !== "function") {
      throw new Error("Callback must be a function");
    }

    const client = await pool.connect();
    let locked = false;
    let destroyConnection = false;

    try {
      const result = await client.query(
        `SELECT pg_try_advisory_lock(
          hashtextextended($1::text, 0)
        ) AS locked`,
        [String(orderId)]
      );

      locked = result.rows[0]?.locked === true;

      if (!locked) {
        return {
          acquired: false,
          result: null
        };
      }

      const value = await callback();

      return {
        acquired: true,
        result: value
      };
    } finally {
      if (locked) {
        try {
          const unlockResult = await client.query(
            `SELECT pg_advisory_unlock(
              hashtextextended($1::text, 0)
            ) AS unlocked`,
            [String(orderId)]
          );

          if (unlockResult.rows[0]?.unlocked !== true) {
            destroyConnection = true;
          }
        } catch (error) {
          destroyConnection = true;
          console.error(
            "Failed to release Order Saga lock:",
            error.message
          );
        }
      }

      client.release(destroyConnection);
    }
  }
}

module.exports = {
  OrderSagaLock
};
