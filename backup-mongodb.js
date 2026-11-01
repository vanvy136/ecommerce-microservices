
const fs = require("node:fs");
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
// Chuyen dia chi MongoDB tu Windows sang container.
const containerUri = uri
  .replace("127.0.0.1:27018", "127.0.0.1:27017")
  .replace("localhost:27018", "127.0.0.1:27017");

const backupDir = path.join(__dirname, "backups", "mongodb");
fs.mkdirSync(backupDir, { recursive: true });

const backupFile = path.join(
  backupDir,
  `mongodb-backup-${Date.now()}.archive.gz`
);

// Truyen URI qua stdin de tranh hien thi trong command line.
const script = `
read -r BACKUP_URI
mongodump --uri="$BACKUP_URI" --archive --gzip
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

const output = fs.createWriteStream(backupFile);

child.stdout.pipe(output);
child.stdin.end(containerUri + "\n");

let stderr = "";

child.stderr.on("data", chunk => {
  stderr += chunk.toString();
});

child.on("error", error => {
  console.error("Docker execution failed:", error.message);
  output.destroy();
});

child.on("close", code => {
  output.end(() => {
    if (code !== 0) {
      console.error("MongoDB backup failed.");
      // Chi in thong bao loi sau khi che thong tin URI.
      const sanitized = stderr
        .split(containerUri).join("[REDACTED]")
        .split(uri).join("[REDACTED]")
        .replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[REDACTED_URI]");

      console.error(sanitized);
      process.exitCode = 1;
      return;
    }

    const size = fs.statSync(backupFile).size;

    if (size === 0) {
      console.error("Backup file is empty.");
      process.exitCode = 1;
      return;
    }

    console.log("Backup completed successfully.");
    console.log("File:", backupFile);
    console.log("Size:", size, "bytes");
  });
});
