
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
const Reservation = require(
  "./services/product-service/src/infrastructure/database/models/StockReservationModel"
);
const StockService = require(
  "./services/product-service/src/application/StockReservationService"
);

async function main() {
  let product = null;
  let passed = false;

  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const runId = crypto.randomUUID();

    product = await Product.create({
      name: `Concurrent Stock Test ${runId}`,
      description: "Temporary test product",
      category: "TEST",
      price: 100000,
      stock: 5,
      isActive: true
    });

    const productId = String(product._id);

    const requests = [1, 2].map(n =>
      StockService.reserveStock({
        reservationId: `${runId}-reservation-${n}`,
        orderId: `${runId}-order-${n}`,
        productId,
        quantity: 4
      })
    );

    const results = await Promise.allSettled(requests);

    const successful = results.filter(
      result => result.status === "fulfilled"
    );

    const rejected = results.filter(
      result => result.status === "rejected"
    );

    const currentProduct = await Product.findById(productId);

    const reservations = await Reservation.find({
      productId
    });

    console.log("Successful requests:", successful.length);
    console.log("Rejected requests:", rejected.length);
    console.log("Remaining stock:", currentProduct.stock);
    console.log("Reservation count:", reservations.length);

    for (const result of rejected) {
      console.log(
        "Rejected reason:",
        result.reason.message
      );
    }

    if (
      successful.length !== 1 ||
      rejected.length !== 1 ||
      currentProduct.stock !== 1 ||
      reservations.length !== 1 ||
      reservations[0].status !== "reserved"
    ) {
      throw new Error("Concurrent stock reservation failed");
    }

    passed = true;

    console.log("PASS: Concurrent stock reservation");

  } catch (error) {
    console.error("FAIL:", error.message);
    process.exitCode = 1;

  } finally {
    if (product && passed) {
      await Reservation.deleteMany({
        productId: product._id
      });

      await Product.deleteOne({
        _id: product._id
      });

      console.log("Test data cleaned up");
    } else if (product) {
      console.log(
        "Test data retained for investigation:",
        String(product._id)
      );
    }

    await mongoose.disconnect();
  }
}

main();
