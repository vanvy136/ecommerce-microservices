
const path = require("node:path");
const mongoose = require("./services/product-service/node_modules/mongoose");
const dotenv = require("./services/product-service/node_modules/dotenv");

dotenv.config({
  path: path.join(__dirname, "services/product-service/.env"),
  quiet: true
});

async function main() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing");
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      directConnection: true,
      serverSelectionTimeoutMS: 10000
    });

    const admin = mongoose.connection.db.admin();
    const hello = await admin.command({ hello: 1 });

    if (hello.setName) {
      console.log("Replica set exists:", hello.setName);
    } else {
      const result = await admin.command({
        replSetInitiate: {
          _id: "rs0",
          members: [
            {
              _id: 0,
              host: "localhost:27017"
            }
          ]
        }
      });

      console.log("Initiation result:", result.ok);
    }

    for (let attempt = 0; attempt < 30; attempt++) {
      const status = await admin.command({ hello: 1 });

      if (status.isWritablePrimary) {
        console.log("PASS: PRIMARY");
        console.log("Replica set:", status.setName);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error("PRIMARY election timed out");
  } catch (error) {
    console.error("ERROR:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
