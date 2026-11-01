
const pool = require("../database/pool");
const { publishEvent } = require("./KafkaProducer");

const POLL_INTERVAL_MS = 3000;
const BATCH_SIZE = 20;

let timer = null;
let running = false;

async function publishPendingEvents() {
  if (running) return;

  running = true;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT id, topic, payload
       FROM order_outbox
       WHERE status = 'pending'
       ORDER BY created_at, id
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [BATCH_SIZE]
    );

    for (const event of result.rows) {
      try {
        await publishEvent(event.topic, event.payload);

        await client.query(
          `UPDATE order_outbox
           SET status = 'published',
               published_at = NOW()
           WHERE id = $1`,
          [event.id]
        );

        console.log(
          "Order event published:",
          event.payload.orderId
        );
      } catch (error) {
        await client.query(
          `UPDATE order_outbox
           SET retry_count = retry_count + 1
           WHERE id = $1`,
          [event.id]
        );

        console.error(
          "Order event publish failed:",
          event.id,
          error.message
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error(
        "Outbox rollback failed:",
        rollbackError.message
      );
    }

    console.error(
      "Outbox publisher error:",
      error.message
    );
  } finally {
    client.release();
    running = false;
  }
}

function startOutboxPublisher() {
  if (timer) return;

  console.log("Order Outbox Publisher started");

  timer = setInterval(() => {
    publishPendingEvents().catch((error) => {
      console.error(
        "Outbox polling failed:",
        error.message
      );
    });
  }, POLL_INTERVAL_MS);
}

function stopOutboxPublisher() {
  if (!timer) return;

  clearInterval(timer);
  timer = null;
}

module.exports = {
  publishPendingEvents,
  startOutboxPublisher,
  stopOutboxPublisher
};
