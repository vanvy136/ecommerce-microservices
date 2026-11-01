
const {
  StockReservationClient
} = require("../infrastructure/clients/StockReservationClient");

const axios = require("axios");
const crypto = require("node:crypto");

const {
  OrderRepository
} = require("../infrastructure/repositories/OrderRepository");

const {
  OrderSagaLock
} = require("../infrastructure/database/OrderSagaLock");

const CART_SERVICE_URL = process.env.CART_SERVICE_URL;
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL;

class OrderError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "OrderError";
    this.status = status;
  }
}

class OrderService {
  constructor() {
    this.sagaLock = new OrderSagaLock();
    this.orderRepository = new OrderRepository();
    this.stockClient = new StockReservationClient();
  }

  // ========================================
  // 1. GET CART
  // ========================================

  async getCart(userId) {
    if (!CART_SERVICE_URL) {
      throw new OrderError(
        "CART_SERVICE_URL is not configured",
        500
      );
    }

    try {
      const response = await axios.get(
        `${CART_SERVICE_URL}/cart`,
        {
          headers: {
            "x-user-id": userId
          },
          timeout: 5000
        }
      );

      const cart = response.data?.data;

      if (
        !cart ||
        cart.userId !== userId ||
        !Array.isArray(cart.items)
      ) {
        throw new OrderError(
          "Invalid Cart Service response",
          502
        );
      }

      return cart;
    } catch (error) {
      if (error instanceof OrderError) {
        throw error;
      }

      throw new OrderError(
        "Cart Service unavailable",
        502
      );
    }
  }

  // ========================================
  // 2. GET PRODUCT
  // ========================================

  async getProduct(productId) {
    if (!PRODUCT_SERVICE_URL) {
      throw new OrderError(
        "PRODUCT_SERVICE_URL is not configured",
        500
      );
    }

    try {
      const response = await axios.get(
        `${PRODUCT_SERVICE_URL}/products/${encodeURIComponent(productId)}`,
        {
          timeout: 5000
        }
      );

      const product = response.data?.data;

      if (!product || !product._id) {
        throw new OrderError(
          "Invalid Product Service response",
          502
        );
      }

      return product;
    } catch (error) {
      if (error instanceof OrderError) {
        throw error;
      }

      if (error.response?.status === 404) {
        throw new OrderError(
          "Product not found",
          404
        );
      }

      throw new OrderError(
        "Product Service unavailable",
        502
      );
    }
  }

  // ========================================
  // 3. PREPARE ORDER
  // ========================================

  async prepareOrder(userId) {
    const cart = await this.getCart(userId);

    if (cart.items.length === 0) {
      throw new OrderError(
        "Cart is empty",
        400
      );
    }

    const items = [];
    let totalAmount = 0;

    for (const cartItem of cart.items) {
      if (
        !cartItem ||
        typeof cartItem.productId !== "string" ||
        !cartItem.productId.trim()
      ) {
        throw new OrderError(
          "Invalid product ID in cart",
          400
        );
      }

      const quantity = cartItem.quantity;

      if (
        !Number.isSafeInteger(quantity) ||
        quantity <= 0
      ) {
        throw new OrderError(
          "Invalid product quantity",
          400
        );
      }

      const product = await this.getProduct(
        cartItem.productId
      );

      if (product.isActive === false) {
        throw new OrderError(
          "Product is inactive",
          409
        );
      }

      if (
        !Number.isSafeInteger(product.stock) ||
        product.stock < quantity
      ) {
        throw new OrderError(
          "Insufficient product stock",
          409
        );
      }

      const price = product.price;

      if (
        typeof price !== "number" ||
        !Number.isSafeInteger(price) ||
        price < 0
      ) {
        throw new OrderError(
          "Invalid product price",
          502
        );
      }

      if (
        typeof product.name !== "string" ||
        !product.name.trim()
      ) {
        throw new OrderError(
          "Invalid product name",
          502
        );
      }

      const subtotal = price * quantity;

      if (!Number.isSafeInteger(subtotal)) {
        throw new OrderError(
          "Invalid order subtotal",
          400
        );
      }

      items.push({
        productId: String(product._id),
        productName: product.name,
        quantity,
        unitPrice: price,
        subtotal
      });

      totalAmount += subtotal;

      if (!Number.isSafeInteger(totalAmount)) {
        throw new OrderError(
          "Invalid order total",
          400
        );
      }
    }

    return {
      customerId: userId,
      items,
      totalAmount
    };
  }

