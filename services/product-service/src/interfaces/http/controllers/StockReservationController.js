
const StockReservationService = require(
    "../../../application/StockReservationService"
);

function handleError(res, error) {
    console.error("Stock Reservation Error:", error.message);

    const status = Number.isInteger(error.status)
        ? error.status
        : 500;

    return res.status(status).json({
        success: false,
        message: status === 500
            ? "Internal server error"
            : error.message
    });
}



async function reserve(req, res) {
  try {
    const {
      reservationId,
      orderId,
      productId,
      quantity
    } = req.body || {};

    const result = await StockReservationService.reserveStock({
      reservationId,
      orderId,
      productId,
      quantity
    });

    return res.status(result.alreadyExists ? 200 : 201).json({
      success: true,
      message: result.alreadyExists
        ? "Reservation already exists"
        : "Stock reserved successfully",
      data: result.reservation
    });
  } catch (error) {
    return handleError(res, error);
  }
}



async function commit(req, res) {
    try {
        const { reservationId } = req.body;

        const reservation =
            await StockReservationService.commitReservation(
                reservationId
            );

        return res.status(200).json({
            success: true,
            message: "Reservation committed",
            data: reservation
        });
    } catch (error) {
        return handleError(res, error);
    }
}

async function release(req, res) {
    try {
        const { reservationId } = req.body;

        const reservation =
            await StockReservationService.releaseReservation(
                reservationId
            );

        return res.status(200).json({
            success: true,
            message: "Reservation released",
            data: reservation
        });
    } catch (error) {
        return handleError(res, error);
    }
}

async function getById(req, res) {
    try {
        const reservation =
            await StockReservationService.getReservation(
                req.params.id
            );

        return res.status(200).json({
            success: true,
            data: reservation
        });
    } catch (error) {
        return handleError(res, error);
    }
}

module.exports = {
    reserve,
    commit,
    release,
    getById
};
