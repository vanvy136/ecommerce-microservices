require("dotenv").config();

const mongoose = require("mongoose");
const StockReservation = require("./src/infrastructure/database/models/StockReservationModel");

const reservationId =
  "order:363ab79e-bb67-4d1b-8111-129260ef0051:product:6ae4c200cb400bf315866293";

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("=== MONGODB CONNECTED ===");
    console.log("Database:", mongoose.connection.name);
    console.log("Collection:", StockReservation.collection.name);

    const reservation = await StockReservation.findOne({
      reservationId
    }).lean();

    if (!reservation) {
      console.log("KHONG TIM THAY RESERVATION");
      return;
    }

    console.log("=== FOUND RESERVATION ===");
    console.log(JSON.stringify(reservation, null, 2));

    if (
      reservation.status === "committed" &&
      reservation.quantity === 1 &&
      reservation.orderId === "363ab79e-bb67-4d1b-8111-129260ef0051"
    ) {
      console.log("RESULT: PASS");
    } else {
      console.log("RESULT: CAN KIEM TRA LAI");
    }
  } catch (error) {
    console.error("ERROR:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
