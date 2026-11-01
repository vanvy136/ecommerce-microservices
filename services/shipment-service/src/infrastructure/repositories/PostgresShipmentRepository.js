
const pool = require("../database/postgres");

class PostgresShipmentRepository {
  async create(data) {
    const {
      orderId,
      customerId,
      shippingAddress = null
    } = data;

    const result = await pool.query(
      `INSERT INTO shipments (
        order_id,
        customer_id,
        shipping_address,
        status
      )
      VALUES ($1, $2, $3, 'pending')
      ON CONFLICT (order_id) DO NOTHING
      RETURNING *`,
      [orderId, customerId, shippingAddress]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    return this.findByOrderId(orderId);
  }

  async findById(id) {
    const result = await pool.query(
      "SELECT * FROM shipments WHERE id = $1",
      [id]
    );

    return result.rows[0] || null;
  }

  async findByOrderId(orderId) {
    const result = await pool.query(
      "SELECT * FROM shipments WHERE order_id = $1",
      [orderId]
    );

    return result.rows[0] || null;
  }

  async findByCustomerId(customerId) {
    const result = await pool.query(
      `SELECT * FROM shipments
       WHERE customer_id = $1
       ORDER BY created_at DESC`,
      [customerId]
    );

    return result.rows;
  }

  async updateStatus(id, status, data = {}) {
    const {
      trackingNumber = null,
      carrier = null,
      notes = null
    } = data;

    const result = await pool.query(
      `UPDATE shipments
       SET status = $2,
           tracking_number = COALESCE($3, tracking_number),
           carrier = COALESCE($4, carrier),
           notes = COALESCE($5, notes),
           shipped_at = CASE
             WHEN $2 = 'shipped'
             THEN COALESCE(shipped_at, NOW())
             ELSE shipped_at
           END,
           delivered_at = CASE
             WHEN $2 = 'delivered'
             THEN COALESCE(delivered_at, NOW())
             ELSE delivered_at
           END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status, trackingNumber, carrier, notes]
    );

    return result.rows[0] || null;
  }
}

module.exports = PostgresShipmentRepository;
