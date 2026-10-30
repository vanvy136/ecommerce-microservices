const express = require("express");
const controller = require("../controllers/CartController");

const router = express.Router();

router.get("/", controller.getCart);
router.post("/items", controller.addItem);
router.patch("/items/:productId", controller.updateItem);
router.delete("/items/:productId", controller.removeItem);
router.delete("/", controller.clearCart);

module.exports = router;