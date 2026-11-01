
const PostgresShipmentRepository = require(
  "../infrastructure/repositories/PostgresShipmentRepository"
);

class ShipmentError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ShipmentError";
    this.status = status;
  }
}

const VALID_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "failed"
];

const ALLOWED_TRANSITIONS = {
  pending: ["processing", "cancelled", "failed"],
  processing: ["shipped", "cancelled", "failed"],
  shipped: ["delivered", "failed"],
  delivered: [],
  cancelled: [],
  failed: []
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class ShipmentService {
  constructor(repository = new PostgresShipmentRepository()) {
    this.repository = repository;
  }

  validateId(id, fieldName) {
    if (typeof id !== "string" || !UUID_REGEX.test(id)) {
      throw new ShipmentError(`Invalid ${fieldName}`, 400);
    }
  }

  async createShipment(data) {
    const { orderId, customerId, shippingAddress } = data || {};

    this.validateId(orderId, "orderId");
    this.validateId(customerId, "customerId");

    if (
      shippingAddress != null &&
      (typeof shippingAddress !== "string" ||
        shippingAddress.length > 1000)
    ) {
      throw new ShipmentError("Invalid shipping address");
    }

    const existing = await this.repository.findByOrderId(orderId);

    if (existing) {
      if (String(existing.customer_id) !== customerId) {
        throw new ShipmentError("Shipment order conflict", 409);
      }

      return existing;
    }

    const shipment = await this.repository.create({
      orderId,
      customerId,
      shippingAddress: shippingAddress || null
    });

    if (String(shipment.customer_id) !== customerId) {
      throw new ShipmentError("Shipment order conflict", 409);
    }

    return shipment;
  }

  async getShipmentById(id) {
    this.validateId(id, "shipmentId");

    const shipment = await this.repository.findById(id);

    if (!shipment) {
      throw new ShipmentError("Shipment not found", 404);
    }

    return shipment;
  }

  async getShipmentByOrderId(orderId) {
    this.validateId(orderId, "orderId");

    const shipment = await this.repository.findByOrderId(orderId);

    if (!shipment) {
      throw new ShipmentError("Shipment not found", 404);
    }

    return shipment;
  }

  async getShipmentsByCustomerId(customerId) {
    this.validateId(customerId, "customerId");

    return this.repository.findByCustomerId(customerId);
  }

  async updateShipmentStatus(id, status, data = {}) {
    this.validateId(id, "shipmentId");

    if (!VALID_STATUSES.includes(status)) {
      throw new ShipmentError("Invalid shipment status");
    }

    const shipment = await this.getShipmentById(id);

    if (shipment.status === status) {
      return shipment;
    }

    const allowed = ALLOWED_TRANSITIONS[shipment.status] || [];

    if (!allowed.includes(status)) {
      throw new ShipmentError(
        `Cannot change shipment status from ${shipment.status} to ${status}`,
        409
      );
    }

    for (const field of ["trackingNumber", "carrier", "notes"]) {
      if (
        data[field] != null &&
        (typeof data[field] !== "string" ||
          data[field].length > 1000)
      ) {
        throw new ShipmentError(`Invalid ${field}`);
      }
    }

    const updated = await this.repository.updateStatus(
      id,
      status,
      data
    );

    if (!updated) {
      throw new ShipmentError("Shipment not found", 404);
    }

    return updated;
  }
}

module.exports = {
  ShipmentService,
  ShipmentError
};
