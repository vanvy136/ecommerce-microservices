
const {
  ShipmentService
} = require("../../../application/ShipmentService");

const shipmentService = new ShipmentService();

async function shipmentOwnership(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    // Admin duoc phep xem tat ca van don.
    if (req.user.role === "admin") {
      return next();
    }

    // Customer chi duoc xem van don cua chinh minh.
    if (req.user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Forbidden"
      });
    }

    const shipment = await shipmentService.getShipmentById(
      req.params.id
    );

    if (String(shipment.customer_id) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden"
      });
    }

    next();
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found"
      });
    }

    if (error.status === 400) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error("[ShipmentOwnership]", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}

module.exports = shipmentOwnership;
