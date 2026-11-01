
const mongoose = require("mongoose");
const Product = require("../infrastructure/database/models/ProductModel");
const StockReservation = require("../infrastructure/database/models/StockReservationModel");

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function validReservationId(value) {
  if (typeof value !== "string" ||
      value.length < 1 ||
      value.length > 100 ||
      value.trim() !== value) {
    fail("Invalid reservationId");
  }
}

function sameReservation(record, data) {
  return record.orderId === data.orderId &&
    String(record.productId) === String(data.productId) &&
    record.quantity === data.quantity;
}

async function reserveStock({
  reservationId,
  orderId,
  productId,
  quantity
}) {
  validReservationId(reservationId);

  if (typeof orderId !== "string" ||
      !orderId.trim() ||
      orderId.length > 100) {
    fail("Invalid orderId");
  }

  if (!mongoose.isValidObjectId(productId)) {
    fail("Invalid productId");
  }

  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    fail("Invalid quantity");
  }

  const input = {
    reservationId,
    orderId,
    productId,
    quantity
  };

  const existing = await StockReservation.findOne({
    reservationId
  });

  if (existing) {
    if (!sameReservation(existing, input)) {
      fail("Reservation ID conflict", 409);
    }

    return {
      reservation: existing,
      alreadyExists: true
    };
  }

  try {
    const reservation = await mongoose.connection.transaction(
      async (session) => {
        const product = await Product.findOneAndUpdate(
        {
            _id: productId,
            isActive: true,
            stock: { $gte: quantity }
        },
        {
            $inc: { stock: -quantity }
        },
        {
            returnDocument: "after",
            session
        }
        );

        if (!product) {
          fail("Insufficient stock or inactive product", 409);
        }

        const records = await StockReservation.create(
          [{
            reservationId,
            orderId,
            productId,
            quantity,
            status: "reserved",
            reservedAt: new Date()
          }],
          { session }
        );

        return records[0];
      }
    );

    return {
      reservation,
      alreadyExists: false
    };
  } catch (error) {
    if (error.code === 11000) {
      const found = await StockReservation.findOne({
        reservationId
      });

      if (found && sameReservation(found, input)) {
        return {
          reservation: found,
          alreadyExists: true
        };
      }

      fail("Reservation ID conflict", 409);
    }

    throw error;
  }
}

async function commitReservation(reservationId) {
  validReservationId(reservationId);

  return mongoose.connection.transaction(async (session) => {
    const record = await StockReservation.findOne({
      reservationId
    }).session(session);

    if (!record) {
      fail("Reservation not found", 404);
    }

    if (record.status === "committed") {
      return record;
    }

    if (record.status !== "reserved") {
      fail("Reservation cannot be committed", 409);
    }

    record.status = "committed";
    record.committedAt = new Date();

    await record.save({ session });

    return record;
  });
}

async function releaseReservation(reservationId) {
  validReservationId(reservationId);

  return mongoose.connection.transaction(async (session) => {
    const record = await StockReservation.findOne({
      reservationId
    }).session(session);

    if (!record) {
      fail("Reservation not found", 404);
    }

    if (record.status === "released") {
      return record;
    }

    if (record.status !== "reserved") {
      fail("Reservation cannot be released", 409);
    }

    const result = await Product.updateOne(
      { _id: record.productId },
      { $inc: { stock: record.quantity } },
      { session }
    );

    if (result.matchedCount !== 1) {
      fail("Product not found during stock release", 409);
    }

    record.status = "released";
    record.releasedAt = new Date();

    await record.save({ session });

    return record;
  });
}

async function getReservation(reservationId) {
  validReservationId(reservationId);

  const record = await StockReservation.findOne({
    reservationId
  });

  if (!record) {
    fail("Reservation not found", 404);
  }

  return record;
}

module.exports = {
  reserveStock,
  commitReservation,
  releaseReservation,
  getReservation
};
