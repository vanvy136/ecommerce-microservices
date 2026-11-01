
const express = require("express");

const controller = require("../controllers/ShipmentController");
const authenticate = require("../middlewares/authenticate");
const authorize = require("../middlewares/authorize");
const shipmentOwnership = require("../middlewares/shipmentOwnership");
const router = express.Router();

// Tat ca Shipment API deu phai xac thuc JWT.
router.use(authenticate);

// Chi admin duoc tao van don thu cong.
// Sau nay Order Service se tao van don qua kenh noi bo.
router.post(
  "/",
  authorize("admin"),
  controller.createShipment
);

// Admin duoc xem van don theo ma don hang.
router.get(
  "/order/:orderId",
  authorize("admin"),
  controller.getShipmentByOrderId
);

// Admin duoc xem danh sach van don theo khach hang.
router.get(
  "/customer/:customerId",
  authorize("admin"),
  controller.getShipmentsByCustomerId
);

// Chi admin duoc xem truc tiep theo Shipment ID.
// Customer se duoc bo sung API kiem tra quyen so huu.
// Admin xem tat ca, Customer chi xem van don cua minh.
router.get(
  "/:id",
  authorize("admin", "customer"),
  shipmentOwnership,
  controller.getShipmentById
);

// Chi admin duoc cap nhat trang thai giao hang.
router.patch(
  "/:id/status",
  authorize("admin"),
  controller.updateShipmentStatus
);

module.exports = router;
