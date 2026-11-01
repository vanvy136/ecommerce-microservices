
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

    const collection = mongoose.connection.client
      .db("product_db")
      .collection("transaction_test");

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await collection.insertOne(
          { marker: "step8-rollback-test" },
          { session }
        );

        throw new Error("EXPECTED_ROLLBACK");
      });
    } catch (error) {
      if (error.message !== "EXPECTED_ROLLBACK") {
        throw error;
      }
    } finally {
      await session.endSession();
    }

    const count = await collection.countDocuments({
      marker: "step8-rollback-test"
    });

    if (count !== 0) {
      throw new Error("Rollback failed");
    }

    console.log("PASS: MongoDB transaction rollback");
  } catch (error) {
    console.error("FAIL:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
