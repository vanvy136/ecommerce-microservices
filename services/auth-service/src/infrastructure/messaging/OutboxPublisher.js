
const pool = require("../database/postgres");
const KafkaProducer = require("./KafkaProducer");

let timer = null;
let running = false;

async function publishPendingEvents() {
    if (running) return;

    running = true;
    let client;

    try {
        client = await pool.connect();

        await client.query("BEGIN");

        const result = await client.query(
            `SELECT id, event_type, payload
             FROM outbox_events
             WHERE status = 'PENDING'
             ORDER BY created_at, id
             LIMIT 10
             FOR UPDATE SKIP LOCKED`
        );

        for (const event of result.rows) {
            try {
                await KafkaProducer.publish(
                    "user.registered",
                    event.payload
                );

                await client.query(
                    `UPDATE outbox_events
                     SET status = 'PUBLISHED',
                         published_at = NOW(),
                         last_error = NULL
                     WHERE id = $1`,
                    [event.id]
                );

                console.log("Outbox event published:", event.id);
            } catch (error) {
                await client.query(
                    `UPDATE outbox_events
                     SET retry_count = retry_count + 1,
                         last_error = $2
                     WHERE id = $1`,
                    [event.id, error.message]
                );

                console.error(
                    "Outbox publish failed:",
                    event.id,
                    error.message
                );
            }
        }

        await client.query("COMMIT");
    } catch (error) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Outbox rollback failed:", rollbackError);
            }
        }

        console.error("Outbox processing error:", error.message);
    } finally {
        if (client) client.release();
        running = false;
    }
}

function startOutboxPublisher() {
    if (timer) return;

    console.log("Outbox Publisher started");

    publishPendingEvents();

    timer = setInterval(publishPendingEvents, 5000);
}

function stopOutboxPublisher() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

module.exports = {
    publishPendingEvents,
    startOutboxPublisher,
    stopOutboxPublisher
};
