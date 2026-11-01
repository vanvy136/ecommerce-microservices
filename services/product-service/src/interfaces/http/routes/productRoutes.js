
const express = require("express");
const controller = require("../controllers/ProductController");

const router = express.Router();

router.post("/", controller.createProduct);
router.get("/", controller.getProducts);
router.get("/:id", controller.getProductById);
router.patch("/:id", controller.updateProduct);
router.delete("/:id", controller.deleteProduct);
router.get("/:id/stock", controller.checkStock);

// Disabled: unsafe non-idempotent stock decrement.
// Use authenticated /internal/stock/reserve instead.

module.exports = router;
