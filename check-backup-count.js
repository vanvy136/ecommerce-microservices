
const path = require("node:path");
const mongoose = require("./services/product-service/node_modules/mongoose");
const dotenv = require("./services/product-service/node_modules/dotenv");

dotenv.config({
  path: path.join(__dirname, "services/product-service/.env"),
  quiet: true
});

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const client = mongoose.connection.client;

    const originalCount = await client
      .db("product_db")
      .collection("products")
      .countDocuments({});

    const restoredCount = await client
      .db("backup_verification")
      .collection("products")
      .countDocuments({});

    console.log("Original products:", originalCount);
    console.log("Restored products:", restoredCount);

    if (originalCount === 6 && restoredCount === 6) {
      console.log("PASS: Backup restoration verified.");
    } else {
      console.log("NOT VERIFIED: Restored data does not match.");
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("ERROR:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
