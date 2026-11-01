
const { OrderService, OrderError } = require(
  "../../../application/OrderService"
);

const orderService = new OrderService();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getUserId(req) {
  const userId = req.headers["x-user-id"];

  if (
    typeof userId !== "string" ||
    !UUID_REGEX.test(userId)
  ) {
    throw new OrderError(
      "Missing or invalid authenticated user",
      401
    );
  }

  return userId;
}

function getIdempotencyKey(req) {
  const key = req.headers["idempotency-key"];

  if (
    typeof key !== "string" ||
    !UUID_REGEX.test(key)
  ) {
    throw new OrderError(
      "A valid UUID Idempotency-Key is required",
      400
    );
  }

  return key;
}

function handleError(res, error) {
  const status =
    error instanceof OrderError
      ? error.status
      : Number.isInteger(error.status) &&
        error.status >= 400 &&
        error.status <= 599
        ? error.status
        : 500;

  if (status >= 500) {
    console.error("Order error:", error);
  }

  return res.status(status).json({
    success: false,
    message:
      status >= 500
        ? "Order processing failed"
        : error.message
  });
}

async function createOrder(req, res) {
  try {
    const userId = getUserId(req);
    const idempotencyKey = getIdempotencyKey(req);

    const order = await orderService.createOrder(
      userId,
      idempotencyKey,
      req.body || {}
    );

    if (!order) {
      throw new OrderError(
        "Order processing returned no result",
        500
      );
    }

    // Don hang da duoc xac nhan
    if (
      order.processing_status === "completed" &&
      order.status === "confirmed"
    ) {
      return res.status(order.alreadyExists ? 200 : 201).json({
        success: true,
        message: "Order confirmed successfully",
        data: order
      });
    }

    // Don hang da huy sau khi bu tru
    if (
      order.processing_status === "failed" &&
      order.status === "cancelled"
    ) {
      return res.status(409).json({
        success: false,
        message: "Order cancelled",
        data: order
      });
    }

    // Saga chua hoan tat
    return res.status(202).json({
      success: true,
      message: "Order is being processed",
      data: order
    });
  } catch (error) {
    return handleError(res, error);
  }
  
async function verifyOrderForShipment(req, res) {
  try {
    const { orderId } = req.params;

    const result =
      await orderService.verifyOrderForShipment(orderId);

    return res.status(200).json({
      success: true,
      message: "Order verification completed",
      data: result
    });
  } catch (error) {
    return handleError(res, error);
  }
}

}

async function verifyOrderForShipment(req, res) {
  try {
    const { orderId } = req.params;

    const result =
      await orderService.verifyOrderForShipment(orderId);

    return res.status(200).json({
      success: true,
      message: "Order verification completed",
      data: result
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  createOrder,
  verifyOrderForShipment
};

module.exports = {
  createOrder,
  verifyOrderForShipment
};
