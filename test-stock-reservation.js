
const path = require("node:path");
const crypto = require("node:crypto");

const mongoose = require(
  "./services/product-service/node_modules/mongoose"
);

const dotenv = require(
  "./services/product-service/node_modules/dotenv"
);

dotenv.config({
  path: path.join(__dirname, "services/product-service/.env")
});

const Product = require(
  "./services/product-service/src/infrastructure/database/models/ProductModel"
);

const StockReservationService = require(
  "./services/product-service/src/application/StockReservationService"
);

const StockReservation = require(
  "./services/product-service/src/infrastructure/database/models/StockReservationModel"
);

async function main() {
  let product;

  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const testId = crypto.randomUUID();

    product = await Product.create({
      name: `Stock Reservation Test ${testId}`,
      description: "Temporary test product",
      price: 100000,
      stock: 10,
      category: "TEST",
      isActive: true
    });

    console.log("Initial stock: 10");

    const reservationId = `test-${testId}-1`;
    const orderId = `order-${testId}`;

    // TEST 1: Reserve
    const first = await StockReservationService.reserveStock({
      reservationId,
      orderId,
      productId: String(product._id),
      quantity: 3
    });

    if (first.reservation.status !== "reserved") {
      throw new Error("Reserve failed");
    }

    let current = await Product.findById(product._id);

    if (current.stock !== 7) {
      throw new Error("Stock must be 7 after reserve");
    }

    console.log("PASS: Reserve stock");

    // TEST 2: Duplicate reservation
    const duplicate = await StockReservationService.reserveStock({
      reservationId,
      orderId,
      productId: String(product._id),
      quantity: 3
    });

    current = await Product.findById(product._id);

    if (!duplicate.alreadyExists || current.stock !== 7) {
      throw new Error("Duplicate reservation changed stock");
    }

    console.log("PASS: Idempotent reserve");

    // TEST 3: Release
    await StockReservationService.releaseReservation(
      reservationId
    );

    current = await Product.findById(product._id);

    if (current.stock !== 10) {
      throw new Error("Stock must return to 10");
    }

    console.log("PASS: Release stock");

    // TEST 4: Duplicate release
    await StockReservationService.releaseReservation(
      reservationId
    );

    current = await Product.findById(product._id);

    if (current.stock !== 10) {
      throw new Error("Duplicate release changed stock");
    }

    console.log("PASS: Idempotent release");

    // TEST 5: Cannot commit released reservation
    try {
      await StockReservationService.commitReservation(
        reservationId
      );

      throw new Error("Released reservation was committed");
    } catch (error) {
      if (error.status !== 409) {
        throw error;
      }
    }

    console.log("PASS: Cannot commit released reservation");

    // TEST 6: Commit another reservation
    const secondReservationId = `test-${testId}-2`;

    await StockReservationService.reserveStock({
      reservationId: secondReservationId,
      orderId,
      productId: String(product._id),
      quantity: 2
    });

    await StockReservationService.commitReservation(
      secondReservationId
    );

    await StockReservationService.commitReservation(
      secondReservationId
    );

    current = await Product.findById(product._id);

    if (current.stock !== 8) {
      throw new Error("Stock must be 8 after commit");
    }

    console.log("PASS: Commit is idempotent");

    // TEST 7: Insufficient stock
    try {
      await StockReservationService.reserveStock({
        reservationId: `test-${testId}-3`,
        orderId,
        productId: String(product._id),
        quantity: 100
      });

      throw new Error("Insufficient stock was accepted");
    } catch (error) {
      if (error.status !== 409) {
        throw error;
      }
    }

    console.log("PASS: Insufficient stock rejected");
    console.log("\nPASS: All Stock Reservation tests");

  } catch (error) {
    console.error("FAIL:", error.message);
    process.exitCode = 1;

  } finally {
    // Cleanup only the uniquely named test records.
    if (product) {
      await StockReservation.deleteMany({
        productId: product._id
      });

      await Product.deleteOne({
        _id: product._id
      });
    }

    await mongoose.disconnect();
  }
}

main();
