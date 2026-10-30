const { CartService } = require("../../../application/CartService");

const cartService = new CartService();

function getUserId(req) {
  const userId = req.headers["x-user-id"];

  if (typeof userId !== "string" || !userId.trim()) {
    const error = new Error("Missing authenticated user");
    error.status = 401;
    throw error;
  }

  return userId;
}

function handleError(res, error) {
  const status = error.status || 500;

  if (status >= 500) {
    console.error("Cart error:", error);
  }

  return res.status(status).json({
    success: false,
    message: status === 500 ? "Internal server error" : error.message
  });
}

async function getCart(req, res) {
  try {
    const cart = await cartService.getCart(getUserId(req));
    return res.json({ success: true, data: cart });
  } catch (error) {
    return handleError(res, error);
  }
}

async function addItem(req, res) {
  try {
    const { productId, quantity } = req.body || {};

    if (typeof productId !== "string" || !productId.trim()) {
      return res.status(400).json({
        success: false,
        message: "Valid productId is required"
      });
    }

    const cart = await cartService.addItem(
      getUserId(req),
      productId,
      quantity
    );

    return res.status(201).json({
      success: true,
      message: "Product added to cart",
      data: cart
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateItem(req, res) {
  try {
    const cart = await cartService.updateItem(
      getUserId(req),
      req.params.productId,
      req.body?.quantity
    );

    return res.json({
      success: true,
      message: "Cart updated",
      data: cart
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function removeItem(req, res) {
  try {
    const cart = await cartService.removeItem(
      getUserId(req),
      req.params.productId
    );

    return res.json({
      success: true,
      message: "Product removed",
      data: cart
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function clearCart(req, res) {
  try {
    const cart = await cartService.clearCart(getUserId(req));

    return res.json({
      success: true,
      message: "Cart cleared",
      data: cart
    });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart
};