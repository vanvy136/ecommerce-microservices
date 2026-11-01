
const {
  ShipmentService,
  ShipmentError
} = require("../../../application/ShipmentService");

const shipmentService = new ShipmentService();

function handleError(res, error) {
  if (error instanceof ShipmentError) {
    return res.status(error.status).json({
      success: false,
      message: error.message
    });
  }

  console.error("[ShipmentController]", error);

  return res.status(500).json({
    success: false,
    message: "Internal server error"
  });
}

exports.createShipment = async (req, res) => {
  try {
    const shipment = await shipmentService.createShipment(req.body);

    return res.status(201).json({
      success: true,
      message: "Shipment created or already exists",
      data: shipment
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getShipmentById = async (req, res) => {
  try {
    const shipment = await shipmentService.getShipmentById(
      req.params.id
    );

    return res.json({
      success: true,
      data: shipment
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getShipmentByOrderId = async (req, res) => {
  try {
    const shipment = await shipmentService.getShipmentByOrderId(
      req.params.orderId
    );

    return res.json({
      success: true,
      data: shipment
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getShipmentsByCustomerId = async (req, res) => {
  try {
    const shipments = await shipmentService.getShipmentsByCustomerId(
      req.params.customerId
    );

    return res.json({
      success: true,
      data: shipments
    });
  } catch (error) {
    return handleError(res, error);
  }
};

exports.updateShipmentStatus = async (req, res) => {
  try {
    const { status, trackingNumber, carrier, notes } = req.body || {};

    const shipment = await shipmentService.updateShipmentStatus(
      req.params.id,
      status,
      { trackingNumber, carrier, notes }
    );

    return res.json({
      success: true,
      message: "Shipment status updated",
      data: shipment
    });
  } catch (error) {
    return handleError(res, error);
  }
};
