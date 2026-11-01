const path = require("node:path");
const mongoose = require("./services/product-service/node_modules/mongoose");
const dotenv = require("./services/product-service/node_modules/dotenv");

dotenv.config({
  path: path.join(__dirname, "services/product-service/.env")
});

async function main() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const collection = mongoose.connection
      .collection("stockreservations");

    await collection.createIndex(
      { reservationId: 1 },
      { unique: true }
    );

    const indexes = await collection.indexes();

    const uniqueIndex = indexes.find(index =>
      index.unique === true &&
      index.key.reservationId === 1 &&
      Object.keys(index.key).length === 1
    );

    if (!uniqueIndex) {
      throw new Error("Unique reservationId index missing");
    }

    console.log("PASS: Unique reservationId index");
  } catch (error) {
    console.error("FAIL:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
