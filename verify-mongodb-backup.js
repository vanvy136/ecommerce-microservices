
const path = require("node:path");
const { spawn } = require("node:child_process");
const dotenv = require("./services/product-service/node_modules/dotenv");

dotenv.config({
  path: path.join(__dirname, "services/product-service/.env"),
  quiet: true
});

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("MONGODB_URI is missing");
  process.exit(1);
}

const containerUri = uri
  .replace("127.0.0.1:27018", "127.0.0.1:27017")
  .replace("localhost:27018", "127.0.0.1:27017");

const archive =
  "/tmp/mongodb-backup-check.archive.gz";

const script = `
read -r BACKUP_URI
mongorestore \
  --uri="$BACKUP_URI" \
  --archive="${archive}" \
  --gzip \
  --dryRun \
  --verbose
`;

const child = spawn("docker", [
  "exec",
  "-i",
  "ecommerce-microservices-mongodb-1",
  "sh",
  "-c",
  script
], {
  stdio: ["pipe", "pipe", "pipe"]
});

child.stdin.end(containerUri + "\n");

let output = "";

child.stdout.on("data", chunk => {
  output += chunk.toString();
});

child.stderr.on("data", chunk => {
  output += chunk.toString();
});

child.on("close", code => {
  const sanitized = output
    .split(containerUri).join("[REDACTED]")
    .split(uri).join("[REDACTED]")
    .replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[REDACTED_URI]");

  console.log(sanitized);

  console.log(
    "Archive verification:",
    code === 0 ? "COMMAND SUCCEEDED" : "FAILED"
  );

  process.exitCode = code === 0 ? 0 : 1;
});

child.on("error", error => {
  console.error("Docker error:", error.message);
  process.exitCode = 1;
});