  // ========================================
  // 4. RECONCILE RESERVATION
  // ========================================

  async reconcileReservation(record) {
    if (
      !record ||
      !record.reservation_id ||
      !record.order_id ||
      !record.product_id
    ) {
      throw new OrderError(
        "Invalid stock reservation record",
        500
      );
    }

    const actual = await this.stockClient.getReservation(
      record.reservation_id
    );

    if (!actual) {
      return null;
    }

    if (
      String(actual.orderId) !== String(record.order_id) ||
      String(actual.productId) !== String(record.product_id) ||
      Number(actual.quantity) !== Number(record.quantity)
    ) {
      throw new OrderError(
        "Stock reservation data mismatch",
        500
      );
    }

    if (
      !["reserved", "committed", "released"].includes(actual.status)
    ) {
      throw new OrderError(
        "Unexpected stock reservation state",
        502
      );
    }

    await this.orderRepository.updateStockReservationStatus(
      record.reservation_id,
      actual.status
    );

    return actual;
  }

  // ========================================
  // 5. CREATE ORDER + IDEMPOTENCY
  // ========================================

  async createOrder(userId, idempotencyKey, requestBody = {}) {
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (
      typeof userId !== "string" ||
      !uuidPattern.test(userId)
    ) {
      throw new OrderError(
        "Invalid authenticated user ID",
        401
      );
    }

    if (
      typeof idempotencyKey !== "string" ||
      !uuidPattern.test(idempotencyKey)
    ) {
      throw new OrderError(
        "A valid UUID Idempotency-Key is required",
        400
      );
    }

    // Order items and prices are loaded from trusted services.
    if (
      !requestBody ||
      typeof requestBody !== "object" ||
      Array.isArray(requestBody) ||
      Object.keys(requestBody).length !== 0
    ) {
      throw new OrderError(
        "Order request body must be empty",
        400
      );
    }

    const requestHash = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          version: 1,
          customerId: userId,
          operation: "create-order",
          body: {}
        })
      )
      .digest("hex");

    const resumeExisting = async (order) => {
      if (order.request_hash !== requestHash) {
        throw new OrderError(
          "Idempotency key was used for another request",
          409
        );
      }

      if (
        order.processing_status === "completed" ||
        order.processing_status === "failed"
      ) {
        return {
          ...order,
          alreadyExists: true
        };
      }

      const recovered = await this.processOrderSaga(
        order.id
      );

      if (!recovered) {
        throw new OrderError(
          "Order recovery returned no result",
          503
        );
      }

      return {
        ...recovered,
        alreadyExists: true
      };
    };

    // Retry must not depend on the current cart.
    const existingOrder =
      await this.orderRepository.findByIdempotencyKey(
        userId,
        idempotencyKey
      );

    if (existingOrder) {
      return resumeExisting(existingOrder);
    }

    const orderData = await this.prepareOrder(userId);

    // Repository returns a flat order object.
    const order = await this.orderRepository.createOrder({
      customerId: orderData.customerId,
      items: orderData.items,
      totalAmount: orderData.totalAmount,
      idempotencyKey,
      requestHash
    });

    if (!order || !order.id) {
      throw new OrderError(
        "Repository returned an invalid order",
        500
      );
    }

    if (order.alreadyExists) {
      return resumeExisting(order);
    }

    const processed = await this.processOrderSaga(
      order.id
    );

    if (!processed) {
      throw new OrderError(
        "Order Saga returned no result",
        503
      );
    }

    return {
      ...processed,
      alreadyExists: false
    };
  }

  // ========================================
  // 6. VERIFY RESERVATION
  // ========================================

  async getVerifiedReservation(record) {
    const actual = await this.stockClient.getReservation(
      record.reservation_id
    );

    if (!actual) {
      return null;
    }

    if (
      String(actual.orderId) !== String(record.order_id) ||
      String(actual.productId) !== String(record.product_id) ||
      Number(actual.quantity) !== Number(record.quantity)
    ) {
      throw new OrderError(
        "Stock reservation data mismatch",
        502
      );
    }

    if (
      !["reserved", "committed", "released"].includes(
        actual.status
      )
    ) {
      throw new OrderError(
        "Unexpected reservation status",
        502
      );
    }

    return actual;
  }

  // ========================================
  // 7. RESERVE STOCK
  // ========================================

  async reserveAllReservations(orderId, reservations) {
    let hasUnknown = false;
    let mustCompensate = false;

    for (const record of reservations) {
      const id = record.reservation_id;

      if (
        record.status === "failed" ||
        record.status === "released"
      ) {
        mustCompensate = true;
        continue;
      }

      let actual;

      try {
        actual = await this.getVerifiedReservation(record);
      } catch (error) {
        hasUnknown = true;

        await this.orderRepository.updateStockReservationStatus(
          id,
          "reserve_unknown",
          error.message
        );

        continue;
      }

      if (actual?.status === "committed") {
        await this.orderRepository.updateStockReservationStatus(
          id,
          "committed"
        );
        continue;
      }

      if (actual?.status === "reserved") {
        await this.orderRepository.updateStockReservationStatus(
          id,
          "reserved"
        );
        continue;
      }

      if (actual?.status === "released") {
        mustCompensate = true;

        await this.orderRepository.updateStockReservationStatus(
          id,
          "released"
        );

        continue;
      }

      // Do not repeat an uncertain Reserve request.
      if (record.status === "reserve_unknown") {
        hasUnknown = true;
        continue;
      }

      try {
        await this.stockClient.reserve({
          reservationId: id,
          orderId: String(record.order_id),
          productId: String(record.product_id),
          quantity: Number(record.quantity)
        });

        await this.orderRepository.updateStockReservationStatus(
          id,
          "reserved"
        );
      } catch (error) {
        const httpStatus = error.response?.status;

        if (
          httpStatus === 409 ||
          httpStatus === 400
        ) {
          mustCompensate = true;

          await this.orderRepository.updateStockReservationStatus(
            id,
            "failed",
            error.message
          );
        } else {
          hasUnknown = true;

          await this.orderRepository.updateStockReservationStatus(
            id,
            "reserve_unknown",
            error.message
          );
        }
      }
    }

    if (hasUnknown) {
      return "unknown";
    }

    if (mustCompensate) {
      return "compensate";
    }

    return "ready";
  }

  // ========================================
  // 8. COMMIT STOCK
  // ========================================

  async commitAllReservations(orderId, reservations) {
    let hasUnknown = false;

    for (const record of reservations) {
      const id = record.reservation_id;

      let actual;

      try {
        actual = await this.getVerifiedReservation(record);
      } catch (error) {
        hasUnknown = true;
        continue;
      }

      if (actual?.status === "committed") {
        await this.orderRepository.updateStockReservationStatus(
          id,
          "committed"
        );
        continue;
      }

      if (actual?.status !== "reserved") {
        hasUnknown = true;
        continue;
      }

      try {
        await this.stockClient.commit(id);

        await this.orderRepository.updateStockReservationStatus(
          id,
          "committed"
        );
      } catch (error) {
        hasUnknown = true;

        await this.orderRepository.updateStockReservationStatus(
          id,
          "commit_unknown",
          error.message
        );
      }
    }

    if (hasUnknown) {
      return "unknown";
    }

    // Verify all reservations in MongoDB.
    for (const record of reservations) {
      let actual;

      try {
        actual = await this.getVerifiedReservation(record);
      } catch (error) {
        return "unknown";
      }

      if (actual?.status !== "committed") {
        return "unknown";
      }
    }

    return "completed";
  }

  // ========================================
  // 9. RELEASE STOCK
  // ========================================

  async releaseAllReservations(orderId, reservations) {
    let hasUnknown = false;

    for (const record of reservations) {
      const id = record.reservation_id;

      let actual;

      try {
        actual = await this.getVerifiedReservation(record);
      } catch (error) {
        hasUnknown = true;
        continue;
      }

      if (actual?.status === "committed") {
        hasUnknown = true;
        continue;
      }

      if (actual?.status === "released") {
        await this.orderRepository.updateStockReservationStatus(
          id,
          "released"
        );
        continue;
      }

      if (!actual) {
        if (
          record.status === "reserve_unknown" ||
          record.status === "release_unknown" ||
          record.status === "reserved" ||
          record.status === "commit_unknown" ||
          record.status === "committed"
        ) {
          hasUnknown = true;
        } else {
          await this.orderRepository.updateStockReservationStatus(
            id,
            "failed"
          );
        }

        continue;
      }

      try {
        await this.stockClient.release(id);

        await this.orderRepository.updateStockReservationStatus(
          id,
          "released"
        );
      } catch (error) {
        hasUnknown = true;

        await this.orderRepository.updateStockReservationStatus(
          id,
          "release_unknown",
          error.message
        );
      }
    }

    return hasUnknown ? "unknown" : "completed";
  }

  // ========================================
  // 10. PROCESS ORDER SAGA
  // ========================================

  async processOrderSaga(orderId) {
    const lockResult = await this.sagaLock.withLock(
      orderId,
      async () => {
        const ownerId = crypto.randomUUID();

        const lease =
          await this.orderRepository.acquireProcessingLease(
            orderId,
            ownerId
          );

        if (!lease) {
          return this.orderRepository.findById(orderId);
        }

        const renew = async () => {
          const ok =
            await this.orderRepository.renewProcessingLease(
              orderId,
              ownerId
            );

          if (!ok) {
            throw new Error("Order Saga lease lost");
          }
        };

        const update = async (
          processingStatus,
          orderStatus = null,
          errorMessage = null
        ) => {
          await renew();

          const updated =
            await this.orderRepository.updateProcessingStatus(
              orderId,
              ownerId,
              processingStatus,
              orderStatus,
              errorMessage
            );

          if (!updated) {
            throw new Error(
              "Cannot update Order Saga state"
            );
          }
        };

        try {
          const order =
            await this.orderRepository.findById(orderId);

          if (!order) {
            throw new Error("Order not found");
          }

          if (
            order.processing_status === "completed" ||
            order.processing_status === "failed"
          ) {
            return order;
          }

          const reservations =
            await this.orderRepository.getStockReservations(
              orderId
            );

          if (reservations.length === 0) {
            throw new Error(
              "Order has no reservations"
            );
          }

          const hasCommitted =
            reservations.some(
              (r) =>
                r.status === "committed" ||
                r.status === "commit_unknown"
            );

          if (
            order.processing_status === "committing" ||
            hasCommitted
          ) {
            await update("committing");
            await renew();

            const result =
              await this.commitAllReservations(
                orderId,
                reservations
              );

            if (result === "completed") {
              await update(
                "completed",
                "confirmed"
              );
            }

            return this.orderRepository.findById(
              orderId
            );
          }

          if (
            order.processing_status === "compensating"
          ) {
            await renew();

            const result =
              await this.releaseAllReservations(
                orderId,
                reservations
              );

            if (result === "completed") {
              await update(
                "failed",
                "cancelled"
              );
            }

            return this.orderRepository.findById(
              orderId
            );
          }

          await update("processing");

          const reserveResult =
            await this.reserveAllReservations(
              orderId,
              reservations
            );

          if (reserveResult === "unknown") {
            return this.orderRepository.findById(
              orderId
            );
          }

          if (reserveResult === "compensate") {
            await update("compensating");
            await renew();

            const releaseResult =
              await this.releaseAllReservations(
                orderId,
                reservations
              );

            if (releaseResult === "completed") {
              await update(
                "failed",
                "cancelled"
              );
            }

            return this.orderRepository.findById(
              orderId
            );
          }

          await update("committing");
          await renew();

          const commitResult =
            await this.commitAllReservations(
              orderId,
              reservations
            );

          if (commitResult === "completed") {
            await update(
              "completed",
              "confirmed"
            );
          }

          return this.orderRepository.findById(
            orderId
          );
        } finally {
          await this.orderRepository.releaseProcessingLease(
            orderId,
            ownerId
          );
        }
      }
    );

    if (!lockResult.acquired) {
      return this.orderRepository.findById(
        orderId
      );
    }

    return lockResult.result;
  }
  
  // Xac minh don hang truoc khi tao van don.
  async verifyOrderForShipment(orderId) {
    const UUID_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (
      typeof orderId !== "string" ||
      !UUID_REGEX.test(orderId)
    ) {
      throw new OrderError("Invalid order ID", 400);
    }

    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new OrderError("Order not found", 404);
    }

    const eligible =
      order.processing_status === "completed" &&
      order.status === "confirmed";

    return {
      orderId: order.id,
      customerId: order.customer_id,
      status: order.status,
      processingStatus: order.processing_status,
      eligible
    };
  }

}

module.exports = {
  OrderService,
  OrderError
};
