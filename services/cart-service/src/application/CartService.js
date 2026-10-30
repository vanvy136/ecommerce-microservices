const axios = require("axios");
const { redisClient } = require("../infrastructure/redis/client");

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL;
const CART_TTL_SECONDS = Number(process.env.CART_TTL_SECONDS || 604800);

if (!PRODUCT_SERVICE_URL) {
  throw new Error("PRODUCT_SERVICE_URL is required");
}

class CartError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "CartError";
    this.status = status;
  }
}

class CartService {
  getKey(userId) {
    return `cart:${userId}`;
  }

  async getCart(userId) {
    const data = await redisClient.get(this.getKey(userId));

    if (!data) {
      return {
        userId,
        items: [],
        totalItems: 0,
        totalAmount: 0
      };
    }

    const cart = JSON.parse(data);

    return this.calculateCart(cart);
  }

  calculateCart(cart) {
    const items = cart.items || [];

    const totalItems = items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    const totalAmount = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    return {
      userId: cart.userId,
      items,
      totalItems,
      totalAmount
    };
  }

  async saveCart(cart) {
    const updatedCart = this.calculateCart(cart);

    await redisClient.set(
      this.getKey(cart.userId),
      JSON.stringify(updatedCart),
      { EX: CART_TTL_SECONDS }
    );

    return updatedCart;
  }

  async getProduct(productId) {
    let response;

    try {
      response = await axios.get(
        `${PRODUCT_SERVICE_URL}/products/${encodeURIComponent(productId)}`,
        { timeout: 5000 }
      );
    } catch (error) {
      if (error.response?.status === 404) {
        throw new CartError("Product not found", 404);
      }

      throw new CartError("Product Service unavailable", 502);
    }

    // ProductController có thể trả về { data: product }
    // hoặc trả trực tiếp đối tượng product.
    const body = response.data;
    const product = body.data || body.product || body;

    if (!product || !product._id) {
      throw new CartError("Invalid Product Service response", 502);
    }

    return product;
  }

  validateQuantity(quantity) {
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new CartError("Quantity must be a positive integer");
    }
  }

  async addItem(userId, productId, quantity) {
    this.validateQuantity(quantity);

    const product = await this.getProduct(productId);

    if (product.isActive === false) {
      throw new CartError("Product is inactive");
    }

    const cart = await this.getCart(userId);

    const existingItem = cart.items.find(
      (item) => item.productId === productId
    );

    const newQuantity = (existingItem?.quantity || 0) + quantity;

    if (!Number.isSafeInteger(newQuantity)) {
      throw new CartError("Invalid total quantity");
    }

    if (newQuantity > product.stock) {
      throw new CartError("Insufficient product stock", 409);
    }

    if (existingItem) {
      existingItem.quantity = newQuantity;
      existingItem.name = product.name;
      existingItem.price = product.price;
      existingItem.imageUrl = product.imageUrl || "";
    } else {
      cart.items.push({
        productId: String(product._id),
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl || "",
        quantity
      });
    }

    return this.saveCart(cart);
  }

  async updateItem(userId, productId, quantity) {
    this.validateQuantity(quantity);

    const cart = await this.getCart(userId);

    const item = cart.items.find(
      (item) => item.productId === productId
    );

    if (!item) {
      throw new CartError("Product not found in cart", 404);
    }

    const product = await this.getProduct(productId);

    if (product.isActive === false) {
      throw new CartError("Product is inactive");
    }

    if (quantity > product.stock) {
      throw new CartError("Insufficient product stock", 409);
    }

    item.quantity = quantity;
    item.name = product.name;
    item.price = product.price;
    item.imageUrl = product.imageUrl || "";

    return this.saveCart(cart);
  }

  async removeItem(userId, productId) {
    const cart = await this.getCart(userId);

    const oldLength = cart.items.length;

    cart.items = cart.items.filter(
      (item) => item.productId !== productId
    );

    if (cart.items.length === oldLength) {
      throw new CartError("Product not found in cart", 404);
    }

    return this.saveCart(cart);
  }

  async clearCart(userId) {
    await redisClient.del(this.getKey(userId));

    return {
      userId,
      items: [],
      totalItems: 0,
      totalAmount: 0
    };
  }
}

module.exports = {
  CartService,
  CartError
};
