
const axios = require("axios");
const crypto = require("node:crypto");
const { OrderRepository } = require(
  "../infrastructure/repositories/OrderRepository"
);

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
    this.orderRepository = new OrderRepository();
  }

  // 1. Lay gio hang tu Cart Service
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

  // 2. Lay thong tin san pham tu Product Service
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

  // 3. Kiem tra va chuan bi du lieu don hang
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

  // 4. Tao don hang va luu vao PostgreSQL
  
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

  // Hien tai API dat hang chi chap nhan body rong.
  // Thong tin san pham va gia se lay tu cac service.
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

  // Hash tu yeu cau bat bien, khong phu thuoc gio hang.
  // Nho do retry van nhan ra don hang cu sau khi xoa cart.
  const requestHash = crypto
    .createHash("sha256")
    .update(JSON.stringify({
      version: 1,
      customerId: userId,
      operation: "create-order",
      body: {}
    }))
    .digest("hex");

  const existingOrder =
    await this.orderRepository.findByIdempotencyKey(
      userId,
      idempotencyKey
    );

  if (existingOrder) {
    if (existingOrder.request_hash !== requestHash) {
      throw new OrderError(
        "Idempotency key was used for another request",
        409
      );
    }

    return {
      ...existingOrder,
      alreadyExists: true
    };
  }

  const orderData = await this.prepareOrder(userId);

  return this.orderRepository.createOrder({
    ...orderData,
    idempotencyKey,
    requestHash
  });
}

}

module.exports = {
  OrderService,
  OrderError
};
